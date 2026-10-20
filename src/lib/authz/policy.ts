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

/**
 * Login-link requests allowed per fixed window. A client address gets 10;
 * one address asking for one email gets 3; one email gets 10 in total, so a
 * single stranger cannot lock someone out while email bombing stays bounded.
 */
export const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LIMIT_PER_CLIENT = 10;
export const LOGIN_LIMIT_PER_EMAIL_AND_CLIENT = 3;
export const LOGIN_LIMIT_PER_EMAIL = 10;
/** Staff invitation emails a business may send per window. */
export const STAFF_INVITATION_EMAILS_PER_WINDOW = 10;
/** Buyer access-link resends allowed per window, per case and per client address. */
export const CASE_LINK_RESENDS_PER_CASE = 3;
export const CASE_LINK_RESENDS_PER_CLIENT = 10;
/** New cases with an access email per window: per client address and per access email (each sends one email). */
export const CASE_CREATIONS_PER_CLIENT = 5;
export const CASE_CREATIONS_PER_EMAIL = 3;
/** Legacy recovery requests per client address per window. */
export const CASE_RECOVERY_REQUESTS_PER_CLIENT = 10;
/** How an administrator verified a legacy recovery out of band (ADR 0005). */
export const RECOVERY_BASES = ['order_record', 'merchant_record', 'buyer_callback', 'other_documented'] as const;
export type RecoveryBasis = (typeof RECOVERY_BASES)[number];
/** A Mexican phone contact: digits with optional + and separators, 10–15 digits. Never an email. */
export const PHONE_CONTACT = /^\+?[\d\s()-]{10,20}$/;

/** RFC 5321 caps a forward path at 254 characters. */
export const MAX_EMAIL_LENGTH = 254;
// Linear: the local part cannot hold '@' and each domain label cannot hold '.'.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * A normalized email address from untrusted input, or null. The length is
 * checked before any pattern runs, so a huge body costs nothing.
 */
export function parseEmail(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > MAX_EMAIL_LENGTH + 64) return null;
  const email = input.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email)) return null;
  return email;
}

/** How first-owner control was independently established (ADR 0002). */
export const EVIDENCE_METHODS = ['domain_email', 'dns', 'business_callback'] as const;
export type EvidenceMethod = (typeof EVIDENCE_METHODS)[number];

/** The applicant's documented authority to act for the business. */
export const AUTHORITY_BASES = ['legal_representative', 'owner_of_record', 'written_authorization'] as const;
export type AuthorityBasis = (typeof AUTHORITY_BASES)[number];

/** A reference to evidence kept elsewhere, e.g. VER-1042. No contacts or free text fit. */
export const EVIDENCE_REFERENCE = /^[A-Z]{2,10}-[0-9]{1,12}$/;

/**
 * What was checked for each method: the domain for domain_email and dns, the
 * business's own phone number (E.164) for business_callback. Mirrors the
 * ownership_approvals_documented CHECK in migration 0003.
 */
export const EVIDENCE_SUBJECT: Record<EvidenceMethod, RegExp> = {
  domain_email: /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
  dns: /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
  business_callback: /^\+[0-9]{8,15}$/,
};

/** Public review submissions allowed per client address in a sliding hour (BL-04). */
export const REVIEWS_PER_CLIENT_PER_HOUR = 3;
