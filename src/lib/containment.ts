// Temporary containment of merchant surfaces until per-business merchant
// authentication exists (opinio #26). Every operation listed here is OFF by
// default and fails closed. Each one can be re-enabled on its own, only after
// its auth ticket ships, by adding its ID to the comma-separated
// OPINIO_REENABLE_OPS environment variable. Unknown IDs are ignored.

export const CONTAINED_OPERATIONS = {
  merchant_panel: 'All /merchant/** pages (dashboard, inbox, requests, reviews, settings, widgets, insights, integrations)',
  case_merchant_update: 'PATCH /api/v1/cases/[id] (merchant status, remedy, summary)',
  case_merchant_message: 'sendCaseMessageAction (the public POST /api/v1/cases/[id]/messages always records the buyer and refuses other senders)',
  case_remedy: 'updateCaseRemedyAction',
  review_response: 'POST /api/v1/reviews/[id]/responses; postReviewResponseAction',
  business_settings: 'updateBusinessSettingsAction (business profile, RFC and CLEE identity records)',
  widget_management: 'createOrUpdateWidgetAction',
  invitation_create: 'POST /api/v1/invitations; triggerInvitationAction',
  order_events: 'POST /api/v1/order-events',
  review_claimed_verification: 'POST /api/v1/reviews: trust a body-supplied order_id or reviewed_proof as verification, and recalculate the stored score for unverified reviews',
} as const;

export type ContainedOperation = keyof typeof CONTAINED_OPERATIONS;

export const CONTAINED_ERROR = 'Esta función está temporalmente desactivada.';
export const CONTAINED_STATUS = 403;

export function isOperationEnabled(operation: ContainedOperation, env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.OPINIO_REENABLE_OPS ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(operation);
}

/** Server-action result when an operation is contained. Never touches the database. */
export function containedActionResult() {
  return { success: false as const, status: CONTAINED_STATUS, error: CONTAINED_ERROR };
}

/** Neutral HTML for contained private pages: no data, noindex. */
export const MERCHANT_UNAVAILABLE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Panel temporalmente no disponible | Opinio</title></head><body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.5rem;line-height:1.6"><h1>Panel temporalmente no disponible</h1><p>Estamos habilitando el acceso seguro para comercios. Los perfiles públicos y el seguimiento de casos siguen disponibles.</p><p><a href="/">Volver a Opinio</a></p></body></html>`;
