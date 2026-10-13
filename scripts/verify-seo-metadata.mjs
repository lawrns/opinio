#!/usr/bin/env node
/**
 * Metadata identity smoke test for issue #4.
 *
 * Boots `next dev` against the ticket database and asserts the served HTML
 * (real HTTP, no source-text assertions):
 *   - the utility families carry purpose titles/descriptions instead of the
 *     homepage fallback, keep the approved noindex policy and never echo query
 *     tokens;
 *   - public passports state the identity and record scope the database holds
 *     (razón social, cobertura/domicilio) without publishing raw street
 *     addresses, and records that share a brand stay distinguishable;
 *   - the passport/case-portal families keep their canonical/indexing policy;
 *   - the private case portal keeps static, purpose-only metadata: no case
 *     number, id, customer name, contact or merchant name.
 *
 * Usage:
 *   DATABASE_URL=postgres://…/opinio_issue_4 SMOKE_PORT=3204 \
 *     node scripts/verify-seo-metadata.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT || 3989);
const BASE = `http://127.0.0.1:${PORT}`;
const REQUEST_TIMEOUT_MS = 180_000;
const READY_TIMEOUT_MS = 240_000;

const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const ORIGIN = (envSiteUrl && !envSiteUrl.includes('fertilitylistings') ? envSiteUrl : 'https://opinio.mx')
  .replace(/\/+$/, '');

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!existsSync(nextBin)) {
  console.error(`Next.js binary not found at ${nextBin}; install dependencies in this worktree first.`);
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (use the ticket database, e.g. …/opinio_issue_4).');
  process.exit(2);
}

const requireFromRoot = createRequire(join(ROOT, 'package.json'));
const { Client } = requireFromRoot('pg');

const UTILITY_TITLES = {
  verificar: 'Buscar y verificar un comercio antes de comprar | Opinio México',
  casoNuevo: 'Registrar un caso de compra | Opinio México',
  casoPortal: 'Seguimiento de caso | Opinio México',
};
const SITE_FALLBACK_TITLE = 'Opinio México — Pasaporte de Confianza Comercial';

const looseKey = (value) => (value || '').normalize('NFC').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '');

/**
 * Reads the catalogue from the database: the records that share a brand (the
 * audit's duplicate-title families) and representative identity/scope samples.
 */
async function loadRecords() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, slug, brand_name, legal_name, category, operating_area
       FROM businesses
       WHERE slug IS NOT NULL AND BTRIM(slug) <> ''
       ORDER BY slug ASC`,
    );
    if (rows.length === 0) {
      console.error('No business rows in the database; cannot smoke-test passport metadata.');
      process.exit(2);
    }

    const groups = new Map();
    for (const row of rows) {
      const key = looseKey(row.brand_name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const sameBrandGroups = [...groups.values()].filter((members) => members.length > 1);

    const hasLegalName = (row) => Boolean(row.legal_name && row.legal_name.trim());
    const areaOf = (row) => (row.operating_area || '').trim();
    // "City, State" values are the informative compact places in this catalogue;
    // source placeholders ("NO PROPORCIONA") are not place samples.
    const placeShape = /^[^,\d]+,\s*[^,\d]+$/;
    const samples = {
      identityAddress: rows.find((row) => hasLegalName(row) && /\d/.test(areaOf(row)) && !/nacional/i.test(areaOf(row))),
      identityPlace: rows.find((row) => hasLegalName(row) && placeShape.test(areaOf(row)) && areaOf(row).length <= 40),
      nationalNoIdentity: rows.find((row) => !hasLegalName(row) && /nacional/i.test(areaOf(row))),
    };

    return { rows, sameBrandGroups, samples };
  } finally {
    await client.end();
  }
}

const { rows: catalogue, sameBrandGroups, samples } = await loadRecords();

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

function decodeEntities(value) {
  return (value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'name') === name) return decodeEntities(attribute(tag, 'content'));
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
  return match ? decodeEntities(match[1]) : null;
}

function descriptionContent(html) {
  return metaContent(html, 'description');
}

function headMetadata(html) {
  const head = html.match(/<head\b[\s\S]*?<\/head>/i);
  return head ? decodeEntities(head[0]) : '';
}

function isNoindex(html) {
  const content = metaContent(html, 'robots');
  return Boolean(content && /noindex/i.test(content));
}

function hasCrawlableNoindex(html) {
  const content = metaContent(html, 'robots');
  return Boolean(content && /noindex/i.test(content) && /follow/i.test(content) && !/nofollow/i.test(content));
}

async function deleteVerificationCase(client, caseId) {
  await client.query('DELETE FROM case_messages WHERE case_id = $1', [caseId]);
  await client.query('DELETE FROM resolution_cases WHERE id = $1', [caseId]);
}

try {
  await waitForServer();
  console.log(`\nMetadata smoke on ${BASE} · origin ${ORIGIN} · ${catalogue.length} catalogue records\n`);

  const homepage = await request('/');
  const fallbackTitle = titleContent(homepage.body) ?? SITE_FALLBACK_TITLE;

  // 1. Utility families: purpose metadata, approved noindex policy, no query echo.
  const utilityPaths = [
    ['/verificar', 'search route'],
    ['/verificar?q=luuna', 'search query variant'],
    ['/verificar?categoria=Restaurantes&accion=opinar', 'search filter variant'],
    ['/caso/nuevo', 'case-entry route'],
    [`/caso/nuevo?b=${encodeURIComponent(catalogue[0].slug)}`, 'case-entry merchant variant'],
  ];
  for (const [path, label] of utilityPaths) {
    const { status, body } = await request(path);
    const title = titleContent(body);
    const description = descriptionContent(body);
    const expected = path.startsWith('/verificar') ? UTILITY_TITLES.verificar : UTILITY_TITLES.casoNuevo;
    record(
      `${label} serves its working-function title`,
      status === 200 && title === expected && title !== fallbackTitle,
      `GET ${path} → ${status}, title="${title}"`,
    );
    record(
      `${label} keeps purpose description and noindex policy`,
      status === 200 && Boolean(description && description !== metaContent(homepage.body, 'description')) && hasCrawlableNoindex(body),
      `description="${description}", robots="${metaContent(body, 'robots')}"`,
    );
  }

  const tokenSearch = await request('/verificar?q=SmokeTokenXYZ&utm_source=smoke');
  const tokenTitle = `${titleContent(tokenSearch.body)} ${descriptionContent(tokenSearch.body)}`;
  record(
    'search query tokens never reach the utility metadata',
    !/SmokeTokenXYZ/i.test(tokenTitle),
    `GET /verificar?q=SmokeTokenXYZ → title/description without the token`,
  );

  // 2. Passport identity: the served metadata reflects the stored record facts.
  if (samples.identityAddress) {
    const row = samples.identityAddress;
    const { status, body } = await request(`/b/${encodeURIComponent(row.slug)}`);
    const title = titleContent(body) ?? '';
    const description = descriptionContent(body) ?? '';
    const area = (row.operating_area || '').trim();
    record(
      'specific-scope passport states identity and domicile without publishing the street',
      status === 200 &&
        title.includes(row.brand_name) &&
        description.includes(row.legal_name.trim()) &&
        !title.includes(area) &&
        !description.includes(area),
      `/b/${row.slug} → title="${title}"`,
    );
  } else {
    record('specific-scope passport sample available', false, 'no record with razón social + street address in this database');
  }

  if (samples.identityPlace) {
    const row = samples.identityPlace;
    const { body } = await request(`/b/${encodeURIComponent(row.slug)}`);
    const title = titleContent(body) ?? '';
    const area = (row.operating_area || '').trim();
    record(
      'place-scope passport states the recorded coverage',
      title.includes(area) && descriptionContent(body)?.includes(row.legal_name.trim()) === true,
      `/b/${row.slug} → title="${title}"`,
    );
  } else {
    record('place-scope passport sample available', false, 'no record with razón social + compact place in this database');
  }

  if (samples.nationalNoIdentity) {
    const row = samples.nationalNoIdentity;
    const { body } = await request(`/b/${encodeURIComponent(row.slug)}`);
    const title = titleContent(body) ?? '';
    const description = descriptionContent(body) ?? '';
    record(
      'passport without published identity claims none and keeps national scope',
      title.includes('cobertura nacional') && !/razón social/i.test(description) && description.length > 0,
      `/b/${row.slug} → title="${title}", description="${description}"`,
    );
  } else {
    record('national no-identity passport sample available', false, 'no such record in this database');
  }

  // 3. Same-brand records: every group stays distinguishable over HTTP.
  const groupReport = [];
  let groupsDistinct = true;
  for (const members of sameBrandGroups) {
    const served = [];
    for (const member of members) {
      const { status, body } = await request(`/b/${encodeURIComponent(member.slug)}`);
      if (status !== 200) {
        groupsDistinct = false;
        groupReport.push(`${member.slug}: HTTP ${status}`);
        continue;
      }
      served.push({
        slug: member.slug,
        title: looseKey(titleContent(body)),
        description: looseKey(descriptionContent(body)),
        rawTitle: titleContent(body),
      });
    }
    const titles = new Set(served.map((entry) => entry.title));
    const descriptions = new Set(served.map((entry) => entry.description));
    const brandOk = served.every((entry) => entry.rawTitle?.includes(members.find((m) => m.slug === entry.slug).brand_name));
    const distinct = titles.size === served.length && descriptions.size === served.length && brandOk;
    if (!distinct) groupsDistinct = false;
    groupReport.push(`${served.map((entry) => entry.slug).join(' / ')}${distinct ? '' : ' ← COLLISION'}`);
  }
  record(
    `same-brand records stay distinguishable (${sameBrandGroups.length} groups)`,
    sameBrandGroups.length > 0 && groupsDistinct,
    groupReport.join('; '),
  );

  // 4. Indexing/canonical policy of the touched families is unchanged.
  const passportSlug = catalogue[0].slug;
  const passport = await request(`/b/${encodeURIComponent(passportSlug)}`);
  record(
    'passport stays indexable with a self-canonical',
    passport.status === 200 &&
      !isNoindex(passport.body) &&
      canonicalHref(passport.body) === `${ORIGIN}/b/${passportSlug}` &&
      titleContent(passport.body) !== fallbackTitle,
    `/b/${passportSlug} → robots="${metaContent(passport.body, 'robots')}", canonical=${canonicalHref(passport.body)}`,
  );

  const directory = await request('/directorio');
  record(
    'directory stays indexable with its canonical',
    directory.status === 200 && !isNoindex(directory.body) && canonicalHref(directory.body) === `${ORIGIN}/directorio`,
    `/directorio → ${directory.status}, canonical=${canonicalHref(directory.body)}`,
  );

  const missing = await request(`/b/smoke-missing-${Date.now()}`);
  record(
    'unknown passport slug still returns 404 without a canonical',
    missing.status === 404 && canonicalHref(missing.body) === null,
    `GET /b/smoke-missing-… → ${missing.status}, canonical=${canonicalHref(missing.body)}`,
  );

  // 5. Private case portal: static purpose metadata only (locally created row).
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let caseId = null;
  try {
    const before = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    const customerName = 'Smoke Verificación';
    const customerContact = 'smoke-verificacion@example.invalid';
    const created = await request('/api/v1/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        business_id: catalogue[0].id ?? undefined,
        customer_name: customerName,
        customer_contact: customerContact,
        issue_category: 'delay',
        customer_requested_remedy: 'Reembolso del pedido',
        initial_message: 'Mensaje local de verificación de metadata; se elimina al terminar.',
      }),
    });
    const payload = created.status === 201 ? JSON.parse(created.body) : null;
    caseId = payload?.case?.id ?? null;
    if (!caseId) {
      record('local verification case created through the public intake API', false, `POST /api/v1/cases → ${created.status} ${created.body.slice(0, 200)}`);
    } else {
      record(
        'local verification case created through the public intake API',
        true,
        `case ${payload.case.case_number} (id ${caseId}) in the ticket database`,
      );
      const portal = await request(`/caso/${caseId}`);
      const head = headMetadata(portal.body);
      const leaked = [customerName, customerContact, payload.case.case_number, `OP-${String(caseId).padStart(6, '0')}`]
        .filter((value) => value && head.includes(value));
      const portalDescription = descriptionContent(portal.body) ?? '';
      record(
        'case portal metadata is static and leaks no case, customer or merchant data',
        portal.status === 200 &&
          titleContent(portal.body) === UTILITY_TITLES.casoPortal &&
          !/razón social|cobertura|domicilio/i.test(portalDescription) &&
          leaked.length === 0,
        `/caso/${caseId} → title="${titleContent(portal.body)}"${leaked.length ? `, leaked: ${leaked.join(', ')}` : ', no identifiers in <head>'}`,
      );
      await deleteVerificationCase(client, caseId);
      caseId = null;
    }
    const after = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    record(
      'verification case removed (pre/post counts)',
      before.rows[0].count === after.rows[0].count,
      `resolution_cases ${before.rows[0].count} → ${after.rows[0].count}`,
    );
  } finally {
    if (caseId) await deleteVerificationCase(client, caseId);
    const final = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    console.log(`\nresolution_cases after cleanup: ${final.rows[0].count}`);
    await client.end();
  }
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
