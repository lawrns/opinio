/**
 * Opinio public containment (P0).
 *
 * The public trust surfaces are offline until every published record can be
 * traced back to its source: merchant passports, the seeded directory, the
 * search/browse pages, the review wizard and the case portal all carry
 * unverified profile data, ratings and submissions. They answer 410 Gone so
 * search engines drop them instead of re-crawling them.
 *
 * App Router pages cannot set a response status themselves, so the status is
 * produced here, before any page render or database access. Private surfaces
 * (`/merchant/*`) and the informational holding page (`/`) are not matched.
 * The public review/case endpoints reject requests inside their own route
 * handlers, which is where an endpoint's response belongs.
 */
export const config = {
  matcher: [
    '/b/:path*',
    '/directorio',
    '/verificar',
    '/escribir-opinion/:path*',
    '/caso/:path*',
    '/widget/:path*',
  ],
};

export function proxy() {
  return new Response(
    'Este contenido ya no está disponible. Opinio México mantiene sus perfiles públicos fuera de línea.\n',
    {
      status: 410,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    }
  );
}
