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
};

export type RecordResult = { status: 'recorded' | 'duplicate' | 'invalid' | 'error'; delivery?: string };

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

/**
 * Persists an explicit activation watermark for `milestone_review_published`
 * so reconciliation can recover lost initial live writes even before any
 * `source = 'live'` stage row succeeds. Requires an explicit, evidence-backed
 * activation timestamp and never moves an existing watermark forward.
 */
export async function activateConversionLedger(
  activatedAt: Date,
  deps: Pick<Deps, 'query'> = defaultDeps(),
): Promise<string> {
  if (!(activatedAt instanceof Date) || Number.isNaN(activatedAt.getTime())) {
    throw new Error('activateConversionLedger requires a valid explicit Date');
  }
  const since = activatedAt.toISOString();
  const res = await deps.query<{ since: string }>(
    `INSERT INTO conversion_watermarks (stage, activated_at)
     VALUES ('milestone_review_published', $1)
     ON CONFLICT (stage) DO UPDATE SET activated_at = LEAST(conversion_watermarks.activated_at, EXCLUDED.activated_at)
     RETURNING activated_at::text AS since`,
    [since],
  );
  return res.rows[0]?.since ?? since;
}

/** Records a milestone once and attempts delivery. Never throws. */
export async function recordMilestone(input: RecordInput, deps: Deps = defaultDeps()): Promise<RecordResult> {
  try {
    const milestone = pick(CONVERSION_MILESTONES, input.milestone);
    if (!milestone || !/^[0-9]{1,18}$/.test(input.entityId)) return { status: 'invalid' };
    const stage = `milestone_${milestone}`;
    const occurredAt = input.occurredAt ?? deps.now();
    const source = input.source ?? 'live';
    const granted = input.context.consent === 'granted';
    const requestedJourneyId = granted ? input.context.journeyId : null;
    const touch = granted ? input.context.attribution : null;

    // An identity per entity; a consented browser journey links to the visitor's analytics ID.
    const freshAnalyticsId = newOpaqueId('acct', deps.randomUUID);
    let analyticsId = freshAnalyticsId;
    if (granted && requestedJourneyId) {
      const prior = await deps.query<{ analytics_id: string }>(
        `SELECT analytics_id FROM conversion_identities
          WHERE journey_id = $1
            AND NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $1)
          ORDER BY created_at ASC LIMIT 1`,
        [requestedJourneyId],
      );
      if (prior.rows[0]) analyticsId = prior.rows[0].analytics_id;
    }
    await deps.query(
      `INSERT INTO conversion_identities (entity_type, entity_id, analytics_id, journey_id, consent_state, first_touch, last_touch)
       SELECT $1, $2,
              CASE WHEN $4::varchar IS NOT NULL AND EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $4) THEN $8 ELSE $3 END,
              CASE WHEN $4::varchar IS NOT NULL AND EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $4) THEN NULL ELSE $4 END,
              CASE WHEN $5 = 'granted' AND ($4::varchar IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $4)) THEN 'granted' ELSE 'denied' END,
              CASE WHEN $5 = 'granted' AND ($4::varchar IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $4)) THEN $6::jsonb ELSE NULL END,
              CASE WHEN $5 = 'granted' AND ($4::varchar IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $4)) THEN $7::jsonb ELSE NULL END
       ON CONFLICT (entity_type, entity_id) DO NOTHING`,
      [input.entityType, input.entityId, analyticsId, requestedJourneyId, granted ? 'granted' : 'denied',
        touch?.firstTouch ? JSON.stringify(touch.firstTouch) : null, touch?.lastTouch ? JSON.stringify(touch.lastTouch) : null, freshAnalyticsId],
    );
    const identity = (await deps.query<IdentityRow>(
      'SELECT analytics_id, journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_type = $1 AND entity_id = $2',
      [input.entityType, input.entityId],
    )).rows[0];
    if (!identity) return { status: 'error' };

    if (identity.consent_state !== 'denied') {
      const scrubbed = await deps.query<{ consent_state: 'denied' }>(
        `UPDATE conversion_identities i
            SET consent_state = 'denied', journey_id = NULL, first_touch = NULL, last_touch = NULL
          WHERE i.entity_type = $1 AND i.entity_id = $2
            AND i.consent_state <> 'denied'
            AND (
              (i.journey_id IS NOT NULL AND EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = i.journey_id))
              OR ($3::varchar IS NOT NULL AND EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $3))
            )
         RETURNING consent_state`,
        [input.entityType, input.entityId, requestedJourneyId],
      );
      if (scrubbed.rows.length > 0) {
        identity.consent_state = 'denied';
        identity.journey_id = null;
        identity.first_touch = null;
        identity.last_touch = null;
      }
    }

    if (source === 'live') {
      await deps.query(
        `INSERT INTO conversion_watermarks (stage, activated_at)
         VALUES ($1, $2)
         ON CONFLICT (stage) DO UPDATE SET activated_at = LEAST(conversion_watermarks.activated_at, EXCLUDED.activated_at)`,
        [stage, occurredAt.toISOString()],
      );
    }

    const inserted = await deps.query<StageRow>(
      `INSERT INTO conversion_stage_events (event_id, dedupe_key, entity_type, entity_id, analytics_id, stage, journey, occurred_at, consent_state, source)
       SELECT $1, $2, i.entity_type, i.entity_id,
              CASE WHEN $8 = 'live'
                    AND i.consent_state = 'granted'
                    AND (i.journey_id IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = i.journey_id))
                    AND ($9::varchar IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $9))
                   THEN i.analytics_id ELSE NULL END,
              $5, $6, $7,
              CASE WHEN $8 = 'live'
                    AND i.consent_state = 'granted'
                    AND (i.journey_id IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = i.journey_id))
                    AND ($9::varchar IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $9))
                   THEN 'granted' ELSE 'denied' END,
              $8
         FROM conversion_identities i
        WHERE i.entity_type = $3 AND i.entity_id = $4
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING event_id, analytics_id, stage, journey, occurred_at, consent_state, delivery_attempts`,
      [newOpaqueId('evt', deps.randomUUID), `${input.entityType}:${input.entityId}:${stage}`, input.entityType, input.entityId,
        stage, input.journey, occurredAt.toISOString(), source, requestedJourneyId],
    );
    const row = inserted.rows[0];
    if (!row) return { status: 'duplicate' };
    if (row.consent_state !== 'granted' && identity.consent_state === 'granted') {
      await deps.query(
        `UPDATE conversion_identities SET consent_state = 'denied', journey_id = NULL, first_touch = NULL, last_touch = NULL WHERE entity_type = $1 AND entity_id = $2`,
        [input.entityType, input.entityId],
      );
      identity.consent_state = 'denied';
      identity.journey_id = null;
      identity.first_touch = null;
      identity.last_touch = null;
    }
    return { status: 'recorded', delivery: await deliver(row, identity, deps, requestedJourneyId) };
  } catch (error) {
    deps.log(`[conversion] milestone not recorded: error=${error instanceof Error ? error.name : 'error'}`);
    return { status: 'error' };
  }
}

async function deliver(row: StageRow, identity: IdentityRow, deps: Deps, requestedJourneyId: string | null = identity.journey_id): Promise<string> {
  if (row.consent_state !== 'granted' || !row.analytics_id || identity.consent_state !== 'granted') {
    await deps.query(`UPDATE conversion_stage_events SET delivery_state = 'skipped_consent', analytics_id = NULL, consent_state = 'denied' WHERE event_id = $1`, [row.event_id]);
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
    `UPDATE conversion_stage_events e
        SET delivery_state = 'sending', delivery_attempts = delivery_attempts + 1, last_attempt_at = NOW()
       FROM conversion_identities i
      WHERE e.event_id = $1
        AND e.delivery_state IN ('pending', 'failed')
        AND e.consent_state = 'granted'
        AND e.analytics_id IS NOT NULL
        AND i.entity_type = e.entity_type
        AND i.entity_id = e.entity_id
        AND i.consent_state = 'granted'
        AND (i.journey_id IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = i.journey_id))
        AND ($2::varchar IS NULL OR NOT EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $2))
     RETURNING e.event_id`,
    [row.event_id, requestedJourneyId],
  );
  if (claimed.rows.length === 0) {
    const stopped = await deps.query<{ event_id: string }>(
      `UPDATE conversion_stage_events e
          SET delivery_state = 'skipped_consent', analytics_id = NULL, consent_state = 'denied'
         FROM conversion_identities i
        WHERE e.event_id = $1
          AND i.entity_type = e.entity_type
          AND i.entity_id = e.entity_id
          AND (
            e.consent_state <> 'granted'
            OR i.consent_state <> 'granted'
            OR (i.journey_id IS NOT NULL AND EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = i.journey_id))
            OR ($2::varchar IS NOT NULL AND EXISTS (SELECT 1 FROM conversion_withdrawn_journeys w WHERE w.journey_id = $2))
          )
       RETURNING e.event_id`,
      [row.event_id, requestedJourneyId],
    );
    if (stopped.rows.length > 0) {
      await deps.query(
        `UPDATE conversion_identities i
            SET consent_state = 'denied', journey_id = NULL, first_touch = NULL, last_touch = NULL
           FROM conversion_stage_events e
          WHERE e.event_id = $1 AND i.entity_type = e.entity_type AND i.entity_id = e.entity_id`,
        [row.event_id],
      );
      return 'skipped_consent';
    }
    return 'sending';
  }
  const outcome = await deps.send(event as { name: string; params: Record<string, string> }, row.analytics_id, occurredAt);
  if (outcome === 'unconfigured') {
    await deps.query(
      `UPDATE conversion_stage_events
          SET delivery_state = CASE WHEN consent_state = 'granted' THEN 'pending' ELSE 'skipped_consent' END,
              delivery_attempts = GREATEST(delivery_attempts - 1, 0)
        WHERE event_id = $1`,
      [row.event_id],
    );
    return 'pending';
  }
  const state = outcome === 'sent' ? 'sent' : 'failed';
  await deps.query(`UPDATE conversion_stage_events SET delivery_state = $2 WHERE event_id = $1 AND delivery_state = 'sending'`, [row.event_id, state]);
  return state;
}

export type MaintainResult = {
  recovered: number;
  attempted: number;
  coverage: 'anchored' | 'unknown';
  since: string | null;
};

/**
 * Retry and reconciliation (scripts/conversion-maintenance.ts): releases
 * stale claims, retries pending/failed rows (bounded), and recovers
 * review_published rows whose live write was lost, from the reviews table
 * (published reviews created at or after the persisted activation watermark;
 * no attribution is invented, so recovered rows are not consented and not
 * sent). When neither an activation watermark nor a live row exists yet,
 * coverage is reported as `unknown`.
 */
export async function maintainLedger(deps: Deps = defaultDeps()): Promise<MaintainResult> {
  await deps.query(`UPDATE conversion_stage_events SET delivery_state = 'failed' WHERE delivery_state = 'sending' AND last_attempt_at < NOW() - INTERVAL '10 minutes'`);
  const watermark = await deps.query<{ since: string | null }>(
    `SELECT LEAST(
       (SELECT MIN(activated_at) FROM conversion_watermarks WHERE stage = 'milestone_review_published'),
       (SELECT MIN(LEAST(occurred_at, created_at)) FROM conversion_stage_events WHERE source = 'live')
     )::text AS since`,
  );
  let recovered = 0;
  const since = watermark.rows[0]?.since ?? null;
  const coverage: 'anchored' | 'unknown' = since ? 'anchored' : 'unknown';
  if (since) {
    await deps.query(
      `INSERT INTO conversion_watermarks (stage, activated_at)
       VALUES ('milestone_review_published', $1)
       ON CONFLICT (stage) DO UPDATE SET activated_at = LEAST(conversion_watermarks.activated_at, EXCLUDED.activated_at)`,
      [since],
    );
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
    await deliver(row.identity_consent === 'granted' ? row : { ...row, consent_state: 'denied' }, row, deps, row.journey_id);
  }
  return { recovered, attempted: pending.rows.length, coverage, since };
}

/**
 * Consent withdrawn for a browser journey: records a durable revoked-journey
 * tombstone (`conversion_withdrawn_journeys`) so delayed or in-flight
 * milestone writes cannot create a granted identity after withdrawal, stops
 * every undelivered row of its identities (`skipped_consent`, analytics ID
 * removed), and unlinks the identities (journey and touches erased). A row
 * being sent right now keeps its `sending` state so its real outcome is
 * recorded (GA4 may already have it); it loses its analytics ID and consent,
 * so if that send fails it is never retried. Returns the number of rows
 * stopped. Never sends anything.
 */
export async function withdrawJourney(journeyId: string, deps: Pick<Deps, 'query'> = defaultDeps()): Promise<number> {
  if (!isOpaqueId('journey', journeyId)) return 0;
  await deps.query(
    `INSERT INTO conversion_withdrawn_journeys (journey_id)
     VALUES ($1)
     ON CONFLICT (journey_id) DO UPDATE SET withdrawn_at = NOW()`,
    [journeyId],
  );
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

