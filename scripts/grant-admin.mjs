// Adds a platform administrator (who may approve first owners). This is the
// only way to create one: no sign-up, request field or first user becomes an
// administrator. Run by the user-designated production administrator only.
// The person must have signed in once so their email is verified.
//
//   DATABASE_URL=postgres://... node scripts/grant-admin.mjs --email person@example.com          # dry run
//   DATABASE_URL=postgres://... node scripts/grant-admin.mjs --email person@example.com --apply
import { fileURLToPath } from 'node:url';

/** Grants administrator to the signed-in user with `email`. Returns the outcome. */
export async function grantAdministrator(client, email, { dryRun = false } = {}) {
  const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [String(email).trim().toLowerCase()]);
  if (!rows[0]) return 'no_signed_in_user';
  if (dryRun) return 'would_grant';
  const res = await client.query(
    'INSERT INTO platform_administrators (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [rows[0].id],
  );
  return res.rowCount === 1 ? 'granted' : 'already_administrator';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { default: pg } = await import('pg');
  const email = process.argv[process.argv.indexOf('--email') + 1];
  if (!process.env.DATABASE_URL || !process.argv.includes('--email') || !email) {
    console.error('Usage: DATABASE_URL=... node scripts/grant-admin.mjs --email <address> [--apply]');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log(await grantAdministrator(client, email, { dryRun: !process.argv.includes('--apply') }));
  } finally {
    await client.end();
  }
}
