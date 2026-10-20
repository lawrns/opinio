import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { NextRequest } from 'next/server';

// Synthetic sentinels, not real data. The fake database returns reviews in
// every status, each carrying reviewer contact, even for queries that filter
// by status or select public columns only; the tests check that code drops
// them as well as the SQL.
const CONTACT = 'sentinel-reviewer@example.invalid';
const HIDDEN_BODY = 'SENTINEL_HIDDEN_REVIEW';

const db = vi.hoisted(() => {
  const state = { calls: [] as { text: string; params: unknown[] }[] };
  const review = (id: number, status: string, minutesAgo: number) => ({
    id,
    business_id: 1,
    order_id: 30 + id,
    invitation_id: 40 + id,
    rating: 4,
    title: 'Buen servicio',
    body: status === 'published' ? `Opinión publicada ${id}` : 'SENTINEL_HIDDEN_REVIEW',
    author_name: 'Ana',
    author_masked_contact: 'sentinel-reviewer@example.invalid',
    verification_level: 'confirmed_store_order',
    score_weight: '0.90',
    integrity_factor: '1.00',
    product_name: null,
    status,
    upvotes: 0,
    helpful_count: 0,
    author_review_count: 1,
    responder_name: null,
    response_text: null,
    response_created_at: null,
    resp_id: null,
    created_at: new Date(Date.UTC(2026, 0, 2) - minutesAgo * 60_000).toISOString(),
    updated_at: '2026-01-02T00:00:00Z',
  });
  // Newest first, as the queries order them: hidden statuses are the newest.
  const reviews = () => [
    review(4, 'flagged', 1),
    review(3, 'under_review', 2),
    review(2, 'removed', 3),
    review(1, 'published', 4),
  ];
  const business = {
    id: 1, slug: 'comercio-demo', brand_name: 'Comercio Demo', legal_name: null, category: 'Retail DTC',
    description: null, rfc: null, clee: null, phone: null, whatsapp: null, domain: null, logo_url: null,
    banner_url: null, operating_area: null, claimed: false, verified_level: 'unverified', trust_score: '0',
    confidence_level: 'preliminary', coverage_percentage: '0', observed_orders_count: 0, invited_orders_count: 0,
    issues_per_thousand: '0', resolution_rate: '0', median_response_hours: '0', reopen_rate: '0',
    effective_reviews_count: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
  async function query(text: string, params: unknown[] = []) {
    state.calls.push({ text, params });
    const sql = text.replace(/\s+/g, ' ').trim();
    if (/^INSERT INTO reviews/.test(sql)) return { rows: [{ ...review(9, 'published', 0), status: 'pending' }] };
    if (/COUNT\(\*\)::text AS count FROM reviews/.test(sql)) return { rows: [{ count: '0' }] };
    if (/body_hash = \$1/.test(sql)) return { rows: [] };
    if (/FROM widgets w/.test(sql)) {
      return { rows: [{ ...business, b_slug: 'comercio-demo', widget_token: 'wgt_demo', widget_type: 'card', w_theme: 'light', w_config: {}, rev_count: 1, avg_rating: 4 }] };
    }
    if (/FROM reviews/.test(sql) && /^SELECT/.test(sql)) return { rows: reviews() };
    if (/FROM businesses WHERE (slug|id)/.test(sql)) return { rows: [business] };
    return { rows: [] };
  }
  return { state, query };
});

vi.mock('@/lib/db', () => ({
  query: db.query,
  withTransaction: async (fn: (client: { query: typeof db.query }) => unknown) => fn({ query: db.query }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { GET as getBusiness } from '@/app/api/v1/businesses/[slug]/route';
import { POST as postReview } from '@/app/api/v1/reviews/route';
import WidgetCardPage from '@/app/widget/card/[token]/page';
import BusinessPassportPage from '@/app/b/[slug]/page';
import { PassportReviewsList } from '@/components/passport/PassportReviewsList';
import { MerchantWidgetSurface } from '@/components/MerchantWidgetSurface';
import { calculateOpinioScore } from '@/lib/scoring';

function findElement(node: unknown, type: unknown): React.ReactElement | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findElement(child, type);
      if (hit) return hit;
    }
    return null;
  }
  const el = node as React.ReactElement<Record<string, unknown>>;
  if (el.type === type) return el;
  for (const value of Object.values(el.props ?? {})) {
    const hit = findElement(value, type);
    if (hit) return hit;
  }
  return null;
}

function expectNoReviewerData(payload: string) {
  expect(payload).not.toContain(CONTACT);
  expect(payload).not.toContain(HIDDEN_BODY);
  expect(payload).not.toMatch(/author_masked_contact|"order_id"|"invitation_id"/);
}

beforeEach(() => {
  db.state.calls.length = 0;
});

describe('public review reads show only published reviews, without reviewer contact', () => {
  it('GET /api/v1/businesses/[slug]', async () => {
    const res = await getBusiness(new NextRequest('http://localhost/api/v1/businesses/comercio-demo'), {
      params: Promise.resolve({ slug: 'comercio-demo' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews.map((r: { id: number }) => r.id)).toEqual([1]);
    expectNoReviewerData(JSON.stringify(body));

    const select = db.state.calls.find((c) => /FROM reviews WHERE business_id/.test(c.text))!;
    expect(select.text).not.toMatch(/SELECT \*/);
    expect(select.text).toMatch(/status = \$2/);
    expect(select.params).toEqual([1, 'published']);
  });

  it('GET /api/v1/businesses/[slug] scores from published reviews only', async () => {
    const res = await getBusiness(new NextRequest('http://localhost/api/v1/businesses/comercio-demo'), {
      params: Promise.resolve({ slug: 'comercio-demo' }),
    });
    const body = await res.json();
    const ageDays = Math.floor((Date.now() - Date.UTC(2026, 0, 2) + 4 * 60_000) / 86_400_000);
    const item = { rating: 4, verificationLevel: 'confirmed_store_order' as const, ageDays, integrityFactor: 1 };
    const resolution = { casesCount: 0, consumerConfirmedCount: 0, merchantRespondedCount: 0, medianResponseHours: 4.5, targetResponseHours: 24, reopenedCount: 0 };
    const publishedOnly = calculateOpinioScore([item], resolution, 0, 0);
    const allStatuses = calculateOpinioScore([item, item, item, item], resolution, 0, 0);
    expect(publishedOnly.effectiveSampleSize).not.toBe(allStatuses.effectiveSampleSize);
    expect(body.live_metrics.effectiveSampleSize).toBe(publishedOnly.effectiveSampleSize);
  });

  it('the /widget/card embed shows the newest published review', async () => {
    const tree = await WidgetCardPage({
      params: Promise.resolve({ token: 'wgt_demo' }),
      searchParams: Promise.resolve({}),
    });
    const surface = findElement(tree, MerchantWidgetSurface) as React.ReactElement<{ review: { id: number } | null }>;
    expect(surface).not.toBeNull();
    expect(surface.props.review?.id).toBe(1);
    expectNoReviewerData(JSON.stringify(surface.props.review));

    const select = db.state.calls.find((c) => /FROM reviews r/.test(c.text))!;
    expect(select.params).toContain('published');
  });

  it('the /b/[slug] passport passes no reviewer contact to the client list', async () => {
    const tree = await BusinessPassportPage({ params: Promise.resolve({ slug: 'comercio-demo' }) });
    const list = findElement(tree, PassportReviewsList) as React.ReactElement<{ reviews: unknown[] }>;
    expect(list).not.toBeNull();
    expect(JSON.stringify(list.props.reviews)).not.toMatch(/author_masked_contact|sentinel-reviewer/);

    const select = db.state.calls.find((c) => /FROM reviews r\s+LEFT JOIN LATERAL/.test(c.text))!;
    expect(select.text).toMatch(/WHERE r\.business_id = \$1 AND r\.status = 'published'/);
    expect(select.text.split('FROM reviews r')[0]).not.toMatch(/author_masked_contact/);
  });

  it('POST /api/v1/reviews echoes the review without reviewer contact', async () => {
    const res = await postReview(
      new NextRequest('http://localhost/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: 1, rating: 4, body: 'Muy buena atención', author_name: 'Ana', author_masked_contact: CONTACT }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.review.id).toBe(9);
    expectNoReviewerData(JSON.stringify(body.review));
  });
});
