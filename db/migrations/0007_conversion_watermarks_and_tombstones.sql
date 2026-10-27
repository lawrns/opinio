-- ==============================================================================
-- 0007 Conversion ledger activation watermarks and withdrawn journey tombstones
-- (OPN-CONVERSION-BOOTSTRAP-RECOVERY, OPN-CONVERSION-WITHDRAWAL-RACE).
-- Additive only; safe to apply before or after conversion ledger writers.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS conversion_watermarks (
  stage VARCHAR(40) PRIMARY KEY CHECK (stage IN ('milestone_review_published')),
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS conversion_withdrawn_journeys (
  journey_id VARCHAR(40) PRIMARY KEY CHECK (journey_id ~ '^jrn_[0-9a-f]{32}$'),
  withdrawn_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
