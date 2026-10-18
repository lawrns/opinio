# Authority model (B02–B06)

Issues [#28](https://github.com/lawrns/opinio/issues/28), [#29](https://github.com/lawrns/opinio/issues/29) and [#30](https://github.com/lawrns/opinio/issues/30). Policy: [ADR 0001](../adr/0001-separate-buyer-business-and-machine-authority.md), [0002](../adr/0002-manual-first-owner-and-requested-recovery.md), [0003](../adr/0003-auth-policy-defaults.md). Terms: [GLOSSARY.md](../../GLOSSARY.md).

## Records (`db/migrations`)

| Migration | Adds |
|---|---|
| `0001_authjs_identity.sql` | Auth.js `users`, `accounts`, `sessions` (cookie stored as SHA-256), `verification_token` |
| `0002_business_case_machine_authority.sql` | `ownership_approvals`, `business_memberships` (owner/staff, active/revoked), `staff_invitations`, `case_access_tokens`, `case_sessions`, `business_machine_keys`, and `audit_logs.actor_type`/`actor_id` |
| `0003_owner_login.sql` | `platform_administrators` (with granter), approval `evidence_subject` / `authority_basis` / `evidence_reference` and revocation columns, one active owner per business (partial unique index), `auth_rate_limits` |
| `0004_staff_and_transfer.sql` | staff invitation revocation (`revoked_by_user_id`), one pending invitation per business and address, `business_memberships.staff_invitation_id` |
| `0005_buyer_case_access.sql` | `resolution_cases.access_email` and `submission_key` (unique per business), transport outcome on `case_access_tokens` |

All are additive. They change no existing row and backfill nothing: claimed listings, RFC/CLEE identities and supplied contacts mint no membership. The schema enforces that an owner membership references an approval for that same business and person, that a person has at most one active membership per business, that revoked rows carry a revocation time, and that machine scopes are only `order_events` and `invitations`. Every secret column holds a SHA-256 digest.

```sh
DATABASE_URL=postgres://… node scripts/migrate-auth.mjs          # dry run: lists pending, writes nothing
DATABASE_URL=postgres://… node scripts/migrate-auth.mjs --apply  # applies under an advisory lock
# a non-local host also needs --confirm-host=<that host>; the designated administrator runs it
```

There is no default database. Running it against production needs the designated administrator. Nothing runs these migrations on deploy: no build step, Dockerfile, start script or CI hook calls them, so they must be applied by hand before code that needs them ships.

## Checks (`src/lib/authz`)

| Function | Principal | Grants |
|---|---|---|
| `authorizeMerchant` | Auth.js user ID from the server session | `permission` on a resource, only through an active membership in the resource's **stored** business |
| `listMemberBusinesses` | same | the business selector: active memberships only, no fallback |
| `authorizeCaseSession` | buyer case-session cookie | one case, while unrevoked and `now < expires_at` |
| `authorizeMachineKey` | `Authorization: Bearer opk_…` | one scope within the key's own business; a different claimed business is denied |
| `recordAuditEvent` | any | appends a controlled action with `actor_type`/`actor_id`; details are IDs and flags only |

Every call reads Postgres, so a revoked membership, session or key fails on the next request. A missing resource and another business's resource both raise `AccessDenied`, which `authzErrorResponse` returns as one 404. Database failures become a bare `AuthorityUnavailable` (503) that logs only the error code. Auth.js swallows a failed session lookup as "no session", so when a session cookie was sent and none came back, `currentMerchantUserId` probes the store and raises the same 503; Auth.js's own error log is reduced to the error type and code. Staff hold `read_operational`, `reply`, `offer_remedy` and `create_invitation`. Owners also hold `manage_settings`, `manage_widgets`, `manage_staff` and `manage_keys`. Any other role value allows nothing.

## Test surfaces

`/api/spike/authz/businesses/[id]` (member read, owner write), `/api/spike/authz/cases/[id]` (buyer read) and `/api/spike/authz/order-events` (machine write) exist only with `OPINIO_AUTH_SPIKE=1` and return 404 otherwise. No containment or merchant operation is reopened here; B08–B15 reopen operations one at a time.

`pnpm test:e2e` runs the migration upgrade over synthetic legacy data and the HTTP denial matrix. The suite asserts from Postgres's own statement log that denied requests run no private query or write.

## Merchant login and first owners (B03)

Everything here is 404 unless `OPINIO_MERCHANT_AUTH=1`.

| Step | Where | Guard |
|---|---|---|
| Request a link | `/acceso` server action | `parseEmail` checks length before any pattern; rate limits per client (10), per client and email (3) and per email (10) every 15 minutes, client counted first; same answer for every outcome |
| Open the link | `/acceso/confirmar#token=…&email=…` | the fragment never reaches the server; the page strips it and loads no analytics |
| Exchange | `POST /acceso/confirmar/entrar` | same-origin only (`Sec-Fetch-Site`, else `Origin`); calls Auth.js's callback in-process so the token never appears in a request URL |
| Closed to outside callers | `POST /api/auth/signin/*`, `GET /api/auth/callback/nodemailer` | 404, so links can't be requested around the rate limits or exchanged by URL |
| Account | `/cuenta`, `/cuenta/negocios/[id]` | `listMemberBusinesses` / `authorizeMerchant` on every request |
| Approve or revoke a first owner | `/admin/aprobaciones` | platform administrators only (404 otherwise); `approveFirstOwner` and `revokeOwnerApproval` run in one transaction each and are audited |
| Grant an administrator | `scripts/grant-admin.mjs` | outside the app only; after the first, names an existing administrator as granter; audited; remote hosts need `--confirm-host` |

An approval records how control was checked (`domain_email`, `dns` or `business_callback`), what was checked (the domain, or the business's own phone in E.164), the documented authority and a restricted evidence reference such as `VER-1042`. Revoking it revokes the owner membership it backs, so access ends on the next request.

The per-client limit keys on the last `X-Forwarded-For` entry, which the single reverse proxy in front of the app appends. With more than one proxy, or none, that assumption must be revisited before production.

## Staff and transfers (B04)

Policy: [ADR 0004](../adr/0004-staff-and-transfer-policy.md). Code: `src/lib/authz/staff.ts`, `approveOwnershipTransfer` in `src/lib/authz/owners.ts`.

| Operation | Who | Effect |
|---|---|---|
| `createStaffInvitation` | active owner (`manage_staff`) | hashed 24 h single-use invitation bound to business and email; neutral email with a fragment link to `/cuenta/invitacion` |
| `acceptStaffInvitation` | signed-in user whose login email matches | staff membership, only while the inviter is still the active owner; same-origin `POST /cuenta/invitacion/aceptar` |
| `revokeStaffInvitation`, `removeStaffMembership` | active owner | pending invitation withdrawn / staff access ends on the next request; owners are never removed here |
| `approveOwnershipTransfer` | platform administrator | revokes every approval, membership (staff included), pending invitation and machine key of that business, each with its own audit row, then records the transfer and the new owner; the form warns the administrator first |

Revoking an owner's approval (`revokeOwnerApproval`) ends the same authority as a transfer, and `approveFirstOwner` refuses a business that still has any active access. Each runs in one transaction that locks the business row first, and is audited. Invitation emails are limited to 10 per business per 15 minutes.

## Buyer case access (B06)

Issue [#32](https://github.com/lawrns/opinio/issues/32). Everything here is behind `OPINIO_BUYER_PROOF=1`; with it off, case creation is unchanged and the new routes return 404. Code: `src/lib/authz/buyer-access.ts`, `src/lib/auth/case-email.ts`.

| Step | Where | Guard |
|---|---|---|
| Open a case | `POST /api/v1/cases` | a required private `access_email` and an optional phone that is never emailed; at most 5 new cases per client address and 3 per access email every 15 minutes (429, with no case and no email past the limit); case, first message and a hashed 15-minute token are written in one transaction; a repeated `submission_key` returns the same case, with no second message or email, and reports whether the first email was accepted; the response never carries the token |
| Email | `sendCaseAccessLink` | neutral text and a link to `/caso/acceso#token=…` (fragment only), sent to the access email only; the transport's answer is recorded (`transport_accepted_at` / `transport_failed_at`), and acceptance is not counted as delivery |
| Open the link | `/caso/acceso` | strips the fragment and loads no analytics; previews and prefetches consume nothing |
| Exchange | `POST /caso/acceso/entrar` | same-origin only; a conditional UPDATE lets one exchange win; creates a 7-day revocable session for that one case (`opinio_case_<id>` cookie, HttpOnly, SameSite=Lax, `__Host-` over HTTPS); clean redirect to `/caso/<id>` |
| Proof | `GET /api/v1/cases/<id>/acceso`, `/caso/<id>` | `authorizeCaseSession`: that case's live session only |
| Leave | `POST /caso/acceso/salir` | revokes the session server-side and clears the cookie |
| Resend | `/caso/acceso/reenviar` | the same answer for every input; sends to the stored access email only when the case number and address match; retires earlier unused links; at most 3 per case and 10 per client address every 15 minutes |

Buyer messages (`POST /api/v1/cases/<id>/messages` as consumer) need the session for the case they resolve to, by id or case number, from the same origin; the sender is always that case's buyer.

Per-client limits (case creation, resend) key on the last `X-Forwarded-For` entry, as merchant login does. Without exactly one appending reverse proxy, every caller shares one `unknown` bucket. That's a deployment prerequisite.

Nothing here confirms, reopens or otherwise changes a case. Buyer confirmation stays blocked until its own ticket.

