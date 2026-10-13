export function isPublicAnalyticsPath(pathname: string): boolean {
  return pathname === '/'
    || pathname === '/directorio'
    || pathname === '/verificar'
    || pathname === '/caso/nuevo'
    || /^\/b\/[^/]+$/.test(pathname)
    || /^\/escribir-opinion\/[^/]+$/.test(pathname);
}

export function analyticsPageLocation(href: string): string | null {
  const url = new URL(href);
  return isPublicAnalyticsPath(url.pathname) ? url.origin + url.pathname : null;
}

export function analyticsReferrer(referrer: string): string {
  return referrer ? new URL(referrer).origin + '/' : '';
}
