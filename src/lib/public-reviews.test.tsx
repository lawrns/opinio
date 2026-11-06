import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';

// Synthetic sentinels, not real data. The fake database returns reviews in
// every status, each carrying reviewer contact, even for queries that filter
// by status or select public columns only; the tests check that code drops
// them as well as the SQL.
const CONTACT = 'sentinel-reviewer@example.invalid';
const HIDDEN_BODY = 'SENTINEL_HIDDEN_REVIEW';

const db = vi.hoisted(() => {
  const state = {
    calls: [] as { text: string; params: unknown[] }[],
    reviews: null as null | Array<Record<string, unknown>>,
  };
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
    if (/^INSERT INTO reviews/.test(sql)) return { rows: [review(9, 'published', 0)] };
    if (/FROM widgets w/.test(sql)) {
      return { rows: [{ ...business, b_slug: 'comercio-demo', widget_token: 'wgt_demo', widget_type: 'card', w_theme: 'light', w_config: {}, rev_count: 1, avg_rating: 4 }] };
    }
    if (/FROM reviews/.test(sql) && /^SELECT/.test(sql)) return { rows: state.reviews ?? reviews() };
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
import { isCustomerReview, PUBLIC_REVIEW_COLUMNS } from '@/lib/public-reviews';

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
  db.state.reviews = null;
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
    expect(select.text).toContain('content_origin');
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
    expect(select.text).toMatch(/r\.content_origin/);
    expect(select.text).toMatch(/content_origin IS DISTINCT FROM 'automated'/);
    expect(select.text).toMatch(/CASE WHEN r\.content_origin = 'automated' THEN NULL/);
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

function publishedReview(overrides: Record<string, unknown>) {
  return {
    id: 1,
    business_id: 1,
    rating: 5,
    title: 'Nota',
    body: 'Texto',
    author_name: 'Ana',
    verification_level: 'confirmed_store_order',
    content_origin: null,
    score_weight: '0.90',
    product_name: null,
    status: 'published',
    author_review_count: 1,
    created_at: '2026-03-15T18:30:00.000Z',
    responder_name: null,
    response_text: null,
    response_created_at: null,
    ...overrides,
  };
}

function isReactNode(node: object): node is React.ReactElement<{ children?: unknown; dangerouslySetInnerHTML?: { __html: string } }> {
  return 'type' in node && 'props' in node;
}

function serverText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(serverText).join('');
  if (typeof node !== 'object' || !isReactNode(node) || typeof node.type === 'function') return '';
  return `${node.props.dangerouslySetInnerHTML?.__html ?? ''}${serverText(node.props.children)}`;
}

function jsonLdFromTree(node: unknown): { '@graph': Array<Record<string, unknown>> } {
  if (!node || typeof node !== 'object') throw new Error('JSON-LD script missing');
  if (Array.isArray(node)) {
    for (const child of node) {
      try {
        return jsonLdFromTree(child);
      } catch {
        // Keep looking through sibling server nodes.
      }
    }
    throw new Error('JSON-LD script missing');
  }
  if (!isReactNode(node)) throw new Error('JSON-LD script missing');
  const html = node.type === 'script' ? node.props.dangerouslySetInnerHTML?.__html : undefined;
  if (html) return JSON.parse(html.replace(/\\u003c/g, '<')) as { '@graph': Array<Record<string, unknown>> };
  return jsonLdFromTree(node.props.children);
}

describe('automated reviews stay visible and out of buyer aggregates', () => {
  it('treats null origin as customer and only automated as generated', () => {
    expect(PUBLIC_REVIEW_COLUMNS).toContain('content_origin');
    expect(isCustomerReview({ content_origin: null })).toBe(true);
    expect(isCustomerReview({})).toBe(true);
    expect(isCustomerReview({ content_origin: 'customer_submitted' })).toBe(true);
    expect(isCustomerReview({ content_origin: 'imported' })).toBe(true);
    expect(isCustomerReview({ content_origin: 'automated' })).toBe(false);
  });

  it('excludes automated rows from JSON-LD, FAQ and customer rating, and badges them in the list', async () => {
    db.state.reviews = [
      publishedReview({ id: 1, rating: 5, author_name: 'Ana', content_origin: null, body: 'Histórica', author_review_count: 1 }),
      publishedReview({ id: 2, rating: 4, author_name: 'Bea', content_origin: 'customer_submitted', body: 'Enviada', author_review_count: 1 }),
      publishedReview({ id: 3, rating: 3, author_name: 'Ciro', content_origin: 'imported', body: 'Importada', author_review_count: 1 }),
      publishedReview({
        id: 4,
        rating: 1,
        author_name: 'Contenido automatizado',
        content_origin: 'automated',
        body: 'GENERATED_ONE',
        author_review_count: 4,
        verification_level: 'unverified_experience',
      }),
      publishedReview({
        id: 5,
        rating: 1,
        author_name: 'Contenido automatizado',
        content_origin: 'automated',
        body: 'GENERATED_TWO',
        author_review_count: 4,
        verification_level: 'unverified_experience',
      }),
    ];

    const tree = await BusinessPassportPage({ params: Promise.resolve({ slug: 'comercio-demo' }) });
    const pageText = serverText(tree);
    const org = jsonLdFromTree(tree)['@graph'].find((node) => node['@type'] === 'Organization') as {
      aggregateRating: { ratingValue: string; reviewCount: number };
      review: Array<{ author?: { '@type': string; name: string }; reviewBody: string }>;
    };
    const list = findElement(tree, PassportReviewsList) as React.ReactElement<{ reviews: Array<{ content_origin?: string | null; body: string }> }>;
    const listHtml = renderToStaticMarkup(list);

    expect(org.aggregateRating).toEqual(expect.objectContaining({ ratingValue: '4.0', reviewCount: 3 }));
    expect(org.review.map((item) => item.author?.name).sort()).toEqual(['Ana', 'Bea', 'Ciro']);
    expect(org.review.every((item) => item.author?.['@type'] === 'Person')).toBe(true);
    expect(JSON.stringify(org.review)).not.toContain('Contenido automatizado');
    expect(JSON.stringify(org.review)).not.toContain('GENERATED_ONE');
    expect(pageText).toContain('Tiene 3 opiniones de clientes con promedio de 4.0/5.');
    expect(pageText).not.toContain('promedio de 2.8');
    expect(pageText).not.toContain('Opiniones de compradores');
    expect(pageText).not.toContain('Experiencias reales');
    expect(pageText).toContain('Opiniones publicadas (5)');
    expect(pageText).toContain('Calificación de clientes');
    expect(list.props.reviews.map((review) => review.body)).toEqual(expect.arrayContaining(['GENERATED_ONE', 'GENERATED_TWO', 'Histórica']));
    expect(listHtml).toContain('GENERATED_ONE');
    expect(listHtml).toContain('GENERATED_TWO');
    expect(listHtml).not.toContain('Lo que opinan sus clientes');
    expect(listHtml.match(/Automatizado/g)).toHaveLength(2);
    expect(listHtml).toContain('4.0');
    expect(listHtml).not.toContain('2.8');
    expect(listHtml).toContain('Muy bueno');
    expect(listHtml).toContain('5 estrellas: 1 opinión, 33%');
    expect(listHtml).toContain('1 estrella: 0 opiniones, 0%');
    expect(listHtml).not.toContain('1 estrella: 2 opiniones');
    expect(listHtml).not.toContain('4 opiniones');
    expect(listHtml).toContain('1 opinión');
  });

  it('does not invent a customer rating or a person author when only automated rows exist', async () => {
    db.state.reviews = [
      publishedReview({
        id: 8,
        rating: 5,
        author_name: 'Contenido automatizado',
        content_origin: 'automated',
        body: 'SOLO_AUTOMATIZADO',
        author_review_count: 2,
        verification_level: 'unverified_experience',
      }),
    ];

    const tree = await BusinessPassportPage({ params: Promise.resolve({ slug: 'comercio-demo' }) });
    const pageText = serverText(tree);
    const jsonLd = jsonLdFromTree(tree);
    const org = jsonLd['@graph'].find((node) => node['@type'] === 'Organization') as Record<string, unknown>;
    const list = findElement(tree, PassportReviewsList) as React.ReactElement;
    const listHtml = renderToStaticMarkup(list);

    expect(org.aggregateRating).toBeUndefined();
    expect(org.review).toBeUndefined();
    expect(JSON.stringify(org)).not.toContain('Contenido automatizado');
    expect(JSON.stringify(jsonLd)).not.toContain('"@type":"Person"');
    expect(pageText).toContain('Sin calificación de clientes');
    expect(pageText).not.toContain('Este negocio todavía no tiene opiniones');
    expect(pageText).toContain('Todavía no tiene opiniones de clientes.');
    expect(listHtml).toContain('SOLO_AUTOMATIZADO');
    expect(listHtml.match(/Automatizado/g)).toHaveLength(1);
    expect(listHtml).toContain('Sin calificación de clientes');
    expect(listHtml).not.toContain('5.0');
    expect(listHtml).toContain('5 estrellas: 0 opiniones, 0%');
    expect(listHtml).not.toContain('5 estrellas: 1 opinión, 100%');
    expect(listHtml).not.toContain('2 opiniones');
    expect(listHtml).not.toContain('Este negocio todavía no tiene opiniones');
  });
});
