# Issue #6 — Public passports substantiate verification claims

- Ticket: [lawrns/opinio#6](https://github.com/lawrns/opinio/issues/6) — `enhancement`, `ready-for-agent`
- Worker: `seo-6` · Branch `fix/opinio-seo-issue-6` · Worktree `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-6` · Base `fefc09028acc1ca94eddf5decc15459c46a7e614`
- Status: local integration branch verified; **not published/released**.
- Finding IDs: JEV-002, JEV-009, JEV-014, JEV-017, JEV-022.

## 1. Defect (read-only production evidence, captured 2026-10-13)

Public passports answered "is this merchant trustworthy?" with claims that the stored records did not
support. Two read-only surfaces were used: the rendered passports (`production-baseline/prod_*.html`)
and the public record interface `GET https://opinio.mx/api/v1/businesses/{slug}` (HTTP 200,
unauthenticated), which returns the profile's `identities` and `official_records` rows.

| Observed on | Rendered claim | What the records actually support |
| --- | --- | --- |
| `/b/mercadolibre` | Dictamen: "respaldado por **cotejo de datos mercantiles y de dominio**" | API returns `official_records: []` for that profile |
| `/b/mercadolibre` | Micro-grid: "Resolución PROFECO: **Sin alertas**" | API returns `identities: []`, `official_records: []`; no cases, no PROFECO record; case data is Opinio's, not PROFECO's |
| `/b/luuna` | Micro-grid: "Estatus Fiscal: **RFC Validado**" | derived only from `businesses.rfc IS NOT NULL`, independent of the identity record's status |
| `/b/luuna` | "Nivel de Confianza: **transparent_coverage**" | raw enum leaked to visitors |
| `/b/luuna` | CLEE card: "Dato registrado; consulta la fuente" | an INEGI/DENUE identity row exists; the matcher compared identifiers only, so the `CLEE: ` prefix hid the recorded state |
| `/b/luuna` | Section freshness: "Auditoría Opinio · **Actualizada 2026**" | hardcoded; no stored date backs it |
| `/b/luuna` | Official record: "Fecha del registro: **No disponible**" | the record's `record_date` is day-first (`15/03/2026`), which the JS `Date` parser cannot read |

Reader-facing consequence: visitors could not distinguish attributable facts, recorded verification
state, missing data and no-review state. The goal is reader usefulness and attributable claims, not
raising a model score.

## 2. Change

`src/app/b/[slug]/page.tsx` (passport body incl. in-body JSON-LD — `generateMetadata` is untouched;
its identity metadata remains #4's scope):

- Dictamen text is derived from the records that exist: published legal name/RFC, readable verification
  level, count of identities with recorded verification (attributed to Opinio, with recorded sources),
  and case counts with the case-derived confirmed-resolution rate. With no identity/record it says so.
- Section freshness line shows the newest **source record date** only; otherwise
  "Sin fuentes públicas con fecha registrada". The hardcoded "Actualizada 2026" is gone.
- Micro-grid: "Estatus Fiscal" reflects the identity status (or "Sin RFC publicado"); "Nivel de
  verificación" uses readable labels; "Resolución de casos" is case-derived ("Sin casos registrados");
  "Opiniones publicadas" shows "Sin opiniones publicadas".
- Identity cards show the record status attributed to Opinio plus `Fuente registrada: …` (or
  "Fuente registrada: no registrada" when the record has no source); the lookup is type-aware and
  tolerates prefixed identifiers (`CLEE: …`).
- Sources section header shows the record count ("Sin registros vinculados" when empty).
- Response-time stat is only shown when case records exist.
- The purchase-safety recommendation is labelled "Consejo editorial de Opinio"; nav label "Dictamen AI"
  → "Dictamen".
- In-body JSON-LD (`@graph`): the WebPage description is neutral, and the trust/case FAQ answers state
  only supported facts — published RFC with its recorded status (`factEvidence`), readable verification
  level, review count, registered case count and the case-derived `resolutionRate`. The stored
  aggregates (`business.resolution_rate`, `business.median_response_hours`) and the `hasResolution` flag
  are no longer used there.

`src/components/passport/OfficialRecordCard.tsx`: record date uses the shared day-first/ISO parser and
falls back to the raw source value instead of "No disponible".

`src/lib/passport-evidence.ts` (new): `factStatus` returns a machine-readable
`status: 'missing' | 'registered' | 'verified' | 'pending' | 'rejected' | 'unknown'` plus the
visitor-facing `label`, the recorded `source` and a `sourceNote`; a value registered on the business
row is never treated as verified. `verificationLevelLabel` maps stored level codes.
`parseRecordDate`/`formatRecordDate` handle `dd/mm/yyyy` and ISO, leaving unparseable values unknown;
`latestRecordDateValue` returns the raw date of the newest parseable record. `identities.verified_at`
is deliberately **not** rendered: the public interface shows it as one identical import timestamp for
every row (e.g. `2026-09-04T16:23:27.173Z`), so it is not a verification date.

`src/lib/passport-evidence.test.ts` (new): semantic regression tests for identity type/value matching,
status/source transitions, and calendar-date parsing/selection — no visitor-wording or locale-format
assertions (those are covered by the HTTP/DOM capture). A self-comparing `verificationLevelLabel` test
was removed as a wiring tautology (director correction).

Standards-review notes addressed: machine-readable status instead of label-keyed business logic
(note 1); the raw-string `status` typing is documented as deliberate so unknown statuses surface
instead of being narrowed away, and the redundant row projection was removed (notes 2, 5);
`latestRecordDateValue` naming (note 3); `parseRecordDate` exercised directly by tests (note 4).

## 3. Verification (local isolated runtime)

Runtime: `runtime.md` (owner `runtime-verification`). Dev server:

```bash
cd C:/Users/isaac/tmp/opinio-seo-worktrees/issue-6
DATABASE_URL='postgres://opinio:<local-table-password>@127.0.0.1:54732/opinio_issue_6' \
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 --port 3206
```

(The local password is the one in `runtime.md`; it is a throwaway local container credential and is not
repeated here.)

- Catalogue provenance: 1108 rows from `data/mexican_stores_1000.json` loaded by
  `scripts/seed-mexican-stores-scale.ts` (source "PROFECO Monitoreo Oficial"), `verified_level=public_info`,
  `trust_score=0`; **0** identities / official_records / reviews / cases. Local catalogue counts are not
  production facts.
- Populated case (local verification fixture): the catalogue already contains the real `luuna` business.
  For rendering only, `opinio_issue_6` was given the profile state the public interface returns for
  `https://opinio.mx/api/v1/businesses/luuna` (read-only GET, 2026-10-13): the RFC/CLEE/WhatsApp facts,
  the five identity rows (type/identifier/status/source), and the two official records
  (source/fact/`record_date`/URL). Cross-checked against the repo definition `scripts/seed.ts` that
  produced them. **Not mapped: reviews and resolution cases** (hand-authored demo data). This fixture
  lives only in the isolated DB; capture script `C:/Users/isaac/tmp/seo6-prod/map-luuna-evidence.sql`.
- Cleanup after capture (exact rows only, performed for each capture cycle): identities 5→0,
  official_records 2→0, fixture `audit_logs` notes 1–2→0, reviews 0→0, cases 0→0; the business row's
  `rfc`/`clee`/`whatsapp` were reverted to the catalogue's NULLs. Post-cleanup the profile renders the
  empty states again (capture in `post-cleanup/`), and the database is catalogue-only (0 identities,
  0 official_records, 0 reviews, 0 cases, 0 `seo-6` audit rows).

Collector `C:/Users/isaac/tmp/opinio-remediation/qa/render-evidence.mjs` (system Chrome, real DOM):

```bash
BASE_URL=http://127.0.0.1:3206 ROUTES=/b/luuna,/b/aliexpress,/b/mercado-libre \
OUT=C:/Users/isaac/tmp/opinio-remediation/evidence/seo-6 \
node C:/Users/isaac/tmp/opinio-remediation/qa/render-evidence.mjs
```

Observed: all three routes `server=200`, `browser=200`, `consoleErrors=0`, canonical
`https://opinio.mx/b/{slug}`, intact `Escribir opinión` / `Abrir un caso` links, one image with alt text.

Differential against unmodified code (same catalogue-only data, no fixture): my branch on 3206 vs the
reference baseline on 3214 (commit `fefc090`). The visible-text diff contains only the intended claim
changes — baseline "Auditoría Opinio · Actualizada 2026" → "Sin fuentes públicas con fecha registrada";
"Estatus Fiscal: En Validación / Nivel de Confianza: public_info / Resolución PROFECO: Sin alertas /
Opiniones Auditadas: Abierto a opiniones" → "Sin RFC publicado / Información pública /
Sin casos registrados / Sin opiniones publicadas"; baseline's "respaldado por cotejo de datos mercantiles
y de dominio" → "Opinio no tiene todavía registros de identidad verificados ni fuentes públicas
vinculadas para este perfil."; "Datos disponibles" → "1 de 4 datos registrados"; sources header gains
"Sin registros vinculados". No section or content is lost (stripped text: baseline 4445 vs branch 4426
characters). Captures and segment diff: `differential/`.

Assertions (script `C:/Users/isaac/tmp/seo6-prod/check-issue6-evidence.js`, 0 failures):

- `/b/luuna` (populated fixture): "Fuente más reciente: 15 de marzo de 2026";
  "El registro de Opinio incluye 5 identificadores con verificación registrada, con fuentes registradas
  como SAT Cédula Fiscal Digital y INEGI …"; "Fuente registrada: …" for all four fact cards;
  "Fecha del registro: 15 de marzo de 2026" and "…2 de enero de 2026"; "Sin casos registrados";
  "Este negocio todavía no tiene opiniones". Absent from body text: "RFC Validado", "Sin alertas",
  "Actualizada 2026", "cotejo de datos", raw enum codes, "Opiniones Auditadas", "Datos disponibles".
- `/b/mercado-libre` (catalogue facts, no evidence): "Sin fuentes públicas con fecha registrada";
  "Opinio no tiene todavía registros de identidad verificados ni fuentes públicas vinculadas para este perfil.";
  "Registrado sin verificación en Opinio"; "Sin registros vinculados"; "Sin opiniones publicadas".
- `/b/aliexpress` (missing facts): no "Razón social" line; "Sin RFC publicado";
  "1 de 4 datos registrados"; empty states as above.
- In-body JSON-LD on all three routes: parses to one object, carries the neutral WebPage description,
  and contains no "RFC validado" / "alertas críticas"; on the populated fixture it carries
  "Estado del RFC: CZE150414AB2 (Verificado en el registro de Opinio)".
- Post-cleanup `/b/luuna`: empty states only, no `Fuente registrada:`/`Verificado en el registro de Opinio`,
  JSON-LD falls back to "Estado del RFC: sin RFC publicado" with no unsupported claims.

Suite: `node node_modules/vitest/vitest.mjs run` → 3 files / 36 tests passed;
`node node_modules/typescript/bin/tsc --noEmit` → clean; ESLint on the changed files → clean.

What this proves and what it does not: the runtime capture proves the conditional rendering path —
populated records render attributed facts/sources/dates, absent records render explicit unknown states.
It does **not** prove the credentials themselves are genuine: the source labels and dates are Opinio's
recorded attributions (observed read-only), not independent confirmation by the named authorities.

## 4. Limits / notes

- The populated render uses the local fixture described above; reviews and cases were not mapped, so
  their counts on that local page differ from the production profile (which serves 8 reviews and 8 cases).
  The review-list code path is unchanged; populated-reviews rendering was only observed read-only.
- Ambiguous source dates are read day-first (`dd/mm/yyyy`), as the same dataset contains `15/03/2026`
  (impossible as `mm/dd`). Consequence: `02/01/2026` now renders "2 de enero de 2026"; the pre-change
  page rendered it "1 de febrero de 2026" and rendered `15/03/2026` as "No disponible".
- `businesses.updated_at`, `official_records.retrieved_at` and `identities.verified_at` are import/update
  timestamps and are not used as verification or freshness dates.
- Metadata: `generateMetadata` remains #4's scope (untouched; the standards review flagged its
  unsupported-claim wording so integration does not treat that surface as covered). In-body JSON-LD is
  #6's approved scope (director correction) and is now truthful: no "RFC validado"/"alertas críticas"
  wording, neutral WebPage description, FAQ facts derived from `factEvidence`/`resolutionRate`.
- Files staged for this ticket (explicit paths only; no config): `src/app/b/[slug]/page.tsx`,
  `src/components/passport/OfficialRecordCard.tsx`, `src/lib/passport-evidence.ts`,
  `src/lib/passport-evidence.test.ts`, `docs/seo-remediation/issue-6.md`.
  `CLAUDE.md` / `docs/agents/**` remain uncommitted local config.

## 5. Reproduce

1. Start Postgres/DBs per `runtime.md`.
2. Apply the fixture capture script (`map-luuna-evidence.sql`) to `opinio_issue_6`; start the dev server
   (command in §3); run the collector + assertion script.
3. Remove the fixture rows (`DELETE` identities/official_records/audit notes for the business; revert
   `rfc`/`clee`/`whatsapp` to NULL) and re-capture to confirm the empty states.
4. Re-run unit tests: `node node_modules/vitest/vitest.mjs run` in the worktree.
