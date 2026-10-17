/**
 * B03 (issue #29): an independently verified first owner logs in by email and
 * sees only their business's access screen; pending identities, other
 * businesses and non-administrators get nothing. Built standalone app,
 * throwaway Postgres, captured SMTP.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { grantAdministrator } from '../../../scripts/grant-admin.mjs';
import { allowLoginLink } from '@/lib/auth/rate-limit';
import { hashSecret } from '@/lib/authz/secrets';
import {
  buildApp,
  CookieJar,
  E2E_GA_ID,
  freePort,
  startApp,
  startDatabase,
  startMailSink,
  type AppServer,
  type MailSink,
  type TestDatabase,
} from './harness';

const ADMIN = 'admin@opinio.test';
const APPLICANT = 'owner-a@example.test';
const PENDING = 'ventas@tienda-b.example'; // same domain as business B's listing
const SECRET = 'b03-test-secret-not-real';

let db: TestDatabase;
let mail: MailSink;
let app: AppServer;
let off: AppServer;
const servers: AppServer[] = [];
const secrets = new Set<string>();
const cookies: Record<string, string> = {};
let bizA = 0;
let bizB = 0;
let clientCounter = 0;

/** A distinct client address per request unless one is given, so per-client limits stay out of the way. */
const client = (ip?: string) => ({ 'x-forwarded-for': ip ?? `198.51.100.${++clientCounter % 250}` });

async function actionId(path: string, cookie = ''): Promise<string> {
  const html = await (await fetch(`${app.origin}${path}`, { headers: cookie ? { cookie } : {} })).text();
  const id = html.match(/name="\$ACTION_ID_([0-9a-f]+)"/)?.[1];
  if (!id) throw new Error(`no server action on ${path}`);
  return id;
}

/** Submits a rendered form as a browser without JS would. */
function submit(path: string, id: string, fields: Record<string, string>, headers: Record<string, string> = {}) {
  const form = new FormData();
  form.set(`$ACTION_ID_${id}`, '');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return fetch(`${app.origin}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: app.origin, ...client(), ...headers },
    body: form,
  });
}

async function requestLink(email: string, headers: Record<string, string> = {}) {
  return submit('/acceso', await actionId('/acceso'), { email }, headers);
}

/** The emailed confirmation link for `email`, after requesting one. */
async function emailedLink(email: string): Promise<URL> {
  const since = mail.messages.length;
  const res = await requestLink(email);
  expect(res.status).toBe(303);
  const message = await mail.waitFor(email, since);
  const link = new URL(message.text.match(/https?:\/\/\S+\/acceso\/confirmar#\S+/)![0]);
  secrets.add(new URLSearchParams(link.hash.slice(1)).get('token')!);
  return link;
}

/** What the confirmation page's button posts: the fragment's token and email, same-origin. */
function exchange(fragment: string, headers: Record<string, string> = { origin: app.origin }) {
  const params = new URLSearchParams(fragment);
  const form = new FormData();
  form.set('token', params.get('token') ?? '');
  form.set('email', params.get('email') ?? '');
  return fetch(`${app.origin}/acceso/confirmar/entrar`, { method: 'POST', redirect: 'manual', headers, body: form });
}

/** Full login: form → captured mail → confirmation page → button POST → session cookie. */
async function login(email: string): Promise<string> {
  const link = await emailedLink(email);
  expect((await fetch(`${app.origin}/acceso/confirmar`)).status).toBe(200);
  const jar = new CookieJar();
  const res = await exchange(link.hash.slice(1));
  jar.store(res);
  expect(new URL(res.headers.get('location')!, app.origin).pathname).toBe('/cuenta');
  const session = jar.get('authjs.session-token')!;
  secrets.add(session);
  return `authjs.session-token=${session}`;
}

const get = (path: string, cookie = '') =>
  fetch(`${app.origin}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });

async function approve(fields: Record<string, string>, cookie = cookies.admin, headers: Record<string, string> = {}) {
  const id = await actionId('/admin/aprobaciones', cookies.admin);
  const res = await submit('/admin/aprobaciones', id, fields, { cookie, ...headers });
  return { res, outcome: new URL(res.headers.get('location') ?? '/', app.origin).searchParams.get('resultado') };
}

const count = async (table: string) => Number((await db.client.query(`SELECT count(*) FROM ${table}`)).rows[0].count);

const VALID = {
  businessSlug: 'tienda-a',
  applicantEmail: APPLICANT,
  evidenceMethod: 'dns',
  evidenceSubject: 'tienda-a.example',
  authorityBasis: 'legal_representative',
  evidenceReference: 'VER-1001',
};

let browser: Browser;
/** The browser uses AUTH_URL's host, so Auth.js redirects and host-only cookies stay on one origin. */
let browserOrigin = '';

beforeAll(async () => {
  [db, mail] = await Promise.all([startDatabase(['src/lib/schema.sql'], { migrate: true }), startMailSink()]);
  bizA = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-a', 'Tienda A') RETURNING id")).rows[0].id;
  bizB = (
    await db.client.query(
      "INSERT INTO businesses (slug, brand_name, claimed, rfc, domain) VALUES ('tienda-b', 'Tienda B', true, 'BBB010101BBB', 'tienda-b.example') RETURNING id",
    )
  ).rows[0].id;
  await db.client.query("INSERT INTO identities (business_id, type, identifier, status) VALUES ($1, 'rfc', 'BBB010101BBB', 'verified')", [bizB]);

  const serverJs = buildApp('.next-e2e');
  const port = await freePort();
  const env = { DATABASE_URL: db.url, AUTH_SECRET: SECRET, AUTH_EMAIL_SERVER: mail.url, AUTH_EMAIL_FROM: 'Opinio <acceso@opinio.test>' };
  browserOrigin = `http://localhost:${port}`;
  app = await startApp(serverJs, { ...env, OPINIO_MERCHANT_AUTH: '1', AUTH_URL: browserOrigin }, port);
  off = await startApp(serverJs, env);
  servers.push(app, off);
  browser = await chromium.launch();
}, 300_000);

afterAll(async () => {
  await browser?.close();
  await Promise.all(servers.map((s) => s.stop()));
  await mail?.stop();
  await db?.stop();
});

describe('login link', () => {
  it('emails a neutral link to a confirmation page that a scanner cannot consume', async () => {
    const since = mail.messages.length;
    await requestLink(PENDING);
    const message = await mail.waitFor(PENDING, since);
    expect(message.subject).toBe('Tu enlace para entrar a Opinio');
    // Neutral body: no business, case or review details (the address only appears inside the link).
    const body = message.text.replace(/https?:\/\/\S+/g, '');
    expect(body).not.toMatch(/Tienda|caso|reseña|ventas@/i);
    const emailed = new URL(message.text.match(/https?:\/\/\S+\/acceso\/confirmar#\S+/)![0]);
    expect(emailed.pathname).toBe('/acceso/confirmar');
    expect(emailed.search).toBe('');
    const token = new URLSearchParams(emailed.hash.slice(1)).get('token')!;
    secrets.add(token);

    // A scanner fetches the emailed URL: the fragment never reaches the server.
    for (const method of ['GET', 'HEAD']) {
      const res = await fetch(`${app.origin}/acceso/confirmar`, { method });
      expect(res.status, method).toBe(200);
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(res.headers.get('cache-control')).toContain('no-store');
      if (method === 'GET') {
        const html = await res.text();
        expect(html).not.toContain(token);
        expect(html).not.toMatch(/googletagmanager|gtag\(/);
      }
    }
    // Nor can anything consume it through Auth.js's own GET callback: that route is closed.
    const direct = await fetch(`${app.origin}/api/auth/callback/nodemailer?${emailed.hash.slice(1)}`, { redirect: 'manual' });
    expect(direct.status).toBe(404);
    expect(direct.headers.get('set-cookie')).toBeNull();
    // A cross-site POST of the token gets nothing either.
    for (const headers of [
      { origin: 'https://evil.example' },
      { origin: app.origin, 'sec-fetch-site': 'cross-site' },
      { origin: 'null', 'sec-fetch-site': 'same-site' },
      { origin: 'null' },
      {},
    ]) {
      const res = await exchange(emailed.hash.slice(1), headers as Record<string, string>);
      expect(res.headers.get('location'), JSON.stringify(headers)).toBe('/acceso/error');
      expect(res.headers.get('set-cookie'), JSON.stringify(headers)).toBeNull();
    }
    // The link still works for the person's own press of the button: a same-origin POST.
    const res = await exchange(emailed.hash.slice(1));
    expect(new URL(res.headers.get('location')!, app.origin).pathname).toBe('/cuenta');
    expect(res.headers.get('set-cookie')).toContain('authjs.session-token=');
    // And only once.
    expect(new URL((await exchange(emailed.hash.slice(1))).headers.get('location')!, app.origin).pathname).toBe('/acceso/error');
  });

  it('opens the emailed link in a real browser, strips the fragment and logs in on the button press', async () => {
    const link = await emailedLink(APPLICANT);
    const token = new URLSearchParams(link.hash.slice(1)).get('token')!;
    const context = await browser.newContext();
    const page = await context.newPage();
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto(`${browserOrigin}${link.pathname}${link.hash}`);
    await page.getByRole('button', { name: 'Entrar a Opinio' }).waitFor({ timeout: 10_000 });
    expect(page.url()).toBe(`${browserOrigin}/acceso/confirmar`); // fragment removed from the address bar
    const post = page.waitForRequest((r) => r.url().endsWith('/acceso/confirmar/entrar'), { timeout: 10_000 });
    await page.getByRole('button', { name: 'Entrar a Opinio' }).click();
    expect((await post).method()).toBe('POST');
    await page.waitForURL(`${browserOrigin}/cuenta`, { timeout: 10_000 });
    expect((await context.cookies()).some((c) => c.name === 'authjs.session-token')).toBe(true);
    // The token travelled only in the POST body: no request URL carried it.
    expect(urls.filter((u) => u.includes(token))).toEqual([]);
    await context.close();
  });

  it('answers every request identically and rate-limits sends', async () => {
    const outcomes = [];
    for (const email of [APPLICANT, 'nobody-here@example.test', 'not-an-email']) {
      const res = await requestLink(email);
      outcomes.push(`${res.status} ${res.headers.get('location')}`);
    }
    expect(new Set(outcomes).size).toBe(1);
    expect(outcomes[0]).toBe('303 /acceso/revisa-tu-correo');

    // One client asking for one email: 3 links per 15-minute window, then silence with the same answer.
    const email = 'limited@example.test';
    const attacker = client('203.0.113.50');
    const since = mail.messages.length;
    for (let i = 0; i < 5; i++) {
      const res = await requestLink(email, attacker);
      expect(res.headers.get('location')).toBe('/acceso/revisa-tu-correo');
    }
    const sentTo = async (from: number) => {
      await new Promise((r) => setTimeout(r, 500));
      return mail.messages.slice(from).filter((m) => m.to.includes(email)).length;
    };
    expect(await sentTo(since)).toBe(3);
    // That stranger has not locked the person out: their own request still gets a link.
    const own = mail.messages.length;
    await requestLink(email, client('198.51.100.200'));
    expect(await sentTo(own)).toBe(1);
    // Across many clients one email still gets at most 10 per window (4 so far).
    const spread = mail.messages.length;
    for (let i = 0; i < 8; i++) await requestLink(email, client(`192.0.2.${i + 1}`));
    expect(await sentTo(spread)).toBe(6);

    // Per client address: 10 per window across different emails. Entries a
    // caller adds to the left of X-Forwarded-For are ignored; the proxy's
    // last entry counts.
    const before = mail.messages.length;
    for (let i = 0; i < 12; i++) await requestLink(`spray-${i}@example.test`, client(`10.9.${i}.1, 203.0.113.7`));
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length - before).toBe(10);
    const { rows } = await db.client.query('SELECT bucket FROM auth_rate_limits');
    expect(JSON.stringify(rows)).not.toContain('example.test');
  });

  it('sends nothing on direct Auth.js sign-in POSTs, however many', async () => {
    const jar = new CookieJar();
    const csrf = await fetch(`${app.origin}/api/auth/csrf`);
    jar.store(csrf);
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    const since = mail.messages.length;
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${app.origin}/api/auth/signin/nodemailer`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header(), origin: app.origin },
        body: new URLSearchParams({ csrfToken, email: 'direct@example.test', callbackUrl: '/cuenta' }),
      });
      expect(res.status, `POST ${i + 1}`).toBe(404);
    }
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.slice(since)).toEqual([]);
    expect((await db.client.query("SELECT 1 FROM verification_token WHERE identifier = 'direct@example.test'")).rowCount).toBe(0);
  });

  it('rejects oversized input before any pattern runs', async () => {
    const since = mail.messages.length;
    const started = performance.now();
    const res = await requestLink(`${'a'.repeat(400_000)}@${'b.'.repeat(100_000)}mx`);
    expect(res.headers.get('location')).toBe('/acceso/revisa-tu-correo');
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(mail.messages.length).toBe(since);
  });

  it('deletes rate-limit windows older than the previous one', async () => {
    await db.client.query(
      "INSERT INTO auth_rate_limits (bucket, window_start, hits) VALUES (repeat('f', 64), now() - interval '2 hours', 1)",
    );
    await allowLoginLink(db.client, { email: 'prune@example.test', client: '192.0.2.250' });
    const { rows } = await db.client.query("SELECT count(*)::int AS n FROM auth_rate_limits WHERE window_start < now() - interval '1 hour'");
    expect(rows[0].n).toBe(0);
  });
});

describe('pending identity', () => {
  it('sees only the pending state, even with an email on a claimed listing’s domain', async () => {
    cookies.pending = await login(PENDING);
    const account = await get('/cuenta', cookies.pending);
    expect(account.status).toBe(200);
    const html = await account.text();
    expect(html).toContain('data-testid="access-pending"');
    expect(html).not.toContain('Tienda B');
    expect((await get(`/cuenta/negocios/${bizB}`, cookies.pending)).status).toBe(404);
    expect((await get('/admin/aprobaciones', cookies.pending)).status).toBe(404);
    expect(await count('business_memberships')).toBe(0);
  });
});

describe('administrator approval', () => {
  it('creates administrators only outside the app, for signed-in users', async () => {
    expect(await grantAdministrator(db.client, ADMIN)).toBe('no_signed_in_user');
    cookies.admin = await login(ADMIN);
    expect((await get('/admin/aprobaciones', cookies.admin)).status).toBe(404); // not yet an administrator
    expect(await grantAdministrator(db.client, ADMIN, { dryRun: true })).toBe('would_grant');
    expect(await count('platform_administrators')).toBe(0);
    expect(await grantAdministrator(db.client, ADMIN)).toBe('granted');
    expect(await grantAdministrator(db.client, ADMIN)).toBe('already_administrator');
    // After the first administrator, every grant names an existing administrator.
    expect(await grantAdministrator(db.client, PENDING, { dryRun: true })).toBe('granter_required');
    expect(await grantAdministrator(db.client, PENDING, { dryRun: true, grantedBy: PENDING })).toBe('granter_not_administrator');
    expect(await grantAdministrator(db.client, PENDING, { dryRun: true, grantedBy: ADMIN })).toBe('would_grant');
    const grants = (await db.client.query("SELECT actor_type, details FROM audit_logs WHERE action = 'administrator.granted'")).rows;
    expect(grants).toEqual([{ actor_type: 'system', details: expect.objectContaining({ granted_by_user_id: null }) }]);
    expect((await get('/admin/aprobaciones', cookies.admin)).status).toBe(200);
  });

  it('approves a first owner with method, authority and reference, atomically and audited', async () => {
    cookies.owner = await login(APPLICANT);
    const { res, outcome } = await approve(VALID);
    expect(res.status).toBe(303);
    expect(outcome).toBe('aprobado');

    const approval = (await db.client.query('SELECT * FROM ownership_approvals')).rows;
    expect(approval).toHaveLength(1);
    expect(approval[0]).toMatchObject({
      business_id: bizA,
      kind: 'first_owner',
      evidence_method: 'dns',
      evidence_subject: 'tienda-a.example',
      authority_basis: 'legal_representative',
      evidence_reference: 'VER-1001',
    });
    const membership = (await db.client.query('SELECT * FROM business_memberships')).rows;
    expect(membership).toEqual([
      expect.objectContaining({ business_id: bizA, role: 'owner', status: 'active', approval_id: approval[0].id }),
    ]);
    const audit = (await db.client.query("SELECT actor_type, actor_id, details FROM audit_logs WHERE action = 'ownership.approved'")).rows;
    expect(audit).toEqual([
      { actor_type: 'administrator', actor_id: approval[0].approved_by_user_id, details: expect.objectContaining({ approval_id: approval[0].id }) },
    ]);
    expect(JSON.stringify(audit)).not.toContain('@');
  });

  it('rejects approvals without restricted evidence, for existing owners, self or unknown applicants', async () => {
    const before = [await count('ownership_approvals'), await count('business_memberships')];
    const cases: [Record<string, string>, string][] = [
      [{ ...VALID, businessSlug: 'tienda-b', evidenceReference: 'juan@tienda-b.example' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', evidenceReference: 'llamé al 5550000002' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', evidenceMethod: 'claimed_listing' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', authorityBasis: '' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', evidenceSubject: '' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', evidenceSubject: 'juan@tienda-b.example' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', evidenceSubject: '+525550000002' }, 'invalid_request'], // a phone for a DNS check
      [{ ...VALID, businessSlug: 'tienda-b', evidenceMethod: 'business_callback', evidenceSubject: 'tienda-b.example' }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'tienda-b', applicantEmail: `${'a'.repeat(300_000)}@x.mx` }, 'invalid_request'],
      [{ ...VALID, businessSlug: 'no-such-business' }, 'business_not_found'],
      [{ ...VALID, businessSlug: 'tienda-b', applicantEmail: 'never-signed-in@example.test' }, 'applicant_not_signed_in'],
      [{ ...VALID, businessSlug: 'tienda-b', applicantEmail: ADMIN }, 'self_approval'],
      [{ ...VALID, applicantEmail: PENDING }, 'owner_exists'],
    ];
    for (const [fields, expected] of cases) {
      expect((await approve(fields)).outcome, JSON.stringify(fields)).toBe(expected);
    }
    expect([await count('ownership_approvals'), await count('business_memberships')]).toEqual(before);
  });

  it('ignores direct action calls from non-administrators and other origins', async () => {
    const before = await count('ownership_approvals');
    const fields = { ...VALID, businessSlug: 'tienda-b', applicantEmail: PENDING };
    for (const [label, cookie] of [
      ['owner', cookies.owner],
      ['pending identity', cookies.pending],
      ['no session', ''],
    ] as const) {
      const { res } = await approve(fields, cookie);
      expect(res.status, label).toBe(303);
      expect(res.headers.get('location'), label).toBe('/acceso');
    }
    // Next aborts a cross-origin server action before it runs.
    const { res } = await approve(fields, cookies.admin, { origin: 'https://attacker.example' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await count('ownership_approvals')).toBe(before);
  });
});

describe('approved owner', () => {
  it('sees only business A', async () => {
    const account = await (await get('/cuenta', cookies.owner)).text();
    expect(account).toContain('Tienda A');
    expect(account).not.toContain('Tienda B');
    const screen = await get(`/cuenta/negocios/${bizA}`, cookies.owner);
    expect(screen.status).toBe(200);
    const html = await screen.text();
    expect(html).toContain('data-testid="business-access"');
    expect(html).toContain('Propietario');
    for (const id of [bizB, 999_999, 'tienda-a']) {
      expect((await get(`/cuenta/negocios/${id}`, cookies.owner)).status, String(id)).toBe(404);
    }
    expect((await get('/admin/aprobaciones', cookies.owner)).status).toBe(404);
  });

  // #42 (CONTAIN-2) is in the base: the merchant dashboard stays denied for
  // everyone, including an approved owner and an administrator, until its own
  // ticket reopens it. Merchant login opens nothing there.
  it('keeps the existing merchant dashboard denied, even for an approved owner', async () => {
    for (const who of ['owner', 'admin'] as const) {
      for (const path of ['/merchant', '/merchant/inbox', '/merchant/requests', '/merchant/settings', `/merchant/inbox?business=tienda-b`]) {
        const res = await get(path, cookies[who]);
        expect(res.status, `${who} ${path}`).toBe(503);
        const body = await res.text();
        expect(body, `${who} ${path}`).toContain('Panel temporalmente no disponible');
        expect(body, `${who} ${path}`).not.toMatch(/Tienda A|Tienda B|tienda-a|tienda-b|owner-a@|ventas@/);
      }
      const action = await fetch(`${app.origin}/merchant/settings`, {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie: cookies[who], origin: app.origin, 'Next-Action': 'any' },
        body: 'x',
      });
      expect(action.status, `${who} server action`).toBe(503);
    }
  });

  it('loses access on the next request after an administrator revokes the approval', async () => {
    const [approval] = (await db.client.query('SELECT id FROM ownership_approvals WHERE business_id = $1 AND revoked_at IS NULL', [bizA])).rows;
    const html = await (await get('/admin/aprobaciones', cookies.admin)).text();
    const ids = [...html.matchAll(/name="\$ACTION_ID_([0-9a-f]+)"/g)].map((m) => m[1]);
    const revokeId = ids.at(-1)!;
    // Not an administrator: nothing changes.
    await submit('/admin/aprobaciones', revokeId, { approvalId: String(approval.id) }, { cookie: cookies.owner });
    expect((await get(`/cuenta/negocios/${bizA}`, cookies.owner)).status).toBe(200);
    // The administrator revokes it.
    const res = await submit('/admin/aprobaciones', revokeId, { approvalId: String(approval.id) }, { cookie: cookies.admin });
    expect(new URL(res.headers.get('location')!, app.origin).searchParams.get('resultado')).toBe('revocado');
    expect((await get(`/cuenta/negocios/${bizA}`, cookies.owner)).status).toBe(404);
    expect(await (await get('/cuenta', cookies.owner)).text()).toContain('data-testid="access-pending"');
    const audit = (await db.client.query("SELECT details FROM audit_logs WHERE action = 'ownership.approval_revoked'")).rows;
    expect(audit).toEqual([{ details: { approval_id: approval.id, revoked_memberships: 1 } }]);
    // Revoking twice finds nothing to revoke.
    const again = await submit('/admin/aprobaciones', revokeId, { approvalId: String(approval.id) }, { cookie: cookies.admin });
    expect(new URL(again.headers.get('location')!, app.origin).searchParams.get('resultado')).toBe('approval_not_found');
    // A fresh approval restores access.
    expect((await approve({ ...VALID, evidenceReference: 'VER-1002' })).outcome).toBe('aprobado');
    expect((await get(`/cuenta/negocios/${bizA}`, cookies.owner)).status).toBe(200);
  });

  it('allows one active owner per business, whatever the code path', async () => {
    const [{ id: approvalId }] = (
      await db.client.query(
        `INSERT INTO ownership_approvals (business_id, subject_user_id, kind, evidence_method, evidence_subject, authority_basis, evidence_reference, approved_by_user_id)
         SELECT $1, u.id, 'first_owner', 'dns', 'tienda-a.example', 'owner_of_record', 'VER-9', a.user_id
           FROM users u, platform_administrators a WHERE u.email = $2 LIMIT 1 RETURNING id`,
        [bizA, PENDING],
      )
    ).rows;
    await expect(
      db.client.query(
        "INSERT INTO business_memberships (business_id, user_id, role, approval_id) SELECT $1, id, 'owner', $2 FROM users WHERE email = $3",
        [bizA, approvalId, PENDING],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('is denied after expiry, session deletion and sign-out', async () => {
    // Three more logins for one address would exceed the per-email limit
    // exercised above; start a fresh window for this test.
    await db.client.query('DELETE FROM auth_rate_limits');
    const sessionOf = (cookie: string) => hashSecret(cookie.split('=')[1]);
    const expired = await login(APPLICANT);
    await db.client.query(`UPDATE sessions SET expires = now() WHERE "sessionToken" = $1`, [sessionOf(expired)]);
    const deleted = await login(APPLICANT);
    await db.client.query(`DELETE FROM sessions WHERE "sessionToken" = $1`, [sessionOf(deleted)]);
    const signedOut = await login(APPLICANT);
    const out = await submit('/cuenta', await actionId('/cuenta', signedOut), {}, { cookie: signedOut });
    expect(out.status).toBe(303);
    expect((await db.client.query(`SELECT 1 FROM sessions WHERE "sessionToken" = $1`, [sessionOf(signedOut)])).rowCount).toBe(0);

    for (const cookie of [expired, deleted, signedOut, `${cookies.owner.slice(0, -2)}00`]) {
      expect((await get(`/cuenta/negocios/${bizA}`, cookie)).headers.get('location')).toBe('/acceso');
      expect((await get('/cuenta', cookie)).headers.get('location')).toBe('/acceso');
    }
  });
});

describe('private payloads and analytics', () => {
  it('keeps the token and email out of HTML, RSC, JSON and error payloads', async () => {
    const email = 'payload-check@example.test';
    const link = await emailedLink(email);
    const token = new URLSearchParams(link.hash.slice(1)).get('token')!;
    const rsc = { RSC: '1' };
    const responses: [string, Response][] = [
      ['confirm page', await fetch(`${app.origin}/acceso/confirmar`)],
      ['confirm page RSC', await fetch(`${app.origin}/acceso/confirmar`, { headers: rsc })],
      ['check-your-mail page', await fetch(`${app.origin}/acceso/revisa-tu-correo`)],
      ['check-your-mail RSC', await fetch(`${app.origin}/acceso/revisa-tu-correo`, { headers: rsc })],
      ['session JSON, signed out', await fetch(`${app.origin}/api/auth/session`)],
      ['cross-site exchange', await exchange(link.hash.slice(1), { origin: 'https://evil.example' })],
      ['tampered-token exchange', await exchange(`token=${token.slice(0, -4)}AAAA&email=${encodeURIComponent(email)}`)],
      ['closed GET callback', await fetch(`${app.origin}/api/auth/callback/nodemailer?${link.hash.slice(1)}`, { redirect: 'manual' })],
      ['error page', await fetch(`${app.origin}/acceso/error?error=Verification`)],
      ['error page RSC', await fetch(`${app.origin}/acceso/error?error=Verification`, { headers: rsc })],
    ];
    for (const [label, res] of responses) {
      const body = await res.text();
      const headers = JSON.stringify([...res.headers]);
      for (const secret of [token, hashSecret(token), email, encodeURIComponent(email)]) {
        expect(body, label).not.toContain(secret);
        expect(headers, label).not.toContain(secret);
      }
    }
    // The failed exchanges land on the generic error page, not on Auth.js's own.
    expect(new URL(responses[6][1].headers.get('location')!, app.origin).pathname).toBe('/acceso/error');
  });

  it('keeps an already-loaded gtag silent while navigating into /acceso and /cuenta', async () => {
    const context = await browser.newContext();
    await context.addInitScript(() => window.localStorage.setItem('opinio.analytics-consent', 'granted'));
    const page = await context.newPage();
    const beacons: string[] = [];
    // Stand in for gtag.js; any collect beacon is recorded and aborted, nothing leaves the machine.
    await page.route(/googletagmanager\.com\/gtag\/js/, (r) => r.fulfill({ contentType: 'text/javascript', body: '/* gtag.js stub */' }));
    await page.route(/google-analytics\.com|analytics\.google\.com|googletagmanager\.com\/g\/collect/, (r) => {
      beacons.push(r.request().url());
      return r.abort();
    });
    await page.goto(`${app.origin}/`);
    await page.waitForFunction(() => Array.isArray(window.dataLayer) && window.dataLayer.length > 0);
    const entries = (from: number) =>
      page.evaluate((i) => JSON.stringify((window.dataLayer ?? []).slice(i).map((a) => Array.from(a as ArrayLike<unknown>))), from);
    expect(await entries(0)).toContain('page_view'); // positive control: the public page is measured
    const loadedCount = await page.evaluate(() => window.dataLayer!.length);

    const marker = 'SENTINEL_TOKEN_NOT_A_SECRET';
    for (const path of ['/acceso', `/acceso/confirmar#token=${marker}&email=sentinel%40example.test`, '/cuenta', `/cuenta/negocios/${bizA}`]) {
      await page.evaluate((p) => window.history.pushState(null, '', p), path);
      await page.waitForTimeout(300);
      expect(await page.evaluate((id) => window[`ga-disable-${id}` as `ga-disable-${string}`], E2E_GA_ID), path).toBe(true);
    }
    const added = await entries(loadedCount);
    for (const leak of ['/acceso', '/cuenta', marker, 'sentinel']) expect(added, leak).not.toContain(leak);
    expect(added).not.toContain('page_view');
    expect(beacons).toEqual([]);
    await context.close();
  });
});

describe('switch off (production default)', () => {
  it('serves 404 on every login, account and approval surface', async () => {
    for (const p of ['/acceso', '/acceso/confirmar', '/acceso/revisa-tu-correo', '/acceso/error', '/cuenta', `/cuenta/negocios/${bizA}`, '/admin/aprobaciones', '/api/auth/csrf']) {
      expect((await fetch(`${off.origin}${p}`, { headers: { cookie: cookies.admin } })).status, p).toBe(404);
    }
  });
});

describe('credential leakage', () => {
  it('writes no token, cookie or email address to server logs', () => {
    const logs = servers.map((s) => s.logs()).join('\n');
    expect(secrets.size).toBeGreaterThan(5);
    for (const s of secrets) {
      expect(logs).not.toContain(s);
      expect(logs).not.toContain(hashSecret(s));
    }
    for (const email of [ADMIN, APPLICANT, PENDING]) expect(logs).not.toContain(email);
  });
});
