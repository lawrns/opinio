import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const queryMock = vi.fn();
vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => queryMock(...args) }));

import { GET, normalizeRfcQuery } from './route';

// Fake DB: the fuzzy path (phone digits "1234567") would wrongly return Ahal;
// the exact-RFC path must only return rows whose rfc equals the param.
const ahal = { id: 'a', slug: 'ahal-cosmetica', rfc: 'AAA010101AAA', claimed: true, verified_level: 'transparent_coverage', observed_orders_count: 3, trust_score: '80', coverage_percentage: '50', issues_per_thousand: '1', resolution_rate: '90', median_response_hours: '2', review_count: 0, average_rating: null, total_count: 1 };

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockImplementation(async (sql: string, params: unknown[]) => {
    const exact = params[8] as string | null;
    if (exact) return { rows: ahal.rfc === exact && sql.includes('UPPER(b.rfc) = $9') ? [ahal] : [] };
    return { rows: [ahal] };
  });
});

const get = (q: string) => GET(new NextRequest(`http://localhost/api/v1/search?q=${encodeURIComponent(q)}`));

describe('normalizeRfcQuery', () => {
  it('normalizes valid RFCs and rejects non-RFC text', () => {
    expect(normalizeRfcQuery(' luu1234567ab ')).toBe('LUU1234567AB');
    expect(normalizeRfcQuery('aaa-010101-aaa')).toBe('AAA010101AAA');
    expect(normalizeRfcQuery('ahal cosmetica')).toBeNull();
    expect(normalizeRfcQuery('5512345678')).toBeNull();
  });
});

describe('GET /api/v1/search RFC matching', () => {
  it('returns no_match and no results for a non-existent RFC', async () => {
    const body = await (await get('LUU1234567AB')).json();
    expect(body.match_state).toBe('no_match');
    expect(body.results).toEqual([]);
    expect(queryMock.mock.calls[0][0]).not.toContain('ILIKE $2 OR b.slug');
  });

  it('returns only the exact business for an existing RFC (case-insensitive)', async () => {
    const body = await (await get('aaa010101aaa')).json();
    expect(body.results.map((r: { slug: string }) => r.slug)).toEqual(['ahal-cosmetica']);
    expect(queryMock.mock.calls[0][1][8]).toBe('AAA010101AAA');
  });

  it('keeps fuzzy search for non-RFC queries', async () => {
    const body = await (await get('ahal')).json();
    expect(body.results).toHaveLength(1);
    expect(queryMock.mock.calls[0][1][8]).toBeNull();
  });
});
