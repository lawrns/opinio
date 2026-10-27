/**
 * Reviewer round 2 on #44 (CONVERSION-001 Opinio): blog page views as a
 * template, one page allowlist, steps started before GA4 is configured, the
 * readout's intent-only rows, the withdrawal queue and in-flight sends, and
 * the functional query keys each public page reads. Synthetic values only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { startDatabase, type TestDatabase } from '@/test/e2e/harness';

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

import { analyticsPageLocation, FUNCTIONAL_QUERY_KEYS, isPublicAnalyticsPath } from '../analytics';
import { parseConversionContext } from './context';
import { coverageByStatus } from './coverage';
import { recordMilestone, withdrawJourney, maintainLedger, type Deps } from './ledger';
import { pageForPath } from './pages';

const JOURNEY = 'jrn_' + 'c'.repeat(32);
const SECOND = 'jrn_' + 'd'.repeat(32);

describe('blog page views are a template, and one allowlist drives every hit', () => {
  it('a blog article (or a crafted 404 slug) is sent as /blog/post', () => {
    expect(analyticsPageLocation('https://opinio.mx/blog/resenas-whatsapp?utm_source=x')).toBe('https://opinio.mx/blog/post');
    expect(analyticsPageLocation('https://opinio.mx/blog/maria-lopez-5512345678')).toBe('https://opinio.mx/blog/post');
    expect(analyticsPageLocation('https://opinio.mx/blog')).toBe('https://opinio.mx/blog');
    expect(analyticsPageLocation('https://opinio.mx/verificar?q=juan')).toBe('https://opinio.mx/verificar');
  });

  it('page views and conversion events accept exactly the same paths', () => {
    const paths = [
      '/', '/directorio', '/verificar', '/caso/nuevo', '/blog', '/resenas-y-reputacion',
      '/blog/resenas-whatsapp', '/blog/maria@example.com', '/blog/Juan%20Perez', '/blog/a/b',
      '/b/luuna', '/escribir-opinion/luuna', '/caso/123', '/merchant', '/api/v1/reviews', '/widget/card/tok',
    ];
    for (const p of paths) expect(isPublicAnalyticsPath(p), p).toBe(pageForPath(p) !== null);
    expect(pageForPath('/blog/maria@example.com')).toBeNull();
  });

  it('auth, account, admin, case-access and private share routes added on main are never measured', () => {
    for (const p of ['/acceso', '/acceso/error', '/acceso/confirmar', '/acceso/revisa-tu-correo', '/caso/acceso', '/caso/acceso/reenviar', '/caso/recuperar', '/cuenta/invitacion', '/cuenta', '/cuenta/negocios', '/admin', '/admin/aprobaciones', '/compartir/abc123token', '/spike', '/merchant', '/merchant/inbox']) {
      expect(isPublicAnalyticsPath(p), p).toBe(false);
      expect(analyticsPageLocation(`https://opinio.mx${p}?token=abc&email=a%40b.mx`), p).toBeNull();
    }
  });

  it('two blog articles in a row are still two page views', () => {
    const source = readFileSync('src/components/Analytics.tsx', 'utf8');
    expect(source).toMatch(/const pagePath = pageLocation \? window\.location\.pathname : null;/);
    expect(source).toMatch(/lastPage\.current !== pagePath/);
  });
});

describe('a step started before GA4 is configured is not lost', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function pageWindow(consent: string) {
    const store = new Map([['opinio.analytics-consent', consent]]);
    const win: Record<string, unknown> = {
      crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000003' },
      location: { pathname: '/escribir-opinion/comercio-demo', origin: 'https://opinio.mx' },
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    };
    vi.stubGlobal('window', win);
    return { win, store };
  }

  it('is buffered on a full load and sent once Analytics has configured GA4', async () => {
    const { win } = pageWindow('granted');
    const client = await import('./client');
    client.trackStepStarted('consumer_review', 'review_form_experience'); // gtag does not exist yet
    const gtag = vi.fn();
    win.gtag = gtag;
    client.flushBufferedConversionEvents();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][0]).toBe('event');
    expect(gtag.mock.calls[0][1]).toBe('conversion_step_started');
    expect(gtag.mock.calls[0][2]).toMatchObject({ step_id: 'review_form_experience', page_location: 'https://opinio.mx/escribir-opinion/business', page_title: 'review_form' });
    client.flushBufferedConversionEvents();
    expect(gtag).toHaveBeenCalledTimes(1); // sent once
  });

  it('is dropped if consent is withdrawn before GA4 loads', async () => {
    const { win, store } = pageWindow('granted');
    const client = await import('./client');
    client.trackStepStarted('consumer_review', 'review_form_experience');
    store.set('opinio.analytics-consent', 'denied');
    const gtag = vi.fn();
    win.gtag = gtag;
    client.flushBufferedConversionEvents();
    expect(gtag).not.toHaveBeenCalled();
  });

  it('Analytics flushes after config, the page view and the landing touch', () => {
    const source = readFileSync('src/components/Analytics.tsx', 'utf8');
    const config = source.indexOf("window.gtag('config'");
    const flush = source.indexOf('flushBufferedConversionEvents();');
    expect(config).toBeGreaterThan(0);
    expect(flush).toBeGreaterThan(source.indexOf("window.gtag('event', 'page_view'"));
    expect(flush).toBeGreaterThan(config);
  });
});

describe('the readout separates intent-only stages from unavailable ones', () => {
  it('cta_click, step_started and step_denominators are intent only, not unavailable', () => {
    const { measured, intentOnly, unavailable } = coverageByStatus();
    expect(intentOnly.map((r) => r.stage)).toEqual(['cta_click', 'step_started', 'step_denominators']);
    expect(unavailable.map((r) => r.stage)).not.toContain('cta_click');
    expect(unavailable.map((r) => r.stage)).toContain('step_failed');
    expect(measured.map((r) => r.stage)).toEqual(['page_view', 'review_published']);
    expect(readFileSync('scripts/conversion-readout.ts', 'utf8')).toMatch(/\.\.\.coverageByStatus\(\)/);
  });
});

describe('browser withdrawal queue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const journeyState = (journeyId: string) => JSON.stringify({ journeyId, attribution: { version: 'v1', firstTouch: null, lastTouch: null } });

  it('a second withdrawal before the first is confirmed never overwrites it', async () => {
    const store = new Map([['opinio.conversion-v1', journeyState(JOURNEY)]]);
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const client = await import('./client');
    await client.clearConversionJourney();
    store.set('opinio.conversion-v1', journeyState(SECOND)); // granted again, then withdrawn again
    await client.clearConversionJourney();
    expect(JSON.parse(store.get('opinio.conversion-withdrawal')!)).toEqual([JOURNEY, SECOND]);

    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => ({ status: JSON.parse(init.body).journeyId === JOURNEY ? 204 : 503 }));
    await client.retryPendingWithdrawal();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(store.get('opinio.conversion-withdrawal')!)).toEqual([SECOND]);
  });

  it('still retries a single ID queued in the old format, and ignores junk', async () => {
    const store = new Map([['opinio.conversion-withdrawal', JOURNEY]]);
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const client = await import('./client');
    await client.retryPendingWithdrawal();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.has('opinio.conversion-withdrawal')).toBe(false);

    store.set('opinio.conversion-withdrawal', '["not-a-journey", 7]');
    await client.retryPendingWithdrawal();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

const envUrl = process.env.CONVERSION_TEST_DATABASE_URL;
let embeddedDb: TestDatabase | null = null;
let dbUrl = envUrl ?? '';

beforeAll(async () => {
  if (!dbUrl) {
    embeddedDb = await startDatabase(['src/lib/schema.sql']);
    dbUrl = embeddedDb.url;
  }
}, 120_000);

afterAll(async () => {
  await embeddedDb?.stop();
}, 60_000);

describe('a send in flight at withdrawal (real Postgres)', () => {
  it('keeps its real outcome, loses its analytics ID, and a failed attempt is never retried', async () => {
    const db = new pg.Client({ connectionString: dbUrl });
    await db.connect();
    let n = 0;
    let release!: (outcome: 'sent' | 'failed') => void;
    const deps: Deps = {
      query: ((text: string, params?: unknown[]) => db.query(text, params)) as unknown as Deps['query'],
      send: vi.fn(() => new Promise<'sent' | 'failed'>((r) => (release = r))),
      now: () => new Date(),
      randomUUID: () => `00000000-0000-4000-8000-${(++n).toString(16).padStart(12, '0')}`,
      log: () => undefined,
    };
    const granted = parseConversionContext({ consent: 'granted', journeyId: JOURNEY, firstTouch: { category: 'tagged', source: 'google', medium: 'cpc', campaign: 'unknown', landingPage: 'blog_post' } });
    try {
      await db.query('BEGIN');
      const recording = recordMilestone({ entityType: 'review', entityId: '911', milestone: 'review_published', journey: 'consumer_review', context: granted }, deps);
      await vi.waitFor(() => expect(deps.send).toHaveBeenCalledTimes(1)); // claimed: 'sending'

      expect(await withdrawJourney(JOURNEY, deps)).toBe(0); // nothing undelivered to stop
      const during = (await db.query(`SELECT delivery_state, analytics_id, consent_state FROM conversion_stage_events WHERE entity_id = '911'`)).rows[0];
      expect(during).toEqual({ delivery_state: 'sending', analytics_id: null, consent_state: 'denied' });

      release('failed');
      await recording;
      expect((await db.query(`SELECT delivery_state FROM conversion_stage_events WHERE entity_id = '911'`)).rows[0].delivery_state).toBe('failed');
      await maintainLedger(deps);
      expect(deps.send).toHaveBeenCalledTimes(1);
      expect((await db.query(`SELECT delivery_state FROM conversion_stage_events WHERE entity_id = '911'`)).rows[0].delivery_state).toBe('skipped_consent');
    } finally {
      await db.query('ROLLBACK').catch(() => undefined);
      await db.end();
    }
  });
});

describe('every query key a public page reads survives the landing strip', () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
  }

  it('FUNCTIONAL_QUERY_KEYS lists each searchParams key of each page it strips', () => {
    for (const [route, keys] of Object.entries({ '/verificar': 'src/app/verificar', '/directorio': 'src/app/directorio', '/caso/nuevo': 'src/app/caso/nuevo' })) {
      const code = sources(keys).map((f) => readFileSync(f, 'utf8')).join('\n');
      const read = new Set<string>();
      for (const m of code.matchAll(/searchParams\.get\('([^']+)'\)/g)) read.add(m[1]);
      for (const m of code.matchAll(/searchParams:\s*Promise<\{([^}]*)\}>/g)) for (const k of m[1].matchAll(/(\w+)\??:/g)) read.add(k[1]);
      expect(read.size, route).toBeGreaterThan(0);
      expect([...read].filter((k) => !FUNCTIONAL_QUERY_KEYS[route]?.includes(k)), route).toEqual([]);
    }
  });

  it('no other public page reads the query string', () => {
    for (const dir of ['src/app/b', 'src/app/escribir-opinion', 'src/app/blog', 'src/app/resenas-y-reputacion']) {
      for (const f of sources(dir)) expect(readFileSync(f, 'utf8'), f).not.toMatch(/searchParams|useSearchParams/);
    }
    expect(readFileSync('src/app/page.tsx', 'utf8')).not.toMatch(/searchParams|useSearchParams/);
  });
});
