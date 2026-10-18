/**
 * conversion/cta.ts — reviewed CTA placement IDs (Opinio). A click is intent
 * only; search text, business names, hrefs and DOM text are never sent.
 */
import type { ConversionJourney } from './contract';

const CTA_JOURNEYS = {
  home_search_submit: 'consumer_discovery',
  home_explore_directory: 'consumer_discovery',
  nav_write_review: 'consumer_review',
  nav_merchant_panel: 'merchant_panel',
  reputation_merchant_panel: 'merchant_panel',
  reputation_directory: 'consumer_discovery',
  search_open_passport: 'consumer_discovery',
  directory_open_passport: 'consumer_discovery',
  search_write_review: 'consumer_review',
  passport_write_review: 'consumer_review',
  nav_case_new: 'consumer_case',
} as const satisfies Record<string, ConversionJourney>;

export type CtaId = keyof typeof CTA_JOURNEYS;
export const UNMAPPED_CTA_ID = 'unmapped';
export const ALL_CTA_IDS: readonly string[] = [...Object.keys(CTA_JOURNEYS), UNMAPPED_CTA_ID];

export function ctaIdFor(explicit: unknown): string {
  return typeof explicit === 'string' && explicit in CTA_JOURNEYS ? explicit : UNMAPPED_CTA_ID;
}

export function journeyForCta(ctaId: string): ConversionJourney | null {
  return (CTA_JOURNEYS as Record<string, ConversionJourney>)[ctaId] ?? null;
}
