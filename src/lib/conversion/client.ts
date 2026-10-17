'use client';

import { clearJourney, conversionContextForServer, recordLanding, trackIntent, windowEnv } from './browser';
import { isOpaqueId, type ConversionJourney, type StepId } from './contract';
import { ctaIdFor, journeyForCta } from './cta';
import { pageForPath } from './pages';

/**
 * Browser half of CONVERSION-001 for Opinio. Every event goes to GA4 only
 * through the consented gtag queue (src/components/Analytics.tsx); without an
 * explicit "granted" choice nothing is stored or sent.
 */
function env() {
  return windowEnv((name, params) => {
    // Explicit page context, so the event never inherits the document title
    // (a business name on /b/<slug>) or the real slug path set for page views.
    const page = pageForPath(window.location.pathname);
    if (!page) return;
    const origin = window.location.origin;
    window.gtag?.('event', name, { ...params, page_location: origin + page.templatePath, page_title: page.pageId, page_referrer: origin + '/' });
  });
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

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
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
    if (response.status === 204) storage()?.removeItem(WITHDRAWAL_KEY);
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
  const store = storage();
  if (!store) return;
  const journeyId = clearJourney({ storage: store });
  if (!journeyId) return;
  try {
    store.setItem(WITHDRAWAL_KEY, journeyId);
  } catch {
    // storage full or blocked: still try once
  }
  await sendWithdrawal(journeyId);
}

/** Retries an unconfirmed withdrawal. Runs on every load, whatever the current consent. */
export async function retryPendingWithdrawal(): Promise<void> {
  const pending = storage()?.getItem(WITHDRAWAL_KEY) ?? null;
  if (isOpaqueId('journey', pending)) await sendWithdrawal(pending);
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
