import { describe, expect, it } from 'vitest';
import {
  ACCESS_LINK_TTL_MS,
  SESSION_TTL_MS,
  STAFF_INVITATION_TTL_MS,
  caseSessionCookieName,
  caseSessionCookieOptions,
  roleAllows,
} from './policy';
import { generateMachineKey, generateSecret, hashSecret } from './secrets';

describe('authority policy', () => {
  it('pins the approved lifetimes', () => {
    expect(ACCESS_LINK_TTL_MS).toBe(15 * 60_000);
    expect(SESSION_TTL_MS).toBe(7 * 86_400_000);
    expect(STAFF_INVITATION_TTL_MS).toBe(86_400_000);
  });

  it('gives staff operational work only and owners everything', () => {
    for (const p of ['read_operational', 'reply', 'offer_remedy', 'create_invitation'] as const) {
      expect(roleAllows('staff', p)).toBe(true);
    }
    for (const p of ['manage_settings', 'manage_widgets', 'manage_staff', 'manage_keys'] as const) {
      expect(roleAllows('staff', p)).toBe(false);
      expect(roleAllows('owner', p)).toBe(true);
    }
  });

  it('denies every permission to a role it does not know', () => {
    for (const role of ['admin', 'Owner', 'STAFF', '', 'revoked', null, undefined]) {
      expect(roleAllows(role as never, 'read_operational')).toBe(false);
    }
  });

  it('issues host-only HttpOnly case cookies, __Host- prefixed over HTTPS, one per case', () => {
    const expires = new Date('2026-10-24T12:00:00.000Z');
    expect(caseSessionCookieName(7, true)).toBe('__Host-opinio_case_7');
    expect(caseSessionCookieName(8, false)).toBe('opinio_case_8');
    const options = caseSessionCookieOptions(true, expires);
    expect(options).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires });
    expect(options).not.toHaveProperty('domain');
  });

  it('generates 32-byte secrets and stores only their digest', () => {
    const secret = generateSecret();
    expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
    expect(hashSecret(secret)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecret(secret)).not.toContain(secret);
    const { key, prefix } = generateMachineKey();
    expect(key.startsWith(`opk_${prefix}_`)).toBe(true);
  });
});
