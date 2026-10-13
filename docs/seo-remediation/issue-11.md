# Issue #11 — route-appropriate referrer and framing policies

Finding: **JEV-019** (`rule/security/low`) — "Missing on the homepage response: referrer-policy, x-frame-options or CSP frame-ancestors".
Branch: `fix/opinio-seo-issue-11`, base `fefc090`. Evidence runtime: **local isolated runtime, not published/released**
(`next dev --webpack` on `127.0.0.1:3211` and the built standalone server from the same tree, DB `opinio_issue_11`).

## 1. Conventions inspected before choosing headers

| Surface | What the repo already does | Source |
| --- | --- | --- |
| Config | `next.config.ts` holds only `output: "standalone"` + `distDir` (both baseline, unchanged); **no response-header convention exists yet** | `next.config.ts` |
| Proxy | `src/proxy.ts` exists but is explicitly disabled (matcher `['/disabled']`) and would be a per-request layer | `src/proxy.ts` |
| Deployment | Docker standalone (`node server.js`, `PORT=3000`); `headers()` lands in the built `routes-manifest.json`, i.e. it ships with the deployed artifact | `Dockerfile`, `.next-issue11prd/routes-manifest.json` |
| Widgets are embeddable by design | Merchant customizer hands out `<iframe src="https://opinio.mx/widget/…">` snippets for third-party sites; spec calls `/widget/ribbon/[token]` the "Hosted iframe/surface" | `src/components/WidgetsCustomizer.tsx`, `docs/specs/opinio-prestige-widgets.md` |
| Analytics must keep working | GA4 is opt-in (consent-gated) and only fires on public paths; `page_referrer` comes from `document.referrer` reduced to an origin | `src/components/Analytics.tsx`, `src/lib/analytics.ts` |
| Widget API CORS | `/api/v1/widgets/[token]` already sends `Access-Control-Allow-Origin: *` (CORS for XHR, unrelated to framing) | `src/app/api/v1/widgets/[token]/route.ts` |

Route classification derived from the above: `/widget/*` = embeddable documents; every other route (`/`, `/directorio`, `/verificar`,
`/caso/*`, `/b/*`, `/escribir-opinion/*`, `/merchant/*`, `/api/*`) = application surfaces that no third party may frame.

## 2. Change

`next.config.ts` — declarative route-scoped rules (no script/`default-src` CSP, so no policy scope creep; no `X-Frame-Options`,
so the framing policy is not stated twice):

| Source | `Content-Security-Policy` | `Referrer-Policy` |
| --- | --- | --- |
| `/:path*` | `frame-ancestors 'self'` | `strict-origin-when-cross-origin` |
| `/widget/:path*` (listed last, wins for the same key) | `frame-ancestors *` | `no-referrer` |

Why these values:

- `frame-ancestors 'self'` protects application surfaces (merchant console, case portal, forms, APIs) from cross-origin framing
  while keeping same-origin previews (merchant widget preview) working. No blanket `'none'`, so widgets are unaffected.
- `/widget/*` must stay frameable from merchant sites (`frame-ancestors *`), and `no-referrer` stops an embedded widget from
  forwarding the host page's URL/token-bearing origin to third parties. Widget pages are excluded from the public analytics
  paths, so no analytics behaviour depends on their referrer.
- `strict-origin-when-cross-origin` on application surfaces keeps cross-origin `Referer` at origin level only (no path/query,
  so case ids, folios and tokens cannot leak) while leaving same-origin referrer resolution untouched — required for the existing
  opt-in analytics and its private-route exclusions.
- Ordering (later rule wins for a repeated key) follows the installed Next.js 16.3.4 docs (`headers.md`) and the shipped
  implementation (`dist/server/lib/router-utils/resolve-routes.js`: `resHeaders[key] = value` per matched route), and is visible
  in the built manifest.

`scripts/verify-security-headers.mjs` — dependency-free regression check on **real responses**; `--embed` adds the real
cross-origin browser check through external Playwright (same convention as `scripts/ui-qa.mjs`) against a host page served from a
second local origin (`localhost:3291`).

Assertion design notes (so the checks can actually fail):

- Referrer probes are only accepted when the local embedder **observed** them: each probe fetch returns its own error instead of
  swallowing it, and the run asserts `observed by embedder: true` plus `probe error: null` before comparing referrer values, so a
  probe that never happened fails loudly instead of passing on a `null` expectation.
- The embedded widget must be a genuine widget document: response status `200`, passport link to `/b/<slug>`, brand surface matching
  the public business API (`/api/v1/businesses/<slug>` → `business.brand_name`), the frame URL still carrying the requested token,
  and rendered content that is not a browser error page. No review copy is pinned. This matters because an over-blocking policy can
  still answer `200` while the browser refuses to render (see the mutation run below).
- Form usage is *not* asserted here: controls merely being present is a wiring-level signal and working public forms are verified by
  real journeys in #7.

## 3. Evidence (actual responses, two local origins)

Origins: app `http://127.0.0.1:3211` vs host page `http://localhost:3291` (different host string **and** port = genuine cross-origin).
Token: `wgt_mercado-libre_ribbon_2026` (widget row for a real catalogue business; no invented reviews/cases).
Counts: 26 header assertions + 13 browser assertions = 39.

### Before (config reverted to base `fefc090`, `next dev --webpack`)

```
0/26 assertions passed                     (every route missing both headers, incl. /widget/*)
FRAME widget -> /widget/ribbon/wgt_mercado-libre_ribbon_2026 | text: "… Opinio | Excelente 5.0/5 | 50+ reseñas verificadas"
FRAME app    -> /merchant  | text: "Saltar al contenido opinio.mx Para negocios Negocio seleccionado Mercado Libre Amazon Walm"
REFERER app_top_level: http://127.0.0.1:3211/ | observed by embedder: true
REFERER widget_frame: http://127.0.0.1:3211/  | observed by embedder: true
FAIL sensitive app frame refused cross-origin: false (expected true)
FAIL browser CSP frame-ancestors violation logged: false (expected true)
FAIL embedded widget sent Referer: http://127.0.0.1:3211/ (expected null)
RESULT: FAIL      (29 of 39 assertions failed)
```

The cross-origin host page rendered the **merchant console inside its own frame** — the clickjacking exposure the finding implies.

### After (dev and built standalone)

```
26/26 header assertions passed
WIDGET document status: 200 | passport link: /b/mercado-libre
WIDGET public brand_name (mercado-libre): "Mercado Libre"
WIDGET surface label: "Perfil de Mercado Libre en Opinio México: Calificación Excelente 5.0 de 5 estrellas"
FRAME app -> /merchant | text: "127.0.0.1 refused to connect."
REFERER app_top_level: http://127.0.0.1:3211/ | observed by embedder: true   (probe from /verificar?folio=secret-probe-11&token=…)
REFERER widget_frame: (none sent)            | observed by embedder: true
CONSOLE Framing 'http://127.0.0.1:3211/' violates the following Content Security Policy directive: "frame-ancestors 'self'". The request has been blocked.
PASS widget document response status: 200
PASS widget passport link slug: mercado-libre
PASS widget surface brand matches public business API: true
PASS widget frame url carries the requested token: true
PASS widget surface rendered (not a browser error page): true
PASS sensitive app frame refused cross-origin: true
PASS browser CSP frame-ancestors violation logged: true
PASS app/widget probe requests observed, no probe errors, referrer scope as expected
RESULT: PASS      (39 of 39 assertions passed)
```

Header assertions cover `/`, `/directorio`, `/verificar`, `/caso/nuevo`, `/merchant`, `/merchant/widgets`, `/b/mercado-libre`,
`/escribir-opinion/mercado-libre`, all four `/widget/{badge,card,reassurance,ribbon}/<token>` and `/api/v1/widgets/<token>`.

The built-artifact run uses the standalone server of this tree:

```
OPINIO_NEXT_DIST_DIR=.next-issue11prd node node_modules/next/dist/bin/next build --webpack   # OK
NODE_ENV=production PORT=3211 node .next-issue11prd/standalone/server.js                     # same 39/39, RESULT: PASS
```

`routes-manifest.json` of that build carries both rules in order (`/:path*` then `/widget/:path*`), so the policy is part of the
deployed artifact, not just the dev server.

### Mutation run: the widget assertions catch an embedding-breaking policy

With the widget rule temporarily changed to `frame-ancestors 'self'` (i.e. an over-blocking ban), while the app rules stayed correct:

```
22/26 assertions passed
PASS widget document response status: 200        <- a bare status check would have missed this
FAIL widget passport link slug: null (expected mercado-libre)
FAIL widget surface brand matches public business API: false (expected true)
FAIL widget frame url carries the requested token: false (expected true)
FAIL widget surface rendered (not a browser error page): false (expected true)
PASS sensitive app frame refused cross-origin: true
RESULT: FAIL
```

The mutation was reverted before committing; `next.config.ts` in the branch equals the committed policy.

### Incidental observation (not part of the committed script)

While drafting, a throwaway probe counted form controls in the hydrated DOM for `/caso/nuevo`, `/verificar` and
`/escribir-opinion/mercado-libre`; all three rendered them. That signal is wiring-level and was removed from the script — working
public forms are verified by #7's real journeys, not here.

### Reproduction

```bash
# dev
# local throwaway container credentials live only in the external runtime.md (non-publishable)
DATABASE_URL='postgres://…@127.0.0.1:54732/opinio_issue_11' NEXT_TELEMETRY_DISABLED=1 \
  node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3211
# headers only
BASE_URL=http://127.0.0.1:3211 WIDGET_TOKEN=wgt_mercado-libre_ribbon_2026 SLUG=mercado-libre \
  node scripts/verify-security-headers.mjs
# headers + real cross-origin framing, referrer and widget surface (Playwright is external, like scripts/ui-qa.mjs)
BASE_URL=http://127.0.0.1:3211 WIDGET_TOKEN=wgt_mercado-libre_ribbon_2026 SLUG=mercado-libre \
QA_DEPENDENCIES=C:/Users/isaac/AppData/Roaming/npm/node_modules \
CHROME_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe' \
  node scripts/verify-security-headers.mjs --embed
```

## 4. Limitations

- Local isolated runtime only ("local integration branch verified; not published/released"); no production/CDN response was observed,
  and a CDN in front of the app could rewrite/serve headers independently.
- `--webpack` is required on this host because Turbopack dev cannot resolve the `pg` external (reparse-point/ERROR 448 host issue,
  documented in `C:/Users/isaac/tmp/opinio-remediation/runtime.md` §7); that is an environment defect, not repo behaviour.
- `/widget/*` stays deliberately embeddable from *any* origin: the repo has no merchant-domain allowlist, and widget tokens are the
  capability. Tightening it later would need a token→allowed-ancestors design, out of scope here.
- `document.referrer` *inside* a widget frame is inherited from the host page (observed `http://localhost:3291/`); a framed document's
  own `Referrer-Policy` governs the requests it makes (probe: no `Referer` sent), not that inherited value.
- The application-surface referrer policy matches modern browser defaults, so the observable behaviour change vs base is the framing
  decision plus the widget referrer suppression; the app-tier value is made explicit for the audit.
- In the over-blocking mutation run, Chrome still requested the widget document (`200`) and the frame's script even ran the referrer
  probe while displaying the refusal; the consumer-visible guarantee verified here is that the app surface is not rendered/framed,
  which the DOM-level assertions (and the CSP violation) establish. A stricter `connect-src`/`frame-ancestors` enforcement story for
  already-executing subframes is out of scope.
- Widget surface text quoted above (`Excelente 5.0/5`, `50+ reseñas verificadas`) is the existing widget renderer's default
  formatting: the local DB has **0 reviews**, so it is embedding evidence only and makes no rating/review-volume claim. Anything
  about review substance belongs to the tickets that own review data.

No credentials, private analytics exports, paid calls, account changes or external outreach were involved.
Approved local agent config (`CLAUDE.md` modification, `docs/agents/*`) stays uncommitted and out of this branch's changes.
