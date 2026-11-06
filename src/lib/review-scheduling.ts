import type { ReviewBrandConfig, ReviewTimeWindow } from './review-brands';

const HOUR_MS = 3_600_000;
const SHORT_SPAN_MS = 103_680_000;
const MEDIUM_MIN_MS = 155_520_000;
const MEDIUM_SPAN_MS = 302_400_000;
const LONG_MIN_MS = 518_400_000;
const LONG_SPAN_MS = 950_400_000;
const COOLDOWN_MS = 18 * HOUR_MS;
const SPACING_MIN_MS = 6 * HOUR_MS;
const SPACING_SPAN_MS = 18 * HOUR_MS;

export interface SchedulePublicationInput {
  now: Date;
  brand: ReviewBrandConfig;
  latestBrandPublishAfter: Date | null;
  latestGlobalPublishAfter: Date | null;
  random: () => number;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function unitDraw(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('random draw must be between 0 and 1 inclusive');
  }
  return value;
}

function gapMs(band: number, position: number): number {
  if (band < 0.35) return Math.round(position * SHORT_SPAN_MS);
  if (band < 0.75) return MEDIUM_MIN_MS + Math.round(position * MEDIUM_SPAN_MS);
  return LONG_MIN_MS + Math.round(position * LONG_SPAN_MS);
}

function assertTimezone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
  } catch {
    throw new Error(`timezone is not recognized: ${timeZone}`);
  }
}

function assertWindows(windows: readonly ReviewTimeWindow[]): void {
  if (windows.length === 0) throw new Error('window cannot be scheduled');
  for (const window of windows) {
    const start = window.startHour;
    const end = window.endHour;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 || start >= end) {
      throw new Error('window cannot be scheduled');
    }
  }
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const part = formatted.find((item) => item.type === type);
    return Number(part?.value ?? 'NaN');
  };
  const hour = read('hour');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: hour === 24 ? 0 : hour,
    minute: read('minute'),
    second: read('second'),
  };
}

function offsetMs(timeZone: string, date: Date): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    date.getUTCMilliseconds(),
  );
  return asUtc - date.getTime();
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utc = wall;
  for (let pass = 0; pass < 2; pass += 1) {
    utc = wall - offsetMs(timeZone, new Date(utc));
  }
  return new Date(utc);
}

function minuteOfDay(parts: ZonedParts): number {
  return parts.hour * 60 + parts.minute;
}

function insideWindow(minute: number, windows: readonly ReviewTimeWindow[]): boolean {
  return windows.some((window) => minute >= window.startHour * 60 && minute < window.endHour * 60);
}

function calendarDate(year: number, month: number, day: number, dayOffset: number): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function offsetInsideWindow(durationMs: number, random: () => number): number {
  const span = durationMs - 1;
  if (span < 1) throw new Error('window cannot be scheduled');
  const draw = unitDraw(random);
  const index = Math.min(span - 1, Math.floor(draw * span));
  return 1 + index;
}

function snapForward(epochMs: number, brand: ReviewBrandConfig, random: () => number): Date {
  let cursor = epochMs;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const instant = new Date(cursor);
    const parts = zonedParts(instant, brand.timezone);
    if (insideWindow(minuteOfDay(parts), brand.windows) && cursor >= epochMs) return new Date(cursor);
    const ordered = [...brand.windows].sort((left, right) => left.startHour - right.startHour);
    const minute = minuteOfDay(parts);
    const later = ordered.find((window) => window.startHour * 60 > minute);
    const target = later ?? ordered[0];
    if (!target) throw new Error('window cannot be scheduled');
    const date = calendarDate(parts.year, parts.month, parts.day, later ? 0 : 1);
    const opened = zonedTimeToUtc(date.year, date.month, date.day, target.startHour, 0, brand.timezone);
    const durationMs = (target.endHour - target.startHour) * HOUR_MS;
    const snapped = new Date(opened.getTime() + offsetInsideWindow(durationMs, random));
    if (snapped.getTime() >= epochMs && insideWindow(minuteOfDay(zonedParts(snapped, brand.timezone)), brand.windows)) {
      return snapped;
    }
    cursor = Math.max(opened.getTime(), cursor) + 60_000;
  }
  throw new Error('window cannot be scheduled');
}

export function schedulePublication(input: SchedulePublicationInput): Date {
  const band = unitDraw(input.random);
  const position = unitDraw(input.random);
  const spacing = unitDraw(input.random);
  assertTimezone(input.brand.timezone);
  assertWindows(input.brand.windows);

  const brandAnchor = input.latestBrandPublishAfter ?? input.now;
  const gapAnchor = Math.max(input.now.getTime(), brandAnchor.getTime());
  let instant = gapAnchor + gapMs(band, position);
  if (input.latestBrandPublishAfter) {
    instant = Math.max(instant, input.latestBrandPublishAfter.getTime() + COOLDOWN_MS);
  }
  instant = snapForward(instant, input.brand, input.random).getTime();
  if (input.latestGlobalPublishAfter) {
    const floor = input.latestGlobalPublishAfter.getTime() + Math.round(SPACING_MIN_MS + spacing * SPACING_SPAN_MS);
    if (floor > instant) instant = snapForward(floor, input.brand, input.random).getTime();
  }
  if (instant < input.now.getTime()) instant = snapForward(input.now.getTime(), input.brand, input.random).getTime();
  return new Date(instant);
}
