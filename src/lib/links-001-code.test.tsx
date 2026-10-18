import { expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import parity from './links-001-code-parity.json';
import Page from '@/app/resenas-y-reputacion/page';
function text(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

it('OPINIO-03 links exactly the mapped phrase and preserves its entire FAQ answer', () => {
  const html = renderToStaticMarkup(<Page />);
  const sentence =
    'Con Opinio registras la invitación a un cliente (por WhatsApp o email) y compartes el formulario público de opiniones de tu negocio; el cliente deja su experiencia y la opinión se publica en tu perfil con el tipo de comprobante disponible. Así el proceso queda ligado a clientes reales y no a reseñas sueltas.';
  const paragraph = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g))
    .map((m) => m[1])
    .find((p) => text(p) === sentence)!;
  expect(paragraph).toBeDefined();
  const links = Array.from(paragraph.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g));
  expect(links).toHaveLength(1);
  expect(links[0][1]).toContain(
    'href="/blog/como-pedir-resenas-por-whatsapp-mexico"',
  );
  expect(text(links[0][2])).toBe(
    'registras la invitación a un cliente (por WhatsApp o email)',
  );
  expect(links[0][2]).not.toMatch(/<(?:a|button)\b/);
});

it('keeps all 12 FAQPage answers plain and equal to their visible answers', () => {
  const html = renderToStaticMarkup(<Page />);
  const schema = Array.from(
    html.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  )
    .map((m) => JSON.parse(m[1]))
    .find((s) => s['@type'] === 'FAQPage');
  const visible = Array.from(
    html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g),
  ).map((m) => ({
    name: text(m[1].match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)![1]),
    answer: text(m[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/)![1]),
  }));
  expect(visible).toHaveLength(12);
  expect(
    schema.mainEntity.map(
      (q: { name: string; acceptedAnswer: { text: string } }) => ({
        name: q.name,
        answer: q.acceptedAnswer.text,
      }),
    ),
  ).toEqual(visible);
  expect(JSON.stringify(schema)).not.toMatch(/<\/?a[ >]/);
});

it('preserves the full source page rendered text byte for byte', () => {
  const hash = createHash('sha256')
    .update(text(renderToStaticMarkup(<Page />)))
    .digest('hex');
  expect({ resenas: hash }).toEqual(parity);
});
