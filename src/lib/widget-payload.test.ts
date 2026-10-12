import { describe, it, expect } from 'vitest';
import { buildPublicWidgetPayload } from './widget-payload';
import { ReviewProvenance } from './review-eligibility';

const business = { name: 'Hablo.com.mx', slug: 'hablo', logo_url: '/logos/hablo.png' };

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

describe('public widget payload', () => {
  it('renders nulls (never a hardcoded total) when only attested records exist', () => {
    const payload = buildPublicWidgetPayload(business, [
      review({ owner_attested: true, provenance_source: 'legacy_site_migration' }),
      review({ id: 2, owner_attested: true, provenance_source: 'legacy_site_migration' }),
    ]);
    expect(payload.rating).toBeNull();
    expect(payload.review_count).toBeNull();
    expect(payload.verified_purchases).toBe(false);
  });

  it('reports numbers from eligible records only', () => {
    const payload = buildPublicWidgetPayload(business, [
      review({ id: 1, rating: 5, customer_authored: true }),
      review({ id: 2, rating: 3, customer_authored: true }),
      review({ id: 3, rating: 1, owner_attested: true }), // excluded
    ]);
    expect(payload.rating).toBe(4);
    expect(payload.review_count).toBe(2);
    expect(payload.verified_purchases).toBe(false);
  });

  it('flags verified purchases only when every displayed record is transaction-verified', () => {
    const payload = buildPublicWidgetPayload(business, [
      review({ id: 1, transaction_verified: true }),
      review({ id: 2, customer_authored: true }), // eligible but not transaction-verified
    ]);
    expect(payload.review_count).toBe(2);
    expect(payload.verified_purchases).toBe(false);
  });
});
