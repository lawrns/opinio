# B01 — Auth.js email login on the exact Next 16 stack

Issue [#27](https://github.com/lawrns/opinio/issues/27), parent spec [#26](https://github.com/lawrns/opinio/issues/26). Run on 2026-10-17 against `main` 6147999.

## Verdict

**Supported**, with the findings below. Auth.js email login, Postgres database sessions, a protected route handler and a protected server action all work on the built standalone app, and session deletion, sign-out and expiry deny the very next route and action request. No framework change was needed.

## Versions

| Package | Version | Source |
|---|---|---|
| next | 16.3.4 | baseline, unchanged |
| react / react-dom | 19.2.8 | baseline, unchanged |
| pg | 8.23.0 | baseline, unchanged |
| pnpm | 10.14.0 | `packageManager`, unchanged |
| next-auth | 5.0.0-beta.32 (exact) | new |
| @auth/pg-adapter | 1.11.3 (exact) | new |
| @auth/core | 0.41.3 | transitive; both packages above pin this same version |
| nodemailer | 8.0.11 (exact) | new; next-auth peer range is `^7.0.7 \|\| ^8.0.5`, so 10.x is out of range |

Test-only: embedded-postgres 16.14.0-beta.17 (PostgreSQL 16.14), smtp-server 3.19.23, mailparser 3.9.40.

next-auth v5 is still published as a beta. 4.24.15 is the latest stable release, but v5 is the line Auth.js documents for the App Router and provides the `auth()` helper used here in route handlers and server actions. Treat the exact pin as deliberate and re-run this suite before any upgrade.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm test:e2e          # builds into .next-e2e, then runs src/test/e2e/authjs-spike.e2e.test.ts
pnpm test              # unit suite, includes src/lib/auth/adapter.test.ts
```

The e2e suite starts a throwaway PostgreSQL 16 on 127.0.0.1 in a temp directory, a local SMTP sink that only records mail, and the built `standalone/server.js` exactly as the Dockerfile runs it. It uses a random per-run `AUTH_SECRET` and `@example.test` recipients. It cannot reach the production database or deliver mail.

## What is proven (all over real HTTP)

- Email login: CSRF-protected sign-in POST → mail captured by the sink → callback GET → `sessions` row → session cookie.
- A protected route handler (`/api/spike/auth/session`) and a real server action (the `/spike/auth` form, invoked by its rendered action ID) both succeed with the session and write nothing without one.
- Deleting the session row, signing out, or session expiry denies the next route and action request, including an action ID taken from a page rendered before revocation (already open tab).
- Logged-out, tampered-cookie and stored-hash-as-cookie requests are denied.
- A replayed link and an expired link fail with `Verification` and create no session. The exact expiry instant is pinned with a controlled clock in `src/lib/auth/adapter.test.ts`. Of two concurrent exchanges of one link, exactly one gets a session.
- A cross-origin server action POST is aborted by Next (`Origin` ≠ `Host`/`X-Forwarded-Host`). Sign-in and sign-out POSTs without the Auth.js CSRF token send no mail and keep the session.
- Behind a TLS-terminating proxy (`AUTH_URL=https://…`, `X-Forwarded-Proto: https`), cookies are `__Secure-authjs.session-token; Secure; HttpOnly; SameSite=Lax; Path=/` with no `Domain` (host-only), and links stay on `AUTH_URL` even with a forged `X-Forwarded-Host`.
- With the switch off (the production default), every auth and spike path returns 404.
- Server logs from every run contain no email-link token, session cookie, stored token or session hash, secret or recipient address. Failed callbacks log only `[auth][error] Verification: Read more at …`.

## Findings

1. **Session tokens are stored raw by @auth/pg-adapter.** Fixed in the spike by `strictAdapter` (`src/lib/auth/adapter.ts`), which stores SHA-256 of the cookie. Email-link tokens are already stored as SHA-256(token + secret) by Auth.js.
2. **Auth.js treats the expiry instant as still valid** (`expires < now`). The spec defines expired as `now >= expires`. `strictAdapter` enforces that for links and sessions.
3. **Database sessions roll forward by default** (`updateAge`). The spec requires 7 absolute days. `strictAdapter.updateSession` never extends.
4. **The Nodemailer provider throws at module load without a mail server**, which breaks `next build`. The config is built lazily per request (`NextAuth(() => config)`).
5. **`AUTH_URL` is a required production setting.** Without it the standalone server puts its bind address in the emailed link (for example `localhost:3000`). That is not attacker-controlled, but the link does not work.
6. **Any GET of the callback link consumes it.** HEAD is rejected without consuming it, but a mail scanner that follows links with GET burns the link before the merchant clicks. The link also carries the token and email address in the query string, so a proxy access log that records query strings captures both. Mitigation for B03: point the email at a first-party interstitial page that requires a deliberate click before calling the callback, and have the administrator confirm query-string redaction for `/api/auth/callback/*` at the proxy.
7. **The default Auth.js error logger prints stack traces.** No token or address appeared in any run. Review again when custom callbacks are added.

## Deployment uncertainty

- **Standalone (Dockerfile/Coolify shape):** covered above. The proxy must forward `X-Forwarded-Proto: https` and `X-Forwarded-Host`, or `serverActions.allowedOrigins` must list the public host.
- **Docker image:** the `deps` stage installs every dependency, test-only ones included (embedded-postgres, smtp-server, mailparser), because `next build` needs dev dependencies. The stage does not copy `pnpm-workspace.yaml`, so the embedded-postgres postinstall does not run there, and nothing at build time uses it. The runtime image copies only the traced standalone output, whose `node_modules` holds `next`, `pg`, `react` and `react-dom` (checked in `.next-e2e/standalone/node_modules`). No test dependency ships at runtime.
- **Netlify:** not exercised. The repository references Netlify analytics, but Netlify's Next runtime, its forwarded headers and its log handling of callback query strings were not tested here. Run this suite's checks against a Netlify preview before relying on that deployment shape.

## Production stop

Ready except prod config. Still unresolved user dependencies: the production email sender, and the production secrets administrator who owns `AUTH_SECRET`, `AUTH_URL` and the mail credentials. `OPINIO_AUTH_SPIKE` stays unset in production, and no merchant operation or containment switch is changed.
