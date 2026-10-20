import { describe, it, expect } from 'vitest';
import { MIN_EVIDENCE_SAMPLE, displayableScore, meetsEvidenceThreshold } from './evidence-threshold';

describe('evidence threshold', () => {
  it('uses a conservative default of 5', () => {
    expect(MIN_EVIDENCE_SAMPLE).toBe(5);
  });

  it('hides the ETN Turistar case: score 73.7 from one review', () => {
    expect(displayableScore(73.7, 1)).toBeNull();
    expect(meetsEvidenceThreshold(1)).toBe(false);
  });

  it('hides scores just below the threshold and shows them at it', () => {
    expect(displayableScore(80, MIN_EVIDENCE_SAMPLE - 0.1)).toBeNull();
    expect(displayableScore(80, MIN_EVIDENCE_SAMPLE)).toBe(80);
    expect(displayableScore('82.5', '12')).toBe(82.5);
  });

  it('hides missing, empty or non-numeric inputs', () => {
    expect(displayableScore(null, 50)).toBeNull();
    expect(displayableScore(undefined, 50)).toBeNull();
    expect(displayableScore('', 50)).toBeNull();
    expect(displayableScore('abc', 50)).toBeNull();
    expect(displayableScore(80, null)).toBeNull();
    expect(displayableScore(80, undefined)).toBeNull();
    expect(displayableScore(80, 'x')).toBeNull();
  });
});
