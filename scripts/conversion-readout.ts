/**
 * CONVERSION-001 readout for Opinio (reproducible, read-only).
 *   DATABASE_URL=... bun run scripts/conversion-readout.ts [days]
 * Prints aggregates only: review_published counts by week (America/Mexico_City),
 * first-touch category/page, consent split and source (live vs reconciled),
 * delivery states, and the coverage table grouped as `measured`,
 * `intentOnly` (GA4 intent: CTA clicks, step starts and step denominators,
 * read in a GA4 exploration) and `unavailable` (failures, abandonment and the
 * owner stages), never shown as zero. Reconcile counts against the
 * reviews table (status = 'published').
 */
import { pool } from '../src/lib/db';
import { coverageByStatus, OWNER_LINKAGE_PREREQUISITE, reconciliationCoverage } from '../src/lib/conversion/coverage';

async function main() {
  const days = Math.min(Math.max(Number(process.argv[2]) || 90, 1), 365);
  const client = await pool.connect();
  try {
    const weekly = await client.query(
      `SELECT to_char(date_trunc('week', e.occurred_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') AS week,
              COALESCE(i.first_touch->>'category', 'unavailable') AS first_touch_category,
              COALESCE(i.first_touch->>'landingPage', 'unavailable') AS first_touch_page,
              e.consent_state, e.source, COUNT(*)::int AS reviews
         FROM conversion_stage_events e JOIN conversion_identities i ON i.entity_type = e.entity_type AND i.entity_id = e.entity_id
        WHERE e.stage = 'milestone_review_published' AND e.occurred_at >= NOW() - ($1 || ' days')::interval
        GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 6 DESC`,
      [days],
    );
    const delivery = await client.query(`SELECT delivery_state, source, COUNT(*)::int AS n FROM conversion_stage_events GROUP BY 1, 2 ORDER BY 1, 2`);
    const reconcile = await client.query(
      `SELECT (SELECT COUNT(*) FROM reviews WHERE status = 'published' AND created_at >= NOW() - ($1 || ' days')::interval)::int AS published_reviews,
              (SELECT COUNT(*) FROM conversion_stage_events WHERE stage = 'milestone_review_published' AND occurred_at >= NOW() - ($1 || ' days')::interval)::int AS ledger_rows,
              LEAST(
                (SELECT MIN(activated_at) FROM conversion_watermarks WHERE stage = 'milestone_review_published'),
                (SELECT MIN(LEAST(occurred_at, created_at)) FROM conversion_stage_events WHERE source = 'live')
              )::text AS watermark_since`,
      [days],
    );
    const row = reconcile.rows[0] ?? {};
    const ga4 = { measurementIdConfigured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID), serverSendConfigured: Boolean(process.env.GA4_API_SECRET) };
    console.log(JSON.stringify({ days, timezone: 'America/Mexico_City', ga4, weekly: weekly.rows, delivery: delivery.rows, reconcile: { ...row, coverage: reconciliationCoverage(row.watermark_since) }, ...coverageByStatus(), prerequisite: OWNER_LINKAGE_PREREQUISITE }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

void main();

