import type { Db } from '@/lib/authz';
import { hashSecret } from '@/lib/authz/secrets';
import { LOGIN_LIMIT_PER_CLIENT, LOGIN_LIMIT_PER_EMAIL, LOGIN_RATE_WINDOW_MS } from '@/lib/authz/policy';

/** Counts one hit in a fixed window and reports whether it is within `limit`. */
async function hit(db: Db, bucket: string, limit: number, now: Date): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.valueOf() / LOGIN_RATE_WINDOW_MS) * LOGIN_RATE_WINDOW_MS);
  const { rows } = await db.query(
    `INSERT INTO auth_rate_limits (bucket, window_start, hits) VALUES ($1, $2, 1)
     ON CONFLICT (bucket, window_start) DO UPDATE SET hits = auth_rate_limits.hits + 1
     RETURNING hits`,
    [hashSecret(bucket), windowStart],
  );
  return (rows[0] as { hits: number }).hits <= limit;
}

/**
 * Whether another login link may be sent now, for this email and client.
 * Both counters advance on every request, so a blocked caller cannot keep
 * probing. Buckets are stored hashed.
 */
export async function allowLoginLink(
  db: Db,
  input: { email: string; client: string },
  now: Date = new Date(),
): Promise<boolean> {
  const email = await hit(db, `login-email:${input.email.trim().toLowerCase()}`, LOGIN_LIMIT_PER_EMAIL, now);
  const client = await hit(db, `login-client:${input.client}`, LOGIN_LIMIT_PER_CLIENT, now);
  return email && client;
}
