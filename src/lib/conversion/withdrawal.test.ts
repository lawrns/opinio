/**
 * CONVERSION-001 consent withdrawal and fire-and-forget delivery (Dot's two
 * checks on #44). The ledger SQL runs against real Postgres when
 * CONVERSION_TEST_DATABASE_URL points at a throwaway database loaded with
 * src/lib/schema.sql; those tests are skipped otherwise. Each runs in a
 * rolled-back transaction.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

import { parseConversionContext } from './context';
import { maintainLedger, recordMilestone, withdrawJourney, type Deps } from './ledger';

const url = process.env.CONVERSION_TEST_DATABASE_URL;
const JOURNEY = 'jrn_' + 'a'.repeat(32);
const OTHER = 'jrn_' + 'b'.repeat(32);
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${(++n).toString(16).padStart(12, '0')}`;

async function withDb(fn: (deps: Deps, db: pg.Client, sent: string[]) => Promise<void>) {
  const db = new pg.Client({ connectionString: url });
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
  parseConversionContext({ consent: 'granted', journeyId, firstTouch: { category: 'tagged', source: 'google', medium: 'cpc', campaign: 'unknown', landingPage: 'blog_post' } });

describe.skipIf(!url)('withdrawal stops queued deliveries (real Postgres)', () => {
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
      const identity = (await db.query(`SELECT journey_id, consent_state, first_touch FROM conversion_identities WHERE entity_id = '901'`)).rows[0];
      expect(identity).toEqual({ journey_id: null, consent_state: 'denied', first_touch: null });
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
