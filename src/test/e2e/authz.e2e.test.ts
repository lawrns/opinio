/**
 * B02 (issue #28): the authorization module verifies or denies buyer case
 * sessions, merchant business roles and machine-key scopes against a real
 * Postgres, and the protected test surfaces deny missing, wrong and revoked
 * identities before any private read or write (checked in the server's
 * statement log).
 */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AccessDenied,
  AuthorityUnavailable,
  Unauthenticated,
  authorizeCaseSession,
  authorizeMachineKey,
  authorizeMerchant,
  listMemberBusinesses,
  recordAuditEvent,
  type BusinessPermission,
  type BusinessResource,
} from '@/lib/authz';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { generateMachineKey, generateSecret, hashSecret } from '@/lib/authz/secrets';
import { buildApp, startApp, startDatabase, type AppServer, type TestDatabase } from './harness';

const BUYER_NAME = 'SENTINEL_BUYER_NAME_A1';

let db: TestDatabase;
let app: AppServer;
let off: AppServer;
const servers: AppServer[] = [];

/** Synthetic world: two businesses, their people, cases, keys and sessions. */
const f = {
  bizA: 0, bizB: 0,
  admin: 0, ownerA: 0, staffA: 0, ownerB: 0, pending: 0, revokedA: 0,
  staffAMembership: 0,
  caseA: 0, caseB: 0,
  reviewB: 0, orderB: 0, invitationB: 0, widgetB: 0,
  cookies: {} as Record<'ownerA' | 'staffA' | 'ownerB' | 'pending' | 'revokedA', string>,
  caseSession: '', expiredCaseSession: '', revokedCaseSession: '',
  caseSessionExpiresAt: new Date(),
  keyA: '', keyAInvitationsOnly: '', keyRevoked: '', keyAId: 0,
};

async function one<T>(sql: string, params: unknown[] = []): Promise<T> {
  return (await db.client.query(sql, params)).rows[0] as T;
}

async function seed() {
  const c = db.client;
  f.bizA = (await one<{ id: number }>("INSERT INTO businesses (slug, brand_name, claimed) VALUES ('tienda-a', 'Tienda A', true) RETURNING id")).id;
  f.bizB = (await one<{ id: number }>("INSERT INTO businesses (slug, brand_name, claimed) VALUES ('tienda-b', 'Tienda B', true) RETURNING id")).id;
  const user = async (email: string) => (await one<{ id: number }>('INSERT INTO users (email) VALUES ($1) RETURNING id', [email])).id;
  f.admin = await user('admin@example.test');
  f.ownerA = await user('owner-a@example.test');
  f.staffA = await user('staff-a@example.test');
  f.ownerB = await user('owner-b@example.test');
  f.pending = await user('pending@example.test');
  f.revokedA = await user('revoked-a@example.test');

  const owner = async (businessId: number, userId: number) => {
    const approval = await one<{ id: number }>(
      `INSERT INTO ownership_approvals (business_id, subject_user_id, kind, evidence_method, approved_by_user_id)
       VALUES ($1, $2, 'first_owner', 'dns', $3) RETURNING id`,
      [businessId, userId, f.admin],
    );
    await c.query(
      "INSERT INTO business_memberships (business_id, user_id, role, approval_id) VALUES ($1, $2, 'owner', $3)",
      [businessId, userId, approval.id],
    );
  };
  await owner(f.bizA, f.ownerA);
  await owner(f.bizB, f.ownerB);
  f.staffAMembership = (await one<{ id: number }>(
    "INSERT INTO business_memberships (business_id, user_id, role, granted_by_user_id) VALUES ($1, $2, 'staff', $3) RETURNING id",
    [f.bizA, f.staffA, f.ownerA],
  )).id;
  await c.query(
    "INSERT INTO business_memberships (business_id, user_id, role, granted_by_user_id, status, revoked_at) VALUES ($1, $2, 'staff', $3, 'revoked', now())",
    [f.bizA, f.revokedA, f.ownerA],
  );

  // Merchant database sessions, stored hashed exactly as strictAdapter does.
  for (const name of ['ownerA', 'staffA', 'ownerB', 'pending', 'revokedA'] as const) {
    const raw = randomBytes(32).toString('hex');
    await c.query(`INSERT INTO sessions ("userId", expires, "sessionToken") VALUES ($1, now() + interval '7 days', $2)`, [
      f[name],
      hashSecret(raw),
    ]);
    f.cookies[name] = `authjs.session-token=${raw}`;
  }

  const kase = async (businessId: number, n: string, name: string) =>
    (await one<{ id: number }>(
      `INSERT INTO resolution_cases (business_id, case_number, customer_name, customer_contact, issue_category, customer_requested_remedy)
       VALUES ($1, $2, $3, 'buyer@example.test', 'delay', 'refund') RETURNING id`,
      [businessId, n, name],
    )).id;
  f.caseA = await kase(f.bizA, 'OP-A-1', BUYER_NAME);
  f.caseB = await kase(f.bizB, 'OP-B-1', 'Comprador B');
  f.reviewB = (await one<{ id: number }>("INSERT INTO reviews (business_id, rating, body, author_name) VALUES ($1, 5, 'ok', 'x') RETURNING id", [f.bizB])).id;
  f.orderB = (await one<{ id: number }>("INSERT INTO orders (business_id, external_order_id) VALUES ($1, 'B-1') RETURNING id", [f.bizB])).id;
  f.invitationB = (await one<{ id: number }>("INSERT INTO invitations (business_id, token, recipient_target) VALUES ($1, 'inv_b', 'b@example.test') RETURNING id", [f.bizB])).id;
  f.widgetB = (await one<{ id: number }>("INSERT INTO widgets (business_id, token) VALUES ($1, 'wgt_b') RETURNING id", [f.bizB])).id;

  const caseSession = async (caseId: number, expires: string, revoked: boolean) => {
    const raw = generateSecret();
    const row = await one<{ expires_at: Date }>(
      `INSERT INTO case_sessions (case_id, session_hash, expires_at, revoked_at)
       VALUES ($1, $2, ${expires}, ${revoked ? 'now()' : 'NULL'}) RETURNING expires_at`,
      [caseId, hashSecret(raw)],
    );
    return { raw, expiresAt: row.expires_at };
  };
  // Millisecond precision so a JS Date can name the exact expiry instant.
  const valid = await caseSession(f.caseA, "date_trunc('milliseconds', now() + interval '7 days')", false);
  f.caseSession = valid.raw;
  f.caseSessionExpiresAt = valid.expiresAt;
  f.expiredCaseSession = (await caseSession(f.caseA, "now() - interval '1 second'", false)).raw;
  f.revokedCaseSession = (await caseSession(f.caseA, "now() + interval '7 days'", true)).raw;

  const key = async (businessId: number, scopes: string[], revoked: boolean) => {
    const { key: raw, prefix } = generateMachineKey();
    const row = await one<{ id: number }>(
      `INSERT INTO business_machine_keys (business_id, label, key_prefix, key_hash, scopes, created_by_user_id, revoked_at)
       VALUES ($1, 'test', $2, $3, $4, $5, ${revoked ? 'now()' : 'NULL'}) RETURNING id`,
      [businessId, prefix, hashSecret(raw), scopes, f.ownerA],
    );
    return { raw, id: row.id };
  };
  const a = await key(f.bizA, ['order_events'], false);
  f.keyA = a.raw;
  f.keyAId = a.id;
  f.keyAInvitationsOnly = (await key(f.bizA, ['invitations'], false)).raw;
  f.keyRevoked = (await key(f.bizA, ['order_events'], true)).raw;
}

const auditCount = async () => Number((await one<{ n: string }>('SELECT count(*) AS n FROM audit_logs')).n);

/**
 * Statements the server ran while `fn` executed, bracketed by two marker
 * queries: the window closes only once the end marker is in the log, so no
 * fixed wait decides what is seen.
 */
async function statementsDuring(fn: () => Promise<unknown>): Promise<string[]> {
  const id = randomBytes(6).toString('hex');
  const [start, end] = [`authz_window_start_${id}`, `authz_window_end_${id}`];
  await db.client.query(`SELECT '${start}'`);
  await fn();
  await db.client.query(`SELECT '${end}'`);
  for (let i = 0; i < 250 && !db.statements().some((s) => s.includes(end)); i++) {
    await new Promise((r) => setTimeout(r, 20));
  }
  const all = db.statements();
  const from = all.findIndex((s) => s.includes(start));
  const to = all.findIndex((s) => s.includes(end));
  if (from < 0 || to < from) throw new Error(`statement log markers missing for window ${id}`);
  return all.slice(from + 1, to);
}

const touchesPrivateData = (statements: string[]) =>
  statements.some((s) => /resolution_cases|INSERT INTO audit_logs/i.test(s) && !/SELECT business_id FROM resolution_cases/.test(s));

beforeAll(async () => {
  db = await startDatabase(['src/lib/schema.sql'], { migrate: true, logStatements: true });
  await seed();
  const serverJs = buildApp('.next-e2e');
  app = await startApp(serverJs, { DATABASE_URL: db.url, AUTH_SECRET: 'b02-test-secret-not-real', AUTH_URL: 'http://localhost', OPINIO_AUTH_SPIKE: '1' });
  off = await startApp(serverJs, { DATABASE_URL: db.url, AUTH_SECRET: 'b02-test-secret-not-real' });
  servers.push(app, off);
}, 300_000);

afterAll(async () => {
  await Promise.all(servers.map((s) => s.stop()));
  await db?.stop();
});

describe('authorizeMerchant (module, real Postgres)', () => {
  it('grants owners and staff their own business only', async () => {
    const a = await authorizeMerchant(db.client, { userId: f.ownerA, resource: { kind: 'business', id: f.bizA }, permission: 'manage_keys' });
    expect(a).toMatchObject({ businessId: f.bizA, role: 'owner' });
    const s = await authorizeMerchant(db.client, { userId: f.staffA, resource: { kind: 'case', id: f.caseA }, permission: 'offer_remedy' });
    expect(s).toMatchObject({ businessId: f.bizA, role: 'staff' });
    await expect(
      authorizeMerchant(db.client, { userId: f.ownerA, resource: { kind: 'business_slug', slug: 'tienda-b' }, permission: 'read_operational' }),
    ).rejects.toBeInstanceOf(AccessDenied);
  });

  it('resolves every resource kind from its stored business, not the request', async () => {
    const resources: BusinessResource[] = [
      { kind: 'case', id: f.caseB },
      { kind: 'review', id: f.reviewB },
      { kind: 'order', id: f.orderB },
      { kind: 'invitation', id: f.invitationB },
      { kind: 'widget', id: f.widgetB },
    ];
    for (const resource of resources) {
      await expect(
        authorizeMerchant(db.client, { userId: f.ownerA, resource, permission: 'read_operational' }),
        resource.kind,
      ).rejects.toBeInstanceOf(AccessDenied);
      await expect(
        authorizeMerchant(db.client, { userId: f.ownerB, resource, permission: 'read_operational' }),
      ).resolves.toMatchObject({ businessId: f.bizB });
    }
  });

  it('denies a missing resource exactly like another business’s resource', async () => {
    for (const resource of [
      { kind: 'case', id: 999_999 },
      { kind: 'case', id: Number.NaN },
      { kind: 'case', id: -1 },
      { kind: 'business_slug', slug: 'no-such-business' },
    ] as BusinessResource[]) {
      await expect(authorizeMerchant(db.client, { userId: f.ownerA, resource, permission: 'read_operational' })).rejects.toBeInstanceOf(
        AccessDenied,
      );
    }
  });

  it('keeps owner-only permissions from staff', async () => {
    const ownerOnly: BusinessPermission[] = ['manage_settings', 'manage_widgets', 'manage_staff', 'manage_keys'];
    for (const permission of ownerOnly) {
      await expect(
        authorizeMerchant(db.client, { userId: f.staffA, resource: { kind: 'business', id: f.bizA }, permission }),
        permission,
      ).rejects.toBeInstanceOf(AccessDenied);
    }
    for (const permission of ['read_operational', 'reply', 'offer_remedy', 'create_invitation'] as BusinessPermission[]) {
      await expect(authorizeMerchant(db.client, { userId: f.staffA, resource: { kind: 'business', id: f.bizA }, permission })).resolves.toBeTruthy();
    }
  });

  it('denies pending identities, revoked members and missing users', async () => {
    for (const userId of [f.pending, f.revokedA]) {
      await expect(authorizeMerchant(db.client, { userId, resource: { kind: 'business', id: f.bizA }, permission: 'read_operational' })).rejects.toBeInstanceOf(
        AccessDenied,
      );
    }
    for (const userId of [null, undefined, 0, Number.NaN]) {
      await expect(authorizeMerchant(db.client, { userId, resource: { kind: 'business', id: f.bizA }, permission: 'read_operational' })).rejects.toBeInstanceOf(
        Unauthenticated,
      );
    }
  });

  it('lists only active memberships for the business selector', async () => {
    expect(await listMemberBusinesses(db.client, f.ownerA)).toEqual([{ businessId: f.bizA, slug: 'tienda-a', role: 'owner' }]);
    expect(await listMemberBusinesses(db.client, f.revokedA)).toEqual([]);
    expect(await listMemberBusinesses(db.client, f.pending)).toEqual([]);
  });
});

describe('authorizeCaseSession (module)', () => {
  it('accepts a session for its own case only, until the expiry instant', async () => {
    await expect(authorizeCaseSession(db.client, { sessionToken: f.caseSession, caseId: f.caseA })).resolves.toMatchObject({ caseId: f.caseA });
    await expect(authorizeCaseSession(db.client, { sessionToken: f.caseSession, caseId: f.caseB })).rejects.toBeInstanceOf(Unauthenticated);
    const exp = f.caseSessionExpiresAt.valueOf();
    await expect(
      authorizeCaseSession(db.client, { sessionToken: f.caseSession, caseId: f.caseA }, new Date(exp - 1)),
    ).resolves.toBeTruthy();
    await expect(
      authorizeCaseSession(db.client, { sessionToken: f.caseSession, caseId: f.caseA }, new Date(exp)),
    ).rejects.toBeInstanceOf(Unauthenticated);
  });

  it('denies expired, revoked, stored-hash and missing tokens', async () => {
    for (const sessionToken of [f.expiredCaseSession, f.revokedCaseSession, hashSecret(f.caseSession), '', null]) {
      await expect(authorizeCaseSession(db.client, { sessionToken, caseId: f.caseA })).rejects.toBeInstanceOf(Unauthenticated);
    }
  });
});

describe('authorizeMachineKey (module)', () => {
  it('binds a key to its business and scopes', async () => {
    await expect(authorizeMachineKey(db.client, { key: f.keyA, scope: 'order_events' })).resolves.toEqual({
      type: 'machine_key',
      keyId: f.keyAId,
      businessId: f.bizA,
    });
    await expect(authorizeMachineKey(db.client, { key: f.keyA, scope: 'invitations' })).rejects.toBeInstanceOf(AccessDenied);
    await expect(authorizeMachineKey(db.client, { key: f.keyA, scope: 'order_events', claimedBusinessId: f.bizB })).rejects.toBeInstanceOf(
      AccessDenied,
    );
    await expect(authorizeMachineKey(db.client, { key: f.keyRevoked, scope: 'order_events' })).rejects.toBeInstanceOf(Unauthenticated);
  });
});

describe('audit and failure handling (module)', () => {
  it('records trusted actor IDs and controlled actions', async () => {
    await recordAuditEvent(db.client, {
      businessId: f.bizA,
      actor: { type: 'merchant_user', userId: f.ownerA },
      action: 'membership.granted',
      details: { membership_id: f.staffAMembership },
    });
    const row = await one<Record<string, unknown>>('SELECT actor, action, details, actor_type, actor_id FROM audit_logs ORDER BY id DESC LIMIT 1');
    expect(row).toEqual({
      actor: `merchant_user:${f.ownerA}`,
      action: 'membership.granted',
      details: { membership_id: f.staffAMembership },
      actor_type: 'merchant_user',
      actor_id: f.ownerA,
    });
  });

  it('turns database failures into a bare error without echoing values', async () => {
    const leaky = {
      query: async () => {
        throw Object.assign(new Error(`duplicate key (key_hash)=(${hashSecret(f.keyA)}) for owner-a@example.test`), { code: '23505' });
      },
    };
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => void logged.push(args.join(' ')));
    const error = await authorizeMachineKey(leaky, { key: f.keyA, scope: 'order_events' }).catch((e: unknown) => e);
    spy.mockRestore();
    expect(error).toBeInstanceOf(AuthorityUnavailable);
    const text = `${String(error)} ${logged.join(' ')}`;
    expect(text).toContain('23505');
    expect(text).not.toContain(hashSecret(f.keyA));
    expect(text).not.toContain('owner-a@example.test');
  });
});

describe('protected test surface over HTTP (built app)', () => {
  const business = (id: number | string, cookie = '', method = 'GET') =>
    fetch(`${app.origin}/api/spike/authz/businesses/${id}`, { method, headers: cookie ? { cookie } : {} });

  it('serves a member’s private read, non-cacheable', async () => {
    for (const who of ['ownerA', 'staffA'] as const) {
      const res = await business(f.bizA, f.cookies[who]);
      expect(res.status, who).toBe(200);
      expect(await res.json()).toMatchObject({ business_id: f.bizA, open_cases: 1 });
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
    // Positive control: the statement log does see the private read when access is granted.
    const statements = await statementsDuring(() => business(f.bizA, f.cookies.ownerA));
    expect(touchesPrivateData(statements)).toBe(true);
  });

  it('denies wrong, pending, revoked and missing identities before any private read', async () => {
    const cases: [string, number | string, string, number][] = [
      ['other business owner', f.bizA, f.cookies.ownerB, 404],
      ['pending identity', f.bizA, f.cookies.pending, 404],
      ['revoked member', f.bizA, f.cookies.revokedA, 404],
      ['no session', f.bizA, '', 401],
      ['tampered cookie', f.bizA, `${f.cookies.ownerA.slice(0, -2)}00`, 401],
      ['nonexistent business', 999_999, f.cookies.ownerA, 404],
      ['non-numeric id', 'tienda-a', f.cookies.ownerA, 404],
    ];
    for (const [label, id, cookie, status] of cases) {
      let res: Response | undefined;
      const statements = await statementsDuring(async () => {
        res = await business(id, cookie);
      });
      expect(res!.status, label).toBe(status);
      const body = await res!.text();
      expect(body, label).not.toContain('open_cases');
      expect(touchesPrivateData(statements), `${label}: ${statements.join(' / ')}`).toBe(false);
    }
  });

  it('allows the owner-only write to owners only, with no side effect on denial', async () => {
    for (const [who, status] of [['staffA', 404], ['ownerB', 404], ['pending', 404]] as const) {
      const before = await auditCount();
      const res = await business(f.bizA, f.cookies[who], 'POST');
      expect(res.status, who).toBe(status);
      expect(await auditCount(), who).toBe(before);
    }
    const before = await auditCount();
    expect((await business(f.bizA, f.cookies.ownerA, 'POST')).status).toBe(200);
    expect(await auditCount()).toBe(before + 1);
  });

  it('cuts access on the next request after a membership is revoked', async () => {
    expect((await business(f.bizA, f.cookies.staffA)).status).toBe(200);
    await db.client.query("UPDATE business_memberships SET status = 'revoked', revoked_at = now() WHERE id = $1", [f.staffAMembership]);
    expect((await business(f.bizA, f.cookies.staffA)).status).toBe(404);
  });

  it('serves a buyer’s private case read only with that case’s live session', async () => {
    const read = (caseId: number, raw: string) =>
      fetch(`${app.origin}/api/spike/authz/cases/${caseId}`, {
        headers: raw ? { cookie: `${caseSessionCookieName(caseId, false)}=${raw}` } : {},
      });
    const ok = await read(f.caseA, f.caseSession);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ id: f.caseA, customer_name: BUYER_NAME });

    for (const [label, caseId, raw] of [
      ['session for another case', f.caseB, f.caseSession],
      ['expired session', f.caseA, f.expiredCaseSession],
      ['revoked session', f.caseA, f.revokedCaseSession],
      ['no session', f.caseA, ''],
      ['merchant cookie value', f.caseA, f.cookies.ownerA.split('=')[1]],
    ] as const) {
      let res: Response | undefined;
      const statements = await statementsDuring(async () => {
        res = await read(caseId, raw);
      });
      expect(res!.status, label).toBe(401);
      expect(await res!.text(), label).not.toContain(BUYER_NAME);
      expect(touchesPrivateData(statements), label).toBe(false);
    }
  });

  it('accepts a machine key only for its business and scope, with no write on denial', async () => {
    const post = (key: string, body: unknown) =>
      fetch(`${app.origin}/api/spike/authz/order-events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify(body),
      });
    for (const [label, key, body, status] of [
      ['key for another business', f.keyA, { business_id: f.bizB }, 404],
      ['key without the scope', f.keyAInvitationsOnly, {}, 404],
      ['revoked key', f.keyRevoked, {}, 401],
      ['no key', '', {}, 401],
      ['unknown key', generateMachineKey().key, {}, 401],
      ['merchant session value as key', f.cookies.ownerA.split('=')[1], {}, 401],
    ] as const) {
      const before = await auditCount();
      const res = await post(key, body);
      expect(res.status, label).toBe(status);
      expect(await auditCount(), label).toBe(before);
    }
    const before = await auditCount();
    const res = await post(f.keyA, { business_id: f.bizA });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, business_id: f.bizA });
    expect(await auditCount()).toBe(before + 1);
  });

  it('answers a database outage with a bare 503', async () => {
    const down = await startApp(buildApp('.next-e2e'), {
      DATABASE_URL: 'postgres://opinio_test:SENTINEL_DB_PASSWORD@127.0.0.1:9/opinio_test',
      AUTH_SECRET: 'b02-test-secret-not-real',
      OPINIO_AUTH_SPIKE: '1',
    });
    servers.push(down);
    const res = await fetch(`${down.origin}/api/spike/authz/order-events`, {
      method: 'POST',
      headers: { authorization: `Bearer ${f.keyA}` },
      body: '{}',
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'unavailable' });

    // A merchant session that cannot be checked is an outage, not a sign-out.
    const merchant = await fetch(`${down.origin}/api/spike/authz/businesses/${f.bizA}`, {
      headers: { cookie: f.cookies.ownerA },
    });
    expect(merchant.status).toBe(503);
    expect(await merchant.json()).toEqual({ error: 'unavailable' });
    // With no session cookie there is nothing to check: still a plain 401.
    expect((await fetch(`${down.origin}/api/spike/authz/businesses/${f.bizA}`)).status).toBe(401);

    const logs = down.logs();
    expect(logs).not.toContain('SENTINEL_DB_PASSWORD');
    expect(logs).not.toContain(hashSecret(f.keyA));
    expect(logs).not.toContain(hashSecret(f.cookies.ownerA.split('=')[1]));
    // Auth.js's own error log is reduced to the error name and code: no cause, stack or address.
    expect(logs).not.toMatch(/\[cause\]|\n\s+at |127\.0\.0\.1:9/);
  });

  it('denies a machine key on merchant and buyer surfaces', async () => {
    const asBearer = { authorization: `Bearer ${f.keyA}` };
    const merchant = await fetch(`${app.origin}/api/spike/authz/businesses/${f.bizA}`, { headers: asBearer });
    expect(merchant.status).toBe(401);
    const asSessionCookie = await fetch(`${app.origin}/api/spike/authz/businesses/${f.bizA}`, {
      headers: { cookie: `authjs.session-token=${f.keyA}` },
    });
    expect(asSessionCookie.status).toBe(401);
    for (const headers of [asBearer, { cookie: `${caseSessionCookieName(f.caseA, false)}=${f.keyA}` }]) {
      const res = await fetch(`${app.origin}/api/spike/authz/cases/${f.caseA}`, { headers });
      expect(res.status).toBe(401);
      expect(await res.text()).not.toContain(BUYER_NAME);
    }
  });

  it('cuts a case session and a machine key on the next request after revocation', async () => {
    const raw = generateSecret();
    const { id: sessionId } = await one<{ id: number }>(
      "INSERT INTO case_sessions (case_id, session_hash, expires_at) VALUES ($1, $2, now() + interval '1 day') RETURNING id",
      [f.caseA, hashSecret(raw)],
    );
    const read = () =>
      fetch(`${app.origin}/api/spike/authz/cases/${f.caseA}`, { headers: { cookie: `${caseSessionCookieName(f.caseA, false)}=${raw}` } });
    expect((await read()).status).toBe(200);
    await db.client.query('UPDATE case_sessions SET revoked_at = now() WHERE id = $1', [sessionId]);
    const denied = await read();
    expect(denied.status).toBe(401);
    expect(await denied.text()).not.toContain(BUYER_NAME);

    const { key, prefix } = generateMachineKey();
    const { id: keyId } = await one<{ id: number }>(
      `INSERT INTO business_machine_keys (business_id, label, key_prefix, key_hash, scopes, created_by_user_id)
       VALUES ($1, 'revocable', $2, $3, ARRAY['order_events'], $4) RETURNING id`,
      [f.bizA, prefix, hashSecret(key), f.ownerA],
    );
    const post = () =>
      fetch(`${app.origin}/api/spike/authz/order-events`, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: '{}' });
    expect((await post()).status).toBe(200);
    await db.client.query('UPDATE business_machine_keys SET revoked_at = now() WHERE id = $1', [keyId]);
    const before = await auditCount();
    expect((await post()).status).toBe(401);
    expect(await auditCount()).toBe(before);
  });

  it('keeps every test surface closed when the switch is off', async () => {
    for (const [p, method] of [
      [`/api/spike/authz/businesses/${f.bizA}`, 'GET'],
      [`/api/spike/authz/businesses/${f.bizA}`, 'POST'],
      [`/api/spike/authz/cases/${f.caseA}`, 'GET'],
      ['/api/spike/authz/order-events', 'POST'],
    ] as const) {
      const res = await fetch(`${off.origin}${p}`, {
        method,
        headers: { cookie: f.cookies.ownerA, authorization: `Bearer ${f.keyA}` },
      });
      expect(res.status, `${method} ${p}`).toBe(404);
    }
  });

  it('keeps tokens, keys and buyer data out of server logs', () => {
    const logs = servers.map((s) => s.logs()).join('\n');
    for (const secret of [f.caseSession, f.keyA, f.keyAInvitationsOnly, ...Object.values(f.cookies).map((c) => c.split('=')[1])]) {
      expect(logs).not.toContain(secret);
      expect(logs).not.toContain(hashSecret(secret));
    }
    expect(logs).not.toContain(BUYER_NAME);
  });
});
