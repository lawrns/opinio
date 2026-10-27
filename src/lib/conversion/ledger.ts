/**
 * conversion/ledger.ts — Opinio's minimal first-party conversion ledger on
 * the existing `pg` pool (CONVERSION-001).
 *
 * Only trustworthy committed product outcomes are recorded. Today that is one
 * milestone: a published review, recorded after its write commits (and after
 * its passport update when that runs for the review). It is not
 * proof of a genuine customer, a business owner or merchant activation; those
 * stages are unavailable (coverage.ts). Delivery to GA4 is optional (needs
 * GA4_API_SECRET), only for consent-granted journeys, claimed before sending
 * and bounded by a timeout. A ledger failure never fails the product write.
 */
import { query } from '@/lib/db';
import type { AttributionSnapshot } from './attribution';
import type { ConversionContext } from './context';
import { CONVERSION_MILESTONES, isOpaqueId, pick, type ConversionJourney, type ConversionMilestone } from './contract';
import { buildConversionEvent, newOpaqueId } from './payload';

export const CONVERSION_SEND_TIMEOUT_MS = 3000;
export const MAX_DELIVERY_ATTEMPTS = 5;
const MAX_DELIVERY_AGE_MS = 72 * 60 * 60 * 1000;

export type RecordInput = {
  entityType: 'review';
  entityId: string;
  milestone: ConversionMilestone;
  journey: ConversionJourney;
  context: ConversionContext;
  occurredAt?: Date;
  source?: 'live' | 'reconciled';
  /** When true, stores only the submission's conversion_identities row and defers the review_published stage event until admin approval. */
  pendingModeration?: boolean;
};

export type RecordResult = { status: 'recorded' | 'deferred' | 'duplicate' | 'invalid' | 'error'; delivery?: string };

type IdentityRow = { analytics_id: string; journey_id: string | null; consent_state: string; first_touch: AttributionSnapshot['firstTouch']; last_touch: AttributionSnapshot['lastTouch'] };
type StageRow = { event_id: string; analytics_id: string | null; stage: string; journey: ConversionJourney; occurred_at: string; consent_state: string; delivery_attempts: number };

export type Deps = {
  query: typeof query;
  send: (event: { name: string; params: Record<string, string> }, clientId: string, occurredAt: Date) => Promise<'sent' | 'failed' | 'unconfigured'>;
  now: () => Date;
  randomUUID: () => string;
  log: (message: string) => void;
};

export async function sendGa4Event(
  event: { name: string; params: Record<string, string> },
  clientId: string,
  occurredAt: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<'sent' | 'failed' | 'unconfigured'> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return 'unconfigured';
  try {
    const response = await fetchImpl(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(CONVERSION_SEND_TIMEOUT_MS),
        body: JSON.stringify({ client_id: clientId, timestamp_micros: occurredAt.getTime() * 1000, non_personalized_ads: true, events: [{ name: event.name, params: event.params }] }),
      },
    );
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

export function defaultDeps(): Deps {
  return { query, send: sendGa4Event, now: () => new Date(), randomUUID: () => globalThis.crypto.randomUUID(), log: (m) => console.warn(m) };
}

/** Records a milestone once and attempts delivery (or defers stage recording while pending moderation). Never throws. */
export async function recordMilestone(input: RecordInput, deps: Deps = defaultDeps()): Promise<RecordResult> {
  try {
    const milestone = pick(CONVERSION_MILESTONES, input.milestone);
    if (!milestone || !/^[0-9]{1,18}$/.test(input.entityId)) return { status: 'invalid' };
    const stage = `milestone_${milestone}`;
    const granted = input.context.consent === 'granted';
    const touch = granted ? input.context.attribution : null;

    // An identity per entity; a consented browser journey links to the visitor's analytics ID.
    let analyticsId = newOpaqueId('acct', deps.randomUUID);
    if (granted && input.context.journeyId) {
      const prior = await deps.query<{ analytics_id: string }>(
        'SELECT analytics_id FROM conversion_identities WHERE journey_id = $1 ORDER BY created_at ASC LIMIT 1',
        [input.context.journeyId],
      );
      if (prior.rows[0]) analyticsId = prior.rows[0].analytics_id;
    }
    await deps.query(
      `INSERT INTO conversion_identities (entity_type, entity_id, analytics_id, journey_id, consent_state, first_touch, last_touch)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (entity_type, entity_id) DO NOTHING`,
      [input.entityType, input.entityId, analyticsId, granted ? input.context.journeyId : null, granted ? 'granted' : 'denied',
        touch?.firstTouch ? JSON.stringify(touch.firstTouch) : null, touch?.lastTouch ? JSON.stringify(touch.lastTouch) : null],
    );
    if (input.pendingModeration) {
      return { status: 'deferred' };
    }
    const identity = (await deps.query<IdentityRow>(
      'SELECT analytics_id, journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_type = $1 AND entity_id = $2',
      [input.entityType, input.entityId],
    )).rows[0];
    if (!identity) return { status: 'error' };

    const inserted = await deps.query<StageRow>(
      `INSERT INTO conversion_stage_events (event_id, dedupe_key, entity_type, entity_id, analytics_id, stage, journey, occurred_at, consent_state, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING event_id, analytics_id, stage, journey, occurred_at, consent_state, delivery_attempts`,
      [newOpaqueId('evt', deps.randomUUID), `${input.entityType}:${input.entityId}:${stage}`, input.entityType, input.entityId,
        identity.consent_state === 'granted' ? identity.analytics_id : null, stage, input.journey,
        (input.occurredAt ?? deps.now()).toISOString(), identity.consent_state, input.source ?? 'live'],
    );
    const row = inserted.rows[0];
    if (!row) return { status: 'duplicate' };
    return { status: 'recorded', delivery: await deliver(row, identity, deps) };
  } catch (error) {
    deps.log(`[conversion] milestone not recorded: error=${error instanceof Error ? error.name : 'error'}`);
    return { status: 'error' };
  }
}

/** Publishes the deferred review_published milestone after a pending review is approved by an administrator. */
export async function publishReviewMilestone(reviewId: number | string, deps: Deps = defaultDeps()): Promise<RecordResult> {
  return recordMilestone(
    {
      entityType: 'review',
      entityId: String(reviewId),
      milestone: 'review_published',
      journey: 'consumer_review',
      context: { journeyId: null, consent: 'denied', attribution: null },
    },
    deps,
  );
}

/** Clears stored conversion identity attribution when a pending review is rejected by an administrator. */
export async function discardReviewIdentity(reviewId: number | string, deps: Pick<Deps, 'query' | 'log'> = defaultDeps()): Promise<void> {
  const entityId = String(reviewId);
  if (!/^[0-9]{1,18}$/.test(entityId)) return;
  try {
    await deps.query(
      `UPDATE conversion_identities
          SET consent_state = 'denied', journey_id = NULL, first_touch = NULL, last_touch = NULL
        WHERE entity_type = 'review' AND entity_id = $1`,
      [entityId],
    );
  } catch (error) {
    deps.log(`[conversion] review identity discard failed: error=${error instanceof Error ? error.name : 'error'}`);
  }
}

async function deliver(row: StageRow, identity: IdentityRow, deps: Deps): Promise<string> {
  if (row.consent_state !== 'granted' || !row.analytics_id) {
    await deps.query(`UPDATE conversion_stage_events SET delivery_state = 'skipped_consent' WHERE event_id = $1`, [row.event_id]);
    return 'skipped_consent';
  }
  const occurredAt = new Date(row.occurred_at);
  if (deps.now().getTime() - occurredAt.getTime() > MAX_DELIVERY_AGE_MS) {
    await deps.query(`UPDATE conversion_stage_events SET delivery_state = 'expired' WHERE event_id = $1`, [row.event_id]);
    return 'expired';
  }
  const event = buildConversionEvent({
    stage: 'milestone',
    milestone: row.stage.replace(/^milestone_/, '') as ConversionMilestone,
    eventId: row.event_id,
    journey: row.journey,
    accountId: row.analytics_id,
    journeyId: identity.journey_id,
    attribution: { version: 'v1', firstTouch: identity.first_touch, lastTouch: identity.last_touch },
    attributionState: identity.first_touch || identity.last_touch ? 'available' : 'unavailable',
    consent: 'granted',
  });
  if (!event) return 'pending';
  const claimed = await deps.query(
    `UPDATE conversion_stage_events SET delivery_state = 'sending', delivery_attempts = delivery_attempts + 1, last_attempt_at = NOW()
     WHERE event_id = $1 AND delivery_state IN ('pending', 'failed') RETURNING event_id`,
    [row.event_id],
  );
  if (claimed.rows.length === 0) return 'sending';
  const outcome = await deps.send(event as { name: string; params: Record<string, string> }, row.analytics_id, occurredAt);
  if (outcome === 'unconfigured') {
    await deps.query(`UPDATE conversion_stage_events SET delivery_state = 'pending', delivery_attempts = delivery_attempts - 1 WHERE event_id = $1`, [row.event_id]);
    return 'pending';
  }
  const state = outcome === 'sent' ? 'sent' : 'failed';
  await deps.query(`UPDATE conversion_stage_events SET delivery_state = $2 WHERE event_id = $1 AND delivery_state = 'sending'`, [row.event_id, state]);
  return state;
}

/**
 * Retry and reconciliation (scripts/conversion-maintenance.ts): releases
 * stale claims, retries pending/failed rows (bounded), and recovers
 * review_published rows whose live write was lost, from the reviews table
 * (published reviews created after the ledger's first live row; no
 * attribution is invented, so recovered rows are not consented and not sent).
 */
export async function maintainLedger(deps: Deps = defaultDeps()): Promise<{ recovered: number; attempted: number }> {
  await deps.query(`UPDATE conversion_stage_events SET delivery_state = 'failed' WHERE delivery_state = 'sending' AND last_attempt_at < NOW() - INTERVAL '10 minutes'`);
  const live = await deps.query<{ since: string | null }>(`SELECT MIN(created_at)::text AS since FROM conversion_stage_events WHERE source = 'live'`);
  let recovered = 0;
  const since = live.rows[0]?.since;
  if (since) {
    const missing = await deps.query<{ id: number; created_at: string }>(
      `SELECT r.id, r.created_at FROM reviews r
        WHERE r.status = 'published' AND r.created_at >= $1
          AND NOT EXISTS (SELECT 1 FROM conversion_stage_events e WHERE e.dedupe_key = 'review:' || r.id || ':milestone_review_published')
        ORDER BY r.created_at ASC LIMIT 500`,
      [since],
    );
    for (const r of missing.rows) {
      const res = await recordMilestone(
        { entityType: 'review', entityId: String(r.id), milestone: 'review_published', journey: 'consumer_review', context: { journeyId: null, consent: 'denied', attribution: null }, occurredAt: new Date(r.created_at), source: 'reconciled' },
        deps,
      );
      if (res.status === 'recorded') recovered++;
    }
  }
  const pending = await deps.query<StageRow & IdentityRow & { identity_consent: string }>(
    `SELECT e.event_id, e.analytics_id, e.stage, e.journey, e.occurred_at, e.consent_state, e.delivery_attempts,
            i.journey_id, i.first_touch, i.last_touch, i.consent_state AS identity_consent
       FROM conversion_stage_events e JOIN conversion_identities i ON i.entity_type = e.entity_type AND i.entity_id = e.entity_id
      WHERE e.delivery_state IN ('pending', 'failed') AND e.delivery_attempts < $1 ORDER BY e.occurred_at ASC LIMIT 200`,
    [MAX_DELIVERY_ATTEMPTS],
  );
  // Consent is re-checked at every attempt: a row queued while granted is
  // never sent once its identity is no longer granted (withdrawal).
  for (const row of pending.rows) {
    await deliver(row.identity_consent === 'granted' ? row : { ...row, consent_state: 'denied' }, row, deps);
  }
  return { recovered, attempted: pending.rows.length };
}

/**
 * Consent withdrawn for a browser journey: every undelivered row of its
 * identities is stopped (`skipped_consent`, analytics ID removed), then the
 * identities are unlinked (journey and touches erased). A row being sent right
 * now keeps its `sending` state so its real outcome is recorded (GA4 may
 * already have it); it loses its analytics ID and consent, so if that send
 * fails it is never retried. Returns the number of rows stopped. Never sends
 * anything.
 */
export async function withdrawJourney(journeyId: string, deps: Pick<Deps, 'query'> = defaultDeps()): Promise<number> {
  if (!isOpaqueId('journey', journeyId)) return 0;
  const stopped = await deps.query<{ event_id: string }>(
    `UPDATE conversion_stage_events e SET delivery_state = 'skipped_consent', analytics_id = NULL, consent_state = 'denied'
       FROM conversion_identities i
      WHERE i.entity_type = e.entity_type AND i.entity_id = e.entity_id AND i.journey_id = $1
        AND e.delivery_state IN ('pending', 'failed')
      RETURNING e.event_id`,
    [journeyId],
  );
  await deps.query(
    `UPDATE conversion_stage_events e SET analytics_id = NULL, consent_state = 'denied'
       FROM conversion_identities i
      WHERE i.entity_type = e.entity_type AND i.entity_id = e.entity_id AND i.journey_id = $1
        AND e.delivery_state = 'sending'`,
    [journeyId],
  );
  await deps.query(
    `UPDATE conversion_identities SET consent_state = 'denied', journey_id = NULL, first_touch = NULL, last_touch = NULL WHERE journey_id = $1`,
    [journeyId],
  );
  return stopped.rows.length;
}
