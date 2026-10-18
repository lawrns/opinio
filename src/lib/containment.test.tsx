import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';

// Synthetic sentinels, not real data. The fake database returns them on every
// row, so any merchant page that reached the database would leak them.
const NAME = 'SENTINEL_BUYER_NAME';
const CONTACT = 'sentinel-contact@example.invalid';
const SENTINELS = [NAME, CONTACT];

const db = vi.hoisted(() => {
  const state = { calls: [] as { text: string; params: unknown[] }[] };
  const business = {
    id: 1, slug: 'comercio-demo', brand_name: 'Comercio Demo', legal_name: null, category: 'Retail DTC',
    description: null, rfc: null, clee: null, phone: null, whatsapp: null, domain: null, logo_url: null,
    banner_url: null, operating_area: null, claimed: false, verified_level: 'unverified', trust_score: '0',
    confidence_level: 'preliminary', coverage_percentage: '0', observed_orders_count: 0, invited_orders_count: 0,
    issues_per_thousand: '0', resolution_rate: '0', median_response_hours: '0', reopen_rate: '0',
    effective_reviews_count: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
  const caseRow = {
    id: 7, business_id: 1, review_id: null, order_id: 3, case_number: 'CASO-DEMO-2026-0001',
    customer_name: 'SENTINEL_BUYER_NAME', customer_contact: 'sentinel-contact@example.invalid',
    issue_category: 'damaged_goods', customer_requested_remedy: 'replacement', status: 'opened',
    is_consumer_confirmed: false, remedy_offered: null, resolution_summary: null, median_first_response_minutes: 45,
    total_resolution_hours: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', resolved_at: null,
    brand_name: 'Comercio Demo', business_slug: 'comercio-demo',
  };
  async function query(text: string, params: unknown[] = []) {
    state.calls.push({ text, params });
    const sql = text.replace(/\s+/g, ' ').trim();
    if (/^INSERT INTO reviews/.test(sql)) {
      return { rows: [{ id: 9, business_id: 1, rating: params[2], verification_level: params[7], status: 'published', author_name: 'Ana', body: 'x', created_at: '2026-01-02T00:00:00Z' }] };
    }
    if (/^INSERT INTO case_messages/.test(sql)) {
      return { rows: [{ id: 99, case_id: params[0], sender_type: params[1], sender_name: params[2], message: params[3], is_private: params[4], created_at: '2026-01-02T00:00:00Z' }] };
    }
    if (/FROM resolution_cases/.test(sql) && /^SELECT/.test(sql)) return { rows: [caseRow] };
    if (/FROM businesses/.test(sql)) return { rows: [business] };
    if (/FROM orders/.test(sql)) return { rows: [{ id: 3, status: 'delivered' }] };
    return { rows: [] };
  }
  return { state, query };
});

vi.mock('@/lib/db', () => ({
  query: db.query,
  withTransaction: async (fn: (client: { query: typeof db.query }) => unknown) => fn({ query: db.query }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { proxy, config as proxyConfig } from '@/proxy';
import { CONTAINED_OPERATIONS, isOperationEnabled } from '@/lib/containment';
import * as actions from '@/lib/merchant-actions';
import { PATCH as patchCase } from '@/app/api/v1/cases/[id]/route';
import { POST as postMessage } from '@/app/api/v1/cases/[id]/messages/route';
import { POST as postResponse } from '@/app/api/v1/reviews/[id]/responses/route';
import { POST as postOrderEvent } from '@/app/api/v1/order-events/route';
import { POST as postInvitation } from '@/app/api/v1/invitations/route';
import { POST as postReview } from '@/app/api/v1/reviews/route';
import { GET as getCase } from '@/app/api/v1/cases/[id]/route';
import { GET as getBusiness } from '@/app/api/v1/businesses/[slug]/route';
import MerchantLayout from '@/app/merchant/layout';
import MerchantDashboardPage from '@/app/merchant/page';
import MerchantInboxPage from '@/app/merchant/inbox/page';
import MerchantInsightsPage from '@/app/merchant/insights/page';
import MerchantIntegrationsPage from '@/app/merchant/integrations/page';
import MerchantRequestsPage from '@/app/merchant/requests/page';
import MerchantReviewsPage from '@/app/merchant/reviews/page';
import MerchantSettingsPage from '@/app/merchant/settings/page';
import MerchantWidgetsPage from '@/app/merchant/widgets/page';
import CasoDetailPage from '@/app/caso/[id]/page';
import BusinessPassportPage from '@/app/b/[slug]/page';
import BlogIndexPage from '@/app/blog/page';

const writes = () => db.state.calls.filter((c) => /^\s*(UPDATE|INSERT|DELETE)/.test(c.text));
const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const caseParams = { params: Promise.resolve({ id: '7' }) };
const searchParams = Promise.resolve({ business: 'comercio-demo' });

function expectNoContact(payload: string) {
  for (const s of SENTINELS) expect(payload).not.toContain(s);
}

beforeEach(() => {
  db.state.calls.length = 0;
  delete process.env.OPINIO_REENABLE_OPS;
});
afterEach(() => {
  delete process.env.OPINIO_REENABLE_OPS;
});

describe('re-enable switches', () => {
  it('every operation is contained by default and re-enables one at a time', () => {
    for (const op of Object.keys(CONTAINED_OPERATIONS) as (keyof typeof CONTAINED_OPERATIONS)[]) {
      expect(isOperationEnabled(op, {})).toBe(false);
      expect(isOperationEnabled(op, { OPINIO_REENABLE_OPS: ` ${op} ,other` })).toBe(true);
    }
    expect(isOperationEnabled('merchant_panel', { OPINIO_REENABLE_OPS: 'order_events' })).toBe(false);
    expect(isOperationEnabled('merchant_panel', { OPINIO_REENABLE_OPS: 'MERCHANT_PANEL' })).toBe(false);
  });
});

describe('merchant pages are unavailable and carry no case data', () => {
  it('the proxy answers every /merchant path with a neutral noindex 503', async () => {
    expect(proxyConfig.matcher).toEqual(['/merchant', '/merchant/:path*']);
    for (const path of ['/merchant', '/merchant/inbox?business=comercio-demo', '/merchant/requests', '/merchant/settings']) {
      const res = proxy(new NextRequest(`http://localhost${path}`));
      expect(res.status).toBe(503);
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      const html = await res.text();
      expect(html).toContain('Panel temporalmente no disponible');
      expect(html).toContain('noindex');
      expectNoContact(html);
    }
  });

  it('server-action POSTs to /merchant are stopped by the proxy too', () => {
    const res = proxy(new NextRequest('http://localhost/merchant/inbox', { method: 'POST', headers: { 'Next-Action': 'abc' } }));
    expect(res.status).toBe(503);
  });

  it('the layout and every page render the neutral page without touching the database', async () => {
    const trees = [
      await MerchantLayout({ children: React.createElement('p', null, 'child') }),
      await MerchantDashboardPage({ searchParams } as never),
      await MerchantInboxPage({ searchParams } as never),
      await MerchantInsightsPage({ searchParams } as never),
      await MerchantIntegrationsPage({ searchParams } as never),
      await MerchantRequestsPage({ searchParams } as never),
      await MerchantReviewsPage({ searchParams } as never),
      await MerchantSettingsPage({ searchParams } as never),
      await MerchantWidgetsPage({ searchParams } as never),
    ];
    for (const tree of trees) {
      const html = renderToStaticMarkup(tree as React.ReactElement);
      expect(html).toContain('Panel temporalmente no disponible');
      expect(html).not.toContain('child');
      expectNoContact(html);
    }
    expect(db.state.calls).toHaveLength(0);
  });

  it('the merchant layout is noindex', async () => {
    const mod = await import('@/app/merchant/layout');
    expect(mod.metadata).toEqual({ robots: { index: false, follow: false } });
  });
});

describe('every unauthenticated merchant write is refused before the database', () => {
  const form = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };

  it.each([
    ['postReviewResponseAction', () => actions.postReviewResponseAction(form({ review_id: '1', business_id: '1', response_text: 'Gracias' }))],
    ['updateCaseRemedyAction', () => actions.updateCaseRemedyAction(form({ case_id: '7', remedy_offered: 'Reemplazo' }))],
    ['sendCaseMessageAction', () => actions.sendCaseMessageAction(form({ case_id: '7', message: 'Hola' }))],
    ['triggerInvitationAction', () => actions.triggerInvitationAction(form({ business_id: '1', recipient_target: 'x@example.invalid', channel: 'email' }))],
    ['updateBusinessSettingsAction', () => actions.updateBusinessSettingsAction(form({ business_id: '1', rfc: 'XAXX010101000', clee: '123' }))],
    ['createOrUpdateWidgetAction', () => actions.createOrUpdateWidgetAction(form({ business_id: '1', widget_type: 'badge' }))],
  ])('%s → 403, no query', async (_name, run) => {
    const result = await run();
    expect(result).toMatchObject({ success: false, status: 403 });
    expect(db.state.calls).toHaveLength(0);
  });

  it.each([
    ['PATCH /cases/[id]', () => patchCase(json('http://localhost/api/v1/cases/7', 'PATCH', { status: 'remedy_offered', remedy_offered: 'x' }), caseParams)],
    ['POST /reviews/[id]/responses', () => postResponse(json('http://localhost/api/v1/reviews/1/responses', 'POST', { response_text: 'Gracias por tu opinión' }), { params: Promise.resolve({ id: '1' }) })],
    ['POST /order-events', () => postOrderEvent(json('http://localhost/api/v1/order-events', 'POST', { business_slug: 'comercio-demo', external_order_id: 'A1' }))],
    ['POST /invitations', () => postInvitation(json('http://localhost/api/v1/invitations', 'POST', { business_id: 1, recipient_target: 'x@example.invalid' }))],
  ])('%s → 403, no query', async (_name, run) => {
    const res = await run();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('temporarily_disabled');
    expect(db.state.calls).toHaveLength(0);
  });
});

// OPINIO-CASES-AUTHZ-2: the public messages route refuses any non-buyer
// sender outright (not as a contained operation), switch on or off; see
// cases-authz.test.ts. Still 403 before any database call.
it.each([
  ['merchant', 'Soporte'],
  ['mediator', 'Opinio'],
])('POST /cases/[id]/messages as %s → 403, no query', async (sender_type, sender_name) => {
  const res = await postMessage(json('http://localhost/api/v1/cases/7/messages', 'POST', { sender_type, sender_name, message: 'Hola' }), caseParams);
  expect(res.status).toBe(403);
  expect(db.state.calls).toHaveLength(0);
});

describe('buyer flows and public pages keep working', () => {
  it('a buyer message on the case page is still accepted', async () => {
    const res = await postMessage(json('http://localhost/api/v1/cases/7/messages', 'POST', { sender_type: 'consumer', sender_name: 'Comprador', message: 'Hola' }), caseParams);
    expect(res.status).toBe(201);
  });

  it('a buyer review is published unverified, without moving the stored score; a purchase claim is refused (OPINIO-CASES-AUTHZ-2)', async () => {
    const res = await postReview(json('http://localhost/api/v1/reviews', 'POST', {
      business_id: 1, rating: 5, body: 'Muy buena atención', author_name: 'Ana', verification_level: 'unverified_experience',
    }));
    expect(res.status).toBe(201);
    const insert = writes().find((c) => /INSERT INTO reviews/.test(c.text))!;
    expect(insert.params[1]).toBeNull();
    expect(insert.params[7]).toBe('unverified_experience');
    expect(writes().some((c) => /UPDATE businesses/.test(c.text))).toBe(false);
    expect(db.state.calls.some((c) => /FROM orders/.test(c.text))).toBe(false);

    db.state.calls.length = 0;
    const claim = await postReview(json('http://localhost/api/v1/reviews', 'POST', {
      business_id: 1, rating: 5, body: 'Muy buena atención', author_name: 'Ana', order_id: 3, verification_level: 'confirmed_payment',
    }));
    expect(claim.status).toBe(403);
    expect(db.state.calls).toHaveLength(0);
  });

  it('public case, business and passport reads still render without contact data', async () => {
    const caseRes = await getCase(json('http://localhost/api/v1/cases/7', 'GET'), caseParams);
    expect(caseRes.status).toBe(200);
    expectNoContact(JSON.stringify(await caseRes.json()));

    const biz = await getBusiness(json('http://localhost/api/v1/businesses/comercio-demo', 'GET'), { params: Promise.resolve({ slug: 'comercio-demo' }) });
    expect(biz.status).toBe(200);

    const caso = await CasoDetailPage({ params: Promise.resolve({ id: '7' }) });
    expect(caso).toBeTruthy();
    const passport = await BusinessPassportPage({ params: Promise.resolve({ slug: 'comercio-demo' }) });
    expect(passport).toBeTruthy();
    expect(BlogIndexPage()).toBeTruthy();
  });

  it('the proxy does not run on public routes', () => {
    const matcher = proxyConfig.matcher.map((m) => new RegExp(`^${m.replace('/:path*', '(/.*)?')}$`));
    for (const path of ['/', '/b/comercio-demo', '/directorio', '/blog', '/caso/7', '/api/v1/search', '/escribir-opinion/comercio-demo', '/merchantes']) {
      expect(matcher.some((m) => m.test(path)), path).toBe(false);
    }
  });
});

describe('once re-enabled for auth B, operations run again', () => {
  it('merchant_panel lets the proxy through', () => {
    process.env.OPINIO_REENABLE_OPS = 'merchant_panel';
    const res = proxy(new NextRequest('http://localhost/merchant'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('case_remedy re-enables only updateCaseRemedyAction', async () => {
    process.env.OPINIO_REENABLE_OPS = 'case_remedy';
    const f = new FormData();
    f.set('case_id', '7');
    f.set('remedy_offered', 'Reemplazo');
    expect(await actions.updateCaseRemedyAction(f)).toEqual({ success: true });
    const g = new FormData();
    g.set('business_id', '1');
    expect(await actions.updateBusinessSettingsAction(g)).toMatchObject({ status: 403 });
  });
});
