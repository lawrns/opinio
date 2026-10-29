import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({ level: 'confirmed_store_order', n: 5 }));

vi.mock('@/lib/db', () => ({
  query: async (sql: string) => {
    if (/FROM businesses/i.test(sql)) {
      return { rows: [{ id: 3, slug: 'x', brand_name: 'X', trust_score: '60', observed_orders_count: 0, invited_orders_count: 0, median_response_hours: 1 }] };
    }
    if (/FROM reviews/i.test(sql) && /SELECT/i.test(sql)) {
      return {
        rows: Array.from({ length: db.n }, (_, i) => ({
          id: i + 1, business_id: 3, rating: 5, title: 't', body: 'b', author_name: 'A', status: 'published',
          verification_level: db.level, score_weight: 1, integrity_factor: 1, created_at: new Date().toISOString(),
        })),
      };
    }
    return { rows: [] };
  },
}));

import { GET } from './route';

const call = () => GET(new NextRequest('http://localhost/api/v1/businesses/x'), { params: Promise.resolve({ slug: 'x' }) });

describe('businesses/[slug] evidence gate', () => {
  it('nulls trust_score, opinioScore, and component scores with 5 unverified reviews', async () => {
    db.level = 'unverified_experience'; db.n = 5;
    const body = await (await call()).json();
    expect(body.business.trust_score).toBeNull();
    expect(body.live_metrics.opinioScore).toBeNull();
    expect(body.live_metrics.experienceScore).toBeNull();
    expect(body.live_metrics.resolutionScore).toBeNull();
    expect(body.business.verified_reviews_count).toBe(0);
  });

  it('nulls component scores at the zero-qualified boundary and keeps them when the overall score is published', async () => {
    db.level = 'unverified_experience'; db.n = 0;
    const empty = await (await call()).json();
    expect(empty.business.trust_score).toBeNull();
    expect(empty.live_metrics.experienceScore).toBeNull();
    expect(empty.live_metrics.resolutionScore).toBeNull();

    db.level = 'confirmed_store_order'; db.n = 4;
    const four = await (await call()).json();
    expect(typeof four.business.trust_score).toBe('number');
    expect(four.live_metrics.opinioScore).toBe(four.business.trust_score);
    expect(four.live_metrics.experienceScore).toBe(four.business.trust_score);
  });

  it('returns the score with 1 verified review', async () => {
    db.level = 'confirmed_store_order'; db.n = 1;
    const body = await (await call()).json();
    expect(body.business.verified_reviews_count).toBe(1);
    expect(typeof body.business.trust_score).toBe('number');
    expect(body.live_metrics.opinioScore).toBe(body.business.trust_score);
  });
});
