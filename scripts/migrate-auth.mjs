// Applies the additive auth migrations in db/migrations, in name order, each
// once, recorded in auth_schema_migrations. Runs only against an explicit
// DATABASE_URL and only with --apply; without it, it lists what would run.
//
//   DATABASE_URL=postgres://... node scripts/migrate-auth.mjs          # dry run
//   DATABASE_URL=postgres://... node scripts/migrate-auth.mjs --apply
//
// Production use needs the designated administrator's approval (spec #26).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');
// Serializes concurrent runners (arbitrary constant).
const LOCK_KEY = 7_026_001;

export function listMigrations(dir = MIGRATIONS_DIR) {
  return readdirSync(dir)
    .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), 'utf8') }));
}

/** Applies pending migrations with `client` (a connected pg Client). Returns the names applied. */
export async function applyAuthMigrations(client, { dir = MIGRATIONS_DIR, dryRun = false } = {}) {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
  try {
    const tracked = (await client.query("SELECT to_regclass('auth_schema_migrations') AS t")).rows[0].t !== null;
    const done = tracked
      ? new Set((await client.query('SELECT name FROM auth_schema_migrations')).rows.map((r) => r.name))
      : new Set();
    const pending = listMigrations(dir).filter((m) => !done.has(m.name));
    // A dry run writes nothing, not even the bookkeeping table.
    if (dryRun) return pending.map((m) => m.name);
    await client.query(
      'CREATE TABLE IF NOT EXISTS auth_schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    );
    for (const m of pending) {
      await client.query('BEGIN');
      try {
        await client.query(m.sql);
        await client.query('INSERT INTO auth_schema_migrations (name) VALUES ($1)', [m.name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${m.name} failed: ${error.code ?? 'unknown error'}`);
      }
    }
    return pending.map((m) => m.name);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { default: pg } = await import('pg');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required; there is no default database.');
    process.exit(1);
  }
  const apply = process.argv.includes('--apply');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const names = await applyAuthMigrations(client, { dryRun: !apply });
    console.log(`${apply ? 'applied' : 'pending (dry run, pass --apply)'}: ${names.join(', ') || 'none'}`);
  } finally {
    await client.end();
  }
}
