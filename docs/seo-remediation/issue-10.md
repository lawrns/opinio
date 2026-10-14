# Issue #10 — Produce accurate, privacy-safe share previews (JEV-023)

Status: implemented on `fix/opinio-seo-issue-10` (worktree
`C:/Users/isaac/tmp/opinio-seo-worktrees/issue-10`, base integration head
`989837e3e54407b96c80cbf43b2aa154b94c305f`). **Ticket worktree verified; integration pending** —
this branch is not merged, published or released, and production was not touched.

The audit finding (JEV-023) counted 299 crawled URLs without `og:title` or `og:image`,
including the homepage, the directory and the utility/form families, and asked for previews
built from the reviewed page identity rather than from serialized query values.

## 1. What the rendered evidence showed (before the change)

Raw HTTP capture of the served HTML on the untouched base tree (artifact
`evidence/seo-10/red-baseline/capture.json`, same catalogue DB, public site origin pinned to the
local server):

- `/`, `/directorio` and `/directorio?page=2`: `og:title`/`og:description`/`og:url` present,
  **no `og:image` and no Twitter image**; Twitter fell back to `twitter:card=summary`.
- `/verificar`, `/verificar?q=…`, `/verificar?accion=…`, `/verificar?categoria=…`,
  `/caso/nuevo`, `/caso/nuevo?b=…`, `/escribir-opinion/<slug>`: served the **site fallback**
  `og:title` ("Opinio México — Pasaporte de Confianza Comercial") and `og:url` = the site root,
  not their own purpose identity — and no image. The `?q=`/`?b=` variants were not echoed
  (the leak was already absent), but the identity was wrong.
- `/` had `og:url` = site origin while its `canonical` was the hard-coded production origin: the
  two identities disagreed as soon as the deployment origin differed from `https://opinio.mx`.
- `/b/mercado-libre` already emitted the reviewed record identity, its self-canonical, a
  per-merchant 1200×630 PNG (`200, image/png`, decoded) and a `summary_large_image` Twitter card.
- Private surfaces (`/caso/<id>`, `/merchant*`, `/widget/*`) were leak-free but inherited the site
  fallback with no image.

The ticket's own regression (`scripts/verify-share-previews.mjs`) run against a pristine checkout
of the base commit scored **12/24 checks passed, exit 1** (artifact
`evidence/seo-10/base-red/harness-red.txt`): every missing-image check, the homepage identity
check, the utility identity/URL checks, the opinion-entry preview check and the unknown-slug card
check were red (the base served a fabricated merchant card for a slug with no catalogue row).

## 2. Change

| File | Change |
| --- | --- |
| `src/lib/share-preview.ts` (new) | One helper `sharePreview({ title, description, url })` returning the Open Graph + Twitter metadata for a family, built from the family's reviewed identity (share tags, not per-page artwork), plus the generic platform card descriptor (`/compartir/preview`, 1200×630, alt). URLs are relative on purpose: Next composes them with the root `metadataBase`, so the emitted absolute URLs always use the deployment's public origin. The returned fragment is typed from `Metadata` (`NonNullable<Metadata['openGraph' | 'twitter']>`), not from the deprecated `next` type exports. |
| `src/app/compartir/preview/route.tsx` (new) | The shared preview card (`ImageResponse`, PNG 1200×630, synchronous `GET`): the platform's own identity only — no merchant data, no score, no verification claim. Served as an explicit route, not as a file-based `opengraph-image` convention (see the precedence note below). |
| `src/app/b/[slug]/opengraph-image.tsx` | Per-merchant passport card rewritten to the accepted record identity: it renders the brand plus the `passportMetadata(facts)` description (razón social, catalogue category and the raw recorded scope, with source placeholders omitted), and nothing else. Removed the fabricated fallbacks (`Comercio Verificado`, `RFC: Registro en Cotejo`), the trust-score gauge, the stale `verified_level` mapping and the three blanket footer chips ("Cédula SAT Verificada", "Monitoreo PROFECO", "Opiniones con Ticket"). A slug with no catalogue row answers `404` instead of rendering an invented merchant, and the row query reads only `brand_name`/`legal_name`/`category`/`operating_area`. |
| `src/app/layout.tsx` | Root metadata now uses `sharePreview` for the site identity (`SITE_TITLE`/`SITE_DESCRIPTION`, single literals) so pages without a family identity of their own (private portals, widget embeds, 404s) inherit a complete, leak-free preview with the shared card. The redundant second Open Graph description variant was dropped. |
| `src/app/page.tsx` | Homepage canonical is now the relative `/` (resolved against `metadataBase`) instead of a hard-coded production origin, and the preview reuses the homepage's own title/description. The JSON-LD `@graph` is untouched (issue #8 keeps its production-absolute identity). |
| `src/app/directorio/page.tsx` | `openGraph` block replaced by `sharePreview`; page 1 stays bare-canonical, page N keeps its self-canonical `?page=N`, title keeps the public ordinal and no incidental parameter is serialized. |
| `src/app/verificar/layout.tsx` | Purpose title/description hoisted to single literals and reused for the preview; `og:url` is the parameter-free `/verificar`, so `q`/`categoria`/`accion` variants can never reach share metadata. `robots: noindex, follow` unchanged. |
| `src/app/caso/nuevo/layout.tsx` | Same pattern with `/caso/nuevo`; the `?b=<merchant>` parameter never reaches share metadata. `robots: noindex, follow` unchanged. |
| `src/app/escribir-opinion/[slug]/page.tsx` | `generateMetadata` now reuses its merchant title/description/self-canonical for the preview, so the entry page shares its merchant identity and is never cross-linked to the `/b/<slug>` passport. The unknown-slug branch no longer says "en proceso de validación" (an invented process) and uses the factual "Este comercio no está registrado en Opinio México." |
| `scripts/verify-share-previews.mjs` (new) | Deterministic real-HTTP regression: the loopback + private-database refusal runs at module scope, before the dev server is spawned and before any connection; the server then boots `next dev --webpack` with the public site origin pinned to its own loopback port (so the emitted absolute image URLs are really fetched), asserting identity reuse, public URL identity, image usability (status/content-type/decode/dimensions of the emitted URL), the unknown-slug card `404`, parameter privacy on the variants and private surfaces, the case-portal fixture lifecycle, and the preserved indexing policy. |
| `docs/seo-remediation/issue-10.md` | This record. |

Passport (`/b/<slug>`) keeps its per-merchant card URL and its reviewed identity from
`passportMetadata` (issue #4); the card body is now the recorded public identity only (see above),
and the passport page metadata itself was already green and is unchanged.

### Precedence note: why the shared card is an explicit route

Next 16 resolves file-based metadata images with their own fallback origin and gives them priority
over inherited config images (`lib/metadata/resolve-metadata.js` `mergeStaticMetadata`, and
`getSocialImageMetadataBaseFallback`). Observed on this runtime: with a root
`app/opengraph-image.tsx` in place, every route whose metadata chain does **not** define its own
`openGraph` (`/merchant*`, `/widget/*`, `/caso/<id>`, 404s) emitted
`http://localhost:3210/opengraph-image?805cf3009377215b` — a different origin than the configured
public one — while the families with an explicit `openGraph` emitted the config URL. Preserved
artifact: `evidence/seo-10/before-route-move/image-surface.json`. Serving the card from
`src/app/compartir/preview/route.tsx` and referencing it explicitly from `sharePreview` keeps every
family on one deterministic, deployment-origin URL (verified below).

## 3. Verification (observed)

Runtime: private DB `opinio_issue_10` (1108 real catalogue businesses, 0 reviews / 0 cases /
0 identities), dev server `next dev --webpack` on port 3210. Turbopack dev is broken on this host
(externalized `pg`); that is a host limitation, not an application defect.

1. Ticket regression, base tree → branch (same script, same catalogue):

   ```
   DATABASE_URL=postgres://…@127.0.0.1:54732/opinio_issue_10 SMOKE_PORT=3210 \
     node scripts/verify-share-previews.mjs
   ```

   - pristine base checkout (`git archive 989837e3`, artifact `evidence/seo-10/base-red/harness-red.txt`):
     **12/24 passed, exit 1**.
   - this branch (artifact `evidence/seo-10/branch-green/harness-green.txt`): **24/24 passed, exit 0**.

   Observed excerpts (branch run): `/` → `og:title` = document title, `og:url` = `canonical` =
   `http://127.0.0.1:3210`; `/directorio` → `og:url=http://127.0.0.1:3210/directorio`;
   `/directorio?page=2&utm_source=smoke&utm_campaign=issue10` → `og:url=http://127.0.0.1:3210/directorio?page=2`;
   `/verificar` (+`?q=Luuna`, +`?categoria=Restaurantes&accion=opinar`) → `og:url=http://127.0.0.1:3210/verificar`;
   `/caso/nuevo` (+`?b=…`) → `og:url=http://127.0.0.1:3210/caso/nuevo`;
   `/escribir-opinion/<slug>` → `og:url` = `canonical` = `…/escribir-opinion/<slug>`;
   `/b/<slug>` → reviewed record title/description + self-canonical + its own 1200×630 card;
   `/b/<unknown>/opengraph-image` → `404`; every emitted image URL fetched: `200, image/png, 1200x630`;
   no query key, merchant parameter, form value, case identifier or widget token in any
   `og:`/`twitter:` attribute; the verification case created through `POST /api/v1/cases` was
   deleted (`resolution_cases 0 → 0`).

   Guard ordering observed (same script, no server started): a fake remote
   `DATABASE_URL` (`db.example.com/opinio_issue_10`) and the shared loopback database (`opinio`)
   both exit `2` in ~0.1 s with the refusal message, before the dev server is spawned and before any
   connection — the refusal is at module scope.

2. Browser DOM evidence (read-only collector `qa/render-evidence.mjs`, system Chrome 154,
   artifact `evidence/seo-10/dom/results.json`): 10 routes (`/`, `/directorio`,
   `/directorio?page=2`, `/b/mercado-libre`, `/b/blade-shop-mexico`,
   `/verificar?q=Luuna&accion=opinar`, `/caso/nuevo?b=mercado-libre`,
   `/escribir-opinion/mercado-libre`, `/merchant?business=mercado-libre`,
   `/widget/badge/wgt_mercado-libre_badge_2026`) → server 200 and browser 200, zero console errors;
   DOM shows the same titles/canonicals and the preview attributes (e.g.
   `/verificar?q=Luuna&accion=opinar` → `og:url=http://127.0.0.1:3210/verificar`,
   `twitter:card=summary_large_image`).

3. Real browser image surface (`evidence/seo-10/dom/image-surface.mjs` →
   `image-surface.json`, real bytes saved under `dom/images/`): for all routes the DOM
   `og:image`/`twitter:image` were loaded inside the page and decoded at
   `naturalWidth=1200, naturalHeight=630`; every captured bitmap is a real PNG
   (`89504e470d0a1a0a`, `content-type: image/png`, `200`), the shared card is 51542 bytes and the
   per-merchant card 78468 bytes (distinct identity). The per-merchant card contents were observed
   directly at the bitmap: `evidence/seo-10/passport-card.png` shows the brand, the razón social,
   the catalogue category, the raw recorded scope and the `opinio.mx/b/<slug>` URL — no chips, no
   score, no placeholder; `evidence/seo-10/passport-card-missing-facts.png` shows the
   truth-missing state for a record without a legal name whose scope is the source placeholder
   `NO PROPORCIONA` (only the recorded category is stated). Both were fetched with a share-crawler
   user agent (`Twitterbot/1.0`): `200, image/png, 1200x630`; the unknown slug returned
   `404` (`facebookexternalhit/1.1`).

4. Production-origin identity (emitted strings only, artifact
   `evidence/seo-10/prod-origin-identity.json`, `fetched=false`): with the site origin left at the
   deployment default, `/` → `canonical=og:url=https://opinio.mx`,
   `og:image=https://opinio.mx/compartir/preview`; `/directorio?page=2` →
   `https://opinio.mx/directorio?page=2`; `/verificar?q=Luuna` → `https://opinio.mx/verificar`;
   `/b/mercado-libre` → `https://opinio.mx/b/mercado-libre/opengraph-image`. These URLs were **not**
   fetched: the branch is not deployed, so nothing pretends they are reachable.

5. Sibling regressions on this branch (unchanged harnesses): `scripts/verify-seo-indexing.mjs`
   **17/17**, `scripts/verify-seo-metadata.mjs` **28/28**, `scripts/verify-directory-pagination.mjs`
   **73/73**. (The pagination harness pins `https://opinio.mx` expectations, so it is run against a
   server without the loopback origin override.)

## 4. Acceptance criteria mapping

- [x] **Reuse the accepted title/description identity from ticket #4.** Each family passes its own
  reviewed strings to `sharePreview`: homepage title/description, `DIRECTORY_TITLE`/
  `DIRECTORY_DESCRIPTION` (page ordinal for page N), the search/case-entry layout strings, the
  opinion-entry merchant strings, and `passportMetadata` for passports. Asserted as
  `og:title === <title>` and `og:description === <description>` on every family and variant.
- [x] **Emit usable public preview image metadata and appropriate URL identity.** Every family and
  variant now emits `og:image` + `twitter:image` (+ width/height/alt) and the emitted URL was
  fetched and decoded (`200, image/png, 1200×630`) and rendered in a real browser; `og:url` is the
  page's own canonical (homepage `/`, directory page-scoped, passport, opinion entry) or the
  parameter-free purpose URL (search, case entry). The homepage canonical/`og:url` disagreement was
  removed by resolving both against `metadataBase`.
- [x] **Keep private case identifiers, query tokens and form values out of share metadata.**
  Asserted over all `og:`/`twitter:` attributes: `?q=`, `?b=`, `?business=`, `?accion=`,
  `?categoria=`, `utm_*`, the widget token, case number/id, customer name/contact and merchant name
  never appear on the parameterized public routes or on the private surfaces (`/caso/<id>` with a
  real local case, `/merchant?business=…`, `/widget/…`). Private routes keep inheriting the site
  identity only; no auth or indexing policy was added to them.
- [x] **Verify rendered metadata for homepage, directory, passport and allowed utility families.**
  HTTP harness (24/24) plus DOM collector and in-browser image rendering over the ten routes above,
  including the parameter variants; preserved policies re-verified in the same runs: search and
  case-entry stay `noindex, follow`, opinion entry stays indexable with its merchant self-canonical
  (not the passport), passport and directory stay indexable with their canonicals, and the sitemap
  is untouched (`verify-seo-indexing` 17/17, `verify-directory-pagination` 73/73).

## 5. Environment / staging

No staging configuration exists for this work. Verification is local-only against the isolated
runtime (**ticket worktree verified; integration pending** — the branch is not merged, published or
released). No push, deploy, merge or
production change; no paid provider calls, account changes or outreach; the existing opt-in
analytics path, CSP/referrer policies (issue #11), directory pagination (#5), image layout (#9) and
the passport JSON-LD claims (#6/#8) are untouched.

## 6. Limitations

- Dev-mode evidence only (`next dev --webpack`); `next build`/standalone output, lint and vitest are
  the integration/closure battery, not this record. `npx tsc --noEmit` was run on the ticket tree
  and exits 0.
- Local catalogue is 1108 businesses; no local count is presented as a production figure, and no
  GA4/CrUX/field metric is claimed.
- The homepage JSON-LD `@graph` intentionally stays on the production origin (issue #8 scope), so on
  a local runtime with a loopback origin the structured-data URLs differ from the loopback
  canonical; in production both resolve to the same origin.
- The audit's 299-URL count is a crawl figure for the deployed site; this record proves the emitted
  metadata families locally, not the crawl's page inventory.
- The per-merchant passport card now states the recorded public identity only (brand + the accepted
  `passportMetadata` description: razón social, catalogue category, raw recorded scope). It shows no
  trust score, no verification level, no review count, no source chips and no placeholder values,
  because the catalogue rows carry no records backing such claims; when a field is absent (or is a
  source placeholder such as `NO PROPORCIONA`) it is omitted rather than invented. No new data
  lookups, scoring or provenance layer were added for it.
