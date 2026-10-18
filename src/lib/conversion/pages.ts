/**
 * conversion/pages.ts — reviewed public route → page ID map (Opinio). Private
 * routes (/merchant, /caso/<id> case pages, API) and unknown routes map to
 * null. Dynamic public routes map to a template.
 */
const STATIC_PAGES: Record<string, string> = {
  '/': 'home',
  '/directorio': 'directory',
  '/verificar': 'search',
  '/caso/nuevo': 'case_new',
  '/blog': 'blog_index',
  '/resenas-y-reputacion': 'reputation_landing',
};

export type PageMapping = { pageId: string; templatePath: string };

export function pageForPath(pathname: string | null | undefined): PageMapping | null {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null;
  const path = (pathname.split(/[?#]/, 1)[0] || '/').replace(/(.)\/+$/, '$1');
  const staticId = STATIC_PAGES[path];
  if (staticId) return { pageId: staticId, templatePath: path };
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 2 && seg[0] === 'b') return { pageId: 'passport', templatePath: '/b/business' };
  if (seg.length === 2 && seg[0] === 'escribir-opinion') return { pageId: 'review_form', templatePath: '/escribir-opinion/business' };
  // Slug-shaped only (articles are lowercase-hyphenated), matching the old
  // isPublicAnalyticsPath rule; page views send the template, not the slug.
  if (seg.length === 2 && seg[0] === 'blog' && /^[a-z0-9-]{1,120}$/.test(seg[1])) return { pageId: 'blog_post', templatePath: '/blog/post' };
  return null;
}

export function pageIdForPath(pathname: string | null | undefined): string | null {
  return pageForPath(pathname)?.pageId ?? null;
}

export function allPageIds(): string[] {
  return [...new Set([...Object.values(STATIC_PAGES), 'passport', 'review_form', 'blog_post'])];
}
