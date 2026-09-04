import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  calculateOpinioScore,
  ReviewCalculationItem,
  ResolutionMetricsInput,
  CalculatedTrustPassport,
} from '@/lib/scoring';

interface BusinessRow {
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
  operating_area: string | null;
  claimed: boolean;
  verified_level: string;
  trust_score: string | number;
  confidence_level: string;
  coverage_percentage: string | number;
  observed_orders_count: number;
  invited_orders_count: number;
  issues_per_thousand: string | number;
  resolution_rate: string | number;
  median_response_hours: string | number;
  reopen_rate: string | number;
  effective_reviews_count: number;
  created_at: string;
  updated_at: string;
}

interface IdentityRow {
  id: number;
  business_id: number;
  type: string;
  identifier: string;
  status: string;
  source: string | null;
  verified_at: string | null;
  metadata: Record<string, unknown>;
}

interface OfficialRecordRow {
  id: number;
  business_id: number;
  source_name: string;
  fact_title: string;
  fact_detail: string;
  record_date: string;
  source_url: string | null;
  retrieved_at: string;
}

interface ReviewRow {
  id: number;
  business_id: number;
  order_id: number | null;
  invitation_id: number | null;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  author_masked_contact: string | null;
  verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  score_weight: string | number;
  integrity_factor: string | number;
  product_name: string | null;
  status: string;
  upvotes: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

interface ReviewResponseRow {
  id: number;
  review_id: number;
  business_id: number;
  responder_name: string;
  response_text: string;
  created_at: string;
}

interface CaseRow {
  id: number;
  business_id: number;
  review_id: number | null;
  order_id: number | null;
  case_number: string;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  status: string;
  is_consumer_confirmed: boolean;
  remedy_offered: string | null;
  resolution_summary: string | null;
  median_first_response_minutes: number;
  total_resolution_hours: string | number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface CaseMessageRow {
  id: number;
  case_id: number;
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  is_private: boolean;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // 1. Fetch Business
    const bizRes = await query<BusinessRow>(
      'SELECT * FROM businesses WHERE slug = $1 LIMIT 1',
      [slug]
    );

    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio no encontrado con slug: ${slug}` },
        { status: 404 }
      );
    }

    const business = bizRes.rows[0];
    const businessId = business.id;

    // 2. Fetch parallel sub-resources
    const [identitiesRes, recordsRes, reviewsRes, responsesRes, casesRes, messagesRes] =
      await Promise.all([
        query<IdentityRow>(
          'SELECT * FROM identities WHERE business_id = $1 ORDER BY id ASC',
          [businessId]
        ),
        query<OfficialRecordRow>(
          'SELECT * FROM official_records WHERE business_id = $1 ORDER BY record_date DESC, id DESC',
          [businessId]
        ),
        query<ReviewRow>(
          'SELECT * FROM reviews WHERE business_id = $1 ORDER BY created_at DESC',
          [businessId]
        ),
        query<ReviewResponseRow>(
          'SELECT * FROM review_responses WHERE business_id = $1 ORDER BY created_at ASC',
          [businessId]
        ),
        query<CaseRow>(
          'SELECT * FROM resolution_cases WHERE business_id = $1 ORDER BY created_at DESC',
          [businessId]
        ),
        query<CaseMessageRow>(
          `SELECT m.* FROM case_messages m
           INNER JOIN resolution_cases c ON c.id = m.case_id
           WHERE c.business_id = $1
           ORDER BY m.created_at ASC`,
          [businessId]
        ),
      ]);

    // Attach responses to reviews
    const responsesByReviewId = new Map<number, ReviewResponseRow[]>();
    for (const resp of responsesRes.rows) {
      const arr = responsesByReviewId.get(resp.review_id) || [];
      arr.push(resp);
      responsesByReviewId.set(resp.review_id, arr);
    }

    const reviewsWithResponses = reviewsRes.rows.map((rev) => ({
      ...rev,
      score_weight: Number(rev.score_weight) || 0.9,
      integrity_factor: Number(rev.integrity_factor) || 1.0,
      responses: responsesByReviewId.get(rev.id) || [],
    }));

    // Attach messages to cases
    const messagesByCaseId = new Map<number, CaseMessageRow[]>();
    for (const msg of messagesRes.rows) {
      const arr = messagesByCaseId.get(msg.case_id) || [];
      arr.push(msg);
      messagesByCaseId.set(msg.case_id, arr);
    }

    const casesWithMessages = casesRes.rows.map((c) => ({
      ...c,
      total_resolution_hours: c.total_resolution_hours ? Number(c.total_resolution_hours) : null,
      messages: messagesByCaseId.get(c.id) || [],
    }));

    // 3. Live Scoring Engine Calculation
    const nowMs = Date.now();
    const reviewCalculationItems: ReviewCalculationItem[] = reviewsRes.rows.map((r) => {
      const reviewDateMs = new Date(r.created_at).getTime();
      const ageDays = Math.max(0, Math.floor((nowMs - reviewDateMs) / (1000 * 60 * 60 * 24)));
      return {
        rating: r.rating,
        verificationLevel: r.verification_level,
        ageDays,
        integrityFactor: Number(r.integrity_factor) || 1.0,
      };
    });

    const casesCount = casesRes.rows.length;
    const consumerConfirmedCount = casesRes.rows.filter((c) => c.is_consumer_confirmed).length;
    const merchantRespondedCount = casesRes.rows.filter((c) => c.status !== 'opened').length;
    const reopenedCount = casesRes.rows.filter((c) => c.status === 'reopened').length;

    // Calculate median response hours from actual cases if available
    let computedMedianResponseHours = Number(business.median_response_hours) || 4.5;
    if (casesRes.rows.length > 0) {
      const responseHoursList = casesRes.rows
        .filter((c) => c.total_resolution_hours !== null)
        .map((c) => Number(c.total_resolution_hours))
        .sort((a, b) => a - b);
      if (responseHoursList.length > 0) {
        const mid = Math.floor(responseHoursList.length / 2);
        computedMedianResponseHours =
          responseHoursList.length % 2 !== 0
            ? responseHoursList[mid]
            : (responseHoursList[mid - 1] + responseHoursList[mid]) / 2;
      }
    }

    const resolutionInput: ResolutionMetricsInput = {
      casesCount,
      consumerConfirmedCount,
      merchantRespondedCount,
      medianResponseHours: computedMedianResponseHours,
      targetResponseHours: 24,
      reopenedCount,
    };

    const calculatedPassport: CalculatedTrustPassport = calculateOpinioScore(
      reviewCalculationItems,
      resolutionInput,
      business.observed_orders_count || 0,
      business.invited_orders_count || 0
    );

    return NextResponse.json({
      success: true,
      business: {
        ...business,
        trust_score: calculatedPassport.opinioScore,
        confidence_level: calculatedPassport.confidenceLevel,
        coverage_percentage: calculatedPassport.coveragePercentage,
        issues_per_thousand: calculatedPassport.issuesPerThousand,
        resolution_rate: calculatedPassport.resolutionRate,
        median_response_hours: computedMedianResponseHours,
        reopen_rate: casesCount > 0 ? Math.round((reopenedCount / casesCount) * 1000) / 10 : 0,
        effective_reviews_count: Math.round(calculatedPassport.effectiveSampleSize),
      },
      identities: identitiesRes.rows,
      official_records: recordsRes.rows,
      reviews: reviewsWithResponses,
      cases: casesWithMessages,
      live_metrics: calculatedPassport,
    });
  } catch (error) {
    console.error('[api/v1/businesses/[slug]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los detalles del negocio' },
      { status: 500 }
    );
  }
}
