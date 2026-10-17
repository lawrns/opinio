/**
 * B01 (issue #27): Auth.js email login and revocation on the exact Next 16
 * stack. Drives the built standalone server over real HTTP against a
 * throwaway Postgres and a captured SMTP sink. Run with `pnpm test:e2e`.
 */
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

const SECRET = randomBytes(32).toString('hex'); // test-only, per run
const MERCHANT = 'merchant-owner@example.test';
const FROM = 'Opinio Test <login@opinio.test>';
// Every synthetic address this suite signs in with; none may appear in logs.
const EMAILS = [MERCHANT, 'tls-owner@example.test', 'host-header@example.test', 'csrf-victim@example.test'];

let db: TestDatabase;
let mail: MailSink;
let serverJs: string;
let app: AppServer; // AUTH_URL set to the server's own http origin
const servers: AppServer[] = [];
const secrets = new Set<string>(); // raw tokens/cookies that must never be logged

async function start(env: Record<string, string>, port?: number) {
  const server = await startApp(serverJs, {
    DATABASE_URL: db.url,
    AUTH_SECRET: SECRET,
    AUTH_EMAIL_SERVER: mail.url,
    AUTH_EMAIL_FROM: FROM,
    ...env,
  }, port);
  servers.push(server);
  return server;
}

const linkIn = (text: string) => {
  const match = text.match(/https?:\/\/\S+\/api\/auth\/callback\/nodemailer\?\S+/);
  if (!match) throw new Error('no sign-in link in captured mail');
  return new URL(match[0]);
};

/** Requests an email link through the real Auth.js sign-in endpoint. */
async function requestLink(
  server: AppServer,
  email: string,
  headers: Record<string, string> = {},
): Promise<URL> {
  const jar = new CookieJar();
  const csrfRes = await fetch(`${server.origin}/api/auth/csrf`, { headers });
  jar.store(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const since = mail.messages.length;
  const res = await fetch(`${server.origin}/api/auth/signin/nodemailer`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
    body: new URLSearchParams({ email, csrfToken, callbackUrl: '/spike/auth' }),
  });
  expect(res.status).toBe(302);
  expect(res.headers.get('location')).toContain('/api/auth/verify-request');
  const link = linkIn((await mail.waitFor(email, since)).text);
  secrets.add(link.searchParams.get('token')!);
  return link;
}

/** Opens the emailed link against `server` (path only; host comes from the link). */
async function openLink(server: AppServer, link: URL, headers: Record<string, string> = {}) {
  const jar = new CookieJar();
  const res = await fetch(`${server.origin}${link.pathname}${link.search}`, { redirect: 'manual', headers });
  jar.store(res);
  return { res, jar };
}

async function login(server: AppServer, email = MERCHANT) {
  const link = await requestLink(server, email);
  const { res, jar } = await openLink(server, link);
  expect(res.status).toBe(302);
  const cookie = jar.get('authjs.session-token');
  expect(cookie).toBeTruthy();
  secrets.add(cookie!);
  return { jar, cookie: cookie! };
}

const whoami = (server: AppServer, cookie: string, headers: Record<string, string> = {}) =>
  fetch(`${server.origin}/api/spike/auth/session`, { headers: { ...headers, cookie } });

/** Renders the protected page and returns the server action ID from its form. */
async function loadActionId(server: AppServer, cookie: string, headers: Record<string, string> = {}) {
  const html = await (await fetch(`${server.origin}/spike/auth`, { headers: { ...headers, cookie } })).text();
  const id = html.match(/name="\$ACTION_ID_([0-9a-f]+)"/)?.[1];
  if (!id) throw new Error('server action ID not rendered');
  return { id, html };
}

/** Submits the rendered form exactly as a browser without JS would. */
function invokeAction(
  server: AppServer,
  actionId: string,
  cookie: string,
  name: string,
  headers: Record<string, string> = {},
) {
  const form = new FormData();
  form.set(`$ACTION_ID_${actionId}`, '');
  form.set('name', name);
  return fetch(`${server.origin}/spike/auth`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: server.origin, ...headers, cookie },
    body: form,
  });
}

const userName = async (email = MERCHANT) =>
  (await db.client.query('SELECT name FROM users WHERE email = $1', [email])).rows[0]?.name ?? null;
const sessionCount = async () => Number((await db.client.query('SELECT count(*) FROM sessions')).rows[0].count);

beforeAll(async () => {
  [db, mail] = await Promise.all([
    startDatabase(['src/lib/schema.sql', 'src/lib/auth/schema.sql']),
    startMailSink(),
  ]);
  serverJs = buildApp('.next-e2e');
  const port = await freePort();
  // Next normalizes 127.0.0.1 to localhost in request URLs, so AUTH_URL uses localhost.
  app = await start({ OPINIO_AUTH_SPIKE: '1', AUTH_URL: `http://localhost:${port}` }, port);
}, 300_000);

afterAll(async () => {
  await Promise.all(servers.map((s) => s.stop()));
  await mail?.stop();
  await db?.stop();
});

describe('email login → database session → protected route and server action', () => {
  it('logs in once from the captured email and both protected entry points succeed', async () => {
    const link = await requestLink(app, MERCHANT);
    expect(link.origin).toBe(`http://localhost:${new URL(app.origin).port}`);

    // Only SHA-256(token + secret) is stored for the email link.
    const raw = link.searchParams.get('token')!;
    expect(raw).toMatch(/^[0-9a-f]{64}$/); // 32 random bytes
    const stored = (await db.client.query('SELECT token, expires FROM verification_token')).rows;
    expect(stored).toHaveLength(1);
    expect(stored[0].token).toBe(createHash('sha256').update(`${raw}${SECRET}`).digest('hex'));
    expect(stored[0].token).not.toContain(raw);
    const ttl = (new Date(stored[0].expires).valueOf() - Date.now()) / 1000;
    expect(ttl).toBeGreaterThan(14 * 60);
    expect(ttl).toBeLessThanOrEqual(15 * 60);

    const { res, jar } = await openLink(app, link);
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!, app.origin).pathname).toBe('/spike/auth');
    expect(res.headers.get('location')).not.toContain(raw);
    const cookie = jar.get('authjs.session-token')!;
    secrets.add(cookie);

    // Host-only, HttpOnly, SameSite=Lax session cookie with a 7-day expiry.
    const setCookie = jar.setCookies.find((c) => c.startsWith('authjs.session-token='))!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).not.toMatch(/Domain=/i);

    // The link is consumed and the session row stores only a hash of the cookie.
    expect((await db.client.query('SELECT count(*) FROM verification_token')).rows[0].count).toBe('0');
    const sessions = (await db.client.query('SELECT "sessionToken", expires FROM sessions')).rows;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionToken).toBe(createHash('sha256').update(cookie).digest('hex'));
    const days = (new Date(sessions[0].expires).valueOf() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThanOrEqual(7);

    const route = await whoami(app, `authjs.session-token=${cookie}`);
    expect(route.status).toBe(200);
    expect(await route.json()).toEqual({ email: MERCHANT });
    expect(route.headers.get('cache-control')).toContain('no-store');

    const { id, html } = await loadActionId(app, `authjs.session-token=${cookie}`);
    expect(html).toContain('signed-in');
    const action = await invokeAction(app, id, `authjs.session-token=${cookie}`, 'Owner A');
    expect(action.status).toBeLessThan(400);
    expect(await userName()).toBe('Owner A');

    // Reading the session repeatedly never extends its absolute expiry.
    const after = (await db.client.query('SELECT expires FROM sessions')).rows[0].expires;
    expect(new Date(after).valueOf()).toBe(new Date(sessions[0].expires).valueOf());
  });

  it('rejects a replayed link without creating a session', async () => {
    const link = await requestLink(app, MERCHANT);
    expect((await openLink(app, link)).res.status).toBe(302);
    const before = await sessionCount();
    const { res, jar } = await openLink(app, link);
    expect(res.headers.get('location')).toContain('error=Verification');
    expect(jar.get('authjs.session-token')).toBeUndefined();
    expect(await sessionCount()).toBe(before);
  });

  it('lets exactly one of two raced exchanges of the same link win', async () => {
    const link = await requestLink(app, MERCHANT);
    const before = await sessionCount();
    const results = await Promise.all([openLink(app, link), openLink(app, link)]);
    const winners = results.filter((r) => r.jar.get('authjs.session-token'));
    expect(winners).toHaveLength(1);
    expect(await sessionCount()).toBe(before + 1);
  });

  // The exact expiry instant (now === expires) is pinned with a controlled clock in
  // src/lib/auth/adapter.test.ts; over HTTP the request lands just after expiry.
  it('rejects an expired link', async () => {
    const link = await requestLink(app, MERCHANT);
    await db.client.query('UPDATE verification_token SET expires = now()');
    const before = await sessionCount();
    const { res, jar } = await openLink(app, link);
    expect(res.headers.get('location')).toContain('error=Verification');
    expect(jar.get('authjs.session-token')).toBeUndefined();
    expect(await sessionCount()).toBe(before);
  });
});

describe('revocation and expiry deny the next route and action request', () => {
  it('denies an already open tab after the session row is deleted', async () => {
    const { cookie } = await login(app);
    const c = `authjs.session-token=${cookie}`;
    const { id } = await loadActionId(app, c); // the tab is open with a rendered form
    expect((await whoami(app, c)).status).toBe(200);

    await db.client.query('DELETE FROM sessions WHERE "sessionToken" = $1', [
      createHash('sha256').update(cookie).digest('hex'),
    ]);

    expect((await whoami(app, c)).status).toBe(401);
    const nameBefore = await userName();
    await invokeAction(app, id, c, 'written after revocation');
    expect(await userName()).toBe(nameBefore);
  });

  it('denies both after sign-out through the CSRF-protected endpoint', async () => {
    const { jar, cookie } = await login(app);
    const c = `authjs.session-token=${cookie}`;
    const { id } = await loadActionId(app, c);
    const csrfRes = await fetch(`${app.origin}/api/auth/csrf`, { headers: { cookie: jar.header() } });
    jar.store(csrfRes);
    const { csrfToken } = await csrfRes.json();
    const out = await fetch(`${app.origin}/api/auth/signout`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
      body: new URLSearchParams({ csrfToken }),
    });
    expect(out.status).toBe(302);
    const hash = createHash('sha256').update(cookie).digest('hex');
    expect((await db.client.query('SELECT 1 FROM sessions WHERE "sessionToken" = $1', [hash])).rowCount).toBe(0);

    expect((await whoami(app, c)).status).toBe(401);
    const nameBefore = await userName();
    await invokeAction(app, id, c, 'written after sign-out');
    expect(await userName()).toBe(nameBefore);
  });

  // Exact-instant boundary: src/lib/auth/adapter.test.ts.
  it('denies both once the session has expired and deletes the row', async () => {
    const { cookie } = await login(app);
    const c = `authjs.session-token=${cookie}`;
    const { id } = await loadActionId(app, c);
    const hash = createHash('sha256').update(cookie).digest('hex');
    await db.client.query('UPDATE sessions SET expires = now() WHERE "sessionToken" = $1', [hash]);

    expect((await whoami(app, c)).status).toBe(401);
    const nameBefore = await userName();
    await invokeAction(app, id, c, 'written after expiry');
    expect(await userName()).toBe(nameBefore);
    expect((await db.client.query('SELECT 1 FROM sessions WHERE "sessionToken" = $1', [hash])).rowCount).toBe(0);
  });

  it('denies logged-out and tampered-cookie requests', async () => {
    const { cookie } = await login(app);
    const { id } = await loadActionId(app, `authjs.session-token=${cookie}`);
    const tampered = `authjs.session-token=${cookie.slice(0, -1)}${cookie.endsWith('0') ? '1' : '0'}`;
    const hashCookie = `authjs.session-token=${createHash('sha256').update(cookie).digest('hex')}`;
    const nameBefore = await userName();

    for (const c of ['', tampered, hashCookie]) {
      expect((await whoami(app, c)).status).toBe(401);
      await invokeAction(app, id, c, 'written without a valid session');
    }
    expect(await userName()).toBe(nameBefore);
  });
});

describe('CSRF', () => {
  it('ignores a cross-origin server action POST', async () => {
    const { cookie } = await login(app);
    const c = `authjs.session-token=${cookie}`;
    const { id } = await loadActionId(app, c);
    const nameBefore = await userName();
    const res = await invokeAction(app, id, c, 'cross-site write', { origin: 'https://attacker.example' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await userName()).toBe(nameBefore);
    // The same request from the app's own origin still works.
    await invokeAction(app, id, c, 'Owner A again');
    expect(await userName()).toBe('Owner A again');
  });

  it('sends no mail for a sign-in POST without the CSRF token', async () => {
    const since = mail.messages.length;
    const res = await fetch(`${app.origin}/api/auth/signin/nodemailer`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'csrf-victim@example.test' }),
    });
    expect(res.headers.get('location')).toMatch(/MissingCSRF|csrf=true/);
    await new Promise((r) => setTimeout(r, 300));
    expect(mail.messages.slice(since)).toHaveLength(0);
  });

  it('refuses a sign-out POST without the CSRF token', async () => {
    const { cookie } = await login(app);
    const c = `authjs.session-token=${cookie}`;
    await fetch(`${app.origin}/api/auth/signout`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: c, origin: 'https://attacker.example' },
      body: new URLSearchParams({}),
    });
    expect((await whoami(app, c)).status).toBe(200);
  });
});

describe('deployment shape: standalone behind a TLS-terminating proxy', () => {
  const PROXY = { 'x-forwarded-host': 'opinio.test', 'x-forwarded-proto': 'https' };

  it('issues __Secure- cookies and keeps links and actions on AUTH_URL', async () => {
    const tls = await start({ OPINIO_AUTH_SPIKE: '1', AUTH_URL: 'https://opinio.test' });
    const link = await requestLink(tls, 'tls-owner@example.test', PROXY);
    expect(link.origin).toBe('https://opinio.test');
    const { res, jar } = await openLink(tls, link, PROXY);
    expect(res.status).toBe(302);
    const setCookie = jar.setCookies.find((c) => c.startsWith('__Secure-authjs.session-token='))!;
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).not.toMatch(/Domain=/i);
    const cookie = jar.get('__Secure-authjs.session-token')!;
    secrets.add(cookie);
    const c = `__Secure-authjs.session-token=${cookie}`;

    expect((await whoami(tls, c, PROXY)).status).toBe(200);
    const { id } = await loadActionId(tls, c, PROXY);
    await invokeAction(tls, id, c, 'TLS owner', { ...PROXY, origin: 'https://opinio.test' });
    expect(await userName('tls-owner@example.test')).toBe('TLS owner');
    await invokeAction(tls, id, c, 'forged', { ...PROXY, origin: 'https://attacker.example' });
    expect(await userName('tls-owner@example.test')).toBe('TLS owner');

    // A forged forwarded host does not move the emailed link when AUTH_URL is set.
    const forged = await requestLink(tls, 'tls-owner@example.test', {
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'https',
    });
    expect(forged.origin).toBe('https://opinio.test');
  });

  it('records: without AUTH_URL, links use the bind address, not a forwarded host', async () => {
    // The standalone server builds request URLs from its own bind address, so a
    // forged forwarded host cannot redirect the link, but the link is unusable
    // in production: AUTH_URL is a required production setting.
    const trusting = await start({ OPINIO_AUTH_SPIKE: '1', AUTH_TRUST_HOST: 'true' });
    const link = await requestLink(trusting, 'host-header@example.test', {
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'https',
    });
    expect(link.hostname).toBe('localhost');
    expect(link.port).toBe(new URL(trusting.origin).port);
  });
});

describe('switch off (production default)', () => {
  it('serves 404 on every auth and spike surface', async () => {
    const off = await start({});
    for (const p of ['/api/auth/csrf', '/api/auth/providers', '/spike/auth', '/api/spike/auth/session']) {
      expect((await fetch(`${off.origin}${p}`)).status, p).toBe(404);
    }
    const post = await fetch(`${off.origin}/api/auth/signin/nodemailer`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'off@example.test' }),
    });
    expect(post.status).toBe(404);
  });
});

describe('credential leakage', () => {
  it('rejects a HEAD request (link scanner) without consuming the email link', async () => {
    const link = await requestLink(app, MERCHANT);
    const head = await fetch(`${app.origin}${link.pathname}${link.search}`, { method: 'HEAD', redirect: 'manual' });
    expect(head.status).toBe(400);
    const { jar } = await openLink(app, link);
    expect(jar.get('authjs.session-token')).toBeTruthy();
  });

  it('records: any GET of the link consumes it (scanners that follow links)', async () => {
    const link = await requestLink(app, MERCHANT);
    await fetch(`${app.origin}${link.pathname}${link.search}`, { redirect: 'manual' }); // scanner
    const { res } = await openLink(app, link); // the merchant's own click
    expect(res.headers.get('location')).toContain('error=Verification');
  });

  it('writes no token, cookie, stored hash, secret or email address to server logs', () => {
    expect(secrets.size).toBeGreaterThan(5);
    const logs = servers.map((s) => s.logs()).join('\n').replace(/\x1b\[[0-9;]*m/g, '');
    expect(logs).toContain('[auth][error] Verification'); // failed callbacks were logged
    const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
    for (const secret of secrets) {
      expect(logs).not.toContain(secret); // raw link token or session cookie
      expect(logs).not.toContain(sha256(secret)); // stored session hash
      expect(logs).not.toContain(sha256(`${secret}${SECRET}`)); // stored link-token hash
    }
    expect(logs).not.toContain(SECRET);
    for (const email of EMAILS) {
      expect(logs).not.toContain(email);
      expect(logs).not.toContain(encodeURIComponent(email));
    }
  });
});
