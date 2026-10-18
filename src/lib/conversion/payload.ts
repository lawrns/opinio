/**
 * conversion/payload.ts — the only builder of analytics payloads for
 * CONVERSION-001. Output keys are a closed list and every value is an
 * allowlisted ID or stage name; anything else is dropped before it can leave.
 */
import { allPageIds } from "./pages";
import { ALL_CTA_IDS } from "./cta";
import type { AttributionSnapshot, Touch } from "./attribution";
import {
  ATTRIBUTION_STATES,
  ATTRIBUTION_VERSION,
  CONVERSION_JOURNEYS,
  CONVERSION_MILESTONES,
  CONVERSION_STAGES,
  FAILURE_REASONS,
  STEP_IDS,
  isOpaqueId,
  pick,
  type AttributionState,
  type ConsentState,
  type ConversionJourney,
  type ConversionMilestone,
  type ConversionStage,
} from "./contract";

export const PAYLOAD_KEYS = [
  "event_id",
  "account_id",
  "journey_id",
  "journey_type",
  "stage_id",
  "milestone_id",
  "page_id",
  "cta_id",
  "step_id",
  "failure_reason",
  "ft_category",
  "ft_source",
  "ft_medium",
  "ft_campaign",
  "ft_landing_page",
  "lt_category",
  "lt_source",
  "lt_medium",
  "lt_campaign",
  "lt_landing_page",
  "attribution_version",
  "attribution_state",
] as const;
export type PayloadKey = (typeof PAYLOAD_KEYS)[number];
export type ConversionParams = Partial<Record<PayloadKey, string>>;

export type ConversionEvent = { name: string; params: ConversionParams };

export type ConversionEventInput = {
  stage: ConversionStage | "milestone";
  milestone?: ConversionMilestone | null;
  eventId: string;
  journey: ConversionJourney;
  accountId?: string | null;
  journeyId?: string | null;
  pageId?: string | null;
  ctaId?: string | null;
  stepId?: string | null;
  failureReason?: string | null;
  attribution?: AttributionSnapshot | null;
  attributionState?: AttributionState;
  consent: ConsentState;
};

/** Every value that may leave: lower-case ID characters only, bounded length. */
const SAFE_VALUE = /^[a-z0-9_]{1,48}$/;

const PAGE_IDS = allPageIds();

function touchParams(prefix: "ft" | "lt", touch: Touch | null | undefined): ConversionParams {
  if (!touch) return {};
  return {
    [`${prefix}_category`]: touch.category,
    [`${prefix}_source`]: touch.source,
    [`${prefix}_medium`]: touch.medium,
    [`${prefix}_campaign`]: touch.campaign,
    [`${prefix}_landing_page`]: touch.landingPage,
  } as ConversionParams;
}

/** Drops every key outside PAYLOAD_KEYS and every value that is not a safe ID string. */
export function enforcePayloadAllowlist(params: Record<string, unknown>): ConversionParams {
  const out: ConversionParams = {};
  for (const key of PAYLOAD_KEYS) {
    const value = params[key];
    if (typeof value === "string" && SAFE_VALUE.test(value)) out[key] = value;
  }
  return out;
}

/**
 * Builds the event for GA4 / the ledger, or null when it must not be sent
 * (consent denied, or a stage/journey outside the contract).
 */
export function buildConversionEvent(input: ConversionEventInput): ConversionEvent | null {
  if (input.consent === "denied") return null;
  const isMilestone = input.stage === "milestone";
  const stage = isMilestone ? null : pick(CONVERSION_STAGES, input.stage);
  const milestone = isMilestone ? pick(CONVERSION_MILESTONES, input.milestone) : undefined;
  if (!isMilestone && !stage) return null;
  if (isMilestone && !milestone) return null;
  const journey = pick(CONVERSION_JOURNEYS, input.journey);
  if (!journey || !isOpaqueId("event", input.eventId)) return null;

  const attribution = input.attribution && input.attribution.version === ATTRIBUTION_VERSION ? input.attribution : null;
  const attributionState = pick(ATTRIBUTION_STATES, input.attributionState, attribution ? "available" : "unavailable");

  const params = enforcePayloadAllowlist({
    event_id: input.eventId,
    account_id: isOpaqueId("account", input.accountId) ? input.accountId : undefined,
    journey_id: isOpaqueId("journey", input.journeyId) ? input.journeyId : undefined,
    journey_type: journey,
    stage_id: stage ?? "milestone",
    milestone_id: milestone,
    page_id: input.pageId && PAGE_IDS.includes(input.pageId) ? input.pageId : undefined,
    cta_id: input.ctaId && ALL_CTA_IDS.includes(input.ctaId) ? input.ctaId : undefined,
    step_id: pick(STEP_IDS, input.stepId),
    failure_reason: stage === "step_failed" ? pick(FAILURE_REASONS, input.failureReason, "validation_failed") : undefined,
    ...(attributionState === "available" ? touchParams("ft", attribution?.firstTouch) : {}),
    ...(attributionState === "available" ? touchParams("lt", attribution?.lastTouch) : {}),
    attribution_version: ATTRIBUTION_VERSION,
    attribution_state: attributionState,
  });
  return { name: isMilestone ? "conversion_milestone" : `conversion_${stage}`, params };
}

/** 32 lower-case hex chars from a v4 UUID. */
export function randomHex32(randomUUID: () => string = () => globalThis.crypto.randomUUID()): string {
  return randomUUID().replace(/-/g, "").toLowerCase();
}

export function newOpaqueId(kind: "evt" | "jrn" | "acct", randomUUID?: () => string): string {
  return `${kind}_${randomHex32(randomUUID)}`;
}
