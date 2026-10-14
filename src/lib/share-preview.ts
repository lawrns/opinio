import type { Metadata } from 'next';

/**
 * The shared link-preview surface for the supported public families (issue #10).
 *
 * The audit found 299 URLs without `og:title` or `og:image`, and pages that
 * declared Open Graph blocks served the site fallback instead of their own
 * identity. Every public family builds its preview from the same reviewed
 * title/description it already serves in `<head>`, through this helper, so the
 * share card and the document can never drift apart.
 *
 * The preview image is the platform's own card — no merchant facts, scores or
 * verification claims — served by `src/app/compartir/preview/route.tsx`. URLs
 * stay relative on purpose: Next composes them with the root `metadataBase`, so
 * the emitted `og:image`/`og:url` always live on the deployment's public origin
 * and are really fetchable there.
 */

/** The one public preview card every supported family shares. */
export const SHARED_PREVIEW_IMAGE = {
  path: '/compartir/preview',
  width: 1200,
  height: 630,
  alt: 'Opinio México — Pasaporte de Confianza Comercial',
} as const;

/** The reviewed page identity the preview must reuse verbatim. */
export interface SharePreviewIdentity {
  title: string;
  description: string;
  /**
   * Public URL identity of the page: its canonical path, or the family's
   * parameter-free purpose path. Never a private identifier or a query echo.
   */
  url: string;
}

/** The metadata fragment a family spreads into its `Metadata` export. */
export type SharePreviewMetadata = Pick<Metadata, 'openGraph' | 'twitter'>;

/**
 * Open Graph and Twitter preview metadata for one page family, built from the
 * page's reviewed identity. The `url` is passed through as given (relative
 * paths resolve against the root `metadataBase`).
 */
export function sharePreview({ title, description, url }: SharePreviewIdentity): SharePreviewMetadata {
  return {
    openGraph: {
      title,
      description,
      url,
      siteName: 'Opinio.mx',
      locale: 'es_MX',
      type: 'website',
      images: [
        {
          url: SHARED_PREVIEW_IMAGE.path,
          width: SHARED_PREVIEW_IMAGE.width,
          height: SHARED_PREVIEW_IMAGE.height,
          alt: SHARED_PREVIEW_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SHARED_PREVIEW_IMAGE.path],
    },
  };
}
