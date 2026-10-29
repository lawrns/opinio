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

/**
 * True when the verified-review count is large enough to publish a score or
 * badge. Fails closed when the count is absent.
 */
export function meetsEvidenceThreshold(verifiedCount: number | string | null | undefined): boolean {
  if (verifiedCount === null || verifiedCount === undefined || verifiedCount === '') return false;
  const n = Number(verifiedCount);
  return Number.isFinite(n) && n >= MIN_EVIDENCE_SAMPLE;
}

/**
 * The score to display, or null when verified evidence is below the threshold
 * or the score is missing/non-numeric. Never alters the stored value.
 */
export function displayableScore(
  score: number | string | null | undefined,
  verifiedCount: number | string | null | undefined
): number | null {
  if (score === null || score === undefined || score === '') return null;
  const value = Number(score);
  return Number.isFinite(value) && meetsEvidenceThreshold(verifiedCount) ? value : null;
}

export type PublicScoreComponents = {
  opinioScore: number | null;
  experienceScore: number | null;
  resolutionScore: number | null;
};

/**
 * When the overall score is withheld, component scores are withheld too.
 * Fewer than five cases makes experienceScore equal the composite, so leaving
 * it numeric would publish the score the public aliases already null out.
 */
export function redactWithheldScoreComponents<T extends PublicScoreComponents>(
  passport: T,
  publicScore: number | null,
): T {
  if (publicScore !== null) {
    return { ...passport, opinioScore: publicScore };
  }
  return {
    ...passport,
    opinioScore: null,
    experienceScore: null,
    resolutionScore: null,
  };
}
