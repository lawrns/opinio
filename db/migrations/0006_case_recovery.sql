-- ==============================================================================
-- 0006 Requested recovery for pre-B06 cases (B07, issue #33). Additive only.
-- Policy: docs/adr/0005-legacy-case-recovery-manual-review.md.
-- ==============================================================================

-- A buyer's request for access to a case opened before B06. Nothing is sent
-- when it is created: a platform administrator reviews it by hand. The
-- request stores no newly supplied contact; `contact_kind` classifies the
-- case's own stored original contact.
CREATE TABLE IF NOT EXISTS case_recovery_requests (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES resolution_cases(id) ON DELETE CASCADE,
  contact_kind VARCHAR(10) NOT NULL CHECK (contact_kind IN ('email', 'phone', 'ambiguous')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'needs_manual_verification', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by_user_id INTEGER REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  decision_basis VARCHAR(30) CHECK (decision_basis IN ('order_record', 'merchant_record', 'buyer_callback', 'other_documented', 'not_verified')),
  evidence_reference VARCHAR(25) CHECK (evidence_reference ~ '^[A-Z]{2,10}-[0-9]{1,12}$'),
  access_token_id INTEGER REFERENCES case_access_tokens(id),
  CHECK ((status IN ('pending', 'needs_manual_verification')) = (decided_at IS NULL)),
  CHECK ((decided_at IS NULL) = (decided_by_user_id IS NULL)),
  -- An approval names how it was verified and a reference, and only email contacts can be approved.
  CHECK (status <> 'approved' OR (contact_kind = 'email' AND decision_basis IS NOT NULL AND decision_basis <> 'not_verified'
                                  AND evidence_reference IS NOT NULL AND access_token_id IS NOT NULL))
);

-- At most one open request per case: repeated or concurrent requests reuse it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_case_recovery_requests_open
  ON case_recovery_requests (case_id) WHERE status IN ('pending', 'needs_manual_verification');
CREATE INDEX IF NOT EXISTS idx_case_recovery_requests_status ON case_recovery_requests (status, requested_at);
