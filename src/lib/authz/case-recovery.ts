/**
 * Requested recovery for cases opened before B06 (B07, issue #33; ADR 0005).
 * A buyer's request only queues; nothing is ever sent automatically. A human
 * platform administrator approves an email-contact request after verifying
 * out of band, and only then is one single-use link issued to the case's
 * stored original contact. Phone-only and ambiguous cases stay queued.
 */
import type { Pool } from 'pg';
import { recordAuditEvent, type Db } from '@/lib/authz';
import { issueCaseAccessToken } from '@/lib/authz/buyer-access';
import { requireAdministrator } from '@/lib/authz/owners';
import {
  CASE_RECOVERY_REQUESTS_PER_CLIENT,
  EVIDENCE_REFERENCE,
  PHONE_CONTACT,
  RECOVERY_BASES,
  parseEmail,
  type RecoveryBasis,
} from '@/lib/authz/policy';
import { inTransaction } from '@/lib/authz/transaction';
import { allowCaseLinkResend } from '@/lib/auth/rate-limit';

export type ContactKind = 'email' | 'phone' | 'ambiguous';

/** What a legacy case's single stored contact is: an email (normalized), a phone, or neither. */
export function classifyLegacyContact(contact: unknown): { kind: ContactKind; email: string | null } {
  const email = parseEmail(contact);
  if (email) return { kind: 'email', email };
  if (typeof contact === 'string' && PHONE_CONTACT.test(contact.trim()) && !contact.includes('@')) return { kind: 'phone', email: null };
  return { kind: 'ambiguous', email: null };
}

/**
 * Records a recovery request when it applies; the caller answers the same in
 * every case. A legacy email case is queued only when the supplied email
 * matches its stored contact; phone-only and ambiguous cases are queued for
 * manual verification. The supplied email is never stored. One open request
 * per case; requests are rate-limited per client address.
 */
export async function requestCaseRecovery(
  db: Pool,
  input: { caseNumber: unknown; email: unknown; client: string },
  now: Date = new Date(),
): Promise<void> {
  if (!(await allowCaseLinkResend(db, { scope: 'client', key: `recovery:${input.client}`, limit: CASE_RECOVERY_REQUESTS_PER_CLIENT }, now))) return;
  const supplied = parseEmail(input.email);
  const caseNumber = typeof input.caseNumber === 'string' && input.caseNumber.length <= 50 ? input.caseNumber.trim() : '';
  if (!supplied || !caseNumber) return;
  const row = (
    await db.query('SELECT id, customer_contact FROM resolution_cases WHERE case_number = $1 AND access_email IS NULL', [caseNumber])
  ).rows[0] as { id: number; customer_contact: string } | undefined;
  if (!row) return;
  const contact = classifyLegacyContact(row.customer_contact);
  if (contact.kind === 'email' && contact.email !== supplied) return;
  const status = contact.kind === 'email' ? 'pending' : 'needs_manual_verification';
  const inserted = await db.query(
    `INSERT INTO case_recovery_requests (case_id, contact_kind, status, requested_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (case_id) WHERE status IN ('pending', 'needs_manual_verification') DO NOTHING RETURNING id`,
    [row.id, contact.kind, status, now],
  );
  const requestId = (inserted.rows[0] as { id: number } | undefined)?.id;
  if (requestId) {
    await recordAuditEvent(db, {
      businessId: null,
      actor: { type: 'system' },
      action: 'case.recovery_requested',
      details: { request_id: requestId, case_id: row.id, manual_verification: status !== 'pending' },
    });
  }
}

export interface OpenRecovery {
  requestId: number;
  caseId: number;
  caseNumber: string;
  businessSlug: string;
  contactKind: ContactKind;
  status: 'pending' | 'needs_manual_verification';
  storedContact: string;
  requestedAt: Date;
}

/** The open queue, for platform administrators only (the caller must check). */
export async function listOpenRecoveries(db: Db): Promise<OpenRecovery[]> {
  const { rows } = await db.query(
    `SELECT r.id, r.case_id, c.case_number, b.slug, r.contact_kind, r.status, c.customer_contact, r.requested_at
       FROM case_recovery_requests r
       JOIN resolution_cases c ON c.id = r.case_id
       JOIN businesses b ON b.id = c.business_id
      WHERE r.status IN ('pending', 'needs_manual_verification')
      ORDER BY r.requested_at LIMIT 100`,
  );
  return (rows as Record<string, unknown>[]).map((r) => ({
    requestId: r.id as number,
    caseId: r.case_id as number,
    caseNumber: r.case_number as string,
    businessSlug: r.slug as string,
    contactKind: r.contact_kind as ContactKind,
    status: r.status as OpenRecovery['status'],
    storedContact: r.customer_contact as string,
    requestedAt: r.requested_at as Date,
  }));
}

export type RecoveryRejection = 'not_open' | 'not_email' | 'invalid_decision';

export class RecoveryRejected extends Error {
  constructor(readonly reason: RecoveryRejection) {
    super(reason);
    this.name = 'RecoveryRejected';
  }
}

/**
 * An administrator approves a pending email request after out-of-band
 * verification. In one transaction: the case's unused links are retired, its
 * active buyer sessions revoked, its access email set to the stored original
 * contact, and one link issued. Returns the address and raw token to send once.
 */
export async function approveCaseRecovery(
  db: Pool,
  administratorUserId: number | null | undefined,
  input: { requestId: number; basis: unknown; reference: unknown },
  now: Date = new Date(),
): Promise<{ email: string; token: string; tokenId: number }> {
  const admin = await requireAdministrator(db, administratorUserId);
  const basis = typeof input.basis === 'string' && (RECOVERY_BASES as readonly string[]).includes(input.basis) ? (input.basis as RecoveryBasis) : null;
  const reference = typeof input.reference === 'string' && input.reference.length <= 25 ? input.reference.trim() : '';
  if (!basis || !EVIDENCE_REFERENCE.test(reference)) throw new RecoveryRejected('invalid_decision');
  return inTransaction(db, async (client) => {
    const request = (
      await client.query(
        "SELECT id, case_id, contact_kind FROM case_recovery_requests WHERE id = $1 AND status IN ('pending', 'needs_manual_verification') FOR UPDATE",
        [input.requestId],
      )
    ).rows[0] as { id: number; case_id: number; contact_kind: ContactKind } | undefined;
    if (!request) throw new RecoveryRejected('not_open');
    const caseRow = (
      await client.query('SELECT customer_contact FROM resolution_cases WHERE id = $1 FOR UPDATE', [request.case_id])
    ).rows[0] as { customer_contact: string };
    const contact = classifyLegacyContact(caseRow.customer_contact);
    if (request.contact_kind !== 'email' || contact.kind !== 'email' || !contact.email) throw new RecoveryRejected('not_email');

    await client.query('UPDATE case_access_tokens SET consumed_at = $2 WHERE case_id = $1 AND consumed_at IS NULL', [request.case_id, now]);
    const sessions = await client.query('UPDATE case_sessions SET revoked_at = $2 WHERE case_id = $1 AND revoked_at IS NULL', [request.case_id, now]);
    await client.query('UPDATE resolution_cases SET access_email = $2 WHERE id = $1', [request.case_id, contact.email]);
    const issued = await issueCaseAccessToken(client, request.case_id, now);
    await client.query(
      `UPDATE case_recovery_requests SET status = 'approved', decided_by_user_id = $2, decided_at = $3,
              decision_basis = $4, evidence_reference = $5, access_token_id = $6 WHERE id = $1`,
      [request.id, admin.userId, now, basis, reference, issued.tokenId],
    );
    await recordAuditEvent(client, {
      businessId: null,
      actor: admin,
      action: 'case.recovery_approved',
      details: { request_id: request.id, case_id: request.case_id, revoked_sessions: sessions.rowCount ?? 0 },
    });
    return { email: contact.email, ...issued };
  });
}

/** An administrator closes an open request without sending anything. */
export async function rejectCaseRecovery(
  db: Pool,
  administratorUserId: number | null | undefined,
  requestId: number,
  now: Date = new Date(),
): Promise<void> {
  const admin = await requireAdministrator(db, administratorUserId);
  await inTransaction(db, async (client) => {
    const res = await client.query(
      `UPDATE case_recovery_requests SET status = 'rejected', decided_by_user_id = $2, decided_at = $3, decision_basis = 'not_verified'
        WHERE id = $1 AND status IN ('pending', 'needs_manual_verification') RETURNING case_id`,
      [requestId, admin.userId, now],
    );
    const row = res.rows[0] as { case_id: number } | undefined;
    if (!row) throw new RecoveryRejected('not_open');
    await recordAuditEvent(client, {
      businessId: null,
      actor: admin,
      action: 'case.recovery_rejected',
      details: { request_id: requestId, case_id: row.case_id },
    });
  });
}
