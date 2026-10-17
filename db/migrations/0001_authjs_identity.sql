-- ==============================================================================
-- 0001 Auth.js identity records (proven in the B01 spike, issue #27).
-- Tables and columns are the ones @auth/pg-adapter 1.11.3 queries. Additive
-- only: nothing here references or changes the existing Opinio tables, and an
-- Auth.js identity grants no business access on its own.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT
);

-- "sessionToken" holds a SHA-256 hash of the cookie value, never the cookie
-- itself (see src/lib/auth/adapter.ts).
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

-- Auth.js stores SHA-256(token + secret) here, never the emailed token.
CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");
