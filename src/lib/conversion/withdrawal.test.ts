/**
 * CONVERSION-001 consent withdrawal, watermark bootstrap recovery, and
 * fire-and-forget delivery against real PostgreSQL (CONVERSION_TEST_DATABASE_URL
 * or local throwaway embedded-postgres loaded with src/lib/schema.sql).
 * Each database test runs in a rolled-back transaction or isolated connection.
 */
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { startDatabase, type TestDatabase } from '@/test/e2e/harness';

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

import { parseConversionContext } from './context';
import { reconciliationCoverage } from './coverage';
import { activateConversionLedger, maintainLedger, recordMilestone, withdrawJourney, type Deps } from './ledger';

const envUrl = process.env.CONVERSION_TEST_DATABASE_URL;
let embeddedDb: TestDatabase | null = null;
let dbUrl = envUrl ?? '';

const JOURNEY = 'jrn_' + 'a'.repeat(32);
const OTHER = 'jrn_' + 'b'.repeat(32);
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${(++n).toString(16).padStart(12, '0')}`;

beforeAll(async () => {
  if (!dbUrl) {
    embeddedDb = await startDatabase(['src/lib/schema.sql']);
    dbUrl = embeddedDb.url;
  }
}, 120_000);

afterAll(async () => {
  await embeddedDb?.stop();
});

async function withDb(fn: (deps: Deps, db: pg.Client, sent: string[]) => Promise<void>) {
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  const sent: string[] = [];
  const outcomes: Array<'sent' | 'failed'> = ['failed', 'failed'];
  const deps: Deps = {
    query: ((text: string, params?: unknown[]) => db.query(text, params)) as unknown as Deps['query'],
    send: async (_event, clientId) => {
      sent.push(clientId);
      return outcomes.shift() ?? 'sent';
    },
    now: () => new Date(),
    randomUUID: uuid,
    log: () => undefined,
  };
  try {
    await db.query('BEGIN');
    await fn(deps, db, sent);
  } finally {
    await db.query('ROLLBACK').catch(() => undefined);
    await db.end();
  }
}

const granted = (journeyId: string) =>
  parseConversionContext({
    consent: 'granted',
    journeyId,
    firstTouch: { category: 'tagged', source: 'google', medium: 'cpc', campaign: 'unknown', landingPage: 'blog_post' },
    lastTouch: { category: 'referral', source: 'blog', medium: 'referral', campaign: 'unknown', landingPage: 'passport' },
  });

describe('withdrawal stops queued deliveries and interleavings (real Postgres)', () => {
  it('a failed send queued before the opt-out is never retried after it', async () => {
    await withDb(async (deps, db, sent) => {
      await recordMilestone({ entityType: 'review', entityId: '901', milestone: 'review_published', journey: 'consumer_review', context: granted(JOURNEY) }, deps);
      await recordMilestone({ entityType: 'review', entityId: '902', milestone: 'review_published', journey: 'consumer_review', context: granted(OTHER) }, deps);
      expect(sent).toHaveLength(2); // both first attempts failed → queued for retry

      expect(await withdrawJourney(JOURNEY, deps)).toBe(1);
      const before = sent.length;
      await maintainLedger(deps);
      expect(sent.length - before).toBe(1); // only the other journey's row is retried

      const rows = (await db.query(`SELECT entity_id, delivery_state, analytics_id, consent_state FROM conversion_stage_events ORDER BY entity_id`)).rows;
      expect(rows[0]).toMatchObject({ entity_id: '901', delivery_state: 'skipped_consent', analytics_id: null, consent_state: 'denied' });
      expect(rows[1]).toMatchObject({ entity_id: '902', delivery_state: 'sent' });
      const identity = (await db.query(`SELECT journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_id = '901'`)).rows[0];
      expect(identity).toEqual({ journey_id: null, consent_state: 'denied', first_touch: null, last_touch: null });
    });
  });

  it('an identity no longer granted is never delivered by the retry job', async () => {
    await withDb(async (deps, db, sent) => {
      await recordMilestone({ entityType: 'review', entityId: '903', milestone: 'review_published', journey: 'consumer_review', context: granted(JOURNEY) }, deps);
      // Consent changed by any other path (not withdrawJourney): the retry job re-checks it.
      await db.query(`UPDATE conversion_identities SET consent_state = 'denied', journey_id = NULL, first_touch = NULL, last_touch = NULL WHERE entity_id = '903'`);
      const before = sent.length;
      await maintainLedger(deps);
      expect(sent.length).toBe(before);
      expect((await db.query(`SELECT delivery_state FROM conversion_stage_events WHERE entity_id = '903'`)).rows[0].delivery_state).toBe('skipped_consent');
    });
  });

  it('absent identity: withdrawal before first identity creation saves a durable tombstone so delayed milestone creates a denied identity', async () => {
    await withDb(async (deps, db, sent) => {
      expect(await withdrawJourney(JOURNEY, deps)).toBe(0);
      const res = await recordMilestone({ entityType: 'review', entityId: '904', milestone: 'review_published', journey: 'consumer_review', context: granted(JOURNEY) }, deps);
      expect(res).toEqual({ status: 'recorded', delivery: 'skipped_consent' });
      expect(sent).toHaveLength(0);
      const identity = (await db.query(`SELECT journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_id = '904'`)).rows[0];
      expect(identity).toEqual({ journey_id: null, consent_state: 'denied', first_touch: null, last_touch: null });
      const stage = (await db.query(`SELECT delivery_state, analytics_id, consent_state FROM conversion_stage_events WHERE entity_id = '904'`)).rows[0];
      expect(stage).toEqual({ delivery_state: 'skipped_consent', analytics_id: null, consent_state: 'denied' });
    });
  });

  it('delayed write & interleaving: withdrawal between identity read/insert and stage insert or claim scrubs attribution and prevents delivery (OPN-CONVERSION-WITHDRAWAL-RACE)', async () => {
    await withDb(async (baseDeps, db, sent) => {
      const journeyInterleave1 = 'jrn_' + 'c'.repeat(32);
      const journeyInterleave2 = 'jrn_' + 'd'.repeat(32);

      // Interleaving 1: withdrawJourney runs right after identity is selected in recordMilestone, before stage insert
      const deps1: Deps = {
        ...baseDeps,
        query: (async (text: string, params?: unknown[]) => {
          const res = await db.query(text, params);
          if (text.includes('SELECT analytics_id, journey_id, consent_state, first_touch, last_touch FROM conversion_identities')) {
            await withdrawJourney(journeyInterleave1, { query: ((t: string, p?: unknown[]) => db.query(t, p)) as unknown as Deps['query'] });
          }
          return res;
        }) as unknown as Deps['query'],
      };

      const res1 = await recordMilestone(
        { entityType: 'review', entityId: '905', milestone: 'review_published', journey: 'consumer_review', context: granted(journeyInterleave1) },
        deps1,
      );
      expect(res1).toEqual({ status: 'recorded', delivery: 'skipped_consent' });
      expect(sent).toHaveLength(0);
      expect((await db.query(`SELECT journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_id = '905'`)).rows[0]).toEqual({
        journey_id: null,
        consent_state: 'denied',
        first_touch: null,
        last_touch: null,
      });
      expect((await db.query(`SELECT delivery_state, analytics_id, consent_state FROM conversion_stage_events WHERE entity_id = '905'`)).rows[0]).toEqual({
        delivery_state: 'skipped_consent',
        analytics_id: null,
        consent_state: 'denied',
      });

      // Interleaving 2: withdrawJourney runs right after conversion_stage_events is inserted ('pending'), before deliver() claims ('sending')
      const deps2: Deps = {
        ...baseDeps,
        query: (async (text: string, params?: unknown[]) => {
          const res = await db.query(text, params);
          if (text.includes('INSERT INTO conversion_stage_events')) {
            await withdrawJourney(journeyInterleave2, { query: ((t: string, p?: unknown[]) => db.query(t, p)) as unknown as Deps['query'] });
          }
          return res;
        }) as unknown as Deps['query'],
      };

      const res2 = await recordMilestone(
        { entityType: 'review', entityId: '906', milestone: 'review_published', journey: 'consumer_review', context: granted(journeyInterleave2) },
        deps2,
      );
      expect(res2).toEqual({ status: 'recorded', delivery: 'skipped_consent' });
      expect(sent).toHaveLength(0);
      expect((await db.query(`SELECT journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_id = '906'`)).rows[0]).toEqual({
        journey_id: null,
        consent_state: 'denied',
        first_touch: null,
        last_touch: null,
      });
      expect((await db.query(`SELECT delivery_state, analytics_id, consent_state FROM conversion_stage_events WHERE entity_id = '906'`)).rows[0]).toEqual({
        delivery_state: 'skipped_consent',
        analytics_id: null,
        consent_state: 'denied',
      });

      // Guarantee erased attribution stays erased on replay/duplicate or subsequent review with the same withdrawn journey
      const replay = await recordMilestone(
        { entityType: 'review', entityId: '905', milestone: 'review_published', journey: 'consumer_review', context: granted(journeyInterleave1) },
        baseDeps,
      );
      expect(replay).toEqual({ status: 'duplicate' });
      const subsequent = await recordMilestone(
        { entityType: 'review', entityId: '907', milestone: 'review_published', journey: 'consumer_review', context: granted(journeyInterleave1) },
        baseDeps,
      );
      expect(subsequent).toEqual({ status: 'recorded', delivery: 'skipped_consent' });
      expect(sent).toHaveLength(0);
      for (const entityId of ['905', '906', '907']) {
        expect((await db.query(`SELECT journey_id, consent_state, first_touch, last_touch FROM conversion_identities WHERE entity_id = $1`, [entityId])).rows[0]).toEqual({
          journey_id: null,
          consent_state: 'denied',
          first_touch: null,
          last_touch: null,
        });
      }
    });
  });

  it('bootstrap watermark recovery on real Postgres: unknown without anchor, recovers first lost write and earlier-than-first-success (OPN-CONVERSION-BOOTSTRAP-RECOVERY)', async () => {
    await withDb(async (baseDeps, db, sent) => {
      // Seed a business and two published reviews (one pre-activation at 11:50Z, one post-activation at 11:58Z)
      const biz = await db.query<{ id: number }>(`INSERT INTO businesses (slug, brand_name) VALUES ('wm-biz', 'WM Biz') RETURNING id`);
      const bizId = biz.rows[0].id;
      const revSeed = await db.query<{ id: number }>(
        `INSERT INTO reviews (business_id, rating, body, author_name, status, created_at)
         VALUES ($1, 5, 'Seed review', 'Autor 1', 'published', '2026-10-01T11:50:00.000Z') RETURNING id`,
        [bizId],
      );
      const revLostFirst = await db.query<{ id: number }>(
        `INSERT INTO reviews (business_id, rating, body, author_name, status, created_at)
         VALUES ($1, 5, 'Lost first live review', 'Autor 2', 'published', '2026-10-01T11:58:00.000Z') RETURNING id`,
        [bizId],
      );

      // 1. Fresh schema.sql has NO seeded NOW() row in conversion_watermarks -> coverage stays 'unknown' (not silently complete)
      const unanchored = await maintainLedger(baseDeps);
      expect(unanchored).toEqual({ recovered: 0, attempted: 0, coverage: 'unknown', since: null });
      expect(reconciliationCoverage(unanchored.since)).toMatchObject({ status: 'unknown', since: null });

      // 2. Explicit activation anchor at 11:55Z recovers the lost first live review (11:58Z) from an empty stage table while excluding pre-activation history (11:50Z)
      const anchoredSince = await activateConversionLedger(new Date('2026-10-01T11:55:00.000Z'), baseDeps);
      expect(new Date(anchoredSince).toISOString()).toBe('2026-10-01T11:55:00.000Z');
      const afterAnchor = await maintainLedger(baseDeps);
      expect(afterAnchor.coverage).toBe('anchored');
      expect(afterAnchor.recovered).toBe(1);
      expect(sent).toHaveLength(0);
      const stageRows1 = (await db.query(`SELECT entity_id, source, consent_state, analytics_id FROM conversion_stage_events`)).rows;
      expect(stageRows1).toEqual([
        {
          entity_id: String(revLostFirst.rows[0].id),
          source: 'reconciled',
          consent_state: 'denied',
          analytics_id: null,
        },
      ]);
      expect((await db.query(`SELECT 1 FROM conversion_stage_events WHERE entity_id = $1`, [String(revSeed.rows[0].id)])).rows).toHaveLength(0);

      // 3. Earlier-than-first-success: clear watermarks & stage events, then fail first live write on stage insert at 11:56Z and succeed second live write at 12:00Z
      await db.query(`DELETE FROM conversion_stage_events`);
      await db.query(`DELETE FROM conversion_identities`);
      await db.query(`DELETE FROM conversion_watermarks`);

      const revEarlier = await db.query<{ id: number }>(
        `INSERT INTO reviews (business_id, rating, body, author_name, status, created_at)
         VALUES ($1, 4, 'Earlier lost review', 'Autor 3', 'published', '2026-10-01T11:56:00.000Z') RETURNING id`,
        [bizId],
      );
      const revLater = await db.query<{ id: number }>(
        `INSERT INTO reviews (business_id, rating, body, author_name, status, created_at)
         VALUES ($1, 5, 'Later live review', 'Autor 4', 'published', '2026-10-01T12:00:00.000Z') RETURNING id`,
        [bizId],
      );

      let failStageOnce = true;
      const depsFailFirst: Deps = {
        ...baseDeps,
        query: (async (text: string, params?: unknown[]) => {
          if (failStageOnce && text.includes('INSERT INTO conversion_stage_events')) {
            failStageOnce = false;
            throw new Error('simulated stage event outage on first write');
          }
          return db.query(text, params);
        }) as unknown as Deps['query'],
      };

      const firstLive = await recordMilestone(
        {
          entityType: 'review',
          entityId: String(revEarlier.rows[0].id),
          milestone: 'review_published',
          journey: 'consumer_review',
          context: granted(OTHER),
          occurredAt: new Date('2026-10-01T11:56:00.000Z'),
        },
        depsFailFirst,
      );
      expect(firstLive.status).toBe('error');

      const secondLive = await recordMilestone(
        {
          entityType: 'review',
          entityId: String(revLater.rows[0].id),
          milestone: 'review_published',
          journey: 'consumer_review',
          context: granted(OTHER),
          occurredAt: new Date('2026-10-01T12:00:00.000Z'),
        },
        baseDeps,
      );
      expect(secondLive.status).toBe('recorded');

      const reconciled = await maintainLedger(baseDeps);
      expect(reconciled.coverage).toBe('anchored');
      expect(new Date(reconciled.since!).toISOString()).toBe('2026-10-01T11:56:00.000Z');
      // Both revEarlier (11:56Z) and revLostFirst (11:58Z) precede revLater (12:00Z) and are recovered
      expect(reconciled.recovered).toBe(2);
    });
  });

  it('multi-connection pg.Pool concurrency: parallel withdrawJourney + recordMilestone schedules and already-claimed in-flight sends (OPN-CONVERSION-WITHDRAWAL-RACE)', async () => {
    const pool = new pg.Pool({ connectionString: dbUrl, max: 6 });
    try {
      await pool.query(`DELETE FROM conversion_stage_events`);
      await pool.query(`DELETE FROM conversion_identities`);
      await pool.query(`DELETE FROM conversion_withdrawn_journeys`);

      // 1. Concurrent multi-connection race across 4 journeys: withdrawJourney and recordMilestone fired in parallel on separate pool connections
      const journeys = ['1', '2', '3', '4'].map((ch) => `jrn_${ch.repeat(32)}`);
      const deliveredClients: string[] = [];
      const poolDeps = (sendOutcome: 'sent' | 'failed' = 'sent'): Deps => ({
        query: ((text: string, params?: unknown[]) => pool.query(text, params)) as unknown as Deps['query'],
        send: async (_event, clientId) => {
          deliveredClients.push(clientId);
          return sendOutcome;
        },
        now: () => new Date(),
        randomUUID: uuid,
        log: () => undefined,
      });

      await Promise.all(
        journeys.flatMap((jId, idx) => {
          const entityA = String(950 + idx * 2);
          const entityB = String(951 + idx * 2);
          return [
            recordMilestone(
              { entityType: 'review', entityId: entityA, milestone: 'review_published', journey: 'consumer_review', context: granted(jId) },
              poolDeps('failed'),
            ),
            withdrawJourney(jId, { query: ((t: string, p?: unknown[]) => pool.query(t, p)) as unknown as Deps['query'] }),
            recordMilestone(
              { entityType: 'review', entityId: entityB, milestone: 'review_published', journey: 'consumer_review', context: granted(jId) },
              poolDeps('sent'),
            ),
          ];
        }),
      );

      // Every identity for a withdrawn journey is scrubbed to denied with null journey_id and touches
      const idRows = (
        await pool.query<{ entity_id: string; consent_state: string; journey_id: string | null; first_touch: unknown; last_touch: unknown }>(
          `SELECT entity_id, consent_state, journey_id, first_touch, last_touch FROM conversion_identities WHERE entity_id::int >= 950 ORDER BY entity_id::int`,
        )
      ).rows;
      expect(idRows).toHaveLength(8);
      for (const r of idRows) {
        expect(r).toMatchObject({
          consent_state: 'denied',
          journey_id: null,
          first_touch: null,
          last_touch: null,
        });
      }

      // After maintainLedger runs, zero withdrawn rows are ever retried or left pending
      const beforeMaint = deliveredClients.length;
      await maintainLedger(poolDeps('sent'));
      expect(deliveredClients.length).toBe(beforeMaint);
      const stageRows = (
        await pool.query<{ entity_id: string; delivery_state: string; consent_state: string; analytics_id: string | null }>(
          `SELECT entity_id, delivery_state, consent_state, analytics_id FROM conversion_stage_events WHERE entity_id::int >= 950 ORDER BY entity_id::int`,
        )
      ).rows;
      expect(stageRows).toHaveLength(8);
      for (const s of stageRows) {
        expect(s.consent_state).toBe('denied');
        expect(s.analytics_id).toBeNull();
        expect(['skipped_consent', 'failed']).toContain(s.delivery_state);
      }

      // 2. Already-claimed ('sending') in-flight provider send when withdrawal arrives on another connection:
      // keeps 'sending' state so real provider outcome ('sent' or 'failed') is recorded honestly, while scrubbing analytics_id & consent so failed sends never retry
      const inFlightJourney = 'jrn_' + '9'.repeat(32);
      let releaseSend!: (outcome: 'sent' | 'failed') => void;
      let notifyClaimed!: () => void;
      const claimedReady = new Promise<void>((r) => {
        notifyClaimed = r;
      });
      const inFlightDeps: Deps = {
        ...poolDeps(),
        send: async () => {
          notifyClaimed();
          return new Promise<'sent' | 'failed'>((resolve) => {
            releaseSend = resolve;
          });
        },
      };

      const recordPromise = recordMilestone(
        { entityType: 'review', entityId: '990', milestone: 'review_published', journey: 'consumer_review', context: granted(inFlightJourney) },
        inFlightDeps,
      );
      await claimedReady;

      // While send() is in-flight ('sending'), another connection withdraws consent
      await withdrawJourney(inFlightJourney, { query: ((t: string, p?: unknown[]) => pool.query(t, p)) as unknown as Deps['query'] });
      const midSend = (
        await pool.query<{ delivery_state: string; analytics_id: string | null; consent_state: string }>(
          `SELECT delivery_state, analytics_id, consent_state FROM conversion_stage_events WHERE entity_id = '990'`,
        )
      ).rows[0];
      expect(midSend).toEqual({
        delivery_state: 'sending',
        analytics_id: null,
        consent_state: 'denied',
      });

      // Provider call fails after withdrawal -> recorded as 'failed' with denied consent, and maintainLedger converts it to 'skipped_consent' without retrying
      releaseSend('failed');
      const finalRes = await recordPromise;
      expect(finalRes).toEqual({ status: 'recorded', delivery: 'failed' });
      await maintainLedger(poolDeps('sent'));
      const afterMaint = (
        await pool.query<{ delivery_state: string; analytics_id: string | null; consent_state: string }>(
          `SELECT delivery_state, analytics_id, consent_state FROM conversion_stage_events WHERE entity_id = '990'`,
        )
      ).rows[0];
      expect(afterMaint).toEqual({
        delivery_state: 'skipped_consent',
        analytics_id: null,
        consent_state: 'denied',
      });
    } finally {
      await pool.query(`DELETE FROM conversion_stage_events`);
      await pool.query(`DELETE FROM conversion_identities`);
      await pool.query(`DELETE FROM conversion_withdrawn_journeys`);
      await pool.end();
    }
  });

  it('ignores anything that is not an opaque journey ID', async () => {
    await withDb(async (deps) => {
      expect(await withdrawJourney("x' OR '1'='1", deps)).toBe(0);
    });
  });
});

describe('the review response never waits on analytics', () => {
  it('afterResponse never throws and never makes the caller wait', async () => {
    const { afterResponse } = await import('./after');
    let release!: () => void;
    const slow = new Promise<void>((r) => (release = r));
    const work = vi.fn(() => slow);
    const started = Date.now();
    expect(() => afterResponse(work)).not.toThrow(); // outside a request scope: falls back to fire-and-forget
    expect(Date.now() - started).toBeLessThan(50);
    expect(work).toHaveBeenCalledTimes(1);
    release();
    expect(() => afterResponse(() => Promise.reject(new Error('ga4 down')))).not.toThrow();
  });

  it('records the milestone in after(), not before the 201', () => {
    const route = readFileSync('src/app/api/v1/reviews/route.ts', 'utf8');
    expect(route).toMatch(/import \{ afterResponse \} from '@\/lib\/conversion\/after';/);
    expect(route).not.toMatch(/await recordMilestone\(/);
    const tx = route.indexOf('await withTransaction(');
    const hook = route.indexOf('afterResponse(() =>');
    expect(tx).toBeGreaterThan(0);
    expect(hook).toBeGreaterThan(tx);
    expect(route.slice(hook, hook + 300)).toMatch(/recordMilestone\(\{[\s\S]*context,/);
    // The context is read from the request body before the response, never inside after().
    expect(route).toMatch(/const context = parseConversionContext\(body\.conversion\);\s*afterResponse\(\(\) =>/);
  });
});

describe('browser withdrawal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function browserWindow(store: Map<string, string>) {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    });
  }

  it('clearing a stored journey queues its withdrawal and tells the server; a 204 clears the queue', async () => {
    const store = new Map([['opinio.conversion-v1', JSON.stringify({ journeyId: JOURNEY, attribution: { version: 'v1', firstTouch: null, lastTouch: null } })]]);
    browserWindow(store);
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const { clearConversionJourney } = await import('./client');
    await clearConversionJourney();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/conversion/consent', expect.objectContaining({ method: 'POST', body: JSON.stringify({ journeyId: JOURNEY, consent: 'denied' }) }));
    expect(store.has('opinio.conversion-v1')).toBe(false);
    expect(store.has('opinio.conversion-withdrawal')).toBe(false);
  });

  it('a failed withdrawal stays queued and is retried on the next load whatever the consent', async () => {
    const store = new Map([['opinio.analytics-consent', 'denied'], ['opinio.conversion-withdrawal', JOURNEY]]);
    browserWindow(store);
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const { retryPendingWithdrawal } = await import('./client');
    await retryPendingWithdrawal();
    expect(store.get('opinio.conversion-withdrawal')).toBe(JOURNEY);
    await retryPendingWithdrawal();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.has('opinio.conversion-withdrawal')).toBe(false);
  });

  it('Analytics retries on mount before any consent check, and withdraws whenever a journey is cleared', () => {
    const source = readFileSync('src/components/Analytics.tsx', 'utf8');
    expect(source).toMatch(/useEffect\(\(\) => \{\s*void retryPendingWithdrawal\(\);\s*\}, \[\]\);/);
    expect(source).toMatch(/if \(consent === 'denied'\) \{\s*void clearConversionJourney\(\);/);
  });

  it('the consent route validates the ID and stops the journey server-side', () => {
    const route = readFileSync('src/app/api/v1/conversion/consent/route.ts', 'utf8');
    expect(route).toMatch(/isOpaqueId\('journey', body\?\.journeyId\)/);
    expect(route).toMatch(/await withdrawJourney\(body\.journeyId\)/);
    expect(route).toMatch(/status: 204/);
    expect(route).toMatch(/status: 503/);
  });
});
