import { describe, expect, it } from 'vitest';
import type { Adapter, AdapterSession, AdapterUser, VerificationToken } from 'next-auth/adapters';
import { hashSessionToken, strictAdapter } from './adapter';

// In-memory stand-in for the Postgres adapter; the real one is exercised end
// to end in src/test/e2e/authjs-spike.e2e.test.ts. This pins the exact
// expiry instant with a controlled clock.
function memoryAdapter() {
  const sessions = new Map<string, AdapterSession>();
  const tokens = new Map<string, VerificationToken>();
  const user: AdapterUser = { id: '1', email: 'owner@example.test', emailVerified: null };
  const base: Adapter = {
    async createSession(s) { sessions.set(s.sessionToken, s); return s; },
    async getSessionAndUser(t) { const s = sessions.get(t); return s ? { session: s, user } : null; },
    async updateSession(s) { const cur = sessions.get(s.sessionToken)!; const next = { ...cur, ...s }; sessions.set(s.sessionToken, next); return next; },
    async deleteSession(t) { sessions.delete(t); },
    async createVerificationToken(v) { tokens.set(v.token, v); return v; },
    async useVerificationToken({ token }) { const v = tokens.get(token) ?? null; tokens.delete(token); return v; },
  };
  return { base, sessions, tokens };
}

const T0 = Date.UTC(2026, 9, 17, 12, 0, 0);

describe('strictAdapter', () => {
  it('stores only the hash of the session cookie and returns the raw value to Auth.js', async () => {
    const { base, sessions } = memoryAdapter();
    const adapter = strictAdapter(base, () => T0);
    const created = await adapter.createSession!({ sessionToken: 'raw-cookie', userId: '1', expires: new Date(T0 + 1000) });
    expect(created.sessionToken).toBe('raw-cookie');
    expect([...sessions.keys()]).toEqual([hashSessionToken('raw-cookie')]);
    expect((await adapter.getSessionAndUser!('raw-cookie'))?.session.sessionToken).toBe('raw-cookie');
    expect(await adapter.getSessionAndUser!(hashSessionToken('raw-cookie'))).toBeNull();
  });

  it('treats a session as expired at the exact expiry instant and deletes it', async () => {
    const { base, sessions } = memoryAdapter();
    let now = T0;
    const adapter = strictAdapter(base, () => now);
    await adapter.createSession!({ sessionToken: 'c', userId: '1', expires: new Date(T0 + 1000) });
    now = T0 + 999;
    expect(await adapter.getSessionAndUser!('c')).not.toBeNull();
    now = T0 + 1000;
    expect(await adapter.getSessionAndUser!('c')).toBeNull();
    expect(sessions.size).toBe(0);
  });

  it('never extends a session (absolute lifetime)', async () => {
    const { base, sessions } = memoryAdapter();
    const adapter = strictAdapter(base, () => T0);
    await adapter.createSession!({ sessionToken: 'c', userId: '1', expires: new Date(T0 + 1000) });
    await adapter.updateSession!({ sessionToken: 'c', expires: new Date(T0 + 999_999) });
    expect(sessions.get(hashSessionToken('c'))?.expires.valueOf()).toBe(T0 + 1000);
  });

  it('rejects an email link at the exact expiry instant and consumes it either way', async () => {
    const { base, tokens } = memoryAdapter();
    let now = T0 + 1000;
    const adapter = strictAdapter(base, () => now);
    await base.createVerificationToken!({ identifier: 'a@example.test', token: 'h1', expires: new Date(T0 + 1000) });
    expect(await adapter.useVerificationToken!({ identifier: 'a@example.test', token: 'h1' })).toBeNull();
    expect(tokens.size).toBe(0);

    now = T0 + 999;
    await base.createVerificationToken!({ identifier: 'a@example.test', token: 'h2', expires: new Date(T0 + 1000) });
    expect(await adapter.useVerificationToken!({ identifier: 'a@example.test', token: 'h2' })).not.toBeNull();
    expect(await adapter.useVerificationToken!({ identifier: 'a@example.test', token: 'h2' })).toBeNull();
  });
});
