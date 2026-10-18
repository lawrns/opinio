/**
 * Business-scoped machine keys (B05, issue #31). Only an active owner of the
 * business issues, lists, revokes or rotates them. A key is
 * `opk_<prefix>_<32 random bytes>`; only its SHA-256 and the display prefix
 * are stored, and the raw key is returned once, at creation.
 *
 * Every change locks the business row first, so revocations, rotations and
 * an administrator's transfer for one business apply one at a time.
 */
import type { Pool, PoolClient } from 'pg';
import { AccessDenied, Unauthenticated, authorizeMerchant, recordAuditEvent } from '@/lib/authz';
import { MACHINE_SCOPES, type MachineScope } from '@/lib/authz/policy';
import { generateMachineKey, hashSecret } from '@/lib/authz/secrets';
import { inTransaction } from '@/lib/authz/transaction';

/** Active keys allowed per business. */
export const MAX_ACTIVE_MACHINE_KEYS = 10;
/** Labels are short, single-line names chosen by the owner; no secrets or contacts belong there. */
const LABEL = /^[\p{L}\p{N} ._\-]{1,80}$/u;
const isPositiveInt = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0;

export type KeyRejection = 'invalid_label' | 'invalid_scopes' | 'too_many_keys' | 'not_found';

export class KeyRejected extends Error {
  constructor(readonly reason: KeyRejection) {
    super(reason);
    this.name = 'KeyRejected';
  }
}

/** Validated label and scopes from untrusted input, or a KeyRejected. */
export function parseKeyRequest(input: { label: unknown; scopes: unknown }): { label: string; scopes: MachineScope[] } {
  const label = typeof input.label === 'string' && input.label.length <= 80 ? input.label.trim() : '';
  if (!LABEL.test(label)) throw new KeyRejected('invalid_label');
  const raw = Array.isArray(input.scopes) ? input.scopes : [input.scopes];
  const scopes = [...new Set(raw.filter((s): s is string => typeof s === 'string'))];
  if (scopes.length === 0 || scopes.length > MACHINE_SCOPES.length || !scopes.every((s) => (MACHINE_SCOPES as readonly string[]).includes(s))) {
    throw new KeyRejected('invalid_scopes');
  }
  return { label, scopes: scopes as MachineScope[] };
}

/** Locks the business that owns `keyId` and authorizes its owner; AccessDenied for anyone else or a missing key. */
async function lockKeyBusiness(client: PoolClient, ownerUserId: number, keyId: number) {
  if (!isPositiveInt(keyId)) throw new AccessDenied();
  const businessId: number | undefined = (
    await client.query('SELECT business_id FROM business_machine_keys WHERE id = $1', [keyId])
  ).rows[0]?.business_id;
  if (!businessId) throw new AccessDenied();
  await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [businessId]);
  return authorizeMerchant(client, { userId: ownerUserId, resource: { kind: 'machine_key', id: keyId }, permission: 'manage_keys' });
}

async function insertKey(
  client: PoolClient,
  businessId: number,
  ownerUserId: number,
  label: string,
  scopes: MachineScope[],
  now: Date,
): Promise<{ keyId: number; key: string; prefix: string }> {
  const active = await client.query(
    'SELECT count(*)::int AS n FROM business_machine_keys WHERE business_id = $1 AND revoked_at IS NULL',
    [businessId],
  );
  if (active.rows[0].n >= MAX_ACTIVE_MACHINE_KEYS) throw new KeyRejected('too_many_keys');
  const { key, prefix } = generateMachineKey();
  const { rows } = await client.query(
    `INSERT INTO business_machine_keys (business_id, label, key_prefix, key_hash, scopes, created_by_user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [businessId, label, prefix, hashSecret(key), scopes, ownerUserId, now],
  );
  return { keyId: rows[0].id, key, prefix };
}

/** An owner issues a key for their business. The raw key is returned once and never stored. */
export async function createMachineKey(
  db: Pool,
  input: { ownerUserId: number | null | undefined; businessId: number; label: unknown; scopes: unknown },
  now: Date = new Date(),
): Promise<{ keyId: number; key: string; prefix: string }> {
  if (!isPositiveInt(input.ownerUserId)) throw new Unauthenticated();
  if (!isPositiveInt(input.businessId)) throw new AccessDenied();
  return inTransaction(db, async (client) => {
    await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [input.businessId]);
    const owner = await authorizeMerchant(client, {
      userId: input.ownerUserId,
      resource: { kind: 'business', id: input.businessId },
      permission: 'manage_keys',
    });
    const { label, scopes } = parseKeyRequest(input);
    const created = await insertKey(client, owner.businessId, owner.principal.userId, label, scopes, now);
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'machine_key.created',
      details: { key_id: created.keyId, order_events: scopes.includes('order_events'), invitations: scopes.includes('invitations') },
    });
    return created;
  });
}

/** An owner revokes a key of their business; it fails on its next use. */
export async function revokeMachineKey(
  db: Pool,
  input: { ownerUserId: number | null | undefined; keyId: number },
  now: Date = new Date(),
): Promise<void> {
  if (!isPositiveInt(input.ownerUserId)) throw new Unauthenticated();
  await inTransaction(db, async (client) => {
    const owner = await lockKeyBusiness(client, input.ownerUserId as number, input.keyId);
    const res = await client.query(
      'UPDATE business_machine_keys SET revoked_at = $2, revoked_by_user_id = $3 WHERE id = $1 AND revoked_at IS NULL',
      [input.keyId, now, owner.principal.userId],
    );
    if (!res.rowCount) throw new KeyRejected('not_found');
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'machine_key.revoked',
      details: { key_id: input.keyId },
    });
  });
}

/**
 * Replaces an active key with a new one of the same label and scopes, in one
 * transaction: the old key stops working when the new one is issued. Two
 * concurrent rotations of the same key yield exactly one replacement.
 */
export async function rotateMachineKey(
  db: Pool,
  input: { ownerUserId: number | null | undefined; keyId: number },
  now: Date = new Date(),
): Promise<{ keyId: number; key: string; prefix: string }> {
  if (!isPositiveInt(input.ownerUserId)) throw new Unauthenticated();
  return inTransaction(db, async (client) => {
    const owner = await lockKeyBusiness(client, input.ownerUserId as number, input.keyId);
    const old = (
      await client.query(
        `UPDATE business_machine_keys SET revoked_at = $2, revoked_by_user_id = $3
          WHERE id = $1 AND revoked_at IS NULL RETURNING label, scopes`,
        [input.keyId, now, owner.principal.userId],
      )
    ).rows[0] as { label: string; scopes: MachineScope[] } | undefined;
    if (!old) throw new KeyRejected('not_found');
    const created = await insertKey(client, owner.businessId, owner.principal.userId, old.label, old.scopes, now);
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'machine_key.revoked',
      details: { key_id: input.keyId, rotated: true },
    });
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'machine_key.created',
      details: { key_id: created.keyId, rotated_from_key_id: input.keyId },
    });
    return created;
  });
}

export interface MachineKeySummary {
  keyId: number;
  label: string;
  prefix: string;
  scopes: MachineScope[];
  createdAt: Date;
  revokedAt: Date | null;
}

/** Safe key metadata of a business, for its owner. Call only after authorizing `manage_keys`. Never includes secrets or hashes. */
export async function listMachineKeys(db: Pool, businessId: number): Promise<MachineKeySummary[]> {
  const { rows } = await db.query(
    `SELECT id, label, key_prefix, scopes, created_at, revoked_at FROM business_machine_keys
      WHERE business_id = $1 ORDER BY revoked_at IS NOT NULL, created_at DESC LIMIT 50`,
    [businessId],
  );
  return rows.map((r) => ({
    keyId: r.id,
    label: r.label,
    prefix: r.key_prefix,
    scopes: r.scopes,
    createdAt: r.created_at,
    revokedAt: r.revoked_at,
  }));
}
