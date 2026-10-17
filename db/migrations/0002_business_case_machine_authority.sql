-- ==============================================================================
-- 0002 Authority records (B02, issue #28). Additive only.
--
-- Business access comes from an approved, active membership, never from
-- businesses.claimed, RFC/CLEE identities or supplied contacts. No row here is
-- backfilled from existing data. Every secret column stores a SHA-256 hex
-- digest of a random token; raw tokens are never persisted.
-- Keys are INTEGER to match businesses.id, users.id and resolution_cases.id.
-- ==============================================================================

-- Administrator decisions that grant first-owner or transferred-owner
-- authority. `evidence_method` names how control was independently verified;
-- contact details and documents stay out of this table.
CREATE TABLE IF NOT EXISTS ownership_approvals (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subject_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('first_owner', 'transfer')),
  evidence_method VARCHAR(30) NOT NULL CHECK (evidence_method IN ('domain_email', 'dns', 'business_callback')),
  previous_owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id INTEGER NOT NULL REFERENCES users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind = 'transfer' OR previous_owner_user_id IS NULL),
  -- Target of the membership FK below: an approval names one business and person.
  UNIQUE (id, business_id, subject_user_id)
);

CREATE TABLE IF NOT EXISTS business_memberships (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'staff')),
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  approval_id INTEGER,
  granted_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id INTEGER REFERENCES users(id),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  -- An owner membership exists only through a recorded approval, and that
  -- approval must be for this same business and person.
  CHECK (role <> 'owner' OR approval_id IS NOT NULL),
  FOREIGN KEY (approval_id, business_id, user_id)
    REFERENCES ownership_approvals (id, business_id, subject_user_id)
);
-- At most one active membership per person and business.
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_memberships_active
  ON business_memberships (business_id, user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_business_memberships_user ON business_memberships (user_id) WHERE status = 'active';

-- Owner-issued, single-use staff invitations bound to the intended email.
CREATE TABLE IF NOT EXISTS staff_invitations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'staff' CHECK (role = 'staff'),
  token_hash CHAR(64) NOT NULL UNIQUE,
  invited_by_user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_user_id INTEGER REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_business ON staff_invitations (business_id);

-- Single-use buyer access links for exactly one case.
CREATE TABLE IF NOT EXISTS case_access_tokens (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES resolution_cases(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  purpose VARCHAR(10) NOT NULL DEFAULT 'access' CHECK (purpose IN ('access', 'recovery')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_access_tokens_case ON case_access_tokens (case_id);

-- Revocable buyer sessions, each scoped to one case.
CREATE TABLE IF NOT EXISTS case_sessions (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES resolution_cases(id) ON DELETE CASCADE,
  session_hash CHAR(64) NOT NULL UNIQUE,
  access_token_id INTEGER REFERENCES case_access_tokens(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_sessions_case ON case_sessions (case_id);

-- Business-bound integration keys with an explicit scope list.
CREATE TABLE IF NOT EXISTS business_machine_keys (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label VARCHAR(80) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  key_hash CHAR(64) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL CHECK (
    cardinality(scopes) > 0 AND scopes <@ ARRAY['order_events', 'invitations']::TEXT[]
  ),
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id INTEGER REFERENCES users(id),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_business_machine_keys_business ON business_machine_keys (business_id);

-- Trusted actor identity for the existing audit history. The legacy `actor`
-- label stays for old rows; new authority events also set these columns.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20)
  CHECK (actor_type IN ('merchant_user', 'administrator', 'buyer_case_session', 'machine_key', 'system'));
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id INTEGER;
