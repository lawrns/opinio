/**
 * /blog sitemap entries, appended to the site sitemap (src/app/sitemap.ts).
 * Extracted so the entries can be unit-tested without the database the rest of
 * the sitemap needs.
 */
import { getAllPosts } from './posts'

export interface BlogSitemapEntry {
  url: string
  lastModified?: Date
  changeFrequency: 'weekly' | 'monthly'
  priority: number
}

export function blogSitemapEntries(baseUrl: string): BlogSitemapEntry[] {
  return [
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    ...getAllPosts().map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00.000Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
