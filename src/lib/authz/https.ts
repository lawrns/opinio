/**
 * True when the app is served over HTTPS, which selects `__Host-` cookies.
 * AUTH_URL decides when set; without it, production builds assume HTTPS so a
 * missing setting fails toward the stricter cookie.
 */
export function servedOverHttps(): boolean {
  const url = process.env.AUTH_URL;
  if (url) return url.startsWith('https://');
  return process.env.NODE_ENV === 'production';
}
