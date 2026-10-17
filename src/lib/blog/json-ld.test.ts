/**
 * Blog JSON-LD builders: the Article node points at the site's Organization
 * (same @id the home page defines) and the FAQPage node mirrors the article's
 * own pairs.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, it, expect } from 'vitest';
import { buildArticleJsonLd, buildBlogFaqPageJsonLd } from './json-ld';
import { renderMarkdown } from './markdown';
import { getAllPosts, getPostBySlug } from './posts';

function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

describe('buildArticleJsonLd', () => {
  const input = {
    headline: '¿Cómo pido reseñas por WhatsApp a mis clientes en México?',
    description: 'Pide reseñas por WhatsApp a tus clientes en México.',
    url: 'https://opinio.mx/blog/como-pedir-resenas-por-whatsapp-mexico',
    datePublished: '2026-10-15',
    siteUrl: 'https://opinio.mx',
  };

  it('builds an Article with the canonical URL and dates', () => {
    const jsonLd = buildArticleJsonLd(input);
    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.headline).toBe(input.headline);
    expect(jsonLd.url).toBe(input.url);
    expect(jsonLd.datePublished).toBe('2026-10-15');
    expect(jsonLd.dateModified).toBe('2026-10-15');
    expect(jsonLd.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': input.url });
  });

  it('points author and publisher at the site Organization', () => {
    const jsonLd = buildArticleJsonLd(input);
    expect(jsonLd.author).toEqual({ '@id': 'https://opinio.mx#organization' });
    expect(jsonLd.publisher).toEqual({ '@id': 'https://opinio.mx#organization' });
  });
});

describe('buildBlogFaqPageJsonLd from the article', () => {
  it.each(getAllPosts().map(({ slug }) => slug))('matches only each question\'s own visible answer in %s', (slug) => {
    const post = getPostBySlug(slug)!;
    // Read each source question independently of the loader's FAQ extraction.
    // The next h2 belongs outside the answers, even if schema and accordion
    // accidentally acquire the same closing CTA text.
    const { content } = matter(fs.readFileSync(path.join(process.cwd(), 'content/blog', slug + '.md'), 'utf8'));
    const section = content.split(/^## Preguntas frecuentes\s*$/m)[1]?.split(/^## /m)[0];
    expect(section).toBeDefined();
    const expected = section!.split(/^### /m).slice(1).map((group) => {
      const [question, ...answer] = group.trim().split('\n');
      return { q: visibleText(renderMarkdown(question)), a: visibleText(renderMarkdown(answer.join('\n'))) };
    });
    expect(expected.length).toBeGreaterThan(0);
    const visible = post.faqs.map(({ q, aHtml }) => ({ q, a: visibleText(aHtml) }));
    expect(visible).toEqual(expected);

    const jsonLd = buildBlogFaqPageJsonLd(post.faqs);
    expect(jsonLd['@type']).toBe('FAQPage');
    const mainEntity = jsonLd.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
    expect(mainEntity.map(({ name, acceptedAnswer }) => ({ q: name, a: acceptedAnswer.text }))).toEqual(expected);
  });
});
