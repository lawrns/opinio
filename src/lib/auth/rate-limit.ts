import type { Db } from '@/lib/authz';
import { hashSecret } from '@/lib/authz/secrets';
import {
  LOGIN_LIMIT_PER_CLIENT,
  LOGIN_LIMIT_PER_EMAIL,
  LOGIN_LIMIT_PER_EMAIL_AND_CLIENT,
  LOGIN_RATE_WINDOW_MS,
  STAFF_INVITATION_EMAILS_PER_WINDOW,
} from '@/lib/authz/policy';

const windowStart = (now: Date) => new Date(Math.floor(now.valueOf() / LOGIN_RATE_WINDOW_MS) * LOGIN_RATE_WINDOW_MS);

/** Counts one hit in the current fixed window and reports whether it is within `limit`. */
async function hit(db: Db, bucket: string, limit: number, now: Date): Promise<boolean> {
  const { rows } = await db.query(
    `INSERT INTO auth_rate_limits (bucket, window_start, hits) VALUES ($1, $2, 1)
     ON CONFLICT (bucket, window_start) DO UPDATE SET hits = auth_rate_limits.hits + 1
     RETURNING hits`,
    [hashSecret(bucket), windowStart(now)],
  );
  return (rows[0] as { hits: number }).hits <= limit;
}

/**
 * Whether another login link may be sent now, for this email and client.
 * The client counter runs first and a client over its limit counts against
 * no email, so one stranger cannot lock a person out. A blocked caller keeps
 * advancing its own counter, so it cannot keep probing. Buckets are stored
 * hashed, and windows older than the previous one are deleted as it goes.
 */
export async function allowLoginLink(
  db: Db,
  input: { email: string; client: string },
  now: Date = new Date(),
): Promise<boolean> {
  await db.query('DELETE FROM auth_rate_limits WHERE window_start < $1', [
    new Date(windowStart(now).valueOf() - LOGIN_RATE_WINDOW_MS),
  ]);
  const email = input.email.trim().toLowerCase();
  if (!(await hit(db, `login-client:${input.client}`, LOGIN_LIMIT_PER_CLIENT, now))) return false;
  if (!(await hit(db, `login-email-client:${email}|${input.client}`, LOGIN_LIMIT_PER_EMAIL_AND_CLIENT, now))) return false;
  return hit(db, `login-email:${email}`, LOGIN_LIMIT_PER_EMAIL, now);
}

/**
 * The client address as seen by the one reverse proxy in front of the app,
 * which appends it as the last X-Forwarded-For entry. Entries to its left
 * come from the caller and are ignored.
 */
export function clientAddress(forwardedFor: string | null): string {
  const last = (forwardedFor ?? '').split(',').at(-1)?.trim() ?? '';
  return last && last.length <= 64 ? last : 'unknown';
}

/** Whether a business may send another staff invitation email in this window. */
export async function allowStaffInvitationEmail(db: Db, businessId: number, now: Date = new Date()): Promise<boolean> {
  return hit(db, `staff-invite:${businessId}`, STAFF_INVITATION_EMAILS_PER_WINDOW, now);
}
