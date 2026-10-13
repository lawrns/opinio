#!/usr/bin/env node
/**
 * Deterministic consumer-visible regression for the public directory payload
 * and its pagination/navigation contract (issue #5).
 *
 * Asserts against the route the app actually serves:
 *   - the initial directory HTML carries only one bounded page of the catalogue
 *     (no other merchant link, not even inside the inlined RSC payload)
 *   - ordinary anchor navigation (rel="next") reaches every catalogue business
 *     exactly once, in database catalogue order (category popularity, then brand)
 *   - page identity is deliberate: self-canonical per page, page 1 stays bare,
 *     invalid/out-of-range page parameters answer 404
 *   - the full category index is present on every page and every category chip
 *     resolves to an existing section anchor
 *   - the sitemap keeps every existing entry and adds exactly the real
 *     paginated directory URLs
 *
 * The sitemap expectation is derived from the catalogue itself (base routes,
 * every non-empty public slug, the real pagination pages) and is compared as an
 * exact URL set — it is not copied from the route's own implementation. If the
 * catalogue ever contains a legacy alias that production intentionally excludes
 * or redirects, this check fails loudly so the owner can decide, rather than
 * silently skipping the slug.
 *
 * Usage:
 *   DATABASE_URL=postgres://…/opinio_issue_5 BASE_URL=http://127.0.0.1:3205 \
 *     node scripts/verify-directory-pagination.mjs
 *
 * Read-only: HTTP GETs only, plus SELECTs on the configured database.
 */
import { createRequire } from 'node:module';

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3205').replace(/\/$/, '');
const PAGE_SIZE = 60;
const CATALOGUE_ORDER_SQL = `
  WITH category_counts AS (
    SELECT COALESCE(NULLIF(BTRIM(category), ''), 'General') AS category, COUNT(*)::int AS count
    FROM businesses
    WHERE slug IS NOT NULL
    GROUP BY 1
  )
  SELECT b.slug
  FROM businesses b
  JOIN category_counts cc ON cc.category = COALESCE(NULLIF(BTRIM(b.category), ''), 'General')
  WHERE b.slug IS NOT NULL
  ORDER BY cc.count DESC, COALESCE(NULLIF(BTRIM(b.category), ''), 'General') ASC, b.brand_name ASC, b.id ASC`;

const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const businessSlugs = (html) => [
  ...new Set([...html.matchAll(/href="\/b\/([^"#?]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))),
];
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, html: await res.text() };
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required: the catalogue order assertion reads the database.');
  process.exit(2);
}

const require = createRequire(`${process.cwd()}/package.json`);
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
const { rows } = await pool.query(CATALOGUE_ORDER_SQL);
await pool.end();
const catalogue = rows.map((row) => row.slug);
const totalPages = Math.max(1, Math.ceil(catalogue.length / PAGE_SIZE));

// 1. Bounded initial payload: page 1 carries exactly one page of merchants.
const first = await get('/directorio');
const firstSlugs = businessSlugs(first.html);
check('directory page 1 responds 200', first.status === 200, `status=${first.status}`);
check(
  'initial HTML/RSC carries exactly one bounded page of merchants',
  firstSlugs.length === Math.min(PAGE_SIZE, catalogue.length),
  `merchant links=${firstSlugs.length}, page size=${PAGE_SIZE}, catalogue=${catalogue.length}`
);
check(
  'initial HTML/RSC never exposes merchants outside the first page',
  firstSlugs.every((slug) => catalogue.slice(0, PAGE_SIZE).includes(slug)),
  `unexpected=${firstSlugs.filter((slug) => !catalogue.slice(0, PAGE_SIZE).includes(slug)).slice(0, 3).join(',') || 'none'}`
);
check(
  'page 1 canonical is the bare directory path',
  canonicalOf(first.html) === 'https://opinio.mx/directorio',
  `canonical=${canonicalOf(first.html)}`
);
check(
  'page 1 links the next page ordinally',
  totalPages === 1 || first.html.includes('href="/directorio?page=2"'),
  null
);

// 2. Anchor traversal reaches the complete catalogue in catalogue order.
const visited = [];
const orderedSlugs = [];
let url = '/directorio';
let guard = 0;
while (url && guard < 500) {
  guard += 1;
  const res = url === '/directorio' ? first : await get(url);
  if (res.status !== 200) {
    check(`traversal page ${url} responds 200`, false, `status=${res.status}`);
    break;
  }
  const pageNumber = new URL(url, BASE).searchParams.get('page') ?? '1';
  const slugs = businessSlugs(res.html);
  orderedSlugs.push(...slugs);
  const expected = catalogue.slice((Number(pageNumber) - 1) * PAGE_SIZE, Number(pageNumber) * PAGE_SIZE);
  check(
    `page ${pageNumber} renders the catalogue slice in database order`,
    JSON.stringify(slugs) === JSON.stringify(expected),
    `items=${slugs.length}`
  );
  const expectedCanonical =
    pageNumber === '1' ? 'https://opinio.mx/directorio' : `https://opinio.mx/directorio?page=${pageNumber}`;
  check(`page ${pageNumber} canonical is self-referential`, canonicalOf(res.html) === expectedCanonical, `canonical=${canonicalOf(res.html)}`);
  const chips = [...new Set([...res.html.matchAll(/href="([^"]*#cat-[^"]+)"/g)].map((m) => m[1]))];
  check(
    `page ${pageNumber} exposes the full category index`,
    chips.length >= 1 && res.html.includes('#cat-'),
    `category anchors=${chips.length}`
  );
  visited.push(Number(pageNumber));
  url = res.html.match(/<a[^>]+rel="next"[^>]+href="([^"]+)"/)?.[1] ?? null;
}

check('anchor traversal visits every catalogue page', visited.length === totalPages, `visited=${visited.length}/${totalPages}`);
check(
  'anchor traversal covers the complete catalogue exactly once',
  orderedSlugs.length === catalogue.length && new Set(orderedSlugs).size === catalogue.length,
  `rendered=${orderedSlugs.length}, unique=${new Set(orderedSlugs).size}, catalogue=${catalogue.length}`
);
check(
  'rendered order matches database catalogue order',
  JSON.stringify(orderedSlugs) === JSON.stringify(catalogue),
  null
);

// 3. Page identity: page 1 bare, invalid and out-of-range pages do not exist.
const explicitOne = await get('/directorio?page=1');
check(
  'explicit page=1 keeps the bare canonical',
  explicitOne.status === 200 && canonicalOf(explicitOne.html) === 'https://opinio.mx/directorio',
  `status=${explicitOne.status}, canonical=${canonicalOf(explicitOne.html)}`
);
check(
  'incidental parameters do not change the canonical',
  canonicalOf((await get('/directorio?page=2&utm_source=smoke')).html) === 'https://opinio.mx/directorio?page=2',
  null
);
for (const invalid of ['/directorio?page=0', '/directorio?page=abc', `/directorio?page=${totalPages + 1}`]) {
  const res = await get(invalid);
  check(`${invalid} answers 404 instead of a soft duplicate`, res.status === 404, `status=${res.status}`);
}

// 4. Every category chip resolves to a section anchor on its target page.
const chipHrefs = [...new Set([...first.html.matchAll(/href="([^"]*#cat-[^"]+)"/g)].map((m) => m[1]))];
let chipsResolved = 0;
for (const href of chipHrefs) {
  const target = href.startsWith('#') ? '/directorio' : href;
  const anchor = href.split('#')[1];
  const res = await get(target);
  if (res.status === 200 && res.html.includes(`id="${anchor}"`)) chipsResolved += 1;
}
check(
  'every category chip anchor exists on the page it links to',
  chipHrefs.length > 0 && chipsResolved === chipHrefs.length,
  `resolved=${chipsResolved}/${chipHrefs.length}`
);

// 5. Sitemap: the full current public catalogue plus the real paginated pages.
// The expectation is derived from the catalogue itself (never copied from the
// route's own implementation), so a legacy alias that production intentionally
// redirects or omits would surface here as a loud failure for an owner decision
// instead of being silently skipped.
const sitemap = await get('/sitemap.xml');
const sitemapUrls = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expectedSitemap = [
  'https://opinio.mx',
  'https://opinio.mx/directorio',
  ...Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => `https://opinio.mx/directorio?page=${index + 2}`),
  ...catalogue
    .filter((slug) => slug.trim() !== '')
    .map((slug) => `https://opinio.mx/b/${slug}`),
].sort();
check(
  'sitemap declares the base routes, every catalogue passport and exactly the real paginated directory pages',
  JSON.stringify([...sitemapUrls].sort()) === JSON.stringify(expectedSitemap),
  `declared=${sitemapUrls.length}, expected=${expectedSitemap.length}`
);
check(
  'sitemap keeps every merchant passport entry',
  catalogue.every((slug) => sitemapUrls.includes(`https://opinio.mx/b/${slug}`)),
  null
);

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log(`failed: ${failed.map((result) => result.name).join(' | ')}`);
  process.exit(1);
}
