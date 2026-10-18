/**
 * conversion/browser.ts — browser half of CONVERSION-001.
 *
 * Keeps an opaque journey ID and allowlisted first/last touch in
 * localStorage (only when consent is not denied), emits intent-only events
 * (CTA clicks, step starts) to GA4, and hands the server an association it
 * re-validates. The browser never asserts enquiry, qualification,
 * activation, payment or return.
 */
import { applyTouch, classifyTouch, sanitizeTouch, type AttributionSnapshot } from "./attribution";
import { CONVERSION_STORAGE_KEY, readConsent } from "./consent";
import { ATTRIBUTION_VERSION, isOpaqueId, type ConsentState, type ConversionJourney, type StepId } from "./contract";
import { allPageIds, pageIdForPath } from "./pages";
import { buildConversionEvent, newOpaqueId, type ConversionEvent } from "./payload";

type StoredState = { journeyId: string; attribution: AttributionSnapshot };

export type BrowserEnv = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  consent: () => ConsentState;
  emit: (event: ConversionEvent) => void;
  randomUUID: () => string;
};

function load(env: BrowserEnv): StoredState | null {
  try {
    const raw = env.storage.getItem(CONVERSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isOpaqueId("journey", parsed.journeyId)) return null;
    const attribution = parsed.attribution as Record<string, unknown> | undefined;
    const pageIds = allPageIds();
    return {
      journeyId: parsed.journeyId,
      attribution: {
        version: ATTRIBUTION_VERSION,
        firstTouch: sanitizeTouch(attribution?.firstTouch, pageIds),
        lastTouch: sanitizeTouch(attribution?.lastTouch, pageIds),
      },
    };
  } catch {
    return null;
  }
}

function save(env: BrowserEnv, state: StoredState) {
  try {
    env.storage.setItem(CONVERSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: attribution stays unavailable, nothing is guessed.
  }
}

/** Current journey state, created on first use when consent allows. */
export function journeyState(env: BrowserEnv): StoredState | null {
  if (env.consent() === "denied") {
    clearJourney(env);
    return null;
  }
  const existing = load(env);
  if (existing) return existing;
  const fresh: StoredState = {
    journeyId: newOpaqueId("jrn", env.randomUUID),
    attribution: { version: ATTRIBUTION_VERSION, firstTouch: null, lastTouch: null },
  };
  save(env, fresh);
  return fresh;
}

/** Removes the stored journey and attribution (consent denied or withdrawn). Returns the removed journey ID. */
export function clearJourney(env: Pick<BrowserEnv, "storage">): string | null {
  let journeyId: string | null = null;
  try {
    const raw = env.storage.getItem(CONVERSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { journeyId?: unknown }) : null;
    journeyId = isOpaqueId("journey", parsed?.journeyId) ? parsed.journeyId : null;
  } catch {
    journeyId = null;
  }
  try {
    env.storage.removeItem(CONVERSION_STORAGE_KEY);
  } catch {
    // storage unavailable: nothing stored to clear
  }
  return journeyId;
}

/** Records the landing of a full page load (not client-side navigations). */
export function recordLanding(
  env: BrowserEnv,
  landing: { pathname: string; search: string; referrer: string; host: string },
): void {
  const state = journeyState(env);
  if (!state) return;
  const params = new URLSearchParams(landing.search);
  const touch = classifyTouch(
    {
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      referrer: landing.referrer,
      currentHost: landing.host,
      landingPage: pageIdForPath(landing.pathname),
    },
    allPageIds(),
  );
  save(env, { journeyId: state.journeyId, attribution: applyTouch(state.attribution, touch) });
}

/** What the server may associate with a product record (re-validated server-side). */
export function conversionContextForServer(env: BrowserEnv): Record<string, unknown> {
  const consent = env.consent();
  if (consent === "denied") return { consent };
  const state = journeyState(env);
  return {
    consent,
    journeyId: state?.journeyId ?? null,
    firstTouch: state?.attribution.firstTouch ?? null,
    lastTouch: state?.attribution.lastTouch ?? null,
  };
}

/** Intent-only browser events. Dropped on unreviewed (private) routes and when consent is denied. */
export function trackIntent(
  env: BrowserEnv,
  input: { stage: "cta_click" | "step_started"; journey: ConversionJourney; pathname: string; ctaId?: string; stepId?: StepId },
): ConversionEvent | null {
  const pageId = pageIdForPath(input.pathname);
  if (!pageId) return null;
  const consent = env.consent();
  const state = journeyState(env);
  const event = buildConversionEvent({
    stage: input.stage,
    eventId: newOpaqueId("evt", env.randomUUID),
    journey: input.journey,
    journeyId: state?.journeyId ?? null,
    pageId,
    ctaId: input.ctaId,
    stepId: input.stepId,
    attribution: state?.attribution ?? null,
    consent,
  });
  if (event) env.emit(event);
  return event;
}

/**
 * localStorage, or a no-op store when the browser blocks site data (reading
 * `window.localStorage` itself throws then). Nothing is kept without storage,
 * and nothing here can fail a page or a review submit.
 */
function safeStorage(): BrowserEnv["storage"] {
  try {
    const storage = window.localStorage;
    if (storage) return storage;
  } catch {
    // blocked
  }
  return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
}

/** Production browser environment (GA4 only). */
export function windowEnv(emitToGa: (name: string, params: Record<string, string>) => void): BrowserEnv | null {
  if (typeof window === "undefined") return null;
  return {
    storage: safeStorage(),
    consent: () => readConsent(window),
    emit: (event) => emitToGa(event.name, event.params as Record<string, string>),
    randomUUID: () => window.crypto.randomUUID(),
  };
}
