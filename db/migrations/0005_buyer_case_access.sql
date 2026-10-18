-- ==============================================================================
-- 0005 Buyer case access (B06, issue #32). Additive only.
-- ==============================================================================

-- New cases record a separate private access email (the only address an
-- access link is ever sent to). Existing rows keep NULL: no retroactive
-- campaign, and legacy phone-or-email contacts are never reinterpreted.
ALTER TABLE resolution_cases ADD COLUMN IF NOT EXISTS access_email VARCHAR(254);

-- A client-generated key per form submission, so a retried submission returns
-- the same case instead of creating a second case, message or email.
ALTER TABLE resolution_cases ADD COLUMN IF NOT EXISTS submission_key VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uq_resolution_cases_submission
  ON resolution_cases (business_id, submission_key) WHERE submission_key IS NOT NULL;

-- What the mail transport said about each link. Accepted is not delivered:
-- these record only the transport's answer.
ALTER TABLE case_access_tokens ADD COLUMN IF NOT EXISTS transport_accepted_at TIMESTAMPTZ;
ALTER TABLE case_access_tokens ADD COLUMN IF NOT EXISTS transport_failed_at TIMESTAMPTZ;
