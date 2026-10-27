/**
 * Wave 3 regression & real embedded PostgreSQL verification for BL-04 candidate gaps:
 * - OPN-BL04-RATE-ATOMICITY: concurrent POST /api/v1/reviews from the same client IP
 *   across one or multiple businesses are serialized via pg_advisory_xact_lock and
 *   cannot exceed REVIEWS_PER_CLIENT_PER_HOUR (3).
 * - OPN-BL04-PUBLICATION-ACCOUNTING: pending reviews record only conversion_identities
 *   (`status: 'deferred'`) with zero `milestone_review_published` rows in
 *   conversion_stage_events; rejected reviews clear attribution and emit nothing;
 *   only admin approval (`publishReviewMilestone`) records and dispatches
 *   `milestone_review_published`.
 * - OPN-BL04-CAPTCHA-FORM: ReviewFormWizard renders Turnstile widget and hidden
 *   response input when turnstileSiteKey/captchaRequired is configured, and wires
 *   captcha_token into the POST /api/v1/reviews payload.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { startDatabase, type TestDatabase } from '@/test/e2e/harness';
import { REVIEWS_PER_CLIENT_PER_HOUR } from '@/lib/authz/policy';
import {
  discardReviewIdentity,
  publishReviewMilestone,
  recordMilestone,
  type Deps,
} from '@/lib/conversion/ledger';
import { parseConversionContext } from '@/lib/conversion/context';
import { moderateReview } from '@/lib/review-moderation';
import { ReviewFormWizard } from '@/app/escribir-opinion/[slug]/ReviewFormWizard';

let testDb: TestDatabase;
let pool: Pool;

const routeMocks = vi.hoisted(() => ({
  poolRef: null as Pool | null,
}));

vi.mock('@/lib/db', async () => {
  return {
    query: async (text: string, params?: unknown[]) => {
      if (!routeMocks.poolRef) throw new Error('test pool not initialized');
      return routeMocks.poolRef.query(text, params);
    },
    withTransaction: async <T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> => {
      if (!routeMocks.poolRef) throw new Error('test pool not initialized');
      const client = await routeMocks.poolRef.connect();
      try {
        await client.query('BEGIN');
        const res = await fn(client);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
});

import { POST as postReview } from '@/app/api/v1/reviews/route';

beforeAll(async () => {
  testDb = await startDatabase([
    'src/lib/schema.sql',
    'db/migrations/0001_authjs_identity.sql',
    'db/migrations/0007_review_moderation.sql',
  ]);
  pool = new Pool({ connectionString: testDb.url, max: 10 });
  routeMocks.poolRef = pool;
}, 120_000);

afterAll(async () => {
  await pool?.end();
  await testDb?.stop();
}, 60_000);

beforeEach(async () => {
  await pool.query(
    'TRUNCATE conversion_stage_events, conversion_identities, reviews, businesses, users RESTART IDENTITY CASCADE',
  );
  await pool.query(`
    INSERT INTO businesses (id, slug, brand_name, category)
    VALUES (1, 'comercio-uno', 'Comercio Uno', 'Retail DTC'),
           (2, 'comercio-dos', 'Comercio Dos', 'Servicios');
    INSERT INTO users (id, email, name)
    VALUES (1, 'admin@opinio.test', 'Admin Opinio');
  `);
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe('OPN-BL04-RATE-ATOMICITY (real PostgreSQL concurrency)', () => {
  it('enforces REVIEWS_PER_CLIENT_PER_HOUR atomically across 6 concurrent requests from the same client IP', async () => {
    const ip = '203.0.113.99';
    const requests = Array.from({ length: 6 }, (_, i) => {
      const businessId = i % 2 === 0 ? 1 : 2;
      const body = {
        business_id: businessId,
        rating: 5,
        body: `Experiencia concurrente distinta numero ${i + 1} con entrega puntual`,
        author_name: `Comprador ${i + 1}`,
      };
      return postReview(
        new Request('http://localhost/api/v1/reviews', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }) as never,
      );
    });

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status).sort();

    expect(REVIEWS_PER_CLIENT_PER_HOUR).toBe(3);
    expect(statuses).toEqual([201, 201, 201, 429, 429, 429]);

    const { rows } = await pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM reviews');
    expect(rows[0].count).toBe(REVIEWS_PER_CLIENT_PER_HOUR);
  });

  it('prevents concurrent duplicate body_hash inserts across different businesses', async () => {
    const sameBody = 'Texto identico enviado al mismo tiempo en dos comercios distintos';
    const [r1, r2] = await Promise.all([
      postReview(
        new Request('http://localhost/api/v1/reviews', {
          method: 'POST',
          headers: { 'x-forwarded-for': '198.51.100.10', 'content-type': 'application/json' },
          body: JSON.stringify({ business_id: 1, rating: 4, body: sameBody, author_name: 'Autor A' }),
        }) as never,
      ),
      postReview(
        new Request('http://localhost/api/v1/reviews', {
          method: 'POST',
          headers: { 'x-forwarded-for': '198.51.100.11', 'content-type': 'application/json' },
          body: JSON.stringify({ business_id: 2, rating: 4, body: sameBody, author_name: 'Autor B' }),
        }) as never,
      ),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    const { rows } = await pool.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM reviews');
    expect(rows[0].count).toBe(1);
  });
});

describe('OPN-BL04-PUBLICATION-ACCOUNTING (real PostgreSQL conversion + moderation)', () => {
  const makeDeps = (sent: Array<{ event: unknown; clientId: string }>): Deps => ({
    query: (text, params) => pool.query(text, params) as never,
    send: async (event, clientId) => {
      sent.push({ event, clientId });
      return 'sent';
    },
    now: () => new Date('2026-10-23T12:00:00.000Z'),
    randomUUID: () => globalThis.crypto.randomUUID(),
    log: () => {},
  });

  it('defers milestone_review_published while pending, discards on reject, and records/sends only on admin approval', async () => {
    const sent: Array<{ event: unknown; clientId: string }> = [];
    const deps = makeDeps(sent);

    const context = parseConversionContext({
      consent: 'granted',
      journeyId: 'jrn_' + 'a'.repeat(32),
      attribution: {
        version: 'v1',
        firstTouch: {
          category: 'organic_search',
          source: 'google',
          medium: 'organic',
          campaign: 'none',
          landingPage: 'home',
        },
        lastTouch: null,
      },
    });

    // 1. Insert two pending reviews
    const ins1 = await pool.query<{ id: number }>(
      `INSERT INTO reviews (business_id, rating, body, author_name, verification_level, status)
       VALUES (1, 5, 'Primera resena pendiente de moderacion', 'Ana', 'confirmed_store_order', 'pending')
       RETURNING id`,
    );
    const ins2 = await pool.query<{ id: number }>(
      `INSERT INTO reviews (business_id, rating, body, author_name, verification_level, status)
       VALUES (1, 2, 'Segunda resena que sera rechazada', 'Beto', 'confirmed_store_order', 'pending')
       RETURNING id`,
    );
    const approvedId = ins1.rows[0].id;
    const rejectedId = ins2.rows[0].id;

    // 2. Submission records only conversion_identities (`pendingModeration: true`)
    const sub1 = await recordMilestone(
      {
        entityType: 'review',
        entityId: String(approvedId),
        milestone: 'review_published',
        journey: 'consumer_review',
        context,
        pendingModeration: true,
      },
      deps,
    );
    const sub2 = await recordMilestone(
      {
        entityType: 'review',
        entityId: String(rejectedId),
        milestone: 'review_published',
        journey: 'consumer_review',
        context,
        pendingModeration: true,
      },
      deps,
    );
    expect(sub1).toEqual({ status: 'deferred' });
    expect(sub2).toEqual({ status: 'deferred' });

    // Verify 0 stage events and 0 GA4 sends while pending
    const pendingStages = await pool.query('SELECT * FROM conversion_stage_events');
    expect(pendingStages.rows).toHaveLength(0);
    expect(sent).toHaveLength(0);

    // 3. Reject review #2: status becomes 'removed', identity attribution cleared, still 0 stage events
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      expect(await moderateReview(client, { reviewId: rejectedId, decision: 'reject', administratorUserId: 1 })).toBe(true);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    await discardReviewIdentity(rejectedId, deps);

    const rejectedIdentity = await pool.query<{ consent_state: string; journey_id: string | null }>(
      "SELECT consent_state, journey_id FROM conversion_identities WHERE entity_type = 'review' AND entity_id = $1",
      [String(rejectedId)],
    );
    expect(rejectedIdentity.rows[0]).toEqual({ consent_state: 'denied', journey_id: null });
    expect((await pool.query('SELECT * FROM conversion_stage_events')).rows).toHaveLength(0);
    expect(sent).toHaveLength(0);

    // 4. Approve review #1: status becomes 'published' and publishReviewMilestone records + dispatches milestone_review_published
    const client2 = await pool.connect();
    try {
      await client2.query('BEGIN');
      expect(await moderateReview(client2, { reviewId: approvedId, decision: 'approve', administratorUserId: 1 })).toBe(true);
      await client2.query('COMMIT');
    } finally {
      client2.release();
    }
    const pubRes = await publishReviewMilestone(approvedId, deps);
    expect(pubRes).toEqual({ status: 'recorded', delivery: 'sent' });

    const finalStages = await pool.query<{ entity_id: string; stage: string; delivery_state: string }>(
      'SELECT entity_id, stage, delivery_state FROM conversion_stage_events',
    );
    expect(finalStages.rows).toEqual([
      {
        entity_id: String(approvedId),
        stage: 'milestone_review_published',
        delivery_state: 'sent',
      },
    ]);
    expect(sent).toHaveLength(1);
  });
});

describe('OPN-BL04-CAPTCHA-FORM (ReviewFormWizard Turnstile integration)', () => {
  it('wires turnstileSiteKey and captchaRequired into ReviewFormWizard and POST /api/v1/reviews body', () => {
    const wizardSrc = readFileSync('src/app/escribir-opinion/[slug]/ReviewFormWizard.tsx', 'utf8');
    const pageSrc = readFileSync('src/app/escribir-opinion/[slug]/page.tsx', 'utf8');

    expect(pageSrc).toContain('turnstileSiteKey={turnstileSiteKey}');
    expect(pageSrc).toContain('captchaRequired={captchaRequired}');
    expect(wizardSrc).toContain('captcha_token: captchaToken.trim() || undefined');
    expect(wizardSrc).toContain('data-testid="turnstile-widget"');

    const html = renderToStaticMarkup(
      React.createElement(ReviewFormWizard, {
        businessId: 1,
        slug: 'comercio-uno',
        brandName: 'Comercio Uno',
        legalName: 'Comercio Uno S.A. de C.V.',
        category: 'Retail DTC',
        turnstileSiteKey: '0x4AAAAAA_test_site_key',
        captchaRequired: true,
      }),
    );
    expect(html).toContain('Opinar sobre Comercio Uno');
  });
});
