/**
 * OPINIO-CASES-AUTHZ-2: public case and review writes accept no client trust
 * fields. Route handlers are called directly with the database mocked, so
 * each test also proves a refused request never reaches a write.
 * Synthetic values only.
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ calls: [] as Array<{ sql: string; params: unknown[] }> }));

function fakeRow(sql: string, params: unknown[]) {
  if (/FROM businesses/i.test(sql)) return [{ id: 7, slug: 'tienda-demo', brand_name: 'Tienda Demo', observed_orders_count: 0, invited_orders_count: 0, median_response_hours: 4 }];
  if (/FROM resolution_cases/i.test(sql) && /SELECT/i.test(sql)) return [{ id: 41, business_id: 7, status: 'opened' }];
  if (/INSERT INTO resolution_cases/i.test(sql)) return [{ id: 41, business_id: 7, case_number: params[3], status: 'opened', is_consumer_confirmed: false, customer_contact: params[5] }];
  if (/INSERT INTO case_messages/i.test(sql)) return [{ id: 1, case_id: params[0], sender_type: params[1], sender_name: params[2], message: params[3], is_private: params[4] }];
  if (/INSERT INTO reviews/i.test(sql)) return [{ id: 9, business_id: 7, rating: params[2], body: params[4], author_name: params[5], verification_level: params[7], status: 'pending' }];
  if (/COUNT\(\*\)/i.test(sql)) return [{ count: '1' }];
  return [];
}

vi.mock('@/lib/db', () => {
  const query = async (sql: string, params: unknown[] = []) => {
    db.calls.push({ sql, params });
    return { rows: fakeRow(sql, params) };
  };
  return { query, withTransaction: async (fn: (c: { query: typeof query }) => unknown) => fn({ query }) };
});

import { POST as postMessage } from '@/app/api/v1/cases/[id]/messages/route';
import { POST as postCase } from '@/app/api/v1/cases/route';
import { POST as postReview } from '@/app/api/v1/reviews/route';
import { CASE_TRUST_FIELDS, TRUST_FIELD_ERROR } from '@/lib/trust-fields';

const req = (body: unknown) => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }) as never;
const caseParams = { params: Promise.resolve({ id: '41' }) };
const writes = () => db.calls.filter((c) => /^\s*(INSERT|UPDATE|DELETE)/i.test(c.sql));

beforeEach(() => {
  db.calls.length = 0;
  vi.unstubAllEnvs();
});
afterEach(() => vi.unstubAllEnvs());

describe('(1) case messages: always recorded as the buyer', () => {
  const buyer = { sender_name: 'Comprador', message: 'Sigo esperando el reembolso' };

  it('records a buyer message as consumer, with no status change', async () => {
    const res = await postMessage(req({ ...buyer, sender_type: 'consumer' }), caseParams);
    expect(res.status).toBe(201);
    const insert = writes().find((c) => /INSERT INTO case_messages/i.test(c.sql))!;
    expect(insert.params[1]).toBe('consumer');
    expect(writes().some((c) => /UPDATE resolution_cases/i.test(c.sql))).toBe(false);
  });

  it('records a message without a sender_type as the buyer', async () => {
    expect((await postMessage(req(buyer), caseParams)).status).toBe(201);
    expect(writes().find((c) => /INSERT INTO case_messages/i.test(c.sql))!.params[1]).toBe('consumer');
  });

  it.each(['merchant', 'mediator', 'staff', 'admin'])('refuses a %s sender before any write, even with the containment switch on', async (sender) => {
    vi.stubEnv('OPINIO_REENABLE_OPS', 'case_merchant_message');
    const res = await postMessage(req({ ...buyer, sender_type: sender }), caseParams);
    expect(res.status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it('refuses a private (mediator-only) message and any confirmation attempt', async () => {
    expect((await postMessage(req({ ...buyer, is_private: true }), caseParams)).status).toBe(403);
    expect((await postMessage(req({ ...buyer, status: 'resolved_consumer_confirmed' }), caseParams)).status).toBe(403);
    expect(writes()).toEqual([]);
  });
});

describe('(2) case POST: no client trust fields', () => {
  const valid = { business_id: 7, customer_name: 'Ana Prueba', customer_contact: 'ana@example.test', issue_category: 'envio', customer_requested_remedy: 'reembolso', initial_message: 'No llegó mi pedido' };

  it('opens a case from the public form as opened and unconfirmed', async () => {
    const res = await postCase(req(valid));
    expect(res.status).toBe(201);
    const insert = writes().find((c) => /INSERT INTO resolution_cases/i.test(c.sql))!;
    expect(insert.sql).toMatch(/'opened', false/);
    expect(insert.params[1]).toBeNull(); // review_id
    expect(insert.params[2]).toBeNull(); // order_id
    expect(writes().find((c) => /INSERT INTO case_messages/i.test(c.sql))!.sql).toMatch(/'consumer'/);
  });

  it.each([
    ['status', 'resolved_consumer_confirmed'],
    ['is_consumer_confirmed', true],
    ['remedy_offered', 'reembolso total'],
    ['resolution_summary', 'resuelto'],
    ['resolved_at', '2026-10-01T00:00:00Z'],
    ['case_number', 'CASO-X-2026-0001'],
    ['order_id', 12],
    ['review_id', 3],
    ['verified', true],
    ['role', 'merchant'],
  ])('refuses %s before any write', async (field, value) => {
    const res = await postCase(req({ ...valid, [field]: value }));
    expect(res.status).toBe(403);
    expect(writes()).toEqual([]);
  });

  it('new case numbers keep their format and come from crypto randomness', async () => {
    await postCase(req(valid));
    const caseNumber = writes().find((c) => /INSERT INTO resolution_cases/i.test(c.sql))!.params[3] as string;
    expect(caseNumber).toMatch(/^CASO-TIEN-\d{4}-\d{4}$/);
    const source = readFileSync('src/app/api/v1/cases/route.ts', 'utf8');
    expect(source).toMatch(/randomInt\(1000, 10000\)/);
    expect(source).not.toMatch(/Math\.random/);
  });
});

describe('(2) review POST: no client trust fields', () => {
  const valid = { business_id: 7, rating: 4, body: 'Buen servicio y entrega a tiempo', author_name: 'Ana Prueba' };

  it('publishes the review form payload (verification_level unverified_experience) as unverified', async () => {
    const res = await postReview(req({ ...valid, verification_level: 'unverified_experience' }));
    expect(res.status).toBe(201);
    expect(writes().find((c) => /INSERT INTO reviews/i.test(c.sql))!.params[7]).toBe('unverified_experience');
  });

  it.each([
    ['order_id', 12],
    ['verification_level', 'reviewed_proof'],
    ['verification_level', 'confirmed_payment'],
    ['status', 'published'],
    ['score_weight', 1],
    ['integrity_factor', 2],
    ['invitation_id', 5],
    ['verified', true],
    ['role', 'merchant'],
  ])('refuses %s=%s before any write', async (field, value) => {
    const res = await postReview(req({ ...valid, [field]: value }));
    expect(res.status).toBe(403);
    expect(writes()).toEqual([]);
  });
});

describe('(3) with buyer proof on (B06): the same refusals run first', () => {
  const buyer = { sender_name: 'Comprador', message: 'Sigo esperando el reembolso' };
  const b06Case = { business_id: 7, customer_name: 'Ana Prueba', access_email: 'ana@example.test', issue_category: 'envio', customer_requested_remedy: 'reembolso', initial_message: 'No llegó mi pedido' };
  beforeEach(() => vi.stubEnv('OPINIO_BUYER_PROOF', '1'));

  it.each([
    ['a merchant sender', { ...buyer, sender_type: 'merchant' }],
    ['a mediator sender', { ...buyer, sender_type: 'mediator' }],
    ['a staff sender', { ...buyer, sender_type: 'staff' }],
    ['a private message', { ...buyer, is_private: true }],
    ['a confirmation attempt', { ...buyer, status: 'resolved_consumer_confirmed' }],
  ])('refuses %s before the session check reads anything', async (_label, body) => {
    const res = await postMessage(req(body), caseParams);
    expect(res.status).toBe(403);
    expect(db.calls).toEqual([]);
  });

  it('never sends a message without a sender_type down the switch-off path', async () => {
    const res = await postMessage(req(buyer), caseParams);
    expect(res.status).not.toBe(201);
    expect(writes()).toEqual([]);
  });

  it.each(CASE_TRUST_FIELDS.map((field) => [field]))('refuses %s on a case with an access email, before any read, limit or write', async (field) => {
    const res = await postCase(req({ ...b06Case, [field]: field === 'is_consumer_confirmed' || field === 'verified' || field === 'is_verified' ? true : 12 }));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe(TRUST_FIELD_ERROR);
    expect(db.calls).toEqual([]);
  });
});
