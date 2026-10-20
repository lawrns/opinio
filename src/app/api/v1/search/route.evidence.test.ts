import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({ rows: [] as Array<Record<string, unknown>>, sqls: [] as string[] }));
vi.mock('@/lib/db', () => ({
  query: async (sql: string) => {
    db.sqls.push(sql);
    return { rows: db.rows };
  },
}));

import { GET } from './route';

const row = (verified: number) => ({
  id: 1, slug: 'x', brand_name: 'X', trust_score: '73.7', claimed: false, verified_level: 'unverified',
  observed_orders_count: 0, coverage_percentage: '0', issues_per_thousand: '0', resolution_rate: '0',
  median_response_hours: '0', review_count: 5, verified_count: verified, average_rating: '4.0', total_count: 1,
});
const call = (qs = '') => GET(new NextRequest(`http://localhost/api/v1/search${qs}`));

describe('search route evidence gate', () => {
  beforeEach(() => { db.sqls.length = 0; });

  it('returns null score and the verified count below the threshold', async () => {
    db.rows = [row(0)];
    const body = await (await call()).json();
    expect(body.results[0].trust_score).toBeNull();
    expect(body.results[0].verified_reviews_count).toBe(0);
  });

  it('returns the score at the threshold', async () => {
    db.rows = [row(1)];
    const body = await (await call()).json();
    expect(body.results[0].trust_score).toBe(73.7);
    expect(body.results[0].verified_reviews_count).toBe(1);
  });

  it('ranks sub-threshold businesses after scored ones (nulls last)', async () => {
    db.rows = [row(1)];
    await call('?sort=score');
    expect(db.sqls[0]).toMatch(/CASE WHEN stats\.verified_count >= 1 THEN b\.trust_score END DESC NULLS LAST/);
    expect(db.sqls[0]).toMatch(/verification_level <> 'unverified_experience'/);
  });
});
