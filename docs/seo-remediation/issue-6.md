# Issue #6 — Public passports substantiate verification claims

- Ticket: [lawrns/opinio#6](https://github.com/lawrns/opinio/issues/6) — `enhancement`, `ready-for-agent`
- Worker: `seo-6` · Branch `fix/opinio-seo-issue-6` · Worktree `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-6` · Base `fefc09028acc1ca94eddf5decc15459c46a7e614`
- Status: local integration branch verified; **not published/released**.
- Finding IDs: JEV-002, JEV-009, JEV-014, JEV-017, JEV-022.

## 1. Defect (read-only production evidence, captured 2026-10-13)

Public passports answered "is this merchant trustworthy?" with claims that the stored records did not
support. Captures of the live site (`production-baseline/prod_*.html` in the evidence bundle):

| Observed on | Rendered claim | What the data actually supports |
| --- | --- | --- |
| `https://opinio.mx/b/mercadolibre` | Dictamen: "respaldado por **cotejo de datos mercantiles y de dominio**" | `official_records` for the profile is empty |
| `https://opinio.mx/b/mercadolibre` | Micro-grid: "Resolución PROFECO: **Sin alertas**" | no cases exist; no PROFECO record exists; the case data is Opinio's, not PROFECO's |
| `https://opinio.mx/b/mercadolibre` | JSON-LD FAQ: "RFC **validado**", "no cuenta con **alertas críticas de fraude** en el monitoreo público" | no RFC, no fraud-monitoring record |
| `https://opinio.mx/b/luuna` | Micro-grid: "Estatus Fiscal: **RFC Validado**" | derived only from `businesses.rfc IS NOT NULL`, independent of identity verification |
| `https://opinio.mx/b/luuna` | "Nivel de Confianza: **transparent_coverage**" | raw enum leaked to visitors |
| `https://opinio.mx/b/luuna` | CLEE card: "Dato registrado; consulta la fuente" | an INEGI/DENUE identity row exists for that CLEE; the matcher compared identifiers only, so the `CLEE: ` prefix hid the verified state |
| `https://opinio.mx/b/luuna` | Section freshness: "Auditoría Opinio · **Actualizada 2026**" | hardcoded; no stored date backs it |
| `https://opinio.mx/b/luuna` | Official record: "Fecha del registro: **No disponible**" | the record carries a day-first date (`15/03/2026`) that the JS `Date` parser cannot read |

Reader-facing consequence: visitors could not distinguish attributable facts, verified state, missing
data and no-review state. The goal is reader usefulness and attributable claims, not raising a model score.

## 2. Change

`src/app/b/[slug]/page.tsx` (passport body only — `generateMetadata` untouched):

- Dictamen text is now derived from the records that exist: published legal name/RFC, readable
  verification level, count of verified identities (with source names) or public records, and
  case counts with the case-derived confirmed-resolution rate. When no identity/record exists it says so.
- Section freshness line shows the newest **source record date** only; otherwise
  "Sin fuentes públicas con fecha registrada". The hardcoded "Actualizada 2026" is gone.
- Micro-grid: "Estatus Fiscal" reflects the identity status (or "Sin RFC publicado"); "Nivel de
  verificación" uses readable labels; "Resolución de casos" is case-derived ("Sin casos registrados");
  "Opiniones publicadas" shows "Sin opiniones publicadas" instead of "Abierto a opiniones".
- Identity cards show the fact status plus `Fuente: …` when the identity record has a source; the
  verification-status lookup is type-aware and tolerates prefixed identifiers (`CLEE: …`).
- Sources section header shows the record count ("Sin registros vinculados" when empty).
- Response-time stat is only shown when case records exist (previously a stored aggregate could be
  shown with zero case records).
- The purchase-safety recommendation is labelled "Consejo editorial de Opinio"; nav label "Dictamen AI"
  → "Dictamen".
- JSON-LD (in-body `@graph`): WebPage description and the trust/PROFECO FAQ answers now state only
  supported facts (published RFC + its status, review count, registered case count). No `generateMetadata`
  edits.

`src/components/passport/OfficialRecordCard.tsx`: record date uses the shared day-first/ISO parser and
falls back to the raw source value instead of "No disponible".

`src/lib/passport-evidence.ts` (new): `factStatus` (type-aware identity matching; never treats a
registered value as verified), `verificationLevelLabel`, `parseRecordDate`/`formatRecordDate`
(`dd/mm/yyyy` and ISO; unparseable values stay unknown), `latestRecordDate`. `identities.verified_at`
is deliberately **not** rendered: in this codebase it defaults to the import time, so it is not a
verification date.

`src/lib/passport-evidence.test.ts` (new): deterministic regression tests for the derived claims.

## 3. Verification (local isolated runtime)

Runtime: `runtime.md` (owner `runtime-verification`). Dev server:

```bash
cd C:/Users/isaac/tmp/opinio-seo-worktrees/issue-6
DATABASE_URL='postgres://opinio:opinio_local_dev@127.0.0.1:54732/opinio_issue_6' \
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3206
```

- Catalogue provenance: 1108 rows from `data/mexican_stores_1000.json` loaded by
  `scripts/seed-mexican-stores-scale.ts` (source "PROFECO Monitoreo Oficial"), `verified_level=public_info`,
  `trust_score=0`; **0** identities / official_records / reviews / cases by integrity rule. Local catalogue
  counts are not production facts.
- Populated-evidence case: the catalogue already contains the real `luuna` business. For local rendering
  only, its profile was enriched in `opinio_issue_6` with the RFC/CLEE/WhatsApp facts and the identity +
  official-record rows the live production passport serves (read-only capture of `https://opinio.mx/b/luuna`
  on 2026-10-13, cross-checked with the repo definition `scripts/seed.ts` that produced them). Identity
  `source` labels and raw `record_date` strings are not rendered publicly, so those fields come from that
  repo definition; reviews and cases were **not** mapped (they are hand-authored demo data). Mapping SQL
  and pre/post counts: `C:/Users/isaac/tmp/seo6-prod/map-luuna-evidence.sql` (identities 0→4,
  official_records 0→2, reviews 0→0). This is local isolated data, never production.

Collector `C:/Users/isaac/tmp/opinio-remediation/qa/render-evidence.mjs` (system Chrome, real DOM):

```bash
BASE_URL=http://127.0.0.1:3206 ROUTES=/b/luuna,/b/aliexpress,/b/mercado-libre \
OUT=C:/Users/isaac/tmp/opinio-remediation/evidence/seo-6 \
node C:/Users/isaac/tmp/opinio-remediation/qa/render-evidence.mjs
```

Observed: all three routes `server=200`, `browser=200`, `consoleErrors=0`, canonical
`https://opinio.mx/b/{slug}`, intact `Escribir opinión` / `Abrir un caso` links, one image with alt text.

Assertions (script `C:/Users/isaac/tmp/seo6-prod/check-issue6-evidence.js`, 0 failures):

- `/b/luuna` (populated evidence): "Fuente más reciente: 15 de marzo de 2026";
  "Opinio ha verificado 4 identificadores con fuentes como SAT Cédula Fiscal Digital y INEGI …";
  "Fuente: …" for all four facts; "Fecha del registro: 15 de marzo de 2026" and "…2 de enero de 2026";
  "Sin casos registrados"; "Este negocio todavía no tiene opiniones". Absent: "RFC Validado",
  "Sin alertas", "Actualizada 2026", "cotejo de datos", raw enum codes, "Opiniones Auditadas".
- `/b/mercado-libre` (populated catalogue facts, no evidence): "Sin fuentes públicas con fecha registrada";
  "Opinio no tiene todavía registros de identidad verificados ni fuentes públicas vinculadas para este perfil.";
  "Registrado sin verificación en Opinio"; "Sin registros vinculados"; "Sin opiniones publicadas".
  Same absence checks pass.
- `/b/aliexpress` (missing facts): no "Razón social" line; "Sin RFC publicado";
  "1 de 4 datos registrados"; unknown/empty states as above.
- JSON-LD on all three: parses, and contains neither "RFC validado" nor "alertas críticas".

Suite: `node node_modules/vitest/vitest.mjs run` → 3 files / 42 tests passed;
`node node_modules/typescript/bin/tsc --noEmit` → clean; ESLint on the changed files → clean.

## 4. Limits / notes

- The populated-evidence render uses mapped local rows (provenance above); reviews/cases rendering was
  not exercised locally (they stay empty by integrity rule). The review-list code path is unchanged; the
  populated-reviews surface was only observed read-only on the production capture.
- Ambiguous source dates are read day-first (`dd/mm/yyyy`), as the same dataset contains `15/03/2026`
  (impossible as `mm/dd`). Consequence: the raw record value `02/01/2026` now renders "2 de enero de 2026";
  the pre-change page rendered it "1 de febrero de 2026" and rendered `15/03/2026` as "No disponible".
- `businesses.updated_at`, `official_records.retrieved_at` and `identities.verified_at` are import/update
  timestamps and are not used as verification or freshness dates.
- Files staged for this ticket (explicit paths only; no config): `src/app/b/[slug]/page.tsx`,
  `src/components/passport/OfficialRecordCard.tsx`, `src/lib/passport-evidence.ts`,
  `src/lib/passport-evidence.test.ts`, `docs/seo-remediation/issue-6.md`.
  `CLAUDE.md` / `docs/agents/**` remain uncommitted local config.

## 5. Reproduce

1. Start Postgres/DBs per `runtime.md`; run the mapped-evidence SQL (external path above) against
   `opinio_issue_6`.
2. Start the dev server (command in §3) and run the collector + assertion script.
3. Re-run unit tests: `node node_modules/vitest/vitest.mjs run` in the worktree.
