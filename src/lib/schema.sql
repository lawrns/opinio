-- ==============================================================================
-- OPINIO.MX: Schema definition for Commercial Trust Passport
-- ==============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  brand_name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(255),
  category VARCHAR(100) NOT NULL DEFAULT 'Retail DTC',
  description TEXT,
  rfc VARCHAR(20),
  clee VARCHAR(50),
  phone VARCHAR(40),
  whatsapp VARCHAR(40),
  domain VARCHAR(200),
  logo_url TEXT,
  banner_url TEXT,
  operating_area VARCHAR(150) DEFAULT 'Nacional (México)',
  claimed BOOLEAN DEFAULT FALSE,
  verified_level VARCHAR(50) DEFAULT 'unverified', -- 'unverified', 'public_info', 'identity_verified', 'connected_orders', 'transparent_coverage'
  trust_score NUMERIC(5, 1) DEFAULT 0.0, -- 0 to 100
  confidence_level VARCHAR(50) DEFAULT 'preliminary', -- 'preliminary', 'established', 'strong', 'very_strong'
  coverage_percentage NUMERIC(5, 1) DEFAULT 0.0, -- e.g. 91.5%
  observed_orders_count INT DEFAULT 0,
  invited_orders_count INT DEFAULT 0,
  issues_per_thousand NUMERIC(5, 1) DEFAULT 0.0,
  resolution_rate NUMERIC(5, 1) DEFAULT 0.0, -- e.g. 82.4%
  median_response_hours NUMERIC(5, 1) DEFAULT 0.0, -- e.g. 4.5 hrs
  reopen_rate NUMERIC(5, 1) DEFAULT 0.0, -- e.g. 2.1%
  effective_reviews_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS identities (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'rfc', 'denue', 'domain', 'phone', 'whatsapp', 'social'
  identifier VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'verified', -- 'verified', 'pending', 'rejected'
  source VARCHAR(100),
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  external_order_id VARCHAR(100) NOT NULL,
  platform VARCHAR(50) DEFAULT 'shopify', -- 'shopify', 'tiendanube', 'woocommerce', 'api', 'manual'
  customer_name VARCHAR(150),
  customer_email VARCHAR(200),
  customer_phone VARCHAR(50),
  amount NUMERIC(10, 2),
  currency VARCHAR(10) DEFAULT 'MXN',
  status VARCHAR(50) DEFAULT 'delivered', -- 'created', 'fulfilled', 'delivered', 'refunded', 'disputed'
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_date TIMESTAMP WITH TIME ZONE,
  invited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  token VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(30) DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'sms'
  recipient_target VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'delivered', -- 'sent', 'delivered', 'opened', 'completed', 'opt_out'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  invitation_id INT REFERENCES invitations(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT NOT NULL,
  author_name VARCHAR(150) NOT NULL,
  author_masked_contact VARCHAR(150),
  verification_level VARCHAR(60) NOT NULL DEFAULT 'confirmed_store_order', 
  -- 'confirmed_payment' (1.00)
  -- 'confirmed_store_order' (0.90)
  -- 'reviewed_proof' (0.75)
  -- 'unverified_experience' (0.35)
  score_weight NUMERIC(4, 2) DEFAULT 0.90,
  integrity_factor NUMERIC(4, 2) DEFAULT 1.00,
  product_name VARCHAR(200),
  status VARCHAR(50) DEFAULT 'published', -- 'published', 'flagged', 'under_review', 'removed'
  upvotes INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_responses (
  id SERIAL PRIMARY KEY,
  review_id INT REFERENCES reviews(id) ON DELETE CASCADE,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  responder_name VARCHAR(150) NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resolution_cases (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  review_id INT REFERENCES reviews(id) ON DELETE SET NULL,
  order_id INT REFERENCES orders(id) ON DELETE SET NULL,
  case_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_contact VARCHAR(150) NOT NULL,
  issue_category VARCHAR(100) NOT NULL, -- 'delay', 'damaged_goods', 'wrong_item', 'refund_pending', 'no_response'
  customer_requested_remedy VARCHAR(100) NOT NULL, -- 'refund', 'replacement', 'compensation', 'clarification'
  status VARCHAR(60) DEFAULT 'opened', 
  -- 'opened', 'acknowledged', 'remedy_offered', 'resolved_consumer_confirmed', 'resolved_merchant_asserted', 'unresolved', 'reopened'
  is_consumer_confirmed BOOLEAN DEFAULT FALSE,
  remedy_offered TEXT,
  resolution_summary TEXT,
  median_first_response_minutes INT DEFAULT 45,
  total_resolution_hours NUMERIC(6, 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS case_messages (
  id SERIAL PRIMARY KEY,
  case_id INT REFERENCES resolution_cases(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL, -- 'consumer', 'merchant', 'mediator'
  sender_name VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS official_records (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  source_name VARCHAR(100) NOT NULL, -- 'PROFECO Buró Comercial', 'INEGI DENUE', 'SAT RFC Validador'
  fact_title VARCHAR(200) NOT NULL,
  fact_detail TEXT NOT NULL,
  record_date VARCHAR(50) NOT NULL,
  source_url TEXT,
  retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS widgets (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  widget_type VARCHAR(50) DEFAULT 'badge', -- 'badge', 'card', 'reassurance', 'carousel'
  allowed_domains TEXT[] DEFAULT '{}',
  theme VARCHAR(20) DEFAULT 'light', -- 'light', 'dark', 'auto'
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
  actor VARCHAR(150) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_domain ON businesses(domain);
CREATE INDEX IF NOT EXISTS idx_businesses_phone ON businesses(phone);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_cases_business_id ON resolution_cases(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_widgets_token ON widgets(token);
