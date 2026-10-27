/**
 * conversion/coverage.ts — explicit coverage of the CONVERSION-001 funnel for
 * Opinio, so unsupported stages read as "unavailable", never as zero.
 */
export type StageCoverage = {
  stage: string;
  status: 'measured' | 'intent_only' | 'unavailable';
  source: string;
  note: string;
};

export const STAGE_COVERAGE: readonly StageCoverage[] = [
  { stage: 'page_view', status: 'measured', source: 'GA4 (consented, reviewed public pages, query stripped)', note: 'home, directory, search, passport, review form, new case, blog, reputation landing' },
  { stage: 'cta_click', status: 'intent_only', source: 'GA4 conversion_cta_click (consented)', note: 'search, explore directory, write review, merchant panel; never search text or business data' },
  { stage: 'step_started', status: 'intent_only', source: 'GA4 conversion_step_started (consented)', note: 'search submitted, review form steps' },
  { stage: 'step_denominators', status: 'intent_only', source: 'GA4 conversion_step_started (consented visitors only)', note: 'review_form_experience → review_form_publish step counts per journey; a GA4 exploration, not the first-party readout' },
  { stage: 'review_published', status: 'measured', source: 'first-party ledger, after the published review commits', note: 'not proof of a genuine customer, an owner or merchant activation; live and reconciled rows are reported separately (seed/import scripts bypass the API, so their reviews can only appear as reconciled)' },
  { stage: 'step_failed', status: 'unavailable', source: 'none', note: 'a failed browser submit has no trusted server entity (step_failed is server-only in the contract) and the review route has no failure ledger' },
  { stage: 'review_abandonment', status: 'unavailable', source: 'none', note: 'needs consented step starts joined to published reviews; anonymous, unconsented visitors leave no trace by design' },
  { stage: 'enquiry_submitted (merchant)', status: 'unavailable', source: 'none', note: 'no merchant enquiry/signup flow; a /merchant panel visit is intent only' },
  { stage: 'qualified', status: 'unavailable', source: 'none', note: 'needs trusted owner linkage (merchant auth, opinio #27–#30)' },
  { stage: 'activated', status: 'unavailable', source: 'none', note: 'desired: owned profile completed → first genuine published customer review; needs owner linkage and review authenticity proof' },
  { stage: 'paid', status: 'unavailable', source: 'none', note: 'no Opinio billing integration; customer-order payments at merchants are never Opinio revenue' },
  { stage: 'week2_return (business)', status: 'unavailable', source: 'none', note: 'needs trusted owner linkage; anonymous visitor return is not merchant retention' },
];

/** The readout's grouping: intent-only GA4 stages are never listed as unavailable. */
export function coverageByStatus(rows: readonly StageCoverage[] = STAGE_COVERAGE) {
  const of = (status: StageCoverage['status']) => rows.filter((r) => r.status === status);
  return { measured: of('measured'), intentOnly: of('intent_only'), unavailable: of('unavailable') };
}

/** Minimal product prerequisite for the unavailable stages (separately approved; not built here). */
export const OWNER_LINKAGE_PREREQUISITE =
  'A verified owner account linked to exactly one business (opinio #26–#30), a protected profile-completion transition, and review authenticity proof (buyer link, #32). Billing for a paid stage.';

export type ReconciliationCoverage = {
  status: 'anchored' | 'unknown';
  since: string | null;
  note: string;
};

/**
 * Exposes whether ledger reconciliation has a persisted activation watermark.
 * Without a watermark (and before any live milestone has been anchored),
 * recovery coverage is explicitly reported as `'unknown'` rather than zero.
 */
export function reconciliationCoverage(watermarkSince: string | null | undefined): ReconciliationCoverage {
  const since = typeof watermarkSince === 'string' && watermarkSince.trim().length > 0 ? watermarkSince.trim() : null;
  if (!since) {
    return {
      status: 'unknown',
      since: null,
      note: 'no activation watermark or live milestone recorded yet; lost first-write coverage is unknown until anchored',
    };
  }
  return {
    status: 'anchored',
    since,
    note: 'reconciles published reviews created at or after the persisted activation watermark',
  };
}

