// Minimum-evidence gate for public scores and trust badges (BL-12, OPN-24/OPN-25).
//
// The 0-100 score is a Bayesian blend whose prior dominates small samples, so a
// single unverified review can print a number like 73.7. The gate counts
// VERIFIED reviews only: `effective_reviews_count` is a Kish n_eff over all
// published reviews (weights cancel), so anonymous unverified reviews would
// unlock it. Below the threshold the stored score is untouched but never
// displayed, and the green passport badges are replaced by a neutral variant.

/**
 * Minimum number of verified reviews (any verification_level other than
 * 'unverified_experience', see scoring.ts) required before a 0-100 score or a
 * green passport badge is shown. Set to 1 by founder decision (Laurence):
 * a score needs at least one verified review, and unverified-only profiles stay
 * hidden. Change only here.
 */
export const MIN_EVIDENCE_SAMPLE = 1;

/** SQL predicate (on the reviews table) for a verified published review. */
export const VERIFIED_REVIEW_SQL = `verification_level <> 'unverified_experience'`;

/** Counts verified reviews from their verification levels. */
export function countVerifiedReviews(reviews: Array<{ verification_level?: string | null }>): number {
  return reviews.filter((r) => r.verification_level && r.verification_level !== 'unverified_experience').length;
}

import type { CalculatedTrustPassport } from './scoring';

/**
 * True when the verified-review count is large enough to publish a score or
 * badge. Fails closed when the count is absent.
 */
export function meetsEvidenceThreshold(
  verifiedCount: number | string | null | undefined,
  minSample: number = MIN_EVIDENCE_SAMPLE
): boolean {
  if (verifiedCount === null || verifiedCount === undefined || verifiedCount === '') return false;
  const n = Number(verifiedCount);
  return Number.isFinite(n) && n >= minSample;
}

/**
 * The score to display, or null when verified evidence is below the threshold
 * or the score is missing/non-numeric. Never alters the stored value.
 */
export function displayableScore(
  score: number | string | null | undefined,
  verifiedCount: number | string | null | undefined,
  minSample: number = MIN_EVIDENCE_SAMPLE
): number | null {
  if (score === null || score === undefined || score === '') return null;
  const value = Number(score);
  return Number.isFinite(value) && meetsEvidenceThreshold(verifiedCount, minSample) ? value : null;
}

export type PublicTrustPassport = Omit<
  CalculatedTrustPassport,
  'opinioScore' | 'experienceScore' | 'resolutionScore'
> & {
  opinioScore: number | null;
  experienceScore: number | null;
  resolutionScore: number | null;
};

/**
 * Gates every score-bearing component of a calculated passport (`opinioScore`,
 * `experienceScore`, `resolutionScore`) behind the verified-review threshold so
 * withheld composite scores cannot leak via component fields.
 */
export function displayablePassport(
  passport: CalculatedTrustPassport,
  verifiedCount: number | string | null | undefined,
  minSample: number = MIN_EVIDENCE_SAMPLE
): PublicTrustPassport {
  return {
    ...passport,
    opinioScore: displayableScore(passport.opinioScore, verifiedCount, minSample),
    experienceScore: displayableScore(passport.experienceScore, verifiedCount, minSample),
    resolutionScore: displayableScore(passport.resolutionScore, verifiedCount, minSample),
  };
}

