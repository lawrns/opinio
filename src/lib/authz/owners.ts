/**
 * First-owner approval (B03, issue #29; ADR 0002). Only a platform
 * administrator, added outside the app by scripts/grant-admin.mjs, can
 * approve. The approval records independently established control, the
 * applicant's documented authority and a restricted evidence reference, and
 * creates exactly one owner membership in the same transaction. Claimed
 * listings, RFC/CLEE and listing contacts play no part.
 */
import type { PoolClient } from 'pg';
import { pool, withTransaction } from '@/lib/db';
import { AccessDenied, Unauthenticated, recordAuditEvent, type Db } from '@/lib/authz';
import {
  AUTHORITY_BASES,
  EVIDENCE_METHODS,
  EVIDENCE_REFERENCE,
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
  | 'owner_exists';

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
}

/** Validates untrusted form input into an approval request, or null. */
export function parseFirstOwnerApproval(input: Record<string, unknown>): FirstOwnerApproval | null {
  const businessId = Number(input.businessId);
  const applicantEmail = String(input.applicantEmail ?? '').trim().toLowerCase();
  const evidenceMethod = String(input.evidenceMethod ?? '');
  const authorityBasis = String(input.authorityBasis ?? '');
  const evidenceReference = String(input.evidenceReference ?? '').trim();
  if (
    !isPositiveInt(businessId) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail) ||
    applicantEmail.length > 255 ||
    !(EVIDENCE_METHODS as readonly string[]).includes(evidenceMethod) ||
    !(AUTHORITY_BASES as readonly string[]).includes(authorityBasis) ||
    !EVIDENCE_REFERENCE.test(evidenceReference)
  ) {
    return null;
  }
  return {
    businessId,
    applicantEmail,
    evidenceMethod: evidenceMethod as EvidenceMethod,
    authorityBasis: authorityBasis as AuthorityBasis,
    evidenceReference,
  };
}

/**
 * Records an administrator's first-owner approval and the owner membership,
 * atomically. The applicant must already have signed in once (so the
 * approval binds to a verified login email). A business that already has an
 * active owner needs a transfer (B04) instead.
 */
export async function approveFirstOwner(
  administratorUserId: number | null | undefined,
  request: FirstOwnerApproval,
): Promise<{ approvalId: number; membershipId: number }> {
  const admin = await requireAdministrator(pool, administratorUserId);
  return withTransaction(async (client: PoolClient) => {
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
         (business_id, subject_user_id, kind, evidence_method, authority_basis, evidence_reference, approved_by_user_id)
       VALUES ($1, $2, 'first_owner', $3, $4, $5, $6) RETURNING id`,
      [request.businessId, applicantId, request.evidenceMethod, request.authorityBasis, request.evidenceReference, admin.userId],
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
