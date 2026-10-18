/**
 * Buyer case access (B06, issue #32). A case's private access email receives
 * a single-use link (32 random bytes, stored as SHA-256, 15 minutes). The
 * buyer exchanges it, by a same-origin POST, for a server-revocable session
 * for that one case (7 absolute days). Nothing here confirms or changes the
 * case; buyer confirmation stays blocked until its own ticket.
 */
import type { Pool, PoolClient } from 'pg';
import { recordAuditEvent, type Db } from '@/lib/authz';
import {
  ACCESS_LINK_TTL_MS,
  CASE_LINK_RESENDS_PER_CASE,
  CASE_LINK_RESENDS_PER_CLIENT,
  SESSION_TTL_MS,
  parseEmail,
} from '@/lib/authz/policy';
import { generateSecret, hashSecret } from '@/lib/authz/secrets';
import { inTransaction } from '@/lib/authz/transaction';
import { allowCaseLinkResend } from '@/lib/auth/rate-limit';

const TOKEN = /^[A-Za-z0-9_-]{40,60}$/;

/** Creates a fresh access token for `caseId` inside the caller's transaction; returns the raw token once. */
export async function issueCaseAccessToken(
  client: PoolClient | Db,
  caseId: number,
  now: Date = new Date(),
): Promise<{ tokenId: number; token: string }> {
  const token = generateSecret();
  const { rows } = await client.query(
    `INSERT INTO case_access_tokens (case_id, token_hash, purpose, expires_at, created_at)
     VALUES ($1, $2, 'access', $3, $4) RETURNING id`,
    [caseId, hashSecret(token), new Date(now.valueOf() + ACCESS_LINK_TTL_MS), now],
  );
  return { tokenId: (rows[0] as { id: number }).id, token };
}

/** Records what the mail transport answered for a token. Acceptance is not inbox delivery. */
export async function recordTransportOutcome(db: Db, tokenId: number, accepted: boolean, now: Date = new Date()): Promise<void> {
  await db.query(
    `UPDATE case_access_tokens SET ${accepted ? 'transport_accepted_at' : 'transport_failed_at'} = $2 WHERE id = $1`,
    [tokenId, now],
  );
}

export class CaseAccessRejected extends Error {
  constructor() {
    super('invalid_link');
    this.name = 'CaseAccessRejected';
  }
}

/**
 * Consumes a link and creates the case session in one transaction. The
 * conditional UPDATE lets exactly one of several simultaneous exchanges win;
 * a replayed, expired, superseded or unknown link raises CaseAccessRejected.
 */
export async function exchangeCaseAccessToken(
  db: Pool,
  rawToken: unknown,
  now: Date = new Date(),
): Promise<{ caseId: number; sessionToken: string; expiresAt: Date }> {
  if (typeof rawToken !== 'string' || !TOKEN.test(rawToken)) throw new CaseAccessRejected();
  return inTransaction(db, async (client) => {
    const consumed = (
      await client.query(
        `UPDATE case_access_tokens SET consumed_at = $2
          WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > $2
          RETURNING id, case_id`,
        [hashSecret(rawToken), now],
      )
    ).rows[0] as { id: number; case_id: number } | undefined;
    if (!consumed) throw new CaseAccessRejected();
    const sessionToken = generateSecret();
    const expiresAt = new Date(now.valueOf() + SESSION_TTL_MS);
    const sessionId: number = (
      await client.query(
        `INSERT INTO case_sessions (case_id, session_hash, access_token_id, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [consumed.case_id, hashSecret(sessionToken), consumed.id, expiresAt, now],
      )
    ).rows[0].id;
    await recordAuditEvent(client, {
      businessId: null,
      actor: { type: 'buyer_case_session', sessionId, caseId: consumed.case_id },
      action: 'case_session.created',
      details: { case_id: consumed.case_id, access_token_id: consumed.id },
    });
    return { caseId: consumed.case_id, sessionToken, expiresAt };
  });
}

/** Ends a buyer's session for `caseId` (the buyer signing out of that case). Unknown sessions change nothing. */
export async function revokeCaseSession(db: Db, rawSession: string | null | undefined, caseId: number, now: Date = new Date()): Promise<boolean> {
  if (!rawSession || rawSession.length > 200) return false;
  const revoked = (
    await db.query(
      `UPDATE case_sessions SET revoked_at = $3
        WHERE session_hash = $1 AND case_id = $2 AND revoked_at IS NULL RETURNING id`,
      [hashSecret(rawSession), caseId, now],
    )
  ).rows[0] as { id: number } | undefined;
  if (!revoked) return false;
  await recordAuditEvent(db, {
    businessId: null,
    actor: { type: 'buyer_case_session', sessionId: revoked.id, caseId },
    action: 'case_session.revoked',
    details: { case_id: caseId },
  });
  return true;
}

/**
 * A buyer asks for a new link by case number and access email. Always looks
 * the same to the caller. When both match and the limits allow, earlier
 * unused links are retired and a new one is returned (to be emailed to the
 * stored address, never to the one typed). Bounded per case and per client.
 */
export async function requestCaseLinkResend(
  db: Pool,
  input: { caseNumber: unknown; email: unknown; client: string },
  now: Date = new Date(),
): Promise<{ email: string; token: string; tokenId: number } | null> {
  const email = parseEmail(input.email);
  const caseNumber = typeof input.caseNumber === 'string' && input.caseNumber.length <= 50 ? input.caseNumber.trim() : '';
  if (!(await allowCaseLinkResend(db, { scope: 'client', key: input.client, limit: CASE_LINK_RESENDS_PER_CLIENT }, now))) return null;
  if (!email || !caseNumber) return null;
  return inTransaction(db, async (client) => {
    const row = (
      await client.query(
        'SELECT id, access_email FROM resolution_cases WHERE case_number = $1 AND access_email IS NOT NULL FOR UPDATE',
        [caseNumber],
      )
    ).rows[0] as { id: number; access_email: string } | undefined;
    if (!row || row.access_email.toLowerCase() !== email) return null;
    if (!(await allowCaseLinkResend(client, { scope: 'case', key: String(row.id), limit: CASE_LINK_RESENDS_PER_CASE }, now))) return null;
    await client.query(
      'UPDATE case_access_tokens SET consumed_at = $2 WHERE case_id = $1 AND consumed_at IS NULL',
      [row.id, now],
    );
    const issued = await issueCaseAccessToken(client, row.id, now);
    return { email: row.access_email, ...issued };
  });
}
