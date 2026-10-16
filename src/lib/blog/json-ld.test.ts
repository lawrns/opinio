/**
 * Blog JSON-LD builders: the Article node points at the site's Organization
 * (same @id the home page defines) and the FAQPage node mirrors the article's
 * own pairs.
 */
import { describe, it, expect } from 'vitest';
import { buildArticleJsonLd, buildBlogFaqPageJsonLd } from './json-ld';
import { getPostBySlug } from './posts';

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
  it('mirrors every question and answer pair', () => {
    const post = getPostBySlug('como-pedir-resenas-por-whatsapp-mexico')!;
    const jsonLd = buildBlogFaqPageJsonLd(post.faqs);
    expect(jsonLd['@type']).toBe('FAQPage');
    const mainEntity = jsonLd.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(post.faqs.length);
    mainEntity.forEach((question, index) => {
      expect(question.name).toBe(post.faqs[index].q);
      expect(question.acceptedAnswer).toEqual({ '@type': 'Answer', text: post.faqs[index].a });
    });
  });
});
