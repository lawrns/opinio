-- ==============================================================================
-- 0007 Review moderation, rate limit and duplicate detection (BL-04 / OPN-06).
-- Additive only. New public reviews are inserted as 'pending' by the API and
-- become public only when a platform administrator approves them. Existing rows
-- keep their status and get NULL hashes (they are not compared).
-- ==============================================================================

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS body_hash VARCHAR(64);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS author_email_hash VARCHAR(64);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS client_hash VARCHAR(64);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- Rate limit: reviews per hashed client address in the last hour.
CREATE INDEX IF NOT EXISTS idx_reviews_client_created ON reviews (client_hash, created_at) WHERE client_hash IS NOT NULL;
-- Duplicate detection: same normalized body anywhere, same email per business.
CREATE INDEX IF NOT EXISTS idx_reviews_body_hash ON reviews (body_hash) WHERE body_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_email_hash ON reviews (business_id, author_email_hash) WHERE author_email_hash IS NOT NULL;
-- Moderation queue.
CREATE INDEX IF NOT EXISTS idx_reviews_pending ON reviews (created_at) WHERE status = 'pending';
