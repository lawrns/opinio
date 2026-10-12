/**
 * Historical review importer (private staging, never public).
 *
 * Stores records WITHOUT deciding authenticity. Every imported row lands with
 * `customer_authored = NULL` (unresolved) and `transaction_verified = false`, no
 * matter what `verification_level` string or provenance the source carries.
 * Only explicit human evidence (handled elsewhere, never here) can promote a row.
 *
 * Stages: validate -> stage rows + manifest -> import (transactional) ---
 * rollback deletes exactly the rows the manifest records.
 */
import type { Pool, PoolClient } from 'pg';

export interface HistoricalReviewInput {
  business_id: number;
  rating: number;
  title?: string | null;
  body: string;
  author_name: string;
  author_masked_contact?: string | null;
  /** Claimed level carried by the source; stored on the row but never trusted. */
  claimed_verification_level?:
    | 'confirmed_payment'
    | 'confirmed_store_order'
    | 'reviewed_proof'
    | 'unverified_experience';
  product_name?: string | null;
  source_ref?: string | null;
  occurred_at?: string | null;
}

export interface HistoricalImportManifest {
  id: number;
  batch_key: string;
  provenance_source: string;
  attestation_ref: string | null;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  status: 'staged' | 'imported' | 'rolled_back' | 'failed';
  created_at: string;
}

export interface StagedRow {
  valid: boolean;
  errors: string[];
  record: HistoricalReviewInput;
  /** Stable dedupe key: business + normalized author + normalized body. */
  dedupeKey: string;
}

interface ImportOutcome {
  manifest: HistoricalImportManifest;
  staged: StagedRow[];
}

const ALLOWED_LEVELS: Record<string, true> = {
  confirmed_payment: true,
  confirmed_store_order: true,
  reviewed_proof: true,
  unverified_experience: true,
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dedupeKeyFor(record: Pick<HistoricalReviewInput, 'business_id' | 'author_name' | 'body'>): string {
  const author = normalizeText(String(record.author_name || ''));
  const body = normalizeText(String(record.body || ''));
  return `${record.business_id}::${author.length > 120 ? author.slice(0, 120) : author}::${body.slice(0, 400)}`;
}

export function validateHistoricalRecord(input: HistoricalReviewInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.business_id) || input.business_id <= 0) errors.push('business_id must be a positive integer');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) errors.push('rating must be an integer 1..5');
  if (typeof input.body !== 'string' || input.body.trim().length < 5) errors.push('body must be at least 5 characters');
  if (typeof input.author_name !== 'string' || input.author_name.trim().length === 0) errors.push('author_name is required');
  if (input.title !== undefined && input.title !== null && (typeof input.title !== 'string' || input.title.length > 255)) errors.push('title must be a string of at most 255 characters');
  if (input.claimed_verification_level !== undefined && !ALLOWED_LEVELS[input.claimed_verification_level]) errors.push('claimed_verification_level is not a known level');
  if (input.occurred_at !== undefined && input.occurred_at !== null && Number.isNaN(new Date(input.occurred_at).getTime())) errors.push('occurred_at must be a valid date');
  return errors;
}

export function stageHistoricalRecords(records: HistoricalReviewInput[]): StagedRow[] {
  return records.map((record) => ({
    valid: validateHistoricalRecord(record).length === 0,
    errors: validateHistoricalRecord(record),
    record,
    dedupeKey: dedupeKeyFor(record),
  }));
}

async function ensureManifestTable(client: Pool | PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS historical_import_manifests (
      id SERIAL PRIMARY KEY,
      batch_key TEXT UNIQUE NOT NULL,
      provenance_source TEXT NOT NULL,
      attestation_ref TEXT,
      total_rows INT NOT NULL DEFAULT 0,
      imported_rows INT NOT NULL DEFAULT 0,
      skipped_rows INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'staged',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS historical_import_rows (
      manifest_id INT NOT NULL REFERENCES historical_import_manifests(id) ON DELETE CASCADE,
      review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      dedupe_key TEXT NOT NULL,
      PRIMARY KEY (manifest_id, review_id)
    )`);
}

/**
 * Import in one transaction. Imported rows are forced to:
 *   customer_authored = NULL, transaction_verified = false, status = 'under_review'.
 * Rows that fail validation or duplicate an existing (business, author, body) pair
 * are skipped and counted, never imported.
 */
export async function importHistoricalReviews(
  db: Pool | PoolClient,
  opts: {
    batchKey: string;
    provenanceSource: string;
    attestationRef?: string | null;
    records: HistoricalReviewInput[];
  },
): Promise<ImportOutcome> {
  const staged = stageHistoricalRecords(opts.records);
  const client = 'connect' in db ? await (db as Pool).connect() : (db as PoolClient);
  let release = false;
  if ('connect' in db) release = true;
  try {
    await ensureManifestTable(client);
    await client.query('BEGIN');

    const manifestRes = await client.query(
      `INSERT INTO historical_import_manifests
         (batch_key, provenance_source, attestation_ref, total_rows, status)
       VALUES ($1, $2, $3, $4, 'staged')
       ON CONFLICT (batch_key) DO NOTHING
       RETURNING *`,
      [opts.batchKey, opts.provenanceSource, opts.attestationRef ?? null, staged.length],
    );
    if (manifestRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error(`Import batch "${opts.batchKey}" was already processed.`);
    }
    const manifest = manifestRes.rows[0] as HistoricalImportManifest;

    let imported = 0;
    let skipped = 0;
    for (const row of staged) {
      if (!row.valid) {
        skipped += 1;
        continue;
      }
      const { record } = row;
      const duplicate = await client.query(
        `SELECT id FROM reviews
          WHERE business_id = $1
            AND LOWER(TRIM(author_name)) = LOWER(TRIM($2))
            AND LOWER(TRIM(body)) = LOWER(TRIM($3))
          LIMIT 1`,
        [record.business_id, record.author_name, record.body],
      );
      if (duplicate.rows.length > 0) {
        skipped += 1;
        continue;
      }
      const business = await client.query('SELECT id FROM businesses WHERE id = $1 LIMIT 1', [record.business_id]);
      if (business.rows.length === 0) {
        row.valid = false;
        row.errors.push(`business_id ${record.business_id} does not exist`);
        skipped += 1;
        continue;
      }
      const inserted = await client.query(
        `INSERT INTO reviews (
           business_id, order_id, invitation_id, rating, title, body, author_name,
           author_masked_contact, verification_level, score_weight, integrity_factor,
           product_name, status, provenance_source, owner_attested, attestation_ref,
           attested_at, customer_authored, transaction_verified, verification_record_ref,
           created_at, updated_at
         ) VALUES (
           $1, NULL, NULL, $2, $3, $4, $5,
           $6, 'unverified_experience', 0.35, 1.0,
           $7, 'under_review', $8, true, $9,
           NOW(), NULL, false, NULL,
           COALESCE($10::timestamptz, NOW()), NOW()
         ) RETURNING id`,
        [
          record.business_id,
          record.rating,
          record.title?.trim() || null,
          record.body.trim(),
          record.author_name.trim(),
          record.author_masked_contact?.trim() || null,
          record.product_name?.trim() || null,
          opts.provenanceSource,
          opts.attestationRef ?? null,
          record.occurred_at ?? null,
        ],
      );
      await client.query(
        `INSERT INTO historical_import_rows (manifest_id, review_id, dedupe_key)
         VALUES ($1, $2, $3)`,
        [manifest.id, inserted.rows[0].id, row.dedupeKey],
      );
      imported += 1;
    }

    const updated = await client.query(
      `UPDATE historical_import_manifests
         SET imported_rows = $2, skipped_rows = $3, status = 'imported'
       WHERE id = $1
       RETURNING *`,
      [manifest.id, imported, skipped],
    );
    await client.query('COMMIT');
    return { manifest: updated.rows[0] as HistoricalImportManifest, staged };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ROLLBACK on a failed connection is best-effort.
    }
    throw error;
  } finally {
    if (release) (client as PoolClient).release();
  }
}

/** Rollback deletes exactly the rows a manifest imported, then marks it rolled_back. */
export async function rollbackHistoricalImport(
  db: Pool | PoolClient,
  batchKey: string,
): Promise<{ deleted: number; manifest: HistoricalImportManifest }> {
  const client = 'connect' in db ? await (db as Pool).connect() : (db as PoolClient);
  let release = false;
  if ('connect' in db) release = true;
  try {
    await client.query('BEGIN');
    const manifestRes = await client.query(
      `SELECT * FROM historical_import_manifests WHERE batch_key = $1 LIMIT 1`,
      [batchKey],
    );
    if (manifestRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error(`No import batch "${batchKey}" exists.`);
    }
    const manifest = manifestRes.rows[0] as HistoricalImportManifest;
    if (manifest.status === 'rolled_back') {
      await client.query('ROLLBACK');
      return { deleted: 0, manifest };
    }
    const deletedRes = await client.query(
      `DELETE FROM reviews r
        USING historical_import_rows h
       WHERE h.manifest_id = $1 AND r.id = h.review_id`,
      [manifest.id],
    );
    const updated = await client.query(
      `UPDATE historical_import_manifests SET status = 'rolled_back' WHERE id = $1 RETURNING *`,
      [manifest.id],
    );
    await client.query('COMMIT');
    return { deleted: deletedRes.rowCount ?? 0, manifest: updated.rows[0] as HistoricalImportManifest };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // best-effort
    }
    throw error;
  } finally {
    if (release) (client as PoolClient).release();
  }
}

export interface EvidenceDecision {
  reviewId: number;
  customerAuthored: boolean;
  transactionVerified: boolean;
  evidenceRef: string;
  decidedBy: string;
}

/**
 * Change a stored review's evidence flags from explicit human evidence, recorded in
 * audit_logs. Imported rows start `customer_authored = NULL / transaction_verified
 * = false`; only this action can promote them — never attestation or provenance.
 *
 * Hard limits: evidenceRef is required; transaction_verified requires a verification
 * record reference; decidedBy is required for the audit trail.
 */
export async function decideReviewEvidence(
  db: Pool | PoolClient,
  decision: EvidenceDecision,
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(decision.reviewId) || decision.reviewId <= 0) {
    return { ok: false, error: 'reviewId must be a positive integer' };
  }
  if (!decision.evidenceRef || !decision.evidenceRef.trim()) {
    return { ok: false, error: 'evidenceRef is required: attestation alone cannot promote a record' };
  }
  if (typeof decision.decidedBy !== 'string' || !decision.decidedBy.trim()) {
    return { ok: false, error: 'decidedBy is required for the audit trail' };
  }
  const client = 'connect' in db ? await (db as Pool).connect() : (db as PoolClient);
  let release = false;
  if ('connect' in db) release = true;
  try {
    await client.query('BEGIN');
    const existing = await client.query(`SELECT id FROM reviews WHERE id = $1 LIMIT 1`, [decision.reviewId]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, error: `review ${decision.reviewId} does not exist` };
    }
    await client.query(
      `UPDATE reviews
          SET customer_authored = $2,
              transaction_verified = $3,
              verification_record_ref = $4,
              updated_at = NOW()
        WHERE id = $1`,
      [decision.reviewId, decision.customerAuthored, decision.transactionVerified, decision.evidenceRef.trim()],
    );
    await client.query(
      `INSERT INTO audit_logs (business_id, actor, action, details)
       SELECT business_id, $2, 'review.evidence_decision', $3::jsonb
         FROM reviews WHERE id = $1`,
      [
        decision.reviewId,
        decision.decidedBy.trim(),
        JSON.stringify({
          customer_authored: decision.customerAuthored,
          transaction_verified: decision.transactionVerified,
          evidence_ref: decision.evidenceRef.trim(),
        }),
      ],
    );
    await client.query('COMMIT');
    return { ok: true };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // best-effort
    }
    return { ok: false, error: (error as Error).message };
  } finally {
    if (release) (client as PoolClient).release();
  }
}
