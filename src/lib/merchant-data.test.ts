import { afterAll, describe, expect, it, vi } from 'vitest';
import { pool } from './db';
import { getMerchantBusinesses, getMerchantCases, getMerchantCasesForBusinesses } from './merchant-data';

/**
 * Regression for issue #2: the merchant layout used to issue one
 * `resolution_cases` query per listed business (plus one per case for messages).
 * Against the remote production database (~160 ms per round trip, ~1200
 * businesses, pool `max: 15` / `connectionTimeoutMillis: 5000`) the queued
 * checkouts outlived the pool budget, so every `/merchant/*` route answered
 * HTTP 500.
 *
 * The failure mechanism is query volume, so the regression pins the volume:
 * loading the case data of every business must stay a constant, small number of
 * statements no matter how many businesses exist.
 *
 * Needs a reachable Postgres in DATABASE_URL (the isolated local one); the suite
 * is skipped without it. Run with:
 *   DATABASE_URL=postgres://opinio:...@127.0.0.1:54732/opinio_issue_2 pnpm test
 */
const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase('merchant case loading (issue #2 pool-starvation regression)', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('keeps the statement count constant instead of one statement per business', async () => {
    const businesses = await getMerchantBusinesses();
    expect(businesses.length).toBeGreaterThan(0);
    const businessIds = businesses.map((business) => business.id);

    const spy = vi.spyOn(pool, 'query');

    spy.mockClear();
    const sampleCases = await getMerchantCasesForBusinesses(businessIds.slice(0, 5));
    const sampleStatements = spy.mock.calls.length;

    spy.mockClear();
    const allCases = await getMerchantCasesForBusinesses(businessIds);
    const allStatements = spy.mock.calls.length;

    expect(allStatements).toBe(sampleStatements);
    expect(allStatements).toBeLessThanOrEqual(3);
    expect(Array.isArray(allCases)).toBe(true);
    expect(sampleCases.length).toBeLessThanOrEqual(allCases.length);

    spy.mockClear();
    await getMerchantCases(businessIds[0]);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3);

    spy.mockRestore();
  });

  it('returns the same case shape per business as the single-business loader', async () => {
    const businesses = await getMerchantBusinesses();
    const businessIds = businesses.map((business) => business.id);
    const batched = await getMerchantCasesForBusinesses(businessIds);

    const coveredBusinessIds = [...new Set(batched.map((resolutionCase) => resolutionCase.business_id))];
    for (const businessId of coveredBusinessIds.slice(0, 3)) {
      const single = await getMerchantCases(businessId);
      const fromBatch = batched.filter((resolutionCase) => resolutionCase.business_id === businessId);

      expect(fromBatch.map((resolutionCase) => resolutionCase.id)).toEqual(
        single.map((resolutionCase) => resolutionCase.id)
      );
      expect(Object.keys(fromBatch[0]).sort()).toEqual(Object.keys(single[0]).sort());
      expect(fromBatch[0].messages).toEqual(single[0].messages);
    }

    if (coveredBusinessIds.length === 0) {
      // No resolution cases in this database: the statement-count guard above is
      // the load-bearing assertion, and shape parity is asserted on real rows
      // whenever the database has some.
      expect(batched).toEqual([]);
    }
  });
});
