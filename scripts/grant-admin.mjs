// Adds a platform administrator (who may approve first owners). This is the
// only way to create one: no sign-up, request field or first user becomes an
// administrator. Run by the user-designated production administrator only.
// The person must have signed in once so their email is verified.
//
// The first administrator is granted with no --granted-by; every later grant
// must name an existing administrator. Each grant writes an audit row.
//
//   DATABASE_URL=postgres://... node scripts/grant-admin.mjs --email person@example.com          # dry run
//   DATABASE_URL=postgres://... node scripts/grant-admin.mjs --email person@example.com --granted-by admin@example.com --apply
//
// Applying to a database on another host also needs --confirm-host=<that host>
// (the same guard as migrate-auth.mjs).
import { fileURLToPath } from 'node:url';
import { applyRefusal } from './migrate-auth.mjs';

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const normalize = (email) => String(email).trim().toLowerCase();

/**
 * Grants administrator to the signed-in user with `email`, recording the
 * granter and an audit row in one transaction. Returns the outcome.
 *
 * @param {import('pg').ClientBase} client
 * @param {string} email
 * @param {{ dryRun?: boolean, grantedBy?: string }} [options]
 * @returns {Promise<'no_signed_in_user' | 'already_administrator' | 'granter_required' | 'granter_not_administrator' | 'would_grant' | 'granted'>}
 */
export async function grantAdministrator(client, email, { dryRun = false, grantedBy } = {}) {
  const user = (await client.query('SELECT id FROM users WHERE email = $1', [normalize(email)])).rows[0];
  if (!user) return 'no_signed_in_user';
  if ((await client.query('SELECT 1 FROM platform_administrators WHERE user_id = $1', [user.id])).rowCount) return 'already_administrator';
  const admins = Number((await client.query('SELECT count(*) AS n FROM platform_administrators')).rows[0].n);
  let granterId = null;
  if (admins > 0) {
    if (!grantedBy) return 'granter_required';
    const granter = (
      await client.query(
        'SELECT a.user_id FROM platform_administrators a JOIN users u ON u.id = a.user_id WHERE u.email = $1',
        [normalize(grantedBy)],
      )
    ).rows[0];
    if (!granter) return 'granter_not_administrator';
    granterId = granter.user_id;
  }
  if (dryRun) return 'would_grant';
  await client.query('BEGIN');
  try {
    const res = await client.query(
      'INSERT INTO platform_administrators (user_id, granted_by_user_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
      [user.id, granterId],
    );
    if (res.rowCount === 1) {
      await client.query(
        `INSERT INTO audit_logs (business_id, actor, action, details, actor_type, actor_id)
         VALUES (NULL, $1, 'administrator.granted', $2, $3, $4)`,
        [
          granterId === null ? 'system' : `administrator:${granterId}`,
          JSON.stringify({ user_id: user.id, granted_by_user_id: granterId }),
          granterId === null ? 'system' : 'administrator',
          granterId,
        ],
      );
    }
    await client.query('COMMIT');
    return res.rowCount === 1 ? 'granted' : 'already_administrator';
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/** The value after `flag`, or null when it is missing or is itself a flag. */
function flagValue(argv, flag) {
  const i = argv.indexOf(flag);
  const value = i >= 0 ? argv[i + 1] : undefined;
  return value && !value.startsWith('--') ? value : null;
}

/** Parsed command line, or an error message. */
export function parseArgs(argv) {
  const email = flagValue(argv, '--email');
  if (!email || !EMAIL.test(normalize(email))) return { error: 'Usage: node scripts/grant-admin.mjs --email <address> [--granted-by <address>] [--apply]' };
  const grantedBy = argv.includes('--granted-by') ? flagValue(argv, '--granted-by') : undefined;
  if (grantedBy === null || (grantedBy && !EMAIL.test(normalize(grantedBy)))) return { error: '--granted-by needs an email address.' };
  return { email, grantedBy, apply: argv.includes('--apply') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { default: pg } = await import('pg');
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL || args.error) {
    console.error(args.error ?? 'DATABASE_URL is required; there is no default database.');
    process.exit(1);
  }
  const refusal = args.apply ? applyRefusal(process.env.DATABASE_URL, process.argv) : null;
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log(await grantAdministrator(client, args.email, { dryRun: !args.apply, grantedBy: args.grantedBy }));
  } finally {
    await client.end();
  }
}
