/**
 * Approved authority defaults (spec #26, docs/adr/0003-auth-policy-defaults.md).
 * Centralized so every check and test uses the same numbers.
 */
export const ACCESS_LINK_TTL_MS = 15 * 60 * 1000; // buyer and merchant links
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // absolute, never extended
export const STAFF_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Expired means the current time is at or beyond the expiry. */
export function isExpired(expiresAt: Date, now: Date): boolean {
  return now.valueOf() >= expiresAt.valueOf();
}

export type BusinessRole = 'owner' | 'staff';

/** What a business member may do. Owners hold every staff permission. */
export type BusinessPermission =
  | 'read_operational'
  | 'reply'
  | 'offer_remedy'
  | 'create_invitation'
  | 'manage_settings'
  | 'manage_widgets'
  | 'manage_staff'
  | 'manage_keys';

const STAFF_PERMISSIONS: ReadonlySet<BusinessPermission> = new Set([
  'read_operational',
  'reply',
  'offer_remedy',
  'create_invitation',
]);

export function roleAllows(role: BusinessRole, permission: BusinessPermission): boolean {
  return role === 'owner' || STAFF_PERMISSIONS.has(permission);
}

/** Operations a business machine key can be scoped to. */
export const MACHINE_SCOPES = ['order_events', 'invitations'] as const;
export type MachineScope = (typeof MACHINE_SCOPES)[number];

/**
 * Cookie rules for buyer case sessions: host-only (no Domain), HttpOnly,
 * SameSite=Lax, server-side expiry. Over HTTPS the `__Host-` prefix makes the
 * browser enforce Secure, Path=/ and no Domain. One cookie per case keeps
 * multiple case grants independent.
 */
export function caseSessionCookieName(caseId: number, secure: boolean): string {
  return `${secure ? '__Host-' : ''}opinio_case_${caseId}`;
}

export function caseSessionCookieOptions(secure: boolean, expiresAt: Date) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
