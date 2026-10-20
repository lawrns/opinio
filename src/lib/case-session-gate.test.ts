/**
 * OPN-05 (BL-05): reading or writing a case by its id or case number needs
 * that case's buyer session. The database is mocked; only a session whose
 * token hash and case id match is "live". Synthetic values only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { hashSecret } from '@/lib/authz/secrets';

const TOKEN = 'synthetic-session-token';
const db = vi.hoisted(() => ({ calls: [] as Array<{ sql: string; params: unknown[] }> }));

vi.mock('@/lib/db', () => {
  const caseRow = {
    id: 7, business_id: 1, review_id: null, order_id: null, case_number: 'CASO-DEMO-2026-0001', customer_name: 'Comprador Demo',
    issue_category: 'damaged_goods', customer_requested_remedy: 'replacement', status: 'opened', is_consumer_confirmed: false,
    remedy_offered: null, resolution_summary: null, median_first_response_minutes: 0, total_resolution_hours: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', resolved_at: null,
    business_slug: 'comercio-demo', business_brand_name: 'Comercio Demo', business_logo_url: null,
  };
  const query = async (sql: string, params: unknown[] = []) => {
    db.calls.push({ sql, params });
    if (/^\s*INSERT INTO case_messages/i.test(sql)) return { rows: [{ id: 99, case_id: params[0], sender_type: 'consumer' }] };
    if (/FROM case_messages/i.test(sql)) return { rows: [{ id: 1, case_id: 7, sender_type: 'consumer', sender_name: 'Comprador', message: 'SENTINEL_THREAD_TEXT', is_private: false, created_at: '2026-01-01T00:00:00Z' }] };
    if (/FROM resolution_cases/i.test(sql)) {
      const key = params[0];
      return { rows: key === 7 || key === 'CASO-DEMO-2026-0001' ? [caseRow] : [] };
    }
    return { rows: [] };
  };
  // Live only for this token on case 7; mirrors authorizeCaseSession's query (hash, case id).
  const pool = {
    query: async (_sql: string, params: unknown[] = []) => {
      const live = params[0] === hashSecret(TOKEN) && params[1] === 7;
      return { rows: live ? [{ id: 1 }] : [], rowCount: live ? 1 : 0 };
    },
  };
  return { query, pool, withTransaction: vi.fn() };
});

import { GET as getCase } from '@/app/api/v1/cases/[id]/route';
import { POST as postMessage } from '@/app/api/v1/cases/[id]/messages/route';

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const get = (id: string, cookie?: string) =>
  getCase(new NextRequest(`http://localhost/api/v1/cases/${id}`, { headers: cookie ? { cookie } : {} }), ctx(id));
const post = (id: string, cookie?: string, extra: Record<string, string> = { 'sec-fetch-site': 'same-origin' }) =>
  postMessage(
    new NextRequest(`http://localhost/api/v1/cases/${id}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...extra, ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ message: 'Hola' }),
    }),
    ctx(id),
  );
const inserts = () => db.calls.filter((c) => /^\s*INSERT/i.test(c.sql));

beforeEach(() => {
  db.calls.length = 0;
  vi.unstubAllEnvs();
});

describe('GET /api/v1/cases/[id] needs the case session', () => {
  it.each(['7', 'CASO-DEMO-2026-0001'])('returns 404 without a session for %s, and never reads the thread', async (id) => {
    const res = await get(id);
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain('SENTINEL_THREAD_TEXT');
    expect(db.calls.some((c) => /FROM case_messages/i.test(c.sql))).toBe(false);
  });

  it('returns 404 for a wrong token, and for another case\'s cookie', async () => {
    expect((await get('7', 'opinio_case_7=wrong-token')).status).toBe(404);
    expect((await get('7', `opinio_case_8=${TOKEN}`)).status).toBe(404);
  });

  it('looks the same as a case that does not exist', async () => {
    const hidden = await (await get('7')).json();
    const missing = await (await get('999')).json();
    expect(hidden.success).toBe(false);
    expect(missing.success).toBe(false);
    expect((await get('999')).status).toBe(404);
  });

  it('returns the case with the live session', async () => {
    const res = await get('7', `opinio_case_7=${TOKEN}`);
    expect(res.status).toBe(200);
    expect((await res.json()).case.messages[0].message).toBe('SENTINEL_THREAD_TEXT');
  });
});

describe('POST /api/v1/cases/[id]/messages needs the case session', () => {
  it.each([false, true])('refuses with 401 and no write when there is no session (buyer proof on: %s)', async (on) => {
    if (on) vi.stubEnv('OPINIO_BUYER_PROOF', '1');
    const res = await post('7');
    expect(res.status).toBe(401);
    expect(inserts()).toEqual([]);
  });

  it('refuses a wrong token and another case\'s cookie', async () => {
    expect((await post('7', 'opinio_case_7=wrong-token')).status).toBe(401);
    expect((await post('7', `opinio_case_8=${TOKEN}`)).status).toBe(401);
    expect(inserts()).toEqual([]);
  });

  it('refuses an unknown case and a cross-site request', async () => {
    expect((await post('999', `opinio_case_999=${TOKEN}`)).status).toBe(401); // same as no session
    expect((await post('7', `opinio_case_7=${TOKEN}`, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect(inserts()).toEqual([]);
  });

  it('records the buyer message with the live session', async () => {
    const res = await post('7', `opinio_case_7=${TOKEN}`);
    expect(res.status).toBe(201);
    expect(inserts()).toHaveLength(1);
  });
});
