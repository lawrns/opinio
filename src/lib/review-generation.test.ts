import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { REVIEW_BRANDS, type ReviewBrandConfig } from './review-brands';
import { assertCurrentGeneration, assertNotDuplicate, contentDedupKey, ENQUEUE_FRESHNESS_MS, validateGenerationInput } from './review-generation';

/**
 * Locked generation contract:
 * - verification_level is exactly unverified_experience and content_origin is exactly automated.
 * - humanized_at is required and must be at or after every fact checked_at.
 * - 1–5 facts. Each fact has a non-empty claim, source_excerpt, and checked_at.
 *   The normalized claim must occur inside the normalized excerpt.
 * - Fact URLs are https, port 443 or omitted, no userinfo, and the hostname is the
 *   official origin host or a subdomain of it.
 * - rating is an integer 1–5. Trimmed title is 1–255, body 5–4000, product_name null or 1–200.
 *   claim is 1–500 and source_excerpt is 1–2000.
 * - A non-null order_id, invitation_id, author_masked_contact, or contact is rejected.
 * - contentDedupKey is sha256 of NFKC+NFD, mark-stripped, lowercased, whitespace-collapsed
 *   slug, title, and body joined by newlines.
 * - assertNotDuplicate rejects exact text and token-set Jaccard >= 0.85.
 *   Tokens are the same normalization split on non-letters/digits. Empty compared with empty is a duplicate.
 */

const BARRI = REVIEW_BRANDS.barri;
const CHECKED = '2026-06-01T12:00:00.000Z';
const HUMANIZED = '2026-06-01T12:00:00.000Z';

function fact(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://barri.mx/menu',
    claim: 'entrega publicada',
    source_excerpt: 'La entrega publicada está en el menú oficial.',
    checked_at: CHECKED,
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    humanized_at: HUMANIZED,
    rating: 5,
    title: 'Entrega clara del pedido',
    body: 'El pedido llegó en la fecha publicada y el empaque venía cerrado.',
    product_name: 'Plan Barrio',
    facts: [fact()],
    ...overrides,
  };
}

function rejection(input: Record<string, unknown>, brand: ReviewBrandConfig = BARRI, field = 'validation') {
  expect(() => validateGenerationInput(input, brand)).toThrow(new RegExp(field, 'i'));
}

describe('validateGenerationInput', () => {
  it('returns the normalized accepted input for one official fact', () => {
    const accepted = validateGenerationInput(validInput({
      title: '  Entrega clara del pedido  ',
      body: '  El pedido llegó en la fecha publicada y el empaque venía cerrado.  ',
      product_name: '  Plan Barrio  ',
    }), BARRI);

    expect(accepted).toMatchObject({
      verification_level: 'unverified_experience',
      content_origin: 'automated',
      rating: 5,
      title: 'Entrega clara del pedido',
      body: 'El pedido llegó en la fecha publicada y el empaque venía cerrado.',
      product_name: 'Plan Barrio',
    });
    expect(new Date(accepted.humanized_at).toISOString()).toBe(HUMANIZED);
    expect(accepted.facts).toHaveLength(1);
    expect(accepted.facts[0]).toMatchObject({
      url: 'https://barri.mx/menu',
      claim: 'entrega publicada',
      source_excerpt: 'La entrega publicada está en el menú oficial.',
    });
    expect(new Date(accepted.facts[0].checked_at).toISOString()).toBe(CHECKED);
  });

  it('accepts the inclusive fact counts and an omitted product name', () => {
    expect(validateGenerationInput(validInput(), BARRI).facts).toHaveLength(1);
    const five = Array.from({ length: 5 }, (_, index) => fact({
      url: `https://barri.mx/hecho-${index}`,
      claim: `hecho ${index}`,
      source_excerpt: `El hecho ${index} está publicado en el sitio.`,
    }));
    expect(validateGenerationInput(validInput({ facts: five, product_name: null }), BARRI).facts).toHaveLength(5);
    expect(validateGenerationInput(validInput({ product_name: undefined }), BARRI).product_name).toBeNull();
  });

  it('accepts a matching accent-insensitive claim and a www or subdomain URL on the official host', () => {
    expect(() => validateGenerationInput(validInput({
      facts: [fact({ claim: 'menu', source_excerpt: 'Menú oficial del local.' })],
    }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({
      facts: [fact({ url: 'https://www.barri.mx/menu' })],
    }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({
      facts: [fact({ url: 'https://tienda.barri.mx/menu' })],
    }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({
      facts: [fact({ url: 'https://barri.mx:443/menu' })],
    }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({
      facts: [fact({ url: 'https://hablo.com.mx/sofia', claim: 'sofia', source_excerpt: 'Sofia contesta la llamada.' })],
    }), REVIEW_BRANDS.hablo)).not.toThrow();
  });

  it('accepts humanized_at equal to the latest checked_at and rating bounds 1 and 5', () => {
    expect(() => validateGenerationInput(validInput({ rating: 1 }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({ rating: 5 }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({
      facts: [
        fact({ checked_at: '2026-06-01T11:00:00.000Z' }),
        fact({ url: 'https://barri.mx/otro', claim: 'otro hecho', source_excerpt: 'Otro hecho publicado.', checked_at: HUMANIZED }),
      ],
    }), BARRI)).not.toThrow();
  });

  it('rejects provenance that is not an unverified automated experience', () => {
    rejection(validInput({ verification_level: 'confirmed_payment' }), BARRI, 'verification_level');
    rejection(validInput({ verification_level: 'Unverified_Experience' }), BARRI, 'verification_level');
    rejection(validInput({ verification_level: 'reviewed_proof' }), BARRI, 'verification_level');
    rejection(validInput({ content_origin: 'manual' }), BARRI, 'content_origin');
    rejection(validInput({ content_origin: 'Automated' }), BARRI, 'content_origin');
    rejection(validInput({ content_origin: 'generated' }), BARRI, 'content_origin');
  });

  it('rejects a missing or pre-evidence humanizer timestamp', () => {
    const missing = validInput({ humanized_at: undefined });
    rejection(missing, BARRI, 'humanized_at');
    rejection(validInput({ humanized_at: 'not-a-date' }), BARRI, 'humanized_at');
    rejection(validInput({ humanized_at: '2026-06-01T11:59:59.999Z' }), BARRI, 'humanized_at');
  });

  it('rejects fact counts outside 1..5 and incomplete evidence', () => {
    rejection(validInput({ facts: [] }), BARRI, 'facts');
    rejection(validInput({ facts: Array.from({ length: 6 }, () => fact()) }), BARRI, 'facts');
    rejection(validInput({ facts: [fact({ url: '' })] }), BARRI, 'url');
    rejection(validInput({ facts: [fact({ claim: '   ' })] }), BARRI, 'claim');
    rejection(validInput({ facts: [fact({ source_excerpt: '' })] }), BARRI, 'source_excerpt');
    rejection(validInput({ facts: [fact({ checked_at: 'yesterday' })] }), BARRI, 'checked_at');
    rejection(validInput({
      facts: [fact({ claim: 'entrega domicilio', source_excerpt: 'La entrega a domicilio está publicada.' })],
    }), BARRI, 'claim');
  });

  it('rejects URLs that are not https on the configured brand host', () => {
    const urls = [
      'http://barri.mx/menu',
      'https://gogym.mx/menu',
      'https://doctor.mx/consulta',
      'https://barri.mx.evil.com/menu',
      'https://notbarri.mx/menu',
      'https://evil.com/redirect?next=https://barri.mx',
      'https://userinfo@barri.mx/menu',
      'https://barri.mx:8443/menu',
      'javascript:alert(1)',
    ];
    for (const url of urls) {
      rejection(validInput({ facts: [fact({ url })] }), BARRI, 'url');
    }
    rejection(validInput({
      facts: [fact({ url: 'https://doctormx.mx/consulta', claim: 'consulta', source_excerpt: 'Consulta publicada.' })],
    }), REVIEW_BRANDS.doctormx, 'url');
  });

  it('enforces rating and content length boundaries', () => {
    expect(() => validateGenerationInput(validInput({ title: 'a', body: 'abcde' }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({ title: 'a'.repeat(255), body: 'a'.repeat(4000) }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({ product_name: 'a'.repeat(200) }), BARRI)).not.toThrow();
    expect(() => validateGenerationInput(validInput({
      facts: [fact({ claim: 'a'.repeat(500), source_excerpt: `${'a'.repeat(500)} publicado` })],
    }), BARRI)).not.toThrow();

    rejection(validInput({ rating: 0 }), BARRI, 'rating');
    rejection(validInput({ rating: 6 }), BARRI, 'rating');
    rejection(validInput({ rating: 1.5 }), BARRI, 'rating');
    rejection(validInput({ rating: Number.NaN }), BARRI, 'rating');
    rejection(validInput({ rating: '5' }), BARRI, 'rating');
    rejection(validInput({ title: '   ' }), BARRI, 'title');
    rejection(validInput({ title: 'a'.repeat(256) }), BARRI, 'title');
    rejection(validInput({ body: 'abcd' }), BARRI, 'body');
    rejection(validInput({ body: 'a'.repeat(4001) }), BARRI, 'body');
    rejection(validInput({ product_name: '' }), BARRI, 'product_name');
    rejection(validInput({ product_name: 'a'.repeat(201) }), BARRI, 'product_name');
    rejection(validInput({
      facts: [fact({ claim: 'a'.repeat(501), source_excerpt: 'a'.repeat(600) })],
    }), BARRI, 'claim');
    rejection(validInput({
      facts: [fact({ source_excerpt: 'a'.repeat(2001), claim: 'a' })],
    }), BARRI, 'source_excerpt');
  });

  it('rejects an order, invitation, or contact carried into a generated review', () => {
    rejection(validInput({ order_id: 12 }), BARRI, 'order_id');
    rejection(validInput({ invitation_id: 4 }), BARRI, 'invitation_id');
    rejection(validInput({ author_masked_contact: 'a***a@example.com' }), BARRI, 'author_masked_contact');
    rejection(validInput({ contact: 'cliente@example.com' }), BARRI, 'contact');
  });
});

describe('contentDedupKey', () => {
  it('hashes the normalized slug, title, and body as a stable sha256', () => {
    const key = contentDedupKey('Luuna', '  Muy   Cómodo  ', 'El colchón llegó bien.\n\nRecomendado.');
    const material = 'luuna\nmuy comodo\nel colchon llego bien. recomendado.';
    expect(key).toBe(createHash('sha256').update(material).digest('hex'));
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(contentDedupKey('luuna', 'muy comodo', 'el colchon llego bien. recomendado.')).toBe(key);
    expect(contentDedupKey('Niño', 'Título', 'Texto')).toBe(contentDedupKey('nino', 'titulo', 'texto'));
  });

  it('changes the key when the slug, title, or body changes', () => {
    const base = contentDedupKey('barri', 'Entrega clara', 'El pedido llegó completo.');
    expect(contentDedupKey('gogym', 'Entrega clara', 'El pedido llegó completo.')).not.toBe(base);
    expect(contentDedupKey('barri', 'Otra entrega', 'El pedido llegó completo.')).not.toBe(base);
    expect(contentDedupKey('barri', 'Entrega clara', 'El pedido llegó incompleto.')).not.toBe(base);
  });
});

describe('assertNotDuplicate', () => {
  const shared = Array.from({ length: 17 }, (_, index) => `t${String(index + 1).padStart(2, '0')}`);
  const extras = ['x01', 'x02', 'x03', 'x04'];

  it('accepts an empty recent list and a body below the 0.85 boundary', () => {
    expect(() => assertNotDuplicate({ body: shared.join(' '), recentBodies: [] })).not.toThrow();
    expect(() => assertNotDuplicate({
      body: shared.join(' '),
      recentBodies: [[...shared, ...extras].join(' ')],
    })).not.toThrow();
    expect(() => assertNotDuplicate({
      body: shared.slice(0, 16).join(' '),
      recentBodies: [[...shared.slice(0, 16), ...extras].join(' ')],
    })).not.toThrow();
  });

  it('rejects an exact duplicate, an empty pair, and Jaccard of exactly 0.85', () => {
    expect(() => assertNotDuplicate({
      body: 'El pedido llegó completo.',
      recentBodies: ['  EL   pedido   llegó   completo.  '],
    })).toThrow(/duplicate/i);
    expect(() => assertNotDuplicate({ body: '', recentBodies: [''] })).toThrow(/duplicate/i);
    expect(() => assertNotDuplicate({ body: '', recentBodies: ['pedido completo'] })).not.toThrow();
    expect(() => assertNotDuplicate({
      body: shared.join(' '),
      recentBodies: [[...shared, ...extras.slice(0, 3)].join(' ')],
    })).toThrow(/duplicate/i);
  });

  it('uses a token set, so repeats and hyphenation do not create a distinct review', () => {
    expect(() => assertNotDuplicate({
      body: 'hola hola mundo',
      recentBodies: ['hola mundo'],
    })).toThrow(/duplicate/i);
    expect(() => assertNotDuplicate({
      body: 'bien-estar diario',
      recentBodies: ['bien estar diario'],
    })).toThrow(/duplicate/i);
  });

  it('rejects when any recent body is too close, regardless of order', () => {
    expect(() => assertNotDuplicate({
      body: shared.join(' '),
      recentBodies: ['una opinión distinta por completo', [...shared, ...extras.slice(0, 3)].join(' ')],
    })).toThrow(/duplicate/i);
  });
});

describe('assertCurrentGeneration', () => {
  const now = new Date('2026-06-15T16:00:00.000Z');
  const fresh = new Date(now.getTime() - ENQUEUE_FRESHNESS_MS).toISOString();

  it('accepts evidence and a humanizer timestamp at the 48 hour boundary and at now', () => {
    expect(() => assertCurrentGeneration({
      humanized_at: fresh,
      facts: [{ checked_at: fresh }],
    }, now)).not.toThrow();
    expect(() => assertCurrentGeneration({
      humanized_at: now.toISOString(),
      facts: [{ checked_at: now.toISOString() }],
    }, now)).not.toThrow();
  });

  it('rejects a humanizer timestamp or fact that is older than 48 hours or in the future', () => {
    const stale = new Date(now.getTime() - ENQUEUE_FRESHNESS_MS - 1).toISOString();
    const future = new Date(now.getTime() + 1).toISOString();
    expect(() => assertCurrentGeneration({ humanized_at: stale, facts: [{ checked_at: fresh }] }, now)).toThrow(/humanized_at/i);
    expect(() => assertCurrentGeneration({ humanized_at: future, facts: [{ checked_at: fresh }] }, now)).toThrow(/humanized_at/i);
    expect(() => assertCurrentGeneration({ humanized_at: now.toISOString(), facts: [{ checked_at: stale }] }, now)).toThrow(/checked_at/i);
    expect(() => assertCurrentGeneration({ humanized_at: now.toISOString(), facts: [{ checked_at: future }] }, now)).toThrow(/checked_at/i);
  });
});
