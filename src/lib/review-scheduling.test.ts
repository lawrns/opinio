import { describe, expect, it } from 'vitest';
import { REVIEW_BRANDS, type ReviewBrandConfig } from './review-brands';
import { schedulePublication } from './review-scheduling';

/**
 * Locked schedule contract:
 * - random() is called exactly three times: gap band, position inside the band, then global spacing.
 * - Bands are [0, 0.35) → 0–1.2d, [0.35, 0.75) → 1.8–5.3d, [0.75, 1] → 6–17d.
 *   Position and spacing are linear and inclusive of both ends when random() is 0 or 1.
 * - A day is 86_400_000 ms. The gap is added to max(now, latestBrandPublishAfter ?? now).
 * - Per-brand cooldown is a floor of 18h after latestBrandPublishAfter, not an extra delay.
 * - Global anti-sync is a floor of 6–24h after latestGlobalPublishAfter, not stacked onto the gap.
 * - The result is then snapped forward into a brand window. endHour is exclusive.
 *   An instant already inside a window, including the opening minute, is kept.
 *   A forward snap lands on a random millisecond strictly inside the selected window, never on its opening.
 *   That snap consumes one extra random draw.
 * - Absent history is null. The function is synchronous and returns a Date.
 */

const DAY_MS = 86_400_000;
const UTC_CLOCK: ReviewBrandConfig = {
  slug: 'clock',
  officialOrigin: 'https://clock.test',
  timezone: 'UTC',
  windows: [{ startHour: 0, endHour: 23 }],
};
const TOKYO: ReviewBrandConfig = {
  slug: 'tokyo',
  officialOrigin: 'https://tokyo.test',
  timezone: 'Asia/Tokyo',
  windows: [{ startHour: 9, endHour: 18 }],
};

const at = (iso: string) => new Date(iso);

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) throw new Error(`random sequence exhausted at call ${index + 1}`);
    return values[index++];
  };
}

function due(
  now: string,
  random: number[],
  brand: ReviewBrandConfig = UTC_CLOCK,
  latestBrandPublishAfter: Date | null = null,
  latestGlobalPublishAfter: Date | null = null,
): Date {
  return schedulePublication({
    now: at(now),
    brand,
    latestBrandPublishAfter,
    latestGlobalPublishAfter,
    random: sequence(...random),
  });
}

function zonedMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return (hour === 24 ? 0 : hour) * 60 + minute;
}

describe('schedulePublication', () => {
  describe('gap bands', () => {
    const now = '2026-01-01T00:00:00.000Z';

    it('uses a zero gap at the bottom of the 35% band and 1.2 days at its top', () => {
      expect(due(now, [0, 0, 0]).toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(due(now, [0, 1, 0]).toISOString()).toBe('2026-01-02T04:48:00.000Z');
      expect(due(now, [0, 0.5, 0]).toISOString()).toBe('2026-01-01T14:24:00.000Z');
    });

    it('keeps 0.349 in the short band and starts the 40% band at exactly 0.35', () => {
      expect(due(now, [0.349, 0, 0]).toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(due(now, [0.35, 0, 0]).toISOString()).toBe('2026-01-02T19:12:00.000Z');
      expect(due(now, [0.35, 1, 0]).toISOString()).toBe('2026-01-06T07:12:00.000Z');
      expect(due(now, [0.35, 0.5, 0]).toISOString()).toBe('2026-01-04T13:12:00.000Z');
    });

    it('keeps 0.749 in the medium band and starts the 25% band at exactly 0.75', () => {
      expect(due(now, [0.749, 1, 0]).toISOString()).toBe('2026-01-06T07:12:00.000Z');
      expect(due(now, [0.75, 0, 0]).toISOString()).toBe('2026-01-07T00:00:00.000Z');
      expect(due(now, [0.75, 1, 0]).toISOString()).toBe('2026-01-18T00:00:00.000Z');
      expect(due(now, [1, 0.5, 0]).toISOString()).toBe('2026-01-12T12:00:00.000Z');
    });

    it('does not fill the hole between 1.2 and 1.8 days', () => {
      const shortTop = due(now, [0, 1, 0]).getTime() - at(now).getTime();
      const mediumBottom = due(now, [0.35, 0, 0]).getTime() - at(now).getTime();
      expect(shortTop).toBe(1.2 * DAY_MS);
      expect(mediumBottom).toBe(1.8 * DAY_MS);
      expect(mediumBottom - shortTop).toBe(0.6 * DAY_MS);
    });
  });

  describe('cooldown, anti-sync, and persisted anchors', () => {
    const now = '2026-01-01T00:00:00.000Z';

    it('floors a zero gap at exactly 18 hours after the latest brand due date', () => {
      const latest = at(now);
      expect(due(now, [0, 0, 0], UTC_CLOCK, latest, null).toISOString()).toBe('2026-01-01T18:00:00.000Z');
    });

    it('does not add the 18 hour cooldown on top of a gap that is already later', () => {
      const latest = at(now);
      expect(due(now, [0.35, 0, 0], UTC_CLOCK, latest, null).toISOString()).toBe('2026-01-02T19:12:00.000Z');
    });

    it('treats a future persisted brand due date as the gap anchor', () => {
      const latest = at('2026-01-05T00:00:00.000Z');
      expect(due(now, [0, 0, 0], UTC_CLOCK, latest, null).toISOString()).toBe('2026-01-05T18:00:00.000Z');
    });

    it('ignores a brand due date that is already outside the 18 hour floor', () => {
      const latest = at('2025-12-01T00:00:00.000Z');
      expect(due(now, [0, 0, 0], UTC_CLOCK, latest, null).toISOString()).toBe(now);
    });

    it('spaces 6 hours and 24 hours inclusively after the latest global due date', () => {
      const latest = at(now);
      expect(due(now, [0, 0, 0], UTC_CLOCK, null, latest).toISOString()).toBe('2026-01-01T06:00:00.000Z');
      expect(due(now, [0, 0, 1], UTC_CLOCK, null, latest).toISOString()).toBe('2026-01-02T00:00:00.000Z');
      expect(due(now, [0, 0, 0.5], UTC_CLOCK, null, latest).toISOString()).toBe('2026-01-01T15:00:00.000Z');
    });

    it('does not stack global spacing onto a gap that is already later', () => {
      const latest = at(now);
      expect(due(now, [0, 1, 0], UTC_CLOCK, null, latest).toISOString()).toBe('2026-01-02T04:48:00.000Z');
    });

    it('uses the later of the brand cooldown and the global spacing floor', () => {
      const brandLatest = at(now);
      const globalLatest = at('2026-01-01T20:00:00.000Z');
      expect(due(now, [0, 0, 0], UTC_CLOCK, brandLatest, globalLatest).toISOString()).toBe('2026-01-02T02:00:00.000Z');
    });
  });

  describe('local windows', () => {
    it('keeps an instant already inside the window, including minutes', () => {
      expect(due('2026-06-15T20:00:00.000Z', [0, 0, 0], REVIEW_BRANDS.doctormx).toISOString())
        .toBe('2026-06-15T20:00:00.000Z');
      expect(due('2026-06-15T19:30:00.000Z', [0, 0, 0], REVIEW_BRANDS.barri).toISOString())
        .toBe('2026-06-15T19:30:00.000Z');
      expect(due('2026-06-16T04:30:00.000Z', [0, 0, 0], REVIEW_BRANDS.barri).toISOString())
        .toBe('2026-06-16T04:30:00.000Z');
    });

    it('treats the window start as inside and the end hour as outside', () => {
      expect(due('2026-06-15T16:00:00.000Z', [0, 0, 0], REVIEW_BRANDS.doctormx).toISOString())
        .toBe('2026-06-15T16:00:00.000Z');
      expect(due('2026-06-15T16:00:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.gogym).toISOString())
        .toBe('2026-06-16T00:00:00.001Z');
      expect(due('2026-06-16T01:00:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.doctormx).toISOString())
        .toBe('2026-06-16T16:00:00.001Z');
      expect(due('2026-06-16T03:00:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.gogym).toISOString())
        .toBe('2026-06-16T13:00:00.001Z');
    });

    it('snaps forward across the gap between a brand\'s windows and never backward', () => {
      expect(due('2026-06-15T16:00:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.barri).toISOString())
        .toBe('2026-06-15T19:00:00.001Z');
      expect(due('2026-06-15T22:00:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.barri).toISOString())
        .toBe('2026-06-16T01:00:00.001Z');
      expect(due('2026-06-15T22:30:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.barri).toISOString())
        .toBe('2026-06-16T01:00:00.001Z');
      expect(due('2026-06-16T05:00:00.000Z', [0, 0, 0, 0], REVIEW_BRANDS.barri).toISOString())
        .toBe('2026-06-16T19:00:00.001Z');
    });

    it('snaps the cooldown floor forward into the next open window', () => {
      const now = '2026-06-15T16:00:00.000Z';
      expect(due(now, [0, 0, 0, 0], REVIEW_BRANDS.doctormx, at(now), null).toISOString())
        .toBe('2026-06-16T16:00:00.001Z');
    });

    it('allows a cooldown floor that lands exactly on a window start', () => {
      const latest = '2026-06-15T22:00:00.000Z';
      expect(due(latest, [0, 0, 0], REVIEW_BRANDS.doctormx, at(latest), null).toISOString())
        .toBe('2026-06-16T16:00:00.000Z');
    });

    it('anchors a future persisted due date and then snaps the cooldown into the window', () => {
      expect(due(
        '2026-06-15T16:00:00.000Z',
        [0, 0, 0, 0],
        REVIEW_BRANDS.doctormx,
        at('2026-06-20T16:00:00.000Z'),
        null,
      ).toISOString()).toBe('2026-06-21T16:00:00.001Z');
    });

    it('snaps a medium-band candidate that lands before the window', () => {
      expect(due('2026-06-15T16:00:00.000Z', [0.35, 0, 0, 0], REVIEW_BRANDS.doctormx).toISOString())
        .toBe('2026-06-17T16:00:00.001Z');
    });

    it('keeps a long-band candidate that lands on a window start', () => {
      expect(due('2026-06-15T16:00:00.000Z', [0.75, 1, 0], REVIEW_BRANDS.doctormx).toISOString())
        .toBe('2026-07-02T16:00:00.000Z');
    });

    it('applies global spacing only when it is later than the snapped gap', () => {
      const now = '2026-06-15T16:00:00.000Z';
      expect(due(now, [0, 0, 0], REVIEW_BRANDS.doctormx, null, at(now)).toISOString())
        .toBe('2026-06-15T22:00:00.000Z');
      expect(due(now, [0, 1, 0], REVIEW_BRANDS.doctormx, null, at(now)).toISOString())
        .toBe('2026-06-16T20:48:00.000Z');
    });

    it('reads the timezone from the brand instead of assuming Mexico City', () => {
      const now = '2026-06-15T16:00:00.000Z';
      expect(due(now, [0, 0, 0], REVIEW_BRANDS.doctormx).toISOString()).toBe(now);
      expect(due(now, [0, 0, 0, 0], TOKYO).toISOString()).toBe('2026-06-16T00:00:00.001Z');
    });

    it('uses the last millisecond of the selected window when the snap draw is 1', () => {
      expect(due('2026-06-15T16:00:00.000Z', [0, 0, 0, 1], REVIEW_BRANDS.gogym).toISOString())
        .toBe('2026-06-16T02:59:59.999Z');
    });

    it('places every owned brand inside one of its own windows and not before now', () => {
      const now = at('2026-06-15T16:00:00.000Z');
      const draws = [0.2, 0.25, 0.25, 0.4];
      for (const brand of Object.values(REVIEW_BRANDS)) {
        let index = 0;
        const scheduled = schedulePublication({
          now,
          brand,
          latestBrandPublishAfter: null,
          latestGlobalPublishAfter: null,
          random: () => draws[Math.min(index++, draws.length - 1)],
        });
        expect(scheduled.getTime()).toBeGreaterThanOrEqual(now.getTime());
        const minuteOfDay = zonedMinutes(scheduled, brand.timezone);
        expect(brand.windows.some((window) => (
          minuteOfDay >= window.startHour * 60 && minuteOfDay < window.endHour * 60
        ))).toBe(true);
      }
    });
  });

  describe('determinism and rejection', () => {
    it('returns a Date immediately and repeats the same instant for the same inputs', () => {
      const input = {
        now: at('2026-06-15T16:00:00.000Z'),
        brand: REVIEW_BRANDS.bien,
        latestBrandPublishAfter: null,
        latestGlobalPublishAfter: null,
      };
      const first = schedulePublication({ ...input, random: sequence(0.35, 0.5, 0.25, 0.2) });
      const second = schedulePublication({ ...input, random: sequence(0.35, 0.5, 0.25, 0.2) });
      expect(first).toBeInstanceOf(Date);
      expect(first).not.toBeInstanceOf(Promise);
      expect(second.toISOString()).toBe(first.toISOString());
    });

    it('consumes exactly three random draws even when there is no global history', () => {
      let calls = 0;
      schedulePublication({
        now: at('2026-06-15T16:00:00.000Z'),
        brand: REVIEW_BRANDS.hablo,
        latestBrandPublishAfter: null,
        latestGlobalPublishAfter: null,
        random: () => {
          calls += 1;
          return 0;
        },
      });
      expect(calls).toBe(3);
    });

    it('rejects a random draw outside 0..1', () => {
      for (const value of [-0.0001, 1.0001, Number.NaN]) {
        expect(() => due('2026-06-15T16:00:00.000Z', [value, 0, 0], REVIEW_BRANDS.hablo)).toThrow(/random/i);
      }
    });

    it('rejects an unknown timezone or a window that cannot be scheduled', () => {
      const now = at('2026-06-15T16:00:00.000Z');
      const call = (brand: ReviewBrandConfig) => () => schedulePublication({
        now,
        brand,
        latestBrandPublishAfter: null,
        latestGlobalPublishAfter: null,
        random: sequence(0, 0, 0),
      });
      expect(call({ ...REVIEW_BRANDS.bien, timezone: 'Mars/Olympus' })).toThrow(/timezone/i);
      expect(call({ ...REVIEW_BRANDS.bien, windows: [] })).toThrow(/window/i);
      expect(call({ ...REVIEW_BRANDS.bien, windows: [{ startHour: 18, endHour: 9 }] })).toThrow(/window/i);
      expect(call({ ...REVIEW_BRANDS.bien, windows: [{ startHour: 10, endHour: 10 }] })).toThrow(/window/i);
      expect(call({ ...REVIEW_BRANDS.bien, windows: [{ startHour: 10.5, endHour: 12 }] })).toThrow(/window/i);
    });
  });
});
