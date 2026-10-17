'use client';

import { clearJourney, conversionContextForServer, recordLanding, trackIntent, windowEnv } from './browser';
import type { ConversionJourney, StepId } from './contract';
import { ctaIdFor, journeyForCta } from './cta';

/**
 * Browser half of CONVERSION-001 for Opinio. Every event goes to GA4 only
 * through the consented gtag queue (src/components/Analytics.tsx); without an
 * explicit "granted" choice nothing is stored or sent.
 */
function env() {
  return windowEnv((name, params) => window.gtag?.('event', name, params));
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
  const e = env();
  return e ? conversionContextForServer(e) : { consent: 'denied' };
}

/** Denial or withdrawal: the local journey and its attribution are deleted. */
export function clearConversionJourney(): void {
  if (typeof window !== 'undefined') clearJourney({ storage: window.localStorage });
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
