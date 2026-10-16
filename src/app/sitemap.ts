import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { directoryPageHref } from '@/lib/directory-pagination';
import { getDirectoryIndex } from '@/lib/directory-catalogue';
import { blogSitemapEntries } from '@/lib/blog/sitemap-entries';

interface BusinessSitemapRow {
  slug: string;
  updated_at: Date | null;
}

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = (envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx')
    .replace(/\/+$/, '');
  const businesses = await query<BusinessSitemapRow>(
    `SELECT slug, updated_at
     FROM businesses
     WHERE slug IS NOT NULL
       AND BTRIM(slug) <> ''
       AND slug <> 'locomotion'
     ORDER BY slug ASC`
  );
  const { totalPages } = await getDirectoryIndex();

  return [
    { url: baseUrl },
    { url: `${baseUrl}/directorio` },
    // GEO answer page for business-owner reviews/reputation prompts (issue #17).
    { url: `${baseUrl}/resenas-y-reputacion` },
    // Every real directory page, so crawlers can traverse the whole public
    // catalogue through the paginated directory as well as through /b/ links.
    ...Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
      url: `${baseUrl}${directoryPageHref(index + 2)}`,
    })),
    ...blogSitemapEntries(baseUrl),
    ...businesses.rows.map(({ slug, updated_at }) => ({
      url: `${baseUrl}/b/${slug}`,
      ...(updated_at ? { lastModified: updated_at } : {}),
    })),
  ];
}
