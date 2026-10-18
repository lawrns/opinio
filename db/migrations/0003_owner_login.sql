-- ==============================================================================
-- 0003 First-owner approval and merchant login (B03, issue #29). Additive only.
-- ==============================================================================

-- Platform administrators who may approve first owners. Rows are added only
-- by the designated administrator with scripts/grant-admin.mjs, never by a
-- sign-up, a request field or the first user.
-- Only the first administrator has no granter; every later grant names an
-- existing administrator (enforced by the script) and is audited.
CREATE TABLE IF NOT EXISTS platform_administrators (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_by_user_id INTEGER REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approvals name the documented authority and a restricted reference to the
-- evidence kept elsewhere (for example VER-1042). The reference format leaves
-- no room for contacts or free text. NOT VALID: enforced for every new or
-- updated row without rewriting rows that predate this migration.
ALTER TABLE ownership_approvals ADD COLUMN IF NOT EXISTS authority_basis VARCHAR(30)
  CHECK (authority_basis IN ('legal_representative', 'owner_of_record', 'written_authorization'));
ALTER TABLE ownership_approvals ADD COLUMN IF NOT EXISTS evidence_reference VARCHAR(25)
  CHECK (evidence_reference ~ '^[A-Z]{2,10}-[0-9]{1,12}$');
-- `evidence_subject` names what was checked: the domain for domain_email and
-- dns, or the business's own phone number (E.164) for business_callback.
ALTER TABLE ownership_approvals ADD COLUMN IF NOT EXISTS evidence_subject VARCHAR(253);
DO $$ BEGIN
  ALTER TABLE ownership_approvals ADD CONSTRAINT ownership_approvals_documented
    CHECK (
      authority_basis IS NOT NULL AND evidence_reference IS NOT NULL AND (
        (evidence_method IN ('domain_email', 'dns') AND evidence_subject ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$')
        OR (evidence_method = 'business_callback' AND evidence_subject ~ '^\+[0-9]{8,15}$')
      )
    ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- An administrator can revoke an approval; the owner membership it backs is
-- revoked in the same transaction (owners.ts).
ALTER TABLE ownership_approvals ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE ownership_approvals ADD COLUMN IF NOT EXISTS revoked_by_user_id INTEGER REFERENCES users(id);
DO $$ BEGIN
  ALTER TABLE ownership_approvals ADD CONSTRAINT ownership_approvals_revocation
    CHECK ((revoked_at IS NULL) = (revoked_by_user_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- At most one active owner per business, whatever the code path.
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_memberships_one_active_owner
  ON business_memberships (business_id) WHERE role = 'owner' AND status = 'active';

-- Fixed-window counters for login-link requests. Buckets are hashes
-- (email or client address), never the raw value.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket CHAR(64) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
-- Old windows are deleted as requests arrive (rate-limit.ts).
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits (window_start);
