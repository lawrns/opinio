import { unstable_cache } from 'next/cache';
import { query } from '@/lib/db';
import { DIRECTORY_PAGE_SIZE, normalizeCategory, type DirectoryCategory } from '@/lib/directory-pagination';

/**
 * Canonical SQL expression for a business category. Mirrors
 * `normalizeCategory` from `@/lib/directory-pagination` so page grouping,
 * category counts and pagination ordering agree on category identity.
 */
const CATEGORY_SQL = `COALESCE(NULLIF(BTRIM(b.category), ''), 'General')`;
const CATEGORY_SQL_UNALIASED = `COALESCE(NULLIF(BTRIM(category), ''), 'General')`;

/** Revalidated window for the public catalogue reads (public data only). */
const CATALOGUE_CACHE_SECONDS = 3600;
const CATALOGUE_CACHE_TAG = 'directory-catalogue';

export interface DirectoryBusiness {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  trust_score: number | string | null;
  effective_reviews_count: number | string | null;
  operating_area: string | null;
  logo_url: string | null;
  claimed: boolean;
}

export interface DirectoryIndex {
  categories: DirectoryCategory[];
  totalBusinesses: number;
  totalPages: number;
}

interface CategoryCountRow {
  category: string;
  count: number;
  first_row: number;
}

const getCachedCategoryIndex = unstable_cache(
  async (): Promise<CategoryCountRow[]> => {
    const result = await query<CategoryCountRow>(
      `SELECT category, count, SUM(count) OVER (ORDER BY count DESC, category ASC) - count AS first_row
       FROM (
         SELECT ${CATEGORY_SQL_UNALIASED} AS category, COUNT(*)::int AS count
         FROM businesses
         WHERE slug IS NOT NULL
         GROUP BY 1
       ) AS grouped
       ORDER BY count DESC, category ASC`
    );
    return result.rows;
  },
  ['directory-category-index'],
  { revalidate: CATALOGUE_CACHE_SECONDS, tags: [CATALOGUE_CACHE_TAG] }
);

const getCachedBusinessSlice = unstable_cache(
  async (offset: number, limit: number): Promise<DirectoryBusiness[]> => {
    const result = await query<DirectoryBusiness>(
      `WITH category_counts AS (
         SELECT ${CATEGORY_SQL_UNALIASED} AS category, COUNT(*)::int AS count
         FROM businesses
         WHERE slug IS NOT NULL
         GROUP BY 1
       ),
       ranked AS (
         SELECT b.id, b.slug, b.brand_name, b.legal_name, b.category, b.trust_score, b.effective_reviews_count,
                b.operating_area, b.logo_url, b.claimed,
                ROW_NUMBER() OVER (
                  ORDER BY cc.count DESC, ${CATEGORY_SQL} ASC, b.brand_name ASC, b.id ASC
                ) AS row_number
         FROM businesses b
         JOIN category_counts cc ON cc.category = ${CATEGORY_SQL}
         WHERE b.slug IS NOT NULL
       )
       SELECT id, slug, brand_name, legal_name, category, trust_score, effective_reviews_count, operating_area, logo_url, claimed
       FROM ranked
       WHERE row_number > $1 AND row_number <= $2
       ORDER BY row_number`,
      [offset, offset + limit]
    );
    return result.rows;
  },
  ['directory-business-slice'],
  { revalidate: CATALOGUE_CACHE_SECONDS, tags: [CATALOGUE_CACHE_TAG] }
);

/**
 * Full public-catalogue index: category popularity order (largest category
 * first, then name) plus the directory page each category starts on. This is
 * the navigation contract the directory has always shown, kept intact while the
 * business lists themselves are paginated.
 */
export async function getDirectoryIndex(): Promise<DirectoryIndex> {
  const rows = await getCachedCategoryIndex();
  const categories: DirectoryCategory[] = rows.map((row) => ({
    name: normalizeCategory(row.category),
    count: Number(row.count),
    firstPage: Math.floor(Number(row.first_row) / DIRECTORY_PAGE_SIZE) + 1,
  }));
  const totalBusinesses = categories.reduce((total, category) => total + category.count, 0);
  return {
    categories,
    totalBusinesses,
    totalPages: Math.max(1, Math.ceil(totalBusinesses / DIRECTORY_PAGE_SIZE)),
  };
}

/** Bounded public catalogue slice for one directory page, in catalogue order. */
export async function getDirectoryBusinesses(page: number): Promise<DirectoryBusiness[]> {
  const offset = (page - 1) * DIRECTORY_PAGE_SIZE;
  return getCachedBusinessSlice(offset, DIRECTORY_PAGE_SIZE);
}
