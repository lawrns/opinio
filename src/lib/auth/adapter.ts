import { createHash } from 'node:crypto';
import type { Adapter, AdapterSession } from 'next-auth/adapters';

/** SHA-256 hex of a session cookie value; only this is stored in `sessions`. */
export function hashSessionToken(sessionToken: string): string {
  return createHash('sha256').update(sessionToken).digest('hex');
}

const isExpired = (expires: Date, now: number) => expires.valueOf() <= now;

/**
 * Wraps the Postgres adapter with the policy Auth.js does not apply itself:
 *
 * - Session cookie values are stored hashed, so a database read does not
 *   yield a usable session. Auth.js already hashes email-link tokens.
 * - Expired means `now >= expires` (Auth.js treats the exact instant as
 *   still valid) for both email links and sessions.
 * - Sessions have an absolute lifetime: `updateSession` never extends them.
 */
export function strictAdapter(base: Adapter, now: () => number = Date.now): Adapter {
  const withRawToken = (session: AdapterSession, sessionToken: string): AdapterSession => ({
    ...session,
    sessionToken,
  });

  return {
    ...base,

    async useVerificationToken(params) {
      const invite = await base.useVerificationToken!(params);
      if (!invite || isExpired(invite.expires, now())) return null;
      return invite;
    },

    async createSession(session) {
      const created = await base.createSession!({
        ...session,
        sessionToken: hashSessionToken(session.sessionToken),
      });
      return withRawToken(created, session.sessionToken);
    },

    async getSessionAndUser(sessionToken) {
      const hashed = hashSessionToken(sessionToken);
      const found = await base.getSessionAndUser!(hashed);
      if (!found) return null;
      if (isExpired(found.session.expires, now())) {
        await base.deleteSession!(hashed);
        return null;
      }
      return { user: found.user, session: withRawToken(found.session, sessionToken) };
    },

    async updateSession() {
      // Absolute lifetime: never roll the expiry forward.
      return null;
    },

    async deleteSession(sessionToken) {
      await base.deleteSession!(hashSessionToken(sessionToken));
    },
  };
}
