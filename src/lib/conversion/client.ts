'use client';

import { clearJourney, conversionContextForServer, recordLanding, trackIntent, windowEnv } from './browser';
import { isOpaqueId, type ConversionJourney, type StepId } from './contract';
import { ctaIdFor, journeyForCta } from './cta';
import { readConsent } from './consent';
import { pageForPath } from './pages';

/**
 * Browser half of CONVERSION-001 for Opinio. Every event goes to GA4 only
 * through the consented gtag queue (src/components/Analytics.tsx); without an
 * explicit "granted" choice nothing is stored or sent.
 */
/** Consented events raised before gtag is configured (a step started on a full page load). */
const MAX_BUFFERED = 20;
let buffered: Array<[string, Record<string, string>]> = [];

function env() {
  return windowEnv((name, params) => {
    // Explicit page context, so the event never inherits the document title
    // (a business name on /b/<slug>) or the real slug path set for page views.
    const page = pageForPath(window.location.pathname);
    if (!page) return;
    const origin = window.location.origin;
    const event: Record<string, string> = { ...params, page_location: origin + page.templatePath, page_title: page.pageId, page_referrer: origin + '/' };
    if (window.gtag) window.gtag('event', name, event);
    else if (buffered.length < MAX_BUFFERED) buffered.push([name, event]);
  });
}

/**
 * Sends the events buffered before gtag existed. Analytics calls it once GA4
 * is configured; anything buffered is dropped if consent is no longer granted.
 */
export function flushBufferedConversionEvents(): void {
  const pending = buffered;
  buffered = [];
  if (typeof window === 'undefined' || !window.gtag || readConsent(window) !== 'granted') return;
  for (const [name, event] of pending) window.gtag('event', name, event);
}

let landingRecorded = false;

export function recordConversionLanding(): void {
  const e = env();
  if (!e || landingRecorded) return;
  landingRecorded = true;
  recordLanding(e, { pathname: window.location.pathname, search: window.location.search, referrer: document.referrer, host: window.location.hostname });
}

export function trackCta(explicitId: string): void {
  const e = env();
  const ctaId = ctaIdFor(explicitId);
  const journey = journeyForCta(ctaId);
  if (!e || !journey) return;
  trackIntent(e, { stage: 'cta_click', journey, pathname: window.location.pathname, ctaId });
}

export function trackStepStarted(journey: ConversionJourney, stepId: StepId): void {
  const e = env();
  if (e) trackIntent(e, { stage: 'step_started', journey, stepId, pathname: window.location.pathname });
}

/** Association for the review submit; the server re-validates it and never trusts a stage from it. */
export function conversionContext(): Record<string, unknown> {
  // Read inside the review submit: it must never throw (README: telemetry
  // never fails product success).
  try {
    const e = env();
    return e ? conversionContextForServer(e) : { consent: 'denied' };
  } catch {
    return { consent: 'denied' };
  }
}

const WITHDRAWAL_KEY = 'opinio.conversion-withdrawal';
const MAX_PENDING_WITHDRAWALS = 10;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Withdrawn journeys the server has not confirmed yet (a list: a second withdrawal never overwrites the first). */
function pendingWithdrawals(): string[] {
  try {
    const raw = storage()?.getItem(WITHDRAWAL_KEY) ?? null;
    if (!raw) return [];
    const parsed: unknown = raw.startsWith('[') ? JSON.parse(raw) : [raw];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => isOpaqueId('journey', id)) : [];
  } catch {
    return [];
  }
}

function savePendingWithdrawals(ids: string[]): void {
  try {
    if (ids.length === 0) storage()?.removeItem(WITHDRAWAL_KEY);
    else storage()?.setItem(WITHDRAWAL_KEY, JSON.stringify(ids.slice(-MAX_PENDING_WITHDRAWALS)));
  } catch {
    // storage full or blocked: the send below is still tried once
  }
}

/** Tells the server to stop and unlink a withdrawn journey; stays queued until it confirms (204). */
async function sendWithdrawal(journeyId: string): Promise<void> {
  try {
    const response = await fetch('/api/v1/conversion/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journeyId, consent: 'denied' }),
      keepalive: true,
    });
    if (response.status === 204) savePendingWithdrawals(pendingWithdrawals().filter((id) => id !== journeyId));
  } catch {
    // stays queued for the next load
  }
}

/**
 * Denial or withdrawal: the local journey and its attribution are deleted,
 * and if one existed (it only does after a "granted"), the server is told to
 * stop its undelivered events.
 */
export async function clearConversionJourney(): Promise<void> {
  buffered = [];
  const store = storage();
  if (!store) return;
  const journeyId = clearJourney({ storage: store });
  if (!journeyId) return;
  savePendingWithdrawals([...pendingWithdrawals().filter((id) => id !== journeyId), journeyId]);
  await sendWithdrawal(journeyId);
}

/** Retries every unconfirmed withdrawal. Runs on every load, whatever the current consent. */
export async function retryPendingWithdrawal(): Promise<void> {
  for (const journeyId of pendingWithdrawals()) await sendWithdrawal(journeyId);
}

/** One delegated listener for reviewed `data-cta` placements (no DOM text or href is read). */
export function bindCtaTracking(): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest('[data-cta]') : null;
    if (target instanceof HTMLElement) trackCta(target.dataset.cta ?? '');
  };
  const onSubmit = (event: SubmitEvent) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (form?.dataset.cta) trackCta(form.dataset.cta);
  };
  document.addEventListener('click', onClick, { capture: true });
  document.addEventListener('submit', onSubmit, { capture: true });
  return () => {
    document.removeEventListener('click', onClick, { capture: true });
    document.removeEventListener('submit', onSubmit, { capture: true });
  };
}
