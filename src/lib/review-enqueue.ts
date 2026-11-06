import type { ReviewBrandConfig } from './review-brands';
import { assertNotDuplicate, contentDedupKey, validateGenerationInput } from './review-generation';
import { schedulePublication } from './review-scheduling';

const GLOBAL_CAP = 24;
const BRAND_CAP = 4;
const LOCK_KEY = 8_422_026;

export function controlledPublicationEnabled(value: string | undefined): boolean {
  return value === '1';
}

export interface ReviewQueryResult {
  rows: Array<Record<string, unknown>>;
  rowCount?: number | null;
}

export interface ReviewQueryable {
  query(sql: string, params?: unknown[]): Promise<ReviewQueryResult>;
}

export interface GeneratedEnqueueInput {
  business_id: number;
  business_slug: string;
  brand: ReviewBrandConfig;
  rating: number;
  title: string;
  body: string;
  product_name: string | null;
  verification_level: string;
  content_origin: string;
  source_facts: unknown;
  generation_run_id: string;
  humanized_at: string;
}

export interface EnqueueGeneratedReviewArgs {
  client: ReviewQueryable;
  input: GeneratedEnqueueInput;
  now?: Date;
  random?: () => number;
  publishAfter?: Date;
}

export interface EnqueuedReview {
  id: number;
  businessId: number;
  publishAfter: string;
  dedupKey: string;
  publicationKey: string;
}

export interface QueueCapacity {
  globalRemaining: number;
  perBrandRemaining: Record<string, number>;
}

type EnqueueCode = 'global_cap' | 'brand_cap' | 'duplicate' | 'rating_diversity';

function enqueueError(code: EnqueueCode): Error {
  return Object.assign(new Error(code), { code });
}

function rowNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(`missing ${key}`);
  return parsed;
}



function readDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export async function queueCapacity(client: ReviewQueryable): Promise<QueueCapacity> {
  const active = await client.query(
    `SELECT business_id FROM review_publication_queue WHERE status IN ('queued', 'claimed')`,
  );
  const used: Record<string, number> = {};
  for (const row of active.rows) {
    const id = String(row.business_id);
    used[id] = (used[id] ?? 0) + 1;
  }
  const perBrandRemaining: Record<string, number> = {};
  for (const [id, count] of Object.entries(used)) {
    perBrandRemaining[id] = Math.max(0, BRAND_CAP - count);
  }
  return {
    globalRemaining: Math.max(0, GLOBAL_CAP - active.rows.length),
    perBrandRemaining,
  };
}

export async function enqueueGeneratedReview(args: EnqueueGeneratedReviewArgs): Promise<EnqueuedReview> {
  const input = args.input;
  const now = args.now ?? new Date();
  const accepted = validateGenerationInput({
    verification_level: input.verification_level,
    content_origin: input.content_origin,
    humanized_at: input.humanized_at,
    rating: input.rating,
    title: input.title,
    body: input.body,
    product_name: input.product_name,
    facts: input.source_facts,
  }, input.brand);

  const client = args.client;
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [LOCK_KEY]);
    const active = await client.query(
      `SELECT business_id FROM review_publication_queue WHERE status IN ('queued', 'claimed')`,
    );
    if (active.rows.length >= GLOBAL_CAP) throw enqueueError('global_cap');
    const brandActive = active.rows.filter((row) => rowNumber(row, 'business_id') === input.business_id).length;
    if (brandActive >= BRAND_CAP) throw enqueueError('brand_cap');

    const key = contentDedupKey(input.business_slug, accepted.title, accepted.body);
    const brandRows = await client.query(
      `SELECT dedup_key, body, rating, created_at, id
       FROM review_publication_queue
       WHERE business_id = $1 AND status <> 'failed'
       ORDER BY created_at DESC, id DESC`,
      [input.business_id],
    );
    const reviews = await client.query(
      `SELECT body, publication_key FROM reviews WHERE business_id = $1 AND status = 'published'`,
      [input.business_id],
    );
    if (brandRows.rows.some((row) => row.dedup_key === key) || reviews.rows.some((row) => row.publication_key === key)) {
      throw enqueueError('duplicate');
    }
    const recentBodies: string[] = [];
    for (const row of [...brandRows.rows, ...reviews.rows]) {
      if (typeof row.body === 'string') recentBodies.push(row.body);
    }
    try {
      assertNotDuplicate({ body: accepted.body, recentBodies });
    } catch {
      throw enqueueError('duplicate');
    }
    const newest = brandRows.rows.slice(0, 2);
    if (newest.length === 2 && newest.every((row) => Number(row.rating) === accepted.rating)) {
      throw enqueueError('rating_diversity');
    }

    let publishAfter = args.publishAfter;
    if (!publishAfter) {
      const brandAnchor = await client.query(
        `SELECT max(publish_after) AS publish_after FROM review_publication_queue WHERE business_id = $1 AND status <> 'failed'`,
        [input.business_id],
      );
      const globalAnchor = await client.query(
        `SELECT max(publish_after) AS publish_after FROM review_publication_queue WHERE status <> 'failed'`,
      );
      publishAfter = schedulePublication({
        now,
        brand: input.brand,
        latestBrandPublishAfter: readDate(brandAnchor.rows[0]?.publish_after),
        latestGlobalPublishAfter: readDate(globalAnchor.rows[0]?.publish_after),
        random: args.random ?? Math.random,
      });
    }

    const inserted = await client.query(
      `INSERT INTO review_publication_queue (
        business_id, dedup_key, publication_key, rating, title, body, product_name,
        verification_level, content_origin, source_facts, generation_run_id, humanized_at,
        publish_after, status, attempt_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10::jsonb, $11, $12,
        $13, 'queued', 0
      ) RETURNING id, publish_after`,
      [
        input.business_id,
        key,
        key,
        accepted.rating,
        accepted.title,
        accepted.body,
        accepted.product_name,
        accepted.verification_level,
        accepted.content_origin,
        JSON.stringify(accepted.facts),
        input.generation_run_id,
        accepted.humanized_at,
        publishAfter,
      ],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error('enqueue did not return a queue row');
    await client.query('COMMIT');
    return {
      id: rowNumber(row, 'id'),
      businessId: input.business_id,
      publishAfter: readDate(row.publish_after)?.toISOString() ?? publishAfter.toISOString(),
      dedupKey: key,
      publicationKey: key,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
