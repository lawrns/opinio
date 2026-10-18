import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { assertAuthorityReachable } from '@/lib/authz';

/** Auth.js database-session cookie names (plain and HTTPS). */
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

/**
 * The signed-in merchant user's ID from the database session, or null.
 * Auth.js reports a failed session lookup as "no session", so when a session
 * cookie was sent and no session came back, the store is probed: an outage
 * throws AuthorityUnavailable (503) instead of passing as a sign-out (401).
 */
export async function currentMerchantUserId(): Promise<number | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (Number.isSafeInteger(id) && id > 0) return id;
  const jar = await cookies();
  if (SESSION_COOKIES.some((name) => jar.has(name))) await assertAuthorityReachable(pool);
  return null;
}

// Kept here for existing imports; the helper lives in a module without Auth.js.
export { servedOverHttps } from '@/lib/authz/https';
