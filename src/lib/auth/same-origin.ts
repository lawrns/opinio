/**
 * True when the browser says this POST comes from a page on this site.
 * Browsers send Sec-Fetch-Site; the auth pages' no-referrer policy makes them
 * send `Origin: null`, so Origin is the fallback for clients without Fetch
 * Metadata.
 */
export function sameOrigin(request: Pick<Request, 'headers'>): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
