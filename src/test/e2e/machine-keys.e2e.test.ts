/**
 * B05 (issue #31): an approved owner issues, rotates and revokes
 * business-scoped machine keys; only the selected scope works, only for the
 * key's own business; keys never act as any other credential. The owner app
 * and the synthetic protected operation (spike switch) share one database.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { chromium, type Browser } from 'playwright';
import { grantAdministrator } from '../../../scripts/grant-admin.mjs';
import { AccessDenied, Unauthenticated } from '@/lib/authz';
import { createMachineKey, listMachineKeys, revokeMachineKey, rotateMachineKey } from '@/lib/authz/keys';
import { approveFirstOwner, type FirstOwnerApproval } from '@/lib/authz/owners';
import { hashSecret } from '@/lib/authz/secrets';
import { acceptStaffInvitation, createStaffInvitation } from '@/lib/authz/staff';
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
const OWNER_A = 'owner-a@example.test';
const OWNER_B = 'owner-b@example.test';
const STAFF_A = 'staff-a@example.test';

let db: TestDatabase;
let pool: Pool;
let mail: MailSink;
let app: AppServer;
let spike: AppServer;
let browser: Browser;
let browserOrigin = '';
const secrets = new Set<string>();
const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let bizA = 0;
let bizB = 0;
let orderA = 0;
let orderB = 0;
let clientCounter = 0;

async function login(email: string): Promise<string> {
  const html = await (await fetch(`${app.origin}/acceso`)).text();
  const actionId = html.match(/name="\$ACTION_ID_([0-9a-f]+)"/)![1];
  const form = new FormData();
  form.set(`$ACTION_ID_${actionId}`, '');
  form.set('email', email);
  const since = mail.messages.length;
  await fetch(`${app.origin}/acceso`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: app.origin, 'x-forwarded-for': `198.51.100.${++clientCounter}` },
    body: form,
  });
  const message = await mail.waitFor(email, since);
  const params = new URLSearchParams(new URL(message.text.match(/https?:\/\/\S+\/acceso\/confirmar#\S+/)![0]).hash.slice(1));
  secrets.add(params.get('token')!);
  const exchange = new FormData();
  exchange.set('token', params.get('token')!);
  exchange.set('email', params.get('email')!);
  const res = await fetch(`${app.origin}/acceso/confirmar/entrar`, { method: 'POST', redirect: 'manual', headers: { origin: app.origin }, body: exchange });
  const jar = new CookieJar();
  jar.store(res);
  const session = jar.get('authjs.session-token')!;
  secrets.add(session);
  ids[email] = (await db.client.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
  return `authjs.session-token=${session}`;
}

/** The synthetic protected operation for `scope`, as an integration would call it. */
function machineWrite(scope: 'order-events' | 'invitations', key: string | null, body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return fetch(`${spike.origin}/api/spike/authz/${scope}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}), ...headers },
    body: JSON.stringify(body),
  });
}

const writes = async () => Number((await db.client.query("SELECT count(*) FROM audit_logs WHERE action = 'authz.test_write'")).rows[0].count);

const approval = (businessId: number, applicantEmail: string, reference: string): FirstOwnerApproval => ({
  businessId,
  applicantEmail,
  evidenceMethod: 'dns',
  evidenceSubject: 'tienda.example',
  authorityBasis: 'owner_of_record',
  evidenceReference: reference,
});

/** The owner's business page in a real browser, signed in as `who`. */
async function ownerPage(who: string) {
  const context = await browser.newContext();
  await context.addCookies([{ name: 'authjs.session-token', value: cookies[who].split('=')[1], url: browserOrigin }]);
  const page = await context.newPage();
  await page.goto(`${browserOrigin}/cuenta/negocios/${bizA}`);
  return { context, page };
}

beforeAll(async () => {
  [db, mail] = await Promise.all([startDatabase(['src/lib/schema.sql'], { migrate: true }), startMailSink()]);
  pool = new Pool({ connectionString: db.url, max: 6 });
  bizA = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-a', 'Tienda A') RETURNING id")).rows[0].id;
  bizB = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-b', 'Tienda B') RETURNING id")).rows[0].id;
  orderA = (await db.client.query("INSERT INTO orders (business_id, external_order_id) VALUES ($1, 'A-1') RETURNING id", [bizA])).rows[0].id;
  orderB = (await db.client.query("INSERT INTO orders (business_id, external_order_id) VALUES ($1, 'B-1') RETURNING id", [bizB])).rows[0].id;
  await db.client.query("INSERT INTO widgets (business_id, token) VALUES ($1, 'wgt_public_a')", [bizA]);

  const serverJs = buildApp('.next-e2e');
  const port = await freePort();
  browserOrigin = `http://localhost:${port}`;
  const env = {
    DATABASE_URL: db.url,
    AUTH_SECRET: 'b05-test-secret-not-real',
    AUTH_EMAIL_SERVER: mail.url,
    AUTH_EMAIL_FROM: 'Opinio <acceso@opinio.test>',
  };
  app = await startApp(serverJs, { ...env, OPINIO_MERCHANT_AUTH: '1', AUTH_URL: browserOrigin }, port);
  // AUTH_URL over http selects the plain (not __Host-) case cookie name the test sends.
  spike = await startApp(serverJs, { ...env, OPINIO_AUTH_SPIKE: '1', AUTH_URL: 'http://localhost' });
  browser = await chromium.launch();

  for (const email of [ADMIN, OWNER_A, OWNER_B, STAFF_A]) cookies[email] = await login(email);
  expect(await grantAdministrator(db.client, ADMIN)).toBe('granted');
  await approveFirstOwner(pool, ids[ADMIN], approval(bizA, OWNER_A, 'VER-501'));
  await approveFirstOwner(pool, ids[ADMIN], approval(bizB, OWNER_B, 'VER-502'));
  const invite = await createStaffInvitation(pool, { ownerUserId: ids[OWNER_A], businessId: bizA, email: STAFF_A });
  secrets.add(invite.token);
  await acceptStaffInvitation(pool, { userId: ids[STAFF_A], token: invite.token });
}, 300_000);

afterAll(async () => {
  await browser?.close();
  await Promise.all([app?.stop(), spike?.stop()]);
  await pool?.end();
  await mail?.stop();
  await db?.stop();
});

describe('owner key journey (ticket verification)', () => {
  let key = '';

  it('shows a new key once; only its scope and its business pass', async () => {
    const { context, page } = await ownerPage(OWNER_A);
    await page.getByLabel('Nombre de la clave').fill('Tienda en línea');
    await page.getByLabel('Eventos de pedidos').check();
    await page.getByRole('button', { name: 'Crear clave' }).click();
    key = (await page.getByTestId('new-key-value').textContent())!.trim();
    secrets.add(key);
    expect(key).toMatch(/^opk_[A-Za-z0-9_-]{8}_[A-Za-z0-9_-]{43}$/);
    // Listed by safe metadata only; a reload no longer shows the secret.
    await page.reload();
    const html = await page.content();
    expect(html).not.toContain(key);
    // The prefix is the 8 characters after `opk_`; it may itself contain `_` or `-`.
    expect(html).toContain(`opk_${key.slice(4, 12)}_…`);
    await context.close();

    // Stored as a hash plus safe metadata; nothing in the table holds the raw key.
    const [row] = (await db.client.query('SELECT * FROM business_machine_keys WHERE business_id = $1', [bizA])).rows;
    expect(row).toMatchObject({ key_hash: hashSecret(key), scopes: ['order_events'], label: 'Tienda en línea', created_by_user_id: ids[OWNER_A] });
    expect(JSON.stringify(row)).not.toContain(key);
    expect(JSON.stringify(await listMachineKeys(pool, bizA))).not.toContain(hashSecret(key));

    // Only the selected synthetic scope passes, for A only.
    const before = await writes();
    const ok = await machineWrite('order-events', key, { order_id: orderA });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, business_id: bizA });
    expect(await writes()).toBe(before + 1);
    const tampered = `${key.slice(0, -1)}${key.endsWith('A') ? 'B' : 'A'}`;
    for (const [label, scope, k, body, status] of [
      ['wrong scope', 'invitations', key, {}, 404],
      ['business B claimed', 'order-events', key, { business_id: bizB }, 404],
      ['order of B', 'order-events', key, { order_id: orderB }, 404],
      ['missing order', 'order-events', key, { order_id: 999_999 }, 404],
      ['tampered key', 'order-events', tampered, {}, 401],
      ['no key', 'order-events', null, {}, 401],
      ['public widget token', 'order-events', 'wgt_public_a', {}, 401],
      ["owner's session value", 'order-events', cookies[OWNER_A].split('=')[1], {}, 401],
    ] as const) {
      const res = await machineWrite(scope, k, body);
      expect(res.status, label).toBe(status);
    }
    expect(await writes()).toBe(before + 1); // no denied call had an effect
  });

  it('rotates: the new key works, the original stops at once', async () => {
    const { context, page } = await ownerPage(OWNER_A);
    await page.getByRole('button', { name: 'Reemplazar' }).click();
    const rotated = (await page.getByTestId('new-key-value').textContent())!.trim();
    secrets.add(rotated);
    await context.close();
    expect(rotated).not.toBe(key);
    expect((await machineWrite('order-events', key)).status).toBe(401);
    expect((await machineWrite('order-events', rotated)).status).toBe(200);
    key = rotated;
  });

  it('revokes: the key fails on its next use', async () => {
    const { context, page } = await ownerPage(OWNER_A);
    await page.getByRole('button', { name: 'Revocar' }).click();
    await page.getByTestId('key-result').waitFor();
    await context.close();
    const before = await writes();
    expect((await machineWrite('order-events', key)).status).toBe(401);
    expect(await writes()).toBe(before);
    const audit = (await db.client.query("SELECT action, details FROM audit_logs WHERE action LIKE 'machine_key.%' ORDER BY id")).rows;
    expect(audit.map((a) => a.action)).toEqual(['machine_key.created', 'machine_key.revoked', 'machine_key.created', 'machine_key.revoked']);
    expect(JSON.stringify(audit)).not.toMatch(/opk_|@/);
  });
});

describe('who manages keys', () => {
  it('keeps issuing and management with the owner of that business', async () => {
    const own = await createMachineKey(pool, { ownerUserId: ids[OWNER_A], businessId: bizA, label: 'pos', scopes: ['invitations'] });
    secrets.add(own.key);
    await expect(createMachineKey(pool, { ownerUserId: ids[STAFF_A], businessId: bizA, label: 'x', scopes: ['order_events'] })).rejects.toBeInstanceOf(AccessDenied);
    await expect(createMachineKey(pool, { ownerUserId: ids[OWNER_B], businessId: bizA, label: 'x', scopes: ['order_events'] })).rejects.toBeInstanceOf(AccessDenied);
    await expect(createMachineKey(pool, { ownerUserId: null, businessId: bizA, label: 'x', scopes: ['order_events'] })).rejects.toBeInstanceOf(Unauthenticated);
    for (const who of [STAFF_A, OWNER_B]) {
      await expect(revokeMachineKey(pool, { ownerUserId: ids[who], keyId: own.keyId })).rejects.toBeInstanceOf(AccessDenied);
      await expect(rotateMachineKey(pool, { ownerUserId: ids[who], keyId: own.keyId })).rejects.toBeInstanceOf(AccessDenied);
    }
    expect((await machineWrite('invitations', own.key)).status).toBe(200); // still active
    // Staff see no key section at all.
    const staffPage = await (await fetch(`${app.origin}/cuenta/negocios/${bizA}`, { headers: { cookie: cookies[STAFF_A] } })).text();
    expect(staffPage).not.toContain('data-testid="keys"');
    // A key cannot manage keys: it is not a merchant session.
    await expect(createMachineKey(pool, { ownerUserId: Number.NaN, businessId: bizA, label: 'x', scopes: ['order_events'] })).rejects.toBeInstanceOf(Unauthenticated);
  });

  it('never accepts a key as a merchant session, an admin credential or buyer proof', async () => {
    const { key } = await createMachineKey(pool, { ownerUserId: ids[OWNER_A], businessId: bizA, label: 'otra', scopes: ['order_events', 'invitations'] });
    secrets.add(key);
    const asBearer = { authorization: `Bearer ${key}` };
    expect((await fetch(`${app.origin}/cuenta`, { redirect: 'manual', headers: asBearer })).headers.get('location')).toBe('/acceso');
    expect((await fetch(`${app.origin}/cuenta`, { redirect: 'manual', headers: { cookie: `authjs.session-token=${key}` } })).headers.get('location')).toBe('/acceso');
    expect((await fetch(`${app.origin}/admin/aprobaciones`, { redirect: 'manual', headers: asBearer })).status).toBe(404);
    expect((await fetch(`${app.origin}/cuenta/negocios/${bizA}`, { redirect: 'manual', headers: asBearer })).headers.get('location')).toBe('/acceso');
    const caseId = (await db.client.query(
      "INSERT INTO resolution_cases (business_id, case_number, customer_name, customer_contact, issue_category, customer_requested_remedy) VALUES ($1, 'OP-K-1', 'Comprador', 'c@example.test', 'delay', 'refund') RETURNING id",
      [bizA],
    )).rows[0].id;
    for (const headers of [asBearer, { cookie: `opinio_case_${caseId}=${key}` }]) {
      expect((await fetch(`${spike.origin}/api/spike/authz/cases/${caseId}`, { headers })).status).toBe(401);
    }
  });
});

describe('concurrency', () => {
  it('rotating the same key twice at once yields exactly one replacement', async () => {
    const original = await createMachineKey(pool, { ownerUserId: ids[OWNER_A], businessId: bizA, label: 'carrera', scopes: ['order_events'] });
    secrets.add(original.key);
    const results = await Promise.allSettled([
      rotateMachineKey(pool, { ownerUserId: ids[OWNER_A], keyId: original.keyId }),
      rotateMachineKey(pool, { ownerUserId: ids[OWNER_A], keyId: original.keyId }),
    ]);
    results.forEach((r) => r.status === 'fulfilled' && secrets.add(r.value.key));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { reason: 'not_found' } });
    const active = (await db.client.query("SELECT count(*)::int AS n FROM business_machine_keys WHERE business_id = $1 AND label = 'carrera' AND revoked_at IS NULL", [bizA])).rows[0].n;
    expect(active).toBe(1);
  });

  it('a use racing a revocation never succeeds after the revocation commits', async () => {
    const k = await createMachineKey(pool, { ownerUserId: ids[OWNER_A], businessId: bizA, label: 'revocada', scopes: ['order_events'] });
    secrets.add(k.key);
    const [, during] = await Promise.all([revokeMachineKey(pool, { ownerUserId: ids[OWNER_A], keyId: k.keyId }), machineWrite('order-events', k.key)]);
    expect([200, 401]).toContain(during.status); // either side of the commit
    expect((await machineWrite('order-events', k.key)).status).toBe(401);
  });

  it('caps active keys per business', async () => {
    const active = (await db.client.query('SELECT count(*)::int AS n FROM business_machine_keys WHERE business_id = $1 AND revoked_at IS NULL', [bizB])).rows[0].n;
    for (let i = active; i < 10; i++) {
      secrets.add((await createMachineKey(pool, { ownerUserId: ids[OWNER_B], businessId: bizB, label: `k${i}`, scopes: ['order_events'] })).key);
    }
    await expect(createMachineKey(pool, { ownerUserId: ids[OWNER_B], businessId: bizB, label: 'once', scopes: ['order_events'] })).rejects.toMatchObject({ reason: 'too_many_keys' });
  });
});

describe('credential leakage', () => {
  it('keeps keys, their hashes and authorization headers out of logs and pages', async () => {
    const logs = [app, spike].map((s) => s.logs()).join('\n');
    expect(secrets.size).toBeGreaterThan(8);
    for (const s of secrets) {
      expect(logs).not.toContain(s);
      expect(logs).not.toContain(hashSecret(s));
    }
    expect(logs).not.toMatch(/Bearer|opk_/);
    const page = await (await fetch(`${app.origin}/cuenta/negocios/${bizA}`, { headers: { cookie: cookies[OWNER_A], RSC: '1' } })).text();
    for (const s of secrets) expect(page).not.toContain(s);
  });
});

/** Desktop and mobile screenshots of the key screen, only when E2E_SCREENSHOTS_DIR is set. Keys shown are from this throwaway database. */
describe.runIf(process.env.E2E_SCREENSHOTS_DIR)('screenshots', () => {
  it('captures a new key shown once, and the list after a reload', async () => {
    const dir = process.env.E2E_SCREENSHOTS_DIR!;
    mkdirSync(dir, { recursive: true });
    await db.client.query("UPDATE business_machine_keys SET revoked_at = now(), revoked_by_user_id = $1 WHERE business_id = $2 AND label IN ('carrera', 'otra')", [ids[OWNER_A], bizA]);
    for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      const context = await browser.newContext({ viewport });
      await context.addCookies([{ name: 'authjs.session-token', value: cookies[OWNER_A].split('=')[1], url: browserOrigin }]);
      const page = await context.newPage();
      await page.goto(`${browserOrigin}/cuenta/negocios/${bizA}`);
      await page.getByLabel('Nombre de la clave').fill(`Caja ${name}`);
      await page.getByLabel('Crear invitaciones a opinar').check();
      await page.getByRole('button', { name: 'Crear clave' }).click();
      await page.getByTestId('new-key-value').waitFor();
      await page.getByTestId('keys').screenshot({ path: path.join(dir, `b05-key-created-${name}.png`) });
      await page.goto(`${browserOrigin}/cuenta/negocios/${bizA}`); // a fresh load: the secret is gone
      expect(await page.content()).not.toContain('data-testid="new-key"');
      await page.screenshot({ path: path.join(dir, `b05-keys-after-reload-${name}.png`), fullPage: true });
      await context.close();
    }
  });
});

