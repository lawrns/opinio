-- Additive generated-review provenance and persistent publication queue.
-- Existing reviews, orders, invitations and timestamps are not rewritten.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS content_origin VARCHAR(40),
  ADD COLUMN IF NOT EXISTS publication_key VARCHAR(100);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_content_origin_check') THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_content_origin_check
      CHECK (content_origin IS NULL OR content_origin IN ('automated', 'customer_submitted', 'imported')) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_publication_key
  ON reviews(publication_key) WHERE publication_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS review_publication_queue (
  id BIGSERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  dedup_key VARCHAR(64) NOT NULL UNIQUE,
  publication_key VARCHAR(100) NOT NULL UNIQUE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  body TEXT NOT NULL,
  product_name VARCHAR(200),
  verification_level VARCHAR(60) NOT NULL DEFAULT 'unverified_experience'
    CHECK (verification_level = 'unverified_experience'),
  content_origin VARCHAR(40) NOT NULL DEFAULT 'automated'
    CHECK (content_origin = 'automated'),
  source_facts JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(source_facts) = 'array'),
  generation_run_id VARCHAR(100),
  humanized_at TIMESTAMPTZ NOT NULL,
  publish_after TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'claimed', 'published', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  claimed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_review_id INTEGER REFERENCES reviews(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'claimed' OR claimed_at IS NOT NULL),
  CHECK (status <> 'failed' OR last_error IS NOT NULL),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_review_queue_due
  ON review_publication_queue(publish_after, id)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_review_queue_brand_schedule
  ON review_publication_queue(business_id, status, publish_after);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opinio_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON review_publication_queue TO opinio_app';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE review_publication_queue_id_seq TO opinio_app';
  END IF;
END $$;
