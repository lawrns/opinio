import {
  isPubliclyEligible,
  computePublicAggregate,
  ReviewProvenance,
} from './review-eligibility';

export interface PublicBusinessSummary {
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface PublicWidgetPayload {
  business: PublicBusinessSummary;
  /** Average over eligible records, or null when none are eligible. */
  rating: number | null;
  /** Count of eligible records, or null when none are eligible. */
  review_count: number | null;
  /** True only when every displayed record carries a verified transaction. */
  verified_purchases: boolean;
}

/**
 * Builds the public widget payload from a business and its review provenance.
 * When no record is eligible the numeric fields are `null` — callers must render
 * "sin reseñas verificadas", never a substituted total.
 */
export function buildPublicWidgetPayload(
  business: PublicBusinessSummary,
  reviews: readonly ReviewProvenance[],
): PublicWidgetPayload {
  const aggregate = computePublicAggregate(reviews);
  const eligible = reviews.filter(isPubliclyEligible);
  return {
    business,
    rating: aggregate ? aggregate.average : null,
    review_count: aggregate ? aggregate.count : null,
    verified_purchases:
      eligible.length > 0 && eligible.every((r) => r.transaction_verified === true),
  };
}
