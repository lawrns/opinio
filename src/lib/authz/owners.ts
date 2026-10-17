/**
 * First-owner approval (B03, issue #29; ADR 0002). Only a platform
 * administrator, added outside the app by scripts/grant-admin.mjs, can
 * approve. The approval records independently established control, the
 * applicant's documented authority and a restricted evidence reference, and
 * creates exactly one owner membership in the same transaction. Claimed
 * listings, RFC/CLEE and listing contacts play no part.
 */
import type { Pool } from 'pg';
import { inTransaction } from '@/lib/authz/transaction';
import { AccessDenied, Unauthenticated, recordAuditEvent, type AuditAction, type Db } from '@/lib/authz';
import {
  AUTHORITY_BASES,
  EVIDENCE_METHODS,
  EVIDENCE_REFERENCE,
  EVIDENCE_SUBJECT,
  parseEmail,
  type AuthorityBasis,
  type EvidenceMethod,
} from '@/lib/authz/policy';

const isPositiveInt = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0;

/** True only for a user listed in platform_administrators. */
export async function isPlatformAdministrator(db: Db, userId: number | null | undefined): Promise<boolean> {
  if (!isPositiveInt(userId)) return false;
  const { rows } = await db.query('SELECT 1 FROM platform_administrators WHERE user_id = $1', [userId]);
  return rows.length === 1;
}

export async function requireAdministrator(db: Db, userId: number | null | undefined): Promise<{ type: 'administrator'; userId: number }> {
  if (!isPositiveInt(userId)) throw new Unauthenticated();
  if (!(await isPlatformAdministrator(db, userId))) throw new AccessDenied();
  return { type: 'administrator', userId };
}

export type ApprovalRejection =
  | 'invalid_request'
  | 'business_not_found'
  | 'applicant_not_signed_in'
  | 'self_approval'
  | 'owner_exists'
  | 'approval_not_found'
  | 'no_current_owner'
  | 'already_owner';

export class ApprovalRejected extends Error {
  constructor(readonly reason: ApprovalRejection) {
    super(reason);
    this.name = 'ApprovalRejected';
  }
}

export interface FirstOwnerApproval {
  businessId: number;
  applicantEmail: string;
  evidenceMethod: EvidenceMethod;
  authorityBasis: AuthorityBasis;
  evidenceReference: string;
  evidenceSubject: string;
}

/** Validates untrusted form input into an approval request, or null. */
export function parseFirstOwnerApproval(input: Record<string, unknown>): FirstOwnerApproval | null {
  // Every field is length-checked before any pattern runs.
  const text = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value.trim() : '');
  const businessId = Number(input.businessId);
  const applicantEmail = parseEmail(input.applicantEmail);
  const evidenceMethod = text(input.evidenceMethod, 30);
  const authorityBasis = text(input.authorityBasis, 30);
  const evidenceReference = text(input.evidenceReference, 25);
  const evidenceSubject = text(input.evidenceSubject, 253).toLowerCase();
  if (
    !isPositiveInt(businessId) ||
    !applicantEmail ||
    !(EVIDENCE_METHODS as readonly string[]).includes(evidenceMethod) ||
    !(AUTHORITY_BASES as readonly string[]).includes(authorityBasis) ||
    !EVIDENCE_REFERENCE.test(evidenceReference) ||
    !EVIDENCE_SUBJECT[evidenceMethod as EvidenceMethod].test(evidenceSubject)
  ) {
    return null;
  }
  return {
    businessId,
    applicantEmail,
    evidenceMethod: evidenceMethod as EvidenceMethod,
    authorityBasis: authorityBasis as AuthorityBasis,
    evidenceReference,
    evidenceSubject,
  };
}

/**
 * Records an administrator's first-owner approval and the owner membership,
 * atomically. The applicant must already have signed in once (so the
 * approval binds to a verified login email). A business that already has an
 * active owner needs a transfer (B04) instead.
 */
export async function approveFirstOwner(
  db: Pool,
  administratorUserId: number | null | undefined,
  request: FirstOwnerApproval,
): Promise<{ approvalId: number; membershipId: number }> {
  const admin = await requireAdministrator(db, administratorUserId);
  return inTransaction(db, async (client) => {
    const business = await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [request.businessId]);
    if (business.rowCount === 0) throw new ApprovalRejected('business_not_found');
    const applicant = await client.query('SELECT id FROM users WHERE email = $1', [request.applicantEmail]);
    const applicantId: number | undefined = applicant.rows[0]?.id;
    if (!applicantId) throw new ApprovalRejected('applicant_not_signed_in');
    if (applicantId === admin.userId) throw new ApprovalRejected('self_approval');
    const owner = await client.query(
      "SELECT 1 FROM business_memberships WHERE business_id = $1 AND role = 'owner' AND status = 'active'",
      [request.businessId],
    );
    if (owner.rowCount !== 0) throw new ApprovalRejected('owner_exists');

    const approval = await client.query(
      `INSERT INTO ownership_approvals
         (business_id, subject_user_id, kind, evidence_method, evidence_subject, authority_basis, evidence_reference, approved_by_user_id)
       VALUES ($1, $2, 'first_owner', $3, $4, $5, $6, $7) RETURNING id`,
      [
        request.businessId,
        applicantId,
        request.evidenceMethod,
        request.evidenceSubject,
        request.authorityBasis,
        request.evidenceReference,
        admin.userId,
      ],
    );
    const approvalId: number = approval.rows[0].id;
    const membership = await client.query(
      `INSERT INTO business_memberships (business_id, user_id, role, approval_id, granted_by_user_id)
       VALUES ($1, $2, 'owner', $3, $4) RETURNING id`,
      [request.businessId, applicantId, approvalId, admin.userId],
    );
    const membershipId: number = membership.rows[0].id;
    await recordAuditEvent(client, {
      businessId: request.businessId,
      actor: admin,
      action: 'ownership.approved',
      details: { approval_id: approvalId, membership_id: membershipId, subject_user_id: applicantId },
    });
    return { approvalId, membershipId };
  });
}

/**
 * Revokes an unrevoked approval and every active membership it backs, in one
 * transaction and audited. Access ends on the owner's next request.
 */
export async function revokeOwnerApproval(
  db: Pool,
  administratorUserId: number | null | undefined,
  approvalId: number,
): Promise<{ revokedMemberships: number }> {
  const admin = await requireAdministrator(db, administratorUserId);
  if (!isPositiveInt(approvalId)) throw new ApprovalRejected('approval_not_found');
  return inTransaction(db, async (client) => {
    const approval = await client.query(
      `UPDATE ownership_approvals SET revoked_at = now(), revoked_by_user_id = $2
        WHERE id = $1 AND revoked_at IS NULL RETURNING business_id`,
      [approvalId, admin.userId],
    );
    if (approval.rowCount === 0) throw new ApprovalRejected('approval_not_found');
    const businessId: number = approval.rows[0].business_id;
    const memberships = await client.query(
      `UPDATE business_memberships SET status = 'revoked', revoked_at = now(), revoked_by_user_id = $2
        WHERE approval_id = $1 AND status = 'active'`,
      [approvalId, admin.userId],
    );
    const revokedMemberships = memberships.rowCount ?? 0;
    await recordAuditEvent(client, {
      businessId,
      actor: admin,
      action: 'ownership.approval_revoked',
      details: { approval_id: approvalId, revoked_memberships: revokedMemberships },
    });
    return { revokedMemberships };
  });
}

/**
 * Records an administrator-approved ownership transfer (ADR 0004), atomically:
 * the business's previous authority ends (its approvals, every active owner
 * and staff membership, pending staff invitations and machine keys), then the
 * new owner's approval and membership are written. Other businesses are not
 * touched. The new owner must have signed in once; with no current owner the
 * first-owner approval applies instead.
 */
export async function approveOwnershipTransfer(
  db: Pool,
  administratorUserId: number | null | undefined,
  request: FirstOwnerApproval,
  now: Date = new Date(),
): Promise<{
  approvalId: number;
  membershipId: number;
  revoked: { memberships: number; invitations: number; keys: number };
}> {
  const admin = await requireAdministrator(db, administratorUserId);
  return inTransaction(db, async (client) => {
    const business = await client.query('SELECT id FROM businesses WHERE id = $1 FOR UPDATE', [request.businessId]);
    if (business.rowCount === 0) throw new ApprovalRejected('business_not_found');
    const applicantId: number | undefined = (
      await client.query('SELECT id FROM users WHERE lower(email) = $1', [request.applicantEmail])
    ).rows[0]?.id;
    if (!applicantId) throw new ApprovalRejected('applicant_not_signed_in');
    if (applicantId === admin.userId) throw new ApprovalRejected('self_approval');
    const previousOwnerId: number | undefined = (
      await client.query(
        "SELECT user_id FROM business_memberships WHERE business_id = $1 AND role = 'owner' AND status = 'active'",
        [request.businessId],
      )
    ).rows[0]?.user_id;
    if (!previousOwnerId) throw new ApprovalRejected('no_current_owner');
    if (previousOwnerId === applicantId) throw new ApprovalRejected('already_owner');

    const ended = [now, admin.userId, request.businessId];
    await client.query(
      `UPDATE ownership_approvals SET revoked_at = $1, revoked_by_user_id = $2
        WHERE business_id = $3 AND revoked_at IS NULL`,
      ended,
    );
    const memberships = await client.query(
      `UPDATE business_memberships SET status = 'revoked', revoked_at = $1, revoked_by_user_id = $2
        WHERE business_id = $3 AND status = 'active' RETURNING id`,
      ended,
    );
    const invitations = await client.query(
      `UPDATE staff_invitations SET revoked_at = $1, revoked_by_user_id = $2
        WHERE business_id = $3 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`,
      ended,
    );
    const keys = await client.query(
      `UPDATE business_machine_keys SET revoked_at = $1, revoked_by_user_id = $2
        WHERE business_id = $3 AND revoked_at IS NULL RETURNING id`,
      ended,
    );
    // One audit row per revoked item, marked as caused by the transfer.
    const revocations: [AuditAction, string, { id: number }[]][] = [
      ['membership.revoked', 'membership_id', memberships.rows],
      ['staff_invitation.revoked', 'invitation_id', invitations.rows],
      ['machine_key.revoked', 'key_id', keys.rows],
    ];
    for (const [action, idKey, rows] of revocations) {
      for (const row of rows) {
        await recordAuditEvent(client, {
          businessId: request.businessId,
          actor: admin,
          action,
          details: { [idKey]: row.id, by_transfer: true },
        });
      }
    }

    const approvalId: number = (
      await client.query(
        `INSERT INTO ownership_approvals
           (business_id, subject_user_id, kind, evidence_method, evidence_subject, authority_basis, evidence_reference,
            previous_owner_user_id, approved_by_user_id, approved_at)
         VALUES ($1, $2, 'transfer', $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          request.businessId,
          applicantId,
          request.evidenceMethod,
          request.evidenceSubject,
          request.authorityBasis,
          request.evidenceReference,
          previousOwnerId,
          admin.userId,
          now,
        ],
      )
    ).rows[0].id;
    const membershipId: number = (
      await client.query(
        `INSERT INTO business_memberships (business_id, user_id, role, approval_id, granted_by_user_id, created_at)
         VALUES ($1, $2, 'owner', $3, $4, $5) RETURNING id`,
        [request.businessId, applicantId, approvalId, admin.userId, now],
      )
    ).rows[0].id;
    const revoked = {
      memberships: memberships.rowCount ?? 0,
      invitations: invitations.rowCount ?? 0,
      keys: keys.rowCount ?? 0,
    };
    await recordAuditEvent(client, {
      businessId: request.businessId,
      actor: admin,
      action: 'ownership.transferred',
      details: {
        approval_id: approvalId,
        membership_id: membershipId,
        subject_user_id: applicantId,
        previous_owner_user_id: previousOwnerId,
        revoked_memberships: revoked.memberships,
        revoked_invitations: revoked.invitations,
        revoked_keys: revoked.keys,
      },
    });
    return { approvalId, membershipId, revoked };
  });
}

