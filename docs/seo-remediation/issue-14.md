# Issue #14 — Verify technical remediation across public URL families

Status: **local integration branch verified; not published/released.** This record verifies the
integration head `976989d0cf8da1cdcf709ac7145b77f1e8509c59` of `fix/opinio-seo-remediation`
(baseline `fefc09028acc1ca94eddf5decc15459c46a7e614`, all twelve remediation tickets #2–#13 merged)
from branch `fix/opinio-seo-issue-14`. Everything below is observed behavior on the isolated local
runtime: loopback HTTP/DOM/API, a private PostgreSQL database, real Chrome 154 via system Chrome.
Nothing was pushed, deployed, published or released; no production writes, no third-party account
changes, no paid provider calls, no outreach. Issue #14 stays open until the director merges this
record and runs the full two-axis review.

Scope note: this ticket is verification and documentation, not new SEO work. No application source
file was changed by #14 (the branch contains only this document). Where a result is an inference,
a lab measurement or an unassessed item, it is labeled as such in place.

## 1. Runtime, guards and evidence channels

| Item | Value |
| --- | --- |
| Worktree | `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-14` (branch `fix/opinio-seo-issue-14`, base `976989d0`) |
| Database | `opinio_issue_14` on `127.0.0.1:54732` (private, cloned from `opinio_template`; 1108 catalogue businesses, 0 reviews / 0 cases / 12 widget configs) |
| Dev servers | `next dev --webpack -H 127.0.0.1 --port 3214` (site origin pinned to itself for loopback emission) and `--port 3219` (site origin left at the deployment default for string-only expectations) |
| Production mode | `next build --webpack` into `.next-qa14-standalone`, static + `public` copied into `standalone/`, server started with cwd `<distDir>/standalone` on 3214 |
| Browser | system Chrome 154.0.8037.98 via Playwright 1.59.1 |
| Analytics | `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-FAKE14TEST` (fake). The real `gtag.js` is the only external request allowed; every other external request is answered locally with 204 |

Effective-connection guard: every QA script resolves the **effective** pg parameters
(`Client.connectionParameters`) and the base URL hostname against an exact loopback set
(`127.0.0.1`, `localhost`, `::1`) plus `opinio_issue_*` before connecting or spawning a server.
Turbopack dev remains unusable on this host (externalized `pg` reparse point) and is never cited as
an application defect.

## 2. Observed battery

### 2.1 Merchant navigation and populated case path (#2 — JEV-001/JEV-003)

```
DATABASE_URL=…/opinio_issue_14 MERCHANT_DB_DELAY_MS=80 MERCHANT_SLUG=amazon \
  OPINIO_NEXT_DIST_DIR=.next-qa14-merchant node scripts/verify-merchant-flow.mjs
DATABASE_URL=…/opinio_issue_14 BASE_URL=http://127.0.0.1:3214 CLONE=<worktree> \
  node qa/merchant-cases-populated-proof.mjs
```

- `verify-merchant-flow.mjs`: **9/9 PASS, exit 0** with an injected 80 ms per-chunk DB delay —
  `/merchant` 200, first-listed default (`mercado-libre`), explicit `?business=amazon` selected and
  carried into `/merchant/reviews` and the header/sidebar, unknown slug falls back to the first
  listed business (artifact `verify-merchant-flow.txt`).
- `merchant-cases-populated-proof.mjs`: **7/7 PASS** — the real `getMerchantCasesForBusinesses` /
  `getMerchantCases` modules (imported from this worktree through Bun) return the staged rows
  (batched rows=2, single rows=1), `/merchant/inbox` renders case + both messages in order for both
  businesses, the case portal renders its own query, then fixtures are deleted:
  `resolution_cases 0 → 2 → 0`, `case_messages 0 → 4 → 0`, consoleErrors 0. Re-run in production
  mode with the same result. Per the ticket note, the case-portal raw SELECT is portal-only and is
  **not** used as batch evidence for the merchant path.
- Production root cause for the original `/merchant` 500 stays **[INFERENCE]** (diagnosed without
  original server logs; `pg` log window was empty). No ungrounded per-request query metric is
  claimed (the withdrawn statement-count metric is not restated).

### 2.2 Indexing, canonical ownership, sitemap, pagination and metadata (#3/#4/#5)

```
DATABASE_URL=…/opinio_issue_14 NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3988 SMOKE_PORT=3988 \
  OPINIO_NEXT_DIST_DIR=.next-qa14-index node scripts/verify-seo-indexing.mjs
DATABASE_URL=…/opinio_issue_14 NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3989 SMOKE_PORT=3989 \
  OPINIO_NEXT_DIST_DIR=.next-qa14-meta node scripts/verify-seo-metadata.mjs
DATABASE_URL=…/opinio_issue_14 BASE_URL=http://127.0.0.1:3219 node scripts/verify-directory-pagination.mjs
DATABASE_URL=…/opinio_issue_14 BASE_URL=http://127.0.0.1:3219 CLONE=<worktree> node qa/directory-browser-proof.mjs
```

- `verify-seo-indexing.mjs`: **17/17 PASS, exit 0** — `/verificar` (and `?q=`/`?categoria=`/`?accion=`
  variants) and `/caso/nuevo` (+`?b=`) serve `robots="noindex, follow"` and no canonical; the opinion
  entry is indexable with the merchant **self**-canonical (never cross-canonicalized to the passport,
  incidental params stripped); passport and directory stay indexable with their own canonicals; the
  sitemap declares 1128 URLs with 0 utility entries; 1108/1108 passport URLs match the database slug
  inventory; unknown merchant slug 404 with `noindex` and no canonical; robots.txt does not block
  retrieval of the noindex routes.
- `verify-directory-pagination.mjs` (harness expectations are pinned to the deployment origin, so it
  runs against the default-origin server): **73/73 PASS, exit 0** — page 1 bare canonical, each page
  N self-canonical (`?page=N`), 60 items per page in database catalogue order, 19 pages
  (18×60 + 28 = 1108 exactly once), invalid/out-of-range page parameters 404, and the sitemap equals
  the derived expectation `declared=1128, expected=1128` = 2 base routes + 18 paginated directory
  URLs + 1108 passports — i.e. every one of the original 1110 entries preserved plus exactly the 18
  real pages.
- `directory-browser-proof.mjs` (rendered DOM, real clicks): **6/6 PASS** — page 1 exposes 60
  `/b/` links, all 19 pages visited and each page's slice matches the database slice, union 1108
  unique in catalogue order, 77/77 accented brands rendered. Re-run in production mode: same 6/6.
- `verify-seo-metadata.mjs`: **28/28 PASS, exit 0** — purpose titles/descriptions per family
  (search, case entry, opinion entry, directory, passport), directory page-2 identity and
  self-canonical with incidental params stripped, unknown passport 404 without canonical, and the
  public case-intake lifecycle: two cases created through `POST /api/v1/cases`, case-portal metadata
  static across cases and leak-free, then `resolution_cases 0 → 0`. Unit level: `passport-metadata`
  metamorphic table 11/11 (same-brand records stay distinguishable; placeholder scope values are
  treated as unknown; no invented geographic claim).
- Local catalogue (1108) and the production sitemap scope (~1200 passport profiles / 1202 crawled
  URLs) are **different populations** recorded side by side; no local row count is presented as a
  production figure.
- Caching: `/directorio` is `export const dynamic = 'force-dynamic'` with `unstable_cache` catalogue
  reads at `CATALOGUE_CACHE_SECONDS = 3600` — request-rendered with a one-hour data cache, not ISR
  and not a privacy cache. The lab before/after payload and latency pair (3.87 MB → 252 kB HTML,
  median 5609 ms → 275 ms) stays a **lab measurement on the same 1108-row population**, not field
  CWV.

### 2.3 Structured data, passport claims, images, share previews, response policies (#6/#8/#9/#10/#11)

```
BASE_URL=http://127.0.0.1:3214 SHA=<head> node qa/merged-homepage-proof.mjs
BASE_URL=http://127.0.0.1:3219 OUT=… SLUGS=mercado-libre,amazon node qa/attribution-proof.mjs
BASE_URL=http://127.0.0.1:3214 DATABASE_URL=… CLONE=<worktree> node qa/anonymous-author-proof.mjs
BASE_URL=http://127.0.0.1:3214 DATABASE_URL=… CLONE=<worktree> node qa/script-boundary-proof.mjs
BASE_URL=http://127.0.0.1:3214 DATABASE_URL=… CLONE=<worktree> node qa/case-badge-proof.mjs
node qa/issue14-badge-api-proof.mjs          # external throwaway: POST + PATCH transitions
BASE_URL=http://127.0.0.1:3214 node qa/faq-diff.mjs
DATABASE_URL=…/opinio_issue_14 SMOKE_PORT=3991 node scripts/verify-share-previews.mjs
node qa/share-image-merged-proof.mjs
BASE_URL=http://127.0.0.1:3214 CHECK_ROUTES=/,/directorio,/b/99minutos,/b/abba-joyas \
  CHECK_DEVICES=desktop,mobile node scripts/seo-image-layout-check.mjs
BASE_URL=http://127.0.0.1:3214 WIDGET_TOKEN=wgt_amazon_ribbon_2026 SLUG=amazon \
  node scripts/verify-security-headers.mjs [--embed]
```

- Homepage entity: **8/8 verdicts** — server and DOM JSON-LD `@graph` carries `Organization` and
  `WebSite` (both named "Opinio México") and **no `LocalBusiness`**; no address/telephone/opening
  hours/aggregateRating/review properties; brand consistent with the visible page. Independently
  parsed from the production-mode HTML: types `["Organization","WebSite"]`, `hasLocalBusiness=false`.
- Passport claims (#6): attribution **7/7** on the default-origin server — generic Organization type,
  no `areaServed`, neutral Organization description, no placeholder telephone, "ámbito registrado:"
  caption, directory breadcrumb to the real `/directorio`, passport breadcrumb to `/directorio`.
  Script boundary **5/5** with the payload in emitted fields (`brand_name` + `category`): JSON-LD
  contains `\u003c/script>` and no raw `</script>`, zero script execution and zero page errors, block
  parses, fixture rendered, counts `1108 → 1109 → 1108`. Anonymous author **5/5**: a blank author
  omits JSON-LD `author` and displays no fabricated "Comprador verificado"; a real name is still
  published; derived metrics restored. Case badge: SQL fixture **4/4** (unconfirmed state neutral —
  no verified tint/check icon — confirmed state styled), and the API-driven ext proof **7/7**:
  `POST /api/v1/cases` 201 → badge neutral → `PATCH /api/v1/cases/<id> {"is_consumer_confirmed":true}`
  200 → badge "Resolución confirmada" with check icon → exact case deleted, derived metrics restored.
  FAQ wording diff: 4→4 entries per route with exactly 2 changed (count-only claim removed).
  Source-state caveat: the local catalogue contains no review/identity/official-record rows, so the
  missing/verified/pending/rejected record states are covered by `passport-evidence` unit cases
  (13/13, including "surfaces pending, rejected and unrecognized record states instead of verified")
  and by the missing-data behavior observed on rendered passports — not by local fixtures.
- Share previews (#10): committed harness **24/24 PASS, exit 0** (origin pinned to its own loopback
  port so every emitted image URL is really fetched): every public family reuses its accepted #4
  identity, parameter-free purpose URLs for search/case entry, page-ordinal canonicals for the
  directory, no `og:`/`twitter:` echo of query keys, merchant parameters, form values, case ids or
  widget tokens on public variants and private surfaces, images `200 image/png 1200x630`, unknown
  slug 404; case-portal fixture removed (`resolution_cases 0 → 0`). Independent image proof **6/6**:
  8 routes emit and fetch their own image (`1200x630` PNG), unknown slug has none, portal preview
  leaks nothing, fixture `1 → 0`. Re-run in production mode: 6/6.
- Image layout/loading (#9): harness **failures=0, exit 0**, desktop + mobile over
  `/`, `/directorio`, `/b/99minutos`, `/b/abba-joyas`; per route
  `offscreenFetched=0 visibleNotLoaded=0 logoShifts=0`; `/directorio` renders 60 images and fetches
  44 (desktop) / 6 (mobile) — placement-based loading on the real blocked/replayed geometry. No
  attribute/default-value/pixel-copy assertions and **no field CWV claim**.
- Response policies (#11): header-only **26/26 PASS** and the two-origin browser run
  (app on `127.0.0.1:3214`, embedder on `localhost:3291`) **39/39 PASS** — app surfaces carry
  `Referrer-Policy: strict-origin-when-cross-origin` + CSP `frame-ancestors 'self'` and a genuine
  cross-origin frame is refused (CSP violation logged in the console); widget routes carry
  `no-referrer` + `frame-ancestors *`, render in the embedder at 200 with the requested token, send
  no referrer, and the app probe from the widget frame reaches the embedder with origin-only Referer.
  Widget *content* on a zero-review catalogue is the pre-existing demo copy (source constants:
  `calculated_rating || 5.0` → `OpinioPrestigeRibbon` default 4.8, `review_count || 50`), observed
  rendered as "Excelente 5.0/5 (50+ reseñas verificadas)"; it makes no genuine-review claim and is
  explicitly out of scope for #14.

### 2.4 Public forms, private paths and analytics (#7 — JEV-011/JEV-013/JEV-018)

```
BASE_URL=http://127.0.0.1:3214 SHA=<head> node qa/issue7-interaction-proof.mjs
BASE_URL=http://127.0.0.1:3214 SHA=<head> node qa/issue7-targeted-flows.mjs
BASE_URL=http://127.0.0.1:3214 SHA=<head> node qa/issue7-wizard-js.mjs
node qa/issue14-forms-api-proof.mjs      # real 201 intake + opinion writes, private fixtures
node qa/issue14-analytics-proof.mjs      # real SDK, fake id, all external sinks answered locally
```

- Hydrated utility journeys: search typing/debounce/enter (`/verificar?q=amazon`), no-match query,
  unknown folio, unknown merchant 404, merchant selection, case prefill, wizard validation and
  back-navigation, publish attempt and retry — 11 + 15 + 8 steps with zero unexpected console errors
  and all non-GET/HEAD write attempts (publish retry ×2) answered locally with 503.
- Real write surface proof (private DB only): case intake through the real UI →
  `POST /api/v1/cases` **201** (`CASO-AMAZ-2026-3228` dev / `CASO-AMAZ-2026-7612` production) with the
  case page rendering its case number; opinion wizard → `POST /api/v1/reviews` **201**
  (review ids 5/6), success state "Tu opinión se publicó"; both fixtures deleted exactly
  (`1 → 0`, `1 → 0`), counts restored, all seven derived business columns + `updated_at` restored
  byte-for-byte, consoleErrors 0. No production review/case was touched.
- Analytics consent (opt-in) with the **real** `gtag.js` under a fake id and every other external
  request intercepted locally: **14/14 verdicts in dev and production mode**.
  - before consent: banner shown, zero SDK requests, zero transmissions;
  - deny: still zero transmissions, storage `denied`, `ga-disable-G-FAKE14TEST = true`;
  - grant (real UI click): SDK fetched (7 requests, host/path/id verified) and the app itself emits a
    `page_view` — positive public transport with `tid=G-FAKE14TEST`, `dl` exactly the public page
    location, `dr` empty or origin-only;
  - query stripping: `/verificar?q=SECRETQUERYXYZ` transports `dl=…/verificar` (no query) and no
    transmission URL, body line or header contains the secret;
  - cold private families with a pre-granted choice: `/caso/<fixture id>`, `/merchant?business=…`,
    `/widget/<token>` produce zero transport and never appear as a page location; whitelisted utility
    routes transport the bare path only (`/caso/nuevo`, `/escribir-opinion/amazon`);
  - public → private → public SPA transitions keep zero private transport and safe referrers; every
    transmitted page location is in the public allowlist; no case number, fixture marker, customer
    contact, merchant query token or widget token appears anywhere in the recorded transcript
    (URLs + POST batch lines + headers), and every non-SDK external request was fulfilled locally
    (17/17 `fulfilled-204`). No real GA property exists in this run; the property-level settings of any
    deployed account remain unassessed.
  - Existing policy preserved: the public/whitelist classification itself was not changed.

### 2.5 Compiler, unit, lint, build and the production-mode app

```
node node_modules/typescript/bin/tsc --noEmit                 # exit 0
node node_modules/vitest/vitest.mjs run                       # 5 files / 58 tests passed
node node_modules/eslint/bin/eslint.js                        # exit 0, 22 pre-existing warnings
OPINIO_NEXT_DIST_DIR=.next-qa14-standalone next build --webpack   # exit 0
cp -r .next-qa14-standalone/static .next-qa14-standalone/standalone/.next-qa14-standalone/static
cp -r public .next-qa14-standalone/standalone/public
cd .next-qa14-standalone/standalone && PORT=3214 HOSTNAME=127.0.0.1 node server.js
```

- Vitest composition: analytics 11, directory-pagination 11, passport-metadata 11, scoring 12,
  passport-evidence 13. Lint findings are all pre-existing warnings in unrelated components (e.g.
  the dead demo `TransferSimulator`); no new warnings were pinned or added.
- Production-mode app (standalone, cwd = `standalone/`): `/`, `/directorio`,
  `/directorio?page=19`, `/b/amazon`, `/merchant`, `/merchant?business=amazon`, `/verificar`,
  `/caso/nuevo`, `/escribir-opinion/amazon`, all four widget variants, `/sitemap.xml`,
  `/robots.txt`, `/api/v1/businesses/amazon` → **200**; `/compartir/preview` → `200 image/png`
  (51,542 B); `/b/amazon/opengraph-image` → `200 image/png`, magic `89504e470d0a1a0a`;
  `/b/smoke-missing-merchant-xyz` → **404**; CSS (71,650 B) and JS chunks served 200 only after the
  static copy into the standalone tree. Browser collector over 10 routes: server 200 / browser 200,
  one `h1` per rendered route, DOM/head parity, zero console errors except the intentional 404.
  The full battery above (indexing, share images, forms, security, directory, merchant, analytics)
  was re-run against this production-mode server with the same green results.

## 3. Acceptance criteria mapping

- [x] **AC1 — merchant navigation, indexing directives, canonical ownership, metadata, structured
  data, images, directory behavior and response policies verified.** Sections 2.1–2.3: merchant
  9/9 + populated 7/7; indexing 17/17 with sitemap 1128 = original 1110 + 18 real pages; directory
  73/73 and DOM 6/6; metadata 28/28 with case lifecycle; homepage `@graph` Organization + WebSite
  (no LocalBusiness, no unsupported properties); passport evidence 7/7 + 5/5 + 5/5 and API badge
  7/7; share previews 24/24 + 6/6 with fetched 1200×630 PNGs; response policies 26/26 + 39/39.
- [x] **AC2 — working public forms, passport discovery and the existing opt-in analytics/private-route
  exclusions preserved.** Section 2.4: hydrated journeys, real 201 intake and opinion writes with
  private fixtures and exact cleanup, wizard back/state behavior, and the consent-gated analytics
  path (denied/pending silence; positive public transport only after a real grant; query, form, case,
  merchant and widget data never transmitted; private families silent). The public/whitelist/private
  classification is unchanged from the shipped policy.
- [x] **AC3 — explicit dispositions for all 28 original findings, including rejected JEV-005/JEV-015
  and the qualified findings.** Section 5 (28 rows, each with owner verdict, ticket, disposition,
  evidence anchor and residual uncertainty) and section 6 (rejected recipes + guardrails).
- [x] **AC4 — provider snapshots reused; no new paid calls; no historic GA4 or nonexistent field CWV
  required.** No provider request was made by #14 (the audit ledger `17 requests / $0.302132` and the
  #12/#13 snapshot reads are reused as-is). Historial GA4 exports and field CrUX data do not exist
  for this property and are recorded as unknown, not fabricated.
- [x] **AC5 — only observed runtime results; no target score as proof; human outreach not claimed
  complete.** Every figure above is an observed HTTP/DOM/API/compiler result on the local runtime;
  the audit's 83/100 score is not used as proof, no score improvement is claimed, and the #13
  authority-building brief explicitly keeps human outreach unperformed.

## 4. Preserved policies and regression guards (re-verified on this head)

- Search (`/verificar` + variants) and case entry (`/caso/nuevo` + `?b=`) stay `noindex, follow`,
  crawlable, with no canonical; opinion entry stays indexable with the merchant self-canonical;
  passports and the directory stay indexable with self-canonicals; the sitemap keeps all prior
  entries and adds exactly the real directory pages.
- Private surfaces (`/merchant*`, `/caso/<id>`, `/widget/*`) remain outside analytics, outside share
  identities (only the neutral platform card) and unchanged by this ticket; the numeric case-portal
  access path is **not** an auth fix (see section 8).
- Structured data emits only claims with recorded backing; the rejected recipes stay rejected
  (section 6). No new schema types, no invented dates, no fabricated reviews or credentials.

## 5. Disposition of all 28 original findings

Owner verdicts are those recorded in the retained audit (`owner-review.json`); each row records what
was shipped/observed for it on this head and what remains uncertain. Shipped details live in the
committed per-ticket records (see section 9), which this table maps.

| JEV | Owner verdict | Ticket | Disposition on this head (observed) | Residual uncertainty |
| --- | --- | --- | --- | --- |
| 001 | Confirmed | #2 | `/merchant` 500 removed; 9/9 merchant-flow checks at 80 ms injected DB latency, production mode re-checked | Original production root cause is [INFERENCE] (no server logs) |
| 002 | Review signal | #6 | Passport claims rewritten to recorded facts; attribution 7/7; helpfulness remains an editorial judgment | No ranking/helpfulness guarantee; provider "helpfulness" scores not re-run |
| 003 | Confirmed | #2 | Same repair as 001 (one shared error destination) | Same as 001 |
| 004 | Confirmed | #8 | Homepage `@graph` Organization + WebSite, no LocalBusiness, no unsupported properties (8/8, both modes) | No third-party validator call was made |
| 005 | Recommendation rejected | — | Rejected LocalBusiness recipe: homepage stays Organization/WebSite; guardrail = no address/telephone/openingHours/aggregateRating emitted (verified by the unsupported-property scan) | None (rejection by owner review) |
| 006 | Qualified coverage observation | #13 | Brief only: reported bulk referring domains `0` and summary `null/No data` recorded as reported/unknown; peers are context, not targets; no outreach performed | Backlink/AI-absence claims unproven; human authority work is owner-executed |
| 007 | Hypothesis | #12 | Investigation, no code: real 1200-profile inventory and the term's ambiguity recorded; no page invented for the ambiguous term | Intent/last-mile attribution unassessed; 3,600/mo is not current measured demand; GSC summary unfiltered |
| 008 | Confirmed, scoped | #4 | Scope-aware titles/descriptions; metadata 28/28; same-brand records stay distinguishable (11 unit cases) | Local 1108 ≠ production 1200; crawl-level 308 duplicate-title figure not re-crawled |
| 009 | Automated observation retained | #6 | Same as 002 — attributable evidence, no invented reviews | Editorial metric, not a guarantee |
| 010 | Template policy review | #4 | Search/case-entry got their own purpose titles; opinion entry merchant title (17/17 indexing + DOM parity) | None observed |
| 011 | Partly raw-HTML artifact | #7 | Hydrated journeys show real content (no consumer-visible defect reproduced; no source change needed) | Raw-shell word counts remain a crawl artifact |
| 012 | Crawl observation qualified | #5 | Bounded pagination + cached reads; lab payload/latency pair on the same population; request-rendered, not ISR | Lab-only; production TTFB is not claimed |
| 013 | Template judgment qualified | #7 | Same as 011 | Editorial |
| 014 | Review signal, scoped | #6 | Same as 002/009; FAQ wording diff shows the count-only claim removed (2 of 4 entries) | Editorial |
| 015 | Rendered-UI false positive | — | Rejected bulk-H1 recipe: representative hydrated routes render exactly one `h1` (collector over 10 routes); utility forms are not padded into article-length pages | None (rejection by owner review) |
| 016 | Raw duplicate observation | #3 | Noindex policy for utility families; 17/17 indexing; identical-main-text observation is a raw-shell artifact | Crawl-level recount not performed |
| 017 | Editorial heuristic | #6 | Recorded facts now quoteable; citeability metric not pursued | No AI-citation guarantee |
| 018 | Needs rendered-UX review | #7 | Hydrated flows verified, no defect reproduced; no source change | Editorial |
| 019 | Security policy review | #11 | Route-scoped Referrer-Policy + CSP frame-ancestors; 26/26 headers and 39/39 two-origin browser | No CDN response observed; widget stays embeddable from any origin by design (token = capability) |
| 020 | Length heuristic | #4 | Titles/descriptions re-scoped; length distribution recorded in #4's evidence | Length target itself is a heuristic |
| 021 | Attribute check, not proven CLS | #9 | Reserved image boxes + placement-based loading; 0 findings desktop/mobile, `logoShifts=0` | No field CLS; lab measurement only |
| 022 | Editorial review signal | #6 | Same as 002 | Editorial |
| 023 | Automated observation retained | #10 | Per-family preview identity + image; 24/24 and 6/6, emitted images fetched and decoded 1200×630 | Not deployed, so no production crawler re-check |
| 024 | Confirmed, utility scope | #3 | Utility families noindex; sitemap excludes them; robots.txt keeps them crawlable | Production crawl not re-run |
| 025 | Confirmed policy gap | #3 | Canonical ownership defined per family (self-canonical, parameter-free utility URLs) | Production crawl not re-run |
| 026 | Confirmed, scoped | #4 | Duplicate meta descriptions addressed by scope-aware identity; collisions recorded with assessed/unassessed split | 15 production records unassessed (recorded in #4) |
| 027 | Template judgment qualified | #4 | Weak meta descriptions replaced by purpose/merchant descriptions; 28/28 | Editorial |
| 028 | Measured size, qualified | #5 | Decompressed 3.8 MB → 252 kB HTML on the bounded first page (brotli 145,508 → 15,620 B in #5's measurement) | Lab measurement; transfer size depends on CDN |

## 6. Rejected implementation recipes and their guardrails

- **JEV-005 (LocalBusiness recipe) — rejected.** The homepage entity remains `Organization` +
  `WebSite` with only recorded platform facts; no `LocalBusiness`, address, telephone, opening hours,
  geo, price range or `aggregateRating`/`review` properties are emitted. Verified by the homepage
  proof's forbidden-property scan (both server HTML and rendered DOM) and an independent parse of the
  production-mode HTML. The original recipe was not implemented anywhere.
- **JEV-015 (bulk-H1 recipe) — rejected.** No heading was duplicated or padded for word count.
  Representative hydrated routes render exactly one `h1` (collector over `/`, `/directorio`,
  passports, opinion entry, search, case entry, merchant, widget), and the utility forms keep their
  real short-form content; the raw-shell "pages without H1" count was a client-rendering artifact
  (recorded in #7), not a defect to fix by adding headings.

## 7. Uncertainty and unassessed items (explicit)

- **Field data absent:** no CrUX/field CWV for this property; all performance figures here and in the
  per-ticket docs are lab observations on one host (Chrome 154, webpack dev or standalone). No INP,
  LCP or CLS field claim is made.
- **Historic analytics absent:** no historical GA4 export exists; analytics verification exercises the
  *current* shipped transport with a fake id and local interception. Property-level GA4 settings and
  any deployed account configuration are unassessed.
- **Credential authenticity:** government-credential and registry provenance is **UNASSESSED** —
  the passports display Opinio's recorded attributions, not independent confirmation by the named
  authorities; dates render from recorded fields, not import timestamps.
- **Production is not observed:** no production page, header, sitemap or crawler behavior was
  re-measured for this record; production figures quoted in the table (1200 profiles, 1202 crawled
  URLs, provider snapshots, GSC rows) are the retained audit's values reused as-is.
- **Local vs production populations differ** (1108 vs ~1200); no local count is presented as a
  production fact, and no count-matching is forced.
- **Search/authority gaps:** `especializadas` intent and landing-page attribution remain unassessed;
  the reported `0 referring domains` and the `null/No data` summary remain reported/unknown — they
  are neither evidence of absence nor presence.
- **Widget demo copy** (rating/review-count fallbacks) is pre-existing and out of scope; it is not
  used as evidence of reviews or as a claim about any merchant.
- **Mobile horizontal overflow** on public surfaces is pre-existing (recorded by earlier tickets as
  out of scope); this record makes no claim that it was fixed and observed no regression from the
  changes above.
- The **whole-branch two-axis review** of `fefc090…`→final head is the director's next step; this
  record is input, not a substitute.

## 8. Pre-existing, out-of-scope human risks (recorded, not modified)

1. **Exposed production-looking database credentials in tracked files (baseline, not introduced
   here):** `Dockerfile:17` (`ARG DATABASE_URL=<production-looking postgres URL>`) and
   `scripts/seed-mexican-stores-scale.ts:7` (same URL as a default). Values are deliberately redacted
   in this record. **Owner action required:** rotate the credential and inject it via secret handling
   before any release; no account change was made by this workstream.
2. **Numeric private-case API/path access gap (baseline):** `/caso/<id>` and
   `GET/PATCH /api/v1/cases/<id>` are reachable by numeric id without a token; `GET /api/v1/search`
   returns `businesses.*` (phone, whatsapp, rfc) to unauthenticated callers. This needs an owner
   privacy/access-control triage before release. The analytics and share-metadata exclusions in this
   workstream do **not** constitute an authentication fix, and this record does not claim one.
3. **Mixed historical seed review counts and government-credential provenance are not independently
   certified**; the local catalogue used for verification contains no reviews, cases or identities,
   and demonstration seeds were deliberately not loaded.
4. **Widget surfaces render demo rating/review-count fallbacks** on a zero-review catalogue (section
   2.3, source constants cited). Cosmetic/trust copy only; no genuine-review claim is made.

## 9. Evidence index

External tree (not part of the repository):
`C:/Users/isaac/tmp/opinio-remediation/`

- QA scripts used (throwaway, outside the repo): `qa/issue14-forms-api-proof.mjs`,
  `qa/issue14-badge-api-proof.mjs`, `qa/issue14-analytics-proof.mjs` plus the reused
  `qa/{render-evidence, merged-homepage-proof, attribution-proof, anonymous-author-proof,
  script-boundary-proof, case-badge-proof, faq-diff, issue3-indexing-proof, directory-browser-proof,
  merchant-cases-populated-proof, share-image-merged-proof}.mjs`.
- Raw logs and artifacts: `evidence/issue14/` (dev mode) and `evidence/issue14/standalone/`
  (production mode) — harness logs (`verify-merchant-flow.txt`, `verify-seo-indexing.txt`,
  `verify-seo-metadata.txt`, `verify-directory-pagination.txt`, `verify-share-previews.txt`,
  `seo-image-layout-check.txt`, `verify-security-headers*.txt`, `vitest-verbose.txt`,
  `tsc-noEmit.txt`, `lint.txt`, `next-build-standalone.txt`, `render-evidence.txt`, …), DOM
  captures (`dom/`, `issue3-dom/`, `directory-browser/`), images (`share-images/`, `og-amazon.png`),
  and per-proof `results.json` files. The two origin-expectation mismatches are kept as
  `verify-directory-pagination.origin-mismatch-3214.txt` and
  `attribution-proof.3214origin-mismatch.txt` (harness constants pin the deployment origin).
- Committed per-ticket records: `docs/seo-remediation/issue-2.md` … `issue-13.md` (each with its
  own commands, observed counts and limitations). Retained audit inputs (read-only):
  `C:/Users/isaac/ghprojects/opinio/jev-seo-reports/opinio.mx-2026-10-13-full/`.

## 10. Fixture hygiene, runtime incidents and disclosures

- **Fixtures:** every write went to the private `opinio_issue_14` database; every fixture was created
  through the real user/API path where that was the subject and removed by exact id afterwards, with
  pre/post counts and derived metrics (`trust_score`, `confidence_level`, `effective_reviews_count`,
  `resolution_rate`, `issues_per_thousand`, `median_response_hours`, `reopen_rate`, `updated_at`)
  restored. Final state: all eleven tables byte-identical to `opinio_template`
  (md5 of every row, 1108 businesses / 0 reviews / 0 cases / 0 messages / 12 widgets). The shared
  `opinio` and `opinio_issue_merge` databases were not written by #14.
- **Incident (disclosed):** one early boundary-harness invocation passed `SLUG=amazon` into a harness
  whose `SLUG` parameter names the fixture slug; it deleted the local `amazon` catalogue row (and its
  four widget rows by cascade) in the private database. The row and widgets were restored
  byte-identical from `opinio_template` and verified with per-table checksums before continuing; later
  runs used the harness's own fixture slug. No production data and no other database was affected.
- **Incident (infrastructure, disclosed):** the shared `opinio-seo-pg` container restarted during the
  session and its Windows port proxy stopped accepting new TCP connections (node `pg` got
  "Connection terminated unexpectedly" while `docker exec` still worked). Runtime-verification, the
  container owner, restarted the container and re-verified TCP; both verification servers were
  restarted once and the battery continued. No data was lost (post-recovery checksums matched).
- **Harness/expectation mismatches (not defects):** the directory-pagination harness and the
  attribution harness hardcode `https://opinio.mx` in some expectations; run against the
  loopback-origin server they scored 49/73 and 5/7, and against the default-origin server **73/73**
  and **7/7**. Both variants are retained. The unused loopback-origin mismatch lines are quoted only
  as environment mismatches.
- **Build churn:** `next build` rewrote `tsconfig.json` to include the throwaway dist dir; the file
  was restored to HEAD and nothing build-related is committed.
- **Prior workstream departures (recorded, not repeated):** an earlier read-only production aggregate
  PG probe (#2) and a consent QA visit with a real id (#8); the #10 first probe's 8 read-only public
  GETs (already disclosed in `issue-10.md`), after which the loopback guard was added. This record
  therefore makes no blanket "production was never touched" claim — the standing rule since those
  incidents is loopback-only, and no production write, deploy, paid call, account change or outreach
  was performed by any of them.

## 11. Reproduce

```bash
# 0. private database + deps (runtime-verification provisioning; no network)
docker exec -i opinio-seo-pg psql -U opinio -d opinio_issue_14 -t -c \
  "SELECT count(*) FROM businesses"                       # 1108

# 1. dev server with the loopback site origin and the fake GA id
DATABASE_URL=postgres://…@127.0.0.1:54732/opinio_issue_14 NEXT_TELEMETRY_DISABLED=1 \
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3214 NEXT_PUBLIC_GA_MEASUREMENT_ID=G-FAKE14TEST \
  node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3214

# 2. committed regressions (spawn or target their own servers)
DATABASE_URL=…/opinio_issue_14 MERCHANT_DB_DELAY_MS=80 node scripts/verify-merchant-flow.mjs
DATABASE_URL=…/opinio_issue_14 SMOKE_PORT=3988 node scripts/verify-seo-indexing.mjs
DATABASE_URL=…/opinio_issue_14 SMOKE_PORT=3989 node scripts/verify-seo-metadata.mjs
DATABASE_URL=…/opinio_issue_14 SMOKE_PORT=3991 node scripts/verify-share-previews.mjs
DATABASE_URL=…/opinio_issue_14 BASE_URL=http://127.0.0.1:<default-origin-port> \
  node scripts/verify-directory-pagination.mjs
BASE_URL=http://127.0.0.1:3214 CHECK_DEVICES=desktop,mobile \
  CHECK_ROUTES=/,/directorio,/b/99minutos,/b/abba-joyas node scripts/seo-image-layout-check.mjs
BASE_URL=http://127.0.0.1:3214 WIDGET_TOKEN=wgt_amazon_ribbon_2026 SLUG=amazon \
  node scripts/verify-security-headers.mjs --embed

# 3. external proofs (all refuse non-loopback base/DB; fixtures cleaned)
BASE_URL=http://127.0.0.1:3214 DATABASE_URL=…/opinio_issue_14 CLONE=<worktree> node qa/issue14-forms-api-proof.mjs
node qa/issue14-badge-api-proof.mjs
BASE_URL=http://127.0.0.1:3214 DATABASE_URL=…/opinio_issue_14 MEASUREMENT_ID=G-FAKE14TEST node qa/issue14-analytics-proof.mjs

# 4. compiler + production mode
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node node_modules/eslint/bin/eslint.js
OPINIO_NEXT_DIST_DIR=.next-qa14-standalone NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3214 \
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-FAKE14TEST node node_modules/next/dist/bin/next build --webpack
```

Wording to keep: **"local integration branch verified at `976989d0…`; not pushed, published,
released or deployed."** Issue #14 remains open for the director's merge and whole-branch review.
