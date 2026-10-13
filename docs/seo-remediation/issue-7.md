# Issue #7 — rendered utility user journeys (verification-only)

Ticket: lawrns/opinio#7 `[SEO] Verify and repair rendered utility user journeys` (labels `question`, `ready-for-agent`)
Session `seo-7` · Branch `fix/opinio-seo-issue-7` · Worktree `C:/Users/isaac/tmp/opinio-seo-worktrees/issue-7` · Base `fefc090` (integration `fix/opinio-seo-remediation`)

Outcome: **no consumer-visible defect reproduced in the hydrated journeys; no source file changed.**
Verified on the local integration branch; not published/released.

## Runtime

- `node node_modules/next/dist/bin/next dev --webpack --port 3207` in the ticket worktree (external `C:/Users/isaac/tmp/opinio-remediation/runtime.md` §1).
- `DATABASE_URL=postgres://…@127.0.0.1:54732/opinio_issue_7` — private, isolated container DB: 1108 real PROFECO-derived catalogue businesses, 0 reviews / 0 cases (honest empty states, no fabricated data).
- Browser: Chrome 154 via Playwright 1.59.1 (`channel: chrome`); real interaction, real network, real DOM.
- `--webpack` is required: Turbopack dev on this host fails to load the `pg` external module and 500s every DB-backed route (see Limits).

## Observed hydrated behaviour

### `/verificar` (client-driven search/selection)

| Check | Observed |
| --- | --- |
| Default load | H1 `Conoce el negocio antes de comprar.`; 50 cards; status `Mostrando 50 de 1,108 negocios encontrados`; card CTA `Ver opiniones y perfil` → `/b/mercado-libre`; `GET /api/v1/search?sort=score` → 200 |
| `?q=amazon` (flagged URL family) | 1 card `Amazon`; input `amazon`; status `1 negocio encontrado` |
| `?accion=opinar` | H1 `Tu experiencia empieza con un nombre.`; card CTA `Opinar sobre Amazon` → `/escribir-opinion/amazon` (navigation landed: wizard H1 `Opinar sobre Amazon`, step `1 Tu experiencia`, back link `/b/amazon`) |
| Category chip | `Joyería` → URL `/verificar?categoria=Joyería`, `aria-pressed=true`, `21 negocios encontrados` |
| Sort select | `rating` → URL `…&sort=rating`, results re-render |
| Connected checkbox | `0 negocios encontrados` + heading `No hay negocios con estos filtros` (honest empty state; catalogue has no connected orders) |
| Rating select | `rating=4` in URL and reflected in the select |
| `Limpiar filtros` | URL back to `/verificar`, sort back to `score`, `Mostrando 50 de 1,108…` |
| Write-mode survives selection | chip/sort/clear keep `accion=opinar` in the URL and the write-mode H1 (`/verificar?accion=opinar`) |
| Typing (delay 0) | `mercado libre` → input preserved, URL `/verificar?q=mercado+libre`, 1 result; `liverpool` → 5 results; no dropped characters |
| Loading | delayed API → `role=status` `Buscando negocios…`, results section `aria-busy=true`, 4 skeleton cards; after load `aria-busy=false`, 0 skeletons |
| Error + retry | API 503 → `role=alert` `No pudimos cargar los negocios / Intenta de nuevo. Conservamos tu búsqueda y tus filtros. / Reintentar`; status `La búsqueda no está disponible`; typed query preserved; after `Reintentar` with API restored → 1 card, alert count 0 |
| Empty state | `?q=zzz-no-such-business-zzz` → `No encontramos “zzz-no-such-business-zzz” con estos filtros` + `Explorar todos los negocios` |
| Invalid deep links | `?rating=abc&sort=bogus&categoria=Categoría+Desconocida` → select falls back to `0`/`score`, unknown category rendered as a chip, honest empty state; `?rating=9` ignored; 300-char `q` returns 0 matches without error |

### `/caso/nuevo` (case entry)

| Check | Observed |
| --- | --- |
| Default | H1 `Cuéntanos qué pasó con tu compra`; merchant select populated; submit disabled until a merchant is selected; help `Confirma que seleccionaste el comercio correcto antes de enviar tu caso.` |
| `?b=amazon` (link from `/b/<slug>`) | input prefilled `amazon`, option selected `Amazon (SERVICIOS COMERCIALES AMAZON MÉXICO, S. DE R.L. DE C.V.)`, submit enabled |
| `?b=cleto-reyes` (JEV-018 flag URL) | `Cleto Reyes (INDUSTRIA REYES S.A DE C.V.)` selected automatically, submit enabled |
| Ambiguous slug | `?b=walmart` → exact slug selected (list also offers `Walmart Super`); `?b=walmart-super` → that slug selected |
| Loading | select placeholder `Buscando negocios…`, select and submit disabled |
| Error + retry | search API 500 → inline `role=alert` `No pudimos cargar los negocios. Reintentar`, submit disabled; after `Reintentar` options load, `?b=amazon` re-selected, submit enabled, alert removed |
| Validation | invalid contact → `Escribe un correo válido o un teléfono de al menos 10 dígitos.`, stays on the form |
| Submit (local write) | `POST /api/v1/cases` 201 → `router.push` → `/caso/1` renders `CASO-AMAZ-2026-7923`, `Caso Abierto`, brand and submitted issue text |
| Entry navigation | `/b/amazon` → `Abrir un caso` → `/caso/nuevo?b=amazon` preselected |

### `/escribir-opinion/<merchant>` (opinion entry)

| Check | Observed |
| --- | --- |
| Hydrated form | H1 `Opinar sobre Amazon`; step `1 Tu experiencia`; explicit next step `Revisar mi opinión`; `/b/amazon` back link |
| Step progression | step 2 `Revisar y publicar`; step 3 `role=status` `Tu opinión se publicó` + `Ver mi opinión` → `/b/amazon#opiniones` |
| Validation | empty submit / 5-char body stay on step 1 through native constraint validation (`Please select one of these options.`, `Please lengthen this text to 15 characters or more…`) |
| Back navigation | `Editar opinión` → step 1 with rating (5), body and title preserved; focus moved to the H1 |
| Publish (local write) | `POST /api/v1/reviews` 201 → step 3 → `/b/amazon#opiniones` renders `Opiniones de compradores (1)` with the submitted text |
| Unknown merchant | `/escribir-opinion/zzz-none` → HTTP 404 with the app 404 page |

HTTP matrix: `/verificar`, `/verificar?q=amazon`, `/verificar?accion=opinar`, `/caso/nuevo`, `/caso/nuevo?b=amazon`, `/escribir-opinion/amazon` → 200; `/escribir-opinion/zzz-none` → 404; `/api/v1/search?q=amazon&sort=score` → 200.

## Shell vs hydrated (audit findings)

Word counts of visible text; shell = server HTML before hydration, hydrated = real browser after settle.

| URL | shell | hydrated |
| --- | --- | --- |
| `/verificar` | 132 | 1,621 |
| `/verificar?accion=opinar` | 136 | 1,601 |
| `/verificar?q=amazon` | 2 | 164 |
| `/verificar?categoria=Joyería` | 2 | 758 |
| `/caso/nuevo` | 0 | 546 |
| `/caso/nuevo?b=amazon` | 0 | 182 |
| `/escribir-opinion/amazon` | 71 | 70 (server-rendered short form, unchanged by hydration) |

Dispositions:

- **JEV-011 thin content** — the audit's 2026-10-13 crawl recorded `rendered: false` for all 1,500 URLs, so the utility pages were measured as their client shell. Hydrated measurement above. No change: padding a form to a word-count threshold is explicitly out of scope for this ticket.
- **JEV-013 Jev specificity** — model score, no deterministic consumer-visible defect reproducible at runtime; no change.
- **JEV-018 commercial pages without a clear next step** — hydrated pages expose explicit next steps (per-card `Ver opiniones y perfil`/`Opinar sobre X`, `Registrar mi caso`, `Revisar mi opinión`/`Publicar opinión`/`Ver mi opinión`). The unrendered crawl that produced the finding measured their shells.

### Every JEV-018 flagged URL, hydrated

| Flagged URL | Observed result | Card/next step |
| --- | --- | --- |
| `/verificar?q=Luuna` | `1 negocio encontrado` | card `Luuna`, `Ver opiniones y perfil` |
| `/verificar?q=doto` | `1 negocio encontrado` | card `Doto`, `Ver opiniones y perfil` |
| `/verificar?q=Ahal` | `1 negocio encontrado` | card `Ahal Cosmética`, `Ver opiniones y perfil` |
| `/verificar?categoria=Salud` | `15 negocios encontrados` | 15 cards, `Ver opiniones y perfil` |
| `/verificar?categoria=Fitness` | `32 negocios encontrados` | 32 cards, `Ver opiniones y perfil` |
| `/verificar?categoria=Belleza` | `Mostrando 50 de 63 negocios encontrados` | 50 cards, `Ver opiniones y perfil` |
| `/verificar?categoria=Muebles` | `42 negocios encontrados` | 42 cards, `Ver opiniones y perfil` |
| `/caso/nuevo?b=cleto-reyes` | `Cleto Reyes (INDUSTRIA REYES S.A DE C.V.)` preselected, submit enabled | `Registrar mi caso` |

## Verification method / evidence

Harness (external, not committed): `C:/Users/isaac/tmp/opinio-remediation/evidence/issue-7/` — `journeys.cjs` … `journeys9.cjs`, `db-snapshot.cjs`, `db-cleanup.cjs`, raw JSON per run and full-page PNGs in `shots/`.

Verification rows created through the real UI in the private DB and deleted after capture (`resolution_cases` id 1 `CASO-AMAZ-2026-7923`, `case_messages` id 1, `reviews` id 1), and the recalculated business row restored (`amazon` trust_score 75.4 → 0.0, effective_reviews_count 1 → 0). Post-cleanup counts: 0 reviews, 0 cases, 0 case messages, 0 businesses with non-zero derived metrics. These were locally created verification rows, deleted after capture — not production data.

## Limits / observations (not changed)

1. Turbopack dev (`next dev`, Next 16 default) cannot load the `pg` external on this host (`ERR_MODULE_NOT_FOUND`), so DB-backed routes 500; `--webpack` works. Toolchain/host issue, not repo code.
2. `/verificar` and `/caso/nuevo` are client-rendered: their server HTML is a loading shell (no H1 for `/caso/nuevo`; `Cargando directorio…` for `/verificar`). Indexing/canonical/metadata policy belongs to #3/#4.
3. Native browser constraint validation runs before the wizard's inline Spanish messages for empty rating / short body; the app messages are reachable for values that pass native constraints. Honest either way.
4. `/api/v1/search` returns `b.*`, including `phone`, `whatsapp` and `rfc`, to an unauthenticated client — outside this ticket's file scope; flagged for the director.
5. `/caso/<id>` is reachable by numeric id without a token — route/privacy policy, not this ticket.
6. UI category chips use the design taxonomy; catalogue categories differ (e.g. `Farmacias, Ópticas y Salud`), so some chips legitimately return the empty state — data/product decision.
7. Local catalogue = 1108 businesses; local counts are not production facts. No production analytics verification (analytics remains opt-in and untouched).
