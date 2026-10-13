/**
 * Pure public-directory pagination contract. Kept free of database/cache imports
 * so the page-identity rules can be unit tested on their own.
 */

/**
 * Number of businesses rendered per public directory page. The directory renders
 * the catalogue in bounded slices so the initial HTML/RSC payload stays small
 * while every merchant stays reachable through ordinary anchor navigation.
 */
export const DIRECTORY_PAGE_SIZE = 60;

const CATEGORY_FALLBACK = 'General';

/** Selected directory page from the public `page` query parameter. */
export interface DirectoryPageSelection {
  page: number;
  /** True when the URL carried an explicit `page` parameter. */
  explicit: boolean;
}

/** Category entry of the public directory navigation index. */
export interface DirectoryCategory {
  /** Category display name. */
  name: string;
  /** Total businesses in this category across the whole public catalogue. */
  count: number;
  /** 1-based directory page that contains this category's first business. */
  firstPage: number;
}

export function normalizeCategory(category: string | null | undefined): string {
  const trimmed = category?.trim();
  return trimmed ? trimmed : CATEGORY_FALLBACK;
}

/**
 * Reads the public `page` query parameter. Absent or empty values mean page 1;
 * any value that cannot identify a page (`page=0`, `page=abc`, `page=1.5`)
 * returns `null` so the caller can answer with a real 404 instead of an
 * unbounded set of soft-duplicate URLs.
 */
export function selectDirectoryPage(
  raw: string | string[] | undefined
): DirectoryPageSelection | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value.trim() === '') return { page: 1, explicit: false };
  if (!/^[0-9]+$/.test(value.trim())) return null;
  const page = Number(value.trim());
  if (!Number.isSafeInteger(page) || page < 1) return null;
  return { page, explicit: true };
}

/** Page numbers rendered as links around the current page, with `null` gaps. */
export function directoryPageWindow(current: number, total: number, radius = 2): (number | null)[] {
  const candidates: number[] = [1];
  for (let page = current - radius; page <= current + radius; page += 1) candidates.push(page);
  candidates.push(total);

  const ordered = candidates
    .filter((page) => page >= 1 && page <= total)
    .filter((page, index, all) => all.indexOf(page) === index)
    .sort((a, b) => a - b);

  const window: (number | null)[] = [];
  let previous = 0;
  for (const page of ordered) {
    if (previous && page - previous > 1) window.push(null);
    window.push(page);
    previous = page;
  }
  return window;
}

/** Canonical public URL for a directory page (`page=1` is the bare directory). */
export function directoryPageHref(page: number): string {
  return page > 1 ? `/directorio?page=${page}` : '/directorio';
}

/** Anchor id used for a category section, stable across directory pages. */
export function categorySectionId(category: string): string {
  return `cat-${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}`;
}
