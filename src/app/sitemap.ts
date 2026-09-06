import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

interface BusinessSitemapRow {
  slug: string;
  updated_at: string;
  logo_url: string | null;
}

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Refresh sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://opinio.mx';
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/verificar`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const res = await query<BusinessSitemapRow>(
      `SELECT slug, updated_at, logo_url FROM businesses WHERE slug IS NOT NULL ORDER BY id ASC`
    );

    const businessEntries: MetadataRoute.Sitemap = res.rows.map((b) => ({
      url: `${baseUrl}/b/${b.slug}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: b.logo_url ? [`${baseUrl}${b.logo_url}`] : undefined,
    }));

    return [...staticEntries, ...businessEntries];
  } catch (error) {
    console.error('[sitemap] Failed to query businesses from db, serving static fallback:', error);
    return staticEntries;
  }
}
