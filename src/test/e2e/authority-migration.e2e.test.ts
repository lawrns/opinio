/**
 * B02 (issue #28): the auth migrations upgrade a database that already holds
 * Opinio data without changing it and without minting any authority from it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { applyAuthMigrations } from '../../../scripts/migrate-auth.mjs';
import { startDatabase, type TestDatabase } from './harness';

const LEGACY_TABLES = [
  'businesses',
  'identities',
  'orders',
  'invitations',
  'reviews',
  'review_responses',
  'resolution_cases',
  'case_messages',
  'official_records',
  'widgets',
  'audit_logs',
] as const;

const AUTHORITY_TABLES = [
  'users',
  'accounts',
  'sessions',
  'verification_token',
  'ownership_approvals',
  'business_memberships',
  'staff_invitations',
  'case_access_tokens',
  'case_sessions',
  'business_machine_keys',
  'platform_administrators',
] as const;

const MIGRATIONS = [
  '0001_authjs_identity.sql',
  '0002_business_case_machine_authority.sql',
  '0003_owner_login.sql',
  '0004_staff_and_transfer.sql',
];

let db: TestDatabase;

/** Synthetic pre-auth data shaped like production: claimed listings, verified RFCs, cases with contacts. */
async function seedLegacyData(client: Client) {
  await client.query(`
    INSERT INTO businesses (slug, brand_name, claimed, rfc, verified_level, phone, domain)
    VALUES ('tienda-a', 'Tienda A', true, 'AAA010101AAA', 'identity_verified', '5550000001', 'tienda-a.example'),
           ('tienda-b', 'Tienda B', false, NULL, 'unverified', NULL, NULL);
    INSERT INTO identities (business_id, type, identifier, status) VALUES (1, 'rfc', 'AAA010101AAA', 'verified');
    INSERT INTO orders (business_id, external_order_id, customer_name, customer_email)
    VALUES (1, 'ORD-1', 'Comprador Uno', 'legacy-buyer@example.test');
    INSERT INTO invitations (business_id, order_id, token, recipient_target) VALUES (1, 1, 'inv_legacy_1', 'legacy-buyer@example.test');
    INSERT INTO reviews (business_id, order_id, rating, body, author_name) VALUES (1, 1, 4, 'Bien', 'Comprador Uno');
    INSERT INTO review_responses (review_id, business_id, responder_name, response_text) VALUES (1, 1, 'Tienda A', 'Gracias');
    INSERT INTO resolution_cases (business_id, case_number, customer_name, customer_contact, issue_category, customer_requested_remedy, status, is_consumer_confirmed)
    VALUES (1, 'OP-LEGACY-1', 'Comprador Uno', 'legacy-buyer@example.test', 'delay', 'refund', 'resolved_consumer_confirmed', true),
           (2, 'OP-LEGACY-2', 'Comprador Dos', '5550000002', 'wrong_item', 'replacement', 'opened', false);
    INSERT INTO case_messages (case_id, sender_type, sender_name, message) VALUES (1, 'consumer', 'Comprador Uno', 'Llegó tarde');
    INSERT INTO official_records (business_id, source_name, fact_title, fact_detail, record_date)
    VALUES (1, 'SAT RFC Validador', 'RFC activo', 'Sintético', '2026-01-01');
    INSERT INTO widgets (business_id, token) VALUES (1, 'wgt_legacy_ribbon');
    INSERT INTO audit_logs (business_id, actor, action, details) VALUES (1, 'merchant', 'settings_updated', '{"field":"phone"}');
  `);
}

/** One digest per legacy table over every column of every row. */
async function snapshot(client: Client) {
  const out: Record<string, string> = {};
  for (const table of LEGACY_TABLES) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n, md5(coalesce(string_agg(to_jsonb(t)::text, '|' ORDER BY t.id), '')) AS digest FROM ${table} t`,
    );
    out[table] = `${rows[0].n}:${rows[0].digest}`;
  }
  return out;
}

beforeAll(async () => {
  db = await startDatabase(['src/lib/schema.sql']);
  await seedLegacyData(db.client);
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

describe('auth migrations over existing data', () => {
  it('dry run lists both migrations and changes nothing', async () => {
    const before = await snapshot(db.client);
    expect(await applyAuthMigrations(db.client, { dryRun: true })).toEqual(MIGRATIONS);
    expect(await snapshot(db.client)).toEqual(before);
    const { rows } = await db.client.query(
      "SELECT to_regclass('business_memberships') AS a, to_regclass('auth_schema_migrations') AS b",
    );
    expect(rows[0]).toEqual({ a: null, b: null });
  });

  it('applies once, concurrently safe, and leaves every legacy row unchanged', async () => {
    const before = await snapshot(db.client);
    const second = new Client({ connectionString: db.url });
    await second.connect();
    const [a, b] = await Promise.all([applyAuthMigrations(db.client), applyAuthMigrations(second)]);
    await second.end();
    expect([...a, ...b].sort()).toEqual(MIGRATIONS);
    expect(await applyAuthMigrations(db.client)).toEqual([]);

    const after = await snapshot(db.client);
    // audit_logs gains two nullable columns, so compare its rows on the legacy columns.
    const { rows: audit } = await db.client.query('SELECT actor, action, details, actor_type, actor_id FROM audit_logs');
    expect(audit).toEqual([
      { actor: 'merchant', action: 'settings_updated', details: { field: 'phone' }, actor_type: null, actor_id: null },
    ]);
    for (const table of LEGACY_TABLES.filter((t) => t !== 'audit_logs')) {
      expect(after[table], table).toBe(before[table]);
    }
  });

  it('mints no identity, membership, key or case access from claimed listings, RFCs or contacts', async () => {
    for (const table of AUTHORITY_TABLES) {
      const { rows } = await db.client.query(`SELECT count(*)::int AS n FROM ${table}`);
      expect(rows[0].n, table).toBe(0);
    }
  });

  it('enforces the authority invariants in the schema', async () => {
    const c = db.client;
    await c.query("INSERT INTO users (email) VALUES ('admin@example.test'), ('owner@example.test')");
    // An owner membership needs a recorded approval.
    await expect(
      c.query("INSERT INTO business_memberships (business_id, user_id, role) VALUES (1, 2, 'owner')"),
    ).rejects.toMatchObject({ code: '23514' });
    // Unknown roles and machine scopes are rejected.
    await expect(
      c.query("INSERT INTO business_memberships (business_id, user_id, role) VALUES (1, 2, 'mediator')"),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      c.query(
        "INSERT INTO business_machine_keys (business_id, label, key_prefix, key_hash, scopes, created_by_user_id) VALUES (1, 'x', 'p', repeat('a', 64), ARRAY['dashboard'], 1)",
      ),
    ).rejects.toMatchObject({ code: '23514' });
    // One active membership per person and business; revoked history is kept.
    await c.query("INSERT INTO business_memberships (business_id, user_id, role) VALUES (1, 2, 'staff')");
    await expect(
      c.query("INSERT INTO business_memberships (business_id, user_id, role) VALUES (1, 2, 'staff')"),
    ).rejects.toMatchObject({ code: '23505' });
    await c.query("UPDATE business_memberships SET status = 'revoked', revoked_at = now() WHERE user_id = 2");
    await c.query("INSERT INTO business_memberships (business_id, user_id, role) VALUES (1, 2, 'staff')");
    // A revoked row must carry its revocation time.
    await expect(c.query("UPDATE business_memberships SET status = 'revoked' WHERE status = 'active'")).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('binds an owner membership to an approval for the same business and person', async () => {
    const c = db.client;
    await c.query("INSERT INTO users (email) VALUES ('owner-b@example.test')");
    // Approval: user 2 owns business 1, approved by user 1.
    const {
      rows: [approval],
    } = await c.query(
      `INSERT INTO ownership_approvals (business_id, subject_user_id, kind, evidence_method, approved_by_user_id, authority_basis, evidence_reference)
       VALUES (1, 2, 'first_owner', 'dns', 1, 'owner_of_record', 'VER-1') RETURNING id`,
    );
    // The same approval cannot back an owner of another business, or another person.
    await expect(
      c.query("INSERT INTO business_memberships (business_id, user_id, role, approval_id) VALUES (2, 2, 'owner', $1)", [
        approval.id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      c.query("INSERT INTO business_memberships (business_id, user_id, role, approval_id) VALUES (1, 3, 'owner', $1)", [
        approval.id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
    // Nor can an existing owner membership be re-pointed at it.
    await c.query("UPDATE business_memberships SET status = 'revoked', revoked_at = now() WHERE user_id = 2 AND status = 'active'");
    const {
      rows: [owner],
    } = await c.query(
      "INSERT INTO business_memberships (business_id, user_id, role, approval_id) VALUES (1, 2, 'owner', $1) RETURNING id",
      [approval.id],
    );
    await expect(c.query('UPDATE business_memberships SET business_id = 2 WHERE id = $1', [owner.id])).rejects.toMatchObject({
      code: '23503',
    });
  });
});
