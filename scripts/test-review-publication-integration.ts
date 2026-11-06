/**
 * Real PostgreSQL verifier for the generated-review queue. Run on machine 82
 * only after db/migrations/0008_review_publication_queue.sql on a disposable database:
 *
 *   OPINIO_TEST_DATABASE=1 \
 *   DATABASE_URL=postgres://127.0.0.1:5432/opinio_test_review_publication \
 *     /root/.bun/bin/bun scripts/test-review-publication-integration.ts
 *
 * The database name must match opinio_test_* or opinio_issue_*. There is no
 * default URL. Exit 2 refuses before connecting. Exit 1 is an assertion failure.
 * This script never DROP or TRUNCATE, and deletes only businesses it inserted.
 */
import pg from 'pg';
import type { publishDueReviews } from '../src/lib/review-publisher';
import type { enqueueGeneratedReview, queueCapacity } from '../src/lib/review-enqueue';

const AUTHOR = 'Contenido automatizado';
const FORCED_TOKEN = 'FORCED_FAILURE_TOKEN_7c1e';
const BODY = 'BODY_TOKEN_9f3a el pedido de prueba llegó cerrado.';
const TITLE = 'TITLE_TOKEN_9f3a';
const NOW = new Date('2020-01-15T12:00:00.000Z');
const FRESH_AT = new Date('2020-01-14T12:00:00.000Z');
const HOUR_MS = 3_600_000;
const clock = { now: new Date(NOW.getTime()) };

function advance(hours: number): Date {
  clock.now = new Date(clock.now.getTime() + hours * HOUR_MS);
  return clock.now;
}
const QUEUE_COLUMNS = [
  'id', 'business_id', 'dedup_key', 'publication_key', 'rating', 'title', 'body', 'product_name',
  'verification_level', 'content_origin', 'source_facts', 'generation_run_id', 'humanized_at',
  'publish_after', 'status', 'attempt_count', 'last_error', 'claimed_at', 'published_at',
  'published_review_id', 'created_at', 'updated_at',
];

interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}

interface Connected extends Queryable {
  release(): void;
}

interface QueryPool extends Queryable {
  connect(): Promise<Connected>;
}

type Publisher = {
  publishDueReviews: typeof publishDueReviews;
};

type Enqueue = {
  enqueueGeneratedReview: typeof enqueueGeneratedReview;
  queueCapacity: typeof queueCapacity;
};

function refuse(message: string): never {
  console.error(`Refusing to run: ${message}`);
  process.exit(2);
}

function assertDisposableDatabase(): string {
  if (process.env.OPINIO_TEST_DATABASE !== '1') {
    refuse('set OPINIO_TEST_DATABASE=1 to confirm this disposable database. No connection was opened.');
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) refuse('DATABASE_URL is required and has no default. No connection was opened.');
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    refuse('DATABASE_URL is not a valid URL. No connection was opened.');
  }
  const host = parsed.hostname;
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (!/^opinio_(test|issue)_[a-z0-9_]+$/.test(database)) {
    refuse(`database must match opinio_test_* or opinio_issue_*; got host="${host || 'local'}" database="${database || '(empty)'}". No connection was opened.`);
  }
  return databaseUrl;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

function safe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgres://[redacted]');
}

// Dynamic import is required: this guard must reject a production DATABASE_URL
// before the publisher modules load, because they may construct the app pool from it.
async function loadModules() {
  const load = async (specifier: string) => {
    try {
      return await import(specifier);
    } catch (error) {
      if (!specifier.endsWith('.ts')) throw error;
      try {
        return await import(specifier.slice(0, -3));
      } catch {
        throw error;
      }
    }
  };
  const [scheduling, enqueue, publisher] = await Promise.all([
    load('../src/lib/review-scheduling.ts'),
    load('../src/lib/review-enqueue.ts'),
    load('../src/lib/review-publisher.ts'),
  ]);
  return { scheduling, enqueue, publisher };
}

function guarded(pool: pg.Pool): QueryPool {
  const refuseSql = (sql: string) => {
    if (/\b(drop|truncate)\b/i.test(sql)) throw new Error('Refusing to drop or truncate');
  };
  return {
    async query(sql: string, params?: unknown[]) {
      refuseSql(sql);
      return pool.query(sql, params);
    },
    async connect() {
      const client = await pool.connect();
      return {
        query(sql: string, params?: unknown[]) {
          refuseSql(sql);
          return client.query(sql, params);
        },
        release() { client.release(); },
      };
    },
  };
}

function sabotagingPool(pool: pg.Pool) {
  const failInsert = async (run: () => Promise<unknown>, params?: unknown[]) => {
    await run();
    throw new Error(`forced publication failure ${FORCED_TOKEN} ${JSON.stringify(params ?? [])}`);
  };
  return {
    async connect(): Promise<Connected> {
      const client = await pool.connect();
      return {
        query: (sql: string, params?: unknown[]) => {
          if (/\b(drop|truncate)\b/i.test(sql)) throw new Error('Refusing to drop or truncate');
          if (/^\s*insert\s+into\s+reviews\b/i.test(sql)) return failInsert(() => client.query(sql, params), params);
          return client.query(sql, params);
        },
        release: () => client.release(),
      };
    },
    query: (sql: string, params?: unknown[]) => {
      if (/\b(drop|truncate)\b/i.test(sql)) throw new Error('Refusing to drop or truncate');
      if (/^\s*insert\s+into\s+reviews\b/i.test(sql)) return failInsert(() => pool.query(sql, params), params);
      return pool.query(sql, params);
    },
  };
}

async function insertPreservedFixture(db: QueryPool, runId: string): Promise<void> {
  const business = await db.query(
    `INSERT INTO businesses (slug, brand_name, category, domain, created_at, updated_at)
     VALUES ($1, 'Legado preservado', 'Retail DTC', 'opinio-rpub-legacy.test', '2017-01-01T00:00:00.000Z', '2017-01-01T00:00:00.000Z')
     RETURNING id`,
    [`${runId}-legacy`],
  );
  const businessId = Number(business.rows[0]?.id);
  const order = await db.query(
    `INSERT INTO orders (business_id, external_order_id, order_date, delivered_date, created_at)
     VALUES ($1, $2, '2017-01-02T00:00:00.000Z', '2017-01-03T00:00:00.000Z', '2017-01-02T00:00:00.000Z') RETURNING id`,
    [businessId, `${runId}-order`],
  );
  const orderId = Number(order.rows[0]?.id);
  const invitation = await db.query(
    `INSERT INTO invitations (business_id, order_id, token, recipient_target, sent_at, completed_at)
     VALUES ($1, $2, $3, 'legacy@example.invalid', '2017-01-04T00:00:00.000Z', '2017-01-05T00:00:00.000Z') RETURNING id`,
    [businessId, orderId, `${runId}-invitation`],
  );
  const invitationId = Number(invitation.rows[0]?.id);
  await db.query(
    `INSERT INTO reviews (business_id, order_id, invitation_id, rating, body, author_name, created_at, updated_at)
     VALUES ($1, $2, $3, 5, 'Registro histórico que no debe cambiar.', 'Histórico', '2017-01-06T00:00:00.000Z', '2017-01-06T00:00:00.000Z')`,
    [businessId, orderId, invitationId],
  );
}

async function main() {
  const databaseUrl = assertDisposableDatabase();
  const { scheduling, enqueue, publisher } = await loadModules();
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 4,
    application_name: 'opinio-review-publication-test',
    options: '-c statement_timeout=20000',
  });
  const db = guarded(pool);
  const createdBusinessIds: number[] = [];
  const runId = `opinio-rpub-${Date.now()}`;
  try {
    await assertMigration(db);
    await insertPreservedFixture(db, runId);
    const before = await snapshot(db);
    const businessId = await insertBusiness(db, `${runId}-a`, createdBusinessIds);
    const otherId = await insertBusiness(db, `${runId}-b`, createdBusinessIds);
    const brand = {
      slug: `${runId}-a`,
      officialOrigin: 'https://opinio-rpub.test',
      timezone: 'America/Mexico_City',
      windows: [{ startHour: 10, endHour: 19 }],
    };

    await checkPersistedSchedule(db, scheduling, enqueue, createdBusinessIds, `${runId}-schedule`);

    await checkNotDue(db, publisher, businessId, clock.now);
    await checkDueOnce(db, publisher, businessId, clock.now);
    advance(18);
    await checkImmediateRetry(db, publisher, businessId, clock.now);
    advance(18);
    await checkConcurrent(db, publisher, businessId, clock.now);
    advance(18);
    await checkFailure(pool, publisher, businessId, clock.now);
    advance(18);
    await checkCapsAndBatch(db, enqueue, publisher, businessId, otherId, brand, clock.now);
    await checkStaleEvidence(db, publisher, otherId, clock.now);
    await checkDryRun(db, publisher, clock.now);
    await checkProvenance(db, businessId);
    await checkPreservation(db, before, createdBusinessIds);
    console.log('All review publication integration checks passed');
  } catch (error) {
    console.error(safe(error));
    process.exitCode = 1;
  } finally {
    await cleanup(pool, createdBusinessIds);
    await pool.end();
  }
  if (process.exitCode) process.exit(process.exitCode);
}

async function assertMigration(db: Queryable) {
  const table = await db.query(`SELECT to_regclass('public.review_publication_queue') AS name`);
  check(table.rows[0] && (table.rows[0] as { name: string | null }).name, 'migration 0008 not applied: review_publication_queue is missing');
  const columns = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    ['review_publication_queue'],
  );
  const present = new Set(columns.rows.map((row) => String((row as { column_name: string }).column_name)));
  const missing = QUEUE_COLUMNS.filter((column) => !present.has(column));
  check(missing.length === 0, `migration 0008 is missing queue columns: ${missing.join(', ')}`);
  const reviewColumns = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = ANY($1::text[])`,
    [['content_origin', 'publication_key']],
  );
  check(reviewColumns.rows.length === 2, 'migration 0008 not applied: reviews.content_origin or reviews.publication_key is missing');
  for (const [tableName, column] of [['review_publication_queue', 'dedup_key'], ['review_publication_queue', 'publication_key'], ['reviews', 'publication_key']] as const) {
    const unique = await db.query(
      `SELECT 1
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE c.relname = $1 AND a.attname = $2 AND i.indisunique
       LIMIT 1`,
      [tableName, column],
    );
    check(unique.rows.length === 1, `missing unique index on ${tableName}.${column}`);
  }
  console.log('PASS migration 0008 is present');
}

async function snapshot(db: Queryable, excludedBusinessIds: number[] = []) {
  const reviews = await db.query(
    `SELECT md5(coalesce(string_agg(id::text || '|' || created_at::text || '|' || updated_at::text || '|' || author_name || '|' || score_weight::text, ',' ORDER BY id), '')) AS digest, count(*)::int AS n
     FROM reviews WHERE NOT (business_id = ANY($1::int[]))`,
    [excludedBusinessIds],
  );
  const orders = await db.query(`SELECT count(*)::int AS n, md5(coalesce(string_agg(id::text || '|' || created_at::text, ',' ORDER BY id), '')) AS digest FROM orders`);
  const invitations = await db.query(`SELECT count(*)::int AS n, md5(coalesce(string_agg(id::text || '|' || sent_at::text, ',' ORDER BY id), '')) AS digest FROM invitations`);
  const businesses = await db.query(
    `SELECT count(*)::int AS n, md5(coalesce(string_agg(id::text || '|' || updated_at::text, ',' ORDER BY id), '')) AS digest FROM businesses WHERE NOT (id = ANY($1::int[]))`,
    [excludedBusinessIds],
  );
  return { reviews: reviews.rows[0], orders: orders.rows[0], invitations: invitations.rows[0], businesses: businesses.rows[0] };
}

async function insertBusiness(db: Queryable, slug: string, ids: number[]): Promise<number> {
  const inserted = await db.query(
    `INSERT INTO businesses (slug, brand_name, category, domain) VALUES ($1, 'Marca de prueba de publicación', 'Retail DTC', 'opinio-rpub.test') RETURNING id`,
    [slug],
  );
  const id = Number((inserted.rows[0] as { id: number }).id);
  ids.push(id);
  return id;
}

async function insertQueued(
  db: Queryable,
  row: {
    businessId: number;
    key: string;
    rating: number;
    title: string;
    body: string;
    publishAfter: Date;
    productName?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    humanizedAt?: Date;
    sourceFacts?: unknown;
  },
): Promise<number> {
  check(Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5, `fixture rating ${row.rating} is outside 1..5`);
  const humanizedAt = row.humanizedAt ?? FRESH_AT;
  const createdAt = row.createdAt ?? humanizedAt;
  const updatedAt = row.updatedAt ?? createdAt;
  const sourceFacts = row.sourceFacts ?? [{
    url: 'https://opinio-rpub.test/hecho',
    claim: 'entrega publicada',
    source_excerpt: 'La entrega publicada está en el sitio oficial.',
    checked_at: FRESH_AT.toISOString(),
  }];
  const inserted = await db.query(
    `INSERT INTO review_publication_queue (
      business_id, dedup_key, publication_key, rating, title, body, product_name,
      verification_level, content_origin, source_facts, humanized_at, publish_after, status,
      created_at, updated_at
    ) VALUES (
      $1, $2, $2, $3, $4, $5, $6,
      'unverified_experience', 'automated', $7::jsonb, $8, $9, 'queued',
      $10, $11
    ) RETURNING id`,
    [
      row.businessId, row.key, row.rating, row.title, row.body, row.productName ?? null,
      JSON.stringify(sourceFacts), humanizedAt, row.publishAfter, createdAt, updatedAt,
    ],
  );
  return Number((inserted.rows[0] as { id: number }).id);
}

async function checkNotDue(db: QueryPool, publisher: Publisher, businessId: number, now: Date) {
  const key = `not-due-${businessId}`;
  const id = await insertQueued(db, {
    businessId,
    key,
    rating: 4,
    title: TITLE,
    body: BODY,
    publishAfter: new Date(now.getTime() + 30 * 86_400_000),
    updatedAt: new Date('2019-12-01T00:00:00.000Z'),
  });
  const result = await publisher.publishDueReviews({ pool: db, now, batchLimit: 5 });
  const after = await db.query(`SELECT status, claimed_at, published_review_id, updated_at FROM review_publication_queue WHERE id = $1`, [id]);
  const row = after.rows[0] as { status: string; claimed_at: Date | null; published_review_id: number | null; updated_at: Date };
  check(row.status === 'queued' && row.claimed_at == null && row.published_review_id == null, 'a future queue row was claimed or published');
  check(new Date(row.updated_at).toISOString() === '2019-12-01T00:00:00.000Z', 'a not-due row changed updated_at');
  check(result.published.length === 0, 'not-due publish returned a published row');
  console.log('PASS not-due row is unchanged');
}

async function checkDueOnce(db: QueryPool, publisher: Publisher, businessId: number, now: Date) {
  const key = `due-once-${businessId}`;
  await insertQueued(db, {
    businessId,
    key,
    rating: 5,
    title: TITLE,
    body: BODY,
    productName: 'Plan de prueba',
    publishAfter: now,
  });
  const first = await publisher.publishDueReviews({ pool: db, now, batchLimit: 5 });
  const second = await publisher.publishDueReviews({ pool: db, now, batchLimit: 5 });
  const reviews = await db.query(`SELECT id FROM reviews WHERE publication_key = $1`, [key]);
  check(reviews.rows.length === 1, `due row published ${reviews.rows.length} reviews`);
  check(first.published.length === 1 && second.published.length === 0, 'immediate second publish was not a no-op');
  console.log('PASS due row publishes exactly once');
}

async function checkImmediateRetry(db: QueryPool, publisher: Publisher, businessId: number, now: Date) {
  const key = `retry-${businessId}`;
  const created = new Date('2018-01-01T00:00:00.000Z');
  const review = await db.query(
    `INSERT INTO reviews (
      business_id, rating, title, body, author_name, verification_level, score_weight, content_origin,
      publication_key, status, created_at, updated_at
    ) VALUES ($1, 4, $2, $3, $4, 'unverified_experience', 0.35, 'automated', $5, 'published', $6, $6) RETURNING id`,
    [businessId, TITLE, BODY, AUTHOR, key, created],
  );
  await insertQueued(db, {
    businessId,
    key,
    rating: 4,
    title: TITLE,
    body: BODY,
    publishAfter: now,
  });
  await publisher.publishDueReviews({ pool: db, now, batchLimit: 5 });
  const reviews = await db.query(`SELECT id, created_at FROM reviews WHERE publication_key = $1`, [key]);
  const queue = await db.query(`SELECT status, published_review_id FROM review_publication_queue WHERE publication_key = $1`, [key]);
  check(reviews.rows.length === 1, 'retry inserted another review');
  check(new Date((reviews.rows[0] as { created_at: Date }).created_at).toISOString() === created.toISOString(), 'retry changed the existing review timestamp');
  check((queue.rows[0] as { status: string }).status === 'published', 'retry did not mark the queue published');
  check((queue.rows[0] as { published_review_id: number }).published_review_id === (review.rows[0] as { id: number }).id, 'retry did not link the existing review');
  console.log('PASS immediate retry is idempotent');
}

async function checkConcurrent(db: QueryPool, publisher: Publisher, businessId: number, now: Date) {
  const key = `concurrent-${businessId}`;
  await insertQueued(db, {
    businessId,
    key,
    rating: 4,
    title: TITLE,
    body: BODY,
    publishAfter: now,
  });
  const [first, second] = await Promise.all([
    publisher.publishDueReviews({ pool: db, now, batchLimit: 5 }),
    publisher.publishDueReviews({ pool: db, now, batchLimit: 5 }),
  ]);
  const reviews = await db.query(`SELECT id FROM reviews WHERE publication_key = $1`, [key]);
  const queue = await db.query(`SELECT status FROM review_publication_queue WHERE publication_key = $1`, [key]);
  check(reviews.rows.length === 1, `concurrent workers published ${reviews.rows.length} reviews`);
  check((queue.rows[0] as { status: string }).status === 'published', 'concurrent publish left the queue unpublished');
  check(first.failed.length + second.failed.length === 0, 'concurrent publish recorded a failure');
  console.log('PASS two workers publish once');
}

async function checkFailure(pool: pg.Pool, publisher: Publisher, businessId: number, now: Date) {
  const key = `fail-${businessId}`;
  await insertQueued(pool, {
    businessId,
    key,
    rating: 4,
    title: TITLE,
    body: BODY,
    publishAfter: now,
  });
  let when = now;
  let result = await publisher.publishDueReviews({ pool: sabotagingPool(pool), now: when, batchLimit: 1 });
  for (let attempt = 1; attempt < 3; attempt += 1) {
    when = new Date(when.getTime() + HOUR_MS);
    result = await publisher.publishDueReviews({ pool: sabotagingPool(pool), now: when, batchLimit: 1 });
  }
  const reviews = await pool.query(`SELECT id FROM reviews WHERE publication_key = $1`, [key]);
  const queue = await pool.query(`SELECT status, last_error, attempt_count FROM review_publication_queue WHERE publication_key = $1`, [key]);
  const row = queue.rows[0] as { status: string; last_error: string; attempt_count: number };
  check(reviews.rows.length === 0, 'failed publish left a review row');
  check(row.status === 'failed', `failed publish left status ${row.status}`);
  check(row.attempt_count === 3, `failed publish recorded ${row.attempt_count} attempts`);
  check(typeof row.last_error === 'string' && row.last_error.startsWith('publication_failed'), 'failed publish did not store publication_failed');
  check(!row.last_error.includes(BODY) && !row.last_error.includes(FORCED_TOKEN), 'failed publish stored raw content or the forced error');
  check(result.failed.length === 1 && !String(result.failed[0].error).includes(BODY), 'failed result leaked review content');
  console.log('PASS failure rolls back and records a sanitized error');
}

async function checkCapsAndBatch(
  db: QueryPool,
  enqueue: Enqueue,
  publisher: Publisher,
  businessId: number,
  otherId: number,
  brand: { slug: string; officialOrigin: string; timezone: string; windows: Array<{ startHour: number; endHour: number }> },
  now: Date,
) {
  for (let index = 0; index < 4; index += 1) {
    await insertQueued(db, {
      businessId,
      key: `cap-${businessId}-${index}`,
      rating: (index % 4) + 1,
      title: `Cupo ${index}`,
      body: `Cuerpo de cupo ${index} suficientemente distinto.`,
      publishAfter: now,
      createdAt: new Date(now.getTime() + index),
    });
  }
  const client = await db.connect();
  check(client, 'integration query handle cannot connect');
  try {
    let rejected = false;
    try {
      await enqueue.enqueueGeneratedReview({
        client,
        now,
        publishAfter: now,
        input: generatedInput(businessId, brand, 4, 'Quinta activa de la marca no entra.'),
      });
    } catch (error) {
      rejected = typeof error === 'object' && error !== null && 'code' in error && error.code === 'brand_cap';
    }
    check(rejected, 'fifth active brand row was not rejected with brand_cap');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }

  const due = [];
  for (let index = 0; index < 5; index += 1) {
    due.push(await insertQueued(db, {
      businessId: otherId,
      key: `batch-${otherId}-${index}`,
      rating: 3,
      title: TITLE,
      body: `${BODY} ${index}`,
      publishAfter: new Date(now.getTime() - (5 - index) * 1000),
    }));
  }
  const published = await publisher.publishDueReviews({ pool: db, now, batchLimit: 2 });
  const again = await publisher.publishDueReviews({ pool: db, now, batchLimit: 2 });
  const remaining = await db.query(
    `SELECT id FROM review_publication_queue WHERE business_id = $1 AND status = 'queued' AND publication_key LIKE $2 ORDER BY id`,
    [otherId, `batch-${otherId}-%`],
  );
  check(published.due.length === 2, `batch selected ${published.due.length} rows`);
  check(published.published.length === 1, `overdue batch published ${published.published.length} rows`);
  check(published.published[0]?.queueId === due[0], 'batch did not publish the earliest eligible row');
  check(again.published.length === 0, 'a second run burst the overdue backlog');
  check(remaining.rows.length === 4, 'batch did not leave the later rows queued');
  console.log('PASS caps and strict batch');
}

function generatedInput(businessId: number, brand: { slug: string; officialOrigin: string; timezone: string; windows: Array<{ startHour: number; endHour: number }> }, rating: number, body: string) {
  return {
    business_id: businessId,
    business_slug: brand.slug,
    brand,
    rating,
    title: `Título ${rating} ${body.slice(0, 12)}`,
    body,
    product_name: null,
    verification_level: 'unverified_experience',
    content_origin: 'automated',
    source_facts: [{
      url: 'https://opinio-rpub.test/hecho',
      claim: 'entrega publicada',
      source_excerpt: 'La entrega publicada está en el sitio oficial.',
      checked_at: '2020-01-01T00:00:00.000Z',
    }],
    generation_run_id: 'integration-run',
    humanized_at: '2020-01-01T01:00:00.000Z',
  };
}

async function checkDryRun(db: QueryPool, publisher: Publisher, now: Date) {
  const beforeQueue = await db.query(`SELECT count(*)::int AS n, max(updated_at) AS updated FROM review_publication_queue`);
  const beforeReviews = await db.query(`SELECT count(*)::int AS n FROM reviews`);
  const beforeAudit = await db.query(`SELECT count(*)::int AS n FROM audit_logs`);
  const result = await publisher.publishDueReviews({ pool: db, now, dryRun: true, batchLimit: 2 });
  const afterQueue = await db.query(`SELECT count(*)::int AS n, max(updated_at) AS updated FROM review_publication_queue`);
  const afterReviews = await db.query(`SELECT count(*)::int AS n FROM reviews`);
  const afterAudit = await db.query(`SELECT count(*)::int AS n FROM audit_logs`);
  check(JSON.stringify(beforeQueue.rows) === JSON.stringify(afterQueue.rows), 'dry-run changed the queue');
  check(JSON.stringify(beforeReviews.rows) === JSON.stringify(afterReviews.rows), 'dry-run changed reviews');
  check(JSON.stringify(beforeAudit.rows) === JSON.stringify(afterAudit.rows), 'dry-run wrote audit_logs');
  check(!JSON.stringify(result).includes(BODY), 'dry-run result contained review content');
  console.log('PASS dry-run writes nothing');
}

async function checkProvenance(db: Queryable, businessId: number) {
  const review = await db.query(
    `SELECT author_name, order_id, invitation_id, author_masked_contact, verification_level, content_origin, score_weight, status
     FROM reviews WHERE business_id = $1 AND author_name = $2 ORDER BY id DESC LIMIT 1`,
    [businessId, AUTHOR],
  );
  const row = review.rows[0] as {
    author_name: string; order_id: number | null; invitation_id: number | null; author_masked_contact: string | null;
    verification_level: string; content_origin: string; score_weight: string | number; status: string;
  };
  check(row.author_name === AUTHOR, 'published author was not Contenido automatizado');
  check(row.order_id == null && row.invitation_id == null && row.author_masked_contact == null, 'published review stored an order, invitation, or contact');
  check(row.verification_level === 'unverified_experience' && row.content_origin === 'automated', 'published provenance was not automated unverified');
  check(Number(row.score_weight) === 0.35, `published score_weight was ${row.score_weight}`);
  check(row.status === 'published', 'automated review was not published');
  const orders = await db.query(`SELECT count(*)::int AS n FROM orders WHERE business_id = $1`, [businessId]);
  const invitations = await db.query(`SELECT count(*)::int AS n FROM invitations WHERE business_id = $1`, [businessId]);
  check(Number((orders.rows[0] as { n: number }).n) === 0 && Number((invitations.rows[0] as { n: number }).n) === 0, 'publisher created an order or invitation');
  console.log('PASS provenance has no order, invitation, or contact');
}

async function checkPreservation(db: Queryable, before: { reviews: unknown; orders: unknown; invitations: unknown; businesses: unknown }, excludedBusinessIds: number[]) {
  const after = await snapshot(db, excludedBusinessIds);
  check(JSON.stringify(after) === JSON.stringify(before), 'pre-existing rows or timestamps changed');
  console.log('PASS pre-existing rows and timestamps are unchanged');
}

async function checkPersistedSchedule(
  db: QueryPool,
  scheduling: { schedulePublication: (input: {
    now: Date;
    brand: { slug: string; officialOrigin: string; timezone: string; windows: Array<{ startHour: number; endHour: number }> };
    latestBrandPublishAfter: null;
    latestGlobalPublishAfter: null;
    random: () => number;
  }) => Date },
  enqueue: { enqueueGeneratedReview: (input: unknown) => Promise<unknown> },
  ids: number[],
  slug: string,
) {
  const brand = {
    slug,
    officialOrigin: 'https://opinio-rpub.test',
    timezone: 'America/Mexico_City',
    windows: [{ startHour: 10, endHour: 19 }],
  };
  const businessId = await insertBusiness(db, slug, ids);
  const draws = [0, 0, 0, 0];
  let cursor = 0;
  const random = () => draws[cursor++] ?? 0;
  const expected = scheduling.schedulePublication({
    now: NOW,
    brand,
    latestBrandPublishAfter: null,
    latestGlobalPublishAfter: null,
    random,
  });
  cursor = 0;
  const client = await db.connect();
  try {
    await enqueue.enqueueGeneratedReview({
      client,
      now: NOW,
      random,
      input: generatedInput(businessId, brand, 4, 'Calendario persistido sin dormir el proceso de publicación.'),
    });
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }
  const stored = await db.query(`SELECT publish_after FROM review_publication_queue WHERE business_id = $1 ORDER BY id DESC LIMIT 1`, [businessId]);
  const row = stored.rows[0];
  const publishAfter = typeof row === 'object' && row !== null && 'publish_after' in row ? row.publish_after : null;
  const actual = publishAfter instanceof Date ? publishAfter.toISOString() : publishAfter == null ? 'null' : new Date(String(publishAfter)).toISOString();
  check(publishAfter != null && actual === expected.toISOString(), `enqueue did not persist the computed publication schedule: expected=${expected.toISOString()} actual=${actual}`);
  const facts = await db.query(
    `SELECT jsonb_typeof(source_facts) AS kind, source_facts->0->>'claim' AS claim
     FROM review_publication_queue WHERE business_id = $1 ORDER BY id DESC LIMIT 1`,
    [businessId],
  );
  const fact = facts.rows[0];
  check(fact && typeof fact === 'object' && 'kind' in fact && fact.kind === 'array', 'source_facts was not stored as a jsonb array');
  check(fact && typeof fact === 'object' && 'claim' in fact && fact.claim === 'entrega publicada', 'stored jsonb fact was not the normalized claim');
  await db.query(`UPDATE review_publication_queue SET publish_after = '2099-01-01T00:00:00.000Z' WHERE business_id = $1`, [businessId]);
  console.log('PASS computed schedule is persisted');
}

async function checkStaleEvidence(db: QueryPool, publisher: Publisher, businessId: number, now: Date) {
  const key = `stale-${businessId}`;
  const id = await insertQueued(db, {
    businessId,
    key,
    rating: 4,
    title: TITLE,
    body: `${BODY} stale`,
    publishAfter: new Date('2019-01-01T00:00:00.000Z'),
    humanizedAt: new Date(now.getTime() - 46 * 24 * HOUR_MS),
  });
  const result = await publisher.publishDueReviews({ pool: db, now, batchLimit: 1 });
  const stored = await db.query(`SELECT status, last_error, published_review_id FROM review_publication_queue WHERE id = $1`, [id]);
  const row = stored.rows[0];
  check(row && typeof row === 'object' && 'status' in row && row.status === 'failed', 'stale evidence was not failed');
  check(row && typeof row === 'object' && 'last_error' in row && String(row.last_error).startsWith('publication_failed'), 'stale evidence did not store a sanitized error');
  check(row && typeof row === 'object' && 'last_error' in row && !String(row.last_error).includes(BODY), 'stale error leaked review content');
  check(result.published.length === 0, 'stale evidence was published');
  const reviews = await db.query(`SELECT id FROM reviews WHERE publication_key = $1`, [key]);
  check(reviews.rows.length === 0, 'stale evidence inserted a review');
  console.log('PASS stale evidence is not published');
}

async function cleanup(pool: pg.Pool, ids: number[]) {
  if (ids.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM audit_logs WHERE business_id = ANY($1::int[])`, [ids]);
    await client.query(`DELETE FROM review_publication_queue WHERE business_id = ANY($1::int[])`, [ids]);
    await client.query(`DELETE FROM reviews WHERE business_id = ANY($1::int[])`, [ids]);
    await client.query(`DELETE FROM businesses WHERE id = ANY($1::int[]) AND slug LIKE 'opinio-rpub-%'`, [ids]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Cleanup failed for fixture businesses ${ids.join(',')}: ${safe(error)}`);
  } finally {
    client.release();
  }
}

main();
