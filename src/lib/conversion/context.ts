/**
 * conversion/context.ts — the browser→server association, re-validated on the
 * server. The browser can only offer an opaque journey ID, its consent state
 * and allowlisted touches; it can never assert a stage.
 */
import { sanitizeTouch, type AttributionSnapshot } from "./attribution";
import { ATTRIBUTION_VERSION, CONSENT_STATES, isOpaqueId, pick, type ConsentState } from "./contract";
import { allPageIds } from "./pages";

export type ConversionContext = {
  journeyId: string | null;
  consent: ConsentState;
  attribution: AttributionSnapshot | null;
};

export const NO_CONTEXT: ConversionContext = { journeyId: null, consent: "unspecified", attribution: null };

/** Parses `body.conversion`. Invalid or missing parts degrade to "unavailable", never to guessed values. */
export function parseConversionContext(raw: unknown): ConversionContext {
  if (!raw || typeof raw !== "object") return NO_CONTEXT;
  const value = raw as Record<string, unknown>;
  const consent = pick(CONSENT_STATES, value.consent, "unspecified");
  if (consent === "denied") return { journeyId: null, consent, attribution: null };
  const pageIds = allPageIds();
  const firstTouch = sanitizeTouch(value.firstTouch, pageIds);
  const lastTouch = sanitizeTouch(value.lastTouch, pageIds);
  return {
    journeyId: isOpaqueId("journey", value.journeyId) ? value.journeyId : null,
    consent,
    attribution: firstTouch || lastTouch ? { version: ATTRIBUTION_VERSION, firstTouch, lastTouch } : null,
  };
}
