#!/usr/bin/env node
/**
 * Route-level smoke test for the Opinio P0 public containment.
 *
 * Boots the app (next dev, no build required) and asserts against the routes it
 * actually serves:
 *   - every public profile / directory / search / review / case / widget page is 410
 *   - the public review, case, search, business and widget APIs are 410
 *   - the holding page is 200, renders no structured data and no rating markup
 *   - the sitemap advertises the holding page only
 *
 * Usage:  node scripts/verify-shutdown.mjs           (SMOKE_PORT=3987 by default)
 * Requires node_modules (pnpm install) in the current checkout.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT || 3987);
const BASE = `http://127.0.0.1:${PORT}`;
const REQUEST_TIMEOUT_MS = 180_000;
const READY_TIMEOUT_MS = 240_000;

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!existsSync(nextBin)) {
  console.error(
    `Cannot find ${nextBin}.\nRun the smoke test from a checkout with dependencies installed (pnpm install).`,
  );
  process.exit(2);
}

const GONE = 410;

/** @type {{name: string, path: string, init?: RequestInit, expect: number}[]} */
const goneChecks = [
  { name: 'public business passport', path: '/b/example' },
  { name: 'public business passport (seeded slug)', path: '/b/locomotion-mx' },
  { name: 'profile open graph image', path: '/b/example/opengraph-image' },
  { name: 'seeded directory', path: '/directorio' },
  { name: 'search / folio validation page', path: '/verificar' },
  { name: 'public review wizard', path: '/escribir-opinion/example' },
  { name: 'public case intake', path: '/caso/nuevo' },
  { name: 'public case portal', path: '/caso/1' },
  { name: 'public trust widget', path: '/widget/ribbon/wgt_example' },
  { name: 'public reviews API (GET)', path: '/api/v1/reviews?business_id=1' },
  { name: 'public reviews API (POST)', path: '/api/v1/reviews', init: { method: 'POST', body: '{}' } },
  { name: 'public review responses API', path: '/api/v1/reviews/1/responses', init: { method: 'POST', body: '{}' } },
  { name: 'public cases API (GET)', path: '/api/v1/cases' },
  { name: 'public cases API (POST)', path: '/api/v1/cases', init: { method: 'POST', body: '{}' } },
  { name: 'public case API (GET)', path: '/api/v1/cases/1' },
  { name: 'public case API (PATCH)', path: '/api/v1/cases/1', init: { method: 'PATCH', body: '{}' } },
  { name: 'public case messages API', path: '/api/v1/cases/1/messages', init: { method: 'POST', body: '{}' } },
  { name: 'public search API', path: '/api/v1/search?q=luuna' },
  { name: 'public business profile API', path: '/api/v1/businesses/luuna' },
  { name: 'public widget API', path: '/api/v1/widgets/wgt_example' },
].map((check) => ({
  ...check,
  expect: GONE,
  init: { ...check.init, headers: { 'content-type': 'application/json' }, redirect: 'manual' },
}));

const results = [];
const server = spawn(process.execPath, [nextBin, 'dev', '--port', String(PORT)], {
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

function snippet(body, index) {
  return body.slice(Math.max(0, index - 30), index + 60).replace(/\s+/g, ' ').trim();
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

try {
  await waitForServer();

  for (const check of goneChecks) {
    const { status, body } = await request(check.path, check.init);
    record(check.name, status === check.expect, `${check.init?.method || 'GET'} ${check.path} → ${status} (expected ${check.expect})`);
    if (status !== check.expect && body) console.log(`      body: ${body.slice(0, 200)}`);
  }

  const home = await request('/');
  const forbiddenOnHome = [
    ['AggregateRating', /aggregateRating/i],
    ['Review markup', /"reviewRating"|ratingValue/],
    ['structured data', /application\/ld\+json/i],
    ['profile link', /href="\/b\//],
    ['search CTA', /Escribir (una )?opini[óo]n/i],
    ['case intake CTA', /Abrir un caso/i],
    ['regulatory record claim', /PROFECO|RFC:|INEGI CLEE/i],
  ];
  const hits = forbiddenOnHome
    .map(([label, pattern]) => [label, home.body.match(pattern)])
    .filter(([, match]) => match);
  record(
    'holding page renders no ratings, structured data or submission path',
    home.status === 200 && hits.length === 0,
    `GET / → ${home.status}${hits.length ? `, forbidden: ${hits.map(([label, match]) => `${label} in "${snippet(home.body, match.index)}"`).join('; ')}` : ', clean'}`,
  );
  record(
    'holding page states the shutdown',
    /fuera de l[íi]nea/i.test(home.body),
    `GET / ${/fuera de l[íi]nea/i.test(home.body) ? 'mentions the shutdown' : 'does not mention the shutdown'}`,
  );

  const sitemap = await request('/sitemap.xml');
  const locs = [...sitemap.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
  record(
    'sitemap advertises the holding page only',
    sitemap.status === 200 && locs.length === 1 && !locs.some((loc) => loc.includes('/b/')),
    `GET /sitemap.xml → ${sitemap.status}, ${locs.length} URL(s)${locs.length ? `: ${locs.join(', ')}` : ''}`,
  );

  const merchant = await request('/merchant');
  record(
    'private merchant panel is not gated by the shutdown',
    merchant.status !== 410,
    `GET /merchant → ${merchant.status} (must not be 410; it needs DATABASE_URL to render)`,
  );

  const llms = await request('/llms.txt');
  const profileLinks = /opinio\.mx\/b\//.test(llms.body);
  record(
    'llms.txt advertises no withdrawn profile',
    llms.status === 200 && !profileLinks,
    `GET /llms.txt → ${llms.status}${profileLinks ? ', still links a profile URL' : ', no profile URLs'}`,
  );

  const missing = await request('/pagina-inexistente-xyz');
  const deadLinks = [/href="\/caso\//, /href="\/verificar/, /href="\/directorio/, /href="\/b\//].filter((pattern) =>
    pattern.test(missing.body),
  );
  record(
    '404 page links to no withdrawn surface',
    missing.status === 404 && deadLinks.length === 0,
    `GET /pagina-inexistente-xyz → ${missing.status}${deadLinks.length ? `, dead links: ${deadLinks.join(', ')}` : ''}`,
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
