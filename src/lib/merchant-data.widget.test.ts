import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }));

import { getWidgetDataByToken } from './merchant-data';

const widgetRow = {
  id: 7,
  slug: 'demo',
  brand_name: 'Demo',
  b_slug: 'demo',
  widget_token: 'wgt',
  widget_type: 'ribbon',
  w_theme: 'light',
  w_config: {},
  claimed: false,
  verified_level: 'unverified',
  observed_orders_count: 0,
  trust_score: 0,
  coverage_percentage: 0,
  issues_per_thousand: 0,
  resolution_rate: 0,
  median_response_hours: 0,
};

describe('widget aggregates exclude automated reviews', () => {
  beforeEach(() => queryMock.mockReset());

  it('counts, averages, and verified counts from non-automated published rows only', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await getWidgetDataByToken('wgt');
    const sql = String(queryMock.mock.calls[0][0]);
    const aggregate = sql.split('GROUP BY business_id')[0];
    expect(aggregate).toMatch(/COUNT\(\*\) as cnt/);
    expect(aggregate).toMatch(/AVG\(rating\) as avg_rat/);
    expect(aggregate).toMatch(/COUNT\(\*\) FILTER \(WHERE verification_level <> 'unverified_experience'\) as verified_cnt/);
    expect(aggregate).toMatch(/WHERE status = 'published'/);
    expect(aggregate).toMatch(/AND content_origin IS DISTINCT FROM 'automated'/);
    expect(sql).not.toMatch(/COALESCE\(r\.avg_rat, 5\.0\)/);
  });

  it('returns a null average instead of a fabricated 5.0 when no customer reviews remain', async () => {
    queryMock.mockResolvedValue({
      rows: [{ ...widgetRow, rev_count: 0, verified_cnt: 0, avg_rating: null }],
    });
    const data = await getWidgetDataByToken('wgt');
    expect(data?.calculated_rating).toBeNull();
    expect(data?.review_count).toBe(0);
    expect(data?.verified_reviews_count).toBe(0);
  });

  it('keeps the customer average and verified count the query already excluded', async () => {
    queryMock.mockResolvedValue({
      rows: [{ ...widgetRow, rev_count: 2, verified_cnt: 1, avg_rating: '4.25' }],
    });
    const data = await getWidgetDataByToken('wgt');
    expect(data?.calculated_rating).toBe(4.3);
    expect(data?.review_count).toBe(2);
    expect(data?.verified_reviews_count).toBe(1);
  });
});
