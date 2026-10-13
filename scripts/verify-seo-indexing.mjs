#!/usr/bin/env node
/**
 * Route-level smoke test for the approved utility indexing + canonical policy.
 *
 * Boots `next dev` (node_modules + DATABASE_URL required) and asserts against
 * the HTML the app actually serves:
 *   - /verificar and its ?q= / ?categoria= / ?accion= variants: crawler-visible
 *     noindex, still crawlable (no robots.txt blocking)
 *   - /caso/nuevo and its ?b=<merchant> variants: same noindex policy
 *   - /escribir-opinion/<merchant>: stays indexable, self-canonical on the
 *     merchant path, incidental parameters normalized (never canonicalized to
 *     the /b/<merchant> passport)
 *   - /b/<merchant> and /directorio: still indexable with their canonical
 *   - /sitemap.xml: base routes + directory-family entries + exactly the business
 *     passports present in the database (no utility variants)
 *   - unknown merchant slug: 404 with noindex and no canonical
 *
 * Usage: DATABASE_URL=postgres://… SMOKE_PORT=3203 node scripts/verify-seo-indexing.mjs
 * Env:   SEO_SLUG=<merchant slug>  (default: first slug found in the database)
 *        SMOKE_PORT (default 3988)
 *        NEXT_DEV_ARGS (default `--webpack`; dev-mode flag(s) passed to `next dev`.
 *          Turbopack currently fails to load the externalized `pg` driver from a
 *          hoisted node_modules with `Failed to load external module pg-<hash>`,
 *          so the harness boots webpack dev; pass NEXT_DEV_ARGS= to use the repo
 *          default dev mode when Turbopack works in the target environment.)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT || 3988);
const BASE = `http://127.0.0.1:${PORT}`;
const REQUEST_TIMEOUT_MS = 180_000;
const READY_TIMEOUT_MS = 240_000;

const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const ORIGIN = (envSiteUrl && !envSiteUrl.includes('fertilitylistings') ? envSiteUrl : 'https://opinio.mx')
  .replace(/\/+$/, '');

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!existsSync(nextBin)) {
  console.error(
    `Cannot find ${nextBin}.\nRun this smoke test from a checkout with dependencies installed (pnpm install --frozen-lockfile).`,
  );
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required: the smoke test resolves the merchant slugs the sitemap must declare.');
  process.exit(2);
}

const requireFromRoot = createRequire(join(ROOT, 'package.json'));
const { Client } = requireFromRoot('pg');

/**
 * Smoke merchant plus the complete non-empty slug inventory from the database —
 * the sitemap must declare exactly these passports (independent source of truth).
 */
async function loadCatalogue() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT slug, brand_name FROM businesses
       WHERE slug IS NOT NULL AND BTRIM(slug) <> ''
       ORDER BY slug ASC`,
    );
    if (rows.length === 0) {
      console.error('No business slug found in the database; cannot smoke-test merchant metadata.');
      process.exit(2);
    }
    const merchant = process.env.SEO_SLUG
      ? rows.find((row) => row.slug === process.env.SEO_SLUG) ?? { slug: process.env.SEO_SLUG, brand_name: null }
      : rows[0];
    return { merchant, catalogueSlugs: rows.map((row) => row.slug) };
  } finally {
    await client.end();
  }
}

const { merchant, catalogueSlugs } = await loadCatalogue();

const results = [];
const devArgs = (process.env.NEXT_DEV_ARGS ?? '--webpack').split(/\s+/).filter(Boolean);
const server = spawn(process.execPath, [nextBin, 'dev', ...devArgs, '-H', '127.0.0.1', '--port', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (chunk) => {
  serverLog = `${serverLog}${chunk}`.slice(-4000);
});
server.stderr.on('data', (chunk) => {
  serverLog = `${serverLog}${chunk}`.slice(-4000);
});

function stopServer() {
  if (!server.killed) server.kill('SIGTERM');
}
process.on('exit', stopServer);
process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});

async function request(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.text();
  return { status: response.status, body };
}

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`dev server did not answer on ${BASE} within ${READY_TIMEOUT_MS / 1000}s`);
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'name') === name) return attribute(tag, 'content');
  }
  return null;
}

function canonicalHref(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (attribute(tag, 'rel') === 'canonical') return attribute(tag, 'href');
  }
  return null;
}

function titleContent(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : null;
}

function isNoindex(html) {
  const content = metaContent(html, 'robots');
  return Boolean(content && /noindex/i.test(content));
}

function normalize(text) {
  return (text || '').normalize('NFC').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, ' ').trim();
}

const slug = merchant.slug;
const encodedSlug = encodeURIComponent(slug);
const opinionPath = `/escribir-opinion/${encodedSlug}`;

try {
  await waitForServer();
  console.log(`\nSmoke target: ${BASE} · origin ${ORIGIN} · merchant ${slug}\n`);

  for (const [path, label] of [
    ['/verificar', '/verificar'],
    ['/verificar?q=luuna', '/verificar query variant'],
    ['/verificar?categoria=Restaurantes', '/verificar category variant'],
    ['/verificar?accion=opinar', '/verificar action variant'],
    ['/caso/nuevo', '/caso/nuevo'],
    [`/caso/nuevo?b=${encodedSlug}`, '/caso/nuevo merchant variant'],
  ]) {
    const { status, body } = await request(path);
    const robots = metaContent(body, 'robots');
    const noindexFollow = Boolean(robots && /noindex/i.test(robots) && /follow/i.test(robots) && !/nofollow/i.test(robots));
    record(
      `${label} emits crawlable noindex`,
      status === 200 && noindexFollow,
      `GET ${path} → ${status}, robots="${robots}"`,
    );
  }

  const opinion = await request(opinionPath);
  const opinionRobots = metaContent(opinion.body, 'robots');
  record(
    'opinion entry stays indexable',
    opinion.status === 200 && !isNoindex(opinion.body),
    `GET ${opinionPath} → ${opinion.status}, robots="${opinionRobots}"`,
  );
  record(
    'opinion entry self-canonical is the merchant path',
    canonicalHref(opinion.body) === `${ORIGIN}${opinionPath}`,
    `canonical=${canonicalHref(opinion.body)} (expected ${ORIGIN}${opinionPath})`,
  );
  if (merchant.brand_name) {
    const title = titleContent(opinion.body);
    record(
      'opinion entry title identifies the merchant',
      Boolean(title && normalize(title).includes(normalize(merchant.brand_name))),
      `title="${title}" (merchant ${merchant.brand_name})`,
    );
  }
  const opinionWithParams = await request(`${opinionPath}?b=${encodedSlug}&utm_source=smoke`);
  const paramCanonical = canonicalHref(opinionWithParams.body);
  record(
    'incidental parameters normalize without cross-canonicalizing to the passport',
    paramCanonical === `${ORIGIN}${opinionPath}` && paramCanonical !== `${ORIGIN}/b/${slug}`,
    `GET ${opinionPath}?b=…&utm_source=smoke → canonical=${paramCanonical} (passport ${ORIGIN}/b/${slug})`,
  );

  const passport = await request(`/b/${encodedSlug}`);
  record(
    'public passport remains indexable',
    passport.status === 200 && !isNoindex(passport.body) && canonicalHref(passport.body) === `${ORIGIN}/b/${slug}`,
    `GET /b/${slug} → ${passport.status}, robots="${metaContent(passport.body, 'robots')}", canonical=${canonicalHref(passport.body)}`,
  );

  const directory = await request('/directorio');
  record(
    'public directory remains indexable',
    directory.status === 200 && !isNoindex(directory.body) && canonicalHref(directory.body) === `${ORIGIN}/directorio`,
    `GET /directorio → ${directory.status}, robots="${metaContent(directory.body, 'robots')}", canonical=${canonicalHref(directory.body)}`,
  );

  const sitemap = await request('/sitemap.xml');
  const locs = [...sitemap.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
  const paths = locs.map((loc) => new URL(loc).pathname);
  const utilityPaths = paths.filter((path) => /^\/(verificar|caso|escribir-opinion)/.test(path));
  record(
    'sitemap declares no utility variant',
    sitemap.status === 200 && utilityPaths.length === 0,
    `GET /sitemap.xml → ${sitemap.status}, ${locs.length} declared URLs, utility entries: ${utilityPaths.length}`,
  );

  const expectedProfiles = new Set(catalogueSlugs.map((slugValue) => `${ORIGIN}/b/${slugValue}`));
  const actualProfiles = new Set(locs.filter((loc) => new URL(loc).pathname.startsWith('/b/')));
  const missingProfiles = [...expectedProfiles].filter((loc) => !actualProfiles.has(loc));
  const extraProfiles = [...actualProfiles].filter((loc) => !expectedProfiles.has(loc));
  record(
    'sitemap declares exactly the catalogue business passports',
    sitemap.status === 200 && missingProfiles.length === 0 && extraProfiles.length === 0,
    `${actualProfiles.size}/${expectedProfiles.size} passport URLs match the database slug inventory` +
      (missingProfiles.length ? `, missing: ${missingProfiles.slice(0, 3).join(', ')}` : '') +
      (extraProfiles.length ? `, unexpected: ${extraProfiles.slice(0, 3).join(', ')}` : ''),
  );

  const nonProfilePaths = paths.filter((path) => !path.startsWith('/b/'));
  const strayPaths = nonProfilePaths.filter((path) => path !== '/' && !path.startsWith('/directorio'));
  record(
    'sitemap keeps the base routes and only directory-family extras',
    sitemap.status === 200 && paths.includes('/') && paths.includes('/directorio') && strayPaths.length === 0,
    nonProfilePaths.length
      ? `${nonProfilePaths.length} non-passport URLs: ${nonProfilePaths.slice(0, 6).join(', ')}${nonProfilePaths.length > 6 ? ', …' : ''}`
      : 'no non-passport URLs',
  );

  const robotsTxt = await request('/robots.txt');
  const blocked = ['/verificar', '/caso/nuevo', '/escribir-opinion'].filter((path) =>
    new RegExp(`Disallow:\\s*${path}(?:\\s|$)`).test(robotsTxt.body),
  );
  record(
    'robots.txt does not block retrieval of the noindex routes',
    robotsTxt.status === 200 && blocked.length === 0,
    `GET /robots.txt → ${robotsTxt.status}${blocked.length ? `, blocked: ${blocked.join(', ')}` : ', no utility disallow'}`,
  );

  const missing = await request(`/escribir-opinion/smoke-missing-${Date.now()}`);
  record(
    'unknown merchant slug returns 404 without a bogus canonical',
    missing.status === 404 && isNoindex(missing.body) && canonicalHref(missing.body) === null,
    `GET /escribir-opinion/smoke-missing-… → ${missing.status}, robots="${metaContent(missing.body, 'robots')}", canonical=${canonicalHref(missing.body)}`,
  );
} catch (error) {
  console.error(`\nSmoke run aborted: ${error.message}`);
  if (serverLog) console.error(`\n--- dev server output ---\n${serverLog}`);
  stopServer();
  process.exit(1);
} finally {
  stopServer();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error(`Failed: ${failed.map((result) => result.name).join(', ')}`);
  process.exit(1);
}
