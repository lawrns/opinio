import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { calculateOpinioScore, type ReviewCalculationItem, type ResolutionMetricsInput } from '@/lib/scoring';
import { POST as postReview } from '@/app/api/v1/reviews/route';

const BASE_RESOLUTION: ResolutionMetricsInput = {
  casesCount: 10,
  consumerConfirmedCount: 8,
  merchantRespondedCount: 9,
  medianResponseHours: 4,
  targetResponseHours: 24,
  reopenedCount: 1,
};

describe('Gate 5 & 7: Opinio Adversarial, Boundary & Input Stress', () => {
  it('calculateOpinioScore clamps negative ageDays (clock skew) and guards NaN/Infinity inputs without producing NaN or >100 scores', () => {
    const adversarialReviews: ReviewCalculationItem[] = [
      { rating: 5, verificationLevel: 'confirmed_payment', ageDays: -36500, integrityFactor: 1.0 },
      { rating: Number.NaN, verificationLevel: 'confirmed_payment', ageDays: 10, integrityFactor: Number.NaN },
      { rating: 1, verificationLevel: 'unverified_experience', ageDays: Number.POSITIVE_INFINITY, integrityFactor: -5 },
    ];

    const res = calculateOpinioScore(adversarialReviews, BASE_RESOLUTION, 100, 50);
    expect(Number.isFinite(res.opinioScore)).toBe(true);
    expect(res.opinioScore).toBeGreaterThanOrEqual(0);
    expect(res.opinioScore).toBeLessThanOrEqual(100);
    expect(Number.isFinite(res.experienceScore)).toBe(true);
    expect(res.experienceScore).toBeGreaterThanOrEqual(0);
    expect(res.experienceScore).toBeLessThanOrEqual(100);
    // Negative ageDays must not inflate effective weight above 1.0
    expect(res.effectiveSampleSize).toBeLessThanOrEqual(3);
  });

  it('POST /api/v1/reviews returns 400 (not 500) on non-integer/out-of-range business_id, NaN/Infinity rating, or null-byte strings', async () => {
    const badBusinessIds = [Number.POSITIVE_INFINITY, -1, 1.5, 9999999999999];
    for (const bizId of badBusinessIds) {
      const req = new NextRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          business_id: bizId,
          rating: 5,
          body: 'Excelente servicio y entrega rápida',
          author_name: 'Ana García',
        }),
      });
      const res = await postReview(req);
      expect(res.status).toBe(400);
    }

    // Null-byte payload that reduces to < 5 chars once null bytes are stripped
    const nullByteReq = new NextRequest('http://localhost/api/v1/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        business_id: 1,
        rating: 5,
        body: 'ab\u0000\u0000\u0000\u0000\u0000',
        author_name: '\u0000\u0000',
      }),
    });
    const nullByteRes = await postReview(nullByteReq);
    expect(nullByteRes.status).toBe(400);
  });
});
