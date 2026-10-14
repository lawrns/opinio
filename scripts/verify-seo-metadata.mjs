#!/usr/bin/env node
/**
 * Metadata identity smoke test for issue #4.
 *
 * Boots `next dev` against the ticket database and asserts the served HTML
 * (real HTTP, no source-text assertions):
 *   - the utility families carry purpose titles/descriptions instead of the
 *     homepage fallback, keep the approved noindex policy and never echo query
 *     tokens;
 *   - public passports state the record's own facts — razón social or catalogue
 *     category and the recorded scope quoted verbatim from `operating_area` —
 *     never a coverage/domicile classification invented from the value's shape,
 *     and source placeholders are omitted rather than published;
 *   - records that share a brand stay distinguishable, and the passport/case
 *     portal families keep their canonical/indexing policy;
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
// Approved directory identity (issue #4): no hardcoded catalogue count and no
// verification claim; head metadata, share copy and the CollectionPage node
// state the same strings.
const DIRECTORY_IDENTITY = 'Directorio de tiendas en línea y comercios de México';
const DIRECTORY_TITLE = `${DIRECTORY_IDENTITY} | Opinio México`;
const DIRECTORY_DESCRIPTION = 'Consulta el directorio de tiendas en línea y comercios de México y accede a sus pasaportes con información registrada, fuentes y opiniones disponibles.';
const SITE_FALLBACK_TITLE = 'Opinio México — Pasaporte de Confianza Comercial';
// Sample selector only: values that announce themselves as source placeholders
// are not scope samples (the assertion below still checks the served page).
const SOURCE_PLACEHOLDER = /^(no proporciona|sin datos|no disponible|datos por sucursal|consultar)/i;

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

function ogContent(html, property) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'property') === property) return decodeEntities(attribute(tag, 'content'));
  }
  return null;
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
      `/b/${samples.placeholderScope.slug} → title="${title}", description="${description}"`,
    );
  } else {
    record('passport sample with a non-informative source value available', false, 'no such record in this database');
  }

  if (samples.noIdentity) {
    const row = samples.noIdentity;
    const category = (row.category || '').trim();
    const { status, body } = await request(`/b/${encodeURIComponent(row.slug)}`);
    const title = titleContent(body) ?? '';
    const description = descriptionContent(body) ?? '';
    record(
      'passport without a published razón social states the catalogue category instead',
      status === 200 &&
        title.includes(row.brand_name) &&
        Boolean(category) &&
        title.includes(category) &&
        !/razón social/i.test(description) &&
        description.length > 0,
      `/b/${row.slug} → title="${title}", description="${description}"`,
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
  const directoryTitle = titleContent(directory.body);
  const directoryDescription = descriptionContent(directory.body);
  record(
    'directory serves the accepted purpose identity without a catalogue count or audit claim',
    directory.status === 200 &&
      directoryTitle === DIRECTORY_TITLE &&
      directoryDescription === DIRECTORY_DESCRIPTION &&
      !/1,199|auditad/i.test(headMetadata(directory.body)),
    `/directorio → title="${directoryTitle}", description="${directoryDescription}"`,
  );
  record(
    'directory stays indexable with its canonical',
    directory.status === 200 && !isNoindex(directory.body) && canonicalHref(directory.body) === `${ORIGIN}/directorio`,
    `/directorio → ${directory.status}, canonical=${canonicalHref(directory.body)}`,
  );
  record(
    'directory share copy matches the accepted identity',
    ogContent(directory.body, 'og:title') === DIRECTORY_TITLE &&
      ogContent(directory.body, 'og:description') === DIRECTORY_DESCRIPTION,
    `og:title="${ogContent(directory.body, 'og:title')}"`,
  );
  const directoryCollection = collectionPageNode(directory.body);
  record(
    'directory CollectionPage metadata states the same identity',
    Boolean(directoryCollection && directoryCollection.name === DIRECTORY_TITLE && directoryCollection.description === DIRECTORY_DESCRIPTION),
    directoryCollection ? `CollectionPage name="${directoryCollection.name}"` : 'no CollectionPage node served',
  );

  const directoryPage2 = await request('/directorio?page=2');
  const page2Title = titleContent(directoryPage2.body);
  record(
    'directory page 2 carries a page-scoped identity',
    directoryPage2.status === 200 &&
      page2Title === `${DIRECTORY_IDENTITY} — página 2 | Opinio México` &&
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
  const missingMetadata = `${titleContent(missing.body)} ${descriptionContent(missing.body)}`;
  record(
    'unknown passport slug returns 404 without a canonical and without an imaginary validation process',
    missing.status === 404 &&
      canonicalHref(missing.body) === null &&
      !/validación|en proceso|proceso de/i.test(missingMetadata),
    `GET /b/smoke-missing-… → ${missing.status}, canonical=${canonicalHref(missing.body)}, title="${titleContent(missing.body)}"`,
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
        business_id: catalogue[0].id,
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
          !/razón social|ámbito|cobertura|domicilio/i.test(portalDescription) &&
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
