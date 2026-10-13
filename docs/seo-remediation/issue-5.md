# Issue #5 — Reduce directory payload and response/render workload

Branch: `fix/opinio-seo-issue-5` (base integration branch `fix/opinio-seo-remediation` @ `fefc09028acc1ca94eddf5decc15459c46a7e614`).
Worktree: `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-5`. Findings: JEV-012, JEV-028.

## Changes

| File | Change |
| --- | --- |
| `src/app/directorio/page.tsx` | Renders one bounded catalogue page instead of the whole catalogue. Page identity comes from the public `page` query parameter: page 1 is the bare `/directorio`, later pages are self-canonical `/directorio?page=N`; values that cannot identify a page (`page=0`, `page=abc`, `page>`last) answer `404` instead of an unbounded set of soft duplicates. Every page renders the full category index (all 15 categories, popularity order, real counts) whose chips are ordinary anchors to the page that contains that category's first business, plus numbered/prev/next anchors for catalogue navigation. Removed the contradictory `export const revalidate = 3600` and the local `categorySectionId` duplicate. |
| `src/lib/directory-pagination.ts` (new) | Pure pagination contract: page size (60), `page` parameter selection, canonical hrefs, page-number window, category name normalization, category section ids. No DB/cache imports, so it is unit-testable on its own. |
| `src/lib/directory-catalogue.ts` (new) | Focused catalogue query module: category index query (popularity order + first page per category) and bounded page-slice query (`ROW_NUMBER()` over `count DESC, category ASC, brand_name ASC, id ASC`, `LIMIT`-equivalent row window). Both cached with `unstable_cache` (revalidate 3600 s, tag `directory-catalogue`). |
| `src/app/sitemap.ts` | Appends the 18 real paginated directory URLs (`/directorio?page=2…19`); every pre-existing entry is preserved (exact set-difference check: removed 0, added 18). No utility variant, no synthetic count. |
| `scripts/verify-directory-pagination.mjs` (new) | Deterministic consumer-visible regression over real HTTP + the catalogue database: bounded initial payload, anchor traversal of the complete catalogue in catalogue order, self-canonical page identity, `404` for invalid/out-of-range pages, category-chip anchor resolution, sitemap coverage. |
| `src/lib/directory-pagination.test.ts` (new) | 12 unit tests for the pagination contract (page parameter, canonical hrefs, page window, category identity/anchors). |

Ordering/filter contracts: the visible catalogue order is unchanged — categories by popularity (count desc, then name), brands by `brand_name` asc inside a category, with `id` as a tiebreaker so the slice boundary is deterministic. The pagination slice follows that same visible order. `/verificar` filters and the `/b/<slug>` merchant links are untouched.

Cache policy (investigation outcome): the route previously exported `dynamic = 'force-dynamic'` **and** `revalidate = 3600`; `force-dynamic` forces per-request rendering, so the `revalidate` value (and its "1 hour ISR" comment) was inert. The route stays request-rendered by design — pagination is a public query parameter read through `searchParams`, a request-time API in Next 16.3.4 — the contradictory export is gone, and the expensive catalogue reads (category aggregate + ordered slice) are cached for 3600 s in the Next data cache via `unstable_cache` with tag `directory-catalogue`. Only public catalogue columns are cached (`slug`, `brand_name`, `legal_name`, `category`, `trust_score`, `operating_area`, `logo_url`, `claimed`); merchant dashboard, widget and case routes were not touched and none of their data is cached. `use cache` was not used: in Next 16.3.4 it requires `cacheComponents: true` repo-wide, a whole-app rendering-model change outside this ticket (`unstable_cache` verified present in the installed Next). Response-level cache headers live in `next.config.ts`, which ticket #11 owns, so they were not edited here — see the hand-off note.

## Verification (observed)

Runtime: runtime-verification's isolated local environment. Private DB `opinio_issue_5` (clone of the shared catalogue read-only DB) holds **1108 real PROFECO-derived catalogue businesses**, `trust_score = 0`, 0 reviews / 0 cases by design; no fabricated records were inserted. Baseline read-only reference instance: port 3214, base commit `fefc090`, same catalogue family. Both servers ran `next dev --webpack` (Turbopack dev cannot load the externalized `pg` driver from this hoisted `node_modules`).

Command (after side):

```
DATABASE_URL='postgres://…@127.0.0.1:54732/opinio_issue_5' NEXT_TELEMETRY_DISABLED=1 \
  node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3205
DATABASE_URL='postgres://…@127.0.0.1:54732/opinio_issue_5' BASE_URL=http://127.0.0.1:3205 \
  node scripts/verify-directory-pagination.mjs
```

1. **Equivalent repeated payload + runtime measurement, before → after** (same 1108-row catalogue, same dev mode, same probe; 5 sequential requests per side, decompressed sizes identical across runs; brotli/gzip = the same body re-compressed locally at default quality, because this host's curl has no brotli):

   | Metric (`/directorio`) | Before (3214 @ `fefc090`) | After (3205) | Δ |
   | --- | --- | --- | --- |
   | HTML decompressed | 3,867,165 B | 252,332 B | −93.5 % |
   | HTML brotli / gzip | 145,508 B / 275,000 B | 15,620 B / 25,524 B | −89.3 % / −90.7 % |
   | HTML response time (5 runs) | 5648, 5609, 5431, 5261, 5711 ms (median 5,609) | 313, 264, 275, 318, 271 ms (median 275) | −95.1 % median |
   | RSC flight payload (`RSC: 1`, `text/x-component`) | 2,042,181 B | 133,172 B | −93.5 % |
   | RSC brotli | 119,753 B | 11,892 B | −90.1 % |
   | RSC response time (5 runs) | 1362, 757, 337, 751, 365 ms (median 751) | 59, 52, 69, 51, 67 ms (median 59) | −92.1 % median |
   | Merchant links in one response | 1108 | 60 (page 1) | bounded |

   These are lab/dev-mode measurements on a local catalogue; they are **not** field Core Web Vitals. No CrUX field data was returned for the URL/origin in the audit, so field INP/TBT status stays unknown and no field claim is made; the Lighthouse TBT figures quoted in the issue are lab numbers and are not reported here as a field INP metric. The public production snapshot (`3,892,631` decompressed bytes, `155,990` brotli transfer) was observed on a different, larger population and is context only, not an equivalent before/after.

2. **Bounded payload is consumer-visible, not just a source assertion**: the initial `/directorio` HTML (including the inlined RSC payload) contains exactly the 60 merchants of page 1 and no merchant outside that slice; `/directorio?page=2` contains 60 merchants of page 2. Before, both URLs carried all 1108 merchants and the same canonical (`/directorio`), i.e. the parameter was not a page identity at all.

3. **Complete catalogue reachability, counts and order** (HTTP crawl following only the rendered `rel="next"` anchors, plus the regression script):

   ```
   PASS initial HTML/RSC carries exactly one bounded page of merchants — merchant links=60, page size=60, catalogue=1108
   PASS initial HTML/RSC never exposes merchants outside the first page
   PASS page 1..19 renders the catalogue slice in database order
   PASS anchor traversal visits every catalogue page — visited=19/19
   PASS anchor traversal covers the complete catalogue exactly once — rendered=1108, unique=1108, catalogue=1108
   PASS rendered order matches database catalogue order
   PASS page 1..19 canonical is self-referential
   PASS explicit page=1 keeps the bare canonical
   PASS /directorio?page=0 | page=abc | page=20 answers 404 instead of a soft duplicate
   PASS every category chip anchor exists on the page it links to — resolved=15/15
   PASS sitemap declares the base routes, every catalogue passport and exactly the real paginated directory pages — declared=1128, expected=1128
   PASS sitemap keeps every merchant passport entry
   73/73 checks passed
   ```

   Rendered vs database order was compared element-by-element: 1108 rendered slugs, 0 mismatches (category popularity desc, brand asc, id tiebreak). Page item counts: 60×18 + 28 = 1108. Category counts shown on the page are the real catalogue counts (438, 195, 139, 63, 57, 42, 38, 32, 22, 21, 21, 15, 15, 8, 2) and the category index is present on all 19 pages.

4. **Red-capability of the regression** (temporary probe, reverted): with the page size raised to 600 for one run, the same script exited `1` with `FAIL initial HTML/RSC carries exactly one bounded page of merchants — merchant links=600, page size=60, catalogue=1108`, `FAIL initial HTML/RSC never exposes merchants outside the first page` and per-page slice failures; the constant was restored immediately (`git diff` shows only the intended files).

5. **Real desktop and mobile browser navigation** (system Chrome via Playwright; desktop 1440×1000 with mouse clicks, mobile 390×844 with real `touchscreen.tap`; `reducedMotion: reduce` so the app's `scroll-behavior: smooth` override is active and the taps/measurements are stable):

   | | Desktop | Mobile |
   | --- | --- | --- |
   | Pages traversed by tapping "Siguiente" | 19 | 19 |
   | Merchant cards rendered / unique `/b/` links | 1108 / 1108 | 1108 / 1108 |
   | Each page's rendered order == database order | yes (19/19) | yes (19/19) |
   | Category index chips per page | 15 | 15 |
   | Last page | 28 cards, `?page=19`, canonical `…?page=19` | same |
   | Category chip anchor jump | section top 192 px (sticky-header offset) | section visible in viewport |
   | Console errors / failed requests | 0 / 0 (19 benign dev `_next/static` aborts) | 0 / 0 (18 benign dev aborts) |

   Screenshots for both profiles and every page: `evidence/seo-5/` in the external remediation artifact tree.

6. **Sitemap coverage**: before `/sitemap.xml` declared 1110 URLs (`/`, `/directorio`, 1108 passports); after it declares 1128 — every previous entry preserved and exactly 18 added, all real 200-answering, self-canonical pagination pages. No utility variants and no synthetic counts.

7. **Tests / static checks run in this worktree**: `node node_modules/vitest/vitest.mjs run src/lib/directory-pagination.test.ts` → 12/12 passed; `node node_modules/typescript/bin/tsc --noEmit` → clean; `node node_modules/eslint/bin/eslint.js src/app/directorio/page.tsx src/lib/directory-catalogue.ts src/lib/directory-pagination.ts src/lib/directory-pagination.test.ts src/app/sitemap.ts` → clean. Merchant links from four catalogue positions (first, ~600th, ~1100th, last) each answer `200` with an `<h1>`.

### Acceptance criteria mapping

- [x] **Preserve catalogue navigation, merchant links and existing ordering/filter contracts** — 19-page anchor navigation plus the full category index on every page, 1108 unique `/b/<slug>` links, rendered order identical to the database catalogue order, `/verificar` filters and merchant pages untouched.
- [x] **Avoid sending the complete catalogue in the initial HTML/RSC payload** — 60 merchants per response (was 1108), HTML 3,867,165 → 252,332 B and RSC 2,042,181 → 133,172 B on the same catalogue; the regression asserts no merchant outside the page slice is present anywhere in the response.
- [x] **Preserve crawler-discoverable catalogue navigation and sitemap coverage** — ordinary anchors (`rel="next"`, numbered pages, category chips) reach every page and every category section; the sitemap keeps all 1110 previous entries and adds only the 18 real pagination URLs.
- [x] **Investigate cache policy without caching merchant/private case data** — contradictory `force-dynamic` + inert `revalidate` resolved; public catalogue reads cached 3600 s via `unstable_cache` with tag `directory-catalogue`; merchant/case routes and their data untouched; response-header policy left with its owner (`next.config.ts`, ticket #11).
- [x] **Compare decompressed payload and equivalent repeated lab/runtime measurements; do not call lab TBT a field INP metric** — table above (before/after, identical method and catalogue, 5 runs each), with an explicit statement that no field CrUX data exists and that TBT/Lighthouse numbers are lab.

## Environment / staging

There is no approved staging configuration for this work; verification is local-only ("local integration branch verified; not published/released"). No push, deploy, merge, or production change was made. No paid provider calls, no third-party account changes, no outreach. The existing opt-in analytics allowlist (`src/lib/analytics.ts`) and private-route exclusions were untouched, and the approved local agent config (`CLAUDE.md`, `docs/agents/**`) was kept uncommitted.

## Limitations

- Measurements are dev-mode (`next dev --webpack`) on both sides and include the dev runtime overhead present in both; they are method-equivalent, not production-build numbers. A production build/standalone check was left to the integration stage.
- The local catalogue is 1108 businesses with `trust_score = 0`, so the directory intentionally shows "En auditoría" for every card; the production catalogue (1200 profile slugs, 1202 declared sitemap URLs) is larger and its counts are never asserted from local data.
- The regression script needs `DATABASE_URL` for the order assertion and a running server on `BASE_URL`; it does not boot the app itself.
- Route-level response caching is not addressed here: this branch leaves the directory request-rendered (a query parameter is request-time data) and caches the data layer. A public `Cache-Control` for `/directorio` belongs in `next.config.ts`.

## Observations (not fixed here, out of scope)

1. **Pre-existing mobile horizontal overflow on `/directorio`**: at a 390 px viewport the merchant cards measure ~1021 CSS px wide (baseline ~1042) because the card grid track is sized by the `truncate`d brand text, giving a document `scrollWidth` of 1037 px (baseline 1067 px), which makes Chrome's mobile emulation expand the layout viewport. It is present with and without this change (not introduced by #5); real touch taps on the pagination anchors still navigate, so mobile pagination works, but the zoomed-out layout deserves its own ticket.
2. **Metadata content**: the directory title/description still state "1,199+" (`generateMetadata` copy is ticket #4 scope); this ticket only made the canonical URL page-aware.
3. **Pagination window** renders first/last/current±2 with ellipsis gaps, so the number list stays bounded if the catalogue grows; complete traversal is still guaranteed by `rel="next"`.
