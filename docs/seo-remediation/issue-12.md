# Issue #12 — Validate ambiguous keyword intent and existing profile ownership

- Issue: https://github.com/lawrns/opinio/issues/12 (labels `question`, `ready-for-agent`; open at 2026-10-13T22:34Z; 0 pre-existing comments; native blocked_by: none; blocking: #14)
- Finding: JEV-007 (`dfs_striking`, P2, impact 39, effort 2, count 1, `needs_review: 1`)
- Branch: `fix/opinio-seo-issue-12` · base `fefc090`
- Disposition: **no-change** on the merchant passport and **no new page**; keep the single future evidence action (filtered Search Console query export) as human-authorized follow-up.
- Scope: investigation only. No code, page, metadata, or schema changes were made; no tests added; no paid provider calls, account changes, or outreach.

## 1. Bottom line

`especializadas` already points at an existing **merchant trust passport**, `https://opinio.mx/b/farmacias-especializadas`, which owns a matching brand entity in the real inventory. The finding's `none_fit` label is an artifact of a deliberately truncated 30-page owner-mapping shortlist, not evidence that the page is absent — the audit's own provider row had already ranked that URL at estimated position 20 for the term.

Nothing in the available evidence supports a page creation, a generic-article rewrite, or an unverified title/metadata change. The evidence is dated, low-confidence, and has no first-party confirmation that the term produces impressions at all. The truthful disposition is therefore: **existing passport is the correct owner; change nothing now; decide only after a filtered Search Console query pull shows demand.**

## 2. Acceptance criteria with evidence

### AC1 — position 20 and volume 3,600 are dated provider estimates, not current measured demand

Confirmed. Both numbers are DataForSEO Labs estimates for location 2484 (Mexico), language `es`, inside a snapshot reused by the audit, not re-measured.

- Provider row (`jev-seo-reports/opinio.mx-2026-10-13-full/audit.json` → `.dataforseo.ranked[]`, reused snapshot): `especializadas`, `volume 3600`, `difficulty 0`, `cpc 0.36`, `intent informational`, `position 20`, `etv 4.76`, `url https://opinio.mx/b/farmacias-especializadas`. Same single row in the finding detail (`.findings[] where id=dfs_striking → detail.keywords`).
- Snapshot provenance: `spend-summary.json` → `original_collection_run` 2026-10-13T05:15:49Z–05:18:49Z; `dataforseo_historical_snapshot_usd 0.302132` recorded as historical, `dataforseo_new_requests 0`, `dataforseo_new_usd 0`. `credential-preflight.json` → `strategy: "Reuse previous provider snapshot; no new paid requests."`
- Labeling rule already recorded in the audit (`market-review.json` → `.estimate_labeling.keyword_metrics`): "Treat difficulty 0 rows (for example especializadas) as low-confidence estimates, not as guaranteed winnable terms."
- Interpretation limit: the snapshot records a single estimated position for one SERP snapshot; no trend, no landing-page impressions, no click data. Volume 3,600/mo is a provider estimate whose methodology is not exposed in the artifact, so it MUST NOT be read as current measured demand.

### AC2 — merchant-navigation vs review-intent queries are distinguished

Confirmed, and the distinction matters here because the target URL is a merchant trust passport, not a category article.

- The provider row itself classifies the bare term as `intent informational` (`audit.json` → `.dataforseo.ranked[]`). It is an adjective that also forms part of the reviewed merchant's own name; the provider offers no data separating "Farmacias Especializadas (the brand)" navigation from a generic "specialized pharmacies" reading.
- The audit's review (`market-review.json` → `.keyword_mapping_review.brand_navigational_vs_review_intent`) distinguishes the classes from first-party data: the visible Search Console query list is dominated by review intent ("buscamed es confiable", "samara online es confiable", "ufra es confiable", "canon stores joyeria es confiable", "dportenis es confiable", "casa de las lomas opiniones") with two brand queries (`ufra`, `opinio`) and two ambiguous terms.
- Passport design confirms the review-intent purpose: title "¿Es confiable FARMACIAS ESPECIALIZADAS? Quejas PROFECO, RFC y Opiniones | Opinio México", H1 "FARMACIAS ESPECIALIZADAS", first H2 "¿Es confiable comprar en FARMACIAS ESPECIALIZADAS en México?", plus sections for identity, order coverage, issue response, public records, and buyer reviews (`.pages[] where url=…/b/farmacias-especializadas` in `audit.json`; re-observed live, §3).
- Consequence applied: review-intent brand queries ("X es confiable", "quejas X") are in scope for this passport and are not disqualified by the other-brand filter; the bare ambiguous term is NOT sufficient evidence to convert the passport into a generic article about specialized pharmacies.

### AC3 — the real passport inventory was searched, not the 30-page shortlist

Confirmed against three independent inventory surfaces; the passport exists and the slug matches exactly.

| Surface | Observation | Source |
|---|---|---|
| Production sitemap (live) | 1,202 `<loc>` URLs, of which **1,200** are `/b/<slug>`; `https://opinio.mx/b/farmacias-especializadas` present | `GET https://opinio.mx/sitemap.xml` → HTTP 200, 119,622 bytes (re-observed 2026-10-13T22:3xZ) |
| Audit crawl | 1,500 pages fetched (2026-10-13T18:48:01Z–18:54:22Z), **1,200** of them `/b/` profiles; target page `status 200`, `canonical https://opinio.mx/b/farmacias-especializadas`, `in_sitemap true`, `bytes 84119`, `raw_word_count 517`, `fetched_at 2026-10-13T18:49:06+00:00` | `audit.json` → `.pages[]`, `.run` |
| Local catalogue DB (evidence environment) | 1,108 businesses; row `slug=farmacias-especializadas`, `brand_name=FARMACIAS ESPECIALIZADAS`, `domain=farmacias-especializadas.com.mx`, `category=Marketplaces y Tiendas Departamentales`, `verified_level=public_info`, `trust_score=0`, `legal_name=NULL`, `rfc=NULL` | `postgres://…@127.0.0.1:54732/opinio` (runtime-verification seeded from `data/mexican_stores_1000.json`) |

Cross-check results: 0 catalog slugs missing from the crawl; 92 crawled slugs absent from the catalog (portfolio/seeded names such as `baubap`, `bitso`, `bbva-mexico`), i.e. the local catalog is a **subset** of the public 1,200-page inventory. The target is present on both sides, so no URL-level uncertainty remains about existence or slug.

`none_fit` explained without speculation: the owner-mapping question offered `pages[:30] by depth then inlinks`. In that shortlist the first `/b/` page is `p16 /b/99minutos` (alphabetical), while `/b/farmacias-especializadas` was never in the 30 (`audit.json` → `.jev.pages` keys 0–29; `market-review.json` → `.keyword_mapping_review.catalogue_artifact`). Jev's own probability mass for the term backs this: `none_fit 0.43` but the single largest page slot is `p9 = /verificar?categoria=Salud` at `0.40` (`.jev.keywords.especializadas.page.probabilities`) — the judge leaned toward a category filter page, not toward absence. The shortlist counter-examples recorded in the audit (farmacia san pablo → `none_fit` while `/b/farmacia-san-pablo` ranks at position 10; gersa → filter page while `/b/gersa` ranks at position 8) show the same artifact.

### AC4 — authorized Search Console evidence used where available; missing evidence left unassessed

Available (authorized property `https://opinio.mx/`, capture date 2026-10-13T18:53–19:03Z, `first-party-evidence.json`):

- Performance totals, 2026-09-05 → 2026-10-11: 478 clicks, 29.4K impressions, 1.6% average CTR, average position 8.8.
- Top pages (top 10 of 1,000 rows): `/b/buscamed` 15 clicks / 261 impressions, `/b/ufra` 14/3,820, `/b/samara-online` 8/158, `/b/dermaexpress` 7/359, `/b/diten` 7/27, `/b/sfe-pacientes` 6/79, `/b/dportenis` 5/420, `/b/b-life` 5/196, `/b/calzzapato` 5/185, `/` 5/147.
- Top queries (top 10 of 1,000 rows): `ufra` 9/3,515, `opinio` 5/131, `buscamed es confiable` 4/151, `samara online es confiable` 4/94, `ufra es confiable` 3/109, `the 3 letters company` 3/26, `canon stores joyeria es confiable` 3/12, `dportenis es confiable` 2/201, `casa de las lomas opiniones` 2/65, `locomotion torreon` 2/33.
- Indexing: 1.61K indexed, 139 not indexed (84 duplicate without user-selected canonical, 1 server error (5xx), 54 crawled – currently not indexed).

Missing — explicitly **unassessed**:

- No query-level rows for `especializadas` and no per-page report row for `/b/farmacias-especializadas` in the authorized captures (both captures show only the top 10 of 1,000 rows). Whether the term produces any impressions for that URL is unknown.
- No URL Inspection capture for the passport.
- The demand question therefore stays open rather than being answered with a guess, and the missing rows are recorded as unassessed per the issue's verification rule.

### AC5 — actionable decision on the existing passport; no new paid calls

Delivered as §4. No provider request, account change, or outreach was made or is required for this decision.

## 3. Live re-observation (independent of the audit snapshot)

Fetched 2026-10-13T22:3xZ, `GET https://opinio.mx/b/farmacias-especializadas`, UA `seo-12-investigation`:

- `HTTP 200`, 83,885 bytes; `<title>` = "¿Es confiable FARMACIAS ESPECIALIZADAS? Quejas PROFECO, RFC y Opiniones | Opinio México"; single `<h1>FARMACIAS ESPECIALIZADAS</h1>`; `rel=canonical` self-referential.
- Rendered trust content present: "Este negocio todavía no tiene opiniones", "Sin calificación", "Muestra efectiva: 0 reseñas", "Dictamen de Confianza Comercial", "En validación" (RFC), "En auditoría" (search-listing anchor), "Escribir opinión", "Abrir un caso".
- Matches the audit page record (517 words, same title/H1, 11 schema types including `FAQPage`, `Organization`, `OnlineStore`, `BreadcrumbList`) — the passport is live, indexable, canonical, and sitemap-listed today.

## 4. Disposition

1. **Ownership — no change.** `especializadas` maps to the existing passport `/b/farmacias-especializadas`; the brand entity exists in the real inventory. Do not create a new page, category hub, or "specialized pharmacies" article for this row.
2. **Content — no change from the hypothesis.** The only supporting signal is one dated estimate (position 20, volume 3,600, difficulty 0) with a review-band relevance judgment (`relevance 0.5433`, `band review`, `confidence 0.48`) and no first-party impressions. Rewriting or retitling a merchant verification page on that basis would be speculative and risks converting a merchant passport into a generic article — explicitly warned against in `owner-review.json` → annotations[JEV-007].
3. **No false new-page recommendation.** The audit emitted no `dfs_existing_page` / `dfs_new_page` action; this investigation keeps it that way.
4. **Single future action (human-authorized, not taken here).** Pull a filtered Search Console export for queries containing `especializadas` (and the URL `https://opinio.mx/b/farmacias-especializadas`) once impressions accumulate, then decide. The property is authorized for reading; the export itself is the remaining human-only step because it produces a private analytics file that MUST NOT be pasted into the public issue.
5. **Review-eligible follow-up candidate (separate decision, not this issue).** Review-intent query coverage of merchant passports (e.g. `X es confiable` for merchants whose passports have zero reviews) is a portfolio-level question, not a `especializadas`-specific fix. Any such work needs its own approved ticket.
6. **Provider estimates stay labeled.** Any later use of position 20 / volume 3,600 MUST carry "dated provider estimate (2026-10-13 snapshot), not measured demand".

## 5. Remaining uncertainty and human-only authorization

- **Unassessed:** whether `especializadas` produces GSC impressions/clicks for the passport; the query's true intent split; whether the provider row reflects a Mexico-SERP snapshot at all (methodology not exposed in the artifact).
- **Human-only:** the filtered GSC export (private file; publication rules forbid pasting exports into the issue), and any follow-up that requires paid provider calls, third-party account changes, or outreach (issue constraint: separate authorization).
- **Environment note:** the local catalogue DB used for the inventory cross-check is a subset (1,108 of 1,200+ public slugs, 0 reviews/cases by design); it is adequate for existence/ownership, not for review-state comparisons between environments.

## 6. Sources

- `C:/Users/isaac/ghprojects/opinio/jev-seo-reports/opinio.mx-2026-10-13-full/audit.json` — `.run`, `.pages[]` (target URL), `.findings[]` (`dfs_striking`), `.jev.keywords.especializadas`, `.dataforseo.ranked[]`, `.dataforseo.ledger`.
- `…/market-review.json` — `.estimate_labeling`, `.action_annotations[JEV-007]`, `.keyword_mapping_review` (30-page catalogue artifact, brand-vs-review intent), `.limits`.
- `…/owner-review.json` / `owner-review.md` — JEV-007 annotation ("Verify especializadas in GSC and preserve the merchant-profile purpose").
- `…/first-party-evidence.json` — GSC captures (performance pages/queries, indexing, sitemaps, links), property `https://opinio.mx/`, 2026-10-13T18:53–19:03Z.
- `…/spend-summary.json`, `credential-preflight.json` — reused snapshot, zero new paid requests.
- Live re-observation: `GET https://opinio.mx/sitemap.xml` (1,200 `/b/` URLs) and `GET https://opinio.mx/b/farmacias-especializadas` (HTTP 200), 2026-10-13T22:3xZ.
- Local inventory: `postgres://…@127.0.0.1:54732/opinio` — `businesses` table (1,108 rows; target row fields listed in §2/AC3), seeded from `data/mexican_stores_1000.json`.
- Issue metadata: `gh api repos/lawrns/opinio/issues/12` (+ `/comments`, `/dependencies/blocked_by`, `/dependencies/blocking`), 2026-10-13T22:34Z.

No credentials or private analytics exports are reproduced in this document; GSC values are aggregate observations, consistent with `docs/agents/issue-tracker.md`.
