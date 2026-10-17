import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
  cookies: [] as string[],
  dbUp: true,
}));

vi.mock('@/auth', () => ({ auth: async () => state.session }));
vi.mock('next/headers', () => ({ cookies: async () => ({ has: (name: string) => state.cookies.includes(name) }) }));
vi.mock('@/lib/db', () => ({
  pool: {
    query: async () => {
      if (!state.dbUp) throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    },
  },
}));

const { currentMerchantUserId, servedOverHttps } = await import('./session');
const { AuthorityUnavailable } = await import('@/lib/authz');

beforeEach(() => {
  Object.assign(state, { session: null, cookies: [], dbUp: true });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('currentMerchantUserId', () => {
  it('returns the session user', async () => {
    state.session = { user: { id: '42' } };
    expect(await currentMerchantUserId()).toBe(42);
  });

  it('is null with no session cookie, even while the store is down', async () => {
    state.dbUp = false;
    expect(await currentMerchantUserId()).toBeNull();
  });

  it('is null for a session cookie the store rejects', async () => {
    state.cookies = ['authjs.session-token'];
    expect(await currentMerchantUserId()).toBeNull();
  });

  it('reports an outage, not a sign-out, when a session cookie cannot be checked', async () => {
    for (const name of ['authjs.session-token', '__Secure-authjs.session-token']) {
      Object.assign(state, { cookies: [name], dbUp: false });
      await expect(currentMerchantUserId()).rejects.toBeInstanceOf(AuthorityUnavailable);
    }
  });
});

describe('servedOverHttps', () => {
  it('follows AUTH_URL when set', () => {
    vi.stubEnv('AUTH_URL', 'https://opinio.example');
    expect(servedOverHttps()).toBe(true);
    vi.stubEnv('AUTH_URL', 'http://localhost:3000');
    expect(servedOverHttps()).toBe(false);
  });

  it('assumes HTTPS in production when AUTH_URL is missing', () => {
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(servedOverHttps()).toBe(true);
    vi.stubEnv('NODE_ENV', 'development');
    expect(servedOverHttps()).toBe(false);
  });
});
