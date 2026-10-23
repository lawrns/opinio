import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  level: 'confirmed_store_order',
  n: 5,
  cases: 0,
}));

vi.mock('@/lib/db', () => ({
  query: async (sql: string) => {
    if (/FROM businesses/i.test(sql)) {
      return {
        rows: [
          {
            id: 3,
            slug: 'x',
            brand_name: 'X',
            trust_score: '60',
            observed_orders_count: 0,
            invited_orders_count: 0,
            median_response_hours: 1,
          },
        ],
      };
    }
    if (/FROM reviews/i.test(sql) && /SELECT/i.test(sql)) {
      return {
        rows: Array.from({ length: db.n }, (_, i) => ({
          id: i + 1,
          business_id: 3,
          rating: 5,
          title: 't',
          body: 'b',
          author_name: 'A',
          status: 'published',
          verification_level: db.level,
          score_weight: 1,
          integrity_factor: 1,
          created_at: new Date().toISOString(),
        })),
      };
    }
    if (/FROM resolution_cases/i.test(sql) && /SELECT/i.test(sql)) {
      return {
        rows: Array.from({ length: db.cases }, (_, i) => ({
          id: i + 1,
          business_id: 3,
          review_id: null,
          order_id: null,
          case_number: `C-${i + 1}`,
          issue_category: 'delay',
          customer_requested_remedy: 'refund',
          status: 'resolved_consumer_confirmed',
          is_consumer_confirmed: true,
          remedy_offered: 'refund',
          resolution_summary: 'done',
          median_first_response_minutes: 30,
          total_resolution_hours: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        })),
      };
    }
    return { rows: [] };
  },
}));

import { GET } from './route';

const call = () =>
  GET(new NextRequest('http://localhost/api/v1/businesses/x'), {
    params: Promise.resolve({ slug: 'x' }),
  });

describe('businesses/[slug] evidence gate (OPN-BL12-API-COMPONENT-SCORE)', () => {
  it('withholds trust_score, opinioScore, experienceScore, and resolutionScore with 0 reviews (never leaks 75 baseline)', async () => {
    db.level = 'confirmed_store_order';
    db.n = 0;
    db.cases = 0;
    const body = await (await call()).json();
    expect(body.business.verified_reviews_count).toBe(0);
    expect(body.business.trust_score).toBeNull();
    expect(body.live_metrics).toEqual({
      opinioScore: null,
      experienceScore: null,
      resolutionScore: null,
      confidenceLevel: 'preliminary',
      effectiveSampleSize: 0,
      coveragePercentage: 0,
      issuesPerThousand: 0,
      resolutionRate: 0,
    });
    expect(JSON.stringify(body)).not.toContain('75');
  });

  it('nulls trust_score, opinioScore, experienceScore, and resolutionScore with 5 unverified reviews and 5 cases', async () => {
    db.level = 'unverified_experience';
    db.n = 5;
    db.cases = 5;
    const body = await (await call()).json();
    expect(body.business.verified_reviews_count).toBe(0);
    expect(body.business.trust_score).toBeNull();
    expect(body.live_metrics.opinioScore).toBeNull();
    expect(body.live_metrics.experienceScore).toBeNull();
    expect(body.live_metrics.resolutionScore).toBeNull();
  });

  it.each([1, 4, 5])('returns consistent composite and component scores with %i qualified verified reviews', async (qualifiedCount) => {
    db.level = 'confirmed_store_order';
    db.n = qualifiedCount;
    db.cases = 0;
    const body = await (await call()).json();
    expect(body.business.verified_reviews_count).toBe(qualifiedCount);
    expect(typeof body.business.trust_score).toBe('number');
    expect(body.live_metrics.opinioScore).toBe(body.business.trust_score);
    expect(body.live_metrics.experienceScore).toBe(body.business.trust_score);
    expect(body.live_metrics.resolutionScore).toBeNull();
  });
});

