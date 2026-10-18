// Public case and review writes (no buyer or merchant credential yet) accept
// no client-supplied trust fields: anything that would set verification,
// status, a resolution, a purchase or review link, or who is speaking is
// decided by the server. A request that tries to set one is refused (403)
// before any write, rather than silently ignored, so a forged or stale client
// can't believe it succeeded. Buyer binding to a case comes later (B06).

export const TRUST_FIELD_ERROR = 'Esta solicitud incluye campos que solo Opinio puede establecer.';

/** Fields a public case POST may never set. */
export const CASE_TRUST_FIELDS = [
  'status',
  'is_consumer_confirmed',
  'remedy_offered',
  'resolution_summary',
  'median_first_response_minutes',
  'total_resolution_hours',
  'resolved_at',
  'case_number',
  'order_id',
  'review_id',
  'verified',
  'is_verified',
  'verification_level',
  'role',
  'merchant',
  'sender_type',
] as const;

/**
 * Fields a public review POST may never set. `order_id` and a raised
 * `verification_level` are purchase claims: refused while the
 * `review_claimed_verification` containment switch is off (src/lib/containment.ts).
 */
export const REVIEW_TRUST_FIELDS = [
  'status',
  'score_weight',
  'integrity_factor',
  'invitation_id',
  'upvotes',
  'helpful_count',
  'verified',
  'is_verified',
  'role',
  'merchant',
] as const;

export const REVIEW_CLAIM_FIELDS = ['order_id'] as const;

/** The review form's own level; any other value is a verification claim. */
export const PUBLIC_REVIEW_LEVEL = 'unverified_experience';

const isSet = (value: unknown) => value !== undefined && value !== null;

/** Names of the listed fields this body tries to set (null and absent are not set). */
export function trustFieldsIn(body: unknown, fields: readonly string[]): string[] {
  if (!body || typeof body !== 'object') return [];
  const record = body as Record<string, unknown>;
  return fields.filter((field) => Object.prototype.hasOwnProperty.call(record, field) && isSet(record[field]));
}

/** Review trust fields set by the body; purchase claims count only while claims are not trusted. */
export function reviewTrustFieldsIn(body: unknown, trustClaims: boolean): string[] {
  const found = trustFieldsIn(body, REVIEW_TRUST_FIELDS);
  if (trustClaims || !body || typeof body !== 'object') return found;
  const record = body as Record<string, unknown>;
  const claims = trustFieldsIn(body, REVIEW_CLAIM_FIELDS);
  if (isSet(record.verification_level) && record.verification_level !== PUBLIC_REVIEW_LEVEL) claims.push('verification_level');
  return [...found, ...claims];
}
