/**
 * BL-04 / OPN-06: reviews start pending, are rate limited per client, refuse
 * duplicates, check a captcha when configured, and need admin approval.
 * The database is mocked; synthetic values only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  calls: [] as Array<{ sql: string; params: unknown[] }>,
  recentCount: 0,
  duplicate: false,
}));

vi.mock('@/lib/db', () => {
  const query = async (sql: string, params: unknown[] = []) => {
    db.calls.push({ sql, params });
    if (/FROM businesses WHERE id/i.test(sql)) return { rows: [{ id: 7, observed_orders_count: 0, invited_orders_count: 0, median_response_hours: 4 }] };
    if (/COUNT\(\*\)::text AS count FROM reviews/i.test(sql)) return { rows: [{ count: String(db.recentCount) }] };
    if (/body_hash = \$1/i.test(sql)) return { rows: db.duplicate ? [{ id: 1 }] : [] };
    if (/INSERT INTO reviews/i.test(sql)) return { rows: [{ id: 9, business_id: 7, rating: 4, body: params[4], status: 'pending' }] };
    return { rows: [] };
  };
  return { query, withTransaction: async (fn: (c: { query: typeof query }) => unknown) => fn({ query }) };
});

import { POST as postReview } from '@/app/api/v1/reviews/route';
import { REVIEWS_PER_CLIENT_PER_HOUR } from '@/lib/authz/policy';
import { moderateReview, normalizeReviewBody, reviewBodyHash, verifyCaptcha } from '@/lib/review-moderation';

const valid = { business_id: 7, rating: 4, body: 'Buen servicio y entrega a tiempo', author_name: 'Ana Prueba' };
const req = (body: unknown, ip = '203.0.113.5') =>
  new Request('http://localhost/api/v1/reviews', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) }) as never;
const inserts = () => db.calls.filter((c) => /INSERT INTO reviews/i.test(c.sql));

beforeEach(() => {
  db.calls.length = 0;
  db.recentCount = 0;
  db.duplicate = false;
  delete process.env.TURNSTILE_SECRET_KEY;
});
afterEach(() => {
  delete process.env.TURNSTILE_SECRET_KEY;
  vi.unstubAllGlobals();
});

describe('review POST moderation', () => {
  it('inserts the review as pending and does not recalculate the score', async () => {
    const res = await postReview(req(valid));
    expect(res.status).toBe(201);
    expect(inserts()).toHaveLength(1);
    expect(inserts()[0].sql).toMatch(/'pending'/);
    expect(inserts()[0].sql).not.toMatch(/'published'/);
    expect(db.calls.some((c) => /UPDATE businesses/i.test(c.sql))).toBe(false);
    expect((await res.json()).updated_metrics).toBeNull();
  });

  it('returns 429 once a client reaches the hourly limit, before any write', async () => {
    db.recentCount = REVIEWS_PER_CLIENT_PER_HOUR;
    const res = await postReview(req(valid));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(inserts()).toHaveLength(0);
  });

  it('allows a client just under the limit', async () => {
    db.recentCount = REVIEWS_PER_CLIENT_PER_HOUR - 1;
    expect((await postReview(req(valid))).status).toBe(201);
  });

  it('stores only hashes of the client address and body, never the raw address', async () => {
    await postReview(req(valid, '198.51.100.77'));
    const params = inserts()[0].params.map(String);
    expect(params.some((p) => p.includes('198.51.100.77'))).toBe(false);
    expect(params).toContain(reviewBodyHash(valid.body));
  });

  it('refuses a duplicate body or email with 409 and no insert', async () => {
    db.duplicate = true;
    const res = await postReview(req({ ...valid, author_email: 'ana@example.test' }));
    expect(res.status).toBe(409);
    expect(inserts()).toHaveLength(0);
  });

  it('hashes the email (case-insensitive) for the duplicate check, without storing it', async () => {
    await postReview(req({ ...valid, author_email: 'Ana@Example.test' }));
    const a = inserts()[0].params[12];
    db.calls.length = 0;
    await postReview(req({ ...valid, body: 'Otro texto distinto aqui', author_email: 'ana@example.test' }));
    expect(inserts()[0].params[12]).toBe(a);
    expect(JSON.stringify(inserts()[0].params)).not.toMatch(/example\.test/i);
  });

  it('rejects a malformed email with 400', async () => {
    expect((await postReview(req({ ...valid, author_email: 'no-es-correo' }))).status).toBe(400);
    expect(inserts()).toHaveLength(0);
  });

  it('treats bodies that differ only by case, spacing, accents and punctuation as the same', () => {
    expect(normalizeReviewBody('  ¡Excelente   Atención!! ')).toBe(normalizeReviewBody('excelente atencion'));
    expect(reviewBodyHash('Muy bueno.')).toBe(reviewBodyHash('muy  bueno'));
  });
});

describe('captcha (Turnstile, env TURNSTILE_SECRET_KEY)', () => {
  it('is a no-op when the secret is unset: no network call, review accepted', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await postReview(req(valid))).status).toBe(201);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await verifyCaptcha(undefined, '1.2.3.4', {})).toBe('skipped');
  });

  it('refuses a missing token when configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-name-only';
    const res = await postReview(req(valid));
    expect(res.status).toBe(400);
    expect(inserts()).toHaveLength(0);
  });

  it('accepts a token the verifier approves and refuses one it rejects', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-name-only';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }))));
    expect((await postReview(req({ ...valid, captcha_token: 'tok' }))).status).toBe(201);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    expect((await postReview(req({ ...valid, captcha_token: 'tok' }))).status).toBe(400);
  });

  it('fails closed with 503 when the verifier is unreachable', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-name-only';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    expect((await postReview(req({ ...valid, captcha_token: 'tok' }))).status).toBe(503);
    expect(inserts()).toHaveLength(0);
  });
});

describe('moderateReview (admin queue)', () => {
  const clientWith = (updateRows: unknown[]) => {
    const calls: string[] = [];
    return {
      calls,
      query: vi.fn(async (sql: string) => {
        calls.push(sql);
        if (/^\s*UPDATE reviews/i.test(sql)) return { rows: updateRows };
        if (/FROM businesses WHERE id/i.test(sql)) return { rows: [{ id: 7, observed_orders_count: 0, invited_orders_count: 0, median_response_hours: 4 }] };
        return { rows: [] };
      }),
    };
  };

  it('approve publishes only a pending review and recalculates the score', async () => {
    const c = clientWith([{ business_id: 7, verification_level: 'confirmed_store_order' }]);
    expect(await moderateReview(c as never, { reviewId: 9, decision: 'approve', administratorUserId: 1 })).toBe(true);
    const update = c.query.mock.calls[0] as unknown as [string, unknown[]];
    expect(update[0]).toMatch(/AND status = \$4/);
    expect(update[1]).toEqual(['published', 1, 9, 'pending']);
    expect(c.calls.some((s) => /UPDATE businesses/i.test(s))).toBe(true);
  });

  it('reject removes the review and leaves the score alone', async () => {
    const c = clientWith([{ business_id: 7, verification_level: 'unverified_experience' }]);
    expect(await moderateReview(c as never, { reviewId: 9, decision: 'reject', administratorUserId: 1 })).toBe(true);
    expect((c.query.mock.calls[0] as unknown as [string, unknown[]])[1][0]).toBe('removed');
    expect(c.calls.some((s) => /UPDATE businesses/i.test(s))).toBe(false);
  });

  it('returns false and changes nothing when the review is not pending', async () => {
    const c = clientWith([]);
    expect(await moderateReview(c as never, { reviewId: 9, decision: 'approve', administratorUserId: 1 })).toBe(false);
    expect(c.calls).toHaveLength(1);
  });
});
