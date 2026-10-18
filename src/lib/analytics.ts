import { pageForPath } from './conversion/pages';

/** One allowlist for page views and conversion events: src/lib/conversion/pages.ts. */
export function isPublicAnalyticsPath(pathname: string): boolean {
  return pageForPath(pathname) !== null;
}

/**
 * The page_view location: origin + path, never the query or fragment. A blog
 * article is sent as its template (`/blog/post`), so a mistyped or crafted
 * slug (a 404 still renders under the layout) never reaches GA4.
 */
export function analyticsPageLocation(href: string): string | null {
  const url = new URL(href);
  const page = pageForPath(url.pathname);
  if (!page) return null;
  return url.origin + (page.pageId === 'blog_post' ? page.templatePath : url.pathname);
}

export function analyticsReferrer(referrer: string): string {
  return referrer ? new URL(referrer).origin + '/' : '';
}

/**
 * Query keys a public page reads to work (search, filters, pagination, a
 * prefilled business). Everything else on a landing (utm_*, ad click IDs, an
 * email or name someone put in a link) is tracking or personal data. A key a
 * page starts reading must be added here; review-round2.test.ts fails until
 * it is.
 */
export const FUNCTIONAL_QUERY_KEYS: Record<string, readonly string[]> = {
  '/verificar': ['q', 'accion', 'categoria', 'cat', 'rating', 'connected', 'sort'],
  '/directorio': ['page'],
  '/caso/nuevo': ['b'],
};

/**
 * Removes every non-functional query key from a public page's URL BEFORE
 * gtag.js loads (QA-042). GA4's own history-change page_view (Enhanced
 * Measurement) reports the real URLs as dl/dr, ignoring the sanitized
 * page_location/page_referrer, so the URL GA4 first sees must not carry
 * them. Call only after the landing touch has read the query. Keeps the
 * fragment. Passes a null state so Next's router adopts the clean URL too
 * (with its own `__NA` state it would keep the old one and could write the
 * params back). Returns whether the URL changed.
 *
 * Search text (`/verificar?q=`) stays in the URL on purpose; only turning off
 * "page changes based on browser history events" on the GA4 stream keeps it
 * out of GA4.
 */
export function stripLandingTracking(win: Pick<Window, 'location' | 'history'> = window): boolean {
  const { pathname, search, hash } = win.location;
  if (!search || !isPublicAnalyticsPath(pathname)) return false;
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const key of FUNCTIONAL_QUERY_KEYS[pathname] ?? []) for (const value of params.getAll(key)) kept.append(key, value);
  const clean = kept.toString() ? `?${kept.toString()}` : '';
  if (clean === search) return false;
  win.history.replaceState(null, '', `${pathname}${clean}${hash}`);
  return true;
}
