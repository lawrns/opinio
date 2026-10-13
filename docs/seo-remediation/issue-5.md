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
| `src/lib/directory-pagination.test.ts` (new) | 11 unit tests for the pagination contract (page parameter, canonical hrefs, page window, category identity/anchors). |

Ordering/filter contracts: the visible catalogue order is unchanged — categories by popularity (count desc, then name), brands by `brand_name` asc inside a category, with `id` as a tiebreaker so the slice boundary is deterministic. The pagination slice follows that same visible order. `/verificar` filters and the `/b/<slug>` merchant links are untouched.

Cache mechanism (investigation outcome): the route previously exported `dynamic = 'force-dynamic'` **and** `revalidate = 3600`; `force-dynamic` forces per-request rendering, so the `revalidate` value (and its "1 hour ISR" comment) was inert. The route stays request-rendered by design — pagination is a public query parameter read through `searchParams`, a request-time API in Next 16.3.4 — and the contradictory export is gone. What is cached is the data layer, not the response:

| Aspect | Observed mechanism |
| --- | --- |
| Cache entries | Two `unstable_cache`-wrapped functions in `src/lib/directory-catalogue.ts`: `directory-category-index` (no arguments → one key) and `directory-business-slice` (arguments `offset`, `limit` → one key per directory page). |
| Lifetime / invalidation | `revalidate: 3600` s per entry plus tag `directory-catalogue`. Contract: cached catalogue values can be **up to 3600 s stale** (bounded staleness, not fresh data); a catalogue write can call `revalidateTag('directory-catalogue')` to make it immediate instead of waiting out the hour. |
| Scope safety | Only public catalogue columns are cached (`slug`, `brand_name`, `legal_name`, `category`, `trust_score`, `operating_area`, `logo_url`, `claimed`); no cookies/headers are read inside the cached scope, and merchant dashboard, widget and case routes and their data are untouched. |
| Dev storage | File-backed data cache at `<worktree>/.next/dev/cache/fetch-cache`; entries survive a dev-server restart until `revalidate` elapses (observed: a restarted server answered `/directorio` with **zero** catalogue statements until the cache directory was cleared). |
| Response headers | Unchanged (`next.config.ts` is ticket #11's file) and no response-level cache claim is made: no `s-maxage`/`Cache-Control` header was added, and the route is **not** ISR — it is request-rendered on every request. Per director review, fresh rendering plus the bounded-staleness data cache is the accepted policy for `/directorio`. |

Cold/warm proof (throwaway smoke on the private DB, statement logging enabled for the window and reset afterwards — this is not a permanent query-count test): with the dev data cache cleared and the server restarted, the request sequence `cold /directorio` → `warm /directorio ×3` → `cold /directorio?page=2` → `warm /directorio?page=2` → `/sitemap.xml` produced exactly these catalogue statements (`docker logs --since`, window 23:07:12–23:07:21Z):

```
23:07:12.919 LOG:  statement: SELECT category, count, SUM(count) OVER (ORDER BY count DESC, category ASC) - count AS first_row …
23:07:12.925 LOG:  execute <unnamed>: WITH category_counts AS ( … ROW_NUMBER() OVER …
23:07:12.925 DETAIL:  parameters: $1 = '0', $2 = '60'
23:07:16.177 LOG:  execute <unnamed>: WITH category_counts AS ( … ROW_NUMBER() OVER …
23:07:16.177 DETAIL:  parameters: $1 = '60', $2 = '120'
23:07:21.460 LOG:  statement: SELECT slug, updated_at FROM businesses … ORDER BY slug ASC
```

i.e. the category index was read once (page 1, cold), the bounded slice once per distinct page (`$1='0',$2='60'` and `$1='60',$2='120'`), and the three repeated page-1 requests plus the repeated page-2 request issued **no** catalogue statements at all; the last statement is `/sitemap.xml`'s own uncached passport query. Warm responses were identical in size to every earlier measurement (252,332 B) against 252,585 B cold, with response time 1370 ms cold vs 228/262/266 ms warm, and the cache directory grew from 0 to 3 entries. The directory therefore serves fresh HTML/RSC on every request while the catalogue reads are demonstrably served from cache. `use cache` was not used: in Next 16.3.4 it requires `cacheComponents: true` repo-wide, a whole-app rendering-model change outside this ticket (`unstable_cache` verified present in the installed Next).

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

   Accented category chips were re-checked separately because category ids are percent-encoded in both the `id` and the `href` (director review question). With real Chrome clicks (not string comparison), all four cases jump correctly: the browser's own `:target` resolves to the encoded id, the target section lands at the sticky-header offset (`top` = 192 px) and shows the expected `<h2>`:

   | Clicked chip | Resulting URL | `document.querySelector(':target').id` | Section top |
   | --- | --- | --- | --- |
   | Comercio Electrónico Especializado (same page, page 1) | `/directorio#cat-comercio-electr%C3%B3nico-especializado` | `cat-comercio-electr%C3%B3nico-especializado` | 192 px |
   | Moda, Calzado y Accesorios (spanning → page 11) | `/directorio?page=11#cat-moda%2C-calzado-y-accesorios` | `cat-moda%2C-calzado-y-accesorios` | 192 px |
   | Farmacias, Ópticas y Salud (spanning → page 18) | `/directorio?page=18#cat-farmacias%2C-%C3%B3pticas-y-salud` | `cat-farmacias%2C-%C3%B3pticas-y-salud` | 192 px |
   | Joyería, Relojes y Artesanías (from page 8 → page 18) | `/directorio?page=18#cat-joyer%C3%ADa%2C-relojes-y-artesan%C3%ADas` | `cat-joyer%C3%ADa%2C-relojes-y-artesan%C3%ADas` | 192 px |

   No defect found, so anchor identity was left unchanged. Recorded mechanism: Chrome matches the fragment literally — `location.hash` keeps the percent-encoded form and a *decoded* hash does **not** match the element id (`getElementById(decodeURIComponent(hash))` is `null`), which is exactly why both the section `id` and the chip `href` use the same percent-encoded string. The regression script asserts the encoded `id` exists for every chip target, which is the browser-visible contract.

   Screenshots for both profiles and every page: `evidence/seo-5/` in the external remediation artifact tree.

6. **Sitemap coverage**: before `/sitemap.xml` declared 1110 URLs (`/`, `/directorio`, 1108 passports); after it declares 1128 — every previous entry preserved and exactly 18 added, all real 200-answering, self-canonical pagination pages. No utility variants and no synthetic counts. The harness expectation is derived from the catalogue itself (base routes + every non-empty public slug + the real pagination pages) and compared as an exact URL set; it deliberately does **not** copy the route's legacy implementation exclusion (no `slug <> 'locomotion'` filter), so the served sitemap must match the full current public catalogue. The local catalogue has no `locomotion` row (observed: `SELECT count(*) … WHERE slug = 'locomotion'` → 0 against 1108 public slugs), which is why every declared entry is preserved; if a legacy alias ever appears in the catalogue, this check fails **loudly** for the owner to decide (alias redirect/sitemap exclusion is not this ticket's contract, and nothing was changed or consolidated here).

7. **Tests / static checks run in this worktree**: `node node_modules/vitest/vitest.mjs run src/lib/directory-pagination.test.ts` → 11/11 passed; `node node_modules/typescript/bin/tsc --noEmit` → clean; `node node_modules/eslint/bin/eslint.js src/app/directorio/page.tsx src/lib/directory-catalogue.ts src/lib/directory-pagination.ts src/lib/directory-pagination.test.ts src/app/sitemap.ts` → clean. Merchant links from four catalogue positions (first, ~600th, ~1100th, last) each answer `200` with an `<h1>`. Per director review the unit test that pinned the implementation constant (`DIRECTORY_PAGE_SIZE ≤ 100`/`> 0`) was deleted — the bounded-payload guarantee is asserted at the HTTP interface instead (item 2) — and the unused optional `radius` parameter on `directoryPageWindow` was removed (single caller, fixed radius 2). Items 3, 5 and 7's regression run were repeated after these edits on the final code: `73/73 checks passed`, desktop/mobile 19 pages with 1108/1108 links and matching order, accented-chip clicks still 4/4.

### Acceptance criteria mapping

- [x] **Preserve catalogue navigation, merchant links and existing ordering/filter contracts** — 19-page anchor navigation plus the full category index on every page, 1108 unique `/b/<slug>` links, rendered order identical to the database catalogue order, `/verificar` filters and merchant pages untouched.
- [x] **Avoid sending the complete catalogue in the initial HTML/RSC payload** — 60 merchants per response (was 1108), HTML 3,867,165 → 252,332 B and RSC 2,042,181 → 133,172 B on the same catalogue; the regression asserts no merchant outside the page slice is present anywhere in the response.
- [x] **Preserve crawler-discoverable catalogue navigation and sitemap coverage** — ordinary anchors (`rel="next"`, numbered pages, category chips) reach every page and every category section; the sitemap keeps all 1110 previous entries and adds only the 18 real pagination URLs.
- [x] **Investigate cache policy without caching merchant/private case data** — contradictory `force-dynamic` + inert `revalidate` resolved; public catalogue reads cached 3600 s via `unstable_cache` with tag `directory-catalogue`, with the cold/warm statement-log proof and the documented mechanism above; merchant/case routes and their data untouched. Director review disposition: no public `s-maxage` header is needed — fresh request rendering plus this data cache (observed cache hits) is the accepted policy, so `next.config.ts` (ticket #11) stays untouched.
- [x] **Compare decompressed payload and equivalent repeated lab/runtime measurements; do not call lab TBT a field INP metric** — table above (before/after, identical method and catalogue, 5 runs each), with an explicit statement that no field CrUX data exists and that TBT/Lighthouse numbers are lab.

## Director review dispositions

| Decision | Where it landed |
| --- | --- |
| No new public `s-maxage` headers; existing `unstable_cache` 3600 s + fresh request rendering accepted **if an actual cache hit is observed** | No `next.config.ts` edit. Cache mechanism documented above and cold/warm statement-log proof recorded (index read once, slice once per distinct page, repeated requests issued zero catalogue statements). |
| Pre-existing mobile overflow is out of scope, no extra UI edits | Observation kept, no layout change made. |
| Delete the unit test pinning the implementation constant `DIRECTORY_PAGE_SIZE` | Removed from `src/lib/directory-pagination.test.ts` (11 tests remain); the bounded payload is asserted over HTTP instead. |
| Remove the unused optional `radius` on `directoryPageWindow` (single caller) | Signature is now `(current, total)` with a fixed radius of 2; tests unchanged in behaviour. |
| Accented category chips must be clicked in real Chrome before any change | Four accented/cross-page chips verified in Chrome (table in item 5): correct `:target`, section at the sticky-header offset, right heading. No defect → anchor identity unchanged. |

## Environment / staging

There is no approved staging configuration for this work; verification is local-only ("local integration branch verified; not published/released"). No push, deploy, merge, or production change was made. No paid provider calls, no third-party account changes, no outreach. The existing opt-in analytics allowlist (`src/lib/analytics.ts`) and private-route exclusions were untouched, and the approved local agent config (`CLAUDE.md`, `docs/agents/**`) was kept uncommitted.

## Limitations

- Measurements are dev-mode (`next dev --webpack`) on both sides and include the dev runtime overhead present in both; they are method-equivalent, not production-build numbers. A production build/standalone check was left to the integration stage.
- The local catalogue is 1108 businesses with `trust_score = 0`, so the directory intentionally shows "En auditoría" for every card; the production catalogue (1200 profile slugs, 1202 declared sitemap URLs) is larger and its counts are never asserted from local data.
- The regression script needs `DATABASE_URL` for the order assertion and a running server on `BASE_URL`; it does not boot the app itself.
- Route-level response caching is intentionally not addressed here: the directory stays request-rendered (a query parameter is request-time data) and the data layer is cached instead; per director review no public `Cache-Control` is required for `/directorio`, so `next.config.ts` was not edited.

## Observations (not fixed here, out of scope)

1. **Pre-existing mobile horizontal overflow on `/directorio`** (kept as an observation only — the director explicitly flagged it out of scope for #5, so no UI edits were made): at a 390 px viewport the merchant cards measure ~1021 CSS px wide (baseline ~1042) because the card grid track is sized by the `truncate`d brand text, giving a document `scrollWidth` of 1037 px (baseline 1067 px), which makes Chrome's mobile emulation expand the layout viewport. It is present with and without this change (not introduced by #5); real touch taps on the pagination anchors still navigate, so mobile pagination works.
2. **Metadata content**: the directory title/description still state "1,199+" (`generateMetadata` copy is ticket #4 scope); this ticket only made the canonical URL page-aware.
3. **Pagination window** renders first/last/current±2 with ellipsis gaps, so the number list stays bounded if the catalogue grows; complete traversal is still guaranteed by `rel="next"`.
