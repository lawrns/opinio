/**
 * CONVERSION-001 ledger maintenance for Opinio: release stale delivery claims,
 * reconcile lost review_published writes from the reviews table, and retry
 * pending GA4 deliveries (bounded). Safe to run repeatedly.
 *   DATABASE_URL=... bun run scripts/conversion-maintenance.ts
 */
import { pool } from '../src/lib/db';
import { maintainLedger } from '../src/lib/conversion/ledger';

maintainLedger()
  .then((result) => console.log(JSON.stringify(result)))
  .catch((error) => {
    console.error(`conversion maintenance failed: ${error instanceof Error ? error.name : 'error'}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
