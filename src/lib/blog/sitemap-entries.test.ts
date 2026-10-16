/**
 * Blog sitemap entries: the index and every published article, with the
 * article's frontmatter date as lastModified.
 */
import { describe, it, expect } from 'vitest';
import { blogSitemapEntries } from './sitemap-entries';

describe('blogSitemapEntries', () => {
  const entries = blogSitemapEntries('https://opinio.mx');

  it('lists the blog index', () => {
    expect(entries[0]).toMatchObject({ url: 'https://opinio.mx/blog', changeFrequency: 'weekly' });
  });

  it('lists the published article with its date', () => {
    const article = entries.find(
      (entry) => entry.url === 'https://opinio.mx/blog/como-pedir-resenas-por-whatsapp-mexico',
    );
    expect(article).toBeTruthy();
    expect(article!.lastModified?.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(article!.changeFrequency).toBe('monthly');
  });

  it('uses the given base URL', () => {
    const staging = blogSitemapEntries('https://staging.opinio.mx');
    expect(staging.every((entry) => entry.url.startsWith('https://staging.opinio.mx/blog'))).toBe(true);
  });
});
