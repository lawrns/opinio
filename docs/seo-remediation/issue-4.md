# Issue #4 — Give page families accurate, scope-aware titles and descriptions

Branch: `fix/opinio-seo-issue-4` (base integration branch `fix/opinio-seo-remediation` @ `8864ac138f372fc5187e9fc9354511193ac72f29`, which already contains the reviewed #3/#7/#8/#12/#13 merges).
Worktree: `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-4`.

Claim: https://github.com/lawrns/opinio/issues/4#issuecomment-6157145495 (session `seo-4`).

## What the audit asked for

JEV-008/JEV-010/JEV-020/JEV-026/JEV-027: six duplicate-title groups in the crawl — one large fallback-metadata family (298 pages: `/`, `/verificar*`, `/caso/nuevo*`) and five pairs of same-brand merchant records — plus duplicate/weak descriptions and titles outside the display heuristic. The ticket fixes the rule: use the approved #3 indexing/canonical families, state the identity and the known geographic/record scope of each passport, never merge records because a title matches, and let title length stay a heuristic.

## Changes

| File | Change |
| --- | --- |
| `src/lib/passport-metadata.ts` (new) | `passportRecordScope`, `passportTitle`, `passportDescription`: the passport identity/scope rules in one deep module (classification of `operating_area`, razón-social clause, title and description composition). |
| `src/lib/passport-metadata.test.ts` (new) | Behavioural unit tests over the five observed same-brand pairs, scope classification, placeholder handling, address non-publication and the brand-repeating razón social. |
| `src/app/b/[slug]/page.tsx` | `generateMetadata` composes the passport title/description through the new module instead of the single hardcoded template. Canonical, OG/Twitter wiring, keywords and the 404/error branches are unchanged. |
| `src/app/verificar/layout.tsx` | Purpose title/description for the search family; `robots: { index: false, follow: true }` unchanged. |
| `src/app/caso/nuevo/layout.tsx` | Purpose title/description for the case-entry family; `robots: { index: false, follow: true }` unchanged. |
| `src/app/caso/[id]/page.tsx` | Static, purpose-only metadata for the private case portal (no case id, case number, customer name, contact or merchant name). No indexing/auth policy change. |
| `scripts/verify-seo-metadata.mjs` (new) | Deterministic HTTP regression: boots `next dev` against the ticket database and asserts the served HTML for the utility families, representative passport identities, every same-brand group in the database, the canonical/indexing policy and the case-portal privacy rule. |

`/directorio` metadata is deliberately untouched: its hunk is scheduled after #5 (paginated directory) lands in the integration branch (see *Shared-contract notes*). The homepage metadata and the #8 Organization/WebSite JSON-LD are untouched.

## Design decisions

1. **A record is never merged or re-canonicalised.** Every passport keeps its own slug, self-canonical and indexing state; only the identity statement changes. Two records that share a brand stay two pages.
2. **The metadata states what the record holds.** `operating_area` is free-form source data: a national coverage statement, a city ("Monterrey, Nuevo León"), a registered street address, or a source placeholder ("NO PROPORCIONA", "DATOS POR SUCURSAL. CONSULTAR"). Classification:
   - national coverage → `cobertura nacional`;
   - compact place → `cobertura en <valor>` (title) / `Cobertura: <valor>.` (description);
   - street-level address → `domicilio registrado` in the title and "Domicilio registrado en el expediente." in the description: the record is a specific-location record, but the raw address is not published in the title/description (it stays on the page, under the page's own "Cobertura" label);
   - placeholder/empty → no geographic claim at all.
3. **Identity clause.** The title carries the razón social's entity name (the legal name before the corporate form) when it adds information; when the razón social merely repeats the brand ("Innovasport, S.A. de C.V." for Innovasport), the catalogue category carries the distinction instead, so the title does not repeat the brand. The description always carries the full razón social when the record has one.
4. **Title shape.** `¿Es confiable <marca>? <identidad|categoría> · <ámbito> | Opinio México`, falling back to `Pasaporte de Confianza` when no distinguishing fact is known. Length stays a display heuristic as the ticket states; the observed median across the real inventory is reported below.
5. **Utility families describe their working function** and keep the approved noindex-but-crawlable policy: search → "Buscar y verificar un comercio antes de comprar", case entry → "Registrar un caso de compra". Query and merchant parameters never appear in utility metadata.
6. **Private case portal metadata is static and generic**, per the shared privacy contract: title/description contain no case identifiers, names, contacts, form values or merchant names.
7. **Homepage metadata was reviewed and left as-is**: it is the platform's own brand identity already reviewed with #8, it is no longer shared with any utility family (the fallback group is resolved), and #10 will reuse it for share previews.

## Verification (observed)

Runtime (runtime-verification's isolated environment): private DB `opinio_issue_4` (1108 real PROFECO/AMVO-derived catalogue businesses, 0 reviews/cases), dev mode `next dev --webpack -H 127.0.0.1 --port 3204`.

1. HTTP regression (`scripts/verify-seo-metadata.mjs`), local branch, `21/21 checks passed`, exit 0:

   ```
   DATABASE_URL='postgres://…@127.0.0.1:54732/opinio_issue_4' SMOKE_PORT=3204 \
     node scripts/verify-seo-metadata.mjs
   ```

   Observed excerpts:
   - `/verificar`, `/verificar?q=luuna`, `/verificar?categoria=Restaurantes&accion=opinar` → `200`, title `Buscar y verificar un comercio antes de comprar | Opinio México`, `robots="noindex, follow"`;
   - `/caso/nuevo`, `/caso/nuevo?b=2io-electronics` → `200`, title `Registrar un caso de compra | Opinio México`, `robots="noindex, follow"`;
   - `/verificar?q=SmokeTokenXYZ` → the query token appears in neither title nor description;
   - `/b/2io-electronics` → title `¿Es confiable 2Io Electronics? ASSENSUS ETAIL · domicilio registrado | Opinio México` (identity + specific scope, no street value);
   - `/b/ahal-cosmetica` → title `¿Es confiable Ahal Cosmética? Ahal Bio Cosméticos · cobertura en Monterrey, Nuevo León | Opinio México`;
   - `/b/99minutos` → title `¿Es confiable 99MINUTOS? Comercio Electrónico Especializado · cobertura nacional | Opinio México`, description carries no razón social claim;
   - every same-brand group in the database stays distinguishable over HTTP: 10 groups in this run, which included the five verification rows (see the five audit pairs below); re-run after the verification rows were deleted, against the pristine ticket database (1108 records, 5 groups — `bestday`/`best-day`, `claro-shop`/`claroshop`, `h-m`/`hm`, `levi-s`/`levis`, `smart-fit`/`smartfit`) the same script again reports `21/21 checks passed`;
   - `/b/2io-electronics` → indexable, `canonical=https://opinio.mx/b/2io-electronics`; `/directorio` → indexable, `canonical=https://opinio.mx/directorio`; unknown slug → `404` without canonical;
   - local verification case created through `POST /api/v1/cases` (case `CASO-2IOE-…`, ticket DB only), `/caso/<id>` → title `Seguimiento de caso | Opinio México` with no case number, id, customer name, contact or merchant name in `<head>`; the row was deleted afterwards (`resolution_cases 0 → 0`).

   Cross-check on the same branch: the #3 policy regression (`scripts/verify-seo-indexing.mjs`) still reports `17/17 checks passed` — utility noindex+follow including parameter variants, opinion-entry merchant self-canonical, passport and directory indexability, sitemap exact-set (`1110` declared URLs, `1108/1108` passports matching the database inventory, `0` utility entries), `robots.txt` not blocking, unknown slug `404` without canonical.

2. The five audit pairs, both sides served in the local runtime. The local catalogue holds one side of each pair, so the other side was inserted into the ticket database from the facts observed on the live production pages during the authorized read-only crawl (h1 brand, "Razón social", "Categoría", "Cobertura", domain), and deleted after capture (businesses `1108 → 1113 → 1108`):

   | Pair | Served title |
   | --- | --- |
   | `/b/mercado-libre` / `/b/mercadolibre` | `¿Es confiable Mercado Libre? DEREMATE.COM DE MÉXICO · domicilio registrado …` / `¿Es confiable Mercado Libre? DeRemate.com de México · cobertura nacional …` |
   | `/b/mercado-pago` / `/b/mercadopago` | `¿Es confiable Mercado Pago? Comercio Electrónico Especializado · cobertura nacional …` / `¿Es confiable Mercado Pago? MP Agregador · cobertura nacional …` |
   | `/b/innovasport` / `/b/innova-sport` | `¿Es confiable Innovasport? Moda, Calzado y Accesorios · cobertura en Monterrey, Nuevo León …` / `¿Es confiable Innovasport? Belleza, moda y calzado · cobertura nacional …` |
   | `/b/el-palacio-de-hierro` / `/b/palacio-de-hierro` | `¿Es confiable El Palacio De Hierro? Marketplaces y Tiendas Departamentales · domicilio registrado …` / `¿Es confiable El Palacio de Hierro? Retail y departamentales · cobertura nacional …` |
   | `/b/uber-eats` / `/b/ubereats` | `¿Es confiable Uber Eats? Comercio Electrónico Especializado · cobertura nacional …` / `¿Es confiable Uber Eats? Uber Portier México · cobertura nacional …` |

   (Recorded from the served HTML; `…` elides the shared `| Opinio México` suffix.)

3. Hydrated DOM parity (Playwright 1.59.1 + system Chrome, read-only collector `qa/render-evidence.mjs`; artifacts `evidence/seo-4/render/{results.json,*.png,*.html}`): 16 routes — `/directorio`, `/verificar?q=luuna&accion=opinar`, `/caso/nuevo?b=luuna`, `/escribir-opinion/luuna`, the ten passports of the five audit pairs, `/b/99minutos` and `/b/ahal-cosmetica` — returned `200` in both server HTML and the hydrated DOM with **0 metadata mismatches**, 0 console errors and 0 failed requests. Observed DOM titles:
   - `/verificar?q=luuna&accion=opinar` → `Buscar y verificar un comercio antes de comprar | Opinio México`, `robots="noindex, follow"`, canonical none (unchanged policy);
   - `/caso/nuevo?b=luuna` → `Registrar un caso de compra | Opinio México`, `robots="noindex, follow"`;
   - `/escribir-opinion/luuna` → `Escribir una opinión sobre Luuna | Opinio México`, `canonical=https://opinio.mx/escribir-opinion/luuna` (#3 behaviour unchanged);
   - every passport kept `canonical=https://opinio.mx/b/<slug>` and stayed indexable.
   `/directorio` still serves `Directorio de 1,199+ Tiendas en Línea y Comercios en México | Opinio México` in this branch: that hunk is scheduled after #5 (see *Shared-contract notes*).

4. Working forms at the DOM interface (Playwright, system Chrome, `evidence/seo-4/journey/journey.json`; 9/9 steps, no non-GET requests):
   - `/verificar` → typed `luuna` into the search box → the result list filtered from the full catalogue to 3 passport links → clicked the merchant → navigated to `/b/luuna`, document title `¿Es confiable Luuna? Comercializadora Zebrands · cobertura en Ciudad de México | Opinio México` (identity + place scope from the database row);
   - `/caso/nuevo?b=luuna` → merchant preselected as `Luuna (Comercializadora Zebrands, S. de R.L. de C.V.)` with the purpose title `Registrar un caso de compra | Opinio México`; the form was never submitted;
   - each of the five same-brand pairs rendered two distinct document titles in the hydrated DOM.

5. Unit tests: `node node_modules/vitest/vitest.mjs run src/lib/passport-metadata.test.ts` → 20/20 passed.

6. Inventory-level distinctness (artifacts `evidence/seo-4/inventory/{prod_passport_facts.json,uniqueness.json}`, computed with the module's rules over the facts observed on the 1200 production passport pages of the audit crawl: h1 brand, "Razón social", "Categoría", "Cobertura"; a tab-separated dump of the local catalogue rows, 1097 of 1113 parseable, gives the same result): **0 duplicate titles and 0 duplicate descriptions** at both case-insensitive and punctuation-insensitive comparison, while the previous single template produced 5 exact duplicate-title pairs plus a 298-page fallback family. Observed title length across the production inventory: p50 96, p90 108, max 148 characters (the previous template was 71–75 characters on every passport); title length remains a display heuristic per the ticket. The authoritative local check is the HTTP harness above, which compares the served pages of every same-brand group in the database.

## Shared-contract notes

- **#6** owns the in-body JSON-LD (FAQ/WebPage claims) on the passport: the `WebPage` name/description inside `b/[slug]/page.tsx` were left untouched, so they still carry the previous wording and can be aligned by #6 within its own evidence scope.
- **#8** homepage Organization/WebSite JSON-LD untouched; homepage metadata untouched.
- **#10** will reuse the accepted passport title/description for share previews: the passport `openGraph`/`twitter` blocks still compose from the same `title`/`description` values, so #10 builds on the accepted identity.
- **#5** (not merged yet) owns the directory's paginated canonical contract (`/directorio` + `?page=N` self-canonical, 60 rows/page, public query caching). The directory metadata hunk stays out of this branch until #5 lands in the integration branch; it will be rebased on #5's patterns without touching foreign files.
- The duplicated `siteBaseUrl()`-style origin fallback in `app/layout.tsx`, `b/[slug]/page.tsx`, `escribir-opinion/[slug]/page.tsx`, `directorio/page.tsx`, `sitemap.ts` and `robots.ts` was left as-is per ticket guidance (no speculative global origin abstraction); the new module is limited to record identity/scope text.

## Limitations

- The local catalogue (1108 records) is smaller than the production sitemap scope (1200 profile URLs); no local count is presented as a production figure. The five-pair proof above uses the ticket database with rows captured from the production crawl, labelled as local verification rows and deleted after capture.
- Verification ran in dev mode (`next dev --webpack`); `next build`/standalone and `pnpm lint`/`vitest` across the repo are main-agent/closure checks.
- Turbopack dev cannot load the externalized `pg` driver on this host (pre-existing host limitation, also reproduced in the root checkout), so `--webpack` was used.
- Title length grows for records whose razón social is long; per the ticket, character count remains a display heuristic, not a threshold.
