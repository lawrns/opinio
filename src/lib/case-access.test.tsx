import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';

// Synthetic sentinels, not real data. The fake database returns them on every
// row (even for queries that select public columns only), so each test checks
// that the projection in code drops them too.
const NAME = 'SENTINEL_BUYER_NAME';
const CONTACT = 'sentinel-contact@example.invalid';
const PRIVATE_BODY = 'SENTINEL_PRIVATE_NOTE';
const RECIPIENT = 'sentinel-recipient@example.invalid';
const INVITE_TOKEN = 'inv_sentinel_token';
const SENTINELS = [NAME, CONTACT, PRIVATE_BODY, RECIPIENT, INVITE_TOKEN];

const db = vi.hoisted(() => {
  const state = {
    calls: [] as { text: string; params: unknown[] }[],
    caseRow: {} as Record<string, unknown>,
  };
  const messages = () => [
    { id: 1, case_id: 7, sender_type: 'consumer', sender_name: 'SENTINEL_BUYER_NAME', message: 'Llegó dañado', is_private: false, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, case_id: 7, sender_type: 'merchant', sender_name: 'Soporte', message: 'SENTINEL_PRIVATE_NOTE', is_private: true, created_at: '2026-01-01T01:00:00Z' },
    { id: 3, case_id: 7, sender_type: 'merchant', sender_name: 'Soporte', message: 'Te enviamos un reemplazo', is_private: false, created_at: '2026-01-01T02:00:00Z' },
  ];
  async function query(text: string, params: unknown[] = []) {
    state.calls.push({ text, params });
    const sql = text.replace(/\s+/g, ' ').trim();
    if (/^UPDATE resolution_cases/.test(sql)) {
      return { rows: [{ ...state.caseRow, status: params[0], is_consumer_confirmed: params[1] }] };
    }
    if (/^INSERT INTO case_messages/.test(sql)) {
      return { rows: [{ id: 99, case_id: params[0], sender_type: params[1], sender_name: params[2], message: params[3], is_private: params[4], created_at: '2026-01-02T00:00:00Z' }] };
    }
    if (/^INSERT INTO resolution_cases/.test(sql)) return { rows: [{ ...state.caseRow }] };
    if (/FROM case_messages/.test(sql)) return { rows: messages() };
    if (/FROM resolution_cases/.test(sql) && /^SELECT/.test(sql)) {
      if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '1', total: '1', confirmed: '0', responded: '1', reopened: '0', avg_hours: null }] };
      return { rows: [{ ...state.caseRow, brand_name: 'Comercio Demo', business_slug: 'comercio-demo', business_brand_name: 'Comercio Demo', business_logo_url: null }] };
    }
    if (/FROM invitations i/.test(sql)) {
      return { rows: [{ id: 5, business_id: 1, order_id: 3, token: 'inv_sentinel_token', channel: 'email', recipient_target: 'sentinel-recipient@example.invalid', status: 'delivered', sent_at: '2026-01-01T00:00:00Z', completed_at: null, customer_name: 'SENTINEL_BUYER_NAME', order_amount: '100.00', business_slug: 'comercio-demo', business_brand_name: 'Comercio Demo' }] };
    }
    if (/FROM businesses WHERE (slug|id)/.test(sql)) {
      return { rows: [{ id: 1, slug: 'comercio-demo', brand_name: 'Comercio Demo', observed_orders_count: 0, invited_orders_count: 0, median_response_hours: 4 }] };
    }
    return { rows: [] };
  }
  return { state, query };
});

vi.mock('@/lib/db', () => ({ query: db.query, withTransaction: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { GET as getCase, PATCH as patchCase } from '@/app/api/v1/cases/[id]/route';
import { POST as postMessage } from '@/app/api/v1/cases/[id]/messages/route';
import { POST as postCase } from '@/app/api/v1/cases/route';
import { GET as getBusiness } from '@/app/api/v1/businesses/[slug]/route';
import { GET as getInvitations } from '@/app/api/v1/invitations/route';
import CasoDetailPage from '@/app/caso/[id]/page';
import { CasePortalClient } from '@/app/caso/[id]/CasePortalClient';
import { updateCaseRemedyAction } from '@/lib/merchant-actions';
import { CONTAINED_OPERATIONS } from '@/lib/containment';

const caseParams = { params: Promise.resolve({ id: '7' }) };

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function expectNoPrivateData(payload: string) {
  for (const sentinel of SENTINELS) expect(payload).not.toContain(sentinel);
  expect(payload).not.toMatch(/customer_(name|contact|email|phone)|recipient_target|is_private/);
}

const writes = () => db.state.calls.filter((c) => /^\s*(UPDATE|INSERT)/.test(c.text));

// These tests run with every contained merchant operation re-enabled, so the
// buyer-confirmation guard and the public projections are proven on their own,
// independent of the merchant containment (covered in containment.test.tsx).
beforeEach(() => {
  process.env.OPINIO_REENABLE_OPS = Object.keys(CONTAINED_OPERATIONS).join(',');
});
afterEach(() => {
  delete process.env.OPINIO_REENABLE_OPS;
});

beforeEach(() => {
  db.state.calls.length = 0;
  db.state.caseRow = {
    id: 7,
    business_id: 1,
    review_id: null,
    order_id: 3,
    case_number: 'CASO-DEMO-2026-0001',
    customer_name: NAME,
    customer_contact: CONTACT,
    issue_category: 'damaged_goods',
    customer_requested_remedy: 'replacement',
    status: 'remedy_offered',
    is_consumer_confirmed: false,
    remedy_offered: 'Reemplazo',
    resolution_summary: null,
    median_first_response_minutes: 45,
    total_resolution_hours: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    resolved_at: null,
  };
});

describe('public case reads carry no buyer contact or private messages', () => {
  it('GET /api/v1/cases/[id] returns the public projection', async () => {
    const res = await getCase(jsonRequest('http://localhost/api/v1/cases/7', 'GET'), caseParams);
    expect(res.status).toBe(200);
    const body = await res.json();
    expectNoPrivateData(JSON.stringify(body));
    expect(body.case.case_number).toBe('CASO-DEMO-2026-0001');
    expect(body.case.messages.map((m: { id: number }) => m.id)).toEqual([1, 3]);
    expect(body.case.messages[0].sender_name).toBe('Comprador');
  });

  it('GET /api/v1/cases/[id] never selects every case column', async () => {
    await getCase(jsonRequest('http://localhost/api/v1/cases/7', 'GET'), caseParams);
    const caseSelect = db.state.calls.find((c) => /FROM resolution_cases/.test(c.text))!;
    expect(caseSelect.text).not.toMatch(/c\.\*|SELECT \*/);
  });

  it('GET /api/v1/businesses/[slug] exposes cases without contact fields', async () => {
    const res = await getBusiness(jsonRequest('http://localhost/api/v1/businesses/comercio-demo', 'GET'), {
      params: Promise.resolve({ slug: 'comercio-demo' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cases).toHaveLength(1);
    expectNoPrivateData(JSON.stringify(body.cases));
  });

  it('GET /api/v1/invitations omits recipient, buyer name and token', async () => {
    const res = await getInvitations(jsonRequest('http://localhost/api/v1/invitations?business_id=1', 'GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitations).toHaveLength(1);
    const payload = JSON.stringify(body);
    expectNoPrivateData(payload);
    expect(payload).not.toMatch(/token|review_url|order_amount/);
  });

  it('POST /api/v1/cases echoes the public projection only', async () => {
    const res = await postCase(
      jsonRequest('http://localhost/api/v1/cases', 'POST', {
        business_id: 1,
        customer_name: NAME,
        customer_contact: CONTACT,
        issue_category: 'damaged_goods',
        customer_requested_remedy: 'replacement',
        initial_message: 'Llegó dañado',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.case.id).toBe(7);
    expectNoPrivateData(JSON.stringify(body));
  });

  it('the /caso/[id] SSR HTML shows the case number, not the buyer', async () => {
    const tree = (await CasoDetailPage({ params: Promise.resolve({ id: '7' }) })) as React.ReactElement;
    const find = (node: unknown): React.ReactElement | null => {
      if (!node || typeof node !== 'object') return null;
      const el = node as React.ReactElement<{ children?: unknown }>;
      if (el.type === CasePortalClient) return el;
      const children = el.props?.children;
      for (const child of Array.isArray(children) ? children : [children]) {
        const hit = find(child);
        if (hit) return hit;
      }
      return null;
    };
    const portal = find(tree) as React.ReactElement<React.ComponentProps<typeof CasePortalClient>>;
    expect(portal).not.toBeNull();
    expectNoPrivateData(JSON.stringify(portal.props));

    const html = renderToStaticMarkup(<CasePortalClient {...portal.props} />);
    expectNoPrivateData(html);
    expect(html).toContain('CASO-DEMO-2026-0001');
    expect(html).toContain('pendiente de verificación');
  });
});

describe('the buyer confirmation is refused on every path', () => {
  const attempts = [
    { is_consumer_confirmed: true },
    { status: 'resolved_consumer_confirmed' },
    { status: ' Resolved_Consumer_Confirmed ' },
    { is_consumer_confirmed: true, status: 'resolved_consumer_confirmed' },
    { is_consumer_confirmed: false },
  ];

  it.each(attempts)('PATCH /api/v1/cases/[id] %j → 403 and no write', async (body) => {
    const res = await patchCase(jsonRequest('http://localhost/api/v1/cases/7', 'PATCH', body), caseParams);
    expect(res.status).toBe(403);
    expect(writes()).toHaveLength(0);
  });

  it.each(attempts)('POST /api/v1/cases/[id]/messages %j → 403 and no write', async (extra) => {
    const res = await postMessage(
      jsonRequest('http://localhost/api/v1/cases/7/messages', 'POST', {
        sender_type: 'merchant',
        sender_name: 'Soporte',
        message: 'Listo',
        ...extra,
      }),
      caseParams
    );
    expect(res.status).toBe(403);
    expect(writes()).toHaveLength(0);
  });

  it('updateCaseRemedyAction with resolved_consumer_confirmed → 403 and no write', async () => {
    const form = new FormData();
    form.set('case_id', '7');
    form.set('remedy_offered', 'Reemplazo');
    form.set('status', 'resolved_consumer_confirmed');
    const result = await updateCaseRemedyAction(form);
    expect(result).toMatchObject({ success: false, status: 403 });
    expect(writes()).toHaveLength(0);
  });

  it('a merchant status change never sets the confirmation flag', async () => {
    const res = await patchCase(
      jsonRequest('http://localhost/api/v1/cases/7', 'PATCH', { status: 'resolved_merchant_asserted' }),
      caseParams
    );
    expect(res.status).toBe(200);
    const update = writes().find((c) => /UPDATE resolution_cases/.test(c.text))!;
    expect(update.params[1]).toBe(false);
    expect(writes().some((c) => /UPDATE businesses/.test(c.text))).toBe(false);
  });
});

describe('merchant flows keep working once re-enabled', () => {
  it('PATCH with a remedy offer updates the case', async () => {
    const res = await patchCase(
      jsonRequest('http://localhost/api/v1/cases/7', 'PATCH', { status: 'remedy_offered', remedy_offered: 'Reembolso' }),
      caseParams
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.case.status).toBe('remedy_offered');
    expectNoPrivateData(JSON.stringify(body));
    const update = writes().find((c) => /UPDATE resolution_cases/.test(c.text))!;
    expect(update.params.slice(0, 3)).toEqual(['remedy_offered', false, 'Reembolso']);
  });

  it('updateCaseRemedyAction records a remedy offer', async () => {
    const form = new FormData();
    form.set('case_id', '7');
    form.set('remedy_offered', 'Reemplazo');
    const result = await updateCaseRemedyAction(form);
    expect(result).toEqual({ success: true });
    expect(writes().map((c) => c.text.trim().split(/\s+/).slice(0, 2).join(' '))).toEqual([
      'UPDATE resolution_cases',
      'INSERT INTO',
    ]);
  });

  it('merchant and buyer messages are still accepted', async () => {
    for (const sender_type of ['merchant', 'consumer'] as const) {
      const res = await postMessage(
        jsonRequest('http://localhost/api/v1/cases/7/messages', 'POST', { sender_type, sender_name: 'Comprador', message: 'Hola' }),
        caseParams
      );
      expect(res.status).toBe(201);
    }
  });
});
