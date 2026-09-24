import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

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

  return [
    { url: baseUrl },
    { url: `${baseUrl}/directorio` },
    ...businesses.rows.map(({ slug, updated_at }) => ({
      url: `${baseUrl}/b/${slug}`,
      ...(updated_at ? { lastModified: updated_at } : {}),
    })),
  ];
}
