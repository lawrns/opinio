import { describe, expect, it } from 'vitest';
import { REVIEW_BRANDS, getReviewBrand } from './review-brands';

describe('getReviewBrand', () => {
  it('returns an owned brand and rejects prototype or unknown names', () => {
    expect(getReviewBrand('barri')).toBe(REVIEW_BRANDS.barri);
    expect(getReviewBrand('locomotion-mx').officialOrigin).toBe('https://locomotion.mx');
    for (const slug of ['toString', 'constructor', '__proto__', 'valueOf', 'Barri', 'barri ', '']) {
      expect(() => getReviewBrand(slug), slug).toThrow(/unsupported owned brand/i);
    }
  });
});
