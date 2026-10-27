import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { startDatabase, type TestDatabase } from '@/test/e2e/harness';

const FIXED_ISO = '2026-10-01T12:00:00.000Z';

const db = vi.hoisted(() => ({
  level: 'confirmed_store_order',
  n: 5,
  cases: 0,
  delegate: null as null | ((sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>),
}));

vi.mock('@/lib/db', () => ({
  query: async (sql: string, params?: unknown[]) => {
    if (db.delegate) {
      return db.delegate(sql, params);
    }
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
          created_at: FIXED_ISO,
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
          created_at: FIXED_ISO,
          updated_at: FIXED_ISO,
          resolved_at: FIXED_ISO,
        })),
      };
    }
    return { rows: [] };
  },
}));

import { GET } from './route';

const call = (slug = 'x') =>
  GET(new NextRequest(`http://localhost/api/v1/businesses/${slug}`), {
    params: Promise.resolve({ slug }),
  });

describe('businesses/[slug] evidence gate fixture (OPN-BL12-API-COMPONENT-SCORE)', () => {
  it('withholds trust_score, opinioScore, experienceScore, and resolutionScore across the entire public payload with 0 reviews (never leaks 75 baseline)', async () => {
    db.delegate = null;
    db.level = 'confirmed_store_order';
    db.n = 0;
    db.cases = 0;
    const body = await (await call()).json();
    expect(body).toEqual({
      success: true,
      business: {
        id: 3,
        slug: 'x',
        brand_name: 'X',
        trust_score: null,
        verified_reviews_count: 0,
        confidence_level: 'preliminary',
        coverage_percentage: 0,
        observed_orders_count: 0,
        invited_orders_count: 0,
        issues_per_thousand: 0,
        resolution_rate: 0,
        median_response_hours: 1,
        reopen_rate: 0,
        effective_reviews_count: 0,
      },
      identities: [],
      official_records: [],
      reviews: [],
      cases: [],
      live_metrics: {
        opinioScore: null,
        experienceScore: null,
        resolutionScore: null,
        confidenceLevel: 'preliminary',
        effectiveSampleSize: 0,
        coveragePercentage: 0,
        issuesPerThousand: 0,
        resolutionRate: 0,
      },
    });
    expect(JSON.stringify(body)).not.toContain('75');
  });

  it.each([4, 5])('nulls trust_score, opinioScore, experienceScore, and resolutionScore with %i unverified reviews and 5 cases', async (unverifiedCount) => {
    db.delegate = null;
    db.level = 'unverified_experience';
    db.n = unverifiedCount;
    db.cases = 5;
    const body = await (await call()).json();
    expect(body.business.verified_reviews_count).toBe(0);
    expect(body.business.trust_score).toBeNull();
    expect(body.live_metrics).toMatchObject({
      opinioScore: null,
      experienceScore: null,
      resolutionScore: null,
    });
    expect(body.reviews).toHaveLength(unverifiedCount);
    expect(body.cases).toHaveLength(5);
  });

  it.each([1, 4, 5])('returns consistent composite and component scores across the entire public payload with %i qualified verified reviews', async (qualifiedCount) => {
    db.delegate = null;
    db.level = 'confirmed_store_order';
    db.n = qualifiedCount;
    db.cases = 0;
    const body = await (await call()).json();
    expect(Object.keys(body).sort()).toEqual([
      'business',
      'cases',
      'identities',
      'live_metrics',
      'official_records',
      'reviews',
      'success',
    ]);
    expect(body.business.verified_reviews_count).toBe(qualifiedCount);
    expect(typeof body.business.trust_score).toBe('number');
    expect(body.live_metrics.opinioScore).toBe(body.business.trust_score);
    expect(body.live_metrics.experienceScore).toBe(body.business.trust_score);
    expect(body.live_metrics.resolutionScore).toBeNull();
    expect(body.reviews).toHaveLength(qualifiedCount);
  });
});

describe('businesses/[slug] integrated PostgreSQL public response regression (OPN-BL12-API-COMPONENT-SCORE)', () => {
  let pgDb: TestDatabase;

  beforeAll(async () => {
    pgDb = await startDatabase(['src/lib/schema.sql']);
    db.delegate = (sql: string, params?: unknown[]) => pgDb.client.query(sql, params);
  }, 120_000);

  afterAll(async () => {
    db.delegate = null;
    await pgDb?.stop();
  }, 60_000);

  it('asserts entire public payload for 0, 4 (unverified), 4 (qualified), and 5 (qualified) reviews against real PostgreSQL', async () => {
    const bizRes = await pgDb.client.query<{ id: number }>(
      `INSERT INTO businesses (slug, brand_name, category, trust_score, observed_orders_count, invited_orders_count, median_response_hours)
       VALUES ('pg-demo', 'PG Demo', 'Retail DTC', 75.0, 100, 80, 4.0)
       RETURNING id`,
    );
    const bizId = bizRes.rows[0].id;

    // 1. Zero reviews -> all score fields in business and live_metrics are null (stored 75.0 and scorer prior 75 never leak)
    const zeroBody = await (await call('pg-demo')).json();
    expect(zeroBody).toMatchObject({
      success: true,
      business: {
        id: bizId,
        slug: 'pg-demo',
        brand_name: 'PG Demo',
        trust_score: null,
        verified_reviews_count: 0,
        coverage_percentage: 80,
        effective_reviews_count: 0,
      },
      identities: [],
      official_records: [],
      reviews: [],
      cases: [],
      live_metrics: {
        opinioScore: null,
        experienceScore: null,
        resolutionScore: null,
        confidenceLevel: 'preliminary',
        effectiveSampleSize: 0,
        coveragePercentage: 80,
        issuesPerThousand: 0,
        resolutionRate: 0,
      },
    });
    expect(JSON.stringify(zeroBody)).not.toContain('75');

    // 2. Four unverified reviews + 5 resolved cases -> verified_reviews_count is 0, so composite and both components remain null
    for (let i = 1; i <= 4; i++) {
      await pgDb.client.query(
        `INSERT INTO reviews (business_id, rating, title, body, author_name, author_masked_contact, verification_level, score_weight, status)
         VALUES ($1, 5, $2, 'Excelente compra', 'Cliente', 'cl***@opinio.mx', 'unverified_experience', 0.35, 'published')`,
        [bizId, `Unverified ${i}`],
      );
    }
    for (let i = 1; i <= 5; i++) {
      await pgDb.client.query(
        `INSERT INTO resolution_cases (business_id, case_number, customer_name, customer_contact, issue_category, customer_requested_remedy, status, is_consumer_confirmed, total_resolution_hours)
         VALUES ($1, $2, 'Buyer', 'buyer@example.test', 'delay', 'refund', 'resolved_consumer_confirmed', true, 2.0)`,
        [bizId, `OP-PG-${i}`],
      );
    }
    const fourUnverifiedBody = await (await call('pg-demo')).json();
    expect(fourUnverifiedBody.business.verified_reviews_count).toBe(0);
    expect(fourUnverifiedBody.business.trust_score).toBeNull();
    expect(fourUnverifiedBody.live_metrics).toMatchObject({
      opinioScore: null,
      experienceScore: null,
      resolutionScore: null,
    });
    expect(fourUnverifiedBody.reviews).toHaveLength(4);
    expect(fourUnverifiedBody.cases).toHaveLength(5);

    // 3. Upgrade the 4 reviews to qualified verified ('confirmed_store_order') -> 4 qualified reviews
    await pgDb.client.query(
      `UPDATE reviews SET verification_level = 'confirmed_store_order', score_weight = 0.90 WHERE business_id = $1`,
      [bizId],
    );
    const fourQualifiedBody = await (await call('pg-demo')).json();
    expect(fourQualifiedBody.business.verified_reviews_count).toBe(4);
    expect(typeof fourQualifiedBody.business.trust_score).toBe('number');
    expect(fourQualifiedBody.live_metrics.opinioScore).toBe(fourQualifiedBody.business.trust_score);
    expect(typeof fourQualifiedBody.live_metrics.experienceScore).toBe('number');
    expect(typeof fourQualifiedBody.live_metrics.resolutionScore).toBe('number');
    expect(fourQualifiedBody.reviews).toHaveLength(4);

    // 4. Add 5th qualified verified review -> 5 qualified reviews
    await pgDb.client.query(
      `INSERT INTO reviews (business_id, rating, title, body, author_name, author_masked_contact, verification_level, score_weight, status)
       VALUES ($1, 5, 'Verified 5', 'Todo llegó bien', 'Cliente 5', 'c5***@opinio.mx', 'confirmed_payment', 1.00, 'published')`,
      [bizId],
    );
    const fiveQualifiedBody = await (await call('pg-demo')).json();
    expect(fiveQualifiedBody.business.verified_reviews_count).toBe(5);
    expect(typeof fiveQualifiedBody.business.trust_score).toBe('number');
    expect(fiveQualifiedBody.live_metrics.opinioScore).toBe(fiveQualifiedBody.business.trust_score);
    expect(typeof fiveQualifiedBody.live_metrics.experienceScore).toBe('number');
    expect(typeof fiveQualifiedBody.live_metrics.resolutionScore).toBe('number');
    expect(fiveQualifiedBody.reviews).toHaveLength(5);
  });
});


