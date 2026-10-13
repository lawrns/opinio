# Issue #12 — Validate ambiguous keyword intent and existing profile ownership

- Issue: https://github.com/lawrns/opinio/issues/12 (labels `question`, `ready-for-agent`; open at 2026-10-13T22:34Z; 0 pre-existing comments; native blocked_by: none; blocking: #14)
- Finding: JEV-007 (`dfs_striking`, P2, impact 39, effort 2, count 1, `needs_review: 1`)
- Branch: `fix/opinio-seo-issue-12` · base `fefc090`
- Disposition: **no code/page change** — the merchant passport exists and is a candidate for brand/review-intent demand, while the bare term's intent and landing-page attribution stay unassessed; the filtered Search Console query read was performed read-only inside the authorized session (no export, no private file).
- Scope: investigation only. No code, page, metadata, or schema changes were made; no tests added; no paid provider calls, account changes, or outreach.

## 1. Bottom line

A merchant entity matching the term exists in the real inventory (`FARMACIAS ESPECIALIZADAS`, `https://opinio.mx/b/farmacias-especializadas`), and the finding's `none_fit` label is an artifact of a deliberately truncated 30-page owner-mapping shortlist, not evidence that the page is absent — the audit's own provider row had already ranked that URL at estimated position 20 for the term. What remains genuinely open is **which intent the bare term carries**: brand navigation to that merchant versus generic category research. The authorized Search Console data (§2 AC4) now shows the term producing first-party impressions, with observed merchant-review variants alongside it, but both readings still coexist.

Nothing in the available evidence supports a page creation, a generic-article rewrite, or an unverified title/metadata change. The truthful disposition is therefore: **the matching merchant passport exists and is a candidate for brand/review-intent demand; the bare term's intent and target attribution remain unassessed; change nothing now.**

## 2. Acceptance criteria with evidence

### AC1 — position 20 and volume 3,600 are dated provider estimates, not current measured demand

Confirmed. Both numbers are DataForSEO Labs estimates for location 2484 (Mexico), language `es`, inside a snapshot reused by the audit, not re-measured.

- Provider row (`jev-seo-reports/opinio.mx-2026-10-13-full/audit.json` → `.dataforseo.ranked[]`, reused snapshot): `especializadas`, `volume 3600`, `difficulty 0`, `cpc 0.36`, `intent informational`, `position 20`, `etv 4.76`, `url https://opinio.mx/b/farmacias-especializadas`. Same single row in the finding detail (`.findings[] where id=dfs_striking → detail.keywords`).
- Snapshot provenance: `spend-summary.json` → `original_collection_run` 2026-10-13T05:15:49Z–05:18:49Z; `dataforseo_historical_snapshot_usd 0.302132` recorded as historical, `dataforseo_new_requests 0`, `dataforseo_new_usd 0`. `credential-preflight.json` → `strategy: "Reuse previous provider snapshot; no new paid requests."`
- Labeling rule already recorded in the audit (`market-review.json` → `.estimate_labeling.keyword_metrics`): "Treat difficulty 0 rows (for example especializadas) as low-confidence estimates, not as guaranteed winnable terms."
- Interpretation limit: the artifact states a Mexico/Spanish snapshot (`location_code 2484`, `language es`); what is not exposed is the methodology behind its position/volume figures and their freshness beyond the snapshot timestamp, so they remain dated provider estimates. The snapshot records one estimated position for one SERP snapshot; no trend, no landing-page impressions, no click data. Volume 3,600/mo MUST NOT be read as current measured demand.

### AC2 — merchant-navigation vs review-intent queries are distinguished

Confirmed, and the distinction matters here because the target URL is a merchant trust passport, not a category article.

- The provider row itself classifies the bare term as `intent informational` (`audit.json` → `.dataforseo.ranked[]`). It is an adjective that also forms part of the reviewed merchant's own name, and the provider exposes no split separating merchant-navigation ("Farmacias Especializadas", the brand) from category research ("specialized pharmacies"), so the bare term remains ambiguous by construction.
- The audit's review (`market-review.json` → `.keyword_mapping_review.brand_navigational_vs_review_intent`) already separated the classes from an aggregate first-party snapshot: the visible Search Console list at that point was dominated by review intent, with brand queries and ambiguous terms as the other two groups (query strings are not reproduced here). This ticket's filtered read below now supplies the same classification for the subject term itself.
- Passport design confirms the review-intent purpose: title "¿Es confiable FARMACIAS ESPECIALIZADAS? Quejas PROFECO, RFC y Opiniones | Opinio México", H1 "FARMACIAS ESPECIALIZADAS", first H2 "¿Es confiable comprar en FARMACIAS ESPECIALIZADAS en México?", plus sections for identity, order coverage, issue response, public records, and buyer reviews (`.pages[] where url=…/b/farmacias-especializadas` in `audit.json`; re-observed live, §3).
- Consequence applied: merchant-navigation queries (the exact brand, "FARMACIAS ESPECIALIZADAS") and review-intent queries about the brand ("X es confiable", "quejas X", "X opiniones") are the two classes in scope for this passport; review-intent brand queries are not disqualified by the other-brand filter, and the bare ambiguous adjective is NOT sufficient evidence to convert the passport into a generic article about specialized pharmacies.

### AC3 — the real passport inventory was searched, not the 30-page shortlist

Confirmed against three independent inventory surfaces; the passport exists and the slug matches exactly.

| Surface | Observation | Source |
|---|---|---|
| Production sitemap (live) | 1,202 `<loc>` URLs, of which **1,200** are `/b/<slug>`; `https://opinio.mx/b/farmacias-especializadas` present | `GET https://opinio.mx/sitemap.xml` → HTTP 200, 119,622 bytes, timed 2026-10-13T22:36:29Z → 22:36:31Z (UTC) |
| Audit crawl | 1,500 pages fetched (2026-10-13T18:48:01Z–18:54:22Z), **1,200** of them `/b/` profiles; target page `status 200`, `canonical https://opinio.mx/b/farmacias-especializadas`, `in_sitemap true`, `bytes 84119`, `raw_word_count 517`, `fetched_at 2026-10-13T18:49:06+00:00` | `audit.json` → `.pages[]`, `.run` |
| Local catalogue DB (evidence environment) | 1,108 businesses; row `slug=farmacias-especializadas`, `brand_name=FARMACIAS ESPECIALIZADAS`, `domain=farmacias-especializadas.com.mx`, `category=Marketplaces y Tiendas Departamentales`, `verified_level=public_info`, `trust_score=0`, `legal_name=NULL`, `rfc=NULL` | `postgres://…@127.0.0.1:54732/opinio` (runtime-verification seeded from `data/mexican_stores_1000.json`) |

Cross-check results: 0 catalog slugs missing from the crawl; 92 crawled slugs absent from the catalog (portfolio/seeded names such as `baubap`, `bitso`, `bbva-mexico`), i.e. the local catalog is a **subset** of the public 1,200-page inventory. The target is present on both sides, so no URL-level uncertainty remains about existence or slug.

`none_fit` explained without speculation: the owner-mapping question offered `pages[:30] by depth then inlinks`. In that shortlist the first `/b/` page is `p16 /b/99minutos` (alphabetical), while `/b/farmacias-especializadas` was never in the 30 (`audit.json` → `.jev.pages` keys 0–29; `market-review.json` → `.keyword_mapping_review.catalogue_artifact`). Jev's own probability mass for the term backs this: `none_fit 0.43` but the single largest page slot is `p9 = /verificar?categoria=Salud` at `0.40` (`.jev.keywords.especializadas.page.probabilities`) — the judge leaned toward a category filter page, not toward absence. The shortlist counter-examples recorded in the audit (farmacia san pablo → `none_fit` while `/b/farmacia-san-pablo` ranks at position 10; gersa → filter page while `/b/gersa` ranks at position 8) show the same artifact.

### AC4 — authorized Search Console evidence used where available; missing evidence left unassessed

Available (authorized property `https://opinio.mx/`). The audit-time capture (`first-party-evidence.json`, 2026-10-13T18:53–19:03Z) exposes only the **top 10 of 1,000** rows and therefore cannot resolve an individual term; per the project publication rule, this document does not reproduce performance tables or query strings. It does establish that the property's visible search traffic splits into the two intent classes the issue requires — review-intent brand queries, brand-navigation queries, and ambiguous terms.

Additional authorized read performed for this ticket (read-only, no export, no file produced by GSC; full per-query metrics remain external and private at `C:/Users/isaac/tmp/opinio-remediation/raw/seo-12-gsc-especializ.md` — only the minimum observations appear below): in the signed-in Search Console, Performance ▸ Search results, 28-day range 9/14/26–10/11/26, filter `Query contains "especializ"` (captured 2026-10-13T22:36–22:45Z):

- The filter returns a small matching set — **6 rows, 31 impressions in aggregate** (impressions only; per-row counts and click/CTR/position figures stay in the external raw note, consistent with the project rule against reproducing analytics exports).
- The bare term shows tiny observed demand in this property and range, which the audit-time top-10 capture could not assess.
- Observed classes among the matches: merchant-review intent (`farmacias especializadas es confiable`, `opiniones de farmacias especializadas centro`) and brand navigation (`farmacias especializadas`).

This is a small observed first-party signal in this property and range, not an estimate of total or current market demand, and it says nothing about the intent split.

Still missing — explicitly **unassessed**:

- Landing-page attribution for that matching set: a page-breakdown read with the same filter returned unfiltered totals in-session and was not forced further, so which URL earns those impressions is unknown.
- No URL Inspection capture for the passport.

### AC5 — actionable decision on the existing passport; no new paid calls

Delivered as §4. No provider request, account change, or outreach was made or is required for this decision.

## 3. Live re-observation (independent of the audit snapshot)

Fetched 2026-10-13T22:36:32Z → 22:36:33Z (UTC), `GET https://opinio.mx/b/farmacias-especializadas`, UA `seo-12-investigation`:

- `HTTP 200`, 84,119 bytes; `<title>` = "¿Es confiable FARMACIAS ESPECIALIZADAS? Quejas PROFECO, RFC y Opiniones | Opinio México"; single `<h1>FARMACIAS ESPECIALIZADAS</h1>`; `rel=canonical` self-referential.
- Rendered trust content present: "Este negocio todavía no tiene opiniones", "Sin calificación", "Muestra efectiva: 0 reseñas", "Dictamen de Confianza Comercial", "En validación" (RFC), "En auditoría" (search-listing anchor), "Escribir opinión", "Abrir un caso".
- Consistent with the independent audit crawl record (2026-10-13T18:49:06Z: 517 raw words, same title/H1, 11 schema types including `FAQPage`, `Organization`, `OnlineStore`, `BreadcrumbList`) — the passport is live, indexable, canonical, and sitemap-listed.

## 4. Disposition

1. **Ownership — no change.** The merchant matching the term exists and its passport `/b/farmacias-especializadas` is a candidate owner for brand and review-intent demand; `especializadas` is an adjective that also names that merchant, so the bare-keyword intent stays unassessed and MUST NOT be used to assert exclusive ownership or to justify a new page.
2. **Content — no change.** The only provider signal is one dated estimate (position 20, volume 3,600, difficulty 0) with a review-band relevance judgment (`relevance 0.5433`, `band review`, `confidence 0.48`); the first-party data shows 31 impressions in aggregate across a handful of matching queries in 28 days. Rewriting or retitling a merchant verification page on that basis would be speculative and risks converting a merchant passport into a generic article — explicitly warned against in `owner-review.json` → annotations[JEV-007].
3. **No false new-page recommendation.** The audit emitted no `dfs_existing_page` / `dfs_new_page` action; this investigation keeps it that way.
4. **Evidence action — performed, not pending.** The filtered Search Console query read (§2 AC4) was done read-only inside the existing authorized session; no export and no private file were needed. The remaining follow-up is to re-check the same filter after more impressions accumulate, and to capture landing-page attribution the next time the filter resolves per-page rows.
5. **Review-eligible follow-up candidate (separate decision, not this issue).** Review-intent query coverage of merchant passports (e.g. `X es confiable` for merchants whose passports have zero reviews) is a portfolio-level question, not a `especializadas`-specific fix. Any such work needs its own approved ticket.
6. **Provider estimates stay labeled.** Any later use of position 20 / volume 3,600 MUST carry "dated provider estimate (2026-10-13 snapshot), not measured demand".

## 5. Remaining uncertainty and human-only authorization

- **Unassessed:** the bare term's intent split (brand navigation vs. category research); landing-page attribution of the six observed query variants; the provider's position/volume methodology and freshness beyond the snapshot timestamp.
- **Human-only:** any follow-up requiring paid provider calls, third-party account configuration changes, or external outreach (issue constraint: separate authorization). Reading the authorized Search Console property is not human-only — it was done read-only in the existing signed-in session.
- **Environment note:** the local catalogue DB used for the inventory cross-check is a subset (1,108 of 1,200+ public slugs, 0 reviews/cases by design); it is adequate for existence/ownership, not for review-state comparisons between environments.

## 6. Sources

- `C:/Users/isaac/ghprojects/opinio/jev-seo-reports/opinio.mx-2026-10-13-full/audit.json` — `.run`, `.pages[]` (target URL), `.findings[]` (`dfs_striking`), `.jev.keywords.especializadas`, `.dataforseo.ranked[]`, `.dataforseo.ledger`.
- `…/market-review.json` — `.estimate_labeling`, `.action_annotations[JEV-007]`, `.keyword_mapping_review` (30-page catalogue artifact, brand-vs-review intent), `.limits`.
- `…/owner-review.json` / `owner-review.md` — JEV-007 annotation ("Verify especializadas in GSC and preserve the merchant-profile purpose").
- `…/first-party-evidence.json` — GSC captures (performance pages/queries, indexing, sitemaps, links), property `https://opinio.mx/`, 2026-10-13T18:53–19:03Z; top-10-of-1,000 exposure only.
- Signed-in Search Console (relay session), Performance ▸ Search results ▸ 28 days ▸ `Query contains "especializ"`, read-only, captured 2026-10-13T22:36–22:45Z; raw note outside the repo at `C:/Users/isaac/tmp/opinio-remediation/raw/seo-12-gsc-especializ.md`.
- `…/spend-summary.json`, `credential-preflight.json` — reused snapshot, zero new paid requests.
- Live re-observation: `GET https://opinio.mx/sitemap.xml` (1,200 `/b/` URLs; 2026-10-13T22:36:29–22:36:31Z) and `GET https://opinio.mx/b/farmacias-especializadas` (HTTP 200, 84,119 bytes; 2026-10-13T22:36:32–22:36:33Z).
- Local inventory: `postgres://…@127.0.0.1:54732/opinio` — `businesses` table (1,108 rows; target row fields listed in §2/AC3), seeded from `data/mexican_stores_1000.json`.
- Issue metadata: `gh api repos/lawrns/opinio/issues/12` (+ `/comments`, `/dependencies/blocked_by`, `/dependencies/blocking`), 2026-10-13T22:34Z.

No credentials or private analytics exports are reproduced in this document; GSC values are aggregate observations, consistent with `docs/agents/issue-tracker.md`.
