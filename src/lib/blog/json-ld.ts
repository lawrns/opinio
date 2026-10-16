/**
 * JSON-LD builders for the blog.
 *
 * The FAQPage node is built from the same pairs the page renders (posts.ts ->
 * markdown.ts), so the structured data mirrors the visible text by
 * construction. Serialize with `.replace(/</g, '\\u003c')` like the other
 * pages of the site.
 */
import type { BlogFaq } from './markdown'

export interface ArticleJsonLdInput {
  headline: string
  description: string
  /** Absolute article URL. */
  url: string
  /** ISO date (YYYY-MM-DD). */
  datePublished: string
  /** Canonical site base, e.g. https://opinio.mx — the Organization @id lives here. */
  siteUrl: string
}

/** Article schema; author and publisher point at the site's Organization node. */
export function buildArticleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  const organization = { '@id': `${input.siteUrl}#organization` }
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    author: organization,
    publisher: organization,
    inLanguage: 'es-MX',
  }
}

/** FAQPage schema from the article's own pairs (visible text included). */
export function buildBlogFaqPageJsonLd(faqs: readonly BlogFaq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}
