#!/usr/bin/env node
/**
 * Route-level regression for the merchant entry and dashboard flow (issue #2,
 * JEV-001/JEV-003: the shared `/merchant` link answered HTTP 500).
 *
 * The merchant layout used to ask for one `resolution_cases` query per listed
 * business. Against the remote production database (~161 ms per round trip,
 * ~1200 businesses) the queued pool checkouts (max 15,
 * `connectionTimeoutMillis: 5000`) outlived the 5 s budget, `Promise.all`
 * rejected and every `/merchant/*` route answered HTTP 500 after ~6.4 s.
 *
 * The defect only appears with remote-database latency, so this harness puts a
 * delay forwarder between the app and the database (80 ms per TCP chunk by
 * default, i.e. about the measured production round trip) and then asserts the
 * HTML the app actually serves:
 *   - GET /merchant → 200 with the database's default
 *     business selected in the real selector, its identity in the header and in
 *     the sidebar navigation links
 *   - GET /merchant?business=<merchant> → 200 with that business selected, its
 *     identity in the header and navigation links carrying the same business
 *   - GET /merchant/reviews?business=<merchant> → 200 keeping the same business
 *   - GET /merchant?business=<unknown> → 200 falling back to the first listed
 *     business (pre-existing behaviour)
 *
 * With the pre-fix per-business fan-out the same checks fail: those requests
 * answer 500 under the injected latency.
 *
 * Usage: DATABASE_URL=postgres://…@127.0.0.1:54732/opinio_issue_2 \
 *          node scripts/verify-merchant-flow.mjs
 * Env:   DATABASE_URL (required) — the local, isolated database the app must use
 *        SMOKE_PORT (default 3989) — dev server port
 *        MERCHANT_SLUG (default `amazon`, falling back to the second business in
 *          the app's own ordering) — the business used for the selection checks
 *        MERCHANT_DB_DELAY_MS (default 80) — injected delay per TCP chunk in each
 *          direction; 0 disables the forwarder (the pre-fix code then answers 200
 *          locally, so the delay is what keeps this regression red-capable)
 *        NEXT_DEV_ARGS (default `--webpack`; dev-mode flags passed to `next dev`.
 *          Turbopack currently fails to load the externalized `pg` driver from a
 *          hoisted node_modules with `Failed to load external module pg-<hash>`,
 *          so the harness boots webpack dev; pass NEXT_DEV_ARGS= to use the repo
 *          default dev mode when Turbopack works in the target environment.)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT || 3989);
const BASE = `http://127.0.0.1:${PORT}`;
const REQUEST_TIMEOUT_MS = 180_000;
const READY_TIMEOUT_MS = 240_000;
const DELAY_MS = Number(process.env.MERCHANT_DB_DELAY_MS ?? 80);

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!existsSync(nextBin)) {
  console.error(
    `Cannot find ${nextBin}.\nRun this regression from a checkout with dependencies installed (pnpm install --frozen-lockfile).`,
  );
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required: the regression asserts the real catalogue businesses the app renders.');
  process.exit(2);
}

const requireFromRoot = createRequire(join(ROOT, 'package.json'));
const { Client } = requireFromRoot('pg');

/**
 * The app's own ordering for the default business (`getMerchantBusinesses`),
 * plus the business used for the explicit-selection checks. Read as the
 * independent source of truth for what the screens must show.
 */
async function loadBusinesses(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT slug, brand_name FROM businesses ORDER BY claimed DESC, trust_score DESC, id ASC`,
    );
    if (rows.length === 0) {
      console.error('No business found in the database; cannot verify the merchant flow.');
      process.exit(2);
    }
    const requested = process.env.MERCHANT_SLUG ?? 'amazon';
    const merchant = rows.find((row) => row.slug === requested) ?? rows[1] ?? rows[0];
    return { defaultBusiness: rows[0], merchant };
  } finally {
    await client.end();
  }
}

/** Forwards database traffic with a fixed delay per chunk, both directions. */
function startDelayForwarder(targetUrl, delayMs) {
  if (delayMs <= 0) return null;
  const target = new URL(targetUrl);
  const server = net.createServer((client) => {
    const upstream = net.connect(Number(target.port || 5432), target.hostname);
    client.setNoDelay(true);
    upstream.setNoDelay(true);
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    const pause = () => new Promise((done) => setTimeout(done, delayMs));
    client.on('data', async (chunk) => {
      await pause();
      if (!upstream.destroyed) upstream.write(chunk);
    });
    upstream.on('data', async (chunk) => {
      await pause();
      if (!client.destroyed) client.write(chunk);
    });
  });
  return new Promise((ready) => {
    server.listen(0, '127.0.0.1', () => ready({ server, port: server.address().port }));
  });
}

const directUrl = process.env.DATABASE_URL;
const { defaultBusiness, merchant } = await loadBusinesses(directUrl);
const forwarder = await startDelayForwarder(directUrl, DELAY_MS);

let appDatabaseUrl = directUrl;
if (forwarder) {
  const proxied = new URL(directUrl);
  proxied.hostname = '127.0.0.1';
  proxied.port = String(forwarder.port);
  appDatabaseUrl = proxied.toString();
}

const results = [];
const devArgs = (process.env.NEXT_DEV_ARGS ?? '--webpack').split(/\s+/).filter(Boolean);
const server = spawn(process.execPath, [nextBin, 'dev', ...devArgs, '-H', '127.0.0.1', '--port', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: appDatabaseUrl, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (chunk) => {
  serverLog = `${serverLog}${chunk}`.slice(-4000);
});
server.stderr.on('data', (chunk) => {
  serverLog = `${serverLog}${chunk}`.slice(-4000);
});

function cleanup() {
  if (!server.killed) server.kill('SIGTERM');
  if (forwarder) forwarder.server.close();
}
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

async function request(path) {
  const response = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = await response.text();
  return { path, status: response.status, body };
}

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

function textOf(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Selected option of the real business selector, as served. */
function selectedBusiness(html) {
  const select = html.match(/<select[^>]*id="merchant-business"[\s\S]*?<\/select>/);
  if (!select) return null;
  const option = select[0].match(/<option[^>]*selected[^>]*>/);
  return option ? option[0].match(/value="([^"]*)"/)?.[1] ?? null : null;
}

/** Brand texts rendered inside real `<header>` regions (never the whole body, so selector options cannot echo them). */
function headerBrands(html) {
  return (html.match(/<header[\s\S]*?<\/header>/g) ?? [])
    .map((header) => header.match(/<p[^>]*>([\s\S]*?)<\/p>/))
    .filter(Boolean)
    .map((paragraph) => textOf(paragraph[1]));
}

function navigationTarget(html, route) {
  const link = html.match(new RegExp(`href="/merchant/${route}\\?([^"]*)"`));
  return link ? new URLSearchParams(link[1].replace(/&amp;/g, '&')).get('business') : null;
}

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`dev server exited with code ${server.exitCode}`);
    try {
      const { status } = await request('/');
      if (status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(`dev server did not answer on ${BASE} within ${READY_TIMEOUT_MS / 1000}s`);
}

try {
  console.log(
    `Injecting ${DELAY_MS} ms per database TCP chunk (production measured ~161 ms per round trip).\n` +
      `Default business: ${defaultBusiness.slug} (${defaultBusiness.brand_name}); selection checks use ${merchant.slug} (${merchant.brand_name}).\n`,
  );
  await waitForServer();

  const entry = await request('/merchant');
  record(
    'merchant entry responds 200',
    entry.status === 200,
    `GET /merchant → ${entry.status}`,
  );
  record(
    'merchant entry selects the first listed business',
    selectedBusiness(entry.body) === defaultBusiness.slug,
    `selected=${selectedBusiness(entry.body) ?? 'none'} (expected ${defaultBusiness.slug})`,
  );
  record(
    'merchant header shows the selected business identity',
    headerBrands(entry.body).includes(defaultBusiness.brand_name),
    `header="${headerBrands(entry.body).join(' | ') || 'none'}" (expected ${defaultBusiness.brand_name})`,
  );
  record(
    'sidebar navigation carries the selected business',
    navigationTarget(entry.body, 'reviews') === defaultBusiness.slug &&
      navigationTarget(entry.body, 'inbox') === defaultBusiness.slug,
    `reviews=${navigationTarget(entry.body, 'reviews') ?? 'none'}, inbox=${navigationTarget(entry.body, 'inbox') ?? 'none'}`,
  );

  const selected = await request(`/merchant?business=${encodeURIComponent(merchant.slug)}`);
  record(
    'explicit business selection responds 200',
    selected.status === 200,
    `GET /merchant?business=${merchant.slug} → ${selected.status}`,
  );
  record(
    'explicit business selection is reflected in the screen',
    selectedBusiness(selected.body) === merchant.slug &&
      headerBrands(selected.body).includes(merchant.brand_name),
    `selected=${selectedBusiness(selected.body) ?? 'none'}, header="${headerBrands(selected.body).join(' | ') || 'none'}" (expected ${merchant.slug}/${merchant.brand_name})`,
  );
  record(
    'navigation keeps the explicitly selected business',
    navigationTarget(selected.body, 'reviews') === merchant.slug &&
      navigationTarget(selected.body, 'inbox') === merchant.slug,
    `reviews=${navigationTarget(selected.body, 'reviews') ?? 'none'}, inbox=${navigationTarget(selected.body, 'inbox') ?? 'none'}`,
  );

  const reviews = await request(`/merchant/reviews?business=${encodeURIComponent(merchant.slug)}`);
  record(
    'navigating to reviews keeps the same business',
    reviews.status === 200 &&
      selectedBusiness(reviews.body) === merchant.slug &&
      headerBrands(reviews.body).includes(merchant.brand_name),
    `GET /merchant/reviews?business=${merchant.slug} → ${reviews.status}, selected=${selectedBusiness(reviews.body) ?? 'none'}, header="${headerBrands(reviews.body).join(' | ') || 'none'}"`,
  );

  const unknown = await request('/merchant?business=no-such-business-in-catalogue');
  record(
    'unknown selection falls back to the first listed business',
    unknown.status === 200 && selectedBusiness(unknown.body) === defaultBusiness.slug,
    `GET /merchant?business=no-such-business-in-catalogue → ${unknown.status}, selected=${selectedBusiness(unknown.body) ?? 'none'}`,
  );
} catch (error) {
  console.error(`\nMerchant flow run aborted: ${error.message}`);
  if (serverLog) console.error(`\n--- dev server output ---\n${serverLog}`);
  cleanup();
  process.exit(1);
} finally {
  cleanup();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error(`Failed: ${failed.map((result) => result.name).join(', ')}`);
  process.exit(1);
}
