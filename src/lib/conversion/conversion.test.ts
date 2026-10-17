/**
 * CONVERSION-001 tests for Opinio. Synthetic data only: the "PII" below is
 * invented fixture text proving nothing unsafe crosses the GA4 / ledger
 * boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

import { classifyTouch } from './attribution';
import { conversionContextForServer, recordLanding, trackIntent, type BrowserEnv } from './browser';
import { CONSENT_STORAGE_KEY, CONVERSION_STORAGE_KEY, resolveConsent } from './consent';
import { parseConversionContext } from './context';
import { STAGE_COVERAGE } from './coverage';
import { ctaIdFor, journeyForCta } from './cta';
import { maintainLedger, recordMilestone, type Deps } from './ledger';
import { allPageIds, pageForPath } from './pages';
import { PAYLOAD_KEYS, buildConversionEvent, type ConversionEvent } from './payload';
import { isPublicAnalyticsPath } from '../analytics';

const FORBIDDEN = ['maria', 'lopez', 'correo-ficticio', '5512345678', 'diabetes', 'pésimo servicio', 'reset_token', 'juan', 'perez', '@', 'http', '?', '='];
function assertSafe(value: unknown) {
  const text = JSON.stringify(value).toLowerCase();
  for (const needle of FORBIDDEN) expect(text, `leaked ${needle}`).not.toContain(needle);
}
function assertPayload(event: ConversionEvent | null) {
  expect(event).toBeTruthy();
  for (const [key, value] of Object.entries(event!.params)) {
    expect(PAYLOAD_KEYS as readonly string[]).toContain(key);
    expect(String(value)).toMatch(/^[a-z0-9_]{1,48}$/);
  }
}

let n = 0;
const uuid = () => `00000000-0000-4000-8000-${(++n).toString(16).padStart(12, '0')}`;

function browser(consent: string | null) {
  const store = new Map<string, string>(consent ? [[CONSENT_STORAGE_KEY, consent]] : []);
  const emitted: ConversionEvent[] = [];
  const env: BrowserEnv = {
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) },
    consent: () => resolveConsent(store.get(CONSENT_STORAGE_KEY)),
    emit: (e) => emitted.push(e),
    randomUUID: uuid,
  };
  return { env, emitted, store };
}

// In-memory stand-in for the two ledger tables, answering the ledger's SQL.
function fakePg(options: { sendOutcomes?: Array<'sent' | 'failed' | 'unconfigured'>; reviews?: Array<{ id: number; created_at: string; status: string }> } = {}) {
  const identities = new Map<string, Record<string, unknown>>();
  const stages = new Map<string, Record<string, unknown>>();
  const sent: Array<{ event: { name: string; params: Record<string, string> }; clientId: string }> = [];
  const outcomes = [...(options.sendOutcomes ?? [])];
  const now = new Date('2026-10-01T12:00:00Z');
  const byEvent = (id: unknown) => [...stages.values()].find((s) => s.event_id === id);
  const q = async (text: string, params: unknown[] = []) => {
    const sql = text.replace(/\s+/g, ' ').trim();
    if (sql.startsWith('SELECT analytics_id FROM conversion_identities WHERE journey_id')) {
      return { rows: [...identities.values()].filter((i) => i.journey_id === params[0]).slice(0, 1) };
    }
    if (sql.startsWith('INSERT INTO conversion_identities')) {
      const key = `${params[0]}:${params[1]}`;
      if (!identities.has(key)) identities.set(key, { entity_type: params[0], entity_id: params[1], analytics_id: params[2], journey_id: params[3], consent_state: params[4], first_touch: params[5] ? JSON.parse(String(params[5])) : null, last_touch: params[6] ? JSON.parse(String(params[6])) : null, created_at: now.toISOString() });
      return { rows: [] };
    }
    if (sql.startsWith('SELECT analytics_id, journey_id, consent_state')) return { rows: [identities.get(`${params[0]}:${params[1]}`)].filter(Boolean) };
    if (sql.startsWith('INSERT INTO conversion_stage_events')) {
      if (stages.has(String(params[1]))) return { rows: [] };
      const row = { event_id: params[0], dedupe_key: params[1], entity_type: params[2], entity_id: params[3], analytics_id: params[4], stage: params[5], journey: params[6], occurred_at: params[7], consent_state: params[8], source: params[9], delivery_state: 'pending', delivery_attempts: 0, created_at: now.toISOString() };
      stages.set(String(params[1]), row);
      return { rows: [{ ...row }] };
    }
    if (sql.includes("SET delivery_state = 'sending'")) {
      const row = byEvent(params[0]);
      if (!row || !['pending', 'failed'].includes(String(row.delivery_state))) return { rows: [] };
      row.delivery_state = 'sending';
      row.delivery_attempts = Number(row.delivery_attempts) + 1;
      return { rows: [{ event_id: row.event_id }] };
    }
    if (sql.includes("SET delivery_state = 'pending', delivery_attempts = delivery_attempts - 1")) {
      const row = byEvent(params[0])!;
      row.delivery_state = 'pending';
      row.delivery_attempts = Number(row.delivery_attempts) - 1;
      return { rows: [] };
    }
    if (sql.includes('SET delivery_state = $2')) {
      const row = byEvent(params[0])!;
      if (row.delivery_state === 'sending') row.delivery_state = params[1];
      return { rows: [] };
    }
    const fixed = /SET delivery_state = '(\w+)' WHERE event_id = \$1/.exec(sql);
    if (fixed) {
      byEvent(params[0])!.delivery_state = fixed[1];
      return { rows: [] };
    }
    if (sql.includes("WHERE delivery_state = 'sending' AND last_attempt_at")) return { rows: [] };
    if (sql.startsWith('SELECT MIN(created_at)::text AS since')) {
      const live = [...stages.values()].filter((s) => s.source === 'live').map((s) => String(s.created_at)).sort();
      return { rows: [{ since: live[0] ?? null }] };
    }
    if (sql.startsWith('SELECT r.id, r.created_at FROM reviews r')) {
      return { rows: (options.reviews ?? []).filter((r) => r.status === 'published' && r.created_at >= String(params[0]) && !stages.has(`review:${r.id}:milestone_review_published`)) };
    }
    if (sql.startsWith('SELECT e.event_id')) {
      return { rows: [...stages.values()].filter((s) => ['pending', 'failed'].includes(String(s.delivery_state))).map((s) => ({ ...s, ...identities.get(`${s.entity_type}:${s.entity_id}`) })) };
    }
    throw new Error(`unexpected SQL: ${sql.slice(0, 80)}`);
  };
  const deps: Deps = {
    query: q as unknown as Deps['query'],
    send: async (event, clientId) => {
      sent.push({ event, clientId });
      return outcomes.shift() ?? 'sent';
    },
    now: () => now,
    randomUUID: uuid,
    log: () => undefined,
  };
  return { deps, identities, stages, sent };
}

const granted = (extra: Record<string, unknown> = {}) =>
  parseConversionContext({ consent: 'granted', journeyId: 'jrn_' + 'a'.repeat(32), firstTouch: { category: 'tagged', source: 'google', medium: 'cpc', campaign: 'unknown', landingPage: 'blog_post' }, ...extra });

beforeEach(() => {
  n = 0;
});

describe('pages, CTAs and the existing GA4 allowlist', () => {
  it('blog and the reputation landing are public; merchant, case pages and API are not', () => {
    for (const p of ['/blog', '/blog/resenas-whatsapp', '/resenas-y-reputacion']) expect(isPublicAnalyticsPath(p), p).toBe(true);
    for (const p of ['/merchant', '/merchant/inbox', '/caso/7', '/api/v1/reviews']) {
      expect(isPublicAnalyticsPath(p), p).toBe(false);
      expect(pageForPath(p), p).toBeNull();
    }
    expect(pageForPath('/b/comercio-demo')).toEqual({ pageId: 'passport', templatePath: '/b/business' });
    expect(pageForPath('/escribir-opinion/comercio-demo?x=1')).toEqual({ pageId: 'review_form', templatePath: '/escribir-opinion/business' });
  });

  it('the merchant panel CTA is intent only and a separate journey from consumer discovery', () => {
    expect(journeyForCta('nav_merchant_panel')).toBe('merchant_panel');
    expect(journeyForCta('home_search_submit')).toBe('consumer_discovery');
    expect(ctaIdFor('Maria Lopez')).toBe('unmapped');
  });
});

describe('consent: only an explicit "granted" measures', () => {
  it('pending and denied store no journey and emit nothing', () => {
    for (const choice of [null, 'pending', 'denied']) {
      const b = browser(choice);
      recordLanding(b.env, { pathname: '/', search: '?utm_source=google', referrer: '', host: 'opinio.mx' });
      expect(trackIntent(b.env, { stage: 'cta_click', journey: 'consumer_discovery', pathname: '/', ctaId: 'home_search_submit' })).toBeNull();
      expect(b.emitted).toHaveLength(0);
      expect(b.store.has(CONVERSION_STORAGE_KEY)).toBe(false);
      expect(conversionContextForServer(b.env)).toEqual({ consent: 'denied' });
    }
  });

  it('granted: CTA and step events carry reviewed IDs only, never search text or business data', () => {
    const b = browser('granted');
    recordLanding(b.env, { pathname: '/blog/resenas-whatsapp', search: `?utm_source=google&utm_medium=cpc&utm_term=${encodeURIComponent('maria lopez diabetes')}`, referrer: 'https://www.google.com/search?q=juan+perez', host: 'opinio.mx' });
    const cta = trackIntent(b.env, { stage: 'cta_click', journey: 'consumer_discovery', pathname: '/', ctaId: 'home_search_submit' });
    const step = trackIntent(b.env, { stage: 'step_started', journey: 'consumer_review', pathname: '/escribir-opinion/comercio-demo', stepId: 'review_form_publish' });
    assertPayload(cta);
    assertPayload(step);
    assertSafe([cta, step]);
    expect(cta!.params.ft_landing_page).toBe('blog_post');
    expect(trackIntent(b.env, { stage: 'cta_click', journey: 'merchant_panel', pathname: '/merchant', ctaId: 'nav_merchant_panel' })).toBeNull();
  });

  it('attribution never keeps referrer paths, search terms or unknown campaigns', () => {
    const touch = classifyTouch({ utmSource: 'Maria Lopez', utmCampaign: 'reset_token=1', currentHost: 'opinio.mx', landingPage: 'home' }, allPageIds());
    expect(touch).toEqual({ category: 'unknown', source: 'unknown', medium: 'unknown', campaign: 'unknown', landingPage: 'home' });
  });
});

describe('ledger: review_published after commit', () => {
  it('records once (refresh/replay is a duplicate), ID-only, and sends only for granted journeys', async () => {
    const f = fakePg();
    expect((await recordMilestone({ entityType: 'review', entityId: '9', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps)).status).toBe('recorded');
    expect((await recordMilestone({ entityType: 'review', entityId: '9', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps)).status).toBe('duplicate');
    expect(f.sent).toHaveLength(1);
    assertPayload(f.sent[0].event as ConversionEvent);
    expect(f.sent[0].event.name).toBe('conversion_milestone');
    expect(f.sent[0].clientId).toMatch(/^acct_[0-9a-f]{32}$/);
    // dedupe_key/entity_id are product-DB lookup keys (review IDs), never sent.
    assertSafe([...f.identities.values(), ...[...f.stages.values()].map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'dedupe_key' && k !== 'entity_id')))]);
  });

  it('a second review in the same consented journey shares the visitor analytics ID', async () => {
    const f = fakePg();
    await recordMilestone({ entityType: 'review', entityId: '9', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps);
    await recordMilestone({ entityType: 'review', entityId: '10', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps);
    expect(new Set([...f.identities.values()].map((i) => i.analytics_id)).size).toBe(1);
  });

  it('not consented (or tampered context): stored without analytics ID or attribution, never sent', async () => {
    const f = fakePg();
    const tampered = parseConversionContext({ consent: 'granted', journeyId: 'maria@correo-ficticio.mx', firstTouch: { category: 'tagged', source: 'juan perez' }, stage: 'activated' });
    await recordMilestone({ entityType: 'review', entityId: '11', milestone: 'review_published', journey: 'consumer_review', context: parseConversionContext({ consent: 'pending' }) }, f.deps);
    await recordMilestone({ entityType: 'review', entityId: '12', milestone: 'review_published', journey: 'consumer_review', context: tampered }, f.deps);
    const s11 = f.stages.get('review:11:milestone_review_published')!;
    expect(s11.analytics_id).toBeNull();
    expect(s11.delivery_state).toBe('skipped_consent');
    expect(f.identities.get('review:12')!.journey_id).toBeNull();
    expect(f.sent.length).toBe(1);
    assertSafe(f.sent);
  });

  it('only allowlisted milestones; merchant stages cannot be written; invalid IDs refused', async () => {
    const f = fakePg();
    expect((await recordMilestone({ entityType: 'review', entityId: '9', milestone: 'activated' as never, journey: 'merchant_panel', context: granted() }, f.deps)).status).toBe('invalid');
    expect((await recordMilestone({ entityType: 'review', entityId: 'x; drop', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps)).status).toBe('invalid');
    expect(f.stages.size).toBe(0);
  });

  it('GA4 failure keeps the review; maintenance retries once, and reconciles a lost write without inventing attribution', async () => {
    const f = fakePg({ sendOutcomes: ['failed', 'sent'], reviews: [{ id: 20, created_at: '2026-10-01T12:00:00.000Z', status: 'published' }, { id: 21, created_at: '2026-10-01T12:00:00.000Z', status: 'removed' }] });
    const r = await recordMilestone({ entityType: 'review', entityId: '9', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps);
    expect(r).toEqual({ status: 'recorded', delivery: 'failed' });
    const m = await maintainLedger(f.deps);
    expect(m.recovered).toBe(1);
    expect(f.stages.get('review:9:milestone_review_published')!.delivery_state).toBe('sent');
    const recovered = f.stages.get('review:20:milestone_review_published')!;
    expect(recovered.source).toBe('reconciled');
    expect(recovered.analytics_id).toBeNull();
    expect(f.stages.has('review:21:milestone_review_published')).toBe(false);
    expect((await maintainLedger(f.deps)).recovered).toBe(0);
  });

  it('GA4 not configured: rows stay pending with no attempt counted', async () => {
    const f = fakePg({ sendOutcomes: ['unconfigured'] });
    expect((await recordMilestone({ entityType: 'review', entityId: '9', milestone: 'review_published', journey: 'consumer_review', context: granted() }, f.deps)).delivery).toBe('pending');
    expect(f.stages.get('review:9:milestone_review_published')!.delivery_attempts).toBe(0);
  });
});

describe('unavailable stages are explicit, never zero', () => {
  it('qualified, activated, paid and business week two are unavailable with reasons', () => {
    const unavailable = STAGE_COVERAGE.filter((c) => c.status === 'unavailable').map((c) => c.stage);
    expect(unavailable).toEqual(['enquiry_submitted (merchant)', 'qualified', 'activated', 'paid', 'week2_return (business)']);
    expect(STAGE_COVERAGE.find((c) => c.stage === 'paid')!.note).toMatch(/never Opinio revenue/);
  });

  it('the payload builder cannot emit a merchant stage from a milestone name', () => {
    expect(buildConversionEvent({ stage: 'milestone', milestone: 'activated' as never, eventId: 'evt_' + 'b'.repeat(32), journey: 'merchant_panel', consent: 'granted' })).toBeNull();
  });

  it('the review route records the milestone after the transaction, from the server context only', () => {
    const route = readFileSync('src/app/api/v1/reviews/route.ts', 'utf8');
    const tx = route.indexOf('await withTransaction(');
    const hook = route.indexOf('await recordMilestone({');
    expect(tx).toBeGreaterThan(0);
    expect(hook).toBeGreaterThan(tx);
    expect(route.slice(hook, hook + 400)).toMatch(/context: parseConversionContext\(body\.conversion\)/);
  });

  it('the schema CHECK lists match the code allowlists', () => {
    const sql = readFileSync('src/lib/schema.sql', 'utf8');
    expect(sql).toMatch(/stage IN \('milestone_review_published'\)/);
    expect(sql).toMatch(/journey IN \('consumer_discovery', 'consumer_review', 'consumer_case', 'merchant_panel'\)/);
  });
});
