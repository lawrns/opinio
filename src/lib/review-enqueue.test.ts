import { describe, expect, it } from 'vitest';
import type { ReviewBrandConfig } from './review-brands';
import { contentDedupKey } from './review-generation';
import { controlledPublicationEnabled, enqueueGeneratedReview, queueCapacity } from './review-enqueue';
import { schedulePublication } from './review-scheduling';
import { createPublicationHarness, type PublicationHarness, type Row } from '../test/review-sql-harness';
/**
 * Enqueue contract locked by outcomes:
 * - one transaction and pg_advisory_xact_lock (or pg_advisory_lock) around the capacity check and insert
 * - active = queued + claimed; global cap 24; per-brand cap 4; published and failed do not count
 * - dedup_key and publication_key are contentDedupKey(slug, title, body); publication_key equals dedup_key
 * - near-duplicates use the same Jaccard rule as assertNotDuplicate, scoped to the brand's queued,
 *   claimed, and published queue rows plus that brand's published reviews; failed rows do not count
 * - rating diversity: reject a rating that matches the two newest non-failed queue rows for the brand,
 *   ordered by created_at desc, id desc
 * - schedule anchors are max(publish_after) of non-failed rows, per brand and globally; failed rows are ignored
 * - an explicit publishAfter is stored unchanged and does not consume random()
 * - queueCapacity is a read: globalRemaining and perBrandRemaining, never negative, no writes
 * - no review, order, or invitation row is created
 * Thrown codes: global_cap, brand_cap, duplicate, rating_diversity.
 */

const BRAND: ReviewBrandConfig = {
  slug: 'barri',
  officialOrigin: 'https://barri.mx',
  timezone: 'America/Mexico_City',
  windows: [{ startHour: 10, endHour: 19 }],
};
const NOW = new Date('2026-06-15T16:00:00.000Z');

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) throw new Error(`random sequence exhausted at call ${index + 1}`);
    return values[index++];
  };
}

interface GeneratedEnqueueInput {
  business_id: number;
  business_slug: string;
  brand: ReviewBrandConfig;
  rating: number;
  title: string;
  body: string;
  product_name: string | null;
  verification_level: string;
  content_origin: string;
  source_facts: unknown;
  generation_run_id: string;
  humanized_at: string;
}

function input(
  businessId: number,
  slug: string,
  overrides: Partial<GeneratedEnqueueInput> = {},
): GeneratedEnqueueInput {
  return {
    business_id: businessId,
    business_slug: slug,
    brand: { ...BRAND, slug, officialOrigin: `https://${slug}.mx` },
    rating: 4,
    title: `Entrega clara ${slug} ${businessId}`,
    body: `El pedido ${slug} llegó en la fecha publicada y el empaque venía cerrado.`,
    product_name: 'Plan de prueba',
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    source_facts: [{
      url: `https://${slug}.mx/hecho`,
      claim: 'entrega publicada',
      source_excerpt: 'La entrega publicada está en el sitio oficial.',
      checked_at: '2026-06-01T12:00:00.000Z',
    }],
    generation_run_id: 'run-001',
    humanized_at: '2026-06-01T13:00:00.000Z',
    ...overrides,
  };
}

async function seedBusiness(harness: PublicationHarness, slug: string): Promise<number> {
  const inserted = await harness.pool.query(
    'INSERT INTO businesses (slug, brand_name, category, domain) VALUES ($1, $2, $3, $4) RETURNING id',
    [slug, slug, 'Retail DTC', `${slug}.mx`],
  );
  return Number(inserted.rows[0].id);
}

const FIXTURE_HUMANIZED = new Date('2026-06-01T13:00:00.000Z');

async function seedQueue(harness: PublicationHarness, fields: Record<string, unknown>): Promise<Row> {
  const row: Record<string, unknown> = {
    humanized_at: FIXTURE_HUMANIZED,
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    source_facts: [],
    ...fields,
  };
  if (row.status === 'failed' && row.last_error == null) row.last_error = 'publication_failed';
  if (row.status === 'claimed' && row.claimed_at == null) row.claimed_at = row.created_at ?? FIXTURE_HUMANIZED;
  if (row.status === 'published' && row.published_review_id == null) {
    const created = row.created_at ?? FIXTURE_HUMANIZED;
    const review = await harness.pool.query(
      `INSERT INTO reviews (
        business_id, rating, title, body, author_name, verification_level, content_origin,
        publication_key, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Contenido automatizado', 'unverified_experience', 'automated', $5, 'published', $6, $6)
      RETURNING id`,
      [row.business_id, row.rating, row.title ?? 'Previa', row.body, row.publication_key, created],
    );
    row.published_review_id = review.rows[0].id;
    row.published_at = row.published_at ?? created;
  }
  const columns = Object.keys(row);
  const inserted = await harness.pool.query(
    `INSERT INTO review_publication_queue (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
    columns.map((column) => row[column]),
  );
  return inserted.rows[0];
}

async function queueRows(harness: PublicationHarness): Promise<Row[]> {
  return (await harness.pool.query('SELECT * FROM review_publication_queue')).rows;
}

async function enqueue(harness: PublicationHarness, value: GeneratedEnqueueInput, extras: Record<string, unknown> = {}) {
  const client = await harness.pool.connect();
  try {
    return await enqueueGeneratedReview({ client, input: value, now: NOW, random: sequence(0, 0, 0, 0), ...extras });
  } finally {
    client.release();
  }
}

describe('enqueueGeneratedReview', () => {
  it('persists an automated queued row and does not create a review, order, or invitation', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    const publishAfter = new Date('2026-06-16T16:00:00.000Z');
    const value = input(businessId, 'barri');
    const started = Date.now();
    await enqueue(harness, value, { publishAfter, random: () => { throw new Error('random must not be consumed'); } });
    expect(Date.now() - started).toBeLessThan(1000);

    const [row] = await queueRows(harness);
    expect(row).toMatchObject({
      business_id: businessId,
      rating: 4,
      title: value.title,
      body: value.body,
      product_name: 'Plan de prueba',
      verification_level: 'unverified_experience',
      content_origin: 'automated',
      generation_run_id: 'run-001',
      status: 'queued',
      attempt_count: 0,
      last_error: null,
      claimed_at: null,
      published_at: null,
      published_review_id: null,
    });
    expect(new Date(row.publish_after as string).toISOString()).toBe(publishAfter.toISOString());
    expect(new Date(row.humanized_at as string).toISOString()).toBe('2026-06-01T13:00:00.000Z');
    expect(row.source_facts).toEqual(value.source_facts);
    const key = contentDedupKey('barri', value.title, value.body);
    expect(row.dedup_key).toBe(key);
    expect(row.publication_key).toBe(key);
    expect((await harness.pool.query('SELECT * FROM reviews')).rows).toEqual([]);
    expect((await harness.pool.query('SELECT * FROM orders')).rows).toEqual([]);
    expect((await harness.pool.query('SELECT * FROM invitations')).rows).toEqual([]);
    expect(harness.sqlLog.join('\n')).toMatch(/\bbegin\b/i);
    expect(harness.sqlLog.join('\n')).toMatch(/pg_advisory(?:_xact)?_lock/i);
    expect(harness.sqlLog.join('\n')).toMatch(/\bcommit\b/i);
    expect(harness.sqlLog.join('\n')).toMatch(/\$10::jsonb/);
  });

  it('stores the normalized generation and a jsonb array, not the raw payload', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    await enqueue(harness, input(businessId, 'barri', {
      title: '  Entrega clara  ',
      body: '  El pedido llegó cerrado.  ',
      product_name: '  Plan de prueba  ',
      source_facts: [{
        url: ' https://barri.mx/hecho ',
        claim: '  entrega publicada  ',
        source_excerpt: '  La entrega publicada está en el sitio oficial.  ',
        checked_at: '2026-06-01T12:00:00.000Z',
        note: 'not stored',
      }],
    }), { publishAfter: new Date('2026-06-16T16:00:00.000Z') });
    const [row] = await queueRows(harness);
    expect(row.title).toBe('Entrega clara');
    expect(row.body).toBe('El pedido llegó cerrado.');
    expect(row.product_name).toBe('Plan de prueba');
    expect(row.source_facts).toEqual([{
      url: 'https://barri.mx/hecho',
      claim: 'entrega publicada',
      source_excerpt: 'La entrega publicada está en el sitio oficial.',
      checked_at: '2026-06-01T12:00:00.000Z',
    }]);
    expect(harness.sqlLog.join('\n')).toMatch(/\$10::jsonb/);
  });

  it('stores a computed schedule from non-failed anchors and ignores a later failed row', async () => {
    const harness = createPublicationHarness();
    const brandId = await seedBusiness(harness, 'barri');
    const otherId = await seedBusiness(harness, 'gogym');
    const brandAnchor = new Date('2026-06-20T16:00:00.000Z');
    const globalAnchor = new Date('2026-06-22T16:00:00.000Z');
    await seedQueue(harness, {
      business_id: brandId, dedup_key: 'brand-published', publication_key: 'brand-published', rating: 5,
      title: 'Previa', body: 'Una opinión previa ya persistida en la cola.', status: 'published',
      publish_after: brandAnchor, created_at: new Date('2026-06-01T00:00:00.000Z'),
    });
    await seedQueue(harness, {
      business_id: brandId, dedup_key: 'brand-failed', publication_key: 'brand-failed', rating: 5,
      title: 'Fallida', body: 'Esta fila fallida no ancla el calendario.', status: 'failed',
      publish_after: new Date('2026-08-01T00:00:00.000Z'), created_at: new Date('2026-06-02T00:00:00.000Z'),
    });
    await seedQueue(harness, {
      business_id: otherId, dedup_key: 'global-queued', publication_key: 'global-queued', rating: 3,
      title: 'Global', body: 'Otra marca tiene la fecha global más lejana.', status: 'queued',
      publish_after: globalAnchor, created_at: new Date('2026-06-03T00:00:00.000Z'),
    });
    const random = [0.35, 0, 0, 0];
    const expected = schedulePublication({
      now: NOW,
      brand: BRAND,
      latestBrandPublishAfter: brandAnchor,
      latestGlobalPublishAfter: globalAnchor,
      random: sequence(...random),
    });
    await enqueue(harness, input(brandId, 'barri', { title: 'Nueva entrega clara', body: 'Texto nuevo suficiente para encolar la opinión.' }), {
      random: sequence(...random),
    });
    const stored = (await queueRows(harness)).find((row) => row.title === 'Nueva entrega clara');
    expect(new Date(stored?.publish_after as string).toISOString()).toBe(expected.toISOString());
  });

  it('rejects the 24th active row globally and still allows a row when published and failed rows fill the table', async () => {
    const harness = createPublicationHarness();
    const ids = await Promise.all(Array.from({ length: 8 }, (_, index) => seedBusiness(harness, `marca${index}`)));
    for (let index = 0; index < 24; index += 1) {
      await seedQueue(harness, {
        business_id: ids[index % 6],
        dedup_key: `active-${index}`,
        publication_key: `active-${index}`,
        rating: (index % 5) + 1,
        title: `Activa ${index}`,
        body: `Cuerpo activo número ${index} con texto suficiente.`,
        status: index % 5 === 0 ? 'claimed' : 'queued',
        publish_after: NOW,
        created_at: new Date(NOW.getTime() + index),
      });
    }
    await expect(enqueue(harness, input(ids[6], 'marca6'))).rejects.toMatchObject({ code: 'global_cap' });
    expect(await queueRows(harness)).toHaveLength(24);

    const open = createPublicationHarness();
    const businessId = await seedBusiness(open, 'barri');
    for (let index = 0; index < 24; index += 1) {
      await seedQueue(open, {
        business_id: businessId,
        dedup_key: `closed-${index}`,
        publication_key: `closed-${index}`,
        rating: 3,
        title: `Cerrada ${index}`,
        body: `Cuerpo cerrado número ${index} que no ocupa cupo.`,
        status: index < 12 ? 'published' : 'failed',
        publish_after: NOW,
        created_at: new Date(NOW.getTime() + index),
      });
    }
    await enqueue(open, input(businessId, 'barri', { title: 'Cabe una más', body: 'Esta opinión entra porque las otras no están activas.' }));
    expect((await queueRows(open)).filter((row) => row.status === 'queued' || row.status === 'claimed')).toHaveLength(1);
  });

  it('counts claimed rows toward the per-brand cap of 4 and ignores another brand and published rows', async () => {
    const harness = createPublicationHarness();
    const fullId = await seedBusiness(harness, 'barri');
    const otherId = await seedBusiness(harness, 'gogym');
    for (let index = 0; index < 4; index += 1) {
      await seedQueue(harness, {
        business_id: fullId,
        dedup_key: `brand-${index}`,
        publication_key: `brand-${index}`,
        rating: index + 1,
        title: `Marca ${index}`,
        body: `Cuerpo de marca número ${index} en la cola activa.`,
        status: index === 3 ? 'claimed' : 'queued',
        publish_after: NOW,
        created_at: new Date(NOW.getTime() + index),
      });
    }
    await seedQueue(harness, {
      business_id: fullId, dedup_key: 'brand-published', publication_key: 'brand-published', rating: 2,
      title: 'Publicada', body: 'Una publicada no ocupa el cupo de la marca.', status: 'published',
      publish_after: NOW, created_at: new Date('2026-06-01T00:00:00.000Z'),
    });
    await expect(enqueue(harness, input(fullId, 'barri', { title: 'Quinta activa', body: 'Esta quinta opinión activa de la marca no entra.' })))
      .rejects.toMatchObject({ code: 'brand_cap' });
    await enqueue(harness, input(otherId, 'gogym', { title: 'Otra marca', body: 'Otra marca todavía tiene cupo disponible.' }));
    expect((await queueRows(harness)).some((row) => row.business_id === otherId)).toBe(true);
    expect((await queueRows(harness)).filter((row) => row.business_id === fullId && (row.status === 'queued' || row.status === 'claimed'))).toHaveLength(4);
  });

  it('lets exactly one of two concurrent enqueues take the last global slot', async () => {
    const harness = createPublicationHarness();
    const ids = await Promise.all(Array.from({ length: 8 }, (_, index) => seedBusiness(harness, `carrera${index}`)));
    for (let index = 0; index < 23; index += 1) {
      await seedQueue(harness, {
        business_id: ids[index % 6],
        dedup_key: `race-${index}`,
        publication_key: `race-${index}`,
        rating: (index % 5) + 1,
        title: `Carrera ${index}`,
        body: `Cuerpo de carrera número ${index} ya encolado.`,
        status: 'queued',
        publish_after: NOW,
        created_at: new Date(NOW.getTime() + index),
      });
    }
    const results = await Promise.allSettled([
      enqueue(harness, input(ids[6], 'carrera6', { title: 'Llegada A', body: 'Texto de llegada A suficientemente distinto.' })),
      enqueue(harness, input(ids[7], 'carrera7', { title: 'Llegada B', body: 'Texto de llegada B suficientemente distinto.' })),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'global_cap' },
    });
    expect((await queueRows(harness)).filter((row) => row.status === 'queued' || row.status === 'claimed')).toHaveLength(24);
  });

  it('rejects a third consecutive identical rating and allows a different rating or a broken streak', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    await seedQueue(harness, {
      business_id: businessId, dedup_key: 'old-five', publication_key: 'old-five', rating: 5,
      title: 'Vieja', body: 'La más antigua es un cinco pero no decide sola.', status: 'published',
      publish_after: new Date('2026-07-01T00:00:00.000Z'), created_at: new Date('2026-06-01T00:00:00.000Z'),
    });
    await seedQueue(harness, {
      business_id: businessId, dedup_key: 'new-five', publication_key: 'new-five', rating: 5,
      title: 'Nueva', body: 'La más nueva también es un cinco y cierra la racha.', status: 'queued',
      publish_after: new Date('2026-06-01T00:00:00.000Z'), created_at: new Date('2026-06-03T00:00:00.000Z'),
    });
    await expect(enqueue(harness, input(businessId, 'barri', { rating: 5, title: 'Otro cinco', body: 'Un tercer cinco consecutivo no debe encolarse.' })))
      .rejects.toMatchObject({ code: 'rating_diversity' });

    const broken = createPublicationHarness();
    const brokenId = await seedBusiness(broken, 'barri');
    await seedQueue(broken, {
      business_id: brokenId, dedup_key: 'five-a', publication_key: 'five-a', rating: 5,
      title: 'Cinco A', body: 'Primer cinco de una racha ya interrumpida.', status: 'published',
      publish_after: NOW, created_at: new Date('2026-06-01T00:00:00.000Z'),
    });
    await seedQueue(broken, {
      business_id: brokenId, dedup_key: 'five-b', publication_key: 'five-b', rating: 5,
      title: 'Cinco B', body: 'Segundo cinco antes del cuatro que rompe la racha.', status: 'published',
      publish_after: NOW, created_at: new Date('2026-06-02T00:00:00.000Z'),
    });
    await seedQueue(broken, {
      business_id: brokenId, dedup_key: 'four', publication_key: 'four', rating: 4,
      title: 'Cuatro', body: 'Este cuatro es el más nuevo y rompe la racha.', status: 'queued',
      publish_after: NOW, created_at: new Date('2026-06-04T00:00:00.000Z'),
    });
    await enqueue(broken, input(brokenId, 'barri', { rating: 5, title: 'Cinco permitido', body: 'Un cinco después de un cuatro no es racha de tres.' }));
    expect((await queueRows(broken)).some((row) => row.title === 'Cinco permitido')).toBe(true);
  });

  it('does not let a failed row break a live rating streak', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    await seedQueue(harness, {
      business_id: businessId, dedup_key: 'live-a', publication_key: 'live-a', rating: 5,
      title: 'Viva A', body: 'Primer cinco vivo de la marca.', status: 'published',
      publish_after: NOW, created_at: new Date('2026-06-01T00:00:00.000Z'),
    });
    await seedQueue(harness, {
      business_id: businessId, dedup_key: 'live-b', publication_key: 'live-b', rating: 5,
      title: 'Viva B', body: 'Segundo cinco vivo de la marca.', status: 'queued',
      publish_after: NOW, created_at: new Date('2026-06-02T00:00:00.000Z'),
    });
    await seedQueue(harness, {
      business_id: businessId, dedup_key: 'failed-four', publication_key: 'failed-four', rating: 4,
      title: 'Fallido', body: 'Un cuatro fallido no interrumpe la racha viva.', status: 'failed',
      publish_after: NOW, created_at: new Date('2026-06-05T00:00:00.000Z'),
    });
    await expect(enqueue(harness, input(businessId, 'barri', { rating: 5, title: 'Tercer cinco', body: 'Sigue siendo el tercer cinco vivo.' })))
      .rejects.toMatchObject({ code: 'rating_diversity' });
  });

  it('rejects an exact or normalized duplicate and a near-duplicate of the same brand only', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    const otherId = await seedBusiness(harness, 'gogym');
    const first = input(businessId, 'barri', { title: 'Muy cómodo', body: 'El colchón llegó bien y se siente fresco.' });
    await enqueue(harness, first);
    const before = await queueRows(harness);
    await expect(enqueue(harness, input(businessId, 'barri', {
      title: '  MUY   cómodo  ',
      body: 'El   colchón  llegó   bien y se siente fresco.',
    }))).rejects.toMatchObject({ code: 'duplicate' });
    expect(await queueRows(harness)).toEqual(before);

    const shared = Array.from({ length: 17 }, (_, index) => `t${String(index + 1).padStart(2, '0')}`);
    await seedQueue(harness, {
      business_id: businessId,
      dedup_key: 'near-existing',
      publication_key: 'near-existing',
      rating: 3,
      title: 'Cercana',
      body: [...shared, 'x01', 'x02', 'x03'].join(' '),
      status: 'queued',
      publish_after: NOW,
      created_at: new Date('2026-06-04T00:00:00.000Z'),
    });
    await expect(enqueue(harness, input(businessId, 'barri', {
      title: 'Otro título distinto',
      body: shared.join(' '),
    }))).rejects.toMatchObject({ code: 'duplicate' });
    await enqueue(harness, input(otherId, 'gogym', {
      title: 'Mismo texto otra marca',
      body: shared.join(' '),
    }));
    expect((await queueRows(harness)).some((row) => row.business_id === otherId)).toBe(true);
  });

  it('rejects bad provenance and a missing business without leaving a row', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    await expect(enqueue(harness, input(businessId, 'barri', { verification_level: 'confirmed_payment' })))
      .rejects.toThrow(/verification_level/i);
    await expect(enqueue(harness, input(businessId, 'barri', { content_origin: 'manual' })))
      .rejects.toThrow(/content_origin/i);
    await expect(enqueue(harness, input(999, 'ausente'))).rejects.toThrow();
    expect(await queueRows(harness)).toEqual([]);
  });
});

describe('queueCapacity', () => {
  it('reports remaining global and per-brand capacity without writing', async () => {
    const harness = createPublicationHarness();
    const first = await seedBusiness(harness, 'barri');
    const second = await seedBusiness(harness, 'gogym');
    const idle = await seedBusiness(harness, 'bien');
    await seedQueue(harness, {
      business_id: first, dedup_key: 'one', publication_key: 'one', rating: 4,
      title: 'Una', body: 'Una opinión activa de la primera marca.', status: 'queued',
      publish_after: NOW, created_at: NOW, updated_at: new Date('2026-06-01T00:00:00.000Z'),
    });
    for (let index = 0; index < 4; index += 1) {
      await seedQueue(harness, {
        business_id: second, dedup_key: `two-${index}`, publication_key: `two-${index}`, rating: 3,
        title: `Dos ${index}`, body: `Opinión activa ${index} de la segunda marca.`, status: index === 0 ? 'claimed' : 'queued',
        publish_after: NOW, created_at: NOW, updated_at: new Date('2026-06-01T00:00:00.000Z'),
      });
    }
    await seedQueue(harness, {
      business_id: idle, dedup_key: 'idle', publication_key: 'idle', rating: 2,
      title: 'Inactiva', body: 'Una publicada no reduce el cupo de la marca.', status: 'published',
      publish_after: NOW, created_at: NOW,
    });
    const before = JSON.stringify(await queueRows(harness));
    harness.sqlLog.length = 0;
    const client = await harness.pool.connect();
    let capacity: { globalRemaining: number; perBrandRemaining: Record<string, number> };
    try {
      capacity = await queueCapacity(client);
    } finally {
      client.release();
    }
    expect(capacity.globalRemaining).toBe(19);
    expect(capacity.perBrandRemaining[String(first)]).toBe(3);
    expect(capacity.perBrandRemaining[String(second)]).toBe(0);
    const idleRemaining = capacity.perBrandRemaining[String(idle)];
    expect(idleRemaining === undefined || idleRemaining === 4).toBe(true);
    expect(JSON.stringify(await queueRows(harness))).toBe(before);
    expect(harness.sqlLog.join('\n')).not.toMatch(/\b(insert|update|delete)\b/i);
  });

  it('reports a full queue as zero remaining, never a negative number', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness, 'barri');
    for (let index = 0; index < 25; index += 1) {
      await seedQueue(harness, {
        business_id: businessId, dedup_key: `over-${index}`, publication_key: `over-${index}`, rating: 3,
        title: `Sobre ${index}`, body: `Cuerpo sobre el cupo número ${index}.`, status: 'queued',
        publish_after: NOW, created_at: new Date(NOW.getTime() + index),
      });
    }
    const client = await harness.pool.connect();
    try {
      const capacity = await queueCapacity(client);
      expect(capacity.globalRemaining).toBe(0);
      expect(capacity.perBrandRemaining[String(businessId)]).toBe(0);
    } finally {
      client.release();
    }
  });

  it('reports the full cap when nothing is active', async () => {
    const harness = createPublicationHarness();
    const client = await harness.pool.connect();
    try {
      await expect(queueCapacity(client)).resolves.toEqual({ globalRemaining: 24, perBrandRemaining: {} });
    } finally {
      client.release();
    }
  });
});

describe('controlledPublicationEnabled', () => {
  it('allows an explicit publish-after only when the controlled flag is exactly 1', () => {
    expect(controlledPublicationEnabled('1')).toBe(true);
    expect(controlledPublicationEnabled('true')).toBe(false);
    expect(controlledPublicationEnabled('yes')).toBe(false);
    expect(controlledPublicationEnabled('')).toBe(false);
    expect(controlledPublicationEnabled(undefined)).toBe(false);
  });
});

