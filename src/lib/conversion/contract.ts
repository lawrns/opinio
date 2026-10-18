/**
 * conversion/contract.ts — CONVERSION-001 measurement contract for Opinio.
 *
 * Everything that may cross the analytics boundary (consented GA4 browser
 * events, optional GA4 Measurement Protocol, the first-party ledger) is an allowlisted
 * ID or stage name defined here. Input text is never forwarded: unknown values
 * become `unknown`, never a cleaned copy of the input.
 *
 * Pure module: no I/O, safe on server and client.
 */

export const ATTRIBUTION_VERSION = "v1";

/** Authoritative and intent stages. Event name on the wire is `conversion_<stage>`. */
export const CONVERSION_STAGES = [
  // Browser may assert these (intent only).
  "cta_click",
  "step_started",
  // Server-only, after durable product success.
  "enquiry_submitted",
  "qualified",
  "activated",
  "paid",
  "week2_return",
  "step_failed",
] as const;
export type ConversionStage = (typeof CONVERSION_STAGES)[number];

export const BROWSER_STAGES: readonly ConversionStage[] = ["cta_click", "step_started"];

/**
 * Intermediate milestones. None of them implies qualification, merchant
 * activation, paid or business retention, which are unavailable in Opinio
 * until trusted owner linkage and billing exist (see coverage.ts).
 */
export const CONVERSION_MILESTONES = [
  // A review committed with its passport update. Not proof of a genuine
  // customer, an owner or merchant activation.
  "review_published",
] as const;
export type ConversionMilestone = (typeof CONVERSION_MILESTONES)[number];

/** Journeys measured with separate step progression and denominators. */
export const CONVERSION_JOURNEYS = [
  "consumer_discovery",
  "consumer_review",
  "consumer_case",
  "merchant_panel",
] as const;
export type ConversionJourney = (typeof CONVERSION_JOURNEYS)[number];

export const FAILURE_REASONS = [
  "validation_failed",
  "permission_denied",
  "configuration_unavailable",
  "delivery_failed",
  "booking_unavailable",
  "payment_failed",
] as const;
export type FailureReason = (typeof FAILURE_REASONS)[number];

/** Browser step starts (intent only). */
export const STEP_IDS = [
  "search_submitted",
  "review_form_experience",
  "review_form_publish",
] as const;
export type StepId = (typeof STEP_IDS)[number];

export const SOURCE_CATEGORIES = ["tagged", "organic_search", "referral", "direct", "unknown"] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

/**
 * Published allowlist of marketing attribution codes. Lower-case, `_` only.
 * Anything else that arrives as utm_* becomes `unknown`.
 */
export const APPROVED_UTM_SOURCES = [
  "google",
  "bing",
  "facebook",
  "instagram",
  "whatsapp",
  "linkedin",
  "tiktok",
  "youtube",
  "email",
  "newsletter",
  "affiliate",
  "partner",
  "qr",
] as const;
export const APPROVED_UTM_MEDIUMS = [
  "cpc",
  "paid_social",
  "social",
  "email",
  "referral",
  "affiliate",
  "organic",
  "qr",
  "whatsapp",
  "print",
] as const;
/** Campaign codes found in Opinio's own published links. Extend only by code review. */
export const APPROVED_UTM_CAMPAIGNS = [] as const satisfies readonly string[];

export const CONSENT_STATES = ["granted", "unspecified", "denied"] as const;
export type ConsentState = (typeof CONSENT_STATES)[number];

export const ATTRIBUTION_STATES = ["available", "unavailable", "consent_denied"] as const;
export type AttributionState = (typeof ATTRIBUTION_STATES)[number];

const OPAQUE_ID = {
  event: /^evt_[0-9a-f]{32}$/,
  journey: /^jrn_[0-9a-f]{32}$/,
  account: /^acct_[0-9a-f]{32}$/,
} as const;

export function isOpaqueId(kind: keyof typeof OPAQUE_ID, value: unknown): value is string {
  return typeof value === "string" && OPAQUE_ID[kind].test(value);
}

/** One of `values`, or `fallback`. Never returns a transformed copy of free input. */
export function pick<T extends string>(values: readonly T[], value: unknown, fallback: T): T;
export function pick<T extends string>(values: readonly T[], value: unknown): T | undefined;
export function pick<T extends string>(values: readonly T[], value: unknown, fallback?: T): T | undefined {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** An allowlisted code, or `unknown`. */
export function codeOrUnknown(values: readonly string[], value: unknown): string {
  return typeof value === "string" && values.includes(value) ? value : "unknown";
}

/** Normalizes a utm_* value for allowlist comparison only (the result is never forwarded unless allowlisted). */
export function normalizeCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/-/g, "_") : "";
}
