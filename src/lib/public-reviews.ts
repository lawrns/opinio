// Visibility rules for reviews served on public surfaces (passport pages,
// public API, widgets). Only published reviews are public; flagged,
// under_review and removed reviews never are. Reviewer contact and the order
// or invitation a review is linked to are never part of a public payload.

export const PUBLIC_REVIEW_STATUS = 'published';

/** SQL column list for public review reads. Kept explicit: no `SELECT *`. */
export const PUBLIC_REVIEW_COLUMNS = [
  'id',
  'business_id',
  'rating',
  'title',
  'body',
  'author_name',
  'verification_level',
  'score_weight',
  'integrity_factor',
  'product_name',
  'status',
  'upvotes',
  'helpful_count',
  'created_at',
  'updated_at',
] as const;

export function publicReviewColumnsSql(alias?: string): string {
  return PUBLIC_REVIEW_COLUMNS.map((column) => (alias ? `${alias}.${column}` : column)).join(', ');
}

/** Fields that identify or reach the reviewer, or link to their order. */
const PRIVATE_REVIEW_FIELDS = ['author_masked_contact', 'order_id', 'invitation_id'] as const;

type PrivateReviewField = (typeof PRIVATE_REVIEW_FIELDS)[number];

export type PublicReview<T extends object> = Omit<T, PrivateReviewField>;

export function isPublicReview(review: { status?: unknown }): boolean {
  return review.status === PUBLIC_REVIEW_STATUS;
}

/** Copies a review without its private fields. */
export function toPublicReview<T extends object>(review: T): PublicReview<T> {
  const out = { ...review } as Record<string, unknown>;
  for (const field of PRIVATE_REVIEW_FIELDS) delete out[field];
  return out as PublicReview<T>;
}
