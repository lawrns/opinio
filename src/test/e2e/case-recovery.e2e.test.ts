/**
 * B07 (issue #33; ADR 0005): a buyer of a case opened before B06 requests
 * recovery; nothing is sent until a platform administrator approves after
 * out-of-band verification; then one single-use link goes to the case's
 * stored original email only. Phone-only and ambiguous cases stay queued.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { grantAdministrator } from '../../../scripts/grant-admin.mjs';
import { AccessDenied } from '@/lib/authz';
import { approveCaseRecovery } from '@/lib/authz/case-recovery';
import { generateSecret, hashSecret } from '@/lib/authz/secrets';
import {
  buildApp,
  CookieJar,
  freePort,
  startApp,
  startDatabase,
  startMailSink,
  type AppServer,
  type MailSink,
  type TestDatabase,
} from './harness';

const ADMIN = 'admin@opinio.test';
const NOT_ADMIN = 'someone@example.test';
const BUYER = 'SENTINEL_BUYER_NAME_B7';

let db: TestDatabase;
let pool: Pool;
let mail: MailSink;
let app: AppServer;
let off: AppServer;
const servers: AppServer[] = [];
const secrets = new Set<string>();
const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let bizA = 0;
let ipCounter = 0;
let browserOrigin = '';
const ip = () => `192.0.2.${++ipCounter % 250}`;

/** A case opened before B06: legacy single contact, no access email. */
async function legacyCase(contact: string): Promise<{ id: number; caseNumber: string }> {
  const res = await fetch(`${off.origin}/api/v1/cases`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      business_id: bizA,
      customer_name: BUYER,
      customer_contact: contact,
      issue_category: 'delay',
      customer_requested_remedy: 'refund',
      initial_message: 'SENTINEL_CASE_TEXT_B7 sin entregar',
    }),
  });
  const body = await res.json();
  return { id: body.case.id, caseNumber: body.case.case_number };
}

function requestRecovery(caseNumber: string, email: string, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.set('caseNumber', caseNumber);
  form.set('email', email);
  return fetch(`${app.origin}/caso/recuperar/enviar`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: app.origin, 'x-forwarded-for': ip(), ...headers },
    body: form,
  });
}

const requests = async (caseId: number) =>
  (await db.client.query('SELECT id, contact_kind, status, decision_basis, evidence_reference, access_token_id FROM case_recovery_requests WHERE case_id = $1 ORDER BY id', [caseId])).rows;

async function login(email: string): Promise<string> {
  const html = await (await fetch(`${app.origin}/acceso`)).text();
  const actionId = html.match(/name="\$ACTION_ID_([0-9a-f]+)"/)![1];
  const form = new FormData();
  form.set(`$ACTION_ID_${actionId}`, '');
  form.set('email', email);
  const since = mail.messages.length;
  await fetch(`${app.origin}/acceso`, { method: 'POST', redirect: 'manual', headers: { origin: app.origin, 'x-forwarded-for': ip() }, body: form });
  const message = await mail.waitFor(email, since);
  const params = new URLSearchParams(new URL(message.text.match(/https?:\/\/\S+\/acceso\/confirmar#\S+/)![0]).hash.slice(1));
  secrets.add(params.get('token')!);
  const exchange = new FormData();
  exchange.set('token', params.get('token')!);
  exchange.set('email', params.get('email')!);
  const res = await fetch(`${app.origin}/acceso/confirmar/entrar`, { method: 'POST', redirect: 'manual', headers: { origin: app.origin }, body: exchange });
  const jar = new CookieJar();
  jar.store(res);
  secrets.add(jar.get('authjs.session-token')!);
  ids[email] = (await db.client.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
  return `authjs.session-token=${jar.get('authjs.session-token')}`;
}

/** Submits one of the admin queue's forms as a browser without JS would. */
async function adminSubmit(index: number, fields: Record<string, string>, cookie = cookies[ADMIN]) {
  const html = await (await fetch(`${app.origin}/admin/recuperaciones`, { headers: { cookie: cookies[ADMIN] } })).text();
  const actionIds = [...html.matchAll(/name="\$ACTION_ID_([0-9a-f]+)"/g)].map((m) => m[1]);
  const form = new FormData();
  form.set(`$ACTION_ID_${actionIds[index]}`, '');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  const res = await fetch(`${app.origin}/admin/recuperaciones`, { method: 'POST', redirect: 'manual', headers: { origin: app.origin, cookie }, body: form });
  return new URL(res.headers.get('location') ?? '/', app.origin).searchParams.get('resultado');
}

/** The approve form's action id is first, the close form's second, for the first listed request. */
const APPROVE = 0;

async function exchange(token: string) {
  const form = new FormData();
  form.set('token', token);
  return fetch(`${app.origin}/caso/acceso/entrar`, { method: 'POST', redirect: 'manual', headers: { origin: app.origin }, body: form });
}

beforeAll(async () => {
  [db, mail] = await Promise.all([startDatabase(['src/lib/schema.sql'], { migrate: true }), startMailSink()]);
  pool = new Pool({ connectionString: db.url, max: 6 });
  bizA = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-a', 'Tienda A') RETURNING id")).rows[0].id;
  const serverJs = buildApp('.next-e2e');
  const port = await freePort();
  browserOrigin = `http://localhost:${port}`;
  const base = { DATABASE_URL: db.url, AUTH_SECRET: 'b07-test-secret-not-real', AUTH_EMAIL_SERVER: mail.url, AUTH_EMAIL_FROM: 'Opinio <casos@opinio.test>' };
  app = await startApp(serverJs, { ...base, OPINIO_BUYER_PROOF: '1', OPINIO_MERCHANT_AUTH: '1', AUTH_URL: `http://localhost:${port}` }, port);
  off = await startApp(serverJs, { ...base, AUTH_URL: 'http://localhost' });
  servers.push(app, off);
  for (const email of [ADMIN, NOT_ADMIN]) cookies[email] = await login(email);
  expect(await grantAdministrator(db.client, ADMIN)).toBe('granted');
}, 300_000);

afterAll(async () => {
  await Promise.all(servers.map((s) => s.stop()));
  await pool?.end();
  await mail?.stop();
  await db?.stop();
});

describe('buyer request (ticket verification)', () => {
  it('queues only a match to the stored original email; phone-only and ambiguous await manual review; nothing is sent', async () => {
    const email = await legacyCase('legacy-a@example.test');
    const phone = await legacyCase('55 1234 5678');
    const odd = await legacyCase('whatsapp 5512345678');
    const fresh = (await (await fetch(`${app.origin}/api/v1/cases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() },
      body: JSON.stringify({ business_id: bizA, customer_name: BUYER, access_email: 'b06@example.test', issue_category: 'delay', customer_requested_remedy: 'refund', initial_message: 'caso nuevo' }),
    })).json()).case;
    await new Promise((r) => setTimeout(r, 300));
    const since = mail.messages.length;

    const answers = new Set<string>();
    for (const [number, supplied] of [
      [email.caseNumber, 'replacement@example.test'], // a new address: never enough
      [email.caseNumber, 'not-an-email'],
      ['CASO-NONE-2026-0001', 'legacy-a@example.test'],
      [fresh.case_number, 'b06@example.test'], // B06 cases use resend, not recovery
      [email.caseNumber, 'LEGACY-A@example.test'], // the match
      [phone.caseNumber, 'phone-buyer@example.test'],
      [odd.caseNumber, 'odd-buyer@example.test'],
    ]) {
      const res = await requestRecovery(number, supplied);
      answers.add(`${res.status} ${res.headers.get('location')}`);
    }
    expect([...answers]).toEqual(['303 /caso/recuperar?resultado=recibido']);
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length).toBe(since); // nothing sent by any request

    expect(await requests(email.id)).toEqual([expect.objectContaining({ contact_kind: 'email', status: 'pending', access_token_id: null })]);
    expect(await requests(phone.id)).toEqual([expect.objectContaining({ contact_kind: 'phone', status: 'needs_manual_verification' })]);
    expect(await requests(odd.id)).toEqual([expect.objectContaining({ contact_kind: 'ambiguous', status: 'needs_manual_verification' })]);
    expect(await requests(fresh.id)).toEqual([]);
    // Repeats and cross-site posts add nothing: one open request per case.
    await requestRecovery(email.caseNumber, 'legacy-a@example.test');
    await requestRecovery(email.caseNumber, 'legacy-a@example.test', { origin: 'https://evil.example' });
    expect(await requests(email.id)).toHaveLength(1);
    // The supplied address is never stored.
    expect(JSON.stringify((await db.client.query('SELECT * FROM case_recovery_requests')).rows)).not.toMatch(/@/);
  });

  it('rate-limits requests per client address without changing the answer', async () => {
    const target = await legacyCase('limited@example.test');
    const address = '198.51.100.99';
    for (let i = 0; i < 10; i++) await requestRecovery(`CASO-NONE-2026-${2000 + i}`, 'x@example.test', { 'x-forwarded-for': address });
    const res = await requestRecovery(target.caseNumber, 'limited@example.test', { 'x-forwarded-for': address });
    expect(res.headers.get('location')).toBe('/caso/recuperar?resultado=recibido');
    expect(await requests(target.id)).toEqual([]); // over the limit: not queued
  });
});

describe('administrator review', () => {
  it('keeps the queue and decisions with platform administrators', async () => {
    expect((await fetch(`${app.origin}/admin/recuperaciones`, { headers: { cookie: cookies[NOT_ADMIN] } })).status).toBe(404);
    expect((await fetch(`${app.origin}/admin/recuperaciones`)).status).toBe(404);
    const queue = await (await fetch(`${app.origin}/admin/recuperaciones`, { headers: { cookie: cookies[ADMIN] } })).text();
    expect(queue).toContain('legacy-a@example.test'); // the stored original contact, for the administrator only
    const [pending] = (await db.client.query("SELECT id FROM case_recovery_requests WHERE status = 'pending' ORDER BY id LIMIT 1")).rows;
    await expect(approveCaseRecovery(pool, ids[NOT_ADMIN], { requestId: pending.id, basis: 'order_record', reference: 'VER-700' })).rejects.toBeInstanceOf(AccessDenied);
    const since = mail.messages.length;
    expect(await adminSubmit(APPROVE, { requestId: String(pending.id), basis: 'order_record', reference: 'VER-700' }, cookies[NOT_ADMIN])).toBeNull(); // redirected to /acceso
    expect(await adminSubmit(APPROVE, { requestId: String(pending.id), basis: 'order_record', reference: '' })).toBe('invalid_decision');
    expect(await adminSubmit(APPROVE, { requestId: String(pending.id), basis: 'claimed', reference: 'VER-700' })).toBe('invalid_decision');
    await new Promise((r) => setTimeout(r, 300));
    expect(mail.messages.length).toBe(since);
    expect((await db.client.query('SELECT status FROM case_recovery_requests WHERE id = $1', [pending.id])).rows[0].status).toBe('pending');
  });

  it('on approval sends one single-use link to the stored original email only, and it exchanges once', async () => {
    const [pending] = (await db.client.query(
      "SELECT r.id, r.case_id FROM case_recovery_requests r JOIN resolution_cases c ON c.id = r.case_id WHERE r.status = 'pending' AND c.customer_contact = 'legacy-a@example.test'",
    )).rows;
    const since = mail.messages.length;
    expect(await adminSubmit(APPROVE, { requestId: String(pending.id), basis: 'merchant_record', reference: 'VER-701' })).toBe('aprobada');
    const message = await mail.waitFor('legacy-a@example.test', since);
    await new Promise((r) => setTimeout(r, 300));
    expect(mail.messages.slice(since).map((m) => m.to)).toEqual([message.to]); // one email, to the stored address
    expect(message.text.replace(/https?:\/\/\S+/g, '')).not.toMatch(/Tienda|SENTINEL|entregar|reembolso/);
    const token = message.text.match(/token=([A-Za-z0-9_-]+)/)![1];
    secrets.add(token);

    const decided = (await requests(pending.case_id))[0];
    expect(decided).toMatchObject({ status: 'approved', decision_basis: 'merchant_record', evidence_reference: 'VER-701' });
    expect(decided.access_token_id).not.toBeNull();
    expect((await db.client.query('SELECT access_email, status, is_consumer_confirmed FROM resolution_cases WHERE id = $1', [pending.case_id])).rows[0]).toEqual({
      access_email: 'legacy-a@example.test',
      status: 'opened',
      is_consumer_confirmed: false,
    });
    const audit = (await db.client.query("SELECT actor_type, actor_id, details FROM audit_logs WHERE action = 'case.recovery_approved'")).rows;
    expect(audit).toEqual([{ actor_type: 'administrator', actor_id: ids[ADMIN], details: { request_id: pending.id, case_id: pending.case_id, revoked_sessions: 0 } }]);

    const first = await exchange(token);
    expect(first.headers.get('location')).toBe(`/caso/${pending.case_id}`);
    secrets.add(first.headers.get('set-cookie')!.split(';')[0].split('=')[1]);
    expect((await exchange(token)).headers.get('location')).toBe('/caso/acceso?resultado=invalido'); // replay
    // Approving again finds nothing open and sends nothing.
    const again = mail.messages.length;
    expect(await adminSubmit(APPROVE, { requestId: String(pending.id), basis: 'merchant_record', reference: 'VER-702' })).not.toBe('aprobada');
    await new Promise((r) => setTimeout(r, 300));
    expect(mail.messages.length).toBe(again);
  });

  it('never sends for phone-only or ambiguous cases; closing sends nothing', async () => {
    const open = (await db.client.query("SELECT id FROM case_recovery_requests WHERE status = 'needs_manual_verification' ORDER BY id")).rows;
    expect(open.length).toBeGreaterThanOrEqual(2);
    for (const r of open) {
      await expect(approveCaseRecovery(pool, ids[ADMIN], { requestId: r.id, basis: 'buyer_callback', reference: 'VER-703' })).rejects.toMatchObject({ reason: 'not_email' });
    }
    const since = mail.messages.length;
    // Close the first one through the queue (its only form is "close").
    const html = await (await fetch(`${app.origin}/admin/recuperaciones`, { headers: { cookie: cookies[ADMIN] } })).text();
    expect(html).not.toContain('Aprobar y enviar enlace'); // no approve form is offered for these
    expect(await adminSubmit(0, { requestId: String(open[0].id) })).toBe('cerrada');
    await new Promise((r) => setTimeout(r, 300));
    expect(mail.messages.length).toBe(since);
    expect((await db.client.query('SELECT status, decision_basis FROM case_recovery_requests WHERE id = $1', [open[0].id])).rows[0]).toEqual({ status: 'rejected', decision_basis: 'not_verified' });
  });
});

describe('approval effects and concurrency', () => {
  it('revokes that case’s earlier proof and sessions only, leaving other cases alone', async () => {
    const target = await legacyCase('legacy-c@example.test');
    const other = await legacyCase('legacy-d@example.test');
    // Earlier proof on both cases (e.g. from a previous approval).
    const seed = async (caseId: number) => {
      const session = generateSecret();
      const token = generateSecret();
      secrets.add(session).add(token);
      await db.client.query("INSERT INTO case_sessions (case_id, session_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')", [caseId, hashSecret(session)]);
      await db.client.query("INSERT INTO case_access_tokens (case_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '10 minutes')", [caseId, hashSecret(token)]);
      return { session, token };
    };
    const t = await seed(target.id);
    const o = await seed(other.id);
    await requestRecovery(target.caseNumber, 'legacy-c@example.test');
    const [req] = await requests(target.id);
    const issued = await approveCaseRecovery(pool, ids[ADMIN], { requestId: req.id, basis: 'order_record', reference: 'VER-704' });
    secrets.add(issued.token);
    const live = async (caseId: number, raw: string) =>
      (await db.client.query('SELECT revoked_at IS NULL AS live FROM case_sessions WHERE case_id = $1 AND session_hash = $2', [caseId, hashSecret(raw)])).rows[0].live;
    expect(await live(target.id, t.session)).toBe(false);
    expect(await live(other.id, o.session)).toBe(true);
    expect((await exchange(t.token)).headers.get('location')).toBe('/caso/acceso?resultado=invalido'); // superseded
    expect((await exchange(o.token)).headers.get('location')).toBe(`/caso/${other.id}`); // untouched
  });

  it('lets exactly one of two simultaneous approvals issue a link', async () => {
    const target = await legacyCase('legacy-e@example.test');
    await requestRecovery(target.caseNumber, 'legacy-e@example.test');
    const [req] = await requests(target.id);
    const results = await Promise.allSettled([
      approveCaseRecovery(pool, ids[ADMIN], { requestId: req.id, basis: 'order_record', reference: 'VER-705' }),
      approveCaseRecovery(pool, ids[ADMIN], { requestId: req.id, basis: 'order_record', reference: 'VER-706' }),
    ]);
    results.forEach((r) => r.status === 'fulfilled' && secrets.add(r.value.token));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { reason: 'not_open' } });
    expect((await db.client.query('SELECT count(*)::int AS n FROM case_access_tokens WHERE case_id = $1', [target.id])).rows[0].n).toBe(1);
  });
});

describe('switch off (production default)', () => {
  it('closes the request and review routes', async () => {
    for (const [path, method] of [
      ['/caso/recuperar', 'GET'],
      ['/caso/recuperar/enviar', 'POST'],
      ['/admin/recuperaciones', 'GET'],
    ] as const) {
      expect((await fetch(`${off.origin}${path}`, { method, headers: { origin: off.origin, cookie: cookies[ADMIN] } })).status, `${method} ${path}`).toBe(404);
    }
    // QA-048: no route title on those 404s, nor on the queue for a signed-in non-administrator.
    const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1];
    const plain = titleOf(await (await fetch(`${off.origin}/no-existe-${Date.now()}`)).text());
    for (const path of ['/caso/recuperar', '/admin/recuperaciones']) {
      const html = await (await fetch(`${off.origin}${path}`, { headers: { cookie: cookies[ADMIN] } })).text();
      expect(titleOf(html), path).toBe(plain);
    }
    expect(await (await fetch(`${app.origin}/admin/recuperaciones`, { headers: { cookie: cookies[NOT_ADMIN] } })).text()).not.toContain('Recuperaciones — Opinio');
  });
});

describe('credential leakage', () => {
  it('keeps tokens, stored contacts and case text out of logs and public pages', async () => {
    const logs = servers.map((s) => s.logs()).join('\n');
    for (const s of secrets) {
      expect(logs).not.toContain(s);
      expect(logs).not.toContain(hashSecret(s));
    }
    expect(logs).not.toMatch(/@example\.test|55 1234|SENTINEL_BUYER|SENTINEL_CASE/);
    for (const headers of [{}, { RSC: '1' }] as Record<string, string>[]) {
      for (const path of ['/caso/recuperar', '/caso/recuperar?resultado=recibido']) {
        expect(await (await fetch(`${app.origin}${path}`, { headers })).text(), path).not.toMatch(/@example\.test|55 1234|SENTINEL/);
      }
    }
  });
});

/** Desktop and mobile screenshots, only when E2E_SCREENSHOTS_DIR is set. */
describe.runIf(process.env.E2E_SCREENSHOTS_DIR)('screenshots', () => {
  it('captures the request page and the administrator queue', async () => {
    const dir = process.env.E2E_SCREENSHOTS_DIR!;
    mkdirSync(dir, { recursive: true });
    const pending = await legacyCase('shot@example.test');
    await requestRecovery(pending.caseNumber, 'shot@example.test');
    const browser = await chromium.launch();
    for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`${browserOrigin}/caso/recuperar`);
      await page.screenshot({ path: path.join(dir, `b07-request-${name}.png`) });
      await context.addCookies([{ name: 'authjs.session-token', value: cookies[ADMIN].split('=')[1], url: browserOrigin }]);
      await page.goto(`${browserOrigin}/admin/recuperaciones`);
      await page.screenshot({ path: path.join(dir, `b07-queue-${name}.png`), fullPage: true });
      await context.close();
    }
    await browser.close();
  });
});

