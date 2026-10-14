#!/usr/bin/env node
/**
 * Share-preview regression for issue #10 (JEV-023).
 *
 * Boots `next dev` against the ticket database with the public site origin
 * pointed at its own loopback port, then asserts the served HTML of every
 * supported public family (real HTTP, no source-text assertions):
 *   - the preview reuses the family's reviewed title/description identity
 *     (homepage, directory, passport, search, case entry, opinion entry);
 *   - every family emits a usable public preview image: an absolute URL on the
 *     public origin that really answers 200 with an image content type and
 *     decodes to real dimensions (the emitted URL is fetched, not assumed);
 *   - the URL identity is the page's own canonical or its purpose URL, and no
 *     query token, merchant parameter, form value, case identifier or widget
 *     token ever reaches an Open Graph/Twitter attribute;
 *   - the private surfaces (case portal, merchant shell, widget embeds) emit no
 *     private identifier in their share attributes;
 *   - the approved indexing policy is preserved while the previews are added
 *     (search/case-entry noindex but crawlable, opinion entry indexable with
 *     its merchant self-canonical, passport/directory indexable).
 *
 * Usage:
 *   DATABASE_URL=postgres://…/opinio_issue_10 SMOKE_PORT=3210 \
 *     node scripts/verify-share-previews.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT || 3991);
const BASE = `http://127.0.0.1:${PORT}`;
const REQUEST_TIMEOUT_MS = 180_000;
const READY_TIMEOUT_MS = 240_000;

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
if (!existsSync(nextBin)) {
  console.error(`Next.js binary not found at ${nextBin}; install dependencies in this worktree first.`);
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (use the ticket database, e.g. …/opinio_issue_10).');
  process.exit(2);
}

const requireFromRoot = createRequire(join(ROOT, 'package.json'));
const { Client } = requireFromRoot('pg');

// Safety contract for this harness: it creates and deletes one verification case,
// so it only runs against the isolated local runtime — a loopback host and a
// private ticket database. A production credential passed through DATABASE_URL
// exits here before any connection is attempted (no remote probe) and before the
// dev server starts.
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const PRIVATE_DATABASE = /^opinio_issue_[a-z0-9_]+$/;

const results = [];
const devArgs = (process.env.NEXT_DEV_ARGS ?? '--webpack').split(/\s+/).filter(Boolean);
// The public site origin is pinned to this harness's own loopback port so every
// absolute URL the app emits (canonical, og:url, og:image) is inside this run:
// the emitted image URL is then really fetched instead of assumed.
const server = spawn(process.execPath, [nextBin, 'dev', ...devArgs, '-H', '127.0.0.1', '--port', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SITE_URL: BASE },
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
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error(`dev server did not answer on ${BASE} within ${READY_TIMEOUT_MS / 1000}s`);
}

const decodeEntities = (value) =>
  (value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'name') === name) return attribute(tag, 'content');
  }
  return null;
}

function propContent(html, property) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (attribute(tag, 'property') === property) return attribute(tag, 'content');
  }
  return null;
}

/** Every Open Graph/Twitter attribute the page emits, keyed by property/name. */
function shareAttributes(html) {
  const attributes = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const property = attribute(tag, 'property');
    const name = attribute(tag, 'name');
    const key = property || name;
    if (!key || !/^(og:|twitter:)/.test(key)) continue;
    attributes.push({ key, value: attribute(tag, 'content') ?? '' });
  }
  return attributes;
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

function isNoindex(html) {
  const content = metaContent(html, 'robots');
  return Boolean(content && /noindex/i.test(content));
}

function isCrawlableNoindex(html) {
  const content = metaContent(html, 'robots');
  return Boolean(content && /noindex/i.test(content) && /follow/i.test(content) && !/nofollow/i.test(content));
}

function pngSize(bytes) {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let index = 2;
  while (index + 9 < bytes.length) {
    if (bytes[index] !== 0xff) {
      index += 1;
      continue;
    }
    const marker = bytes[index + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: bytes.readUInt16BE(index + 5), width: bytes.readUInt16BE(index + 7) };
    }
    index += 2 + bytes.readUInt16BE(index + 2);
  }
  return null;
}

const imageCache = new Map();
/** Really fetches one emitted preview image URL and decodes its surface. */
async function fetchImage(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const check = { url, ok: false, detail: '' };
  try {
    const parsed = new URL(url);
    if (parsed.origin !== BASE) {
      check.detail = `off-origin preview image URL ${parsed.origin}`;
    } else {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const contentType = response.headers.get('content-type') ?? '';
      const bytes = Buffer.from(await response.arrayBuffer());
      const dimensions = pngSize(bytes) || jpegSize(bytes);
      if (response.status !== 200) {
        check.detail = `status ${response.status} (${contentType})`;
      } else if (!/^image\//.test(contentType) || !dimensions) {
        check.detail = `undecodable surface: status 200, content-type "${contentType}", decoded=${Boolean(dimensions)}`;
      } else if (dimensions.width < 600 || dimensions.height < 315) {
        check.detail = `too small for a preview card: ${dimensions.width}x${dimensions.height} (${contentType})`;
      } else {
        check.ok = true;
        check.detail = `200, ${contentType}, ${dimensions.width}x${dimensions.height}`;
      }
    }
  } catch (error) {
    check.detail = String(error);
  }
  imageCache.set(url, check);
  return check;
}

/** Same-origin absolute URL check for a share attribute that must be public. */
function isPublicUrl(value, path) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.origin === BASE && (path ? parsed.pathname === path : true);
  } catch {
    return false;
  }
}

/** Share attributes whose value must be an absolute URL on the public origin. */
const PUBLIC_URL_ATTRIBUTES = new Set(['og:image', 'og:url', 'twitter:image']);

const FORBIDDEN_QUERY_KEYS = /\?(.|\n)*\b(q|b|business|accion|categoria|theme|utm_[a-z]+|case|id)=/i;

async function loadRuntimeSamples() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const { host, database } = client.connectionParameters;
  if (!LOOPBACK_HOSTS.has(host ?? '') || !PRIVATE_DATABASE.test(database ?? '')) {
    console.error(
      `Refusing to run: DATABASE_URL must point at a loopback host (127.0.0.1, ::1 or localhost) ` +
      `and a private opinio_issue_* database; got host="${host}" database="${database}".`,
    );
    process.exit(2);
  }
  await client.connect();
  try {
    const business = await client.query(
      `SELECT id, slug, brand_name FROM businesses
       WHERE slug IS NOT NULL AND BTRIM(slug) <> '' AND brand_name IS NOT NULL AND BTRIM(brand_name) <> ''
       ORDER BY slug ASC LIMIT 1`,
    );
    if (business.rows.length === 0) {
      console.error('No business rows in the database; cannot smoke-test share previews.');
      process.exit(2);
    }
    const widget = await client.query(
      `SELECT token FROM widgets WHERE is_active = true ORDER BY token ASC LIMIT 1`,
    );
    return { business: business.rows[0], widgetToken: widget.rows[0]?.token ?? null };
  } finally {
    await client.end();
  }
}

const { business, widgetToken } = await loadRuntimeSamples();

try {
  await waitForServer();
  console.log(`\nShare previews on ${BASE} (public origin pinned to this run)\n`);

  // 1. Homepage: its own reviewed identity and a fetchable preview image.
  const homepage = await request('/');
  const homepageTitle = titleContent(homepage.body);
  const homepageDescription = descriptionContent(homepage.body);
  record(
    'homepage preview reuses the homepage title/description identity',
    homepage.status === 200 &&
      propContent(homepage.body, 'og:title') === homepageTitle &&
      propContent(homepage.body, 'og:description') === homepageDescription,
    `/ → title "${homepageTitle}" · og:title "${propContent(homepage.body, 'og:title')}"`,
  );
  record(
    'homepage preview URL identity is its own canonical',
    isPublicUrl(propContent(homepage.body, 'og:url')) &&
      propContent(homepage.body, 'og:url') === canonicalHref(homepage.body),
    `og:url=${propContent(homepage.body, 'og:url')} canonical=${canonicalHref(homepage.body)}`,
  );
  const homepageImage = await fetchImage(propContent(homepage.body, 'og:image'));
  record(
    'homepage preview image is a usable public image',
    homepageImage.ok,
    homepageImage.detail,
  );
  record(
    'homepage preview exposes the large-card Twitter identity',
    metaContent(homepage.body, 'twitter:card') === 'summary_large_image' &&
      metaContent(homepage.body, 'twitter:image') === propContent(homepage.body, 'og:image') &&
      metaContent(homepage.body, 'twitter:title') === homepageTitle,
    `twitter:card=${metaContent(homepage.body, 'twitter:card')} twitter:image=${metaContent(homepage.body, 'twitter:image')}`,
  );

  // 2. Directory: purpose identity, page-scoped canonical, no incidental params.
  const directory = await request('/directorio');
  const directoryPage2 = await request('/directorio?page=2');
  const directoryPage2Params = await request('/directorio?page=2&utm_source=smoke&utm_campaign=issue10');
  record(
    'directory page 1 preview keeps the bare purpose identity and canonical',
    directory.status === 200 &&
      propContent(directory.body, 'og:title') === titleContent(directory.body) &&
      propContent(directory.body, 'og:description') === descriptionContent(directory.body) &&
      propContent(directory.body, 'og:url') === `${BASE}/directorio` &&
      canonicalHref(directory.body) === `${BASE}/directorio`,
    `og:url=${propContent(directory.body, 'og:url')} title="${titleContent(directory.body)}"`,
  );
  record(
    'directory page 2 preview self-identifies with the public ordinal only',
    directoryPage2.status === 200 &&
      propContent(directoryPage2.body, 'og:title') === titleContent(directoryPage2.body) &&
      /página 2/.test(propContent(directoryPage2.body, 'og:title') ?? '') &&
      propContent(directoryPage2.body, 'og:url') === `${BASE}/directorio?page=2` &&
      canonicalHref(directoryPage2.body) === `${BASE}/directorio?page=2`,
    `og:title="${propContent(directoryPage2.body, 'og:title')}" og:url=${propContent(directoryPage2.body, 'og:url')}`,
  );
  record(
    'directory preview never serializes incidental parameters',
    directoryPage2Params.status === 200 &&
      propContent(directoryPage2Params.body, 'og:url') === `${BASE}/directorio?page=2` &&
      canonicalHref(directoryPage2Params.body) === `${BASE}/directorio?page=2` &&
      !/utm_/i.test(JSON.stringify(shareAttributes(directoryPage2Params.body))),
    `og:url=${propContent(directoryPage2Params.body, 'og:url')}`,
  );
  const directoryImage = await fetchImage(propContent(directory.body, 'og:image'));
  record('directory preview image is a usable public image', directoryImage.ok, directoryImage.detail);

  // 3. Passport: the accepted record identity (issue #4) and its own card.
  const passport = await request(`/b/${business.slug}`);
  const passportImage = await fetchImage(propContent(passport.body, 'og:image'));
  record(
    'passport preview reuses the accepted record identity and self-canonical',
    passport.status === 200 &&
      propContent(passport.body, 'og:title') === titleContent(passport.body) &&
      propContent(passport.body, 'og:description') === descriptionContent(passport.body) &&
      propContent(passport.body, 'og:title') !== homepageTitle &&
      propContent(passport.body, 'og:url') === `${BASE}/b/${business.slug}` &&
      canonicalHref(passport.body) === `${BASE}/b/${business.slug}`,
    `/b/${business.slug} → titles equal, og:url=${propContent(passport.body, 'og:url')}`,
  );
  record('passport preview image is a usable public image', passportImage.ok, passportImage.detail);
  record(
    'passport preview stays indexable while the utilities are not',
    !isNoindex(passport.body) && !isNoindex(directory.body),
    `robots=${metaContent(passport.body, 'robots')} / ${metaContent(directory.body, 'robots')}`,
  );

  // 4. Search and case-entry utilities: purpose identity for every variant,
  //    public purpose URL, approved noindex/follow policy, no parameter echo.
  const utilityFamilies = [
    {
      label: 'search',
      purposeUrl: `${BASE}/verificar`,
      paths: ['/verificar', '/verificar?q=Luuna', '/verificar?categoria=Restaurantes&accion=opinar'],
    },
    {
      label: 'case entry',
      purposeUrl: `${BASE}/caso/nuevo`,
      paths: ['/caso/nuevo', `/caso/nuevo?b=${encodeURIComponent(business.slug)}`],
    },
  ];
  for (const family of utilityFamilies) {
    const identityFailures = [];
    const imageChecks = [];
    const policyFailures = [];
    for (const path of family.paths) {
      const response = await request(path);
      const ogTitle = propContent(response.body, 'og:title');
      const ogDescription = propContent(response.body, 'og:description');
      const ogUrl = propContent(response.body, 'og:url');
      if (
        response.status !== 200 ||
        ogTitle !== titleContent(response.body) ||
        ogDescription !== descriptionContent(response.body) ||
        ogTitle === homepageTitle ||
        ogUrl !== family.purposeUrl
      ) {
        identityFailures.push(`${path} → ${response.status} og:title="${ogTitle}" og:url=${ogUrl}`);
      }
      imageChecks.push(await fetchImage(propContent(response.body, 'og:image')));
      if (!isCrawlableNoindex(response.body)) {
        policyFailures.push(`${path} → robots="${metaContent(response.body, 'robots')}"`);
      }
    }
    record(
      `${family.label} previews its own purpose identity with the purpose URL on every variant`,
      identityFailures.length === 0,
      identityFailures.join(' | ') || `${family.paths.length} variants share og:title/og:url`,
    );
    record(
      `${family.label} preview image is a usable public image`,
      imageChecks.every((check) => check.ok),
      imageChecks.map((check) => check.detail).join(' | '),
    );
    record(
      `${family.label} variants stay noindex and crawlable`,
      policyFailures.length === 0,
      policyFailures.join(' | ') || family.paths.join(', ') + ' → noindex, follow',
    );
  }

  // 5. Opinion entry: merchant identity, self-canonical (not the passport) and
  //    the same preview surface for its parameter variants.
  const opinionEntry = await request(`/escribir-opinion/${business.slug}`);
  const opinionEntryImage = await fetchImage(propContent(opinionEntry.body, 'og:image'));
  record(
    'opinion entry preview keeps the merchant identity and its self-canonical',
    opinionEntry.status === 200 &&
      propContent(opinionEntry.body, 'og:title') === titleContent(opinionEntry.body) &&
      propContent(opinionEntry.body, 'og:description') === descriptionContent(opinionEntry.body) &&
      propContent(opinionEntry.body, 'og:url') === canonicalHref(opinionEntry.body) &&
      canonicalHref(opinionEntry.body) === `${BASE}/escribir-opinion/${business.slug}` &&
      !isNoindex(opinionEntry.body) &&
      (propContent(opinionEntry.body, 'og:title') ?? '').includes(business.brand_name),
    `/escribir-opinion/${business.slug} → canonical=${canonicalHref(opinionEntry.body)}`,
  );
  record('opinion entry preview image is a usable public image', opinionEntryImage.ok, opinionEntryImage.detail);

  // 6. Privacy: no query token, merchant parameter or form value in any share
  //    attribute of the parameterized public surfaces.
  const parameterCases = [
    ['/verificar?q=SmokeTokenXYZ&utm_source=smoke', 'SmokeTokenXYZ'],
    [`/caso/nuevo?b=${encodeURIComponent(business.slug)}`, business.slug],
    ['/escribir-opinion/does-not-exist?b=x&utm_source=smoke', null],
  ];
  const leaks = [];
  for (const [path, token] of parameterCases) {
    const response = await request(path);
    const attributes = shareAttributes(response.body);
    for (const { key, value } of attributes) {
      if (token && value.toLowerCase().includes(token.toLowerCase())) {
        leaks.push(`${path} ${key}=${value}`);
      }
      if (FORBIDDEN_QUERY_KEYS.test(value)) {
        leaks.push(`${path} ${key}=${value}`);
      }
      if (PUBLIC_URL_ATTRIBUTES.has(key) && value) {
        try {
          if (new URL(value).origin !== BASE) leaks.push(`${path} ${key}=${value}`);
        } catch {
          leaks.push(`${path} ${key}=${value}`);
        }
      }
    }
  }
  record(
    'share attributes never carry query keys, merchant parameters, form values or off-origin URLs',
    leaks.length === 0,
    leaks.join(' | ') || 'no parameter echo and no foreign origin in og:/twitter: attributes',
  );

  // 7. Private surfaces: the case portal (with a real local case), the merchant
  //    shell and a widget embed must not put identifiers into share attributes.
  const privateRoutes = [
    [`/merchant?business=${encodeURIComponent(business.slug)}`, business.slug],
    ...(widgetToken ? [[`/widget/badge/${encodeURIComponent(widgetToken)}`, widgetToken]] : []),
  ];
  const privateLeaks = [];
  for (const [path, token] of privateRoutes) {
    const response = await request(path);
    if (response.status !== 200) {
      privateLeaks.push(`${path} → status ${response.status}`);
      continue;
    }
    for (const { key, value } of shareAttributes(response.body)) {
      if (token && value.toLowerCase().includes(token.toLowerCase())) privateLeaks.push(`${path} ${key}=${value}`);
      if (FORBIDDEN_QUERY_KEYS.test(value)) privateLeaks.push(`${path} ${key}=${value}`);
      // Inherited preview identity must stay on the public origin: a fallback
      // origin (Next's localhost base for file-based metadata images) would
      // serve a preview URL no share target can fetch.
      if (PUBLIC_URL_ATTRIBUTES.has(key) && value) {
        try {
          if (new URL(value).origin !== BASE) privateLeaks.push(`${path} ${key}=${value}`);
        } catch {
          privateLeaks.push(`${path} ${key}=${value}`);
        }
      }
    }
  }
  record(
    'private merchant/widget surfaces expose no private identifier in share attributes',
    privateLeaks.length === 0,
    privateLeaks.join(' | ') || `${privateRoutes.map(([path]) => path).join(', ')} leak-free`,
  );

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let caseId = null;
  try {
    const before = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    const created = await request('/api/v1/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        customer_name: 'Smoke share preview',
        customer_contact: 'share-preview@example.invalid',
        issue_category: 'delay',
        customer_requested_remedy: 'Reembolso del pedido',
        initial_message: 'Caso local de verificación de previews; se elimina al terminar.',
      }),
    });
    const payload = created.status === 201 ? JSON.parse(created.body) : null;
    caseId = payload?.case?.id ?? null;
    if (!caseId) throw new Error(`POST /api/v1/cases → ${created.status} ${created.body.slice(0, 200)}`);

    const portal = await request(`/caso/${caseId}`);
    const portalAttributes = shareAttributes(portal.body);
    const portalLeaks = [payload.case.case_number, `OP-${String(caseId).padStart(6, '0')}`,
      'Smoke share preview', 'share-preview@example.invalid', business.brand_name,
    ].filter((value) => value && portalAttributes.some(({ value: attributeValue }) => attributeValue.includes(value)));
    const portalOffOrigin = portalAttributes
      .filter(({ key, value }) => PUBLIC_URL_ATTRIBUTES.has(key) && value)
      .filter(({ value }) => {
        try {
          return new URL(value).origin !== BASE;
        } catch {
          return true;
        }
      })
      .map(({ key, value }) => `${key}=${value}`);
    record(
      'case portal share attributes carry no case, customer or merchant identifier',
      portal.status === 200 && portalLeaks.length === 0 && portalOffOrigin.length === 0,
      portalLeaks.concat(portalOffOrigin).join(', ') || `/caso/${caseId} → no identifiers, public-origin preview in og:/twitter: attributes`,
    );

    await client.query('DELETE FROM case_messages WHERE case_id = $1', [caseId]);
    await client.query('DELETE FROM resolution_cases WHERE id = $1', [caseId]);
    caseId = null;
    const after = await client.query('SELECT COUNT(*)::int AS count FROM resolution_cases');
    record(
      'verification case removed (pre/post counts)',
      before.rows[0].count === after.rows[0].count,
      `resolution_cases ${before.rows[0].count} → ${after.rows[0].count}`,
    );
  } finally {
    if (caseId) {
      await client.query('DELETE FROM case_messages WHERE case_id = $1', [caseId]);
      await client.query('DELETE FROM resolution_cases WHERE id = $1', [caseId]);
    }
    await client.end();
  }
} catch (error) {
  console.error(`\nShare-preview smoke aborted: ${error.message}`);
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
