# Issue #11 — route-appropriate referrer and framing policies

Finding: **JEV-019** (`rule/security/low`) — "Missing on the homepage response: referrer-policy, x-frame-options or CSP frame-ancestors".
Branch: `fix/opinio-seo-issue-11`, base `fefc090`. Evidence runtime: **local isolated runtime, not published/released**
(`next dev --webpack` on `127.0.0.1:3211` and the built standalone server from the same tree, DB `opinio_issue_11`).

## 1. Conventions inspected before choosing headers

| Surface | What the repo already does | Source |
| --- | --- | --- |
| Config | `next.config.ts` holds only `output: "standalone"` + `distDir`; **no response-header convention exists yet** | `next.config.ts` |
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
  opt-in analytics and its private-route exclusions. It matches modern browser defaults, i.e. it is explicit rather than behavioural change.
- Ordering (later rule wins for a repeated key) follows the installed Next.js 16.3.4 docs (`headers.md`) and the shipped
  implementation (`dist/server/lib/router-utils/resolve-routes.js`: `resHeaders[key] = value` per matched route), and is visible
  in the built manifest.

`scripts/verify-security-headers.mjs` — dependency-free regression check on **real responses** (`--embed` adds the real
cross-origin browser/DOM check through external Playwright, same convention as `scripts/ui-qa.mjs`).

## 3. Evidence (actual responses, two local origins)

Origins: app `http://127.0.0.1:3211` vs host page `http://localhost:3291` (different host string **and** port = genuine cross-origin).
Token: `wgt_mercado-libre_ribbon_2026` (widget row for a real catalogue business; no invented reviews/cases).

### Before (baseline config, `next dev --webpack`, port 3211)

```
0/24 assertions passed
FRAME widget -> /widget/ribbon/wgt_mercado-libre_ribbon_2026 | handle: yes | text: "… Opinio | Excelente 5.0/5 | 50+ reseñas verificadas"
FRAME app    -> /merchant                                     | handle: yes | text: "Saltar al contenido opinio.mx Para negocios Negocio seleccionado Mercado Libre Amazon Walm"
REFERER app_top_level: http://127.0.0.1:3211/
REFERER widget_frame: http://127.0.0.1:3211/
FAIL sensitive app frame refused cross-origin: false (expected true)
FAIL browser CSP frame-ancestors violation logged: false (expected true)
FAIL embedded widget sent Referer: http://127.0.0.1:3211/ (expected null)
```

Every response lacked both headers, and the cross-origin host page rendered the **merchant console inside its own frame** — the
clickjacking exposure the finding implies.

### After (dev, port 3211)

```
26/26 assertions passed            (also 24/24 before the form-surface route was added)
FRAME widget -> /widget/ribbon/wgt_mercado-libre_ribbon_2026 | handle: yes | text: "… Opinio | Excelente 5.0/5 | 50+ reseñas verificadas"
FRAME app    -> /merchant                                     | handle: yes | text: "127.0.0.1 refused to connect."
REFERER app_top_level: http://127.0.0.1:3211/      (origin only; probe was /verificar?folio=secret-probe-11&token=secret-probe-11)
REFERER widget_frame: (none sent)
CONSOLE Framing 'http://127.0.0.1:3211/' violates the following Content Security Policy directive: "frame-ancestors 'self'". The request has been blocked.
PASS cross-origin widget frame rendered: true
PASS sensitive app frame refused cross-origin: true
PASS browser CSP frame-ancestors violation logged: true
```

Header assertions cover `/`, `/directorio`, `/verificar`, `/caso/nuevo`, `/merchant`, `/merchant/widgets`, `/b/mercado-libre`,
`/escribir-opinion/mercado-libre`, all four `/widget/{badge,card,reassurance,ribbon}/<token>` and `/api/v1/widgets/<token>`.

### After (built standalone server from the same tree)

```
OPINIO_NEXT_DIST_DIR=.next-issue11prd node node_modules/next/dist/bin/next build --webpack
# then: NODE_ENV=production PORT=3211 node .next-issue11prd/standalone/server.js
26/26 assertions passed
RESULT: PASS   (same framing, referrer and public-form results as the dev run)
```

`routes-manifest.json` of the built output contains both rules in order (`/:path*` then `/widget/:path*`), so the policy is part
of the deployed artifact, not just the dev server.

Public form surfaces stayed usable in the hydrated DOM: `/caso/nuevo`, `/verificar`, `/escribir-opinion/mercado-libre` all
rendered their controls (`PASS … controls in DOM: true`).

### Reproduction

```bash
# dev
DATABASE_URL='postgres://opinio:opinio_local_dev@127.0.0.1:54732/opinio_issue_11' NEXT_TELEMETRY_DISABLED=1 \
  node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3211
# headers only
BASE_URL=http://127.0.0.1:3211 WIDGET_TOKEN=wgt_mercado-libre_ribbon_2026 SLUG=mercado-libre \
  node scripts/verify-security-headers.mjs
# headers + real cross-origin embedding/DOM (Playwright is external, like scripts/ui-qa.mjs)
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
- The application-surface referrer policy matches modern browser defaults, so the observable behaviour change vs baseline is the
  framing decision plus the widget referrer suppression; the app-tier value is made explicit for the audit.

No credentials, private analytics exports, paid calls, account changes or external outreach were involved.
Approved local agent config (`CLAUDE.md` modification, `docs/agents/*`) stays uncommitted and out of this branch's changes.
