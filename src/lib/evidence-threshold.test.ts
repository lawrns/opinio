import { describe, it, expect } from 'vitest';
import {
  MIN_EVIDENCE_SAMPLE,
  countVerifiedReviews,
  displayablePassport,
  displayableScore,
  meetsEvidenceThreshold,
} from './evidence-threshold';
import { calculateOpinioScore, type ResolutionMetricsInput } from './scoring';

const unverified = { verification_level: 'unverified_experience' };
const verified = { verification_level: 'confirmed_store_order' };

describe('evidence threshold', () => {
  it('requires one verified review (founder decision)', () => {
    expect(MIN_EVIDENCE_SAMPLE).toBe(1);
  });

  it('hides the ETN Turistar case: score 73.7 from one unverified review', () => {
    expect(displayableScore(73.7, countVerifiedReviews([unverified]))).toBeNull();
  });

  it('5 unverified reviews stay hidden, 1 verified review shows', () => {
    const five = (r: object) => Array.from({ length: 5 }, () => r);
    expect(displayableScore(80, countVerifiedReviews(five(unverified)))).toBeNull();
    expect(displayableScore(80, countVerifiedReviews([verified]))).toBe(80);
    expect(displayableScore(80, countVerifiedReviews([]))).toBeNull();
    expect(countVerifiedReviews([...five(unverified), verified])).toBe(1);
  });

  it('counts every non-unverified level as verified and ignores missing levels', () => {
    const levels = ['confirmed_payment', 'confirmed_store_order', 'reviewed_proof'];
    expect(countVerifiedReviews(levels.map((verification_level) => ({ verification_level })))).toBe(3);
    expect(countVerifiedReviews([{}, { verification_level: null }])).toBe(0);
  });

  it('shows at the threshold, hides just below (0 verified)', () => {
    expect(displayableScore(80, MIN_EVIDENCE_SAMPLE - 1)).toBeNull();
    expect(displayableScore('82.5', '12')).toBe(82.5);
  });

  it('fails closed on missing or non-numeric inputs', () => {
    expect(displayableScore(null, 50)).toBeNull();
    expect(displayableScore('', 50)).toBeNull();
    expect(displayableScore('abc', 50)).toBeNull();
    expect(displayableScore(80, null)).toBeNull();
    expect(displayableScore(80, undefined)).toBeNull();
    expect(meetsEvidenceThreshold('x')).toBe(false);
    expect(meetsEvidenceThreshold('')).toBe(false);
  });

  it('displayablePassport gates opinioScore, experienceScore and resolutionScore below the threshold', () => {
    const fiveCases: ResolutionMetricsInput = {
      casesCount: 5,
      consumerConfirmedCount: 5,
      merchantRespondedCount: 5,
      medianResponseHours: 2,
      reopenedCount: 0,
    };
    const raw = calculateOpinioScore([], fiveCases, 100, 80);
    expect(raw.experienceScore).toBe(75);
    expect(raw.resolutionScore).toBeGreaterThan(0);

    // Below default threshold (0 verified reviews): all score components are null
    const gatedZero = displayablePassport(raw, 0);
    expect(gatedZero.opinioScore).toBeNull();
    expect(gatedZero.experienceScore).toBeNull();
    expect(gatedZero.resolutionScore).toBeNull();
    expect(gatedZero.coveragePercentage).toBe(80);

    // Under a 5-review threshold: 0 and 4 verified reviews withhold all score components; 5 reveals them
    expect(displayablePassport(raw, 0, 5)).toMatchObject({
      opinioScore: null,
      experienceScore: null,
      resolutionScore: null,
    });
    expect(displayablePassport(raw, 4, 5)).toMatchObject({
      opinioScore: null,
      experienceScore: null,
      resolutionScore: null,
    });
    expect(displayablePassport(raw, 5, 5)).toMatchObject({
      opinioScore: raw.opinioScore,
      experienceScore: raw.experienceScore,
      resolutionScore: raw.resolutionScore,
    });
  });
});

