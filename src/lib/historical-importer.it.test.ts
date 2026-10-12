/**
 * Integration: historical importer + gated reads against a real (disposable) database.
 *
 * Exercises: schema migration, staging/validation/dedupe, owner-attested import that
 * stays unresolved, rollback, evidence decision limits, and the proof that unresolved
 * rows cannot leak into widget data, search aggregates, or the public payload.
 *
 * Run only against a disposable database:
 *   OPINIO_TEST_DATABASE_URL="host=/tmp port=55433 dbname=opinio_it user=lukatenbosch" \
 *     npx vitest run src/lib/historical-importer.it.test.ts
 * Skipped otherwise. `pg` cannot parse bare socket paths, so keyword=value form is used.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  importHistoricalReviews,
  rollbackHistoricalImport,
  stageHistoricalRecords,
  decideReviewEvidence,
} from './historical-importer';
import { computePublicAggregate, isPubliclyEligible } from './review-eligibility';
import { buildPublicWidgetPayload } from './widget-payload';

const DATABASE_URL = process.env.OPINIO_TEST_DATABASE_URL;
const runIntegration = Boolean(DATABASE_URL);

function poolFromEnv(): Pool {
  const raw = DATABASE_URL as string;
  if (!raw.includes('://')) {
    const part = (key: string): string | undefined => {
      const match = new RegExp(`${key}=([^ ]+)`).exec(raw);
      return match?.[1];
    };
    const port = Number(part('port'));
    return new Pool({
      host: part('host'),
      port: Number.isFinite(port) ? port : 5432,
      database: part('dbname'),
      user: part('user'),
    });
  }
  return new Pool({ connectionString: raw });
}

describe.skipIf(!runIntegration)('historical import against a real database', () => {
  let pool: Pool;
  let businessId: number;

  beforeAll(async () => {
    pool = poolFromEnv();
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    const biz = await pool.query(
      `INSERT INTO businesses (slug, brand_name, claimed) VALUES ('it-harness', 'IT Harness', false) RETURNING id`,
    );
    businessId = biz.rows[0].id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM businesses WHERE id = $1`, [businessId]).catch(() => undefined);
    await pool.end();
  });

  it('validates, dedupes and stages without touching the database', () => {
    const staged = stageHistoricalRecords([
      { business_id: businessId, rating: 5, body: 'Llegó a tiempo y completo', author_name: 'Memo R.' },
      { business_id: businessId, rating: 5, body: 'Llegó a tiempo y completo', author_name: 'Memo R.' },
      { business_id: businessId, rating: 9, body: 'ok', author_name: '' },
    ]);
    expect(staged[0].valid).toBe(true);
    expect(staged[0].dedupeKey).toBe(staged[1].dedupeKey);
    expect(staged[2].valid).toBe(false);
    expect(staged[2].errors.length).toBeGreaterThan(0);
  });

  it('imports owner-attested rows that stay unresolved and invisible to public reads', async () => {
    const outcome = await importHistoricalReviews(pool, {
      batchKey: 'it-legacy-001',
      provenanceSource: 'legacy_site_migration',
      attestationRef: 'owner-attestation-2026-10-11',
      records: [
        { business_id: businessId, rating: 5, body: 'Llegó a tiempo y completo', author_name: 'Memo R.' },
        { business_id: businessId, rating: 4, body: 'Buen servicio en general', author_name: 'Sofi C.' },
      ],
    });
    expect(outcome.manifest.status).toBe('imported');
    expect(outcome.manifest.imported_rows).toBe(2);

    const rows = await pool.query(
      `SELECT id, rating, status, customer_authored, transaction_verified, owner_attested, provenance_source
         FROM reviews WHERE business_id = $1 ORDER BY id ASC`,
      [businessId],
    );
    expect(rows.rows).toHaveLength(2);
    for (const row of rows.rows) {
      expect(row.status).toBe('under_review');
      expect(row.customer_authored).toBeNull();
      expect(row.transaction_verified).toBe(false);
      expect(row.owner_attested).toBe(true);
      expect(row.provenance_source).toBe('legacy_site_migration');
    }

    // Public layer sees nothing: no eligible rows -> null payload, never hardcoded.
    const payload = buildPublicWidgetPayload({ name: 'IT Harness', slug: 'it-harness', logo_url: null }, rows.rows);
    expect(payload.rating).toBeNull();
    expect(payload.review_count).toBeNull();
    expect(payload.verified_purchases).toBe(false);
    expect(computePublicAggregate(rows.rows)).toBeNull();
    expect(rows.rows.some(isPubliclyEligible)).toBe(false);

    // Widget and search aggregates read zero rows for this business.
    const widget = await pool.query(
      `SELECT COUNT(*)::int AS cnt, AVG(rating) AS avg_rat FROM reviews
        WHERE business_id = $1 AND status = 'published'
          AND (customer_authored = true OR transaction_verified = true)`,
      [businessId],
    );
    expect(widget.rows[0].cnt).toBe(0);
    expect(widget.rows[0].avg_rat).toBeNull();
  });

  it('rejects duplicate batch keys and duplicate records', async () => {
    await expect(
      importHistoricalReviews(pool, {
        batchKey: 'it-legacy-001',
        provenanceSource: 'legacy_site_migration',
        records: [{ business_id: businessId, rating: 5, body: 'Otra opinión', author_name: 'Ana K.' }],
      }),
    ).rejects.toThrow(/already processed/);

    const second = await importHistoricalReviews(pool, {
      batchKey: 'it-legacy-002',
      provenanceSource: 'legacy_site_migration',
      records: [{ business_id: businessId, rating: 5, body: 'Llegó a tiempo y completo', author_name: 'Memo R.' }],
    });
    expect(second.manifest.imported_rows).toBe(0);
    expect(second.manifest.skipped_rows).toBe(1);
  });

  it('refuses evidence decisions without an evidence reference', async () => {
    const row = await pool.query(`SELECT id FROM reviews WHERE business_id = $1 LIMIT 1`, [businessId]);
    const declined = await decideReviewEvidence(pool, {
      reviewId: row.rows[0].id,
      customerAuthored: true,
      transactionVerified: false,
      evidenceRef: '   ',
      decidedBy: 'auditor@example.com',
    });
    expect(declined.ok).toBe(false);
  });

  it('rolls back exactly the imported rows', async () => {
    const before = await pool.query(`SELECT COUNT(*)::int AS c FROM reviews WHERE business_id = $1`, [businessId]);
    const rolled = await rollbackHistoricalImport(pool, 'it-legacy-001');
    expect(rolled.manifest.status).toBe('rolled_back');
    const after = await pool.query(`SELECT COUNT(*)::int AS c FROM reviews WHERE business_id = $1`, [businessId]);
    expect(before.rows[0].c - after.rows[0].c).toBe(rolled.deleted);
    expect(after.rows[0].c).toBe(0);
    const again = await rollbackHistoricalImport(pool, 'it-legacy-001');
    expect(again.deleted).toBe(0);
  });
});
