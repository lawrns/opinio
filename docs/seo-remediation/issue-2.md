# Issue #2 — Restore the merchant entry and dashboard flow

Branch: `fix/opinio-seo-issue-2` (base integration branch `fix/opinio-seo-remediation` @ `fefc09028acc1ca94eddf5decc15459c46a7e614`).
Worktree: `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-2`. Findings: JEV-001/JEV-003 (one destination defect).

## Root cause

Every `/merchant/*` route shares `src/app/merchant/layout.tsx`. The layout listed all
businesses and then asked for each one's resolution cases:

```ts
const cases = (await Promise.all(allBusinesses.map((b) => getMerchantCases(b.id)))).flat();
```

One page view therefore issued **one `resolution_cases` query per business**, each query
running on a client checked out of the shared pool in `src/lib/db.ts`
(`max: 15`, `connectionTimeoutMillis: 5000`). `pg-pool` applies `connectionTimeoutMillis`
to *queued* checkouts as well (`node_modules/pg-pool/index.js`: `setTimeout(… 'timeout
exceeded when trying to connect')`), so once the queue outlives the budget the whole
`Promise.all` rejects and the route answers HTTP 500.

**The production failure itself is [INFERENCE]** — it was diagnosed without production
logs. What is measured is the mechanism and its boundary conditions (read-only aggregates
against the production database) plus a locally **confirmed failure** at the same seam,
with the same pool budget:

| Probe (production, read-only) | Observed |
| --- | --- |
| `SELECT 1` round trip | **161 ms** |
| `SELECT count(*) FROM businesses` | **1200** (13 claimed) |
| `SELECT count(*) FROM resolution_cases` | 68 (1188 businesses have none) |
| table/column checks used by the merchant route | all present (columns exist, no NULLs in any merchant-rendered business/case column) |
| `SHOW statement_timeout` | `0` → no server-side timeout, so the failure is client-side |

Predicted queue drain for one layout render: `1200 / 15 × 161 ms ≈ 12.9 s`, far beyond the
5 s pool budget, so the checkouts that wait longer are rejected. Production matches that
signature (user/audit-reported ground truth, not re-confirmed here): `/merchant` returned
500 at 5.96–9.66 s TTFB with varying digests, and **every** `/merchant/*` route failed at
6.3–6.7 s (`/merchant/reviews`, `/merchant/inbox`, `/merchant/settings`,
`/merchant/widgets`, `/merchant/insights`, `/merchant/requests`, `/merchant/integrations`),
while single-query public routes stayed up (`/` 200, `/directorio` 200, `/b/luuna` 200).

Failure confirmed locally on the base commit by the committed regression harness, which
injects representative database latency (80 ms per TCP chunk ≈ the measured production
round trip): `0/9 checks passed`, every merchant request answering **500**.

## Changes

| File | Change |
| --- | --- |
| `src/lib/merchant-data.ts` | Added `getMerchantCasesForBusinesses(businessIds)` — one batched `resolution_cases` query (`= ANY($1::int[])`) plus one batched `case_messages` query. Row mapping and the per-case message fan-out are now shared helpers (`mapCaseRow`, `getCaseMessagesByCaseIds`), so `getMerchantCases(businessId)` keeps its signature, filters, ordering and output while its own message loading also drops from one query per case to one query per call. |
| `src/app/merchant/layout.tsx` | Layout now calls `getMerchantCasesForBusinesses(allBusinesses.map((b) => b.id))` instead of `Promise.all` over `getMerchantCases`. Layouts cannot read `?business=` (only pages can), so the batched call is what keeps the existing "cases of every listed business" contract without one query per business. Selection, sidebar, header and notification behaviour are unchanged. |
| `scripts/verify-merchant-flow.mjs` (new) | Route-level regression at the failure seam: boots `next dev` with a delay forwarder in front of the database and asserts the served HTML of the merchant entry, the explicit business selection, the reviews navigation and the unknown-selection fallback. Requires `DATABASE_URL` (exits 2 without it) and writes nothing. |
| `docs/seo-remediation/issue-2.md` (new) | This evidence note. |

No fake data, no generic success page, no redirect, no change to public metadata,
directory, passport or analytics/private-route exclusions (the exclusion of `/merchant`
and `/merchant/*` from analytics is unchanged and still covered by
`src/lib/analytics.test.ts`).

## Verification (observed)

Runtime: isolated local Postgres (shared read-only catalogue of 1108 real
PROFECO-derived businesses + private write-capable `opinio_issue_2`, both on
`127.0.0.1:54732`; local, non-production; no credentials in this note). Dev mode must use
`--webpack` on this host (see limits).

1. **Committed regression, red → green at the same seam** (same harness, same catalogue,
   same injected 80 ms/chunk latency; the red run uses the base layout restored into the
   worktree, the green run the fix; `layout.tsx` was reset to the committed revision
   afterwards — `git status` clean for that file):

   ```
   DATABASE_URL=postgres://…@127.0.0.1:54732/opinio_issue_2 node scripts/verify-merchant-flow.mjs
   ```

   | Run | Result |
   | --- | --- |
   | base layout (per-business fan-out) | `0/9 checks passed` — `GET /merchant → 500`, `GET /merchant?business=amazon → 500`, `GET /merchant/reviews?business=amazon → 500` |
   | this branch | `9/9 checks passed` |

   Green excerpts: `GET /merchant → 200`, `selected=mercado-libre (expected
   mercado-libre)`, `header="Mercado Libre"`, `reviews=mercado-libre,
   inbox=mercado-libre`, `GET /merchant?business=amazon → 200`, `selected=amazon,
   header="Amazon" (expected amazon/Amazon)`, `GET /merchant/reviews?business=amazon →
   200, selected=amazon, header="Amazon"`, unknown slug → `200`, `selected=mercado-libre`.

2. **Database work per page view, counted server-side** (`log_statement=all` on the private
   database, statement deltas around a single request; both the parameterized and the
   simple protocol statements are counted):

   | Request | Base layout | This branch |
   | --- | --- | --- |
   | statements per `GET /merchant` | **1112** = 1109 `resolution_cases` + 2 businesses list + 1 reviews | **5** = 2 `resolution_cases` + 2 businesses list + 1 reviews (the batched message query is skipped when a page has no cases) |

3. **DOM / navigation / selection, production-like latency active** (Playwright + system
   Chrome against the dev server, `http://127.0.0.1:3202`):

   - `GET /merchant` → 200, `h1` "Panel de Control Comercial", business selector
     `#merchant-business` has 1108 real options, selected `mercado-libre`, header shows
     "Mercado Libre", sidebar links `/merchant/reviews?business=mercado-libre`,
     `/merchant/inbox?business=mercado-libre`, passport link `/b/mercado-libre`.
   - Selecting `amazon` in the real control → client navigation to
     `/merchant?business=amazon`, header "Amazon", all links repointed to `business=amazon`,
     passport link `/b/amazon`.
   - Clicking the sidebar link → `/merchant/reviews?business=amazon`, screen title
     "Opiniones de clientes", header still "Amazon".
   - Deep link `/merchant?business=liverpool` → 200, "Liverpool" selected.
   - `/merchant?business=no-such-business` → 200 with the pre-existing fallback to the
     first listed business (`allBusinesses[0]`).
   - No page errors in any navigation.

4. **Production-mode build under the same latency** (throwaway dist dir,
   `next build --webpack`, then `PORT=3225 node <distDir>/standalone/server.js`):
   `/merchant` 200 (1.64 s cold / 0.41 s warm), `/merchant?business=amazon` 200,
   `/merchant/reviews?business=amazon` 200, `/directorio` 200.

5. **Behaviour equivalence with real case rows** (temporary check, local verification rows
   with `TMP-ISSUE2-` markers created and deleted inside the run, pre/post counts
   asserted, nothing left behind): the batched loader returned JSON-identical objects to
   `getMerchantCases` per business, including the joined `review` mapping and ordered
   `messages`.

Local integration branch verified; not published or released.

## Limits and notes

- No production logs were accessible, so the production failure is an inference from the
  measured mechanism, the pool budget and the locally confirmed failure at the same seam;
  the production error text is not quoted. Nothing in production was written, deployed or
  reconfigured — read-only HTTP probes and read-only aggregates only.
- Local data is the 1108-business PROFECO catalogue (no seeded reviews/cases; production
  has 1200 businesses, 419 reviews, 68 cases — local counts are never production figures).
  Case-row behaviour was verified with temporary local rows deleted in the same run; the
  committed regression needs no fixtures.
- Host limitation, unrelated to this defect: default `next dev` (Turbopack) cannot load
  the externalised `pg` driver in these worktrees because Turbopack aliases it through a
  reparse point and this sandbox filesystem refuses reparse-point traversal
  (`ERROR 448 untrusted mount point`). All runs used `--webpack`
  (`NEXT_DEV_ARGS` can be emptied when Turbopack works in the target environment); the
  production build was verified with `next build --webpack` + standalone server.
- Out of scope here: the layout still lists every business to the client (the sidebar
  `<select>`), which the audit separately flags as document/latency weight (JEV-012/
  JEV-028); this ticket only removes the per-business query fan-out that caused the HTTP
  500, without changing the selection surface.

## Integration review corrections (orchestrator, after merge)

Applied at the integration head after the ticket branch was merged, as the final
integration-quality review of this ticket — no behaviour change to the fix itself:

1. `scripts/verify-merchant-flow.mjs` no longer asserts the incidental dashboard heading
   copy (`Panel de Control Comercial`) or carries its constant; the two screen checks are
   now status-only (`GET /merchant` and `GET /merchant?business=…` respond 200), while the
   real independent assertions stay: the business selected in the served selector, the
   brand inside the served header, and the sidebar navigation links carrying the selection.
2. The header brand is read from the `<header>` regions of the served HTML (every
   `<header>` block is inspected) instead of the first header or the whole body, so a
   selector option echoing the expected string cannot satisfy the check.
3. `getMerchantCases` and `getMerchantCasesForBusinesses` return the empty result
   (`res.rows`) before the `caseIds` projection and the message fan-out, which is the
   common local path when a business has no cases. `getMerchantBusinesses` already returns
   `res.rows` directly and needs no guard.

Check count after the corrections: 9 (unchanged; two checks were narrowed, none removed).
