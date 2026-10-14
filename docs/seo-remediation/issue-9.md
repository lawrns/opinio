# Issue #9 — Stabilize public image layout and loading behavior (JEV-021)

Status: implemented on `fix/opinio-seo-issue-9` (base `fefc090`, integration branch
`fix/opinio-seo-remediation`). Evidence is local-only: **local integration branch verified;
not published/released**. No field CLS is claimed — field data was absent in the audit and the
measurements below are lab observations on the isolated local runtime.

## 1. What the rendered evidence showed (before the change)

Verified against the actual rendered containers at commit `fefc090`, dev server on
`http://127.0.0.1:3209`, isolated catalogue DB, Playwright 1.59.1 driving system Chrome
154 at `1440×1000` (desktop) and `390×844` (mobile):

- `/directorio` renders 1108 `<img>` elements (one per catalogue business; `/` renders 0 today
  because the hero receives no business, and a passport renders 1). So the crawl finding is real
  at the attribute level: the `img` had no `width`, `height`, `loading` or `decoding` attributes.
- The `img` sits inside a `span` with a fixed `sizeClass` (`size-10` directory, `size-14 sm:size-16`
  passport). That container does reserve the tile, and no image-sourced layout-shift entries were
  observed: with logo requests blocked and then replayed in place, layout-shift entries sourced
  from logo images were **0** before the change (directory total shift value 0.0011 desktop /
  0.0001 mobile came from category chips; passport 0.027 desktop / 0.137 mobile came from text
  blocks). Missing size attributes alone are therefore *not* a proven shift in this lab.
- The image element itself reserved **no space**: while its request was blocked it measured
  `0×0` and became `31.16×31.16` on load (passport `50.83×50.83` desktop / `44.27×44.27` mobile).
- Loading behavior was wrong for the catalogue: all **1108** images were requested while sitting at
  scroll top (desktop: 1040 of them further than 3000 px down the document; mobile: 1095), because
  the plain `img` default is eager.

Disposition: confirmed defect in **reserved image box + loading behavior**, not in field CLS. The
change below fixes both without touching the containers or the painted logo geometry.

## 2. Change

| File | Change |
| --- | --- |
| `src/components/BrandLogo.tsx` | The `img` now occupies a stable proportional box (`h-[82%] w-[82%]` — same 82 % inset as before, inside the unchanged fixed-size parent) and uses `object-scale-down` so assets keep their aspect ratio and are never upscaled. Adds `loading={priority ? 'eager' : 'lazy'}`, `decoding="async"`, `fetchPriority={priority ? 'high' : undefined}` and the optional `priority?: boolean` prop (default `false`). |
| `src/app/b/[slug]/page.tsx` | Single hunk, passport `h1` instance only: `priority` (the identity image is in the first viewport at both tested viewports; measurement: request starts 4 ms after `responseStart`). |
| `scripts/seo-image-layout-check.mjs` | New deterministic, read-only browser regression (Playwright must be installed outside the app, same convention as `scripts/ui-qa.mjs`). |
| `docs/seo-remediation/issue-9.md` | This record. |

Not changed (verified): directory page and `/verificar` (shared seam covers them, default lazy),
passport body content, `src/components/home/TrustGraphHero.tsx` and `BusinessCard.tsx` (home renders
no image today — `TrustGraphHero` is used without a `business`; `BusinessCard` has no call site).

## 3. Before → after measurements (same runtime, same catalogue, same viewports)

| Observation | Before (`fefc090`) | After (this branch) |
| --- | --- | --- |
| Directory image requests at scroll top | 1108 (desktop) / 1108 (mobile) | 48 (desktop) / 6 (mobile) |
| Offscreen (> 3000 px) images fetched at scroll top | 1040 (desktop) / 1095 (mobile) | 0 / 0 |
| Directory `img` box while request blocked | 0×0 (no reserved space) | 31.16×31.16 (reserved) |
| `loading` / `decoding` attributes (directory) | none / none | `lazy` / `async` on all 1108 |
| Passport `h1` logo | no attributes (eager by default) | `eager`, `async`, DOM `fetchpriority="high"` |
| Painted logo geometry, pre vs post | — | fingerprints `fp-before/*` vs `fp-after2/*`, 1107 images compared per device: max delta 0.07 px (one 7.48:1 logo, sub-pixel snap), 0 images changed by ≥ 0.5 px; painted-vs-natural deviation ≤ 0.008 (rounding). A measured bound on this runtime, not a universal equality |
| Logo-sourced layout-shift entries (blocked → loaded replay) | 0 | 0 |
| Card screenshots (`99minutos` 256×256, `bestday` 16×16, `genesys` 1915×256), desktop + mobile | `before-cards/*` | identical sha256 in the shipped revision `after/*` and `final-harness/*` (desktop `054051114064d6e9`, `c0f6a87eeae2ca89`, `db0339b5603c52a9`; mobile `ff079592fce0764d`, `726e5eccb8cb28b5`, `11e5d536fe656237`) |
| Directory viewport capture (`/directorio`), desktop | `before/*` | identical in `after/*` and `final-harness/*` (`3d4668b42a5573be` in all three families) |
| Passport viewport capture, desktop | `before/*` (`/b/mercado-libre`) | identical in `after/*` (`9c553e9cb703069d`, before vs after only); `final-harness/*` captured different passport routes (`/b/99minutos`, `/b/abba-joyas`), so the same-route comparison was not assessed there |

Screenshot families and their caveats:

- Compared families are the retained captures `before-cards/*` and `before/*` (pre-fix `fefc090`),
  `after/*` and `final-harness/*` (shipped revision: stable box + `object-scale-down`), plus the
  fingerprint JSON `fp-before/*` vs `fp-after2/*`. Route sets differ between families: `before/*`
  and `after/*` sampled `/b/mercado-libre`, while `final-harness/*` sampled `/b/99minutos` and
  `/b/abba-joyas`; captures are compared only where a same-route counterpart exists.
- The superseded intermediate revision (`after-cards/*`, `object-contain`, which upscaled the
  16×16/30×30 sources) is retained as-is and is *not* the shipped revision: there `bestday` differs
  (`8c8295d5c55f23e5` desktop, `d90998754e6a07a1` mobile) while `99minutos` and `genesys` match.
  Its fingerprints (`fp-after/*`) show the same: `bestday` painted `31.16×31.16` vs `16×16` before;
  in the shipped revision `fp-after2/*` has box `31.16×31.16` but painted `16×16`.
- Captures are dev-mode renders on one Chrome build; sub-pixel geometry can differ without changing
  a capture (the 0.07 px case above). Pixel identity is claimed only for the compared capture
  families and hashes listed here, not as a universal guarantee.

Notes: the five smallest sources (16×16 and 30×30 logos) are deliberately *not* upscaled —
`object-scale-down` reproduces the previous painted size exactly. `fetchpriority` is present in the
DOM as `fetchpriority="high"` (React serializes `fetchPriority`; the HTML parser lowercases it).

Route sweep after the change (all `200`): `/`, `/directorio`, `/verificar`, `/b/mercado-libre`,
`/b/amazon`, `/escribir-opinion/mercado-libre`, `/caso/nuevo`, `/widget/badge/wgt_mercado-libre_badge_2026`,
`/robots.txt`, `/sitemap.xml`.

## 4. Re-running the regression

```bash
# in the issue-9 worktree, with the isolated runtime (see opinio-remediation/runtime.md)
# DATABASE_URL below is redacted to the uniform postgres://…@ form; use the local runtime
# credential from runtime.md (isolated container, not reusable elsewhere)
DATABASE_URL='postgres://…@127.0.0.1:54732/opinio_issue_9' \
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3209

npm install --prefix /tmp/opinio-qa playwright           # once, outside the app
BASE_URL=http://127.0.0.1:3209 \
CHECK_DEPENDENCIES=/tmp/opinio-qa/node_modules \
CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe' \
CHECK_ELEMENT_SCREENSHOTS=/logos/99minutos.png,/logos/bestday.png,/logos/genesys.png \
node scripts/seo-image-layout-check.mjs
```

The script blocks logo requests, measures the rendered box, replays the loads in place, and fails on
consumer-visible regressions only: a logo image reserves no box while its request is blocked, its
box or its container moves between the blocked and loaded states, a blocked-state image is missing
after the replay (render-transition protection), a painted logo leaves the existing container
inset, an offscreen (> 3000 px) logo is fetched while at scroll top, an in-viewport logo is still
not loaded when observed, or a layout-shift entry is sourced from a logo image. Attribute values
(`loading`, `decoding`, `fetchpriority`), painted-size statistics, LCP/request timing and shift
entries are recorded as observations, not gates: missing `width`/`height` attributes are never
treated as a shift by themselves, and no per-attribute default is pinned.

Observed runs:

- This branch, `3209`, desktop + mobile, routes `/`, `/directorio`, `/b/99minutos`, `/b/abba-joyas`:
  exit 0, 0 findings (`visibleNotLoaded=0`, `offscreenFetched=0`, `logoShifts=0`).
- Unmodified baseline `fefc090` (runtime-verification reference instance on `3214`, read-only
  catalogue), desktop, `/directorio` + `/b/mercado-libre`: exit 1, 2218 findings — 1109 images
  reserving no box while blocked (1108 in `/directorio`, 1 in `/b/mercado-libre`), 1108 boxes
  moving between the blocked and loaded states (1107 directory + 1 passport), and 1040 offscreen
  directory images fetched at scroll top. Log:
  `C:/Users/isaac/tmp/opinio-evidence-9/red-baseline.log`; green log:
  `final-harness.log`; before/after card screenshots and fingerprints under the same directory.

## 5. Limits

- Lab evidence from one machine and one Chrome version (154), dev server (webpack), a 1108-row
  local catalogue (production sitemap scope is ~1202 URLs — the two counts are unrelated). No
  production/field CLS claim, and no Lighthouse/field comparison was run by this ticket.
- The blocked→loaded replay is synthetic (request blocking via CDP), which is what makes it
  deterministic; it exercises real rendering, not a mock DOM.
- `Resource Timing` buffers cap at 250 entries, so request counts reported here come from the
  browser request log, not only `performance.getEntriesByType`.
- `fetchpriority` is verified in the DOM/runtime; the consumer-visible benefit (above-fold identity
  image not deferred) is not a field metric.
