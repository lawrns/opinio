/**
 * B04 (issue #30): an owner invites scoped staff, removes them, and only an
 * administrator-approved transfer changes ownership. Built standalone app,
 * throwaway Postgres, captured SMTP; module-level checks share the database.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { grantAdministrator } from '../../../scripts/grant-admin.mjs';
import { AccessDenied, Unauthenticated, authorizeMachineKey } from '@/lib/authz';
import { approveFirstOwner, approveOwnershipTransfer, type FirstOwnerApproval } from '@/lib/authz/owners';
import { STAFF_INVITATION_TTL_MS } from '@/lib/authz/policy';
import { generateMachineKey, hashSecret } from '@/lib/authz/secrets';
import { StaffRejected, acceptStaffInvitation, createStaffInvitation, removeStaffMembership } from '@/lib/authz/staff';
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
const OWNER = 'owner-a@example.test';
const STAFF = 'staff-a@example.test';
const OTHER = 'intruso@example.test';
const NEW_OWNER = 'nuevo-owner@example.test';
const OWNER_B = 'owner-b@example.test';

let db: TestDatabase;
let pool: Pool;
let mail: MailSink;
let app: AppServer;
const secrets = new Set<string>();
const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let bizA = 0;
let bizB = 0;
let clientCounter = 0;
let browserOrigin = '';

const client = () => ({ 'x-forwarded-for': `198.51.100.${++clientCounter % 250}` });

async function actionIds(path: string, cookie = ''): Promise<string[]> {
  const html = await (await fetch(`${app.origin}${path}`, { headers: cookie ? { cookie } : {} })).text();
  return [...html.matchAll(/name="\$ACTION_ID_([0-9a-f]+)"/g)].map((m) => m[1]);
}

/** Submits a server-action form as a browser without JS would. */
function submit(path: string, id: string, fields: Record<string, string>, cookie = '') {
  const form = new FormData();
  form.set(`$ACTION_ID_${id}`, '');
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return fetch(`${app.origin}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: app.origin, ...client(), ...(cookie ? { cookie } : {}) },
    body: form,
  });
}

/** Full merchant login through the captured email; returns the session cookie. */
async function login(email: string): Promise<string> {
  const since = mail.messages.length;
  await submit('/acceso', (await actionIds('/acceso'))[0], { email });
  const message = await mail.waitFor(email, since);
  const fragment = new URL(message.text.match(/https?:\/\/\S+\/acceso\/confirmar#\S+/)![0]).hash.slice(1);
  const params = new URLSearchParams(fragment);
  secrets.add(params.get('token')!);
  const form = new FormData();
  form.set('token', params.get('token')!);
  form.set('email', params.get('email')!);
  const res = await fetch(`${app.origin}/acceso/confirmar/entrar`, {
    method: 'POST',
    redirect: 'manual',
    headers: { origin: app.origin },
    body: form,
  });
  const jar = new CookieJar();
  jar.store(res);
  const session = jar.get('authjs.session-token')!;
  secrets.add(session);
  const userId = (await db.client.query('SELECT id FROM users WHERE email = $1', [email])).rows[0].id;
  ids[email] = userId;
  return `authjs.session-token=${session}`;
}

const get = (path: string, cookie = '') =>
  fetch(`${app.origin}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });

/** The owner invites `email` through the business page; returns the emailed token. */
async function inviteByHttp(ownerCookie: string, businessId: number, email: string): Promise<{ res: Response; token?: string }> {
  const page = `/cuenta/negocios/${businessId}`;
  const [inviteId] = (await actionIds(page, ownerCookie)).slice(-1);
  const since = mail.messages.length;
  const res = await submit(page, inviteId, { businessId: String(businessId), email }, ownerCookie);
  const outcome = new URL(res.headers.get('location') ?? '/', app.origin).searchParams.get('equipo');
  if (outcome !== 'invitado') return { res };
  const message = await mail.waitFor(email, since);
  const token = new URLSearchParams(new URL(message.text.match(/https?:\/\/\S+\/cuenta\/invitacion#\S+/)![0]).hash.slice(1)).get('token')!;
  secrets.add(token);
  return { res, token };
}

/** What the invitation page's button posts. */
function accept(token: string, cookie: string, headers: Record<string, string> = { origin: app.origin }) {
  const form = new FormData();
  form.set('token', token);
  return fetch(`${app.origin}/cuenta/invitacion/aceptar`, { method: 'POST', redirect: 'manual', headers: { ...headers, cookie }, body: form });
}

const location = (res: Response) => new URL(res.headers.get('location') ?? '/', app.origin);
const activeMembership = async (businessId: number, email: string) =>
  (
    await db.client.query(
      `SELECT m.role FROM business_memberships m JOIN users u ON u.id = m.user_id
        WHERE m.business_id = $1 AND u.email = $2 AND m.status = 'active'`,
      [businessId, email],
    )
  ).rows.map((r) => r.role);

const approval = (businessId: number, applicantEmail: string, reference: string): FirstOwnerApproval => ({
  businessId,
  applicantEmail,
  evidenceMethod: 'dns',
  evidenceSubject: 'tienda.example',
  authorityBasis: 'legal_representative',
  evidenceReference: reference,
});

beforeAll(async () => {
  [db, mail] = await Promise.all([startDatabase(['src/lib/schema.sql'], { migrate: true }), startMailSink()]);
  pool = new Pool({ connectionString: db.url, max: 6 });
  bizA = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-a', 'Tienda A') RETURNING id")).rows[0].id;
  bizB = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-b', 'Tienda B') RETURNING id")).rows[0].id;
  const serverJs = buildApp('.next-e2e');
  const port = await freePort();
  browserOrigin = `http://localhost:${port}`;
  app = await startApp(
    serverJs,
    {
      DATABASE_URL: db.url,
      AUTH_SECRET: 'b04-test-secret-not-real',
      AUTH_EMAIL_SERVER: mail.url,
      AUTH_EMAIL_FROM: 'Opinio <acceso@opinio.test>',
      OPINIO_MERCHANT_AUTH: '1',
      AUTH_URL: `http://localhost:${port}`,
    },
    port,
  );

  for (const email of [ADMIN, OWNER, STAFF, OTHER, NEW_OWNER, OWNER_B]) cookies[email] = await login(email);
  expect(await grantAdministrator(db.client, ADMIN)).toBe('granted');
  await approveFirstOwner(pool, ids[ADMIN], approval(bizA, OWNER, 'VER-401'));
  await approveFirstOwner(pool, ids[ADMIN], approval(bizB, OWNER_B, 'VER-402'));
}, 300_000);

afterAll(async () => {
  await app?.stop();
  await pool?.end();
  await mail?.stop();
  await db?.stop();
});

describe('staff invitation (ticket verification)', () => {
  it('owner invites staff to A; staff accepts once, sees A only, loses access when removed', async () => {
    const { res, token } = await inviteByHttp(cookies[OWNER], bizA, STAFF);
    expect(location(res).searchParams.get('equipo')).toBe('invitado');
    const message = mail.messages.at(-1)!;
    expect(message.text).not.toMatch(/Tienda|owner-a@/);
    expect(message.text).toMatch(/\/cuenta\/invitacion#token=/);

    // Cross-site and missing-origin posts accept nothing.
    for (const headers of [{ origin: 'https://evil.example' }, { origin: 'null', 'sec-fetch-site': 'cross-site' }, {}]) {
      const r = await accept(token!, cookies[STAFF], headers as Record<string, string>);
      expect(location(r).searchParams.get('resultado'), JSON.stringify(headers)).toBe('invalid_invitation');
    }
    expect(await activeMembership(bizA, STAFF)).toEqual([]);

    const accepted = await accept(token!, cookies[STAFF]);
    expect(location(accepted).pathname).toBe(`/cuenta/negocios/${bizA}`);
    expect(await activeMembership(bizA, STAFF)).toEqual(['staff']);
    const page = await (await get(`/cuenta/negocios/${bizA}`, cookies[STAFF])).text();
    expect(page).toContain('Equipo');
    expect(page).not.toContain('data-testid="team"'); // staff see no team management
    expect((await get(`/cuenta/negocios/${bizB}`, cookies[STAFF])).status).toBe(404);

    // Single use: a replay grants nothing more.
    expect(location(await accept(token!, cookies[STAFF])).searchParams.get('resultado')).toBe('invalid_invitation');

    const membershipId = (await db.client.query('SELECT id FROM business_memberships WHERE user_id = $1 AND status = $2', [ids[STAFF], 'active'])).rows[0].id;
    const page2 = `/cuenta/negocios/${bizA}`;
    const actions = await actionIds(page2, cookies[OWNER]);
    // remove is the first form on the owner's page (the staff row), invite is last
    const removed = await submit(page2, actions[0], { businessId: String(bizA), membershipId: String(membershipId) }, cookies[OWNER]);
    expect(location(removed).searchParams.get('equipo')).toBe('removido');
    expect((await get(`/cuenta/negocios/${bizA}`, cookies[STAFF])).status).toBe(404);
    expect(await (await get('/cuenta', cookies[STAFF])).text()).toContain('data-testid="access-pending"');
  });

  it('rejects the wrong identity, forwarding and revoked or expired invitations', async () => {
    const { token } = await inviteByHttp(cookies[OWNER], bizA, STAFF);
    // Forwarded to someone else: their login email does not match.
    expect(location(await accept(token!, cookies[OTHER])).searchParams.get('resultado')).toBe('wrong_identity');
    expect(await activeMembership(bizA, OTHER)).toEqual([]);

    // Revoked by the owner.
    const invitationId = (await db.client.query('SELECT id FROM staff_invitations WHERE token_hash = $1', [hashSecret(token!)])).rows[0].id;
    const page = `/cuenta/negocios/${bizA}`;
    const actions = await actionIds(page, cookies[OWNER]);
    // forms: [revoke pending invitation, invite]
    const revoked = await submit(page, actions[0], { businessId: String(bizA), invitationId: String(invitationId) }, cookies[OWNER]);
    expect(location(revoked).searchParams.get('equipo')).toBe('invitacion_retirada');
    expect(location(await accept(token!, cookies[STAFF])).searchParams.get('resultado')).toBe('invalid_invitation');

    // Expired: invalid at the exact expiry instant, valid a millisecond before.
    const issued = new Date('2026-10-17T12:00:00.000Z');
    const expiring = await createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: STAFF }, issued);
    secrets.add(expiring.token);
    const at = new Date(issued.valueOf() + STAFF_INVITATION_TTL_MS);
    await expect(acceptStaffInvitation(pool, { userId: ids[STAFF], token: expiring.token }, at)).rejects.toMatchObject({
      reason: 'invalid_invitation',
    });
    const fresh = await createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: STAFF }, issued);
    secrets.add(fresh.token);
    await acceptStaffInvitation(pool, { userId: ids[STAFF], token: fresh.token }, new Date(at.valueOf() - 1));
    expect(await activeMembership(bizA, STAFF)).toEqual(['staff']);
    // The replaced invitation (same address) no longer works.
    await expect(acceptStaffInvitation(pool, { userId: ids[STAFF], token: expiring.token }, issued)).rejects.toBeInstanceOf(StaffRejected);
  });

  it('keeps invitation, removal and role control with the owner', async () => {
    const staffMembership = (await db.client.query("SELECT id FROM business_memberships WHERE user_id = $1 AND status = 'active'", [ids[STAFF]])).rows[0].id;
    const ownerMembership = (await db.client.query("SELECT id FROM business_memberships WHERE user_id = $1 AND status = 'active'", [ids[OWNER]])).rows[0].id;
    const before = Number((await db.client.query('SELECT count(*) FROM staff_invitations')).rows[0].count);
    // Staff cannot invite, remove others or touch the owner.
    await expect(createStaffInvitation(pool, { ownerUserId: ids[STAFF], businessId: bizA, email: OTHER })).rejects.toBeInstanceOf(AccessDenied);
    await expect(removeStaffMembership(pool, { ownerUserId: ids[STAFF], membershipId: ownerMembership })).rejects.toBeInstanceOf(AccessDenied);
    // Over HTTP, a direct action call by staff changes nothing.
    const inviteId = (await actionIds(`/cuenta/negocios/${bizA}`, cookies[OWNER])).at(-1)!;
    await submit(`/cuenta/negocios/${bizA}`, inviteId, { businessId: String(bizA), email: OTHER }, cookies[STAFF]);
    // Another business's owner cannot act on A.
    await expect(createStaffInvitation(pool, { ownerUserId: ids[OWNER_B], businessId: bizA, email: OTHER })).rejects.toBeInstanceOf(AccessDenied);
    await expect(removeStaffMembership(pool, { ownerUserId: ids[OWNER_B], membershipId: staffMembership })).rejects.toBeInstanceOf(AccessDenied);
    expect(Number((await db.client.query('SELECT count(*) FROM staff_invitations')).rows[0].count)).toBe(before);
    // The owner cannot remove the owner (no orphaned control), nor invite an existing member.
    await expect(removeStaffMembership(pool, { ownerUserId: ids[OWNER], membershipId: ownerMembership })).rejects.toMatchObject({ reason: 'not_staff' });
    await expect(createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: OWNER })).rejects.toMatchObject({ reason: 'already_member' });
    await expect(createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: STAFF })).rejects.toMatchObject({ reason: 'already_member' });
    // Signed out: nothing.
    await expect(createStaffInvitation(pool, { ownerUserId: null, businessId: bizA, email: OTHER })).rejects.toBeInstanceOf(Unauthenticated);
    expect(await activeMembership(bizA, OWNER)).toEqual(['owner']);
  });
});

describe('concurrency', () => {
  it('accepts a raced invitation exactly once', async () => {
    const inv = await createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: OTHER });
    secrets.add(inv.token);
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => acceptStaffInvitation(pool, { userId: ids[OTHER], token: inv.token })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await activeMembership(bizA, OTHER)).toEqual(['staff']);
    const audits = (await db.client.query("SELECT count(*)::int AS n FROM audit_logs WHERE action = 'staff_invitation.accepted' AND details->>'invitation_id' = $1", [String(inv.invitationId)])).rows[0].n;
    expect(audits).toBe(1);
  });

  it('keeps one pending invitation per address under concurrent invites', async () => {
    const email = 'carrera@example.test';
    const made = await Promise.allSettled(
      Array.from({ length: 3 }, () => createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email })),
    );
    made.forEach((r) => r.status === 'fulfilled' && secrets.add(r.value.token));
    const pending = (await db.client.query('SELECT count(*)::int AS n FROM staff_invitations WHERE email = $1 AND accepted_at IS NULL AND revoked_at IS NULL', [email])).rows[0].n;
    expect(pending).toBe(1);
  });
});

describe('approved transfer', () => {
  it('only an administrator transfers; it ends every old authority of A and nothing of B', async () => {
    // Outstanding authority on A: owner, two staff (STAFF, OTHER), a pending invitation and a machine key.
    const pending = await createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: 'pendiente@example.test' });
    secrets.add(pending.token);
    const { key, prefix } = generateMachineKey();
    secrets.add(key);
    await db.client.query(
      "INSERT INTO business_machine_keys (business_id, label, key_prefix, key_hash, scopes, created_by_user_id) VALUES ($1, 'k', $2, $3, ARRAY['order_events'], $4)",
      [bizA, prefix, hashSecret(key), ids[OWNER]],
    );
    const raced = await createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: NEW_OWNER });
    secrets.add(raced.token);

    // Non-administrators cannot transfer.
    for (const who of [OWNER, STAFF, OWNER_B]) {
      await expect(approveOwnershipTransfer(pool, ids[who], approval(bizA, NEW_OWNER, 'VER-403'))).rejects.toBeInstanceOf(AccessDenied);
    }

    // The administrator approves through the admin form while the new owner races to accept an old invitation.
    const [approveId] = await actionIds('/admin/aprobaciones', cookies[ADMIN]);
    const [transfer, raceAccept] = await Promise.all([
      submit('/admin/aprobaciones', approveId, { kind: 'transfer', businessSlug: 'tienda-a', applicantEmail: NEW_OWNER, evidenceMethod: 'business_callback', evidenceSubject: '+525550000401', authorityBasis: 'written_authorization', evidenceReference: 'VER-404' }, cookies[ADMIN]),
      acceptStaffInvitation(pool, { userId: ids[NEW_OWNER], token: raced.token }).then(() => 'accepted', (e) => e.reason),
    ]);
    expect(location(transfer).searchParams.get('resultado')).toBe('transferido');
    expect(['accepted', 'invalid_invitation']).toContain(raceAccept);
    // Whichever ran first, the new owner holds exactly one membership on A: owner.
    expect(await activeMembership(bizA, NEW_OWNER)).toEqual(['owner']);

    // Old authority ends on the next request.
    for (const who of [OWNER, STAFF, OTHER]) {
      expect((await get(`/cuenta/negocios/${bizA}`, cookies[who])).status, who).toBe(404);
      expect(await activeMembership(bizA, who), who).toEqual([]);
    }
    await expect(acceptStaffInvitation(pool, { userId: ids[NEW_OWNER], token: pending.token })).rejects.toMatchObject({ reason: 'invalid_invitation' });
    await expect(authorizeMachineKey(pool, { key, scope: 'order_events' })).rejects.toBeInstanceOf(Unauthenticated);
    // The removed owner cannot reinvite themself or anyone.
    await expect(createStaffInvitation(pool, { ownerUserId: ids[OWNER], businessId: bizA, email: OWNER })).rejects.toBeInstanceOf(AccessDenied);
    // B is untouched.
    expect(await activeMembership(bizB, OWNER_B)).toEqual(['owner']);
    expect((await get(`/cuenta/negocios/${bizB}`, cookies[OWNER_B])).status).toBe(200);
    // The new owner manages A's (now empty) team.
    expect(await (await get(`/cuenta/negocios/${bizA}`, cookies[NEW_OWNER])).text()).toContain('data-testid="team"');

    // Recorded and auditable.
    const [row] = (await db.client.query("SELECT * FROM ownership_approvals WHERE kind = 'transfer'")).rows;
    expect(row).toMatchObject({ business_id: bizA, subject_user_id: ids[NEW_OWNER], previous_owner_user_id: ids[OWNER], approved_by_user_id: ids[ADMIN], evidence_subject: '+525550000401' });
    const old = (await db.client.query("SELECT revoked_by_user_id FROM ownership_approvals WHERE business_id = $1 AND kind = 'first_owner'", [bizA])).rows;
    expect(old).toEqual([{ revoked_by_user_id: ids[ADMIN] }]);
    const [audit] = (await db.client.query("SELECT actor_type, details FROM audit_logs WHERE action = 'ownership.transferred'")).rows;
    expect(audit.actor_type).toBe('administrator');
    expect(audit.details).toMatchObject({ previous_owner_user_id: ids[OWNER], revoked_keys: 1 });
    expect(JSON.stringify(audit)).not.toContain('@');
  });

  it('rejects transfers that would orphan or duplicate control', async () => {
    await expect(approveOwnershipTransfer(pool, ids[ADMIN], approval(bizA, NEW_OWNER, 'VER-405'))).rejects.toMatchObject({ reason: 'already_owner' });
    await expect(approveOwnershipTransfer(pool, ids[ADMIN], approval(bizA, ADMIN, 'VER-406'))).rejects.toMatchObject({ reason: 'self_approval' });
    const empty = (await db.client.query("INSERT INTO businesses (slug, brand_name) VALUES ('tienda-c', 'Tienda C') RETURNING id")).rows[0].id;
    await expect(approveOwnershipTransfer(pool, ids[ADMIN], approval(empty, OTHER, 'VER-407'))).rejects.toMatchObject({ reason: 'no_current_owner' });
  });
});

describe('credential leakage', () => {
  it('keeps invitation tokens out of pages, payloads and logs', async () => {
    const inv = await createStaffInvitation(pool, { ownerUserId: ids[NEW_OWNER], businessId: bizA, email: 'payload@example.test' });
    secrets.add(inv.token);
    for (const [path, headers] of [
      ['/cuenta/invitacion', {}],
      ['/cuenta/invitacion', { RSC: '1' }],
      ['/cuenta/invitacion?resultado=invalid_invitation', {}],
      [`/cuenta/negocios/${bizA}`, { cookie: cookies[NEW_OWNER] }],
      [`/cuenta/negocios/${bizA}`, { cookie: cookies[NEW_OWNER], RSC: '1' }],
    ] as [string, Record<string, string>][]) {
      const body = await (await fetch(`${app.origin}${path}`, { headers })).text();
      expect(body, path).not.toContain(inv.token);
      expect(body, path).not.toContain(hashSecret(inv.token));
    }
    const logs = app.logs();
    for (const s of secrets) {
      expect(logs).not.toContain(s);
      expect(logs).not.toContain(hashSecret(s));
    }
    for (const email of [ADMIN, OWNER, STAFF, OTHER, NEW_OWNER, OWNER_B]) expect(logs).not.toContain(email);
  });
});

/** Desktop and mobile screenshots of the changed screens, only when E2E_SCREENSHOTS_DIR is set. */
describe.runIf(process.env.E2E_SCREENSHOTS_DIR)('screenshots', () => {
  it('captures the owner team screen and the invitation page', async () => {
    const dir = process.env.E2E_SCREENSHOTS_DIR!;
    mkdirSync(dir, { recursive: true });
    const invite = await createStaffInvitation(pool, { ownerUserId: ids[NEW_OWNER], businessId: bizA, email: STAFF });
    secrets.add(invite.token);
    const browser = await chromium.launch();
    for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      const context = await browser.newContext({ viewport });
      const session = (who: string) => ({ name: 'authjs.session-token', value: cookies[who].split('=')[1], url: browserOrigin });
      await context.addCookies([session(NEW_OWNER)]);
      const page = await context.newPage();
      await page.goto(`${browserOrigin}/cuenta/negocios/${bizA}`);
      await page.screenshot({ path: path.join(dir, `b04-team-${name}.png`), fullPage: true });
      await context.clearCookies();
      await context.addCookies([session(STAFF)]);
      await page.goto(`${browserOrigin}/cuenta/invitacion#token=${invite.token}`);
      await page.getByRole('button', { name: 'Aceptar la invitación' }).waitFor();
      expect(page.url()).toBe(`${browserOrigin}/cuenta/invitacion`); // token stripped from the address bar
      await page.screenshot({ path: path.join(dir, `b04-invitation-${name}.png`), fullPage: true });
      await context.close();
    }
    await browser.close();
  });
});

