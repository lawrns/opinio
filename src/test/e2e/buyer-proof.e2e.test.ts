/**
 * B06 (issue #32): a new case collects a private access email, receives a
 * neutral single-use link, and the buyer exchanges it (same-origin POST) for
 * a revocable session for that one case. Confirmation stays blocked. Built
 * app with OPINIO_BUYER_PROOF=1, throwaway Postgres, captured SMTP; a second
 * server with the switch off proves the legacy contract is unchanged.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { exchangeCaseAccessToken, issueCaseAccessToken } from '@/lib/authz/buyer-access';
import { ACCESS_LINK_TTL_MS } from '@/lib/authz/policy';
import { hashSecret } from '@/lib/authz/secrets';
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

const BUYER = 'SENTINEL_BUYER_NAME_B6';
const MESSAGE = 'SENTINEL_CASE_TEXT_B6 llegó roto';
const PHONE = '55 1234 5678';

let db: TestDatabase;
let pool: Pool;
let mail: MailSink;
let app: AppServer;
let off: AppServer;
let noMail: AppServer;
const servers: AppServer[] = [];
const secrets = new Set<string>();
let bizA = 0;
let bizB = 0;
let keyCounter = 0;
let browserOrigin = '';
let ipCounter = 0;

const newKey = () => `e2e-submission-${Date.now()}-${++keyCounter}`;

function createCase(server: AppServer, fields: Record<string, unknown>, ip = `198.18.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`) {
  return fetch(`${server.origin}/api/v1/cases`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({
      business_id: bizA,
      customer_name: BUYER,
      issue_category: 'damaged_goods',
      customer_requested_remedy: 'replacement',
      initial_message: MESSAGE,
      ...fields,
    }),
  });
}

/** Creates a case for `email` and returns its id and the emailed token. */
async function caseWithLink(email: string, extra: Record<string, unknown> = {}): Promise<{ id: number; caseNumber: string; token: string }> {
  const since = mail.messages.length;
  const res = await createCase(app, { access_email: email, submission_key: newKey(), ...extra });
  expect(res.status).toBe(201);
  const body = await res.json();
  const message = await mail.waitFor(email, since);
  const token = new URLSearchParams(new URL(message.text.match(/https?:\/\/\S+\/caso\/acceso#\S+/)![0]).hash.slice(1)).get('token')!;
  secrets.add(token);
  return { id: body.case.id, caseNumber: body.case.case_number, token };
}

function exchange(token: string, headers: Record<string, string> = { origin: app.origin }) {
  const form = new FormData();
  form.set('token', token);
  return fetch(`${app.origin}/caso/acceso/entrar`, { method: 'POST', redirect: 'manual', headers, body: form });
}

/** Exchanges and returns the case cookie as `name=value`. */
async function prove(token: string): Promise<string> {
  const res = await exchange(token);
  const jar = new CookieJar();
  jar.store(res);
  const location = new URL(res.headers.get('location')!, app.origin);
  const caseId = location.pathname.split('/').pop()!;
  const value = jar.get(`opinio_case_${caseId}`)!;
  secrets.add(value);
  return `opinio_case_${caseId}=${value}`;
}

const proofStatus = (caseId: number, cookie = '') =>
  fetch(`${app.origin}/api/v1/cases/${caseId}/acceso`, { headers: cookie ? { cookie } : {} }).then((r) => r.status);

const tokenRow = async (token: string) =>
  (await db.client.query('SELECT consumed_at, transport_accepted_at, transport_failed_at FROM case_access_tokens WHERE token_hash = $1', [hashSecret(token)])).rows[0];

function resend(caseNumber: string, email: string, ip = `203.0.113.${++ipCounter}`) {
  const form = new FormData();
  form.set('caseNumber', caseNumber);
  form.set('email', email);
  return fetch(`${app.origin}/caso/acceso/reenviar/enviar`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: app.origin, 'x-forwarded-for': ip },
    body: form,
  });
}

beforeAll(async () => {
  [db, mail] = await Promise.all([startDatabase(['src/lib/schema.sql'], { migrate: true }), startMailSink()]);
  pool = new Pool({ connectionString: db.url, max: 6 });
  bizA = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-a', 'Tienda A') RETURNING id")).rows[0].id;
  bizB = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-b', 'Tienda B') RETURNING id")).rows[0].id;
  const serverJs = buildApp('.next-e2e');
  const port = await freePort();
  browserOrigin = `http://localhost:${port}`;
  const base = { DATABASE_URL: db.url, AUTH_SECRET: 'b06-test-secret-not-real' };
  app = await startApp(
    serverJs,
    { ...base, OPINIO_BUYER_PROOF: '1', AUTH_EMAIL_SERVER: mail.url, AUTH_EMAIL_FROM: 'Opinio <casos@opinio.test>', AUTH_URL: `http://localhost:${port}` },
    port,
  );
  off = await startApp(serverJs, { ...base, AUTH_EMAIL_SERVER: mail.url, AUTH_URL: 'http://localhost' });
  // A transport that refuses every message: nothing listens on port 9.
  noMail = await startApp(serverJs, { ...base, OPINIO_BUYER_PROOF: '1', AUTH_EMAIL_SERVER: 'smtp://127.0.0.1:9', AUTH_URL: 'http://localhost' });
  servers.push(app, off, noMail);
}, 300_000);

afterAll(async () => {
  await Promise.all(servers.map((s) => s.stop()));
  await pool?.end();
  await mail?.stop();
  await db?.stop();
});

describe('new-case contract (switch on)', () => {
  it('requires a private access email, keeps the phone optional and never emails it', async () => {
    expect((await createCase(app, { customer_contact: PHONE })).status).toBe(400); // no access email
    expect((await createCase(app, { access_email: 'buyer@example.test', customer_contact: 'otro@example.test' })).status).toBe(400); // phone field holding an email
    expect((await createCase(app, { access_email: 'not-an-email' })).status).toBe(400);

    const since = mail.messages.length;
    const res = await createCase(app, { access_email: 'buyer@example.test', customer_contact: PHONE, submission_key: newKey() });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.access_link).toBe('sent');
    expect(JSON.stringify(body)).not.toMatch(/buyer@example\.test|token|session|55 1234/);
    const message = await mail.waitFor('buyer@example.test', since);
    expect(mail.messages.slice(since).map((m) => m.to)).toEqual([message.to]); // one email, to the access address only
    expect(message.text.replace(/https?:\/\/\S+/g, '')).not.toMatch(/Tienda|SENTINEL|roto|reemplazo|55 1234/);
    secrets.add(new URLSearchParams(new URL(message.text.match(/https?:\/\/\S+/)![0]).hash.slice(1)).get('token')!);

    const row = (await db.client.query('SELECT * FROM resolution_cases WHERE id = $1', [body.case.id])).rows[0];
    expect(row).toMatchObject({ access_email: 'buyer@example.test', customer_contact: PHONE, status: 'opened', is_consumer_confirmed: false });
    expect((await db.client.query('SELECT count(*)::int AS n FROM case_messages WHERE case_id = $1', [row.id])).rows[0].n).toBe(1);
    const tokens = (await db.client.query('SELECT token_hash, transport_accepted_at FROM case_access_tokens WHERE case_id = $1', [row.id])).rows;
    expect(tokens).toHaveLength(1);
    expect(tokens[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens[0].transport_accepted_at).not.toBeNull();
  });

  it('turns a retried submission into the same case: one message, one email', async () => {
    const key = newKey();
    const since = mail.messages.length;
    const results = await Promise.all(Array.from({ length: 3 }, () => createCase(app, { access_email: 'retry@example.test', submission_key: key })));
    const bodies = await Promise.all(results.map((r) => r.json()));
    expect(new Set(bodies.map((b) => b.case.id)).size).toBe(1);
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 201]);
    const again = await createCase(app, { access_email: 'retry@example.test', submission_key: key });
    expect((await again.json()).access_link).toBe('already_sent');
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.slice(since).filter((m) => m.to.includes('retry@example.test'))).toHaveLength(1);
    const caseId = bodies[0].case.id;
    expect((await db.client.query('SELECT count(*)::int AS n FROM case_messages WHERE case_id = $1', [caseId])).rows[0].n).toBe(1);
    for (const m of mail.messages.slice(since)) {
      const t = m.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
      if (t) secrets.add(t);
    }
  });

  it('keeps the case and reports a refused email neutrally, without retrying silently', async () => {
    const res = await createCase(noMail, { access_email: 'fails@example.test', submission_key: newKey() });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.access_link).toBe('not_sent');
    const token = (await db.client.query('SELECT transport_accepted_at, transport_failed_at, consumed_at FROM case_access_tokens WHERE case_id = $1', [body.case.id])).rows[0];
    expect(token.transport_accepted_at).toBeNull();
    expect(token.transport_failed_at).not.toBeNull();
    expect((await db.client.query('SELECT status, is_consumer_confirmed FROM resolution_cases WHERE id = $1', [body.case.id])).rows[0]).toEqual({ status: 'opened', is_consumer_confirmed: false });
  });
});

describe('case creation limits', () => {
  it('limits new cases per client address and per access email, with no case and no email past the limit', async () => {
    const cases = async () => Number((await db.client.query('SELECT count(*) FROM resolution_cases')).rows[0].count);
    // Per client: 5 per window.
    const ip = '198.51.100.77';
    let before = await cases();
    let mails = mail.messages.length;
    for (let i = 0; i < 5; i++) expect((await createCase(app, { access_email: `ip-${i}@example.test`, submission_key: newKey() }, ip)).status).toBe(201);
    const over = await createCase(app, { access_email: 'ip-over@example.test', submission_key: newKey() }, ip);
    expect(over.status).toBe(429);
    expect(await cases()).toBe(before + 5);
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length - mails).toBe(5);
    for (const m of mail.messages.slice(mails)) secrets.add(m.text.match(/token=([A-Za-z0-9_-]+)/)![1]);
    // Per access email: 3 per window, across client addresses.
    before = await cases();
    mails = mail.messages.length;
    const keys: string[] = [];
    for (let i = 0; i < 3; i++) {
      keys.push(newKey());
      expect((await createCase(app, { access_email: 'many@example.test', submission_key: keys[i] })).status).toBe(201);
    }
    expect((await createCase(app, { access_email: 'many@example.test', submission_key: newKey() })).status).toBe(429);
    expect(await cases()).toBe(before + 3);
    // A retry of an accepted submission is still answered, without a new case or email.
    const retry = await createCase(app, { access_email: 'many@example.test', submission_key: keys[0] });
    expect(retry.status).toBe(200);
    expect((await retry.json()).access_link).toBe('already_sent');
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length - mails).toBe(3);
    for (const m of mail.messages.slice(mails)) secrets.add(m.text.match(/token=([A-Za-z0-9_-]+)/)![1]);
  });

  it('reports a retry honestly when the first email was never accepted', async () => {
    const key = newKey();
    expect((await (await createCase(noMail, { access_email: 'retry-fail@example.test', submission_key: key })).json()).access_link).toBe('not_sent');
    expect((await (await createCase(noMail, { access_email: 'retry-fail@example.test', submission_key: key })).json()).access_link).toBe('not_sent');
  });
});

describe('link exchange (ticket verification)', () => {
  it('previews without consuming, exchanges once by same-origin POST, proves only that case, then revokes', async () => {
    const { id, token } = await caseWithLink('verify@example.test');
    // Scanners, previews and prefetches: the fragment never reaches the server.
    for (const method of ['GET', 'HEAD']) {
      const res = await fetch(`${app.origin}/caso/acceso`, { method });
      expect(res.status, method).toBe(200);
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      expect(res.headers.get('cache-control')).toContain('no-store');
      if (method === 'GET') {
        const html = await res.text();
        expect(html).not.toContain(token);
        expect(html).not.toMatch(/googletagmanager|gtag\(|connect\.facebook/);
      }
    }
    expect((await tokenRow(token)).consumed_at).toBeNull();

    // Cross-site or origin-less posts consume nothing.
    for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null', 'sec-fetch-site': 'cross-site' }, {}]) {
      const res = await exchange(token, headers as Record<string, string>);
      expect(res.headers.get('location'), JSON.stringify(headers)).toBe('/caso/acceso?resultado=invalido');
      expect(res.headers.get('set-cookie')).toBeNull();
    }
    expect((await tokenRow(token)).consumed_at).toBeNull();

    const res = await exchange(token);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`/caso/${id}`); // clean redirect
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(new RegExp(`^opinio_case_${id}=`));
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).not.toMatch(/Domain=/i);
    const cookie = setCookie.split(';')[0];
    secrets.add(cookie.split('=')[1]);
    expect(await proofStatus(id, cookie)).toBe(200);
    expect(await (await fetch(`${app.origin}/caso/${id}`, { headers: { cookie } })).text()).toContain('data-testid="case-access-verified"');
    expect(await (await fetch(`${app.origin}/caso/${id}`)).text()).not.toContain('data-testid="case-access-verified"');

    // Single use.
    expect((await exchange(token)).headers.get('location')).toBe('/caso/acceso?resultado=invalido');

    // The buyer ends the session: revoked server-side, next request denied.
    const form = new FormData();
    form.set('caseId', String(id));
    const out = await fetch(`${app.origin}/caso/acceso/salir`, { method: 'POST', redirect: 'manual', headers: { origin: app.origin, cookie }, body: form });
    expect(out.headers.get('location')).toBe(`/caso/${id}`);
    expect(out.headers.get('set-cookie')).toMatch(/Max-Age=0/);
    expect(await proofStatus(id, cookie)).toBe(401);
    // Nothing about the case changed: no confirmation path exists.
    expect((await db.client.query('SELECT status, is_consumer_confirmed, resolved_at FROM resolution_cases WHERE id = $1', [id])).rows[0]).toEqual({
      status: 'opened',
      is_consumer_confirmed: false,
      resolved_at: null,
    });
  });

  it('lets exactly one of several simultaneous exchanges win', async () => {
    const { id, token } = await caseWithLink('race@example.test');
    const results = await Promise.all(Array.from({ length: 4 }, () => exchange(token)));
    const winners = results.filter((r) => r.headers.get('location') === `/caso/${id}`);
    expect(winners).toHaveLength(1);
    expect((await db.client.query('SELECT count(*)::int AS n FROM case_sessions WHERE case_id = $1', [id])).rows[0].n).toBe(1);
  });

  it('rejects an expired link at the exact instant and accepts it a millisecond before', async () => {
    const { id } = await caseWithLink('expiry@example.test');
    const issued = new Date('2026-10-17T12:00:00.000Z');
    const a = await issueCaseAccessToken(db.client, id, issued);
    const b = await issueCaseAccessToken(db.client, id, issued);
    secrets.add(a.token).add(b.token);
    const at = new Date(issued.valueOf() + ACCESS_LINK_TTL_MS);
    await expect(exchangeCaseAccessToken(pool, a.token, at)).rejects.toThrow('invalid_link');
    const ok = await exchangeCaseAccessToken(pool, b.token, new Date(at.valueOf() - 1));
    secrets.add(ok.sessionToken);
    expect(ok.caseId).toBe(id);
  });

  it('never lets one case’s session reach another case', async () => {
    const first = await caseWithLink('scope-a@example.test');
    const second = await caseWithLink('scope-b@example.test', { business_id: bizB });
    const cookieA = await prove(first.token);
    const valueA = cookieA.split('=')[1];
    expect(await proofStatus(first.id, cookieA)).toBe(200);
    expect(await proofStatus(second.id, `opinio_case_${second.id}=${valueA}`)).toBe(401); // A's session presented as B's
    expect(await proofStatus(second.id, cookieA)).toBe(401); // A's cookie on B
    expect(await proofStatus(second.id)).toBe(401);
    expect(await proofStatus(first.id, `opinio_case_${first.id}=${valueA.slice(0, -2)}AA`)).toBe(401); // tampered
  });
});

describe('in a real browser', () => {
  it('strips the fragment, posts only on the button and lands on the verified case', async () => {
    const { id, token } = await caseWithLink('browser@example.test');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(`${browserOrigin}/caso/acceso#token=${token}`);
    await page.getByRole('button', { name: 'Ver mi caso' }).waitFor();
    expect(page.url()).toBe(`${browserOrigin}/caso/acceso`);
    expect((await tokenRow(token)).consumed_at).toBeNull(); // opening the page consumed nothing
    const post = page.waitForRequest((r) => r.url().endsWith('/caso/acceso/entrar'));
    await page.getByRole('button', { name: 'Ver mi caso' }).click();
    expect((await post).method()).toBe('POST');
    await page.waitForURL(`${browserOrigin}/caso/${id}`);
    await page.getByTestId('case-access-verified').waitFor();
    expect(urls.filter((u) => u.includes(token))).toEqual([]); // the token never travelled in a URL
    for (const c of await context.cookies()) secrets.add(c.value);
    await browser.close();
  });

  it('keeps an already-loaded gtag silent while navigating into /caso/acceso', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    await context.addInitScript(() => window.localStorage.setItem('opinio.analytics-consent', 'granted'));
    const page = await context.newPage();
    const beacons: string[] = [];
    await page.route(/googletagmanager\.com\/gtag\/js/, (r) => r.fulfill({ contentType: 'text/javascript', body: '/* stub */' }));
    await page.route(/google-analytics\.com|analytics\.google\.com|googletagmanager\.com\/g\/collect/, (r) => {
      beacons.push(r.request().url());
      return r.abort();
    });
    await page.goto(`${browserOrigin}/`);
    await page.waitForFunction(() => JSON.stringify((window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>))).includes('page_view'));
    const before = await page.evaluate(() => window.dataLayer!.length);
    const marker = 'SENTINEL_CASE_TOKEN_NOT_A_SECRET';
    for (const p of [`/caso/acceso#token=${marker}`, '/caso/acceso/reenviar']) {
      await page.evaluate((u) => window.history.pushState(null, '', u), p);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => Object.keys(window).filter((k) => k.startsWith('ga-disable-')).every((k) => (window as unknown as Record<string, unknown>)[k] === true)), p).toBe(true);
    }
    const added = await page.evaluate((i) => JSON.stringify((window.dataLayer ?? []).slice(i).map((a) => Array.from(a as ArrayLike<unknown>))), before);
    for (const leak of ['/caso/acceso', marker, 'page_view']) expect(added, leak).not.toContain(leak);
    expect(beacons).toEqual([]);
    await browser.close();
  });
});

describe('buyer writes need the case session (guessable ids are not proof)', () => {
  const post = (server: AppServer, id: string | number, body: Record<string, unknown>, cookie = '', origin: string | null = server.origin) =>
    fetch(`${server.origin}/api/v1/cases/${id}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    });
  const messages = async (caseId: number) =>
    (await db.client.query('SELECT sender_type, sender_name, message, is_private FROM case_messages WHERE case_id = $1 ORDER BY id', [caseId])).rows;

  it('refuses a buyer message by id or case number without that case’s session', async () => {
    const own = await caseWithLink('writer@example.test');
    const other = await caseWithLink('other-writer@example.test');
    const cookie = await prove(own.token);
    const before = (await messages(other.id)).length;
    for (const [label, id, c] of [
      ['no session, by id', other.id, ''],
      ['no session, by case number', other.caseNumber, ''],
      ["another case's session, by id", other.id, cookie],
      ["another case's session, by case number", other.caseNumber, cookie],
      ["another case's session under this case's cookie name", other.id, `opinio_case_${other.id}=${cookie.split('=')[1]}`],
      ['unknown case', 999_999, cookie],
      ['id beyond INTEGER', '99999999999', cookie],
    ] as const) {
      const res = await post(app, id, { sender_type: 'consumer', sender_name: 'Comprador', message: 'SENTINEL_CASE_TEXT_B6 intruso' }, c);
      expect(res.status, label).toBe(401);
    }
    expect((await messages(other.id)).length).toBe(before);
  });

  it('writes as the case’s own buyer with the session, ignoring client name, privacy and type fields', async () => {
    const own = await caseWithLink('writer2@example.test');
    const cookie = await prove(own.token);
    const res = await post(app, own.id, { sender_type: 'consumer', sender_name: 'Impostor', is_private: true, message: 'Sigo esperando' }, cookie);
    expect(res.status).toBe(201);
    const last = (await messages(own.id)).at(-1);
    expect(last).toEqual({ sender_type: 'consumer', sender_name: BUYER, message: 'Sigo esperando', is_private: false });
    // By case number too.
    expect((await post(app, own.caseNumber, { sender_type: 'consumer', message: 'Por número' }, cookie)).status).toBe(201);
    // Cross-site or origin-less, even with the session: refused, nothing written.
    const count = (await messages(own.id)).length;
    expect((await post(app, own.id, { sender_type: 'consumer', message: 'csrf' }, cookie, 'https://evil.example')).status).toBe(403);
    expect((await post(app, own.id, { sender_type: 'consumer', message: 'csrf' }, cookie, null)).status).toBe(403);
    expect((await messages(own.id)).length).toBe(count);
    expect(await proofStatus(99999999999 as number, cookie)).toBe(401); // beyond INTEGER: an ordinary denial, not a 503 database error
    // Merchant/mediator messages stay contained, session or not; confirmation stays refused.
    expect((await post(app, own.id, { sender_type: 'merchant', sender_name: 'x', message: 'hola' }, cookie)).status).toBe(403);
    expect((await post(app, own.id, { sender_type: 'consumer', message: 'ok', status: 'resolved_consumer_confirmed' }, cookie)).status).toBe(403);
    const patch = await fetch(`${app.origin}/api/v1/cases/${own.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ status: 'resolved_consumer_confirmed', is_consumer_confirmed: true }),
    });
    expect(patch.status).toBe(403);
    expect((await db.client.query('SELECT status, is_consumer_confirmed FROM resolution_cases WHERE id = $1', [own.id])).rows[0]).toEqual({
      status: 'opened',
      is_consumer_confirmed: false,
    });
  });

  it('pins both paths with the switch on: B06 cases need the session, pre-B06 cases keep the buyer-only path (gap closed by B07 #33)', async () => {
    // A case from before B06: no access email (created with the switch off).
    const legacy = await (await createCase(off, { customer_contact: 'legacy-only@example.test' })).json();
    expect((await db.client.query('SELECT access_email FROM resolution_cases WHERE id = $1', [legacy.case.id])).rows[0].access_email).toBeNull();
    const res = await post(app, legacy.case.id, { sender_type: 'consumer', sender_name: 'Impostor', is_private: true, message: 'Mensaje de caso previo' });
    expect(res.status).toBe(201); // no session required: its buyer can't hold one until B07
    expect((await messages(legacy.case.id)).at(-1)).toEqual({ sender_type: 'consumer', sender_name: BUYER, message: 'Mensaje de caso previo', is_private: false });
    expect((await post(app, legacy.case.id, { sender_type: 'merchant', sender_name: 'x', message: 'hola' })).status).toBe(403);
    expect((await post(app, legacy.case.id, { sender_type: 'consumer', message: 'x', status: 'resolved_consumer_confirmed' })).status).toBe(403);
    expect((await post(app, legacy.case.id, { sender_type: 'consumer', message: 'csrf' }, '', 'https://evil.example')).status).toBe(403);
    // A B06 case on the same server: the session is required.
    const fresh = await caseWithLink('pinned@example.test');
    expect((await post(app, fresh.id, { sender_type: 'consumer', message: 'sin sesión' })).status).toBe(401);
  });

  it('with the switch off, keeps the legacy buyer message path as on main', async () => {
    const legacy = await (await createCase(off, { customer_contact: 'legacy-writer@example.test' })).json();
    expect((await post(off, legacy.case.id, { sender_type: 'consumer', sender_name: 'Comprador', message: 'Mensaje legado' })).status).toBe(201);
  });
});

describe('resend', () => {
  it('answers every request the same, sends only on a match, and is bounded per case', async () => {
    const { caseNumber, token: original } = await caseWithLink('resend@example.test');
    const since = mail.messages.length;
    const answers = new Set<string>();
    for (const [number, email] of [
      [caseNumber, 'wrong@example.test'],
      ['CASO-NOPE-2026-0000', 'resend@example.test'],
      [caseNumber, 'not-an-email'],
    ]) {
      const res = await resend(number, email);
      answers.add(`${res.status} ${res.headers.get('location')}`);
    }
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length).toBe(since); // nothing sent for a mismatch
    const match = await resend(caseNumber, 'RESEND@example.test');
    answers.add(`${match.status} ${match.headers.get('location')}`);
    expect([...answers]).toEqual(['303 /caso/acceso/reenviar?resultado=revisa']);
    const message = await mail.waitFor('resend@example.test', since);
    const fresh = message.text.match(/token=([A-Za-z0-9_-]+)/)![1];
    secrets.add(fresh);
    // The earlier unused link is retired; the new one works.
    expect((await exchange(original)).headers.get('location')).toBe('/caso/acceso?resultado=invalido');
    // Per case: 3 resends per window, then silence with the same answer.
    const before = mail.messages.length;
    for (let i = 0; i < 4; i++) await resend(caseNumber, 'resend@example.test');
    await new Promise((r) => setTimeout(r, 700));
    expect(mail.messages.length - before).toBe(2); // 1 used above + 2 here = 3 per window
    for (const m of mail.messages.slice(before)) secrets.add(m.text.match(/token=([A-Za-z0-9_-]+)/)![1]);
  });

  it('bounds resends per client address across cases', async () => {
    const { caseNumber } = await caseWithLink('client-limit@example.test');
    const ip = '203.0.113.250';
    for (let i = 0; i < 10; i++) await resend(`CASO-NONE-2026-${1000 + i}`, 'nobody@example.test', ip); // 10 per window, all mismatches
    const since = mail.messages.length;
    const res = await resend(caseNumber, 'client-limit@example.test', ip); // a real match, over the client limit
    expect(res.headers.get('location')).toBe('/caso/acceso/reenviar?resultado=revisa');
    await new Promise((r) => setTimeout(r, 700));
    expect(mail.messages.length).toBe(since);
  });

  it('lets a buyer whose first email failed get a working link by resend', async () => {
    const body = await (await createCase(noMail, { access_email: 'after-fail@example.test', submission_key: newKey() })).json();
    expect(body.access_link).toBe('not_sent');
    const since = mail.messages.length;
    await resend(body.case.case_number, 'after-fail@example.test');
    const message = await mail.waitFor('after-fail@example.test', since);
    const token = message.text.match(/token=([A-Za-z0-9_-]+)/)![1];
    secrets.add(token);
    const res = await exchange(token);
    expect(res.headers.get('location')).toBe(`/caso/${body.case.id}`);
    secrets.add(res.headers.get('set-cookie')!.split(';')[0].split('=')[1]);
  });

  it('never sends for a legacy case that has no access email', async () => {
    const legacy = await (await createCase(off, { customer_contact: 'legacy@example.test' })).json();
    const since = mail.messages.length;
    await resend(legacy.case.case_number, 'legacy@example.test');
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length).toBe(since);
  });
});

describe('switch off (production default)', () => {
  it('keeps the legacy contract and closes every new route', async () => {
    const since = mail.messages.length;
    const res = await createCase(off, { customer_contact: 'legacy-buyer@example.test' });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).not.toHaveProperty('access_link');
    expect((await createCase(off, {})).status).toBe(400); // contact still required
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length).toBe(since); // no email
    for (const [path, method] of [
      ['/caso/acceso', 'GET'],
      ['/caso/acceso/reenviar', 'GET'],
      ['/caso/acceso/entrar', 'POST'],
      ['/caso/acceso/salir', 'POST'],
      ['/caso/acceso/reenviar/enviar', 'POST'],
      [`/api/v1/cases/${body.case.id}/acceso`, 'GET'],
    ] as const) {
      expect((await fetch(`${off.origin}${path}`, { method, headers: { origin: off.origin } })).status, `${method} ${path}`).toBe(404);
    }
    // QA-048: the gated pages' 404s carry the same title as a route that does not exist.
    const titleOf = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1];
    const plain = titleOf(await (await fetch(`${off.origin}/no-existe-${Date.now()}`)).text());
    for (const p of ['/caso/acceso', '/caso/acceso/reenviar']) {
      const html = await (await fetch(`${off.origin}${p}`)).text();
      expect(titleOf(html), p).toBe(plain);
      expect(html, p).not.toMatch(/Acceso a tu caso|Nuevo enlace para tu caso/);
    }
    const form = await (await fetch(`${off.origin}/caso/nuevo`)).text();
    expect(form).toContain('Correo o teléfono de contacto');
    expect(form).not.toContain('Correo privado para acceder a tu caso');
  });
});

describe('credential leakage', () => {
  it('keeps tokens, sessions, access emails and case text out of logs and public payloads', async () => {
    const logs = servers.map((s) => s.logs()).join('\n');
    expect(secrets.size).toBeGreaterThan(8);
    for (const s of secrets) {
      expect(logs).not.toContain(s);
      expect(logs).not.toContain(hashSecret(s));
    }
    expect(logs).not.toMatch(/SENTINEL_BUYER|SENTINEL_CASE|@example\.test|55 1234/);
    const ids = (await db.client.query("SELECT id FROM resolution_cases WHERE access_email IS NOT NULL ORDER BY id LIMIT 3")).rows.map((r) => r.id);
    for (const id of ids) {
      for (const headers of [{}, { RSC: '1' }] as Record<string, string>[]) {
        const page = await (await fetch(`${app.origin}/caso/${id}`, { headers })).text();
        expect(page).not.toMatch(/@example\.test|55 1234|SENTINEL_BUYER/);
        for (const s of secrets) expect(page).not.toContain(s);
      }
    }
  });
});

/** Desktop and mobile screenshots of the changed screens, only when E2E_SCREENSHOTS_DIR is set. */
describe.runIf(process.env.E2E_SCREENSHOTS_DIR)('screenshots', () => {
  it('captures the case form, the link landing and the verified case page', async () => {
    const dir = process.env.E2E_SCREENSHOTS_DIR!;
    mkdirSync(dir, { recursive: true });
    const browser = await chromium.launch();
    for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      const { id, token } = await caseWithLink(`shot-${name}@example.test`);
      const context = await browser.newContext({ viewport });
      await context.addInitScript(() => window.localStorage.setItem('opinio.analytics-consent', 'denied')); // no consent banner over the form
      const page = await context.newPage();
      await page.goto(`${browserOrigin}/caso/nuevo?b=tienda-a`);
      await page.getByLabel('Correo privado para acceder a tu caso *').waitFor();
      await page.screenshot({ path: path.join(dir, `b06-form-${name}.png`), fullPage: true });
      await page.goto(`${browserOrigin}/caso/acceso#token=${token}`);
      await page.getByRole('button', { name: 'Ver mi caso' }).waitFor();
      expect(page.url()).toBe(`${browserOrigin}/caso/acceso`); // fragment stripped
      await page.screenshot({ path: path.join(dir, `b06-landing-${name}.png`) });
      await page.getByRole('button', { name: 'Ver mi caso' }).click();
      await page.waitForURL(`${browserOrigin}/caso/${id}`);
      await page.getByTestId('case-access-verified').waitFor();
      await page.screenshot({ path: path.join(dir, `b06-verified-${name}.png`) });
      await context.close();
    }
    await browser.close();
  });
});

