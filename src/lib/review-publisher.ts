import { PUBLICATION_EVIDENCE_MAX_AGE_MS } from './review-generation';

const DEFAULT_BATCH = 1;
const MAX_BATCH = 10;
const AUTHOR = 'Contenido automatizado';
const PUBLISH_LOCK = 8_422_027;
const GLOBAL_GAP_MS = 6 * 60 * 60 * 1000;
const BRAND_GAP_MS = 18 * 60 * 60 * 1000;
const RETRY_BACKOFF_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const RETRYABLE = 'publication_failed:retryable';
const EXHAUSTED = 'publication_failed:exhausted';
const STALE_ERROR = 'publication_failed:stale_evidence';

interface QueryResult {
  rows: Array<Record<string, unknown>>;
  rowCount?: number | null;
}

interface Queryable {
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
}

interface Connected extends Queryable {
  release(): void;
}

interface QueryPool extends Queryable {
  connect(): Promise<Connected>;
}

export interface DueQueueItem {
  queueId: number;
  businessId: number;
  publicationKey: string;
}

export interface PublishedQueueItem extends DueQueueItem {
  reviewId: number;
}

export interface FailedQueueItem extends DueQueueItem {
  error: string;
}

export interface PublishDueResult {
  due: DueQueueItem[];
  published: PublishedQueueItem[];
  failed: FailedQueueItem[];
}

export interface PublishDueArgs {
  pool: QueryPool;
  now?: Date;
  dryRun?: boolean;
  batchLimit?: number;
}

interface ClaimedRow {
  id: number;
  businessId: number;
  publicationKey: string;
  rating: number;
  title: string | null;
  body: string;
  productName: string | null;
}

function resolveBatchLimit(value: number | undefined): number {
  if (value == null) return DEFAULT_BATCH;
  if (!Number.isInteger(value) || value < 0) throw new Error('batch limit must be a non-negative integer');
  return Math.min(value, MAX_BATCH);
}

function rowNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(EXHAUSTED);
  return parsed;
}

function rowText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
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

function parseFacts(value: unknown): Array<Record<string, unknown>> | null {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

function evidenceStale(humanizedAt: unknown, sourceFacts: unknown, now: Date): boolean {
  const humanized = readDate(humanizedAt);
  if (!humanized) return true;
  if (now.getTime() - humanized.getTime() > PUBLICATION_EVIDENCE_MAX_AGE_MS) return true;
  const facts = parseFacts(sourceFacts);
  if (!facts || facts.length === 0) return true;
  return facts.some((fact) => {
    const checked = readDate(fact.checked_at);
    if (!checked) return true;
    return now.getTime() - checked.getTime() > PUBLICATION_EVIDENCE_MAX_AGE_MS;
  });
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function toDue(row: Record<string, unknown>): DueQueueItem {
  return {
    queueId: rowNumber(row, 'id'),
    businessId: rowNumber(row, 'business_id'),
    publicationKey: rowText(row.publication_key) ?? '',
  };
}

function claimedFrom(row: Record<string, unknown>): ClaimedRow {
  const body = rowText(row.body);
  if (body == null) throw new Error(EXHAUSTED);
  return {
    id: rowNumber(row, 'id'),
    businessId: rowNumber(row, 'business_id'),
    publicationKey: rowText(row.publication_key) ?? '',
    rating: rowNumber(row, 'rating'),
    title: rowText(row.title),
    body,
    productName: rowText(row.product_name),
  };
}

function failedItem(claimed: Pick<ClaimedRow, 'id' | 'businessId' | 'publicationKey'>, error: string): FailedQueueItem {
  return {
    queueId: claimed.id,
    businessId: claimed.businessId,
    publicationKey: claimed.publicationKey,
    error,
  };
}

async function rollback(client: Queryable): Promise<void> {
  await client.query('ROLLBACK').catch(() => undefined);
}

async function spacingAllows(client: Queryable, businessId: number, now: Date): Promise<boolean> {
  const global = await client.query(
    `SELECT max(published_at) AS published_at FROM review_publication_queue WHERE status = 'published'`,
  );
  const globalLast = readDate(global.rows[0]?.published_at);
  if (globalLast && now.getTime() - globalLast.getTime() < GLOBAL_GAP_MS) return false;
  const brand = await client.query(
    `SELECT max(published_at) AS published_at
     FROM review_publication_queue
     WHERE status = 'published' AND business_id = $1`,
    [businessId],
  );
  const brandLast = readDate(brand.rows[0]?.published_at);
  return !(brandLast && now.getTime() - brandLast.getTime() < BRAND_GAP_MS);
}

const DUE_SQL = `SELECT id, business_id, publication_key
  FROM review_publication_queue
  WHERE status = 'queued' AND publish_after <= $1
  ORDER BY publish_after ASC, id ASC
  LIMIT $2`;

async function markFailed(pool: QueryPool, queueId: number, now: Date): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [PUBLISH_LOCK]);
    const current = await client.query(
      `SELECT attempt_count FROM review_publication_queue
       WHERE id = $1 AND status = 'queued'
       FOR UPDATE`,
      [queueId],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return EXHAUSTED;
    }
    const attempts = rowNumber(row, 'attempt_count') + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    const errorText = exhausted ? EXHAUSTED : RETRYABLE;
    if (exhausted) {
      await client.query(
        `UPDATE review_publication_queue
         SET status = 'failed', last_error = $2, attempt_count = $3, updated_at = $4
         WHERE id = $1 AND status = 'queued'`,
        [queueId, errorText, attempts, now],
      );
    } else {
      await client.query(
        `UPDATE review_publication_queue
         SET status = 'queued', last_error = $2, attempt_count = $3, publish_after = $4, updated_at = $5, claimed_at = $6
         WHERE id = $1 AND status = 'queued'`,
        [queueId, errorText, attempts, new Date(now.getTime() + RETRY_BACKOFF_MS), now, null],
      );
    }
    await client.query('COMMIT');
    return errorText;
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

async function finishPublished(
  client: Queryable,
  claimed: ClaimedRow,
  reviewId: number,
  now: Date,
): Promise<void> {
  await client.query(
    `UPDATE review_publication_queue
     SET status = 'published', published_at = $2, published_review_id = $3, updated_at = $2
     WHERE id = $1`,
    [claimed.id, now, reviewId],
  );
  await client.query(
    `INSERT INTO audit_logs (business_id, actor, action, details)
     VALUES ($1, 'system', 'review.automated_published', $2::jsonb)`,
    [claimed.businessId, JSON.stringify({ queue_id: claimed.id, review_id: reviewId })],
  );
  await client.query('COMMIT');
}

async function insertReview(client: Queryable, claimed: ClaimedRow, now: Date): Promise<number> {
  const inserted = await client.query(
    `INSERT INTO reviews (
      business_id, order_id, invitation_id, author_masked_contact, author_name,
      rating, title, body, product_name, verification_level, content_origin,
      publication_key, score_weight, status, created_at, updated_at
    ) VALUES (
      $1, NULL, NULL, NULL, $2,
      $3, $4, $5, $6, 'unverified_experience', 'automated',
      $7, 0.35, 'published', $8, $8
    ) RETURNING id`,
    [claimed.businessId, AUTHOR, claimed.rating, claimed.title, claimed.body, claimed.productName, claimed.publicationKey, now],
  );
  const row = inserted.rows[0];
  if (!row) throw new Error(EXHAUSTED);
  return rowNumber(row, 'id');
}

async function publishOne(pool: QueryPool, queueId: number, now: Date): Promise<PublishedQueueItem | FailedQueueItem | null> {
  const client = await pool.connect();
  let claimed: ClaimedRow | null = null;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [PUBLISH_LOCK]);
    const locked = await client.query(
      `SELECT id, business_id, publication_key, rating, title, body, product_name, humanized_at, source_facts
       FROM review_publication_queue
       WHERE id = $1 AND status = 'queued' AND publish_after <= $2
       FOR UPDATE SKIP LOCKED`,
      [queueId, now],
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return null;
    }
    const identity = {
      id: rowNumber(row, 'id'),
      businessId: rowNumber(row, 'business_id'),
      publicationKey: rowText(row.publication_key) ?? '',
    };
    if (evidenceStale(row.humanized_at, row.source_facts, now)) {
      await client.query(
        `UPDATE review_publication_queue
         SET status = 'failed', last_error = $2, attempt_count = attempt_count + 1, updated_at = $3
         WHERE id = $1`,
        [identity.id, STALE_ERROR, now],
      );
      await client.query('COMMIT');
      return failedItem(identity, STALE_ERROR);
    }
    if (!(await spacingAllows(client, identity.businessId, now))) {
      await client.query('COMMIT');
      return null;
    }
    claimed = claimedFrom(row);
    await client.query(
      `UPDATE review_publication_queue
       SET status = 'claimed', claimed_at = $2, attempt_count = attempt_count + 1, updated_at = $2
       WHERE id = $1`,
      [claimed.id, now],
    );
    const existing = await client.query(
      `SELECT id FROM reviews WHERE publication_key = $1 LIMIT 1`,
      [claimed.publicationKey],
    );
    const existingId = existing.rows[0] ? rowNumber(existing.rows[0], 'id') : null;
    const reviewId = existingId ?? await insertReview(client, claimed, now);
    await finishPublished(client, claimed, reviewId, now);
    return {
      queueId: claimed.id,
      businessId: claimed.businessId,
      publicationKey: claimed.publicationKey,
      reviewId,
    };
  } catch (error) {
    await rollback(client);
    if (errorCode(error) === '23505' && claimed) {
      return linkAfterConflict(pool, claimed, now);
    }
    if (!claimed) throw error;
    const errorText = await markFailed(pool, claimed.id, now);
    return failedItem(claimed, errorText);
  } finally {
    client.release();
  }
}

async function linkAfterConflict(pool: QueryPool, claimed: ClaimedRow, now: Date): Promise<PublishedQueueItem | FailedQueueItem> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [PUBLISH_LOCK]);
    const locked = await client.query(
      `SELECT id FROM review_publication_queue
       WHERE id = $1 AND status = 'queued'
       FOR UPDATE SKIP LOCKED`,
      [claimed.id],
    );
    if (!locked.rows[0]) {
      await client.query('COMMIT');
      return failedItem(claimed, EXHAUSTED);
    }
    const existing = await client.query(
      `SELECT id FROM reviews WHERE publication_key = $1 LIMIT 1`,
      [claimed.publicationKey],
    );
    const review = existing.rows[0];
    if (!review) {
      await client.query('COMMIT');
      const errorText = await markFailed(pool, claimed.id, now);
      return failedItem(claimed, errorText);
    }
    const reviewId = rowNumber(review, 'id');
    await finishPublished(client, claimed, reviewId, now);
    return {
      queueId: claimed.id,
      businessId: claimed.businessId,
      publicationKey: claimed.publicationKey,
      reviewId,
    };
  } catch {
    await rollback(client);
    const errorText = await markFailed(pool, claimed.id, now).catch(() => EXHAUSTED);
    return failedItem(claimed, errorText);
  } finally {
    client.release();
  }
}

export async function publishDueReviews(args: PublishDueArgs): Promise<PublishDueResult> {
  const now = args.now ?? new Date();
  const batchLimit = resolveBatchLimit(args.batchLimit);
  if (batchLimit === 0) return { due: [], published: [], failed: [] };
  const selected = await args.pool.query(DUE_SQL, [now, batchLimit]);
  const due = selected.rows.map(toDue);
  if (args.dryRun) return { due, published: [], failed: [] };
  const published: PublishedQueueItem[] = [];
  const failed: FailedQueueItem[] = [];
  for (const item of due) {
    const outcome = await publishOne(args.pool, item.queueId, now);
    if (!outcome) continue;
    if ('reviewId' in outcome) published.push(outcome);
    else failed.push(outcome);
  }
  return { due, published, failed };
}
