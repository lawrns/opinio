# Authority model (B02)

Issue [#28](https://github.com/lawrns/opinio/issues/28). Policy: [ADR 0001](../adr/0001-separate-buyer-business-and-machine-authority.md), [0002](../adr/0002-manual-first-owner-and-requested-recovery.md), [0003](../adr/0003-auth-policy-defaults.md). Terms: [GLOSSARY.md](../../GLOSSARY.md).

## Records (`db/migrations`)

| Migration | Adds |
|---|---|
| `0001_authjs_identity.sql` | Auth.js `users`, `accounts`, `sessions` (cookie stored as SHA-256), `verification_token` |
| `0002_business_case_machine_authority.sql` | `ownership_approvals`, `business_memberships` (owner/staff, active/revoked), `staff_invitations`, `case_access_tokens`, `case_sessions`, `business_machine_keys`, and `audit_logs.actor_type`/`actor_id` |

Both are additive. They change no existing row and backfill nothing: claimed listings, RFC/CLEE identities and supplied contacts mint no membership. The schema enforces that an owner membership references an approval for that same business and person, that a person has at most one active membership per business, that revoked rows carry a revocation time, and that machine scopes are only `order_events` and `invitations`. Every secret column holds a SHA-256 digest.

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
