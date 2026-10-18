-- ==============================================================================
-- 0004 Staff invitations, removal and approved transfers (B04, issue #30).
-- Additive only. Policy: docs/adr/0004-staff-and-transfer-policy.md.
-- ==============================================================================

-- Who revoked an invitation (an owner, or an administrator's transfer).
ALTER TABLE staff_invitations ADD COLUMN IF NOT EXISTS revoked_by_user_id INTEGER REFERENCES users(id);
DO $$ BEGIN
  ALTER TABLE staff_invitations ADD CONSTRAINT staff_invitations_one_outcome
    CHECK (accepted_at IS NULL OR revoked_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE staff_invitations ADD CONSTRAINT staff_invitations_acceptance
    CHECK ((accepted_at IS NULL) = (accepted_user_id IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One pending invitation per business and address; a new one replaces the old.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_invitations_pending
  ON staff_invitations (business_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- A staff membership remembers the invitation it came from.
ALTER TABLE business_memberships ADD COLUMN IF NOT EXISTS staff_invitation_id INTEGER REFERENCES staff_invitations(id);
