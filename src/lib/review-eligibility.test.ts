import { describe, it, expect } from 'vitest';
import {
  isPubliclyEligible,
  showVerifiedPurchaseLabel,
  computePublicAggregate,
  ReviewProvenance,
} from './review-eligibility';

function review(overrides: Partial<ReviewProvenance> = {}): ReviewProvenance {
  return {
    id: 1,
    rating: 5,
    status: 'published',
    customer_authored: null,
    transaction_verified: false,
    owner_attested: false,
    provenance_source: null,
    ...overrides,
  };
}

describe('public review eligibility', () => {
  it('is eligible when customer authorship is established', () => {
    expect(isPubliclyEligible(review({ customer_authored: true }))).toBe(true);
  });

  it('is eligible when the transaction is verified', () => {
    expect(isPubliclyEligible(review({ transaction_verified: true }))).toBe(true);
  });

  it('is NOT eligible on owner attestation + legacy source alone', () => {
    const attested = review({
      owner_attested: true,
      provenance_source: 'legacy_site_migration',
      customer_authored: null,
      transaction_verified: false,
    });
    expect(isPubliclyEligible(attested)).toBe(false);
  });

  it('is NOT eligible when authorship is unresolved and no transaction is verified', () => {
    expect(isPubliclyEligible(review({ customer_authored: null }))).toBe(false);
  });

  it('excludes records that are not published', () => {
    for (const status of ['flagged', 'under_review', 'removed']) {
      expect(isPubliclyEligible(review({ status, customer_authored: true }))).toBe(false);
    }
  });
});

describe('verified purchase label', () => {
  it('is shown only for a verified transaction', () => {
    expect(showVerifiedPurchaseLabel(review({ transaction_verified: true }))).toBe(true);
    expect(showVerifiedPurchaseLabel(review({ customer_authored: true }))).toBe(false);
    expect(showVerifiedPurchaseLabel(review({ owner_attested: true }))).toBe(false);
  });
});

describe('public aggregate', () => {
  it('returns null rather than a fabricated baseline when nothing is eligible', () => {
    const corpus = [
      review({ id: 1, owner_attested: true, provenance_source: 'legacy_site_migration' }),
      review({ id: 2, owner_attested: true, provenance_source: 'legacy_site_migration' }),
    ];
    expect(computePublicAggregate(corpus)).toBeNull();
  });

  it('counts and averages only eligible records', () => {
    const corpus = [
      review({ id: 1, rating: 5, customer_authored: true }),
      review({ id: 2, rating: 4, transaction_verified: true }),
      review({ id: 3, rating: 1, customer_authored: null }), // ineligible, excluded
      review({ id: 4, rating: 1, status: 'flagged', customer_authored: true }), // excluded
    ];
    expect(computePublicAggregate(corpus)).toEqual({ count: 2, average: 4.5 });
  });

  it('never lets an attested-only row raise the count', () => {
    const corpus = [
      review({ id: 1, rating: 5, customer_authored: true }),
      review({ id: 2, rating: 5, owner_attested: true, provenance_source: 'legacy_site_migration' }),
    ];
    expect(computePublicAggregate(corpus)).toEqual({ count: 1, average: 5 });
  });
});
