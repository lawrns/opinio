# Issue #4 — Give page families accurate, scope-aware titles and descriptions

Branch: `fix/opinio-seo-issue-4`, worktree `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-4`, based on integration `fix/opinio-seo-remediation` @ `8864ac138f372fc5187e9fc9354511193ac72f29` and merged with integration head `f90ad9a35483131f49a843ee742fd0d49c6c1737` (which brought in #5's directory pagination).

Claim: https://github.com/lawrns/opinio/issues/4#issuecomment-6157145495 (session `seo-4`).

## What the audit asked for

JEV-008/JEV-010/JEV-020/JEV-026/JEV-027: six duplicate-title groups in the crawl — one large fallback-metadata family (298 pages: `/`, `/verificar*`, `/caso/nuevo*`) and five pairs of same-brand merchant records — plus duplicate/weak descriptions and titles outside the display heuristic. The rule for the fix: use the approved #3 indexing/canonical families, state each passport's identity and known geographic/record scope accurately, never merge records because a title matches, and treat title length as a display heuristic.

## Changes

| File | Change |
| --- | --- |
| `src/lib/passport-metadata.ts` (new) | `passportMetadata(facts)` is the module's only export: it computes a passport title and description once from four factual fields (`brand_name`, `legal_name`, `category`, `operating_area`) with conditional string appends, and the caller passes the database row directly. An internal helper returns the recorded scope verbatim or `null` for placeholders/empty values — no discriminant object, no classification. |
| `src/lib/passport-metadata.test.ts` (new) | Semantics tests only (12 cases): same-brand records stay distinguishable in title and description, a non-informative source value stays out of the metadata, and an uncertain recorded value is never turned into coverage or a domicile. No rendered-wording copies, no passthrough echoes. |
| `src/app/b/[slug]/page.tsx` | `generateMetadata` calls `passportMetadata(row)`; the not-found and unavailable branches state the factual state ("Este comercio no está registrado en Opinio México." / "No pudimos cargar la información de este comercio en Opinio México.") instead of an imaginary validation process. Canonical, OG/Twitter wiring, keywords and the rest of the page are unchanged. |
| `src/app/verificar/layout.tsx` | Purpose title/description for the search family; `robots: { index: false, follow: true }` unchanged. |
| `src/app/caso/nuevo/layout.tsx` | Purpose title/description for the case-entry family; `robots: { index: false, follow: true }` unchanged. |
| `src/app/caso/[id]/page.tsx` | Static, purpose-only metadata for the private case portal (no case id, case number, customer name, contact or merchant name). No indexing/auth policy change. |
| `src/app/directorio/page.tsx` | Director-approved directory identity: purpose title/description without the hardcoded catalogue count or the audit claim, a `— página N` scoped identity for real catalogue pages (validated page only), share copy aligned to the same strings, and the `CollectionPage` name/description aligned as metadata-only. #5's pagination and canonical contract untouched. |
| `scripts/verify-seo-metadata.mjs` (new) | Deterministic HTTP regression (28 semantic checks, no rendered-copy constants) over the served HTML: utility families no longer serve the homepage fallback and stay distinguishable, passports quote the recorded scope verbatim without a classification, placeholders stay omitted, same-brand groups stay distinguishable, the directory identity carries no count/audit claim and is consistent across head, share copy and structured data, #5's page-aware canonical holds, and the private case portal serves identical purpose-only metadata for two different cases (both created and deleted in the run). Before any connection or server start it validates the *effective* `pg` configuration: the host must be loopback (`127.0.0.1`, `::1`, `localhost`) and the database a private `opinio_issue_*` one, otherwise it exits `2` without probing the target. |

## Design decisions

1. **A record is never merged or re-canonicalised.** Every passport keeps its own slug, self-canonical and indexing state; only the identity statement changes.
2. **The recorded scope is quoted verbatim, never classified.** `operating_area` is free-form source data, so it appears as `ámbito registrado: <valor>` in the title and `Ámbito registrado: <valor>.` in the description. The value's shape is not interpreted: a short value is not assumed to be a city, a long value is not assumed to be a street address, and neither is turned into a coverage or domicile claim. Source placeholders ("NO PROPORCIONA", "DATOS POR SUCURSAL. CONSULTAR") carry no scope and stay omitted rather than being published as a value.
3. **Identity comes from the record's own fields**: the published razón social verbatim when present, otherwise the catalogue category. No uniqueness-driven rewriting of identities; the description always carries the full razón social when the record publishes one.
4. **Utility families describe their working function** and keep the approved noindex-but-crawlable policy: search → "Buscar y verificar un comercio antes de comprar", case entry → "Registrar un caso de compra". Query and merchant parameters never appear in utility metadata.
5. **Private case portal metadata is static and generic** per the shared privacy contract; business record facts (razón social, ámbito) are public catalogue data and stay in the passport metadata.
6. **Directory identity is factual and count-free**: "Directorio de tiendas en línea y comercios de México" with a page-scoped variant for real catalogue pages; no hardcoded `1,199+` and no "auditadas por Opinio" claim.
7. **Homepage metadata was reviewed and left as-is**: it is the platform's own brand identity already reviewed with #8, it is no longer shared with any utility family, and #10 will reuse it for share previews.
8. **Factual unavailable states**: the passport not-found/unavailable branches no longer describe a validation process that the record does not evidence.
9. **The regression is semantic.** `scripts/verify-seo-metadata.mjs` asserts behaviour at the HTTP seam — distinguishability, verbatim scope, placeholder omission, no invented classification, canonical/indexing policy, no count/audit claim, no private-data leakage — and never pins the rendered wording or keeps copy constants; the literal strings are verified by hand against the DOM artifacts and recorded in this document.

## Verification (observed)

Runtime: private DB `opinio_issue_4` (1108 real PROFECO/AMVO-derived catalogue businesses, 0 reviews/cases), dev mode `next dev --webpack -H 127.0.0.1 --port 3204`.

1. HTTP regression (`scripts/verify-seo-metadata.mjs`), merged branch, **`28/28 checks passed`**, exit 0 (semantic checks only; the literal wording below is documented from the DOM evidence, not pinned as a copy in the harness):

   ```
   DATABASE_URL='postgres://…@127.0.0.1:54732/opinio_issue_4' SMOKE_PORT=3204 \
     node scripts/verify-seo-metadata.mjs
   ```

   Observed excerpts:
   - safety guard: `DATABASE_URL=postgres://fixture:fixture@db.example.invalid:5432/opinio` → `Refusing to run: … host="db.example.invalid" database="opinio"`, exit `2` before any connection or dev-server start; `DATABASE_URL=…@127.0.0.1:54732/opinio` (the shared database) → same refusal, exit `2`; the real flow below ran against `…@127.0.0.1:54732/opinio_issue_4`;
   - `/verificar`, `/verificar?q=luuna`, `/verificar?categoria=Restaurantes&accion=opinar` → `200`, purpose title, `robots="noindex, follow"`; `/verificar?q=SmokeTokenXYZ` → the token appears in neither title nor description;
   - `/caso/nuevo`, `/caso/nuevo?b=2io-electronics` → `200`, purpose title, `robots="noindex, follow"`;
   - `/b/2io-electronics` → `¿Es confiable 2Io Electronics? ASSENSUS ETAIL, S. DE R.L. DE C.V. · ámbito registrado: CARLOS DE VELASCO 307, COL. BURÓCRATAS DEL ESTADO, MONTERREY, NUEVO LEÓN, C.P. 64380 | Opinio México` (long recorded scope quoted verbatim, no classification);
   - `/b/99minutos` → `¿Es confiable 99MINUTOS? Comercio Electrónico Especializado · ámbito registrado: Nacional (México) | Opinio México`, description without a razón-social claim (the record publishes none);
   - `/b/acapella` (source value `NO PROPORCIONA`) → scope omitted: `¿Es confiable Acapella? ACAPELLA MX, S.A.P.I. DE C.V. | Opinio México`;
   - `/directorio` → `Directorio de tiendas en línea y comercios de México | Opinio México`, description `Consulta el directorio de tiendas en línea y comercios de México y accede a sus pasaportes con información registrada, fuentes y opiniones disponibles.`, `canonical=https://opinio.mx/directorio`, `og:title`/`og:description` and the `CollectionPage` node stating the same strings, and no `1,199`/`auditad` text in the served head;
   - `/directorio?page=2` → `Directorio de tiendas en línea y comercios de México — página 2 | Opinio México`, `canonical=https://opinio.mx/directorio?page=2`; `/directorio?page=2&utm_source=smoke` → same canonical (incidental parameters not serialized);
   - every same-brand group in the database stays distinguishable over HTTP (5 groups on the pristine catalogue);
   - `/b/2io-electronics` → indexable, self-canonical intact; unknown slug → `404` without canonical and without validation-process wording;
   - local verification case created through `POST /api/v1/cases` (ticket DB only), `/caso/<id>` → `Seguimiento de caso | Opinio México` with no case number, id, customer name, contact or merchant name in `<head>`; the row was deleted afterwards (`resolution_cases 0 → 0`).

2. The five audit pairs, both sides served in the local runtime. The local catalogue holds one side of each pair, so the other side was inserted into the ticket database from the facts observed on the live production pages during the authorized read-only crawl (h1 brand, "Razón social", "Categoría", "Cobertura", domain), and deleted after capture (`businesses 1108 → 1113 → 1108`):

   | Pair | Served title (verbatim scope underlined by the value itself) |
   | --- | --- |
   | `/b/mercado-libre` / `/b/mercadolibre` | `… DEREMATE.COM DE MÉXICO, S. DE R.L. DE C.V. · ámbito registrado: BLVD. MIGUEL DE CERVANTES SAAVEDRA 161, PISOS 14 Y 15, GRANADA, MIGUEL HIDALGO, 11520 CIUDAD DE MÉXICO, CDMX, MÉXICO …` / `… DeRemate.com de México, S. de R.L. de C.V. · ámbito registrado: Nacional (México) …` |
   | `/b/mercado-pago` / `/b/mercadopago` | `… Comercio Electrónico Especializado · ámbito registrado: Nacional (México) …` / `… MP Agregador, S. de R.L. de C.V. · ámbito registrado: Nacional (México) …` |
   | `/b/innovasport` / `/b/innova-sport` | `… Innovasport, S.A. de C.V. · ámbito registrado: Monterrey, Nuevo León …` / `… Innovasport, S.A. de C.V. · ámbito registrado: Nacional (México) …` |
   | `/b/el-palacio-de-hierro` / `/b/palacio-de-hierro` | `… EL PALACIO DE HIERRO, S.A. DE C.V. · ámbito registrado: DURANGO NO. 230, COLONIA ROMA, ALCALDÍA CUAUHTÉMOC, C.P. 06700, CIUDAD DE MÉXICO …` / `… El Palacio de Hierro, S.A. de C.V. · ámbito registrado: Nacional (México) …` |
   | `/b/uber-eats` / `/b/ubereats` | `… Comercio Electrónico Especializado · ámbito registrado: Nacional (México) …` / `… Uber Portier México, S. de R.L. de C.V. · ámbito registrado: Nacional (México) …` |

   Both sides differ in the record's own facts (razón social and/or recorded scope); no record was merged and every canonical stayed its own.

3. Hydrated DOM parity (Playwright 1.59.1 + system Chrome, read-only collector `qa/render-evidence.mjs`; artifacts `evidence/seo-4/render-v3/{results.json,*.png,*.html}`): 17 routes — `/directorio`, `/directorio?page=2`, `/verificar?q=luuna&accion=opinar`, `/caso/nuevo?b=luuna`, `/escribir-opinion/luuna`, the ten passports of the five audit pairs, `/b/99minutos` and `/b/acapella` — returned `200` in server HTML and hydrated DOM with **0 metadata mismatches and 0 console errors**; the directory and every passport kept their canonicals. The collector recorded one aborted client-side RSC prefetch (`/verificar?…&_rsc=…`, `net::ERR_ABORTED`) on the search route, i.e. the router cancelling a prefetch while it syncs the query into the URL — no server error and no broken resource. This DOM pass is where the rendered wording itself was verified by hand (titles and descriptions listed in this document are copied from those artifacts).

4. Working forms at the DOM interface (`evidence/seo-4/journey-v3/journey.json`, 9/9 steps, no non-GET requests): typed `luuna` in the search box → the list filtered to 3 passport links → clicked the merchant → `/b/luuna` with title `¿Es confiable Luuna? Comercializadora Zebrands, S. de R.L. de C.V. · ámbito registrado: Ciudad de México | Opinio México`; `/caso/nuevo?b=luuna` preselected `Luuna (Comercializadora Zebrands, S. de R.L. de C.V.)`; each of the five pairs rendered two distinct document titles.

5. Unit tests `node node_modules/vitest/vitest.mjs run src/lib/passport-metadata.test.ts` → **12/12 passed** (semantic cases only); `tsc --noEmit` → exit 0.

6. Cross-check of the approved #3 policy on the merged branch: `scripts/verify-seo-indexing.mjs` → **17/17 passed** (utility noindex+follow including parameter variants, opinion-entry merchant self-canonical, passport and directory indexability, `robots.txt` not blocking). Sitemap exact-set on the pristine catalogue: `1128` declared URLs — `1108/1108` passports matching the database inventory plus `20` non-passport URLs (`/`, `/directorio` and the `/directorio?page=N` pagination URLs added by #5). The same run with the five verification rows still present reads `1133` declared URLs with `1113/1113` passports; both figures belong to their database state.

7. Inventory semantics and collisions (`evidence/seo-4/inventory/check-inventory.py`; artifacts `prod_passport_facts.json`, `local_catalogue.json`, `uniqueness.json`). The checker assesses only the rows whose facts parsed cleanly and reports the rest as unassessed, so no claim is made about unparsed or over-captured values:
   - production crawl: `1185` of `1200` parsed records assessed (15 excluded because the extracted scope value ran on into surrounding page text); of the assessed set `1162` documented scopes — **all quoted verbatim** — `23` unknown scopes, **none stated as a scope**, **0 records with an invented coverage/domicile classification**, and 0 duplicate titles/descriptions at case-insensitive and punctuation-insensitive comparison;
   - local ticket catalogue: `1108` of `1108` rows assessed from the JSON dump (every row parsed) — `1085` documented scopes all verbatim, `23` unknown omitted, 0 invented classifications, 0 duplicate titles/descriptions;
   - the collision counters are not the acceptance argument: the semantic counters (verbatim, omitted, no invention) are, and the AC proof remains the HTTP/DOM pass over the five actual pairs plus the known/unknown scope classes;
   - observed title length: production assessed set min 65, p50 124, p90 215, max 414; local catalogue min 65, p50 124, p90 218, max 421. The growth comes from the verbatim source values (a 145-character address or a concatenated razón social), and the ticket keeps length a display heuristic; no source fact is dropped to shorten a title.

## Shared-contract notes

- **#6** owns the in-body JSON-LD (FAQ/WebPage claims) on the passport: the `WebPage` name/description inside `b/[slug]/page.tsx` were left untouched and can be aligned by #6 within its own evidence scope.
- **#8** homepage Organization/WebSite JSON-LD and homepage metadata untouched.
- **#10** reuses the accepted passport title/description for share previews: the passport `openGraph`/`twitter` blocks still compose from the same values. The directory share copy now states the accepted identity and is ready for #10's preview work.
- **#5** directory pagination contract (`/directorio` + `?page=N` self-canonical, 60 rows/page, cached public reads) is untouched; the metadata hunk sits inside #5's `generateMetadata({ searchParams })` / `directoryCanonicalUrl(page)` function and only changes the identity strings and adds the page-scoped variant.
- The duplicated `siteBaseUrl()`-style origin fallback across route files was left as-is per ticket guidance (no speculative global origin abstraction); the new module covers record identity/scope text only.

## Limitations

- Verification ran in dev mode (`next dev --webpack`); `next build`/standalone and `pnpm lint` across the repo are main-agent/closure checks. Turbopack dev cannot load the externalized `pg` driver on this host (pre-existing host limitation).
- The local catalogue (1108 records) is smaller than the production sitemap scope (1200 profile URLs); no local count is presented as a production figure. The five-pair proof used ticket-database rows captured from the production crawl, labelled as local verification rows and deleted after capture.
- Titles are longer than the previous single template by design (verbatim scope plus the published razón social). The observed distribution above is the honest cost; shortening them would require dropping recorded source facts or classifying them, both excluded by the review decision.
- The served 404 for an unknown passport slug renders the not-found route (observed title: the site fallback), so the factual not-found/unavailable strings in `generateMetadata` are defensive branches rather than the served 404 metadata; the regression asserts the served 404 carries no canonical and no validation-process wording.
- The crawl-derived inventory facts are parsed from the audited pages' rendered text; 15 of 1200 parsed values ran on into surrounding page text and are reported as **unassessed** rather than counted, so the semantic/collision figures cover the `1185` cleanly parsed production records and the `1108` local rows only. The local catalogue is dumped as JSON, so no local row is unparsed.
- Fixture hygiene: the five verification rows were created, used for the pair proof, and deleted — `businesses 1108 → 1113 → 1108`; the live database was re-inspected after the final smoke run: `businesses 1108`, the five fixture slugs absent (highest business id `1108`), and `resolution_cases`, `case_messages`, `reviews`, `identities`, `official_records`, `audit_logs` and `orders` all `0`; the local verification cases created by the regression are deleted in the same run (`resolution_cases 0 → 0`). `runtime-verification` independently reproduced both the fixture window and the pristine end state on read-only SQL. The `1113` figure belongs to the window in which the five rows were present for the DOM/journey proof.
