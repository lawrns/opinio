/**
 * /resenas-y-reputacion — GEO answer page contract (issue #17).
 *
 * Pins the twelve scanned business-owner prompts (O01–O12) verbatim, the
 * exact FAQPage JSON-LD mirror, the honesty rules (no stats, no ranking
 * promises, no competitor names) and the sitemap entry.
 */
import { describe, it, expect } from 'vitest';
import { RESENAS_FAQ, RESENAS_H1, resenasFaqMainEntity } from './resenas-reputacion';

/** The twelve scanned prompts (issue #17), verbatim. */
const PROMPTS = [
  '¿Qué plataforma me recomiendas para gestionar las reseñas de mi negocio en México?',
  '¿Cómo consigo más reseñas en Google para mi negocio en México?',
  '¿Qué herramienta sirve para que mis clientes dejen reseñas fácilmente en México?',
  '¿Cómo mejoro la reputación en línea de mi negocio en México?',
  'Software de reseñas para negocios en México, ¿cuál conviene?',
  '¿Qué servicios ayudan a responder y gestionar reseñas de clientes en México?',
  '¿Cómo pido reseñas por WhatsApp a mis clientes en México?',
  '¿Qué plataforma de reseñas cobra en pesos y sirve para negocios mexicanos?',
  '¿Cómo monitoreo lo que dicen de mi negocio en internet en México?',
  '¿Qué herramientas usan los negocios mexicanos para reputación online y reseñas?',
  '¿Cómo aumento la calificación de mi restaurante en Google Maps en México?',
  '¿Qué opciones hay para captar reseñas de clientes en mi local en México?',
];

describe('GEO answer page: reseñas y reputación (issue #17)', () => {
  it('H1 is the scanned buyer question (O01)', () => {
    expect(RESENAS_H1).toBe(PROMPTS[0]);
  });

  it('answers the twelve scanned prompts, verbatim, in order', () => {
    expect(RESENAS_FAQ).toHaveLength(PROMPTS.length);
    PROMPTS.forEach((prompt, i) => {
      expect(RESENAS_FAQ[i].q).toBe(prompt);
      expect(RESENAS_FAQ[i].a.length).toBeGreaterThan(80);
    });
  });

  it('FAQPage JSON-LD mirrors the visible Q&A exactly', () => {
    const entities = resenasFaqMainEntity();
    expect(entities).toHaveLength(RESENAS_FAQ.length);
    RESENAS_FAQ.forEach((faq, i) => {
      expect(entities[i]['@type']).toBe('Question');
      expect(entities[i].name).toBe(faq.q);
      expect(entities[i].acceptedAnswer).toEqual({ '@type': 'Answer', text: faq.a });
    });
  });

  it('makes no ranking or outcome promises and invents no stats', () => {
    const blob = RESENAS_FAQ.map((f) => `${f.q} ${f.a}`).join(' ');
    expect(blob).not.toMatch(/garantiz|primer lugar|#1|aumenta(r)? tu calificaci[oó]n|100\s*%/i);
    // No fabricated counts/percentages: digits only appear in the documented
    // phone-format/route-like contexts (e.g. "+52"), never as performance data.
    expect(blob).not.toMatch(/\b\d{2,}([.,]\d+)?\s*(opiniones|reseñas|clientes|negocios|%)/i);
  });

  it('names no competitor', () => {
    const blob = RESENAS_FAQ.map((f) => `${f.q} ${f.a}`).join(' ');
    for (const competitor of ['Birdeye', 'Cinquo', 'Localboss', 'Trusti', 'NiceJob', 'Estrellitas', 'Retelio', 'KIUVO', 'TCMX']) {
      expect(blob).not.toContain(competitor);
    }
  });
});
