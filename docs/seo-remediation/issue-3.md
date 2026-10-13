# Issue #3 — Apply the approved utility indexing and canonical policy

Branch: `fix/opinio-seo-issue-3` (base integration branch `fix/opinio-seo-remediation` @ `fefc09028acc1ca94eddf5decc15459c46a7e614`).
Worktree: `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-3`.
Approved decision implemented as given (JEV-016/JEV-024/JEV-025): noindex the search and case-entry families, keep opinion-entry indexable with a merchant-specific canonical, keep public passports and the directory indexable. The policy was not re-decided here.

## Changes

| File | Change |
| --- | --- |
| `src/app/verificar/layout.tsx` (new) | Route metadata wrapper: `robots: { index: false, follow: true }`. Applies to `/verificar` and every query/category/action variant because they are the same route. |
| `src/app/caso/nuevo/layout.tsx` (new) | Route metadata wrapper: `robots: { index: false, follow: true }`. Applies to `/caso/nuevo` and its `?b=<merchant>` variants. |
| `src/app/escribir-opinion/[slug]/page.tsx` | Added `generateMetadata`: merchant-specific title/description and a self-canonical `…/escribir-opinion/<merchant>` built from the path only, so incidental parameters (`?b=…`, `utm_*`) normalize to the merchant path and are never cross-canonicalized to the `/b/<merchant>` passport. Unknown slugs return no canonical (Next injects `noindex` for the 404). The page body and the form flow are unchanged. |
| `scripts/verify-seo-indexing.mjs` (new) | Deterministic HTTP regression for this policy. Boots `next dev` and asserts real served HTML: noindex+follow on the utility variants, indexability + self-canonical on opinion entry (including parameter normalization), passport/directory indexability, `/robots.txt` not blocking retrieval, unknown slug `404` with noindex and no canonical, and the sitemap inventory compared as an exact URL set against the complete non-empty business slug inventory read from the database (base routes preserved, only directory-family extras allowed, zero utility URLs). |

No canonical is emitted for the two noindex routes: they are excluded from the index, so a canonical would only add noise. `sitemap.ts` and `robots.ts` are intentionally untouched.

## Verification (observed)

Runtime (runtime-verification's isolated environment): private DB `opinio_issue_3` = 1108 real PROFECO-derived catalogue businesses (production has 1200 profile slugs; the local inventory is smaller and is never asserted as a production figure). Dev mode: `next dev --webpack -H 127.0.0.1 --port 3203` (Turbopack dev on this host fails to load the externalized `pg` driver from a hoisted node_modules; see limitations).

1. HTTP regression, before → after (same hardened script, same catalogue):
   - Pre-fix code in this worktree: `8/17 checks passed`, exit 1 — the six utility-noindex checks, the opinion self-canonical check, the merchant-title check and the parameter-normalization check are red (`robots="null"`, `canonical=null`); passport/directory/sitemap/robots.txt/404 checks pass.
   - Post-fix code in this worktree (command below): `17/17 checks passed`, exit 0.

     ```
     DATABASE_URL=postgres://…@127.0.0.1:54732/opinio_issue_3 SMOKE_PORT=3203 \
       node scripts/verify-seo-indexing.mjs
     ```

     The throwaway local container password is not published; it lives only in the external, non-publishable runtime notes (`C:/Users/isaac/tmp/opinio-remediation/runtime.md`).

     Observed excerpts: `/verificar`, `/verificar?q=luuna`, `/verificar?categoria=Restaurantes`, `/verificar?accion=opinar`, `/caso/nuevo`, `/caso/nuevo?b=2io-electronics` → `200, robots="noindex, follow"`;
     `/escribir-opinion/2io-electronics` → `200, canonical=https://opinio.mx/escribir-opinion/2io-electronics`;
     `/escribir-opinion/2io-electronics?b=…&utm_source=smoke` → same canonical (not the passport);
     `/b/2io-electronics` and `/directorio` → `200`, no noindex, canonical intact;
     `/sitemap.xml` → `1110 declared URLs, utility entries: 0`; `sitemap declares exactly the catalogue business passports — 1108/1108 passport URLs match the database slug inventory`; `sitemap keeps the base routes and only directory-family extras — 2 non-passport URLs: /, /directorio`;
     `/robots.txt` → no utility `Disallow`; unknown slug → `404, robots="noindex", canonical=null`.
2. Sitemap check red-capability probe (temporary, reverted): with `src/app/sitemap.ts` locally patched to drop one passport (`2io-electronics`), the same run reported `FAIL sitemap declares exactly the catalogue business passports — 1107/1108 passport URLs match the database slug inventory, missing: https://opinio.mx/b/2io-electronics` (`16/17`). The route file was restored to its pristine committed state immediately after (`git status` clean for `sitemap.ts`), so the check is not a tautology over the route's own output.
3. Base-commit baseline (read-only reference instance on port 3214, base commit, same catalogue family): `/sitemap.xml` → `1110` declared (1108 profiles + `/` + `/directorio`); all `/verificar`, `/caso/nuevo*` and `/escribir-opinion/*` responses `robots=null, canonical=null`; `/b/mercado-libre` and `/directorio` canonical intact.
4. Rendered DOM + raw HTML parity (runtime evidence collector, `evidence/seo-3/render/results.json`, 10 screenshots): server HTML and DOM agree — utility variants `robots="noindex, follow"` in both; `/escribir-opinion/mercado-libre` (plain and `?b=x&utm_source=smoke`) renders `canonical=https://opinio.mx/escribir-opinion/mercado-libre` with no noindex; passport and directory unchanged. Zero console errors on these routes.
5. Working flows at the DOM interface (Playwright, system Chrome, `evidence/seo-3/journey/journey.json`; 5/5 steps, no POSTs):
   - `/verificar?q=luuna&accion=opinar` → clicked “Opinar sobre Luuna” → navigated to `/escribir-opinion/luuna` (h1 “Opinar sobre Luuna”, merchant title, self-canonical, indexable). Search selection navigation still works and the utility page itself is `noindex, follow`.
   - `/caso/nuevo?b=luuna` → merchant preselected in the form (`Luuna`), `robots="noindex, follow"`.
   - `/verificar?categoria=Hogar&accion=opinar` → `Hogar` filter pressed, text search for `luuna` returns the merchant heading, page still functional and noindex.
   - `/b/luuna` → h1 rendered, indexable, self-canonical.
5. Production snapshot (read-only GETs, authorized, no mutations): `https://opinio.mx/sitemap.xml` → `1202` declared URLs (1200 `/b/` profiles + `/` + `/directorio`); production `/verificar`, `/caso/nuevo` and their sampled variants currently have `robots=null, canonical=null`; `/b/<slug>` and `/directorio` have canonicals. This documents the pre-fix production state; it is not a release of this branch.

### Acceptance criteria mapping

- [x] Noindex `/verificar` and query/category/action variants, and `/caso/nuevo` with merchant-parameter variants — layouts + HTTP/DOM assertions above.
- [x] Retain `/escribir-opinion/<merchant>` indexability; passports and directory indexability preserved — smoke + DOM checks.
- [x] Merchant-specific canonical on opinion entry; incidental parameters normalized, no passport cross-canonical — smoke + DOM (plain and parameterized URLs identical canonical).
- [x] Crawler-visible directives without robots blocking — `noindex, follow` present in raw HTML and DOM; `/robots.txt` has no `Disallow` for these paths; pages stay fetchable (200).
- [x] Preserve the declared sitemap families — `sitemap.ts` untouched; the served sitemap matches, as an exact URL set, the complete non-empty business slug inventory read from the database (`1108/1108`) in both the pre-fix and post-fix runs; non-passport entries are only `/` and `/directorio` (directory-family extras such as directory pagination are allowed), with zero utility URLs; the exact-set check was probed red-capable (dropped passport → `1107/1108`, missing reported); production declared `1202` URLs observed unchanged; no utility variant added to satisfy JEV-024.
- [x] Verify actual HTTP/DOM metadata and unchanged working search/case/opinion flows — regression script, render evidence, DOM journeys.

## Environment / staging

There is **no approved staging configuration** for this work. Verification is local-only against the isolated runtime above ("local integration branch verified; not published/released"). No push, deploy, merge, or production change was made; production was read only, with plain GETs on the public sitemap/routes. No paid provider calls, no account changes, no outreach. The existing opt-in analytics path helper (`src/lib/analytics.ts`, public-path allowlist) and private-route exclusions (`robots.ts` `/api/private/`, merchant/private routes) are untouched.

## Limitations

- Host limitation: Turbopack dev cannot load the externalized `pg` driver from this hoisted node_modules (`Failed to load external module pg-<hash>` on every DB-backed route); the harness therefore boots `next dev --webpack` by default (`NEXT_DEV_ARGS` overrides). Reproduced in the root checkout too; runtime-verification tracks it.
- Local catalogue is 1108 businesses, production declares 1202 sitemap URLs (1200 profiles). The preservation claim rests on: untouched `sitemap.ts`, identical local sitemap output before/after the change, and the production declared-URL inventory snapshot; no local count is presented as a production fact.
- The HTTP regression runs in dev mode; `next build`/standalone output and `pnpm lint`/`vitest` were not run here (main-agent/closure checks).
- The directory page’s marketing title currently states “1,199+” while the local catalogue has 1108 rows — static copy outside #3 scope, recorded as an observation only.

## Shared-contract note (not implemented)

`siteBaseUrl()` (trailing-slash-normalized public origin) now exists in three places (`app/layout.tsx`, `b/[slug]/page.tsx`, `escribir-opinion/[slug]/page.tsx`) plus the `sitemap.ts`/`robots.ts` variants. A shared origin/canonical helper would be the natural cross-cutting contract, but per the ticket guidance no speculative global identity abstraction was added; flagging for the director instead.
