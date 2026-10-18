/**
 * Staff invitations and removal (B04, issue #30; docs/adr/0004).
 *
 * Every change runs in one transaction that first locks the business row, so
 * an invitation, an acceptance, a removal and an administrator's transfer for
 * the same business are applied one at a time and each sees the others'
 * results. Invitation tokens are 32 random bytes, stored only as SHA-256.
 */
import type { Pool, PoolClient } from 'pg';
import { AccessDenied, Unauthenticated, authorizeMerchant, recordAuditEvent } from '@/lib/authz';
import { STAFF_INVITATION_TTL_MS, parseEmail } from '@/lib/authz/policy';
import { generateSecret, hashSecret } from '@/lib/authz/secrets';
import { allowStaffInvitationEmail } from '@/lib/auth/rate-limit';
import { inTransaction } from '@/lib/authz/transaction';

/** Pending invitations allowed per business at once. */
export const MAX_PENDING_STAFF_INVITATIONS = 20;

const TOKEN = /^[A-Za-z0-9_-]{40,60}$/;
const isPositiveInt = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0;

export type StaffRejection =
  | 'invalid_email'
  | 'already_member'
  | 'too_many_pending'
  | 'invalid_invitation'
  | 'wrong_identity'
  | 'not_found'
  | 'not_staff'
  | 'rate_limited';

export class StaffRejected extends Error {
  constructor(readonly reason: StaffRejection) {
    super(reason);
    this.name = 'StaffRejected';
  }
}

async function lockBusiness(client: PoolClient, businessId: number): Promise<void> {
  await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [businessId]);
}

/** The business that owns `resource`, or AccessDenied; then locks it. */
async function lockOwningBusiness(client: PoolClient, sql: string, id: number): Promise<number> {
  if (!isPositiveInt(id)) throw new AccessDenied();
  const businessId: number | undefined = (await client.query(sql, [id])).rows[0]?.business_id;
  if (!businessId) throw new AccessDenied();
  await lockBusiness(client, businessId);
  return businessId;
}

/**
 * An owner invites `email` as staff of `businessId`. Replaces a pending
 * invitation to the same address. Returns the raw token, to be sent to that
 * address once; it is never stored.
 */
export async function createStaffInvitation(
  db: Pool,
  input: { ownerUserId: number | null | undefined; businessId: number; email: unknown },
  now: Date = new Date(),
): Promise<{ invitationId: number; token: string; email: string; expiresAt: Date }> {
  if (!isPositiveInt(input.ownerUserId)) throw new Unauthenticated();
  if (!isPositiveInt(input.businessId)) throw new AccessDenied();
  const email = parseEmail(input.email);
  return inTransaction(db, async (client) => {
    await lockBusiness(client, input.businessId);
    const owner = await authorizeMerchant(client, {
      userId: input.ownerUserId,
      resource: { kind: 'business', id: input.businessId },
      permission: 'manage_staff',
    });
    if (!email) throw new StaffRejected('invalid_email');
    const member = await client.query(
      `SELECT 1 FROM business_memberships m JOIN users u ON u.id = m.user_id
        WHERE m.business_id = $1 AND m.status = 'active' AND lower(u.email) = $2`,
      [owner.businessId, email],
    );
    if (member.rowCount) throw new StaffRejected('already_member');

    const replaced = await client.query(
      `UPDATE staff_invitations SET revoked_at = $3, revoked_by_user_id = $4
        WHERE business_id = $1 AND lower(email) = $2 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [owner.businessId, email, now, owner.principal.userId],
    );
    const pending = await client.query(
      `SELECT count(*)::int AS n FROM staff_invitations
        WHERE business_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2`,
      [owner.businessId, now],
    );
    if (pending.rows[0].n >= MAX_PENDING_STAFF_INVITATIONS) throw new StaffRejected('too_many_pending');
    // Each invitation sends an email: bound how many a business can send.
    if (!(await allowStaffInvitationEmail(client, owner.businessId, now))) throw new StaffRejected('rate_limited');

    const token = generateSecret();
    const expiresAt = new Date(now.valueOf() + STAFF_INVITATION_TTL_MS);
    const { rows } = await client.query(
      `INSERT INTO staff_invitations (business_id, email, role, token_hash, invited_by_user_id, expires_at, created_at)
       VALUES ($1, $2, 'staff', $3, $4, $5, $6) RETURNING id`,
      [owner.businessId, email, hashSecret(token), owner.principal.userId, expiresAt, now],
    );
    const invitationId: number = rows[0].id;
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'staff_invitation.created',
      details: { invitation_id: invitationId, replaced_pending: (replaced.rowCount ?? 0) > 0 },
    });
    return { invitationId, token, email, expiresAt };
  });
}

/**
 * The signed-in user accepts an invitation. It must be pending, unexpired,
 * addressed to this user's login email, and issued by someone who is still
 * the business's active owner. Single use: the acceptance and the staff
 * membership are written together.
 */
export async function acceptStaffInvitation(
  db: Pool,
  input: { userId: number | null | undefined; token: unknown },
  now: Date = new Date(),
): Promise<{ businessId: number; membershipId: number }> {
  if (!isPositiveInt(input.userId)) throw new Unauthenticated();
  if (typeof input.token !== 'string' || !TOKEN.test(input.token)) throw new StaffRejected('invalid_invitation');
  const tokenHash = hashSecret(input.token);
  return inTransaction(db, async (client) => {
    const found = await client.query('SELECT business_id FROM staff_invitations WHERE token_hash = $1', [tokenHash]);
    const businessId: number | undefined = found.rows[0]?.business_id;
    if (!businessId) throw new StaffRejected('invalid_invitation');
    await lockBusiness(client, businessId);

    const invitation = (
      await client.query(
        `SELECT i.id, lower(i.email) AS email, i.invited_by_user_id
           FROM staff_invitations i
          WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > $2
            AND EXISTS (SELECT 1 FROM business_memberships m
                         WHERE m.business_id = i.business_id AND m.user_id = i.invited_by_user_id
                           AND m.role = 'owner' AND m.status = 'active')`,
        [tokenHash, now],
      )
    ).rows[0] as { id: number; email: string; invited_by_user_id: number } | undefined;
    if (!invitation) throw new StaffRejected('invalid_invitation');

    const user = (await client.query('SELECT lower(email) AS email FROM users WHERE id = $1', [input.userId])).rows[0];
    if (!user || user.email !== invitation.email) throw new StaffRejected('wrong_identity');
    const member = await client.query(
      "SELECT 1 FROM business_memberships WHERE business_id = $1 AND user_id = $2 AND status = 'active'",
      [businessId, input.userId],
    );
    if (member.rowCount) throw new StaffRejected('already_member');

    const consumed = await client.query(
      `UPDATE staff_invitations SET accepted_at = $2, accepted_user_id = $3
        WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [invitation.id, now, input.userId],
    );
    if (consumed.rowCount !== 1) throw new StaffRejected('invalid_invitation');
    const { rows } = await client.query(
      `INSERT INTO business_memberships (business_id, user_id, role, granted_by_user_id, staff_invitation_id, created_at)
       VALUES ($1, $2, 'staff', $3, $4, $5) RETURNING id`,
      [businessId, input.userId, invitation.invited_by_user_id, invitation.id, now],
    );
    const membershipId: number = rows[0].id;
    await recordAuditEvent(client, {
      businessId,
      actor: { type: 'merchant_user', userId: input.userId as number },
      action: 'staff_invitation.accepted',
      details: { invitation_id: invitation.id, membership_id: membershipId },
    });
    return { businessId, membershipId };
  });
}

/** An owner withdraws a pending invitation of their business. */
export async function revokeStaffInvitation(
  db: Pool,
  input: { ownerUserId: number | null | undefined; invitationId: number },
  now: Date = new Date(),
): Promise<void> {
  if (!isPositiveInt(input.ownerUserId)) throw new Unauthenticated();
  await inTransaction(db, async (client) => {
    await lockOwningBusiness(client, 'SELECT business_id FROM staff_invitations WHERE id = $1', input.invitationId);
    const owner = await authorizeMerchant(client, {
      userId: input.ownerUserId,
      resource: { kind: 'staff_invitation', id: input.invitationId },
      permission: 'manage_staff',
    });
    const res = await client.query(
      `UPDATE staff_invitations SET revoked_at = $2, revoked_by_user_id = $3
        WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [input.invitationId, now, owner.principal.userId],
    );
    if (!res.rowCount) throw new StaffRejected('not_found');
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'staff_invitation.revoked',
      details: { invitation_id: input.invitationId },
    });
  });
}

/**
 * An owner removes a staff membership of their business. Access ends on the
 * member's next request. Owners are never removed here: ownership changes
 * only through an administrator-approved transfer, so control is never
 * orphaned.
 */
export async function removeStaffMembership(
  db: Pool,
  input: { ownerUserId: number | null | undefined; membershipId: number },
  now: Date = new Date(),
): Promise<void> {
  if (!isPositiveInt(input.ownerUserId)) throw new Unauthenticated();
  await inTransaction(db, async (client) => {
    await lockOwningBusiness(client, 'SELECT business_id FROM business_memberships WHERE id = $1', input.membershipId);
    const owner = await authorizeMerchant(client, {
      userId: input.ownerUserId,
      resource: { kind: 'membership', id: input.membershipId },
      permission: 'manage_staff',
    });
    const res = await client.query(
      `UPDATE business_memberships SET status = 'revoked', revoked_at = $2, revoked_by_user_id = $3
        WHERE id = $1 AND status = 'active' AND role = 'staff'`,
      [input.membershipId, now, owner.principal.userId],
    );
    if (!res.rowCount) throw new StaffRejected('not_staff');
    await recordAuditEvent(client, {
      businessId: owner.businessId,
      actor: owner.principal,
      action: 'membership.revoked',
      details: { membership_id: input.membershipId },
    });
  });
}

export interface BusinessTeam {
  members: { membershipId: number; email: string; role: 'owner' | 'staff' }[];
  pendingInvitations: { invitationId: number; email: string; expiresAt: Date }[];
}

/** The team of a business, for its owner. Call only after authorizing `manage_staff`. */
export async function listBusinessTeam(db: Pool, businessId: number, now: Date = new Date()): Promise<BusinessTeam> {
  const members = await db.query(
    `SELECT m.id, u.email, m.role FROM business_memberships m JOIN users u ON u.id = m.user_id
      WHERE m.business_id = $1 AND m.status = 'active' ORDER BY m.role, u.email`,
    [businessId],
  );
  const pending = await db.query(
    `SELECT id, email, expires_at FROM staff_invitations
      WHERE business_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2 ORDER BY email`,
    [businessId, now],
  );
  return {
    members: members.rows.map((r) => ({ membershipId: r.id, email: r.email, role: r.role })),
    pendingInvitations: pending.rows.map((r) => ({ invitationId: r.id, email: r.email, expiresAt: r.expires_at })),
  };
}
