# Integration keys (B05)

Issue [#31](https://github.com/lawrns/opinio/issues/31). An approved owner issues keys on their business screen (`/cuenta/negocios/[id]`, "Claves de integración"). Code: `src/lib/authz/keys.ts`; checks: `authorizeMachineKey` in `src/lib/authz/index.ts`.

- **Format:** `opk_<prefix>_<secret>`, with the secret 32 random bytes. Only the SHA-256 of the whole key and the display prefix are stored. The key is shown once, in the response to the owner's own request; it is never put in a URL, in browser storage or in a log.
- **Scope:** one business, plus at least one of `order_events` and `invitations`. The business always comes from the key. A `business_id` or record ID (such as `order_id`) sent by the caller is only compared with it, and a mismatch is denied as if the record didn't exist.
- **Lifecycle:** owners revoke a key, or rotate it (a new key with the same name and scopes; the old one stops working in the same transaction). A business holds at most 10 active keys. A transfer or approval revocation revokes every key of the business (ADR 0004).
- **Not a login:** a key never opens the merchant account, the admin screens or a buyer case.

Real order and invitation writes stay contained until their own tickets reopen them. Until then the only operations that accept a key are the synthetic test endpoints (404 unless `OPINIO_AUTH_SPIKE=1`, which is never set in production).

## Example (placeholders only)

```sh
# OPINIO_KEY is stored in your system's secret manager; never commit it or log the header.
curl -sS -X POST "https://<opinio-host>/<endpoint-reopened-by-its-ticket>" \
  -H "Authorization: Bearer $OPINIO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"order_id": <your-order-id>}'
```

`401` means the key is missing, unknown, tampered with or revoked. `404` means the key lacks the scope, or the record belongs to another business or doesn't exist.
