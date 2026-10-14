#!/usr/bin/env node
/**
 * Metadata identity smoke test for issue #4.
 *
 * Boots `next dev` against the ticket database and asserts the served HTML
 * (real HTTP, no source-text assertions and no rendered-copy constants):
 *   - the utility families no longer serve the homepage fallback metadata, keep
 *     the approved noindex policy, stay distinguishable from each other and
 *     never echo query tokens;
 *   - public passports state the record's own facts — razón social or catalogue
 *     category and the recorded scope quoted verbatim from `operating_area` —
 *     never a coverage/domicile classification invented from the value's shape,
 *     and source placeholders are omitted rather than published;
 *   - records that share a brand stay distinguishable, and the passport/case
 *     portal families keep their canonical/indexing policy;
 *   - the private case portal serves identical, purpose-only metadata for two
 *     different cases: no case number, id, customer name, contact or merchant
 *     name.
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

// Sample selector only: values that announce themselves as source placeholders
// are not scope samples (the assertions still check the served page).
const SOURCE_PLACEHOLDER = /^(no proporciona|sin datos|no disponible|datos por sucursal|consultar)/i;
// A hardcoded catalogue count (for example "1,199+") and the audit claim are the
// stale directory wording the ticket removed.
const HARDCODED_COUNT = /\d[.,]\d{3}/;
const AUDIT_CLAIM = /auditad/i;

const looseKey = (value) => (value || '').normalize('NFC').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '');

/**
 * Reads the catalogue from the database: the records that share a brand (the
 * audit's duplicate-title families) and one representative per inventory class
 * of the recorded scope.
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

    const areaOf = (row) => (row.operating_area || '').trim();
    const documented = rows.filter((row) => areaOf(row) && !SOURCE_PLACEHOLDER.test(areaOf(row)));
    const samples = {
      documentedLong: documented.find((row) => areaOf(row).length > 60),
      documentedShort: documented.find((row) => areaOf(row).length <= 40),
      placeholderScope: rows.find((row) => SOURCE_PLACEHOLDER.test(areaOf(row))),
      noIdentity: rows.find((row) => !(row.legal_name || '').trim()),
    };

    return { rows, sameBrandGroups: [...groups.values()].filter((members) => members.length > 1), samples };
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

function ogContent(html, property) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'property') === property) return decodeEntities(attribute(tag, 'content'));
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

function collectionPageNode(html) {
  for (const block of html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || []) {
    const json = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>\s*$/i, '');
    try {
      const parsed = JSON.parse(json);
      const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      const node = graph.find((entry) => entry?.['@type'] === 'CollectionPage');
      if (node) return node;
    } catch {
      // ignore script blocks that are not JSON
    }
  }
  return null;
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

async function createVerificationCase(client, businessId, name, contact) {
  const created = await request('/api/v1/cases', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      customer_name: name,
      customer_contact: contact,
      issue_category: 'delay',
      customer_requested_remedy: 'Reembolso del pedido',
      initial_message: 'Mensaje local de verificación de metadata; se elimina al terminar.',
    }),
  });
  const payload = created.status === 201 ? JSON.parse(created.body) : null;
  if (!payload?.case?.id) {
    throw new Error(`POST /api/v1/cases → ${created.status} ${created.body.slice(0, 200)}`);
  }
  return payload.case;
}

try {
  await waitForServer();
  console.log(`\nMetadata smoke on ${BASE} · origin ${ORIGIN} · ${catalogue.length} catalogue records\n`);

  // The homepage keeps the site's own identity; no utility family may serve it.
  const homepage = await request('/');
  const homepageTitle = titleContent(homepage.body);
  const homepageDescription = descriptionContent(homepage.body);

  // 1. Utility families: own purpose metadata, approved noindex policy, no query echo.
  const utilityPaths = [
    ['/verificar', 'search route'],
    ['/verificar?q=luuna', 'search query variant'],
    ['/verificar?categoria=Restaurantes&accion=opinar', 'search filter variant'],
    ['/caso/nuevo', 'case-entry route'],
    [`/caso/nuevo?b=${encodeURIComponent(catalogue[0].slug)}`, 'case-entry merchant variant'],
  ];
  const familyTitles = { search: new Set(), caseEntry: new Set() };
  for (const [path, label] of utilityPaths) {
    const { status, body } = await request(path);
    const title = titleContent(body);
    const description = descriptionContent(body);
    (path.startsWith('/verificar') ? familyTitles.search : familyTitles.caseEntry).add(title);

    record(
      `${label} does not serve the homepage fallback metadata`,
      status === 200 && Boolean(title) && title !== homepageTitle,
      `GET ${path} → ${status}, title="${title}"`,
    );
    record(
      `${label} keeps its own description and noindex policy`,
      status === 200 && Boolean(description) && description !== homepageDescription && hasCrawlableNoindex(body),
      `robots="${metaContent(body, 'robots')}"`,
    );
  }
  record(
    'the utility families stay distinguishable from each other',
    familyTitles.search.size === 1 && familyTitles.caseEntry.size === 1 &&
      [...familyTitles.search][0] !== [...familyTitles.caseEntry][0],
    `search="${[...familyTitles.search][0]}" · case entry="${[...familyTitles.caseEntry][0]}"`,
  );

  const tokenSearch = await request('/verificar?q=SmokeTokenXYZ&utm_source=smoke');
  record(
    'search query tokens never reach the utility metadata',
    !/SmokeTokenXYZ/i.test(`${titleContent(tokenSearch.body)} ${descriptionContent(tokenSearch.body)}`),
    'GET /verificar?q=SmokeTokenXYZ → title/description without the token',
  );

  // 2. Passport identity: the served metadata quotes the stored record facts.
  for (const [sample, label] of [
    [samples.documentedLong, 'long recorded scope'],
    [samples.documentedShort, 'short recorded scope'],
  ]) {
    if (!sample) {
      record(`passport sample for the ${label} available`, false, 'no such record in this database');
      continue;
    }
    const area = (sample.operating_area || '').trim();
    const { status, body } = await request(`/b/${encodeURIComponent(sample.slug)}`);
    const title = titleContent(body) ?? '';
    const description = descriptionContent(body) ?? '';
    const withoutSourceValue = `${title} ${description}`.split(area).join('');
    record(
      `passport with a ${label} quotes it verbatim without a classification`,
      status === 200 && title.includes(area) && description.includes(area) && !/cobertura|domicilio/i.test(withoutSourceValue),
      `/b/${sample.slug} → title="${title}"`,
    );
  }

  if (samples.placeholderScope) {
    const area = (samples.placeholderScope.operating_area || '').trim();
    const { status, body } = await request(`/b/${encodeURIComponent(samples.placeholderScope.slug)}`);
    const title = titleContent(body) ?? '';
    const description = descriptionContent(body) ?? '';
    record(
      'passport omits a non-informative source value instead of stating a scope',
      status === 200 &&
        !title.includes(area) &&
        !description.includes(area) &&
        !/ámbito|cobertura|domicilio/i.test(`${title} ${description}`),
      `/b/${samples.placeholderScope.slug} → title="${title}"`,
    );
  } else {
    record('passport sample with a non-informative source value available', false, 'no such record in this database');
  }

  if (samples.noIdentity) {
    const row = samples.noIdentity;
    const { status, body } = await request(`/b/${encodeURIComponent(row.slug)}`);
    const description = descriptionContent(body) ?? '';
    record(
      'passport without a published razón social claims none',
      status === 200 && description.length > 0 && !/razón social/i.test(description),
      `/b/${row.slug} → description="${description}"`,
    );
  } else {
    record('passport sample without a published razón social available', false, 'no such record in this database');
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
      served.push({ slug: member.slug, title: looseKey(titleContent(body)), description: looseKey(descriptionContent(body)) });
    }
    const titles = new Set(served.map((entry) => entry.title));
    const descriptions = new Set(served.map((entry) => entry.description));
    const distinct = titles.size === served.length && descriptions.size === served.length;
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
    'passport stays indexable with a self-canonical and its own title',
    passport.status === 200 &&
      !isNoindex(passport.body) &&
      canonicalHref(passport.body) === `${ORIGIN}/b/${passportSlug}` &&
      titleContent(passport.body) !== homepageTitle,
    `/b/${passportSlug} → robots="${metaContent(passport.body, 'robots')}", canonical=${canonicalHref(passport.body)}`,
  );

  // 5. Directory: purpose identity without the stale count/audit claim, the same
  //    identity across head, share copy and the CollectionPage node, and #5's
  //    page-aware canonical contract.
  const directory = await request('/directorio');
  const directoryTitle = titleContent(directory.body);
  const directoryDescription = descriptionContent(directory.body);
  const directoryHead = headMetadata(directory.body);
  record(
    'directory states a purpose identity without a catalogue count or audit claim',
    directory.status === 200 &&
      Boolean(directoryTitle) &&
      Boolean(directoryDescription) &&
      !HARDCODED_COUNT.test(directoryHead) &&
      !AUDIT_CLAIM.test(directoryHead),
    `/directorio → title="${directoryTitle}"`,
  );
  const directoryCollection = collectionPageNode(directory.body);
  record(
    'directory states the same identity in head, share copy and structured data',
    ogContent(directory.body, 'og:title') === directoryTitle &&
      ogContent(directory.body, 'og:description') === directoryDescription &&
      directoryCollection?.name === directoryTitle &&
      directoryCollection?.description === directoryDescription,
    directoryCollection ? `CollectionPage name="${directoryCollection.name}"` : 'no CollectionPage node served',
  );
  record(
    'directory stays indexable with its canonical',
    directory.status === 200 && !isNoindex(directory.body) && canonicalHref(directory.body) === `${ORIGIN}/directorio`,
    `/directorio → canonical=${canonicalHref(directory.body)}`,
  );

  const directoryPage2 = await request('/directorio?page=2');
  const page2Title = titleContent(directoryPage2.body) ?? '';
  record(
    'directory page 2 carries a page-scoped identity',
    directoryPage2.status === 200 &&
      page2Title !== directoryTitle &&
      /\b2\b/.test(page2Title) &&
      canonicalHref(directoryPage2.body) === `${ORIGIN}/directorio?page=2`,
    `/directorio?page=2 → ${directoryPage2.status}, title="${page2Title}", canonical=${canonicalHref(directoryPage2.body)}`,
  );
  const directoryPage2Params = await request('/directorio?page=2&utm_source=smoke');
  record(
    'incidental directory parameters are not serialized into the canonical',
    canonicalHref(directoryPage2Params.body) === `${ORIGIN}/directorio?page=2`,
    `/directorio?page=2&utm_source=smoke → canonical=${canonicalHref(directoryPage2Params.body)}`,
  );

  const missing = await request(`/b/smoke-missing-${Date.now()}`);
  record(
    'unknown passport slug returns 404 without a canonical and without an imaginary validation process',
    missing.status === 404 &&
      canonicalHref(missing.body) === null &&
      !/validación|en proceso|proceso de/i.test(`${titleContent(missing.body)} ${descriptionContent(missing.body)}`),
    `GET /b/smoke-missing-… → ${missing.status}, canonical=${canonicalHref(missing.body)}`,
  );

  // 6. Private case portal: identical, purpose-only metadata for different cases.
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const caseIds = [];
  try {
    const before = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    const first = await createVerificationCase(client, catalogue[0].id, 'Smoke Verificación Uno', 'smoke-uno@example.invalid');
    caseIds.push(first.id);
    const second = await createVerificationCase(client, catalogue[0].id, 'Smoke Verificación Dos', 'smoke-dos@example.invalid');
    caseIds.push(second.id);
    record(
      'local verification cases created through the public intake API',
      true,
      `cases ${first.case_number} and ${second.case_number} in the ticket database`,
    );

    const portals = [];
    for (const [index, caseRow] of [first, second].entries()) {
      const portal = await request(`/caso/${caseRow.id}`);
      const head = headMetadata(portal.body);
      const leaked = [caseRow.case_number, `OP-${String(caseRow.id).padStart(6, '0')}`,
        index === 0 ? 'Smoke Verificación Uno' : 'Smoke Verificación Dos',
        index === 0 ? 'smoke-uno@example.invalid' : 'smoke-dos@example.invalid',
        catalogue[0].brand_name,
      ].filter((value) => value && head.includes(value));
      portals.push({
        status: portal.status,
        title: titleContent(portal.body),
        description: descriptionContent(portal.body),
        leaked,
      });
    }
    record(
      'case portal metadata is identical for different cases (static, purpose-only)',
      portals.every((portal) => portal.status === 200 && portal.title && portal.description) &&
        portals[0].title === portals[1].title &&
        portals[0].description === portals[1].description,
      `titles "${portals[0].title}" / "${portals[1].title}"`,
    );
    record(
      'case portal metadata leaks no case, customer or merchant data',
      portals.every((portal) => portal.leaked.length === 0 && !/razón social|ámbito|cobertura|domicilio/i.test(portal.description)),
      portals.flatMap((portal) => portal.leaked).join(', ') || 'no identifiers in <head>',
    );

    for (const caseId of caseIds) await deleteVerificationCase(client, caseId);
    caseIds.length = 0;
    const after = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    record(
      'verification cases removed (pre/post counts)',
      before.rows[0].count === after.rows[0].count,
      `resolution_cases ${before.rows[0].count} → ${after.rows[0].count}`,
    );
  } finally {
    for (const caseId of caseIds) await deleteVerificationCase(client, caseId);
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
