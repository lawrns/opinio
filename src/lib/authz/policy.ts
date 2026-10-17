/**
 * Approved authority defaults (spec #26, docs/adr/0003-auth-policy-defaults.md).
 * Centralized so every check and test uses the same numbers.
 */
export const ACCESS_LINK_TTL_MS = 15 * 60 * 1000; // buyer and merchant links
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // absolute, never extended
export const STAFF_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

export const BUSINESS_ROLES = ['owner', 'staff'] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

/** Principal types recorded as trusted audit actors (audit_logs.actor_type). */
export const ACTOR_TYPES = ['merchant_user', 'administrator', 'buyer_case_session', 'machine_key', 'system'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

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

/** Fails closed: a role other than exactly 'owner' or 'staff' allows nothing. */
export function roleAllows(role: BusinessRole, permission: BusinessPermission): boolean {
  if (role === 'owner') return true;
  if (role === 'staff') return STAFF_PERMISSIONS.has(permission);
  return false;
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

/** Login-link requests allowed per fixed window, per email and per client address. */
export const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LIMIT_PER_EMAIL = 3;
export const LOGIN_LIMIT_PER_CLIENT = 10;

/** How first-owner control was independently established (ADR 0002). */
export const EVIDENCE_METHODS = ['domain_email', 'dns', 'business_callback'] as const;
export type EvidenceMethod = (typeof EVIDENCE_METHODS)[number];

/** The applicant's documented authority to act for the business. */
export const AUTHORITY_BASES = ['legal_representative', 'owner_of_record', 'written_authorization'] as const;
export type AuthorityBasis = (typeof AUTHORITY_BASES)[number];

/** A reference to evidence kept elsewhere, e.g. VER-1042. No contacts or free text fit. */
export const EVIDENCE_REFERENCE = /^[A-Z]{2,10}-[0-9]{1,12}$/;
