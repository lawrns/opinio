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

Measured against the production database (read-only aggregates only, no writes, no row
contents):

| Probe | Observed |
| --- | --- |
| `SELECT 1` round trip | **161 ms** |
| `SELECT count(*) FROM businesses` | **1200** (13 claimed) |
| `SELECT count(*) FROM resolution_cases` | 68 (1188 businesses have none) |
| table/column checks used by the merchant route | all present (`resolution_cases` joins, columns, no NULLs in any merchant-rendered business/case column) |
| `SHOW statement_timeout` | `0` → no server-side timeout, so the failure is client-side |

Predicted queue drain for one layout render: `1200 / 15 × 161 ms ≈ 12.9 s`, far beyond the
5 s pool budget; the checkouts that wait longer than 5 s are rejected. Production matches
that signature: `/merchant` returned 500 at 5.96–9.66 s TTFB (5 samples, digests
`24066231`, `1912937748`, `780135961`, `2381235194`, `879005785` — the failing checkout
differs per request), and **every** `/merchant/*` route failed at 6.3–6.7 s
(`/merchant/reviews`, `/merchant/inbox`, `/merchant/settings`, `/merchant/widgets`,
`/merchant/insights`, `/merchant/requests`, `/merchant/integrations`), while single-query
public routes stayed up (`/` 200, `/directorio` 200, `/b/luuna` 200).

Reproduced locally on the base commit with representative database latency
(80 ms per TCP chunk in front of the isolated local Postgres, i.e. ≈ the measured
production round trip):

```
GET /merchant   status=500   ttfb=6.386s   (base commit, dev --webpack, latency proxy)
```

## Changes

| File | Change |
| --- | --- |
| `src/lib/merchant-data.ts` | Added `getMerchantCasesForBusinesses(businessIds)` — one batched `resolution_cases` query (`= ANY($1::int[])`) plus one batched `case_messages` query. Row mapping and the per-case message fan-out are now shared helpers (`mapCaseRow`, `getCaseMessagesByCaseIds`), so `getMerchantCases(businessId)` keeps its signature, filters, ordering and output while its own message loading also drops from one query per case to one query per call. |
| `src/app/merchant/layout.tsx` | Layout now calls `getMerchantCasesForBusinesses(allBusinesses.map((b) => b.id))` instead of `Promise.all` over `getMerchantCases`. Layouts cannot read `?business=` (only pages can), so the batched call is what keeps the existing "cases of every listed business" contract without one query per business. Selection, sidebar, header and notification behaviour are unchanged. |
| `src/lib/merchant-data.test.ts` (new) | Regression for the failure mechanism: loading case data for every business must keep a **constant** statement count (measured through the real pool) and match the single-business loader's shape. Skipped when `DATABASE_URL` is absent, so `pnpm test` stays runnable without a database. |
| `docs/seo-remediation/issue-2.md` (new) | This evidence note. |

No fake data, no generic success page, no redirect, no change to public metadata,
directory, passport or analytics/private-route exclusions (the exclusion of `/merchant`
and `/merchant/*` from analytics is unchanged and still covered by
`src/lib/analytics.test.ts`).

## Verification (observed)

Runtime: isolated local Postgres (shared read-only catalogue of 1108 real
PROFECO-derived businesses + private write-capable `opinio_issue_2`, both on
`127.0.0.1:54732`; local, non-production). Dev mode must use `--webpack` on this host
(see limitations). Latency proxy: local TCP forwarder with a per-chunk delay, admin on
`127.0.0.1:54734` (harness lives outside the repo, `C:/Users/isaac/tmp/opinio-remediation/issue-2/pg-latency-proxy.mjs`).

1. **HTTP, red → green at the same seam and the same latency (80 ms/chunk ≈ production 161 ms RTT)**

   | Request | Base commit (pre-fix) | This branch (post-fix) |
   | --- | --- | --- |
   | `GET /merchant` | 500 @ 6.386 s | **200 @ 0.475 s** |
   | `GET /merchant?business=amazon` | 500 | **200 @ 0.462 s** |
   | `GET /merchant/reviews?business=amazon` | 500 | **200 @ 2.518 s** |
   | `GET /merchant/inbox?business=amazon` | 500 | **200 @ 0.801 s** |

   ```
   DATABASE_URL=postgres://…@127.0.0.1:54733/opinio_issue_2 NEXT_TELEMETRY_DISABLED=1 \
     node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3202
   curl -s -o /dev/null -w '%{http_code} %{time_starttransfer}s\n' http://127.0.0.1:3202/merchant
   ```

2. **Database work per page view, counted server-side** (`log_statement=all` on the private
   database, statement deltas around a single request):

   | Request | Base commit | This branch |
   | --- | --- | --- |
   | statements | **1110** (1109 `resolution_cases`, 2 businesses list, 1 reviews) | **5** (2 `resolution_cases`, 2 businesses list, 1 reviews; message query skipped when no cases exist) |
   | client→server bytes (proxy) | 586 034 (successful render), 204 681 (the failing 500) | 8 196 |

3. **DOM / navigation / selection, production-like latency active** (Playwright +
   system Chrome against `http://127.0.0.1:3202`):

   - `GET /merchant` → 200, `h1` "Panel de Control Comercial", business selector
     `#merchant-business` has 1108 real options, selected `mercado-libre`, header shows
     "Mercado Libre", sidebar links `/merchant/reviews?business=mercado-libre`,
     `/merchant/inbox?business=mercado-libre`, passport link `/b/mercado-libre`.
   - Selecting `amazon` in the real control → client navigation to
     `/merchant?business=amazon`, header "Amazon", all links repointed to `business=amazon`.
   - Clicking the sidebar link → `/merchant/reviews?business=amazon`, screen title
     "Opiniones de clientes", header still "Amazon".
   - Deep link `/merchant?business=liverpool` → 200, "Liverpool" selected.
   - `/merchant?business=no-such-business` → 200 with the pre-existing fallback to the
     first listed business (`allBusinesses[0]`).
   - No page errors in any navigation.

4. **Production-mode build under the same latency** (`OPINIO_NEXT_DIST_DIR=.next-issue2prd`
   throwaway dist dir, `next build --webpack`, then
   `PORT=3225 node .next-issue2prd/standalone/server.js`):
   `/merchant` 200 (1.64 s cold / 0.41 s warm), `/merchant?business=amazon` 200,
   `/merchant/reviews?business=amazon` 200, `/directorio` 200.

5. **Regression test, red → green** (`DATABASE_URL=… node node_modules/vitest/vitest.mjs run src/lib/merchant-data.test.ts`):
   pre-fix fan-out placed back behind the same seam →
   `AssertionError: expected 1108 to be 5` (1108 statements for 1108 businesses vs 5 for
   a 5-business sample); with this branch → `2 passed`. Without `DATABASE_URL` the suite
   skips the file, so `pnpm test` still runs without a database.

6. **Behaviour equivalence with real case rows** (temporary check, local verification rows
   with `TMP-ISSUE2-` markers created and deleted inside the run, pre/post counts
   asserted, nothing left behind): the batched loader returned JSON-identical objects to
   `getMerchantCases` per business, including the joined `review` mapping and ordered
   `messages`.

Local integration branch verified; not published or released.

## Limits and notes

- The production failure was diagnosed from public read-only HTTP probes plus read-only
  aggregates (counts, NULL checks, column inventory, `SHOW statement_timeout`) against the
  production database. No production logs were accessible, so the production error text
  itself is not quoted; the identification rests on the mechanism, the pool budget, the
  measured latency/business count and the matching failure signature. Nothing in
  production was written, deployed or reconfigured.
- Local data is the 1108-business catalogue (no seeded reviews/cases); three reviews and
  two cases were created only for the equivalence run above and deleted in the same run.
  Local row counts are never production figures (production: 1200 businesses, 419 reviews,
  68 cases).
- Host limitation, unrelated to this defect: default `next dev` (Turbopack) cannot load
  the externalised `pg` driver in these worktrees because Turbopack aliases it through a
  reparse point and this sandbox filesystem refuses reparse-point traversal
  (`ERROR 448 untrusted mount point`). `--webpack` is used for all runs above; the
  production build was verified with `next build --webpack` + standalone server.
- Out of scope here: the layout still lists every business to the client (the sidebar
  `<select>`), which the audit separately flags as document/latency weight (JEV-012/
  JEV-028); this ticket only removes the per-business query fan-out that caused the HTTP
  500, without changing the selection surface.
