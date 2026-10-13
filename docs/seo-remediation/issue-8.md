# Issue #8 — Describe the Opinio homepage entity with accurate structured data

- Issue: https://github.com/lawrns/opinio/issues/8 (labels `enhancement`, `ready-for-agent`; author @ivzc07; open; 0 comments before claim; native `blocked_by`: none; blocking: #14)
- Finding: JEV-004 (P2, impact 50, effort 2, count 1, `rule` — "No structured data on the homepage"); JEV-005 automatic LocalBusiness recipe **rejected** by owner review.
- Claim comment (session seo-8): https://github.com/lawrns/opinio/issues/8#issuecomment-6156631193
- Branch: `fix/opinio-seo-issue-8` · worktree `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-8` · base `fefc090`
- Disposition: **change** — homepage now renders Opinio's own Organization + WebSite JSON-LD; no LocalBusiness, address, phone, hours, or merchant identity.
- Scope: `src/app/page.tsx` only (JSON-LD block + `<script type="application/ld+json">`); `metadata` export untouched. No other routes, forms, analytics, or config touched. No paid calls, account changes, or outreach.
- Evidence wording: **local integration branch verified; not published/released.**

## 1. Bottom line

`GET /` on the local webpack dev server returned HTTP 200 with **zero** `application/ld+json` blocks before the change and exactly **one** after, containing two nodes: `Organization` (`https://opinio.mx#organization`) and `WebSite` (`https://opinio.mx#website`), with `WebSite.publisher` → the Organization. Every declared property is Opinio's own identity and agrees with the rendered document: `name` "Opinio México" (document title), `alternateName` "Opinio.mx" (navbar/footer brand text and OG `siteName`), `url` `https://opinio.mx` (canonical link on the same response), `logo` `/opinio.svg` (served favicon/brand asset), `inLanguage` `es-MX` (visible `<html lang="es-MX">`). No address, telephone, hours, price range, geo, contact point, sameAs, merchant names, RFCs or review data appear anywhere in the emitted graph.

## 2. Acceptance criteria with evidence

All evidence below is from the private local runtime (worktree `issue-8`, dev port 3208, DB `opinio_issue_8`) per `C:/Users/isaac/tmp/opinio-remediation/runtime.md`. Nothing was pushed, merged, deployed, or published.

#### AC1 — Use Opinio identity, not a reviewed merchant identity

Confirmed. The graph contains exactly two `@type`-bearing nodes and both are Opinio platform entities; there is no `/b/<slug>` scoped `@id`, no brand `name` from the catalogue, and the homepage renders `<TrustGraphHero />` without a `business` prop, so no merchant data is even in the render path (source-confirmed, seam unchanged by this ticket).

- Rendered `@id`s observed: `https://opinio.mx#organization`, `https://opinio.mx#website` (script parse of the HTTP response, §3).
- The merchant-side counterpart entity (`${canonicalUrl}#organization`, per merchant passport in `src/app/b/[slug]/page.tsx`) is a different `@id` namespace and was not touched.

#### AC2 — Include only factual supported properties

Confirmed; each property is grounded in rendered content or a served asset, and nothing beyond that set is emitted.

| Property (node) | Rendered/visible support |
|---|---|
| `Organization.name` "Opinio México" | `<title>Opinio México — Pasaporte de Confianza Comercial</title>` on the same response |
| `Organization.alternateName` "Opinio.mx" | navbar/footer brand text "opinio.mx"; OG `siteName` "Opinio.mx" |
| `Organization.url` `https://opinio.mx` | `<link rel="canonical" href="https://opinio.mx"/>` on the same response |
| `Organization.logo` `https://opinio.mx/opinio.svg` | served brand asset `public/opinio.svg`, referenced as the site icon in `src/app/layout.tsx` |
| `Organization.description` | verbatim homepage `metadata.description`; the tagline is the visible `<h1>` "Antes de comprar, conoce a quién le compras." |
| `WebSite.name` / `url` | matches the `WebSite` entity referenced by `isPartOf` on `/directorio` and `/b/[slug]` (`${baseUrl}#website`, name "Opinio México") |
| `WebSite.inLanguage` `es-MX` | `<html lang="es-MX">` |
| `WebSite.publisher` → Organization `@id` | self-consistent graph reference resolved within the same block |

Deliberately omitted because nothing visible supports them: `sameAs` (no social profiles linked on the site), `contactPoint`/`email`/`telephone` (none published), `potentialAction`/SearchAction (no crawler-visible search endpoint contract asserted), `address`/`openingHours`/`geo`/`priceRange` (no published Opinio location).

#### AC3 — Validate rendered JSON-LD and visible-content consistency

Confirmed with real HTTP + a real browser DOM (Playwright 1.59.1, system Chrome), plus a DOM parser over the raw response. The block is server-rendered (present without JavaScript) and hydrates identically.

Server-response parse (Python `html.parser`, DOM-based, not a source-text assertion), `after.html`. The checker prints `text_chars` (Python string length: **89,368 characters**); the actual HTTP body for that same response was **89,531 bytes** (`curl -w %{size_download}`; the difference is UTF-8 multibyte content). The checker output follows:

```
=== AFTER (issue-8 working tree, local :3208) ===
text_chars=89368 ld+json blocks=1
--- block[0] valid JSON; nodes with @type: 2
  root.@graph[0]: @type=Organization @id=https://opinio.mx#organization name=Opinio México
  root.@graph[1]: @type=WebSite @id=https://opinio.mx#website name=Opinio México
Organization: {"@type": "Organization", "@id": "https://opinio.mx#organization", "name": "Opinio México", "alternateName": "Opinio.mx", "url": "https://opinio.mx", "logo": "https://opinio.mx/opinio.svg", "description": "Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México."}
WebSite: {"@type": "WebSite", "@id": "https://opinio.mx#website", "name": "Opinio México", "url": "https://opinio.mx", "inLanguage": "es-MX", "publisher": {"@id": "https://opinio.mx#organization"}}
RESULT: PASS
visible-brand opinio.mx brand text: yes
visible-brand Opinio Mexico title/brand: yes
visible-brand independiente footer: yes
```

Real-browser DOM collector (`qa/render-evidence.mjs`, GET-only), observed:

```
/ server=200 browser=200 title="Opinio México — Pasaporte de Confianza Comercial" desc=present canonical=https://opinio.mx jsonldDom=1 jsonldServer=1 h1=1 text=3745 consoleErrors=0
```

`results.json` also shows `jsonLdErrors: []` (block parses as valid JSON in DOM) and `bodyTextSample` containing the visible brand strings "opinio.mx", "EL PASAPORTE DE CONFIANZA MÉXICO / MX"; the only `<h1>` is "Antes de comprar, conoce a quién le compras.".

#### AC4 — Do not add LocalBusiness address/phone/hours from rejected JEV-005

Confirmed by construction and by scan. `@type` values in the block: `Organization`, `WebSite` only. Property scan over every JSON node found no `address`, `telephone`, `email`, `openingHours`, `openingHoursSpecification`, `geo`, `priceRange`, `hasMap`, `currenciesAccepted`, `paymentAccepted`; forbidden type scan found no `LocalBusiness`/`OnlineStore`/`Store`/`Restaurant`/`Dentist`. The rejected-recommendation wording comes from the audit's JEV-005 disposition: `report.md` (JEV-005 block, its "Owner review" line) states *"Use accurate Organization/WebSite markup under JEV-004. Do not add address, phone or hours without a real Opinio location described on the page."* The underlying machine record `owner-review.json` → `.annotations[action_id=JEV-005]` states `verdict: "Recommendation rejected"` and `owner_next_step: "Do not implement the automatic LocalBusiness recipe. Use accurate Organization/WebSite markup under JEV-004; a real location would require separate evidence."`

### Before/after (actual local HTTP)

```
BEFORE: HTTP 200 bytes=87882 time=17.46s   ld+json blocks=0   JSON-LD: ABSENT
        title: "Opinio México — Pasaporte de Confianza Comercial"
        canonical: https://opinio.mx
AFTER:  HTTP 200 bytes=89531 time=2.38s    ld+json blocks=1   RESULT: PASS
        title: "Opinio México — Pasaporte de Confianza Comercial"
        canonical: https://opinio.mx
```

(`bytes=`/`time=` are true HTTP response byte counts and wall time from `curl -w`; the `ld+json blocks` / `JSON-LD: ABSENT` / `RESULT: PASS` lines are the DOM checker.)

Delta is +1 script block (1,649 bytes) and nothing else: `metadata` export, title, meta description, canonical, OG/Twitter tags and the rendered page are byte-identical in the compared markers (see §4).

### Preserved behavior checks (same runtime, before vs after)

| Marker | before | after |
|---|---|---|
| `<form` occurrences | 1 | 1 |
| `<input` occurrences (`HomeSearch`) | 1 | 1 |
| Analytics/gtag occurrences (opt-in; `NEXT_PUBLIC_GA_MEASUREMENT_ID` unset in this env) | 0 | 0 |
| `meta name="description"` | identical | identical |
| `link rel=canonical` | `https://opinio.mx` | `https://opinio.mx` |
| Browser console errors | — | 0 |
| Failed requests | — | 0 |

No test files were added. This change is factual schema wiring (a static literal graph with no user-controlled input), and the repository's vitest suite covers library logic only (`src/lib/analytics.test.ts`, `src/lib/scoring.test.ts`) — there is no page-render/DOM test harness to extend, so a permanent regression test would mean adding new render-test wiring the ticket did not request. The issue's verification rule asks for a deterministic consumer-visible regression "where practical": here the deterministic, consumer-visible check is the actual HTTP response plus real-browser DOM capture (external checker and `qa/render-evidence.mjs`, GET-only), which exercises the rendered contract a crawler/consumer sees; re-running §6's commands against a fresh server reproduces the same assertion for this static graph. No mocks, no source-text assertions, no production fixtures.

## 3. Exact rendered JSON-LD (verbatim from the HTTP response, after)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://opinio.mx#organization",
      "name": "Opinio México",
      "alternateName": "Opinio.mx",
      "url": "https://opinio.mx",
      "logo": "https://opinio.mx/opinio.svg",
      "description": "Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y resolución de comercios en México."
    },
    {
      "@type": "WebSite",
      "@id": "https://opinio.mx#website",
      "name": "Opinio México",
      "url": "https://opinio.mx",
      "inLanguage": "es-MX",
      "publisher": {
        "@id": "https://opinio.mx#organization"
      }
    }
  ]
}
```

Rendered via the repo's established convention (same as `/directorio` and `/b/[slug]`): a native `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />` inside the page component — the pattern recommended by the installed Next.js 16 guide (`node_modules/next/dist/docs/01-app/02-guides/json-ld.md`). `@id` values use the page's existing `baseUrl` constant (`https://opinio.mx`), which is also the canonical link emitted by this page, so the graph and the page agree.

## 4. What changed (files)

- `src/app/page.tsx` — added the `jsonLd` object and the JSON-LD `<script>`; `metadata` export unchanged. The script tag is the first child of the page fragment, matching the sibling pages' placement.
- Commit `f225b80` contains exactly these two paths (`git diff --name-only fefc090...f225b80` = `docs/seo-remediation/issue-8.md`, `src/app/page.tsx`): no `CLAUDE.md`, no `docs/agents/**`, no `.env*`, no `jev-seo-reports/**`, no other route or component.
- `git add` was explicit-path only; the approved uncommitted local agent config (`M CLAUDE.md`, `?? docs/agents/`) was left uncommitted and untouched, and nothing was pushed. The focused-review note fixes in this document are themselves a follow-up doc-only commit containing this file only.

## 5. Limits and residual uncertainty

- **Local, not production.** Evidence is from the local integration branch on dev port 3208; the change is not published or released. Production rich-results/SEO validation remains a director/integration step.
- **No third-party validator call.** Google Rich Results Test / Schema Markup Validator were not called (external service; not required for this ticket). Structural validity is proven by JSON.parse in two independent DOM paths (`jsonLdErrors: []`) and by the property/type scans above.
- **Env-var nuance.** This page's `baseUrl` is the file's existing hard-coded canonical host (used by its `metadata.alternates.canonical`). Other routes compute `baseUrl` from `NEXT_PUBLIC_SITE_URL` (with the legacy `fertilitylistings` fallback). In this runtime the env var is unset, so all observed values are `https://opinio.mx`. If a future deployment sets `NEXT_PUBLIC_SITE_URL` to a different host, homepage metadata **and** its JSON-LD would both stay on `opinio.mx` — a pre-existing page-level convention, flagged here but not changed (homepage metadata was out of scope; #10 later owns metadata).
- **XSS hardening.** Following the existing repo convention, the static literal graph uses plain `JSON.stringify` without the guide's optional `<` escaping; the object contains no user-controlled strings, so no injection surface exists.
- **Sibling tickets.** #9 may add a `priority` prop in `TrustGraphHero` (not this page) and #10 may later touch homepage metadata; neither overlaps this JSON-LD seam.

## 6. Reproduction commands

```bash
# 1. dev server (worktree root; --webpack required on this host)
DATABASE_URL='postgres://opinio:opinio_local_dev@127.0.0.1:54732/opinio_issue_8' \
NEXT_TELEMETRY_DISABLED=1 \
node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3208

# 2. raw response capture + DOM parse (external evidence dir)
curl -s -o before.html http://127.0.0.1:3208/         # before: 0 ld+json blocks
curl -s -o after.html  http://127.0.0.1:3208/         # after:  1 block, PASS
python C:/Users/isaac/tmp/seo-8-evidence/check_home_jsonld.py after.html "after"

# 3. real-browser DOM evidence (system Chrome)
BASE_URL=http://127.0.0.1:3208 ROUTES=/ OUT=C:/Users/isaac/tmp/seo-8-evidence/dom \
node C:/Users/isaac/tmp/opinio-remediation/qa/render-evidence.mjs
```

External artifacts (not committed): `C:/Users/isaac/tmp/seo-8-evidence/{before.html,after.html,check_home_jsonld.py,dom/results.json,dom/home.png,dom/home.html}`.
