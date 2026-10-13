# Issue #13 — Link coverage validation and the human authority-building brief

- Ticket: <https://github.com/lawrns/opinio/issues/13> (state: OPEN, labels: `documentation`, `ready-for-agent`)
- Worker: `seo-13` · Branch: `fix/opinio-seo-issue-13` · Worktree: `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-13` · Base: `fefc090`
- Claim comment: <https://github.com/lawrns/opinio/issues/13#issuecomment-6156631392>
- Finding under review: **JEV-006** / rule `dfs_backlink_gap` (visibility, P2, impact 50, effort 4, `heuristic: true`, 1 affected URL `/`)
- Nature of this ticket: **evidence-only**. No application code, configuration, or permanent test is added or changed. Nothing here is published, and no third party has been contacted.

The audit capture used as input is the untracked local report directory `C:/Users/isaac/ghprojects/opinio/jev-seo-reports/opinio.mx-2026-10-13-full` (crawl 2026-10-13T18:48–18:54Z, DataForSEO location 2484 / language `es`).

## 1. Observation set

### 1.1 Live public-site observations (HTTP + retrieved DOM), 2026-10-13

Command (Windows `curl`; `bytes` is the transfer size of the response body):

```
curl -s -A "Mozilla/5.0 (compatible; seo-remediation-observation)" -o NUL \
  -w "status=%{http_code} bytes=%{size_download}\n" <url>
```

| URL | Status | Bytes |
| --- | --- | --- |
| `https://opinio.mx/` | 200 | 81,532 |
| `https://opinio.mx/directorio` | 200 | 3,892,631 |
| `https://opinio.mx/verificar` | 200 | 16,483 |
| `https://opinio.mx/caso/nuevo` | 200 | — |
| `https://opinio.mx/escribir-opinion/cinepolis` | 200 | — |
| `https://opinio.mx/b/cinepolis` | 200 | 84,091 |
| `https://opinio.mx/b/luuna` | 200 | 161,297 |
| `https://opinio.mx/robots.txt` | 200 | 489 |
| `https://opinio.mx/sitemap.xml` | 200 | 119,622 |
| `https://opinio.mx/merchant` | **500** | — |

DOM observations from the same fetches:

- **Sitemap inventory**: 1,202 `<loc>` entries = `/` (1), `/directorio` (1), `/b/<slug>` (1,200). No methodology, press, dataset or blog URL is listed.
  Scope limit: the 1,200 `/b/*` entries are inventory **addresses**. JSON-LD, folio and outbound-anchor structure were verified only on the two sampled profiles (`/b/cinepolis`, `/b/luuna`); this is not evidence that all 1,200 addresses are machine-readable.
- **Raw observation artifacts** (local scratch, outside the repository): `C:/Users/isaac/tmp/obs13/{home.html,profile-cinepolis.html,profile-luuna.html,verificar.html}`, `C:/Users/isaac/tmp/obs13/dfs-summary.md`, `C:/Users/isaac/tmp/obs13/dfs-bulk.md`, `C:/Users/isaac/tmp/sitemap-13.xml` — fetch metadata and checksums in §1.5.
- **Homepage** (`/`): 0 `<script type="application/ld+json">` blocks; no absolute external `href`. Fragment observation, separating *links* from *actual targets*: the page carries **2 nav links** to `/#metodologia` **and 2 elements** with `id="metodologia"` (the id is duplicated, so the fragment resolves but is not a unique record); it carries **1 nav link** to `/#independencia` with **no** element exposing `id="independencia"` or `name="independencia"` (a link without an actual target — not repaired here, out of this ticket’s scope). Content: the three-pillar standard (Existe / Cumple / Resuelve), the coverage definition (“Cobertura no significa satisfacción: mide invitaciones sobre pedidos registrados. El puntaje Opinio va de 0 a 100 y no es un promedio de estrellas. La falta de información no demuestra una mala experiencia.”) and the illustrative comparator (`13,911 invitados / 14,821 órdenes`, `Cobertura 93.9%`).
- **Merchant profile** (`/b/cinepolis`): 1 JSON-LD block — `Organization`+`OnlineStore` with `legalName`, `url: https://cinepolis.com`, `logo`, `telephone`, `areaServed: Mexico`, plus a `WebPage` node. Identity fields render as “No registrado” (SAT cédula, INEGI census) and “Sin pedidos conectados”; section `04 · Fuentes` states “Este perfil todavía no tiene fuentes públicas vinculadas.”
- **Merchant profile** (`/b/luuna`): folio `OP-000001`, “Perfil reclamado”; identity shows RFC `CZE150414AB2`, INEGI CLEE `0901547891234001`; coverage `93.9%` = “13,911 clientes invitados de 14,821 compras observadas”; 8 published reviews, “87.5% Confirmado”, “14.1 hrs”; `04 · Fuentes` links out to `https://burocomercial.profeco.gob.mx` and `https://www.inegi.org.mx/app/mapa/denue/`.
- **`robots.txt`**: `User-Agent: *` → `Allow: /` (only `/api/private/` disallowed); explicit `Allow: /` for Googlebot, Bingbot, Applebot, Applebot-Extended, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Amazonbot, cohere-ai, Meta-ExternalAgent; `Disallow: /` for CCBot and Bytespider; sitemap declared.
- **Data provenance note (fixture boundary)**: live `/b/luuna` figures (14,821 observed / 13,911 invited) sit one unit above the repository seed values for the same RFC (`scripts/seed.ts:65-66`, `14820` / `13910`), while hardcoded demo copy (`src/components/home/ProofBentoGrid.tsx:146`, `13,911` / `14,821`) and a **different** seeded entry (`scripts/seed-portfolio-businesses.ts:1144-1145` → `hablo` / Hablo.com.mx, `34,200` / `32,100`) reproduce the **same 93.9% coverage pattern** at different order totals, and the live review/case texts are absent from the repository. Production figures therefore cannot be certified as independent production data from public evidence alone — see §6.4.

### 1.2 Dated provider capture (2026-10-13)

From `audit.json` / `market-review.json` / `digest.md` in the report directory above:

- `dataforseo.referring_domains` — **bulk** endpoint `backlinks/bulk_referring_domains/live` (ledger cost $0.024216):
  `{"domain": "opinio.mx", "referring_domains": 0, "referring_main_domains": 0}`.
- `dataforseo.backlinks` — **summary** endpoint `backlinks/summary/live` (ledger cost $0.024036): every metric is `null` — `rank`, `backlinks`, `referring_domains`, `referring_main_domains`, `referring_ips`, `broken_backlinks`, `broken_pages`, `backlinks_spam_score`, `crawled_pages`, `referring_links_types`, `referring_links_attributes`.
- `digest.md` renders this honestly: “Backlinks: None from None referring domains”.
- Peer values reported in the same call (context only, §3): `mercadolibre.com.mx` 20,716 · `trustpilot.com` 429,581 · `condusef.gob.mx` 7,228 · `gob.mx` 1,819 · `indeed.com` 276,772. Reported median: 20,716.
- AI-answer capture (`ai_optimization/llm_mentions/search/live`, cost $0.101): 1 mention — ChatGPT/`gpt-6`, question “is omnibus de mexico reliable?” (`ai_search_volume` 42), sources `checkmybus.com.mx`, `odm.com.mx`, `opinio.mx`.
- Full provider ledger for the capture: 17 requests, $0.302132, 0 failed.

### 1.3 First-party capture (Search Console, captured 2026-10-13T18:59:40.589Z)

`first-party-evidence.json`, report `links`: “External links — Total 0”, and `Top linked pages`, `Top linking sites`, `Top linking text` all show “No data”. The same report shows 1,345 internal links (1,201 to `/caso/nuevo`) and the sitemaps report shows 1,202 discovered pages (last read 2026-10-08).

### 1.4 Primary-source definitions of the three instruments

- **Bulk referring domains**: “This endpoint will provide you with the number of referring domains pointing to domains, subdomains, and pages specified in the `targets` array. The returned numbers are based on all **live** referring domains … that were found during the latest check.” — <https://docs.dataforseo.com/v3/backlinks/bulk_referring_domains/live/>
- **Summary**: “This endpoint will provide you with an overview of backlinks data **available** for a given domain, subdomain, or webpage.” The vendor derives the dataset from “the live index” and crawls continuously — <https://docs.dataforseo.com/v3/backlinks/summary/live/>, <https://docs.dataforseo.com/v3/backlinks/overview/>
- **Search Console Links report**: “This report isn’t a comprehensive list of every link on your site. It shows a **sample** of internal and external links … Tables are limited to 1,000 rows”. It “includes links that Google has found over time” (possibly since removed) and “doesn’t specify if a link is marked as `nofollow`”. Export note: “Values shown as either ~ or - in the report (not available/not a number) will be **zeros** in the downloaded data.” — <https://support.google.com/webmasters/answer/9049606>

### 1.5 Raw observation artifacts (local scratch, outside the repository)

Retained so a reviewer can re-inspect exactly what was fetched. All timestamps are local `-0600` with UTC equivalent; `md5` is `md5sum` of the file as written.

| Artifact | Bytes | Written (−0600 / UTC) | md5 |
| --- | --- | --- | --- |
| `C:/Users/isaac/tmp/obs13/home.html` | 81,532 | 16:33:26 / 22:33:26Z | `4c84a4ad8cf12fd4a9f0eb50c9c18611` |
| `C:/Users/isaac/tmp/obs13/profile-cinepolis.html` | 84,091 | 16:33:26 / 22:33:26Z | `2ebf0d5a162cd7e9cfa615902494b8e7` |
| `C:/Users/isaac/tmp/obs13/profile-luuna.html` | 161,297 | 16:37:56 / 22:37:56Z | `812f645786bebee760700583da1fa004` |
| `C:/Users/isaac/tmp/obs13/verificar.html` | 16,483 | 16:33:26 / 22:33:26Z | `f5de292fc7746181ba9dab41a7affe30` |
| `C:/Users/isaac/tmp/sitemap-13.xml` | 119,622 | 16:33:04 / 22:33:04Z | `d65b4ba50ddc3fcee6a0eff46462100e` |
| `C:/Users/isaac/tmp/obs13/dfs-summary.md` | 21,194 | 16:36:17 / 22:36:17Z | `ee1a4a24c6e72a59a14fbb83b7e52d26` |
| `C:/Users/isaac/tmp/obs13/dfs-bulk.md` | 15,476 | 16:36:18 / 22:36:18Z | `2c9177be2a02bda18f403af9f4ec27eb` |

Command that produced the HTML/XML artifacts (the `dfs-*.md` files are the resolved vendor `.md` documents after following redirects):

```
curl -s -A "Mozilla/5.0 (compatible; seo-remediation-observation)" --max-time 60 -o obs13/home.html https://opinio.mx/ ...
```

`/b/luuna` HTTP status/bytes were re-measured in the same session (`200`, 161,297 bytes) before writing `profile-luuna.html`.


## 2. What JEV-006’s numbers do and do not mean

| Instrument | Value | Correct reading |
| --- | --- | --- |
| DataForSEO bulk referring domains | `0` **reported** | The provider’s live index, at the time of the check, recorded no referring domains for the root domain. A dated, index-scoped reported zero. |
| DataForSEO backlinks summary | all fields `null` | The endpoint returned a result object with **no values** — unknown, not a set of zeros. Per the vendor’s own wording it reports the data *available*, so an empty result is a coverage outcome. |
| Search Console Links report | “Total 0”, detail tables “No data” | A **sampled** first-party view that omits links, truncates at 1,000 rows and can turn “not available” into zeros on export. Consistent with “nothing visible to Google in this property so far”, not a census. |

Consequences that this ticket preserves:

1. The three captures **do not corroborate each other into a verified zero**. They agree only that no link signal is visible in any of the three instruments’ coverage.
2. “**0 referring domains**” is quoted as a reported value, never as “the site has no backlinks”.
3. “**null / No data**” stays unknown and unassessed. It is not evidence of absence, and it is not evidence of presence.
4. Absence of a link signal is **not** the same as absence of references: the provider capture itself shows one AI answer using `opinio.mx` as a source, which is a citation surface independent of backlinks.
5. JEV-006 is a `heuristic: true` rule finding (`audit.json` `findings[dfs_backlink_gap]`, `heuristic: true`), which the rendered report already labels; its score is not a measured link profile.

## 3. Comparison domains are context, not a target

The five comparison domains come from the DataForSEO Labs `competitors_domain` call filtered by shared keywords — i.e. **search-overlap peers**, not business peers:

| Domain | Type | Shared keywords | Referring domains (reported) |
| --- | --- | --- | --- |
| `mercadolibre.com.mx` | marketplace | 23 | 20,716 |
| `trustpilot.com` | review platform | 22 | 429,581 |
| `condusef.gob.mx` | government (financial consumer protection) | 15 | 7,228 |
| `gob.mx` | government portal | 15 | 1,819 |
| `indeed.com` | job board | 14 | 276,772 |

The set mixes marketplaces, a review platform, government and a job board, so its median (20,716) is an artefact of the sample, not an Opinio objective or gap size. The only format analogue in the set is the review platform; even there, its 429,581 referring domains describe a global consumer-review incumbent, not a Mexican verification directory. **No numeric link target is derived here and none should be adopted downstream.**

## 4. Not established by this evidence

- Whether Opinio has any external links at all, or how many. Unassessed.
- Spam score, broken backlinks, referring IPs, anchor distribution. Unknown (`null`).
- Whether the AI-answer mention (§1.2) reflects a link, a brand mention, or training data. The provider returns sources, not link types — unassessed.
- Whether `/` is genuinely the least linked URL — the captures are domain-level or sampled.
- Whether production trust/coverage figures are independently verifiable — §1.1 provenance note.

## 5. Citation/reference opportunities supported by real Opinio evidence

Each opportunity below is anchored to something the site **actually has today** (observed in §1.1) plus a demand or surface observed in the dated provider capture. None involves contacting anyone, buying anything, or creating accounts. Venue classes are described from observed SERP evidence, not from named relationships — no partnership exists and none is implied.

**A. The merchant Passport record set (1,200 addressable profile URLs).**
- Real evidence: 1,200 `/b/<slug>` addresses in the live sitemap inventory (§1.1). On the **two sampled profiles only**, a folio (`OP-000160`, `OP-000001`), a JSON-LD `Organization`/`OnlineStore` node with `legalName` and the merchant’s official site URL, and explicit identity/case/coverage sections were observed. Field depth varies by profile — the sampled unclaimed profile had no registry links, no coverage and no reviews — so promotion must follow what each profile actually shows.
- Why it is a plausible citation surface: the pages answer the “¿es confiable <comercio>?” question class. The only quantitative support for that class in this work is the **dated provider capture (DataForSEO, 2026-10-13, location 2484 / language `es`)** — vendor **estimates**, not measured traffic and not current demand: `creditea es confiable` ≈18,100/mo with Opinio recorded at position 61, and `baubap es confiable` ≈6,600/mo recorded at position 53 in that capture only.
- Observed surfaces occupying those answers **in the same dated capture**: the sampled SERPs put merchant-owned sites, Facebook/Instagram profiles and government consumer pages in the top three (e.g. `farmacia san pablo` → `farmaciasanpablo.com.mx`, `facebook.com`, `instagram.com`; `sfe farmacia` → `pacientes.sfe.com.mx`, `distintivodigital.profeco.gob.mx`), with Opinio recorded as absent (`own position None`) in all five sampled SERPs.
- Human-only step: decide whether a profile is mature enough to be promoted (identity, coverage, cases) before any third party is invited to look at it. **Do not** present profiles whose fields read “No registrado”, “En validación” or “Sin volumen conectado aún” as verification evidence.
- Later measurement: referrer sessions in analytics, and a dated re-capture of the bulk/summary endpoints (§6.3).

**B. The methodology statement — reachable today through the `#metodologia` fragment.**
- Real evidence: measurable definitions of the three pillars and of the coverage metric exist as live page text at `https://opinio.mx/#metodologia`, including the explicit limitation that “[la] falta de información no demuestra una mala experiencia” and that the 0–100 score is not a star average.
- Observed target detail: the fragment **resolves** — the live homepage carries 2 elements with `id="metodologia"` — but that duplicated id means it is not a unique record. It may be cited as existing homepage content; no claim is made that a distinct methodology document exists. `/#independencia` is a nav link with **no** matching element on the homepage (§1.1) and is therefore **not** offered as a citation target.
- Why it is citable: a self-contained definition of “denominator-based” trust scoring is the kind of asset consumer-protection and e-commerce-trust writers cite by reference, and the fragment is retrievable now — it does not depend on any further work.
- Optional, not a prerequisite: promoting the statement to a standalone record (unique URL, single id) remains a human product decision; it would also resolve the duplicated id. This ticket neither requires it nor blocks any reference on the existing fragment.
- Later measurement: none specific; a reference to the fragment would surface in the same instruments as any other reference (§6.3).

**C. Registry provenance already exposed on profiles.**
- Real evidence: `/b/luuna` links out to PROFECO’s Buró Comercial and INEGI DENUE and prints the checked registry value; README describes “Fuentes Oficiales PROFECO/DENUE” as part of the passport.
- Why it matters for authority work: outbound, checkable citations to the primary registry are what make a directory quotable at all; any future approach to registry holders, consumer bodies or journalists should reference these blocks rather than self-asserted claims.
- Human-only step: any approach is human and separately authorized; nothing was sent.

**D. AI-answer sourcing surface (keep, do not re-configure).**
- Real evidence: `robots.txt` explicitly allows the crawlers used by major AI answer systems, and the dated capture records one AI answer citing `opinio.mx` as a source.
- Scope: this is an existing property of the current configuration, not a fix. Changing crawler or analytics configuration is explicitly out of scope for this ticket.

**E. Brand-name disambiguation caveat.**
- Observation: a general web query for `"opinio.mx" -site:opinio.mx` returned mostly unrelated entities named “Opinio” (survey software, a law blog, retail/energy firms) rather than pages about this property.
- Reading: brand-name ambiguity means mention monitoring must match on the domain, and future anchor text should prefer the domain or the product name to avoid feeding the wrong entity. Third-party search index — not a link census; treated as a caveat only.

## 6. Bounded human follow-through

### 6.1 Agent preparation (this ticket — done)

Source-backed observations and the opportunity list above; the distinction between reported zero, unknown/null and sampled no-data; peers framed as context; explicit statement that no campaign has been run and no backlink was created.

### 6.2 Not authorized, not performed

Not performed and not authorized by this ticket: contacting publishers, partners, registries or journalists; buying or exchanging links or posts; directory/bookmark submissions; creating or changing third-party accounts; any paid provider call beyond the dated capture already in the report directory. This matches Google’s own policy that buying or selling links for ranking purposes, excessive exchanges and automated link creation are link spam — <https://developers.google.com/search/docs/essentials/spam-policies>.

Cross-ticket caution (not this ticket’s fix): `/merchant` returns **HTTP 500** (observed). Do not send any human or publisher traffic there until the owning ticket is verified.

### 6.3 Human authorization and later measurement

1. Decide whether to pursue earned references at all. A decision to do nothing is a valid outcome of this ticket.
2. If yes: the owner chooses venues and performs every contact personally. The only link-relevant, evidence-based direction available today is the one the report already states — material that a third party would choose to cite (the Passport record set, published methodology, registry-backed data) — never payment or exchange.
3. Authorize any later read/measurement separately. A fresh two-endpoint provider check costs ≈ **$0.048** at the dated ledger rates ($0.024216 bulk + $0.024036 summary), plus $0.101 if the AI-mentions endpoint is re-run — paid provider calls require explicit authorization. A Search Console re-capture is only a read of an already-connected property, not a paid call or a privacy change, and an agent may perform it once authorized. This ticket is preparation only and took no new capture; the two roles stay distinct — **the owner executes outreach**, **authorized later reads (agent or owner) measure**.
4. Before citing any figure externally, confirm its provenance: for the sampled portfolio profile the live values match the repository’s seeded baseline (off by one unit) and the live review/case texts are not in the repository, so an agent cannot certify them as independent production data.
5. Measure only after something actually changes: GSC Links report refresh, provider re-check, referrer/session data — with the same reported-zero vs unknown vs sampled limitations restated.

### 6.4 Sequencing relative to other tickets

Human outreach is **not** a prerequisite for #14 (technical verification of the local integration branch): no acceptance criterion of #14 depends on external links, and nothing in this ticket blocks or is blocked by it. This brief can be read and acted on in parallel with, or after, that verification. No campaign is claimed complete anywhere.

## 7. Disposition

**Supported no-change disposition.** JEV-006 stands as a *qualified coverage observation*: a dated provider bulk result reported zero referring domains, the same provider’s summary returned unknown/null values, and the first-party Links report shows a sampled zero with “No data” tables. No code, configuration, content or test change is warranted, and no link building is performed or claimed. The deliverable is this brief, which hands the owner an evidence-grounded, bounded human path rather than a fabricated backlink fix.

### Acceptance-criteria mapping

| Criterion | Where satisfied |
| --- | --- |
| Preserve reported zero vs unknown/null and incomplete provider coverage distinctions | §1.2, §2, §1.4 |
| Treat mixed search-overlap peers as context, not a numeric link target | §3 |
| Identify relevant citation/reference opportunities supported by Opinio real evidence | §5 (A–E), §1.1 |
| Do not contact third parties, buy links or claim new backlinks without authorization and observation | §5, §6.2 |
| Separate agent preparation from human outreach and later measurement | §6.1–§6.4 |

## 8. Sources

- Live site (HTTP/DOM), 2026-10-13: `https://opinio.mx/`, `/directorio`, `/verificar`, `/b/cinepolis`, `/b/luuna`, `/caso/nuevo`, `/escribir-opinion/cinepolis`, `/robots.txt`, `/sitemap.xml`, `/merchant`. Raw retrievals with timestamps, sizes and checksums: §1.5.
- Local dated audit capture (untracked): `C:/Users/isaac/ghprojects/opinio/jev-seo-reports/opinio.mx-2026-10-13-full/{audit.json,digest.md,market-review.json,first-party-evidence.json,report.md,first-party-addendum.md}` — crawl 2026-10-13T18:48:01Z, DataForSEO location 2484 / `es`.
- Repository evidence for the provenance note: `scripts/seed.ts:65-66`, `scripts/seed-portfolio-businesses.ts:1144-1145`, `src/components/home/ProofBentoGrid.tsx:119-151`, `README.md:16-19,71`, `data/mexican_stores_1000.json`.
- Vendor documentation: <https://docs.dataforseo.com/v3/backlinks/overview/>, <https://docs.dataforseo.com/v3/backlinks/bulk_referring_domains/live/>, <https://docs.dataforseo.com/v3/backlinks/summary/live/>.
- Google: Search Console Links report <https://support.google.com/webmasters/answer/9049606>; spam policies (link spam) <https://developers.google.com/search/docs/essentials/spam-policies>.
- Issue #13 body and acceptance criteria: <https://github.com/lawrns/opinio/issues/13>.
