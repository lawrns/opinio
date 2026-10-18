/**
 * Blog markdown pipeline: the FAQPage pairs must be exactly the text the
 * article shows — these tests compare the extracted pairs against the visible
 * text rendered from the same file (question in the summary, answer as the
 * inline-rendered paragraph).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  extractFaqs,
  inlinePlainText,
  renderMarkdown,
  splitFaqSection,
  stripLeadingTitle,
} from './markdown';

const ARTICLE_PATH = path.join(
  process.cwd(),
  'content',
  'blog',
  'como-pedir-resenas-por-whatsapp-mexico.md',
);

const raw = fs.readFileSync(ARTICLE_PATH, 'utf8');
const body = raw.replace(/^---[\s\S]*?---\n/, '');

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

describe('splitFaqSection', () => {
  it('preserves the following section separately from the FAQ answer', () => {
    const source = 'Intro.\n\n## Preguntas frecuentes\n\n### ¿Una?\n\nSí.\n\n## Siguiente paso\n\n[Continuar](https://opinio.mx/resenas-y-reputacion).';
    const result = splitFaqSection(source);
    expect(result.body).toBe('Intro.');
    expect(result.faqs.map(({ q, a }) => ({ q, a }))).toEqual([{ q: '¿Una?', a: 'Sí.' }]);
    expect(result.afterFaq).toBe('## Siguiente paso\n\n[Continuar](https://opinio.mx/resenas-y-reputacion).');
  });

  it('uses markdown heading tokens rather than a heading-looking line inside code', () => {
    const source = 'Intro.\n\n## Preguntas frecuentes\n\n### ¿Una?\n\nSí.\n\n~~~text\n## Solo un ejemplo\n~~~\n\nSigue siendo respuesta.\n\n## Siguiente paso\n\nContinuar.';
    const result = splitFaqSection(source);
    expect(result.faqs[0].a).toBe('Sí. Sigue siendo respuesta.');
    expect(result.afterFaq).toBe('## Siguiente paso\n\nContinuar.');
  });

  it('separates the body from the FAQ section', () => {
    const { body: articleBody, faqs } = splitFaqSection(stripLeadingTitle(body, 'título'));
    expect(faqs).toHaveLength(6);
    expect(articleBody).toContain('## Buenas prácticas al pedir reseñas por WhatsApp');
    expect(articleBody).not.toContain('Preguntas frecuentes');
    expect(articleBody).not.toContain('¿La invitación se manda sola por WhatsApp?');
  });

  it('returns the whole document as body when the section is absent', () => {
    const { body: articleBody, faqs } = splitFaqSection('# Título\n\nUn párrafo.');
    expect(faqs).toEqual([]);
    expect(articleBody).toBe('# Título\n\nUn párrafo.');
  });

  it('keeps the first FAQ answer exactly as the page will show it', () => {
    const { faqs } = splitFaqSection(stripLeadingTitle(body, 'título'));
    expect(faqs[0].q).toBe('¿La invitación se manda sola por WhatsApp?');
    expect(faqs[0].a).toBe(
      'No. En el panel de comercios registras el teléfono (+52) del cliente y compartes tú el formulario público de opiniones de tu negocio por WhatsApp (o email). Opinio registra la invitación, pero no envía el mensaje ni confirma su entrega. La invitación registrada cuenta en la cobertura de tu perfil.',
    );
  });

  it('matches the visible FAQ text exactly, links included', () => {
    const { faqs } = splitFaqSection(stripLeadingTitle(body, 'título'));
    for (const faq of faqs) {
      // The accordion shows the question as plain text and the answer as the
      // inline-rendered HTML; its text content must equal the JSON-LD text.
      expect(faq.a).toBe(stripTags(faq.aHtml));
    }
    const last = faqs[5];
    expect(last.aHtml).toContain('<a href="https://opinio.mx/directorio"');
    expect(last.a).toContain('directorio público de Opinio');
  });
});

describe('extractFaqs', () => {
  it('stops at the next h2', () => {
    const md = '## Preguntas frecuentes\n\n### ¿Una?\nSí.\n\n## Otra sección\n\n### ¿Dos?\nNo.';
    expect(extractFaqs(md).map((f) => [f.q, f.a])).toEqual([['¿Una?', 'Sí.']]);
  });
});

describe('inlinePlainText', () => {
  it('strips inline markup and decodes entities', () => {
    expect(inlinePlainText('Un **plan** con [precio](https://opinio.mx) & más')).toBe(
      'Un plan con precio & más',
    );
    expect(inlinePlainText('"comillas" y &lt;etiquetas&gt;')).toBe('"comillas" y <etiquetas>');
  });
});

describe('stripLeadingTitle', () => {
  it('drops the leading h1 when it repeats the frontmatter title', () => {
    const title = '¿Cómo pido reseñas por WhatsApp a mis clientes en México?';
    expect(stripLeadingTitle(`# ${title}\n\nPrimer párrafo.`, title)).toBe('Primer párrafo.');
  });

  it('keeps the body untouched when the h1 differs', () => {
    const md = '# Otro encabezado\n\nPrimer párrafo.';
    expect(stripLeadingTitle(md, 'Título distinto')).toBe(md);
  });
});

describe('renderMarkdown', () => {
  it('renders the article body without the FAQ heading', () => {
    const { body: articleBody } = splitFaqSection(stripLeadingTitle(body, 'título'));
    const html = renderMarkdown(articleBody);
    expect(html).toContain('<h2');
    expect(html).toContain('Invitar a un cliente');
    expect(html).not.toContain('Preguntas frecuentes');
  });
});
