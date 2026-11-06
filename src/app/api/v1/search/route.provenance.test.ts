import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Origin = 'automated' | 'customer_submitted' | 'imported' | null;
interface FixtureReview {
  business_id: number;
  status: string;
  rating: number;
  content_origin: Origin;
  verification_level: string;
}
interface FixtureBusiness {
  id: number;
  slug: string;
  brand_name: string;
  claimed: boolean;
  verified_level: string;
  observed_orders_count: number;
  trust_score: string;
  coverage_percentage: string;
  issues_per_thousand: string;
  resolution_rate: string;
  median_response_hours: string;
}

const businesses: FixtureBusiness[] = [
  { id: 1, slug: 'alta', brand_name: 'Alta', claimed: false, verified_level: 'unverified', observed_orders_count: 0, trust_score: '80', coverage_percentage: '0', issues_per_thousand: '0', resolution_rate: '0', median_response_hours: '0' },
  { id: 2, slug: 'inflada', brand_name: 'Inflada', claimed: false, verified_level: 'unverified', observed_orders_count: 0, trust_score: '70', coverage_percentage: '0', issues_per_thousand: '0', resolution_rate: '0', median_response_hours: '0' },
  { id: 3, slug: 'volumen', brand_name: 'Volumen', claimed: false, verified_level: 'unverified', observed_orders_count: 0, trust_score: '60', coverage_percentage: '0', issues_per_thousand: '0', resolution_rate: '0', median_response_hours: '0' },
  { id: 4, slug: 'solo', brand_name: 'Solo', claimed: false, verified_level: 'unverified', observed_orders_count: 0, trust_score: '90', coverage_percentage: '0', issues_per_thousand: '0', resolution_rate: '0', median_response_hours: '0' },
];

const reviews: FixtureReview[] = [
  { business_id: 1, status: 'published', rating: 5, content_origin: null, verification_level: 'confirmed_store_order' },
  { business_id: 1, status: 'published', rating: 1, content_origin: 'automated', verification_level: 'unverified_experience' },
  { business_id: 2, status: 'published', rating: 2, content_origin: 'customer_submitted', verification_level: 'unverified_experience' },
  { business_id: 2, status: 'published', rating: 5, content_origin: 'automated', verification_level: 'confirmed_store_order' },
  { business_id: 2, status: 'published', rating: 5, content_origin: 'automated', verification_level: 'unverified_experience' },
  { business_id: 3, status: 'published', rating: 4, content_origin: null, verification_level: 'unverified_experience' },
  { business_id: 3, status: 'published', rating: 4, content_origin: 'imported', verification_level: 'unverified_experience' },
  { business_id: 3, status: 'published', rating: 4, content_origin: 'customer_submitted', verification_level: 'unverified_experience' },
  { business_id: 3, status: 'removed', rating: 5, content_origin: null, verification_level: 'confirmed_store_order' },
  { business_id: 4, status: 'published', rating: 5, content_origin: 'automated', verification_level: 'unverified_experience' },
];

const captured: string[] = [];

function statsFor(sql: string, businessId: number) {
  const dropAutomated = /AND r\.content_origin IS DISTINCT FROM 'automated'/.test(sql);
  const rows = reviews.filter((review) => (
    review.business_id === businessId
    && review.status === 'published'
    && !(dropAutomated && review.content_origin === 'automated')
  ));
  const average = rows.length ? rows.reduce((sum, review) => sum + review.rating, 0) / rows.length : null;
  return {
    review_count: rows.length,
    average_rating: average == null ? null : Math.round(average * 10) / 10,
    verified_count: rows.filter((review) => review.verification_level !== 'unverified_experience').length,
  };
}

function compareNullableDesc(left: number | null, right: number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

vi.mock('@/lib/db', () => ({
  query: async (sql: string, params: unknown[] = []) => {
    captured.push(sql);
    const minRating = Number(params[6] ?? 0);
    const ranked = businesses
      .map((business) => ({ ...business, ...statsFor(sql, business.id) }))
      .filter((business) => minRating === 0 || (business.average_rating != null && business.average_rating >= minRating));
    const ratingSort = /ORDER BY stats\.average_rating DESC NULLS LAST, stats\.review_count DESC/.test(sql);
    const reviewSort = /ORDER BY stats\.review_count DESC, stats\.average_rating DESC NULLS LAST/.test(sql);
    ranked.sort((left, right) => {
      if (reviewSort) {
        return right.review_count - left.review_count
          || compareNullableDesc(left.average_rating, right.average_rating)
          || left.id - right.id;
      }
      if (ratingSort) {
        return compareNullableDesc(left.average_rating, right.average_rating)
          || right.review_count - left.review_count
          || left.id - right.id;
      }
      return right.review_count - left.review_count || left.id - right.id;
    });
    return { rows: ranked.map((business) => ({ ...business, total_count: ranked.length })) };
  },
}));

import { GET } from './route';

const call = (qs: string) => GET(new NextRequest(`http://localhost/api/v1/search${qs}`));
const slugs = async (qs: string) => ((await (await call(qs)).json()).results as Array<{ slug: string }>).map((row) => row.slug);

describe('search customer aggregates exclude automated reviews', () => {
  beforeEach(() => { captured.length = 0; });

  it('keeps automated rows out of counts, averages, verified counts, rating filters, and rating sorts', async () => {
    const body = await (await call('?sort=rating')).json();
    const bySlug = Object.fromEntries(body.results.map((row: { slug: string }) => [row.slug, row]));

    expect(body.results.map((row: { slug: string }) => row.slug)).toEqual(['alta', 'volumen', 'inflada', 'solo']);
    expect(bySlug.alta).toEqual(expect.objectContaining({ review_count: 1, average_rating: 5, verified_reviews_count: 1 }));
    expect(bySlug.inflada).toEqual(expect.objectContaining({ review_count: 1, average_rating: 2, verified_reviews_count: 0 }));
    expect(bySlug.volumen).toEqual(expect.objectContaining({ review_count: 3, average_rating: 4, verified_reviews_count: 0 }));
    expect(bySlug.solo).toEqual(expect.objectContaining({ review_count: 0, average_rating: null, verified_reviews_count: 0 }));
    expect(captured[0]).toMatch(/AND r\.content_origin IS DISTINCT FROM 'automated'/);
    expect(captured[0]).toMatch(/ORDER BY stats\.average_rating DESC NULLS LAST, stats\.review_count DESC/);
  });

  it('ranks by customer review count, not automated volume', async () => {
    expect(await slugs('?sort=reviews')).toEqual(['volumen', 'alta', 'inflada', 'solo']);
    expect(captured[0]).toMatch(/ORDER BY stats\.review_count DESC, stats\.average_rating DESC NULLS LAST/);
    expect(captured[0].split(') stats ON true')[0]).toMatch(/AND r\.content_origin IS DISTINCT FROM 'automated'/);
  });

  it('applies the rating filter to the customer average', async () => {
    expect(await slugs('?rating=4')).toEqual(['volumen', 'alta']);
    expect(captured[0]).toMatch(/\$7::numeric = 0 OR stats\.average_rating >= \$7/);
    expect(captured[0].split(') stats ON true')[0]).toMatch(/AVG\(r\.rating\) AS average_rating/);
    expect(captured[0].split(') stats ON true')[0]).toMatch(/AND r\.content_origin IS DISTINCT FROM 'automated'/);
  });
});
