# TRUST_PROVENANCE — claim provenance classes, evidence ledger, and agent rules

Effective: 2026-10-11. Owner of record: Laurence (laurence@fyves.com), Opinio México / portfolio.
Scope: Opinio (`opinio.mx`) and every portfolio surface that renders its trust components —
Barri, Doctor.mx, Hablo, GoGym, Locomotion (`.is`/`.mx`), Bien, Locoreal.

This file exists so that agents stop re-litigating the same question from scratch. **Read this
before modifying any rating, review, review-count, verification badge, or prestige ribbon.**

---------------------------------------------------------------------------
## 1. Provenance classes (a claim is in exactly one class)

| # | Class | Definition | May be published publicly as… |
|---|-------|------------|-------------------------------|
| 1 | **Verified** | Backed by an independently inspectable record (order row, receipt, third-party source). | "verified", the specific fact the record proves |
| 2 | **Owner-attested** | The owner states it is true. Source + date recorded. | "declared by the business", never "verified" |
| 3 | **Editorial** | Marketing language that asserts no fact. | as-is |
| 4 | **Fixture / demo** | Seeded/dev data. Legitimate *as test data*. | only if labeled a demo/sample |
| 5 | **Unverified claim** | Any numeric rating, customer review, "verified purchase/experience", or endorsement without class-1 evidence. | must not be presented as verified |

**Classifying ≠ deleting.** The classes are a labeling obligation, not a removal mandate. A
component may keep its UI and lose only the unsupported claim.

### 1a. Provenance source tags (orthogonal to the class)

`provenance_source` records *where a record came from*; it does not change the class.

| tag | meaning | what it does **not** establish |
|---|---|---|
| `first_party_platform` | collected in this system (order/invitation flow) | — |
| `legacy_site_migration` | owner asserts the record was carried from a previous site | that a reviewer is real, that text is customer-authored, or that a purchase occurred |
| `owner_authored` | written by the business | customer authorship |
| `seed_fixture` | generated for dev/test | anything about the real world |

`legacy_site_migration` is an **owner-attested origin** and lands in **class 2**. It can never, on
its own, move a record to class 1 or license `verificado` / `opiniones verificadas` /
`confirmed_payment`.

### 1b. Recorded provenance fields (to be added to `reviews`, non-destructive)

Four independent, non-overlapping fields — never collapse them:

- `provenance_source` (enum above)
- `owner_attested` (bool + `attestation_ref`, `attested_at`)
- `customer_authored` (bool | null — null = unknown)
- `transaction_verified` (bool + `verification_record_ref`)

---------------------------------------------------------------------------
## 2. Owner attestation on record

**Source:** owner statement, 2026-10-11 (this session).
**Assertion:** all currently published reviews/ratings across the portfolio "have existing
provenance."
**Recorded as:** class 2 (owner-attested), for the existing corpus only.

Explicit limits (these do not soften):
- Attestation records *that the owner asserts provenance*. It does **not** establish that a
  purchase occurred, that a reviewer is a real customer, or that a third party verified anything.
- Therefore it **cannot** move any row into class 1, and it cannot license the public strings
  `opiniones verificadas` / `opiniones auditadas` / `confirmed_payment`.
- New reviews must go through the reconciling path in §5, not through attestation.

**Second attestation — legacy origin (2026-10-11):**
- **Assertion:** the existing corpus originated on a previous website and was carried into the
  current implementation; the inline seed arrays are the storage/deployment mechanism, not the
  original authorship.
- **Recorded as:** `provenance_source = legacy_site_migration`, class 2, for the existing corpus.
- **Evidence provided:** none. The owner directed that the source system's URL, database,
  transactions, customer identities, and evidence records **not** be inferred or invented. There is
  therefore **no inspectable source record** for this corpus in the repositories.
- **Limit:** an asserted prior system is *not* a source of truth until a record from it exists.
  `legacy_site_migration` establishes the owner's declaration, nothing more.

---------------------------------------------------------------------------
## 3. What the repository evidence shows (measured, not asserted)

- **Reviews are generated, not collected.**
  `scripts/seed-natural-reviews.ts:34-73`, `scripts/seed-locomotion.ts:81+`,
  `scripts/seed-portfolio-businesses.ts:56+`, `scripts/seed-bien.ts`, `scripts/seed.ts`,
  `scripts/reseed-realistic-timestamps.ts:4` (`generateBurstTimestamps`, "Poisson-burst").
  → by origin these rows are class 4.
- **"Verified purchase" is self-declared.**
  `src/app/api/v1/reviews/route.ts:137` sets `confirmed_payment` from `body.verification_level`;
  the reconciliation at `:120-141` (order must exist + `delivered|fulfilled`) is **bypassed by the
  seed scripts**, which `INSERT INTO reviews` directly.
  → published `confirmed_payment` claims are class 5 until reconciled.
- **Score weight treats it as truth.** `src/lib/scoring.ts:29-33` `confirmed_payment: 1.00`.
- **Public numbers are hardcoded literals on the consumer sites.**
  Hablo `rating={4.8} reviewCount={30}`; GoGym `4.7 / 60`; Locomotion `4.9 / 38`; Bien `5.0 / 35`
  (see §4 ledger for paths).
- **Widget payload** was `trust_score` + `effective_reviews_count` from the seed-derived score:
  `git show 0ec152b~1:src/app/api/v1/widgets/[token]/route.ts`.

**Content contradiction (independent of origin):** even granting `legacy_site_migration`, the text
is vendor-authored, not customer-authored. Evidence:
- `scripts/seed-locomotion.ts:81-91` — the review body names the vendor's own product plan
  (`Locomotion OS Shop Plan $3,899 MXN/mes`) and internal features ("Análisis A/B", codes
  "P0700/P0751"); `:91` carries a merchant `response` addressing the reviewer by name. A customer
  does not write in the vendor's pricing/feature taxonomy, and a real customer review is not
  authored alongside the merchant's reply.
- `scripts/seed-portfolio-businesses.ts:60` — Barri review names "Stripe Direct Charge" and
  "Plan Barrio de $499 MXN/mes": internal implementation/pricing.
- `scripts/seed-natural-reviews.ts:34-63` — generic bodies ("Todo bien", "10/10") reused across
  businesses with fictional masked contacts (`...***@opinio.mx`).
→ the corpus is vendor-authored testimonial content; this holds regardless of which system it was
"migrated from", and no prior-site record changes it.

**Consequence:** whatever an owner attests, the *public claims* below are class 5 today. Honest
labeling is the deliverable; attestation is recorded, not laundered.

---------------------------------------------------------------------------
## 4. Claim-level evidence ledger

| Claim | Component / path | Source of value | Class | Evidence | Public-safe today? |
|---|---|---|---|---|---|
| "Opinio · Excelente 4.8/5" hero ribbon | `hablo src/components/newhome/OpinioPrestigeRibbon.tsx` (deleted `8e96ff99`) | literal `rating=4.8` | 5 | none | no |
| "30+ opiniones auditadas" | same, `reviewCount=30` | literal | 5 | none | no |
| "Opinio 4.7 · 60+ opiniones auditadas" | `GYM-coach-staff apps/web/components/marketing/OpinioPrestigeRibbon.tsx:12-15,55` | literal | 5 | none | no |
| "Locomotion OS 4.9/5 · 38+ opiniones" | `locoreal-wave3 src/components/marketing/OpinioPrestigeRibbon.tsx:14-17` | literal | 5 | none | no |
| "Barri.mx" ribbon | `_wt/barri-433`, `biendeli`, `clef-run/wt/barri-08`, `clef-remediation/wt/barri-07` | literal brand, no rating default | 3 (editorial) | n/a | yes (no numeric claim) |
| "Bien 5.0/5 · 35+" | `bien/src/components/marketing/OpinioPrestigeRibbon.tsx` | literal | 5 | none | no |
| `confirmed_payment` label | `reviews` rows via `seed-*.ts` | self-declared | 5 | order reconciliation bypassed | no |
| trust_score / effective_reviews_count | `businesses` after seed scoring | computed over class-4 rows | 5 | none | no, as "verified" |
| Owner "all reviews have provenance" | this file §2 | owner statement | 2 | owner + date | as "declared by the business" |

---------------------------------------------------------------------------
## 5. Rules for agents (normative — mirrored into each repo's AGENTS.md)

1. Read this file before touching trust-related components.
2. **Never** render class-4/5 content with the strings `verificado`, `opiniones verificadas`,
   `opiniones auditadas`, `confirmed_payment`, `compra confirmada`.
3. To promote a claim to class 1, it must carry a reconciling record: `order_id` present **and**
   status `delivered|fulfilled` (`src/app/api/v1/reviews/route.ts:120-141`), **or** a resolvable
   record from an external source (receipt, platform export, or the asserted legacy system's
   dataset with a reference). An order ID is not the only admissible reference — but *some*
   reference must exist. `legacy_site_migration` / owner attestation alone is **not** a reconciling
   record. Seed scripts must not insert review rows without one.
4. Owner attestation is recorded (§2) and is treated as class 2 — not as independent verification.
5. Do not reverse an existing containment decision without *new* class-1 evidence.
6. Preserve legitimate functionality and UI; correct the claim. Do not blanket-delete components,
   and do not blanket-keep unsupported claims.
7. Escalate contradictions (a claim that implies verification with no record), not the mere
   existence of seeded or hardcoded data.

---------------------------------------------------------------------------
## 6. Buckets after review

- **Restore unchanged (class 3):** brand-only ribbons with no numeric or "verified" claim.
- **Rewrite required (class 5 → 3/2), then may publish:** all ribbons/ratings currently showing a
  star number, review count, or `auditadas/verificadas`. E.g. `"Opinio · declared by the business"`,
  or drop the numbers.
- **Needs verification before publishing (class 5):** any numeric rating/count, any
  `confirmed_payment`/`verified purchase`, the `trust_score` widget payload, and every seeded
  review row presented to the public.
