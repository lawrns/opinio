// Minimum-evidence gate for public scores and trust badges (BL-12, OPN-24/OPN-25).
//
// The 0-100 score is a Bayesian blend whose prior dominates small samples, so a
// single unverified review can print a number like 73.7. Below the threshold the
// stored score is left untouched but is never displayed, and the green
// "Pasaporte de confianza" badge is not shown.

/**
 * Minimum effective verified-review sample (`effective_reviews_count`, n_eff)
 * required before a 0-100 score or the green passport badge is shown.
 * Conservative default of 5, taken from the audit recommendation (OPN-24).
 * Founder decision pending: change only here.
 */
export const MIN_EVIDENCE_SAMPLE = 5;

/** True when the effective sample is large enough to publish a score or badge. */
export function meetsEvidenceThreshold(effectiveSampleSize: number | string | null | undefined): boolean {
  const n = Number(effectiveSampleSize);
  return Number.isFinite(n) && n >= MIN_EVIDENCE_SAMPLE;
}

/**
 * The score to display, or null when evidence is below the threshold or the
 * score is missing/non-numeric. Never alters the stored value.
 */
export function displayableScore(
  score: number | string | null | undefined,
  effectiveSampleSize: number | string | null | undefined
): number | null {
  if (score === null || score === undefined || score === '') return null;
  const value = Number(score);
  return Number.isFinite(value) && meetsEvidenceThreshold(effectiveSampleSize) ? value : null;
}
