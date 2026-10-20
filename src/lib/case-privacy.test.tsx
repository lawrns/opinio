/**
 * OPN-05 / OPN-12 (BL-05 review): the case page, the public business payload
 * and the invitation list expose no private thread, no enumerable case id and
 * no cross-tenant rows. Database, cookies and merchant session are mocked.
 * Synthetic values only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { hashSecret } from '@/lib/authz/secrets';

const TOKEN = 'synthetic-session-token';
const ctl = vi.hoisted(() => ({
  calls: [] as Array<{ sql: string; params: unknown[] }>,
  cookie: undefined as string | undefined, // value of opinio_case_7
  userId: null as number | null,
  memberOf: 1, // business the signed-in user belongs to
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'opinio_case_7' && ctl.cookie ? { value: ctl.cookie } : undefined), has: () => false }),
}));
vi.mock('@/lib/authz/session', () => ({ currentMerchantUserId: async () => ctl.userId }));
vi.mock('@/components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/Footer', () => ({ Footer: () => null }));

vi.mock('@/lib/db', () => {
  const caseRow = {
    id: 7, business_id: 1, review_id: null, order_id: null, case_number: 'CASO-DEMO-2026-0001', customer_name: 'Comprador Demo',
    issue_category: 'damaged_goods', customer_requested_remedy: 'replacement', status: 'remedy_offered', is_consumer_confirmed: false,
    remedy_offered: 'SENTINEL_REMEDY_TEXT', resolution_summary: 'SENTINEL_SUMMARY_TEXT', median_first_response_minutes: 5,
    total_resolution_hours: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', resolved_at: null,
    brand_name: 'Comercio Demo', business_slug: 'comercio-demo',
  };
  const business = {
    id: 1, slug: 'comercio-demo', brand_name: 'Comercio Demo', observed_orders_count: 0, invited_orders_count: 0,
    median_response_hours: '4', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
  const query = async (sql: string, params: unknown[] = []) => {
    ctl.calls.push({ sql, params });
    if (/FROM case_messages/i.test(sql)) return { rows: [{ id: 1, case_id: 7, sender_type: 'consumer', sender_name: 'Comprador', message: 'SENTINEL_THREAD_TEXT', is_private: false, created_at: '2026-01-01T00:00:00Z' }] };
    if (/FROM resolution_cases/i.test(sql)) return { rows: [caseRow] };
    if (/FROM businesses/i.test(sql)) return { rows: [business] };
    if (/FROM invitations/i.test(sql)) return { rows: [{ id: 5, business_id: params[0], channel: 'email', status: 'sent', sent_at: '2026-01-01T00:00:00Z', completed_at: null, business_slug: 'comercio-demo', business_brand_name: 'Comercio Demo' }] };
    return { rows: [] };
  };
  const pool = {
    query: async (sql: string, params: unknown[] = []) => {
      if (/FROM case_sessions/i.test(sql)) {
        const live = params[0] === hashSecret(TOKEN) && params[1] === 7;
        return { rows: live ? [{ id: 1 }] : [], rowCount: live ? 1 : 0 };
      }
      if (/FROM business_memberships/i.test(sql)) {
        return params[0] === ctl.memberOf && params[1] === ctl.userId ? { rows: [{ id: 1, role: 'staff' }], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      return { rows: [{ business_id: params[0] }], rowCount: 1 }; // owning-business lookup
    },
  };
  return { query, pool, withTransaction: vi.fn() };
});

import CasoDetailPage from '@/app/caso/[id]/page';
import { GET as getBusiness } from '@/app/api/v1/businesses/[slug]/route';
import { GET as getInvitations } from '@/app/api/v1/invitations/route';
import { GET as getCase } from '@/app/api/v1/cases/[id]/route';

beforeEach(() => {
  ctl.calls.length = 0;
  ctl.cookie = undefined;
  ctl.userId = null;
  ctl.memberOf = 1;
  vi.unstubAllEnvs();
});

describe('/caso/[id] page', () => {
  const render = async () => renderToStaticMarkup((await CasoDetailPage({ params: Promise.resolve({ id: '7' }) })) as React.ReactElement);

  it('without a case session renders the summary but no thread, no outcome text, no composer, and never reads messages', async () => {
    const html = await render();
    expect(html).toContain('case-thread-locked');
    expect(html).toContain('Comercio Demo');
    for (const secret of ['SENTINEL_THREAD_TEXT', 'SENTINEL_REMEDY_TEXT', 'SENTINEL_SUMMARY_TEXT']) expect(html).not.toContain(secret);
    expect(html).not.toContain('case-message');
    expect(ctl.calls.some((c) => /FROM case_messages/i.test(c.sql))).toBe(false);
  });

  it('answers a plain 404 (not a database error) for an id beyond INTEGER', async () => {
    await expect(CasoDetailPage({ params: Promise.resolve({ id: '99999999999' }) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    expect(ctl.calls).toEqual([]);
  });

  it('locked notice links to the access page only when buyer proof is on', async () => {
    expect(await render()).not.toContain('/caso/acceso/reenviar');
    vi.stubEnv('OPINIO_BUYER_PROOF', '1');
    expect(await render()).toContain('/caso/acceso/reenviar');
    vi.unstubAllEnvs();
  });

  it('with a wrong session behaves like no session', async () => {
    ctl.cookie = 'wrong-token';
    expect(await render()).not.toContain('SENTINEL_THREAD_TEXT');
  });

  it('with the live case session renders the thread and composer', async () => {
    ctl.cookie = TOKEN;
    const html = await render();
    expect(html).toContain('SENTINEL_THREAD_TEXT');
    expect(html).toContain('case-message');
    expect(html).not.toContain('case-thread-locked');
  });
});

describe('GET /api/v1/businesses/[slug]', () => {
  it('returns case outcomes without message bodies, ids or case numbers', async () => {
    const res = await getBusiness(new NextRequest('http://localhost/api/v1/businesses/comercio-demo'), { params: Promise.resolve({ slug: 'comercio-demo' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    const payload = JSON.stringify(body.cases);
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0]).toMatchObject({ status: 'remedy_offered', issue_category: 'damaged_goods' });
    expect(payload).not.toMatch(/SENTINEL|CASO-DEMO|messages|case_number|"id"|business_id/);
    expect(ctl.calls.some((c) => /case_messages/i.test(c.sql))).toBe(false);
  });
});

describe('GET /api/v1/invitations', () => {
  const list = (qs: string) => getInvitations(new NextRequest(`http://localhost/api/v1/invitations${qs}`));

  it('returns 401 when signed out, with no invitation query', async () => {
    expect((await list('?business_id=1')).status).toBe(401);
    expect(ctl.calls).toEqual([]);
  });

  it('refuses a signed-in user who is not a member of that business (404, no query)', async () => {
    ctl.userId = 9;
    ctl.memberOf = 2; // member of business 2 only
    expect((await list('?business_id=1')).status).toBe(404);
    expect(ctl.calls).toEqual([]);
  });

  it.each(['', '?business_id=', '?business_id=0', '?business_id=-3', '?business_id=abc', '?business_id=2147483648'])('answers 400 for business_id %j, never listing across tenants', async (qs) => {
    ctl.userId = 9;
    ctl.memberOf = 1;
    expect((await list(qs)).status).toBe(400);
    expect((await list(qs)).headers.get('cache-control')).toBe('private, no-store');
    expect(ctl.calls).toEqual([]);
  });

  it('lists only the member business, private and uncached', async () => {
    ctl.userId = 9;
    ctl.memberOf = 1;
    const res = await list('?business_id=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const call = ctl.calls.find((c) => /FROM invitations/i.test(c.sql))!;
    expect(call.sql).toMatch(/i\.business_id = \$1/);
    expect(call.params[0]).toBe(1);
  });
});

describe('GET /api/v1/cases/[id] hardening', () => {
  it('is private and uncacheable on 200, and 404s an id beyond INTEGER without a query', async () => {
    ctl.calls.length = 0;
    const ok = await getCase(new NextRequest('http://localhost/api/v1/cases/7', { headers: { cookie: `opinio_case_7=${TOKEN}` } }), { params: Promise.resolve({ id: '7' }) });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('cache-control')).toBe('private, no-store');
    ctl.calls.length = 0;
    const big = await getCase(new NextRequest('http://localhost/api/v1/cases/99999999999'), { params: Promise.resolve({ id: '99999999999' }) });
    expect(big.status).toBe(404);
    expect(ctl.calls).toEqual([]);
  });
});
