/**
 * B03 (issue #29): an independently verified first owner logs in by email and
 * sees only their business's access screen; pending identities, other
 * businesses and non-administrators get nothing. Built standalone app,
 * throwaway Postgres, captured SMTP.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grantAdministrator } from '../../../scripts/grant-admin.mjs';
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

/** Full login: form → captured mail → confirmation page → button → session cookie. */
async function login(email: string): Promise<string> {
  const since = mail.messages.length;
  const res = await requestLink(email);
  expect(res.status).toBe(303);
  const message = await mail.waitFor(email, since);
  const emailed = new URL(message.text.match(/https?:\/\/\S+\/acceso\/confirmar#\S+/)![0]);
  const params = new URLSearchParams(emailed.hash.slice(1));
  secrets.add(params.get('token')!);

  const page = await fetch(`${app.origin}/acceso/confirmar`);
  expect(page.status).toBe(200);

  const jar = new CookieJar();
  const callback = await fetch(`${app.origin}/api/auth/callback/nodemailer?${params}`, { redirect: 'manual' });
  jar.store(callback);
  expect(new URL(callback.headers.get('location')!, app.origin).pathname).toBe('/cuenta');
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
  authorityBasis: 'legal_representative',
  evidenceReference: 'VER-1001',
};

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
  app = await startApp(serverJs, { ...env, OPINIO_MERCHANT_AUTH: '1', AUTH_URL: `http://localhost:${port}` }, port);
  off = await startApp(serverJs, env);
  servers.push(app, off);
}, 300_000);

afterAll(async () => {
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
    // The link still works for the person's own click.
    const callback = await fetch(`${app.origin}/api/auth/callback/nodemailer?${emailed.hash.slice(1)}`, { redirect: 'manual' });
    expect(new URL(callback.headers.get('location')!, app.origin).pathname).toBe('/cuenta');
  });

  it('answers every request identically and rate-limits sends', async () => {
    const outcomes = [];
    for (const email of [APPLICANT, 'nobody-here@example.test', 'not-an-email']) {
      const res = await requestLink(email);
      outcomes.push(`${res.status} ${res.headers.get('location')}`);
    }
    expect(new Set(outcomes).size).toBe(1);
    expect(outcomes[0]).toBe('303 /acceso/revisa-tu-correo');

    // Per email: 3 links per 15-minute window, then silence with the same answer.
    const email = 'limited@example.test';
    const since = mail.messages.length;
    for (let i = 0; i < 5; i++) {
      const res = await requestLink(email);
      expect(res.headers.get('location')).toBe('/acceso/revisa-tu-correo');
    }
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.slice(since).filter((m) => m.to.includes(email))).toHaveLength(3);

    // Per client address: 10 per window across different emails.
    const before = mail.messages.length;
    for (let i = 0; i < 12; i++) await requestLink(`spray-${i}@example.test`, client('203.0.113.7'));
    await new Promise((r) => setTimeout(r, 500));
    expect(mail.messages.length - before).toBe(10);
    const { rows } = await db.client.query('SELECT bucket FROM auth_rate_limits');
    expect(JSON.stringify(rows)).not.toContain('example.test');
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

  it('keeps the existing merchant dashboard contained', async () => {
    const before = await (await fetch(`${off.origin}/merchant`, { redirect: 'manual' })).status;
    expect((await get('/merchant', cookies.owner)).status).toBe(before);
  });

  it('loses access on the next request after the membership is revoked', async () => {
    await db.client.query("UPDATE business_memberships SET status = 'revoked', revoked_at = now() WHERE business_id = $1", [bizA]);
    expect((await get(`/cuenta/negocios/${bizA}`, cookies.owner)).status).toBe(404);
    expect(await (await get('/cuenta', cookies.owner)).text()).toContain('data-testid="access-pending"');
    await db.client.query("UPDATE business_memberships SET status = 'active', revoked_at = NULL WHERE business_id = $1", [bizA]);
    expect((await get(`/cuenta/negocios/${bizA}`, cookies.owner)).status).toBe(200);
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
