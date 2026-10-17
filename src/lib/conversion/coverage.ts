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
  { stage: 'review_published', status: 'measured', source: 'first-party ledger, after the review + passport transaction', note: 'not proof of a genuine customer, an owner or merchant activation' },
  { stage: 'enquiry_submitted (merchant)', status: 'unavailable', source: 'none', note: 'no merchant enquiry/signup flow; a /merchant panel visit is intent only' },
  { stage: 'qualified', status: 'unavailable', source: 'none', note: 'needs trusted owner linkage (merchant auth, opinio #27–#30)' },
  { stage: 'activated', status: 'unavailable', source: 'none', note: 'desired: owned profile completed → first genuine published customer review; needs owner linkage and review authenticity proof' },
  { stage: 'paid', status: 'unavailable', source: 'none', note: 'no Opinio billing integration; customer-order payments at merchants are never Opinio revenue' },
  { stage: 'week2_return (business)', status: 'unavailable', source: 'none', note: 'needs trusted owner linkage; anonymous visitor return is not merchant retention' },
];

/** Minimal product prerequisite for the unavailable stages (separately approved; not built here). */
export const OWNER_LINKAGE_PREREQUISITE =
  'A verified owner account linked to exactly one business (opinio #26–#30), a protected profile-completion transition, and review authenticity proof (buyer link, #32). Billing for a paid stage.';
