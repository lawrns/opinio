<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:trust-provenance -->
# Trust components — read `TRUST_PROVENANCE.md` first

Before touching any rating, review, review count, verification badge, or prestige ribbon in this
repo (and the portfolio sites that consume Opinio widgets — Barri, Doctor.mx, Hablo, GoGym,
Locomotion, Bien, Locoreal), read `TRUST_PROVENANCE.md`. It defines the five provenance classes,
records the owner attestation with its limits, and holds the claim-level ledger.

Non-negotiable summary: never render class-4/5 content with the strings `verificado`,
`opiniones verificadas`, `opiniones auditadas`, `confirmed_payment`, or `compra confirmada`. A
review becomes class 1 only with a reconciling record (`order_id` present and status
`delivered|fulfilled`, `src/app/api/v1/reviews/route.ts:120-141`) or an external receipt; the seed
scripts must not bypass that path. Owner attestation is class 2, not independent verification.
Owner attestation (incl. provenance_source `legacy_site_migration`) is class 2, not independent
verification and not a reconciling record. Do not reverse a containment decision without new
class-1 evidence.
<!-- END:trust-provenance -->
