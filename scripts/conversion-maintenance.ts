/**
 * CONVERSION-001 ledger maintenance for Opinio: release stale delivery claims,
 * reconcile lost review_published writes from the reviews table, and retry
 * pending GA4 deliveries (bounded). Safe to run repeatedly.
 *   DATABASE_URL=... bun run scripts/conversion-maintenance.ts [--activate-since=<ISO-timestamp>]
 */
import { pool } from '../src/lib/db';
import { activateConversionLedger, maintainLedger } from '../src/lib/conversion/ledger';

async function run() {
  const argSince = process.argv.find((a) => a.startsWith('--activate-since='))?.slice('--activate-since='.length);
  const rawSince = (argSince ?? process.env.CONVERSION_ACTIVATED_AT ?? '').trim();
  if (rawSince) {
    await activateConversionLedger(new Date(rawSince));
  }
  const result = await maintainLedger();
  console.log(JSON.stringify(result));
}

run()
  .catch((error) => {
    console.error(`conversion maintenance failed: ${error instanceof Error ? error.name : 'error'}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
