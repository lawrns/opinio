import pg from 'pg';
import { publishDueReviews } from '../src/lib/review-publisher';

function batchLimit(argv: string[]): number | undefined {
  const flag = argv.find((arg) => arg.startsWith('--batch-limit='));
  if (!flag) return undefined;
  const raw = flag.slice('--batch-limit='.length);
  if (!/^\d+$/.test(raw)) throw new Error('batch');
  return Math.min(Number(raw), 10);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('database_unavailable');
  const dryRun = process.argv.includes('--dry-run');
  const limit = batchLimit(process.argv.slice(2));
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  try {
    const result = await publishDueReviews({
      pool,
      now: new Date(),
      dryRun,
      batchLimit: limit,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error && /batch|database_unavailable/i.test(error.message)
    ? error.message.match(/batch|database_unavailable/i)?.[0] ?? 'rejected'
    : 'rejected';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
