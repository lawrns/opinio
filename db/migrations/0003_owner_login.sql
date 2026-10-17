-- ==============================================================================
-- 0003 First-owner approval and merchant login (B03, issue #29). Additive only.
-- ==============================================================================

-- Platform administrators who may approve first owners. Rows are added only
-- by the designated administrator with scripts/grant-admin.mjs, never by a
-- sign-up, a request field or the first user.
CREATE TABLE IF NOT EXISTS platform_administrators (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
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
DO $$ BEGIN
  ALTER TABLE ownership_approvals ADD CONSTRAINT ownership_approvals_documented
    CHECK (authority_basis IS NOT NULL AND evidence_reference IS NOT NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fixed-window counters for login-link requests. Buckets are hashes
-- (email or client address), never the raw value.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket CHAR(64) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
