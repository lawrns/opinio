export interface ReviewCalculationItem {
  rating: number; // 1 to 5
  verificationLevel: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  ageDays: number;
  integrityFactor?: number; // 0.70 to 1.15, default 1.00
}

export interface ResolutionMetricsInput {
  casesCount: number;
  consumerConfirmedCount: number;
  merchantRespondedCount: number;
  medianResponseHours: number;
  targetResponseHours?: number; // default 24h
  reopenedCount: number;
}

export interface CalculatedTrustPassport {
  opinioScore: number; // 0 to 100
  experienceScore: number; // 0 to 100
  resolutionScore: number | null; // 0 to 100 (null if < 5 cases)
  confidenceLevel: 'preliminary' | 'established' | 'strong' | 'very_strong';
  effectiveSampleSize: number;
  coveragePercentage: number;
  issuesPerThousand: number;
  resolutionRate: number; // consumer confirmed %
}

// Verification weights according to spec Section 6.2
export const VERIFICATION_WEIGHTS = {
  confirmed_payment: 1.00,
  confirmed_store_order: 0.90,
  reviewed_proof: 0.75,
  unverified_experience: 0.35,
} as const;

/**
 * Calculates Bayesian Experience Score and Resolution Score according to Opinio Spec Section 7.
 */
export function calculateOpinioScore(
  reviews: ReviewCalculationItem[],
  resolution: ResolutionMetricsInput,
  observedOrdersCount: number,
  invitedOrdersCount: number,
  categoryBaseline: number = 75,
  priorWeight: number = 20
): CalculatedTrustPassport {
  // 1. Experience Score Calculation
  let sumWeightedScores = 0;
  let sumWeights = 0;
  let sumSquaredWeights = 0;

  for (const review of reviews) {
    // x_i = 25 * (rating - 1) -> 1 star = 0, 5 stars = 100
    const xi = 25 * Math.max(1, Math.min(5, review.rating) - 1);
    const vi = VERIFICATION_WEIGHTS[review.verificationLevel] ?? 0.35;
    // Recency decay d_i = max(0.25, 2^(-age/365))
    const di = Math.max(0.25, Math.pow(2, -review.ageDays / 365));
    const qi = Math.max(0.70, Math.min(1.15, review.integrityFactor ?? 1.0));

    const wi = vi * di * qi;

    sumWeightedScores += wi * xi;
    sumWeights += wi;
    sumSquaredWeights += wi * wi;
  }

  // Bayesian average E = (C * m + sum(w_i * x_i)) / (C + sum(w_i))
  const experienceScore = Math.round(
    ((priorWeight * categoryBaseline + sumWeightedScores) / (priorWeight + sumWeights)) * 10
  ) / 10;

  // Effective sample size n_eff = (sum w_i)^2 / sum(w_i^2)
  const effectiveSampleSize = sumSquaredWeights > 0
    ? Math.round((Math.pow(sumWeights, 2) / sumSquaredWeights) * 10) / 10
    : 0;

  // 2. Resolution Score Calculation (Only when cases >= 5)
  let resolutionScore: number | null = null;
  let resolutionRate = 0;

  if (resolution.casesCount >= 5) {
    const confirmedRate = resolution.consumerConfirmedCount / resolution.casesCount;
    const responseRate = resolution.merchantRespondedCount / resolution.casesCount;
    
    // Category-adjusted speed: score from 0 to 1 based on response within target hours
    const targetHours = resolution.targetResponseHours || 24;
    const speedFactor = Math.max(0, Math.min(1, 1 - (resolution.medianResponseHours / (targetHours * 2))));
    
    const reopenRate = resolution.reopenedCount / resolution.casesCount;

    // R = 0.40(consumer-confirmed) + 0.25(response rate) + 0.20(speed) + 0.15(1 - reopen rate)
    const rawR = (0.40 * confirmedRate + 0.25 * responseRate + 0.20 * speedFactor + 0.15 * (1 - reopenRate)) * 100;
    resolutionScore = Math.round(Math.max(0, Math.min(100, rawR)) * 10) / 10;
    resolutionRate = Math.round(confirmedRate * 1000) / 10;
  } else if (resolution.casesCount > 0) {
    resolutionRate = Math.round((resolution.consumerConfirmedCount / resolution.casesCount) * 1000) / 10;
  }

  // 3. Composite Score S = 0.70 * E + 0.30 * R (or S = E if R is null)
  let opinioScore = experienceScore;
  if (resolutionScore !== null) {
    opinioScore = Math.round((0.70 * experienceScore + 0.30 * resolutionScore) * 10) / 10;
  }

  // 4. Coverage Metric Calculation
  const coveragePercentage = observedOrdersCount > 0
    ? Math.round((invitedOrdersCount / observedOrdersCount) * 1000) / 10
    : 0;

  // Issues per 1,000 orders
  const issuesPerThousand = observedOrdersCount > 0
    ? Math.round((resolution.casesCount / (observedOrdersCount / 1000)) * 10) / 10
    : 0;

  // 5. Confidence Bands from Spec Section 7.3
  let confidenceLevel: 'preliminary' | 'established' | 'strong' | 'very_strong' = 'preliminary';
  if (effectiveSampleSize >= 200 && coveragePercentage >= 80) {
    confidenceLevel = 'very_strong';
  } else if (effectiveSampleSize >= 50) {
    confidenceLevel = 'strong';
  } else if (effectiveSampleSize >= 10) {
    confidenceLevel = 'established';
  }

  return {
    opinioScore,
    experienceScore,
    resolutionScore,
    confidenceLevel,
    effectiveSampleSize,
    coveragePercentage,
    issuesPerThousand,
    resolutionRate,
  };
}
