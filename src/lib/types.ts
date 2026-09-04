export type VerificationLevel =
  | 'unverified'
  | 'public_info'
  | 'identity_verified'
  | 'connected_orders'
  | 'transparent_coverage';

export type ConfidenceLevel =
  | 'preliminary'
  | 'established'
  | 'strong'
  | 'very_strong';

export type ReviewVerificationLevel =
  | 'confirmed_payment'
  | 'confirmed_store_order'
  | 'reviewed_proof'
  | 'unverified_experience';

export type CaseStatus =
  | 'opened'
  | 'acknowledged'
  | 'remedy_offered'
  | 'resolved_consumer_confirmed'
  | 'resolved_merchant_asserted'
  | 'unresolved'
  | 'reopened';

export type IssueCategory =
  | 'delay'
  | 'damaged_goods'
  | 'wrong_item'
  | 'refund_pending'
  | 'no_response';

export type RequestedRemedy =
  | 'refund'
  | 'replacement'
  | 'compensation'
  | 'clarification';

export interface Business {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  description: string | null;
  rfc: string | null;
  clee: string | null;
  phone: string | null;
  whatsapp: string | null;
  domain: string | null;
  logo_url: string | null;
  banner_url: string | null;
  operating_area: string;
  claimed: boolean;
  verified_level: VerificationLevel;
  trust_score: number | string;
  confidence_level: ConfidenceLevel;
  coverage_percentage: number | string;
  observed_orders_count: number;
  invited_orders_count: number;
  issues_per_thousand: number | string;
  resolution_rate: number | string;
  median_response_hours: number | string;
  reopen_rate: number | string;
  effective_reviews_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessIdentity {
  id: number;
  business_id: number;
  type: 'rfc' | 'denue' | 'domain' | 'phone' | 'whatsapp' | 'social';
  identifier: string;
  status: 'verified' | 'pending' | 'rejected';
  source: string | null;
  verified_at: string;
  metadata?: Record<string, unknown>;
}

export interface Review {
  id: number;
  business_id: number;
  order_id: number | null;
  invitation_id: number | null;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  author_masked_contact: string | null;
  verification_level: ReviewVerificationLevel;
  score_weight: number | string;
  integrity_factor: number | string;
  product_name: string | null;
  status: 'published' | 'flagged' | 'under_review' | 'removed';
  upvotes: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  response?: ReviewResponse | null;
}

export interface ReviewResponse {
  id: number;
  review_id: number;
  business_id: number;
  responder_name: string;
  response_text: string;
  created_at: string;
}

export interface ResolutionCase {
  id: number;
  business_id: number;
  review_id: number | null;
  order_id: number | null;
  case_number: string;
  customer_name: string;
  customer_contact: string;
  issue_category: IssueCategory;
  customer_requested_remedy: RequestedRemedy;
  status: CaseStatus;
  is_consumer_confirmed: boolean;
  remedy_offered: string | null;
  resolution_summary: string | null;
  median_first_response_minutes: number;
  total_resolution_hours: number | string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  messages?: CaseMessage[];
  review?: Review | null;
}

export interface CaseMessage {
  id: number;
  case_id: number;
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  is_private: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  business_id: number;
  external_order_id: string;
  platform: 'shopify' | 'tiendanube' | 'woocommerce' | 'api' | 'manual';
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number | string | null;
  currency: string;
  status: 'created' | 'fulfilled' | 'delivered' | 'refunded' | 'disputed';
  order_date: string;
  delivered_date: string | null;
  invited: boolean;
  created_at: string;
}

export interface Invitation {
  id: number;
  business_id: number;
  order_id: number | null;
  token: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipient_target: string;
  status: 'sent' | 'delivered' | 'opened' | 'completed' | 'opt_out';
  sent_at: string;
  completed_at: string | null;
  order_external_id?: string;
  customer_name?: string;
}

export interface WidgetConfig {
  style?: 'badge' | 'card' | 'reassurance' | 'qr' | 'pill' | 'floating';
  theme?: 'light' | 'dark' | 'auto';
  showScore?: boolean;
  showCoverage?: boolean;
  showReviews?: boolean;
  placement?: string;
  accentColor?: string;
  [key: string]: unknown;
}

export interface Widget {
  id: number;
  business_id: number;
  token: string;
  widget_type: 'badge' | 'card' | 'reassurance' | 'carousel';
  allowed_domains: string[];
  theme: 'light' | 'dark' | 'auto';
  config: WidgetConfig;
  is_active: boolean;
  created_at: string;
}

export interface OfficialRecord {
  id: number;
  business_id: number;
  source_name: string;
  fact_title: string;
  fact_detail: string;
  record_date: string;
  source_url: string | null;
  retrieved_at: string;
}
