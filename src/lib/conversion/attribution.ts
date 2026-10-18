/**
 * conversion/attribution.ts — controlled first/last touch attribution.
 *
 * A touch is a set of allowlisted IDs: a broad source category plus approved
 * source/medium/campaign codes. utm_term, utm_content, full URLs, query
 * strings and referrer hosts are never kept. Unknown codes become `unknown`.
 * Direct traffic is never guessed from a missing referrer.
 */
import {
  APPROVED_UTM_CAMPAIGNS,
  APPROVED_UTM_MEDIUMS,
  APPROVED_UTM_SOURCES,
  ATTRIBUTION_VERSION,
  SOURCE_CATEGORIES,
  codeOrUnknown,
  normalizeCode,
  pick,
  type SourceCategory,
} from "./contract";

export type Touch = {
  category: SourceCategory;
  source: string;
  medium: string;
  campaign: string;
  /** Reviewed page ID where the touch landed, or `unknown`. */
  landingPage: string;
};

export type AttributionSnapshot = {
  version: typeof ATTRIBUTION_VERSION;
  firstTouch: Touch | null;
  /** Last eligible non-direct touch; direct/internal navigation never overwrites it. */
  lastTouch: Touch | null;
};

export type TouchInput = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  /** Raw document.referrer; only its host is inspected, never kept. */
  referrer?: string | null;
  /** Host of the current site (same-host referrers are internal navigation). */
  currentHost: string;
  landingPage?: string | null;
};

const SEARCH_HOSTS = [/(^|\.)google\.[a-z.]+$/, /(^|\.)bing\.com$/, /(^|\.)duckduckgo\.com$/, /(^|\.)search\.yahoo\.com$/, /(^|\.)ecosia\.org$/, /(^|\.)search\.brave\.com$/];

function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when a utm_* value is an approved attribution code. */
export function isApprovedAttributionCode(key: string, value: string): boolean {
  const code = normalizeCode(value);
  if (key === "utm_source") return (APPROVED_UTM_SOURCES as readonly string[]).includes(code);
  if (key === "utm_medium") return (APPROVED_UTM_MEDIUMS as readonly string[]).includes(code);
  if (key === "utm_campaign") return (APPROVED_UTM_CAMPAIGNS as readonly string[]).includes(code);
  return false;
}

/** Classifies one landing. Returns null for internal navigation (not a touch). */
export function classifyTouch(input: TouchInput, pageIds: readonly string[] = []): Touch | null {
  const landingPage = typeof input.landingPage === "string" && pageIds.includes(input.landingPage) ? input.landingPage : "unknown";
  const hasUtm = Boolean(input.utmSource || input.utmMedium || input.utmCampaign);
  if (hasUtm) {
    const source = codeOrUnknown(APPROVED_UTM_SOURCES, normalizeCode(input.utmSource));
    const medium = codeOrUnknown(APPROVED_UTM_MEDIUMS, normalizeCode(input.utmMedium));
    const campaign = codeOrUnknown(APPROVED_UTM_CAMPAIGNS, normalizeCode(input.utmCampaign));
    return { category: source === "unknown" ? "unknown" : "tagged", source, medium, campaign, landingPage };
  }
  const host = referrerHost(input.referrer);
  const current = input.currentHost.toLowerCase();
  if (host && (host === current || host.endsWith(`.${current}`) || current.endsWith(`.${host}`))) return null;
  if (host && SEARCH_HOSTS.some((pattern) => pattern.test(host))) {
    return { category: "organic_search", source: "unknown", medium: "organic", campaign: "unknown", landingPage };
  }
  if (host) return { category: "referral", source: "unknown", medium: "referral", campaign: "unknown", landingPage };
  return { category: "unknown", source: "unknown", medium: "unknown", campaign: "unknown", landingPage };
}

const ELIGIBLE_LAST: readonly SourceCategory[] = ["tagged", "organic_search", "referral"];

/** Folds a new touch into the snapshot: first touch is kept, last touch only moves on eligible non-direct touches. */
export function applyTouch(snapshot: AttributionSnapshot | null, touch: Touch | null): AttributionSnapshot {
  const base: AttributionSnapshot = snapshot ?? { version: ATTRIBUTION_VERSION, firstTouch: null, lastTouch: null };
  if (!touch) return base;
  return {
    version: ATTRIBUTION_VERSION,
    firstTouch: base.firstTouch ?? touch,
    lastTouch: ELIGIBLE_LAST.includes(touch.category) ? touch : base.lastTouch,
  };
}

/** Re-validates an untrusted touch (from the browser or storage) against the allowlists. */
export function sanitizeTouch(value: unknown, pageIds: readonly string[]): Touch | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const category = pick(SOURCE_CATEGORIES, raw.category);
  if (!category) return null;
  return {
    category,
    source: codeOrUnknown(APPROVED_UTM_SOURCES, raw.source),
    medium: codeOrUnknown(APPROVED_UTM_MEDIUMS, raw.medium),
    campaign: codeOrUnknown(APPROVED_UTM_CAMPAIGNS, raw.campaign),
    landingPage: typeof raw.landingPage === "string" && pageIds.includes(raw.landingPage) ? raw.landingPage : "unknown",
  };
}
