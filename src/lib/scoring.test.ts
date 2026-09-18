import { describe, it, expect } from 'vitest';
import {
  calculateOpinioScore,
  ReviewCalculationItem,
  ResolutionMetricsInput,
  VERIFICATION_WEIGHTS,
} from './scoring';

describe('Opinio.mx Bayesian Scoring Engine (Spec Section 7)', () => {
  const emptyResolution: ResolutionMetricsInput = {
    casesCount: 0,
    consumerConfirmedCount: 0,
    merchantRespondedCount: 0,
    medianResponseHours: 4.5,
    reopenedCount: 0,
  };

  describe('1. Baseline & Zero-Review Invariants', () => {
    it('returns the category baseline (75.0) and preliminary confidence when business has zero reviews', () => {
      const result = calculateOpinioScore([], emptyResolution, 0, 0);

      expect(result.experienceScore).toBe(75.0);
      expect(result.opinioScore).toBe(75.0);
      expect(result.resolutionScore).toBeNull();
      expect(result.confidenceLevel).toBe('preliminary');
      expect(result.effectiveSampleSize).toBe(0);
      expect(result.coveragePercentage).toBe(0);
      expect(result.issuesPerThousand).toBe(0);
      expect(result.resolutionRate).toBe(0);
    });

    it('respects custom prior weight and custom baseline if provided', () => {
      const result = calculateOpinioScore([], emptyResolution, 0, 0, 80, 10);
      expect(result.experienceScore).toBe(80.0);
      expect(result.opinioScore).toBe(80.0);
    });
  });

  describe('2. Review Verification Weights & Conversion', () => {
    it('applies exact weights for all verification levels according to spec Section 6.2', () => {
      expect(VERIFICATION_WEIGHTS.confirmed_payment).toBe(1.0);
      expect(VERIFICATION_WEIGHTS.confirmed_store_order).toBe(0.9);
      expect(VERIFICATION_WEIGHTS.reviewed_proof).toBe(0.75);
      expect(VERIFICATION_WEIGHTS.unverified_experience).toBe(0.35);
    });

    it('accurately pulls score upwards with confirmed payment 5-star reviews', () => {
      // 20 reviews of 5 stars (x_i = 100) with weight 1.0, age 0, integrity 1.0
      const reviews: ReviewCalculationItem[] = Array.from({ length: 20 }, () => ({
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
        integrityFactor: 1.0,
      }));

      const result = calculateOpinioScore(reviews, emptyResolution, 100, 95);

      // E = (20 * 75 + 20 * 100) / (20 + 20) = 3500 / 40 = 87.5
      expect(result.experienceScore).toBe(87.5);
      expect(result.opinioScore).toBe(87.5);
      expect(result.effectiveSampleSize).toBe(20.0);
      expect(result.confidenceLevel).toBe('established'); // n_eff >= 10
    });

    it('accurately pulls score downwards with 1-star reviews (x_i = 0)', () => {
      // 20 reviews of 1 star (x_i = 0) with weight 1.0, age 0
      const reviews: ReviewCalculationItem[] = Array.from({ length: 20 }, () => ({
        rating: 1,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
        integrityFactor: 1.0,
      }));

      const result = calculateOpinioScore(reviews, emptyResolution, 100, 95);

      // E = (20 * 75 + 0) / (20 + 20) = 1500 / 40 = 37.5
      expect(result.experienceScore).toBe(37.5);
      expect(result.opinioScore).toBe(37.5);
    });
  });

  describe('3. Recency Decay & Integrity Clamping', () => {
    it('halves review weight at 365 days (half-life)', () => {
      const freshReview: ReviewCalculationItem = {
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
      };
      const yearOldReview: ReviewCalculationItem = {
        ...freshReview,
        ageDays: 365,
      };

      const freshResult = calculateOpinioScore([freshReview], emptyResolution, 10, 10);
      const yearOldResult = calculateOpinioScore([yearOldReview], emptyResolution, 10, 10);

      // At age 0: w = 1.0. E = (1500 + 100) / 21 = 76.19 -> 76.2
      expect(freshResult.experienceScore).toBe(76.2);

      // At age 365: w = 0.5. E = (1500 + 50) / 20.5 = 75.60 -> 75.6
      expect(yearOldResult.experienceScore).toBe(75.6);
    });

    it('clamps recency decay to a floor of 0.25 for ancient reviews (>730 days)', () => {
      const twoYearsOld: ReviewCalculationItem = {
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 730,
      };
      const fiveYearsOld: ReviewCalculationItem = {
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 1825,
      };

      const res1 = calculateOpinioScore([twoYearsOld], emptyResolution, 10, 10);
      const res2 = calculateOpinioScore([fiveYearsOld], emptyResolution, 10, 10);

      // Both should receive the exact same clamped decay d_i = 0.25
      expect(res1.experienceScore).toBe(res2.experienceScore);
    });

    it('clamps integrity factors strictly within [0.70, 1.15]', () => {
      const deflated: ReviewCalculationItem = {
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
        integrityFactor: 0.1, // Should clamp to 0.70
      };
      const inflated: ReviewCalculationItem = {
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
        integrityFactor: 2.5, // Should clamp to 1.15
      };

      const clampedLow: ReviewCalculationItem = {
        ...deflated,
        integrityFactor: 0.70,
      };
      const clampedHigh: ReviewCalculationItem = {
        ...inflated,
        integrityFactor: 1.15,
      };

      expect(calculateOpinioScore([deflated], emptyResolution, 0, 0).experienceScore).toBe(
        calculateOpinioScore([clampedLow], emptyResolution, 0, 0).experienceScore
      );
      expect(calculateOpinioScore([inflated], emptyResolution, 0, 0).experienceScore).toBe(
        calculateOpinioScore([clampedHigh], emptyResolution, 0, 0).experienceScore
      );
    });
  });

  describe('4. Resolution Score & Composite Weighing (Spec Section 7.2)', () => {
    it('leaves resolutionScore as null and opinioScore = experienceScore when cases < 5', () => {
      const fourCases: ResolutionMetricsInput = {
        casesCount: 4,
        consumerConfirmedCount: 4,
        merchantRespondedCount: 4,
        medianResponseHours: 2.0,
        reopenedCount: 0,
      };

      const result = calculateOpinioScore([], fourCases, 100, 90);
      expect(result.resolutionScore).toBeNull();
      expect(result.opinioScore).toBe(result.experienceScore);
      expect(result.resolutionRate).toBe(100.0); // 4/4 = 100%
    });

    it('calculates composite score S = 0.70 * E + 0.30 * R when cases >= 5', () => {
      const fiveCases: ResolutionMetricsInput = {
        casesCount: 5,
        consumerConfirmedCount: 5, // confirmedRate = 1.0 (40%)
        merchantRespondedCount: 5, // responseRate = 1.0 (25%)
        medianResponseHours: 0, // speedFactor = 1.0 (20%)
        targetResponseHours: 24,
        reopenedCount: 0, // reopenRate = 0.0 -> (1 - 0) * 15% = 15%
      };

      // Raw R = (0.40 + 0.25 + 0.20 + 0.15) * 100 = 100.0
      const result = calculateOpinioScore([], fiveCases, 100, 90);

      expect(result.resolutionScore).toBe(100.0);
      // S = 0.70 * 75.0 + 0.30 * 100.0 = 52.5 + 30.0 = 82.5
      expect(result.opinioScore).toBe(82.5);
    });
  });

  describe('5. Confidence Band Thresholds (Spec Section 7.3)', () => {
    it('transitions from preliminary -> established -> strong -> very_strong', () => {
      // 1. Preliminary: < 10 reviews
      const preliminary = calculateOpinioScore([], emptyResolution, 100, 100);
      expect(preliminary.confidenceLevel).toBe('preliminary');

      // 2. Established: >= 10 reviews
      const tenReviews: ReviewCalculationItem[] = Array.from({ length: 10 }, () => ({
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
      }));
      const established = calculateOpinioScore(tenReviews, emptyResolution, 100, 100);
      expect(established.confidenceLevel).toBe('established');

      // 3. Strong: >= 50 reviews
      const fiftyReviews: ReviewCalculationItem[] = Array.from({ length: 50 }, () => ({
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
      }));
      const strong = calculateOpinioScore(fiftyReviews, emptyResolution, 100, 70);
      expect(strong.confidenceLevel).toBe('strong');

      // 4. Very Strong: >= 200 reviews AND coverage >= 80%
      const twoHundredReviews: ReviewCalculationItem[] = Array.from({ length: 200 }, () => ({
        rating: 5,
        verificationLevel: 'confirmed_payment',
        ageDays: 0,
      }));
      const veryStrong = calculateOpinioScore(twoHundredReviews, emptyResolution, 1000, 850);
      expect(veryStrong.coveragePercentage).toBe(85.0);
      expect(veryStrong.confidenceLevel).toBe('very_strong');
    });
  });

  describe('6. Coverage and Complaints Denominator', () => {
    it('correctly calculates coverage percentage and complaints per thousand', () => {
      const resolution: ResolutionMetricsInput = {
        casesCount: 5,
        consumerConfirmedCount: 4,
        merchantRespondedCount: 5,
        medianResponseHours: 12,
        reopenedCount: 0,
      };

      // 5 cases across 2,500 observed orders = 2.0 issues per 1,000 orders
      // 2,300 invited orders / 2,500 observed = 92.0% coverage
      const result = calculateOpinioScore([], resolution, 2500, 2300);

      expect(result.coveragePercentage).toBe(92.0);
      expect(result.issuesPerThousand).toBe(2.0);
    });
  });
});
