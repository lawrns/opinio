/**
 * Server-side authorization for the three principal types (spec #26, ADR 0001):
 * buyers prove one case, merchant users act through an active business
 * membership, and machine keys act for one business within named scopes.
 *
 * Every check reads Postgres on each call: no cache can keep revoked access
 * alive. Resource IDs from a request are lookup keys only; the owning
 * business is always resolved from stored relationships. A missing resource
 * and another business's resource are denied the same way, so a denial
 * never reveals whether the resource exists.
 */
import { hashSecret } from '@/lib/authz/secrets';
import { roleAllows, type ActorType, type BusinessPermission, type BusinessRole, type MachineScope } from '@/lib/authz/policy';

export type { BusinessPermission, BusinessRole, MachineScope } from '@/lib/authz/policy';

/** Minimal query surface shared by pg Pool, PoolClient and Client. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

export type Principal =
  | { type: 'merchant_user'; userId: number }
  | { type: 'administrator'; userId: number }
  | { type: 'buyer_case_session'; sessionId: number; caseId: number }
  | { type: 'machine_key'; keyId: number; businessId: number }
  | { type: 'system' };

// Compile-time: the principal union and ACTOR_TYPES name exactly the same actors.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type PrincipalTypesMatchActorTypes = Same<Principal['type'], ActorType> extends true ? true : never;
const principalTypesMatchActorTypes: PrincipalTypesMatchActorTypes = true;
void principalTypesMatchActorTypes;

/** The caller has no valid credential (401). */
export class Unauthenticated extends Error {
  constructor() {
    super('unauthenticated');
    this.name = 'Unauthenticated';
  }
}

/** The caller is authenticated but may not act on this resource, or it does not exist (404). */
export class AccessDenied extends Error {
  constructor() {
    super('access denied');
    this.name = 'AccessDenied';
  }
}

/** The authority store failed. Carries no database detail (503). */
export class AuthorityUnavailable extends Error {
  constructor() {
    super('authority store unavailable');
    this.name = 'AuthorityUnavailable';
  }
}

/**
 * Runs an authority query. Database errors can echo parameter values (token
 * hashes, emails), so only the error code is logged and a bare error is thrown.
 */
async function authorityQuery<R extends Record<string, unknown>>(db: Db, text: string, params: unknown[]): Promise<R[]> {
  try {
    return (await db.query(text, params)).rows as R[];
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
    console.error(`[authz] authority query failed (code ${code})`);
    throw new AuthorityUnavailable();
  }
}

/** Throws AuthorityUnavailable when the authority store cannot be queried. */
export async function assertAuthorityReachable(db: Db): Promise<void> {
  await authorityQuery(db, 'SELECT 1', []);
}

/** A private resource whose owning business is resolved from storage. */
export type BusinessResource =
  | { kind: 'business'; id: number }
  | { kind: 'business_slug'; slug: string }
  | { kind: 'case' | 'review' | 'order' | 'invitation' | 'widget' | 'machine_key' | 'staff_invitation' | 'membership'; id: number };

const OWNER_LOOKUP: Record<Exclude<BusinessResource['kind'], 'business_slug'>, string> = {
  business: 'SELECT id AS business_id FROM businesses WHERE id = $1',
  case: 'SELECT business_id FROM resolution_cases WHERE id = $1',
  review: 'SELECT business_id FROM reviews WHERE id = $1',
  order: 'SELECT business_id FROM orders WHERE id = $1',
  invitation: 'SELECT business_id FROM invitations WHERE id = $1',
  widget: 'SELECT business_id FROM widgets WHERE id = $1',
  machine_key: 'SELECT business_id FROM business_machine_keys WHERE id = $1',
  staff_invitation: 'SELECT business_id FROM staff_invitations WHERE id = $1',
  membership: 'SELECT business_id FROM business_memberships WHERE id = $1',
};

const isPositiveInt = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0;

/** The stored owning business of `resource`, or null when it does not exist. */
export async function owningBusinessId(db: Db, resource: BusinessResource): Promise<number | null> {
  if (resource.kind === 'business_slug') {
    if (typeof resource.slug !== 'string' || resource.slug.length === 0 || resource.slug.length > 120) return null;
    const rows = await authorityQuery<{ id: number }>(db, 'SELECT id FROM businesses WHERE slug = $1', [resource.slug]);
    return rows[0]?.id ?? null;
  }
  if (!isPositiveInt(resource.id)) return null;
  const rows = await authorityQuery<{ business_id: number | null }>(db, OWNER_LOOKUP[resource.kind], [resource.id]);
  return rows[0]?.business_id ?? null;
}

export interface MerchantAuthority {
  principal: { type: 'merchant_user'; userId: number };
  businessId: number;
  membershipId: number;
  role: BusinessRole;
}

/**
 * Allows a signed-in merchant user to perform `permission` on `resource` only
 * through an active membership in the resource's stored business.
 * `userId` must come from the server-side session, never from the request.
 */
export async function authorizeMerchant(
  db: Db,
  input: { userId: number | null | undefined; resource: BusinessResource; permission: BusinessPermission },
): Promise<MerchantAuthority> {
  if (!isPositiveInt(input.userId)) throw new Unauthenticated();
  const businessId = await owningBusinessId(db, input.resource);
  if (businessId === null) throw new AccessDenied();
  const rows = await authorityQuery<{ id: number; role: BusinessRole }>(
    db,
    `SELECT id, role FROM business_memberships
      WHERE business_id = $1 AND user_id = $2 AND status = 'active'`,
    [businessId, input.userId],
  );
  const membership = rows[0];
  if (!membership || !roleAllows(membership.role, input.permission)) throw new AccessDenied();
  return {
    principal: { type: 'merchant_user', userId: input.userId },
    businessId,
    membershipId: membership.id,
    role: membership.role,
  };
}

/** Businesses the user may select: active memberships only, never a fallback. */
export async function listMemberBusinesses(
  db: Db,
  userId: number | null | undefined,
): Promise<{ businessId: number; slug: string; brandName: string; role: BusinessRole }[]> {
  if (!isPositiveInt(userId)) throw new Unauthenticated();
  const rows = await authorityQuery<{ business_id: number; slug: string; brand_name: string; role: BusinessRole }>(
    db,
    `SELECT m.business_id, b.slug, b.brand_name, m.role
       FROM business_memberships m JOIN businesses b ON b.id = m.business_id
      WHERE m.user_id = $1 AND m.status = 'active'
      ORDER BY b.slug`,
    [userId],
  );
  return rows.map((r) => ({ businessId: r.business_id, slug: r.slug, brandName: r.brand_name, role: r.role }));
}

/** Allows a buyer only through an unrevoked, unexpired session for this exact case. */
export async function authorizeCaseSession(
  db: Db,
  input: { sessionToken: string | null | undefined; caseId: number },
  now: Date = new Date(),
): Promise<{ type: 'buyer_case_session'; sessionId: number; caseId: number }> {
  if (!input.sessionToken || input.sessionToken.length > 200) throw new Unauthenticated();
  if (!isPositiveInt(input.caseId)) throw new AccessDenied();
  const rows = await authorityQuery<{ id: number }>(
    db,
    `SELECT id FROM case_sessions
      WHERE session_hash = $1 AND case_id = $2 AND revoked_at IS NULL AND expires_at > $3`,
    [hashSecret(input.sessionToken), input.caseId, now],
  );
  if (!rows[0]) throw new Unauthenticated();
  return { type: 'buyer_case_session', sessionId: rows[0].id, caseId: input.caseId };
}

/**
 * Allows a machine key for `scope` within the key's own business. A business
 * named by the caller is only checked against the key, never trusted.
 */
export async function authorizeMachineKey(
  db: Db,
  input: { key: string | null | undefined; scope: MachineScope; claimedBusinessId?: unknown },
): Promise<{ type: 'machine_key'; keyId: number; businessId: number }> {
  if (!input.key || input.key.length > 200) throw new Unauthenticated();
  const rows = await authorityQuery<{ id: number; business_id: number; scopes: string[] }>(
    db,
    'SELECT id, business_id, scopes FROM business_machine_keys WHERE key_hash = $1 AND revoked_at IS NULL',
    [hashSecret(input.key)],
  );
  const key = rows[0];
  if (!key) throw new Unauthenticated();
  if (!key.scopes.includes(input.scope)) throw new AccessDenied();
  if (input.claimedBusinessId !== undefined && Number(input.claimedBusinessId) !== key.business_id) {
    throw new AccessDenied();
  }
  return { type: 'machine_key', keyId: key.id, businessId: key.business_id };
}

/** Controlled audit event names. Add new ones here, never free text. */
export type AuditAction =
  | 'ownership.approved'
  | 'ownership.approval_revoked'
  | 'administrator.granted'
  | 'ownership.transferred'
  | 'membership.granted'
  | 'membership.revoked'
  | 'staff_invitation.created'
  | 'staff_invitation.accepted'
  | 'staff_invitation.revoked'
  | 'machine_key.created'
  | 'machine_key.revoked'
  | 'case_session.created'
  | 'case_session.revoked'
  | 'case.buyer_confirmed'
  | 'case.buyer_reopened'
  | 'authz.test_write'; // B02 protected test surface only

/** Audit details are identifiers and flags only: no contacts, case text or secrets. */
export type AuditDetails = Record<string, number | boolean | null>;

const actorId = (p: Principal): number | null => {
  switch (p.type) {
    case 'merchant_user':
    case 'administrator':
      return p.userId;
    case 'buyer_case_session':
      return p.sessionId;
    case 'machine_key':
      return p.keyId;
    case 'system':
      return null;
  }
};

/** Appends to the existing audit history with a trusted actor. */
export async function recordAuditEvent(
  db: Db,
  event: { businessId: number | null; actor: Principal; action: AuditAction; details?: AuditDetails },
): Promise<void> {
  const id = actorId(event.actor);
  await authorityQuery(
    db,
    `INSERT INTO audit_logs (business_id, actor, action, details, actor_type, actor_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      event.businessId,
      id === null ? event.actor.type : `${event.actor.type}:${id}`,
      event.action,
      JSON.stringify(event.details ?? {}),
      event.actor.type,
      id,
    ],
  );
}
