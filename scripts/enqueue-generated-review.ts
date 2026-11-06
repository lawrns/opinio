import { readFileSync } from 'node:fs';
import pg from 'pg';
import { getReviewBrand, type ReviewBrandConfig } from '../src/lib/review-brands';
import { controlledPublicationEnabled, enqueueGeneratedReview } from '../src/lib/review-enqueue';
import { assertCurrentGeneration, validateGenerationInput } from '../src/lib/review-generation';

function safeReason(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if (error instanceof Error) {
    const named = error.message.match(/verification_level|content_origin|humanized_at|facts|url|claim|source_excerpt|checked_at|rating|title|body|product_name|order_id|invitation_id|author_masked_contact|contact|business|brand|publish_after|validation/i);
    if (named) return named[0].toLowerCase();
  }
  return 'rejected';
}

function reject(message: string): never {
  throw new Error(message);
}

function readPayload(): Record<string, unknown> {
  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    reject('validation');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    reject('validation');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) reject('validation');
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) payload[key] = value;
  return payload;
}

function publishAfterFlag(argv: string[]): Date | undefined {
  const explicit = argv.some((arg) => arg === '--publish-after' || arg.startsWith('--publish-after='));
  if (!explicit) return undefined;
  if (!controlledPublicationEnabled(process.env.OPINIO_CONTROLLED_PUBLICATION)) reject('publish_after');
  const flag = argv.find((arg) => arg.startsWith('--publish-after='));
  if (!flag) reject('publish_after');
  const raw = flag.slice('--publish-after='.length);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) reject('publish_after');
  return parsed;
}

function textField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') reject(key);
  return value;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) reject('validation');
  const payload = readPayload();
  const publishAfter = publishAfterFlag(process.argv.slice(2));
  const slug = textField(payload, 'business_slug');
  let brand: ReviewBrandConfig;
  try {
    brand = getReviewBrand(slug);
  } catch {
    reject('brand');
  }
  const accepted = validateGenerationInput({
    verification_level: payload.verification_level,
    content_origin: payload.content_origin,
    humanized_at: payload.humanized_at,
    rating: payload.rating,
    title: payload.title,
    body: payload.body,
    product_name: 'product_name' in payload ? payload.product_name : null,
    facts: payload.facts,
    order_id: payload.order_id,
    invitation_id: payload.invitation_id,
    author_masked_contact: payload.author_masked_contact,
    contact: payload.contact,
  }, brand);
  const runId = payload.generation_run_id;
  if (typeof runId !== 'string' || runId.trim() === '' || runId.length > 100) reject('validation');
  const now = new Date();
  assertCurrentGeneration(accepted, now);

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const found = await client.query('SELECT id FROM businesses WHERE slug = $1 LIMIT 1', [slug]);
    const business = found.rows[0];
    if (!business) reject('business');
    const businessId = Number(business.id);
    if (!Number.isInteger(businessId)) reject('business');
    const queued = await enqueueGeneratedReview({
      client,
      now,
      publishAfter,
      input: {
        business_id: businessId,
        business_slug: slug,
        brand,
        rating: accepted.rating,
        title: accepted.title,
        body: accepted.body,
        product_name: accepted.product_name,
        verification_level: accepted.verification_level,
        content_origin: accepted.content_origin,
        source_facts: accepted.facts,
        generation_run_id: runId,
        humanized_at: accepted.humanized_at,
      },
    });
    process.stdout.write(`${JSON.stringify({
      id: queued.id,
      brand: slug,
      publish_after: queued.publishAfter,
    })}\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${safeReason(error)}\n`);
  process.exit(1);
});
