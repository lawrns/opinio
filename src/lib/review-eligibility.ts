/**
 * Public review eligibility and aggregation (Opinio).
 *
 * Evidence rule: a record may be displayed publicly as a customer review only when
 * there is evidence of customer authorship (`customer_authored === true`) or a
 * verified transaction (`transaction_verified === true`). Owner attestation and
 * `provenance_source` are provenance metadata: they NEVER make a record eligible and
 * never license a "verified purchase" label.
 *
 * Aggregates are computed only over eligible records and return `null` when there are
 * none — a missing number is never replaced by a hardcoded baseline or a total that
 * includes ineligible rows.
 */

export interface ReviewProvenance {
  id: number;
  rating: number;
  status: string;
  customer_authored: boolean | null;
  transaction_verified: boolean;
  owner_attested: boolean;
  provenance_source: string | null;
}

export interface PublicAggregate {
  count: number;
  average: number;
}

const PUBLISHED = 'published';

export function isPubliclyEligible(review: ReviewProvenance): boolean {
  if (review.status !== PUBLISHED) return false;
  return review.customer_authored === true || review.transaction_verified === true;
}

/** A "verified purchase" claim is only admissible on a verified transaction. */
export function showVerifiedPurchaseLabel(review: ReviewProvenance): boolean {
  return review.status === PUBLISHED && review.transaction_verified === true;
}

/**
 * Aggregate over eligible records only. Returns `null` (not 0, not a baseline) when
 * no record is eligible, so callers must render "no reviews yet" rather than a number.
 */
export function computePublicAggregate(
  reviews: readonly ReviewProvenance[],
): PublicAggregate | null {
  const eligible = reviews.filter(isPubliclyEligible);
  if (eligible.length === 0) return null;
  const total = eligible.reduce((sum, r) => {
    const rating = Number.isFinite(r.rating) ? Math.round(r.rating) : 1;
    return sum + Math.min(5, Math.max(1, rating));
  }, 0);
  return {
    count: eligible.length,
    average: Math.round((total / eligible.length) * 100) / 100,
  };
}
