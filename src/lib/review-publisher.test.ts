import { describe, expect, it } from 'vitest';
import { PUBLICATION_EVIDENCE_MAX_AGE_MS } from './review-generation';
import { publishDueReviews } from './review-publisher';
import { createPublicationHarness, type PublicationHarness, type Row } from '../test/review-sql-harness';

/**
 * Publisher contract:
 * - returns { due, published, failed } with queueId, businessId, publicationKey, and reviewId on success.
 *   Serialized output contains no title, body, excerpt, or product name.
 * - dry-run is SELECT only and still respects batchLimit, including the cap of 10.
 * - a real run takes pg_advisory_xact_lock, claims with FOR UPDATE SKIP LOCKED, and publishes at most
 *   batchLimit rows. The default batch is 1 and an explicit limit above 10 is capped at 10.
 * - inside each transaction, the last automated publication must be at least 6h old globally and 18h
 *   old for that brand. An overdue backlog therefore cannot burst, even when batchLimit is higher.
 * - a failed insert rolls back the review and claim. Attempts below 3 stay queued with a sanitized
 *   publication_failed error and publish_after at least 1h later. The third attempt is failed.
 *   A sibling due row still publishes. Errors contain no review content.
 * - evidence older than 45 days is not published and is failed as stale_evidence.
 * - inserted reviews use author_name Contenido automatizado, null order/invitation/contact,
 *   verification_level unverified_experience, content_origin automated, score_weight 0.35,
 *   the queue publication_key, status published, and the injected now for both timestamps.
 * - a unique publication_key links the existing review instead of inserting another; its timestamps stay.
 * - audit_logs.action is review.automated_published; details include queue_id and review_id only.
 */

const NOW = new Date('2020-01-15T12:00:00.000Z');
const BODY = 'BODY_TOKEN_9f3a el pedido llegó completo y cerrado.';
const TITLE = 'TITLE_TOKEN_9f3a';
const EXCERPT = 'EXCERPT_TOKEN_9f3a entrega publicada';

async function seedBusiness(harness: PublicationHarness, slug = 'barri'): Promise<number> {
  const inserted = await harness.pool.query(
    'INSERT INTO businesses (slug, brand_name, category) VALUES ($1, $2, $3) RETURNING id',
    [slug, slug, 'Retail DTC'],
  );
  return Number(inserted.rows[0].id);
}

async function seedQueue(harness: PublicationHarness, fields: Record<string, unknown>): Promise<Row> {
  const row: Record<string, unknown> = {
    humanized_at: new Date('2020-01-02T00:00:00.000Z'),
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    ...fields,
  };
  if (row.status === 'failed' && row.last_error == null) row.last_error = 'publication_failed';
  if (row.status === 'claimed' && row.claimed_at == null) row.claimed_at = row.created_at ?? NOW;
  if (row.status === 'published' && row.published_review_id == null) {
    const created = row.published_at ?? row.created_at ?? NOW;
    const review = await harness.pool.query(
      `INSERT INTO reviews (
        business_id, rating, title, body, author_name, verification_level, content_origin,
        publication_key, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'Contenido automatizado', 'unverified_experience', 'automated', $5, 'published', $6, $6)
      RETURNING id`,
      [row.business_id, row.rating ?? 4, row.title ?? TITLE, row.body ?? BODY, row.publication_key, created],
    );
    row.published_review_id = review.rows[0].id;
    row.published_at = created;
  }
  const columns = Object.keys(row);
  const inserted = await harness.pool.query(
    `INSERT INTO review_publication_queue (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
    columns.map((column) => row[column]),
  );
  return inserted.rows[0];
}

async function table(harness: PublicationHarness, name: string): Promise<Row[]> {
  return (await harness.pool.query(`SELECT * FROM ${name}`)).rows;
}

function queueInput(businessId: number, index: number, overrides: Record<string, unknown> = {}) {
  return {
    business_id: businessId,
    dedup_key: `queue-${index}`,
    publication_key: `queue-${index}`,
    rating: 4,
    title: `${TITLE} ${index}`,
    body: `${BODY} ${index}`,
    product_name: `PRODUCT_TOKEN_9f3a ${index}`,
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    source_facts: [{ url: 'https://barri.mx/hecho', claim: 'entrega', source_excerpt: EXCERPT, checked_at: '2020-01-01T00:00:00.000Z' }],
    generation_run_id: 'run-publish',
    humanized_at: new Date('2020-01-02T00:00:00.000Z'),
    publish_after: new Date(NOW.getTime() - (100 - index) * 1000),
    status: 'queued',
    attempt_count: 0,
    created_at: new Date('2020-01-01T00:00:00.000Z'),
    updated_at: new Date('2020-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function resultText(value: unknown): string {
  return JSON.stringify(value);
}

describe('publishDueReviews', () => {
  it('publishes a due row with automated provenance and leaves orders, invitations, and contacts empty', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const queued = await seedQueue(harness, queueInput(businessId, 1));
    const published = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    const reviews = await table(harness, 'reviews');
    const [queue] = await table(harness, 'review_publication_queue');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      business_id: businessId,
      order_id: null,
      invitation_id: null,
      author_masked_contact: null,
      author_name: 'Contenido automatizado',
      verification_level: 'unverified_experience',
      content_origin: 'automated',
      publication_key: queued.publication_key,
      rating: 4,
      status: 'published',
      title: queued.title,
      body: queued.body,
    });
    expect(Number(reviews[0].score_weight)).toBe(0.35);
    expect(new Date(reviews[0].created_at as string).toISOString()).toBe(NOW.toISOString());
    expect(new Date(reviews[0].updated_at as string).toISOString()).toBe(NOW.toISOString());
    expect(queue).toMatchObject({ status: 'published', published_review_id: reviews[0].id });
    expect(new Date(queue.published_at as string).toISOString()).toBe(NOW.toISOString());
    expect(published.published).toEqual([expect.objectContaining({
      queueId: queued.id,
      businessId,
      publicationKey: queued.publication_key,
      reviewId: reviews[0].id,
    })]);
    expect(published.failed).toEqual([]);
    expect(resultText(published)).not.toContain('BODY_TOKEN_9f3a');
    expect(resultText(published)).not.toContain('TITLE_TOKEN_9f3a');
    expect(resultText(published)).not.toContain('EXCERPT_TOKEN_9f3a');
    expect(resultText(published)).not.toContain('PRODUCT_TOKEN_9f3a');
    expect(await table(harness, 'orders')).toEqual([]);
    expect(await table(harness, 'invitations')).toEqual([]);
    expect(harness.sqlLog.join('\n')).toMatch(/for\s+update\s+skip\s+locked/i);
  });

  it('treats publish_after equal to now as due and a later instant as not due', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const due = await seedQueue(harness, queueInput(businessId, 1, { publish_after: NOW }));
    const later = await seedQueue(harness, queueInput(businessId, 2, {
      publish_after: new Date(NOW.getTime() + 1),
      updated_at: new Date('2019-12-01T00:00:00.000Z'),
    }));
    await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    const rows = await table(harness, 'review_publication_queue');
    expect(rows.find((row) => row.id === due.id)?.status).toBe('published');
    expect(rows.find((row) => row.id === later.id)).toMatchObject({
      status: 'queued',
      updated_at: new Date('2019-12-01T00:00:00.000Z'),
    });
    expect(await table(harness, 'reviews')).toHaveLength(1);
  });

  it('does not publish claimed or failed rows', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    await seedQueue(harness, queueInput(businessId, 1, { status: 'claimed' }));
    await seedQueue(harness, queueInput(businessId, 2, { status: 'failed', last_error: 'publication_failed: earlier' }));
    const published = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    expect(published.published).toEqual([]);
    expect(await table(harness, 'reviews')).toEqual([]);
    expect((await table(harness, 'review_publication_queue')).map((row) => row.status).sort()).toEqual(['claimed', 'failed']);
  });

  it('dry-run returns the bounded due rows and writes nothing', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const queued = [];
    for (let index = 1; index <= 5; index += 1) queued.push(await seedQueue(harness, queueInput(businessId, index)));
    const before = JSON.stringify(await table(harness, 'review_publication_queue'));
    harness.sqlLog.length = 0;
    const result = await publishDueReviews({ pool: harness.pool, now: NOW, dryRun: true, batchLimit: 2 });
    expect(result.due.map((row) => row.queueId)).toEqual([queued[0].id, queued[1].id]);
    expect(result.published).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(resultText(result)).not.toContain('BODY_TOKEN_9f3a');
    expect(JSON.stringify(await table(harness, 'review_publication_queue'))).toBe(before);
    expect(await table(harness, 'reviews')).toEqual([]);
    expect(await table(harness, 'audit_logs')).toEqual([]);
    expect(harness.sqlLog.join('\n')).not.toMatch(/\b(insert|update|delete|for\s+update)\b/i);
    expect(harness.sqlLog.join('\n')).not.toMatch(/pg_advisory/i);
    expect(harness.sqlLog.some((sql) => /^\s*select\b/i.test(sql))).toBe(true);
  });

  it('publishes only the earliest eligible row, defaults to one, and caps a dry-run at 10', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const queued = [];
    for (let index = 1; index <= 5; index += 1) queued.push(await seedQueue(harness, queueInput(businessId, index)));
    const first = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 2 });
    expect(first.due.map((row) => row.queueId)).toEqual([queued[0].id, queued[1].id]);
    expect(first.published.map((row) => row.queueId)).toEqual([queued[0].id]);
    expect((await table(harness, 'review_publication_queue')).filter((row) => row.status === 'queued')).toHaveLength(4);
    const immediate = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 2 });
    expect(immediate.published).toEqual([]);
    expect(harness.sqlLog.join('\n')).toMatch(/pg_advisory_xact_lock/i);

    const wider = createPublicationHarness();
    const widerBusiness = await seedBusiness(wider);
    const many = [];
    for (let index = 1; index <= 12; index += 1) many.push(await seedQueue(wider, queueInput(widerBusiness, index)));
    const preview = await publishDueReviews({ pool: wider.pool, now: NOW, dryRun: true });
    expect(preview.due.map((row) => row.queueId)).toEqual([many[0].id]);
    const capped = await publishDueReviews({ pool: wider.pool, now: NOW, dryRun: true, batchLimit: 50 });
    expect(capped.due).toHaveLength(10);
    expect(capped.due[0].queueId).toBe(many[0].id);
    const second = await publishDueReviews({ pool: wider.pool, now: NOW, batchLimit: 10 });
    expect(second.published.map((row) => row.queueId)).toEqual([many[0].id]);
    expect((await table(wider, 'review_publication_queue')).filter((row) => row.status === 'queued')).toHaveLength(11);
  });

  it('publishes nothing for an explicit empty batch and rejects a negative batch without writing', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    await seedQueue(harness, queueInput(businessId, 1));
    const empty = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 0 });
    expect(empty.published).toEqual([]);
    expect(await table(harness, 'reviews')).toEqual([]);
    await expect(publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: -1 })).rejects.toThrow(/batch/i);
    expect((await table(harness, 'review_publication_queue'))[0].status).toBe('queued');
  });

  it('links an existing publication key without inserting a second review or changing its timestamps', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const created = new Date('2019-01-01T00:00:00.000Z');
    const updated = new Date('2019-01-02T00:00:00.000Z');
    const review = await harness.pool.query(
      `INSERT INTO reviews (
        business_id, rating, title, body, author_name, verification_level, score_weight,
        content_origin, publication_key, status, created_at, updated_at
      ) VALUES ($1, 4, $2, $3, 'Contenido automatizado', 'unverified_experience', 0.35, 'automated', $4, 'published', $5, $6)
      RETURNING id`,
      [businessId, TITLE, BODY, 'retry-key', created, updated],
    );
    const queued = await seedQueue(harness, queueInput(businessId, 7, { publication_key: 'retry-key', dedup_key: 'retry-key' }));
    const result = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    const reviews = await table(harness, 'reviews');
    expect(reviews).toHaveLength(1);
    expect(new Date(reviews[0].created_at as string).toISOString()).toBe(created.toISOString());
    expect(new Date(reviews[0].updated_at as string).toISOString()).toBe(updated.toISOString());
    expect(result.published).toEqual([expect.objectContaining({
      queueId: queued.id,
      businessId,
      publicationKey: 'retry-key',
      reviewId: review.rows[0].id,
    })]);
    expect((await table(harness, 'review_publication_queue'))[0]).toMatchObject({
      status: 'published',
      published_review_id: review.rows[0].id,
    });
  });

  it('publishes one row when two workers run together', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const queued = await seedQueue(harness, queueInput(businessId, 1));
    const [first, second] = await Promise.all([
      publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 }),
      publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 }),
    ]);
    const reviews = await table(harness, 'reviews');
    expect(reviews).toHaveLength(1);
    expect((await table(harness, 'review_publication_queue'))[0].status).toBe('published');
    expect([...first.failed, ...second.failed]).toEqual([]);
    expect([...first.published, ...second.published]).toEqual([expect.objectContaining({
      queueId: queued.id,
      businessId,
      publicationKey: queued.publication_key,
      reviewId: reviews[0].id,
    })]);
  });

  it('rolls back a failed insert, records a sanitized retry, and still publishes the sibling', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const bad = await seedQueue(harness, queueInput(businessId, 1, { title: TITLE, body: BODY }));
    const good = await seedQueue(harness, queueInput(businessId, 2, { rating: 4 }));
    const pool = {
      query: harness.pool.query.bind(harness.pool),
      connect: async () => {
        const client = await harness.pool.connect();
        return {
          release: () => client.release(),
          query: async (sql: string, params?: unknown[]) => {
            if (/insert\s+into\s+reviews\b/i.test(sql) && params?.includes(bad.publication_key)) {
              throw new Error(`forced ${BODY} ${TITLE}`);
            }
            return client.query(sql, params);
          },
        };
      },
    };
    const result = await publishDueReviews({ pool, now: NOW, batchLimit: 5 });
    const reviews = await table(harness, 'reviews');
    const rows = await table(harness, 'review_publication_queue');
    const failed = rows.find((row) => row.id === bad.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].publication_key).toBe(good.publication_key);
    expect(failed).toMatchObject({ status: 'queued', attempt_count: 1, published_review_id: null, last_error: 'publication_failed:retryable' });
    expect(new Date(failed?.publish_after as string).getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 60 * 60 * 1000);
    expect(String(failed?.last_error)).not.toContain('BODY_TOKEN_9f3a');
    expect(String(failed?.last_error)).not.toContain('TITLE_TOKEN_9f3a');
    expect(String(failed?.last_error).length).toBeLessThanOrEqual(240);
    expect(result.failed).toEqual([expect.objectContaining({
      queueId: bad.id,
      businessId,
      publicationKey: bad.publication_key,
      error: 'publication_failed:retryable',
    })]);
    expect(result.published.map((row) => row.queueId)).toEqual([good.id]);
    expect(resultText(result)).not.toContain('BODY_TOKEN_9f3a');
    const again = await publishDueReviews({ pool, now: NOW, batchLimit: 5 });
    expect(again.published).toEqual([]);
    expect(again.failed).toEqual([]);
    expect((await table(harness, 'review_publication_queue')).find((row) => row.id === bad.id)?.status).toBe('queued');
  });

  it('writes safe audit metadata and does not change a pre-existing review', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const humanCreated = new Date('2018-05-01T00:00:00.000Z');
    const humanUpdated = new Date('2018-05-02T00:00:00.000Z');
    await harness.pool.query(
      `INSERT INTO reviews (
        business_id, rating, title, body, author_name, author_masked_contact, verification_level,
        score_weight, status, created_at, updated_at
      ) VALUES ($1, 5, 'Opinión humana', 'Texto humano previo', 'Ana Previa', 'a***a@example.com',
        'confirmed_payment', 1, 'published', $2, $3)`,
      [businessId, humanCreated, humanUpdated],
    );
    const queued = await seedQueue(harness, queueInput(businessId, 3));
    await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    const reviews = await table(harness, 'reviews');
    const human = reviews.find((row) => row.author_name === 'Ana Previa');
    expect(human).toMatchObject({
      author_masked_contact: 'a***a@example.com',
      score_weight: 1,
      created_at: humanCreated,
      updated_at: humanUpdated,
      order_id: null,
      invitation_id: null,
    });
    const audits = await table(harness, 'audit_logs');
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('review.automated_published');
    expect(String(audits[0].actor) === 'system' || String(audits[0].actor).startsWith('system')).toBe(true);
    expect(audits[0].details).toMatchObject({
      queue_id: queued.id,
      review_id: reviews.find((row) => row.publication_key === queued.publication_key)?.id,
    });
    const auditText = resultText(audits);
    expect(auditText).not.toContain('BODY_TOKEN_9f3a');
    expect(auditText).not.toContain('TITLE_TOKEN_9f3a');
    expect(auditText).not.toContain('EXCERPT_TOKEN_9f3a');
    expect(auditText).not.toContain('PRODUCT_TOKEN_9f3a');
  });

  it('enforces a 6 hour global gap and an 18 hour brand gap before another publication', async () => {
    const harness = createPublicationHarness();
    const barri = await seedBusiness(harness, 'barri');
    const gogym = await seedBusiness(harness, 'gogym');
    const first = await seedQueue(harness, queueInput(barri, 1));
    const same = await seedQueue(harness, queueInput(barri, 2, { publish_after: new Date(NOW.getTime() - 50_000) }));
    const other = await seedQueue(harness, queueInput(gogym, 3, { publish_after: new Date(NOW.getTime() - 40_000) }));
    const published = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    expect(published.published.map((row) => row.queueId)).toEqual([first.id]);

    const burst = await publishDueReviews({ pool: harness.pool, now: new Date(NOW.getTime() + 6 * 60 * 60 * 1000 - 1), batchLimit: 5 });
    expect(burst.published).toEqual([]);
    const nextBrand = await publishDueReviews({ pool: harness.pool, now: new Date(NOW.getTime() + 6 * 60 * 60 * 1000), batchLimit: 5 });
    expect(nextBrand.published.map((row) => row.queueId)).toEqual([other.id]);
    expect((await table(harness, 'review_publication_queue')).find((row) => row.id === same.id)?.status).toBe('queued');

    const sameTooSoon = await publishDueReviews({ pool: harness.pool, now: new Date(NOW.getTime() + 18 * 60 * 60 * 1000 - 1), batchLimit: 5 });
    expect(sameTooSoon.published).toEqual([]);
    const sameBrand = await publishDueReviews({ pool: harness.pool, now: new Date(NOW.getTime() + 18 * 60 * 60 * 1000), batchLimit: 1 });
    expect(sameBrand.published.map((row) => row.queueId)).toEqual([same.id]);
  });

  it('does not look past an explicit batch when the earliest row is brand-blocked', async () => {
    const harness = createPublicationHarness();
    const barri = await seedBusiness(harness, 'barri');
    const gogym = await seedBusiness(harness, 'gogym');
    await seedQueue(harness, queueInput(barri, 1, {
      status: 'published',
      published_at: new Date(NOW.getTime() - 10 * 60 * 60 * 1000),
    }));
    const blocked = await seedQueue(harness, queueInput(barri, 2));
    const later = await seedQueue(harness, queueInput(gogym, 3));
    const limited = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 1 });
    expect(limited.due.map((row) => row.queueId)).toEqual([blocked.id]);
    expect(limited.published).toEqual([]);
    expect((await table(harness, 'review_publication_queue')).find((row) => row.id === later.id)?.status).toBe('queued');
    const withinBatch = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 2 });
    expect(withinBatch.published.map((row) => row.queueId)).toEqual([later.id]);
  });

  it('exhausts a failed row after three attempts without inserting a review', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const bad = await seedQueue(harness, queueInput(businessId, 1));
    const pool = {
      query: harness.pool.query.bind(harness.pool),
      connect: async () => {
        const client = await harness.pool.connect();
        return {
          release: () => client.release(),
          query: async (sql: string, params?: unknown[]) => {
            if (/insert\s+into\s+reviews\b/i.test(sql)) throw new Error(`forced ${BODY}`);
            return client.query(sql, params);
          },
        };
      },
    };
    let when = NOW;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await publishDueReviews({ pool, now: when, batchLimit: 1 });
      expect(result.published).toEqual([]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error.startsWith('publication_failed')).toBe(true);
      expect(result.failed[0].error).not.toContain('BODY_TOKEN_9f3a');
      when = new Date(when.getTime() + 60 * 60 * 1000);
    }
    expect((await table(harness, 'review_publication_queue')).find((row) => row.id === bad.id)).toMatchObject({
      status: 'failed',
      attempt_count: 3,
      last_error: 'publication_failed:exhausted',
    });
    expect(await table(harness, 'reviews')).toEqual([]);
    const later = await publishDueReviews({ pool, now: when, batchLimit: 1 });
    expect(later.published).toEqual([]);
    expect(later.failed).toEqual([]);
  });

  it('fails stale evidence without publishing it and still publishes fresh evidence', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const staleAt = new Date(NOW.getTime() - PUBLICATION_EVIDENCE_MAX_AGE_MS - 1);
    const stale = await seedQueue(harness, queueInput(businessId, 1, { humanized_at: staleAt }));
    const fresh = await seedQueue(harness, queueInput(businessId, 2));
    const result = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 5 });
    expect(result.failed).toEqual([expect.objectContaining({ queueId: stale.id, error: 'publication_failed:stale_evidence' })]);
    expect(result.published.map((row) => row.queueId)).toEqual([fresh.id]);
    expect(resultText(result)).not.toContain('BODY_TOKEN_9f3a');
    expect((await table(harness, 'review_publication_queue')).find((row) => row.id === stale.id)).toMatchObject({
      status: 'failed',
      last_error: 'publication_failed:stale_evidence',
    });

    const boundary = createPublicationHarness();
    const boundaryBusiness = await seedBusiness(boundary);
    const exactAt = new Date(NOW.getTime() - PUBLICATION_EVIDENCE_MAX_AGE_MS);
    const exact = await seedQueue(boundary, queueInput(boundaryBusiness, 1, {
      humanized_at: exactAt,
      source_facts: [{ url: 'https://barri.mx/hecho', claim: 'entrega', source_excerpt: EXCERPT, checked_at: exactAt.toISOString() }],
    }));
    await expect(publishDueReviews({ pool: boundary.pool, now: NOW, batchLimit: 1 })).resolves.toEqual(expect.objectContaining({
      published: [expect.objectContaining({ queueId: exact.id })],
      failed: [],
    }));

    const facts = createPublicationHarness();
    const factsBusiness = await seedBusiness(facts);
    const oldFact = await seedQueue(facts, queueInput(factsBusiness, 1, {
      source_facts: [{ url: 'https://barri.mx/hecho', claim: 'entrega', source_excerpt: EXCERPT, checked_at: staleAt.toISOString() }],
    }));
    const factResult = await publishDueReviews({ pool: facts.pool, now: NOW, batchLimit: 1 });
    expect(factResult.published).toEqual([]);
    expect(factResult.failed).toEqual([expect.objectContaining({ queueId: oldFact.id, error: 'publication_failed:stale_evidence' })]);
  });

  it('rejects missing or malformed evidence instead of publishing it', async () => {
    const harness = createPublicationHarness();
    const businessId = await seedBusiness(harness);
    const missing = await seedQueue(harness, queueInput(businessId, 1, { source_facts: [] }));
    const malformed = await seedQueue(harness, queueInput(businessId, 2, { source_facts: ['not-json'] }));

    const result = await publishDueReviews({ pool: harness.pool, now: NOW, batchLimit: 2 });

    expect(result.published).toEqual([]);
    expect(result.failed.map((row) => row.queueId)).toEqual([missing.id, malformed.id]);
    expect(result.failed.every((row) => row.error === 'publication_failed:stale_evidence')).toBe(true);
  });
});
