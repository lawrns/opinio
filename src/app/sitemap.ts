import type { MetadataRoute } from 'next';

/**
 * The only public URL Opinio serves while the published records and ratings are
 * being re-verified. Every other public path (profiles, directory, search,
 * review and case surfaces) answers 410 Gone, so it must not be advertised here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx';

  return [
    {
      url: baseUrl,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
