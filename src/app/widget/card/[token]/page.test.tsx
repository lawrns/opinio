import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const db = vi.hoisted(() => ({ reviews: [] as Array<Record<string, unknown>> }));
vi.mock('@/lib/db', () => ({
  query: async (sql: string) => {
    if (/FROM widgets w/.test(sql)) {
      return {
        rows: [{
          id: 7, slug: 'demo', brand_name: 'Demo', b_slug: 'demo', widget_token: 'wgt', widget_type: 'card',
          w_theme: 'light', w_config: {}, rev_count: 1, verified_cnt: 1, avg_rating: 4, claimed: false,
          verified_level: 'unverified', observed_orders_count: 0, trust_score: 0, coverage_percentage: 0,
          issues_per_thousand: 0, resolution_rate: 0, median_response_hours: 0,
        }],
      };
    }
    if (/FROM reviews/.test(sql)) return { rows: db.reviews };
    return { rows: [] };
  },
}));

import WidgetCardPage from './page';
import { MerchantWidgetSurface } from '@/components/MerchantWidgetSurface';

function findElement(node: unknown, type: unknown): React.ReactElement | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findElement(child, type);
      if (hit) return hit;
    }
    return null;
  }
  const el = node as React.ReactElement;
  if (el.type === type) return el;
  for (const value of Object.values(el.props ?? {})) {
    const hit = findElement(value, type);
    if (hit) return hit;
  }
  return null;
}

function review(fields: Record<string, unknown>) {
  return {
    id: 1,
    business_id: 7,
    rating: 5,
    title: 'Nota',
    body: 'Texto',
    author_name: 'Ana',
    verification_level: 'confirmed_store_order',
    content_origin: null,
    status: 'published',
    created_at: '2026-03-01T00:00:00.000Z',
    ...fields,
  };
}

async function featured() {
  const tree = await WidgetCardPage({
    params: Promise.resolve({ token: 'wgt' }),
    searchParams: Promise.resolve({}),
  });
  const surface = findElement(tree, MerchantWidgetSurface) as React.ReactElement<{ review: { id: number; body: string } | null }>;
  return surface.props.review;
}

describe('widget card features the newest non-automated review', () => {
  beforeEach(() => { db.reviews = []; });

  it('skips a newer automated review and features the newest customer review', async () => {
    db.reviews = [
      review({ id: 9, content_origin: 'automated', body: 'AUTOMATED_NEW', created_at: '2026-04-02T00:00:00.000Z', verification_level: 'unverified_experience' }),
      review({ id: 3, content_origin: null, body: 'CUSTOMER_FEATURE', created_at: '2026-03-01T00:00:00.000Z' }),
      review({ id: 8, content_origin: 'automated', body: 'AUTOMATED_OLD', created_at: '2026-02-01T00:00:00.000Z', verification_level: 'unverified_experience' }),
    ];
    await expect(featured()).resolves.toEqual(expect.objectContaining({ id: 3, body: 'CUSTOMER_FEATURE' }));
  });

  it('features a historical null-origin review ahead of an older submitted one', async () => {
    db.reviews = [
      review({ id: 2, content_origin: 'customer_submitted', body: 'VIEJA', created_at: '2026-01-01T00:00:00.000Z' }),
      review({ id: 6, content_origin: null, body: 'HISTORICA', created_at: '2026-03-02T00:00:00.000Z' }),
    ];
    await expect(featured()).resolves.toEqual(expect.objectContaining({ id: 6, body: 'HISTORICA' }));
  });

  it('features nothing when every published review is automated', async () => {
    db.reviews = [
      review({ id: 4, content_origin: 'automated', body: 'SOLO', created_at: '2026-04-02T00:00:00.000Z', verification_level: 'unverified_experience' }),
    ];
    await expect(featured()).resolves.toBeNull();
  });
});
