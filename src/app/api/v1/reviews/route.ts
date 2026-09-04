import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  calculateOpinioScore,
  ReviewCalculationItem,
  ResolutionMetricsInput,
  VERIFICATION_WEIGHTS,
} from '@/lib/scoring';

interface ReviewInput {
  business_id: number;
  order_id?: number | null;
  rating: number;
  title?: string;
  body: string;
  author_name: string;
  author_masked_contact?: string;
  verification_level?: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  product_name?: string;
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
  business_slug?: string;
  business_brand_name?: string;
}

interface BusinessStatsRow {
  id: number;
  observed_orders_count: number;
  invited_orders_count: number;
  median_response_hours: string | number;
}

interface CaseStatsRow {
  total: string;
  confirmed: string;
  responded: string;
  reopened: string;
  avg_hours: string | null;
}

interface ReviewItemDb {
  rating: number;
  verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  integrity_factor: string | number;
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReviewInput;

    if (!body.business_id || typeof body.business_id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'El campo business_id es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    if (!body.rating || typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { success: false, error: 'La calificación debe ser un entero entre 1 y 5' },
        { status: 400 }
      );
    }

    if (!body.body || typeof body.body !== 'string' || body.body.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'El texto de la opinión debe tener al menos 5 caracteres' },
        { status: 400 }
      );
    }

    if (!body.author_name || typeof body.author_name !== 'string' || body.author_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre del autor es requerido' },
        { status: 400 }
      );
    }

    // Verify business exists
    const bizRes = await query<BusinessStatsRow>(
      'SELECT id, observed_orders_count, invited_orders_count, median_response_hours FROM businesses WHERE id = $1',
      [body.business_id]
    );

    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio con ID ${body.business_id} no existe` },
        { status: 404 }
      );
    }

    const business = bizRes.rows[0];
    const verificationLevel = body.verification_level || 'unverified_experience';
    const scoreWeight = VERIFICATION_WEIGHTS[verificationLevel] ?? 0.35;
    const integrityFactor = 1.0;

    // Mask author contact if provided or auto-mask name
    let maskedContact = body.author_masked_contact;
    if (!maskedContact) {
      const cleanName = body.author_name.trim().toLowerCase().replace(/\s+/g, '.');
      maskedContact = `${cleanName.slice(0, 2)}***@opinio.mx`;
    }

    // Insert Review
    const insertRes = await query<ReviewRow>(
      `INSERT INTO reviews (
        business_id, order_id, rating, title, body, author_name,
        author_masked_contact, verification_level, score_weight,
        integrity_factor, product_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published')
      RETURNING *`,
      [
        body.business_id,
        body.order_id || null,
        Math.round(body.rating),
        body.title?.trim() || null,
        body.body.trim(),
        body.author_name.trim(),
        maskedContact,
        verificationLevel,
        scoreWeight,
        integrityFactor,
        body.product_name?.trim() || 'Experiencia Comercial',
      ]
    );

    const createdReview = insertRes.rows[0];

    // Recalculate Business Scores
    const [allReviewsRes, caseStatsRes] = await Promise.all([
      query<ReviewItemDb>(
        'SELECT rating, verification_level, integrity_factor, created_at FROM reviews WHERE business_id = $1 AND status = $2',
        [body.business_id, 'published']
      ),
      query<CaseStatsRow>(
        `SELECT 
           COUNT(*)::text as total,
           COUNT(*) FILTER (WHERE is_consumer_confirmed = true)::text as confirmed,
           COUNT(*) FILTER (WHERE status != 'opened')::text as responded,
           COUNT(*) FILTER (WHERE status = 'reopened')::text as reopened,
           AVG(total_resolution_hours)::text as avg_hours
         FROM resolution_cases
         WHERE business_id = $1`,
        [body.business_id]
      ),
    ]);

    const nowMs = Date.now();
    const reviewItems: ReviewCalculationItem[] = allReviewsRes.rows.map((r) => {
      const reviewDateMs = new Date(r.created_at).getTime();
      const ageDays = Math.max(0, Math.floor((nowMs - reviewDateMs) / (1000 * 60 * 60 * 24)));
      return {
        rating: r.rating,
        verificationLevel: r.verification_level,
        ageDays,
        integrityFactor: Number(r.integrity_factor) || 1.0,
      };
    });

    const caseStats = caseStatsRes.rows[0] || {
      total: '0',
      confirmed: '0',
      responded: '0',
      reopened: '0',
      avg_hours: null,
    };

    const casesCount = parseInt(caseStats.total, 10) || 0;
    const consumerConfirmedCount = parseInt(caseStats.confirmed, 10) || 0;
    const merchantRespondedCount = parseInt(caseStats.responded, 10) || 0;
    const reopenedCount = parseInt(caseStats.reopened, 10) || 0;
    const medianResponseHours = caseStats.avg_hours
      ? Number(caseStats.avg_hours)
      : Number(business.median_response_hours) || 4.5;

    const resolutionInput: ResolutionMetricsInput = {
      casesCount,
      consumerConfirmedCount,
      merchantRespondedCount,
      medianResponseHours,
      targetResponseHours: 24,
      reopenedCount,
    };

    const newPassport = calculateOpinioScore(
      reviewItems,
      resolutionInput,
      business.observed_orders_count || 0,
      business.invited_orders_count || 0
    );

    // Update business table with fresh scores
    await query(
      `UPDATE businesses SET
        trust_score = $1,
        confidence_level = $2,
        effective_reviews_count = $3,
        resolution_rate = $4,
        issues_per_thousand = $5,
        updated_at = NOW()
       WHERE id = $6`,
      [
        newPassport.opinioScore,
        newPassport.confidenceLevel,
        Math.round(newPassport.effectiveSampleSize),
        newPassport.resolutionRate,
        newPassport.issuesPerThousand,
        body.business_id,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Opinión registrada y pasaporte recalculado con éxito',
        review: createdReview,
        updated_metrics: newPassport,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/reviews POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar la opinión' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get('business_id');
    const verificationLevel = searchParams.get('verification_level');
    const minRatingParam = searchParams.get('min_rating');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10) || 50));
    const offset = Math.max(0, parseInt(offsetParam || '0', 10) || 0);

    const conditions: string[] = ["r.status = 'published'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (businessIdParam) {
      const businessId = parseInt(businessIdParam, 10);
      if (businessId > 0) {
        conditions.push(`r.business_id = $${paramIndex++}`);
        params.push(businessId);
      }
    }

    if (verificationLevel) {
      conditions.push(`r.verification_level = $${paramIndex++}`);
      params.push(verificationLevel);
    }

    if (minRatingParam) {
      const minRating = parseInt(minRatingParam, 10);
      if (minRating >= 1 && minRating <= 5) {
        conditions.push(`r.rating >= $${paramIndex++}`);
        params.push(minRating);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT r.*, b.slug as business_slug, b.brand_name as business_brand_name
      FROM reviews r
      INNER JOIN businesses b ON b.id = r.business_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const reviewsRes = await query<ReviewRow>(sql, params);

    // Fetch responses for these reviews if any
    const reviewIds = reviewsRes.rows.map((r) => r.id);
    let responsesByReviewId: Record<number, Array<{ id: number; responder_name: string; response_text: string; created_at: string }>> = {};

    if (reviewIds.length > 0) {
      const respRes = await query<{
        id: number;
        review_id: number;
        responder_name: string;
        response_text: string;
        created_at: string;
      }>(
        'SELECT id, review_id, responder_name, response_text, created_at FROM review_responses WHERE review_id = ANY($1::int[])',
        [reviewIds]
      );
      for (const row of respRes.rows) {
        if (!responsesByReviewId[row.review_id]) {
          responsesByReviewId[row.review_id] = [];
        }
        responsesByReviewId[row.review_id].push({
          id: row.id,
          responder_name: row.responder_name,
          response_text: row.response_text,
          created_at: row.created_at,
        });
      }
    }

    const reviewsWithResponses = reviewsRes.rows.map((r) => ({
      ...r,
      score_weight: Number(r.score_weight) || 0.9,
      integrity_factor: Number(r.integrity_factor) || 1.0,
      responses: responsesByReviewId[r.id] || [],
    }));

    return NextResponse.json({
      success: true,
      count: reviewsWithResponses.length,
      limit,
      offset,
      reviews: reviewsWithResponses,
    });
  } catch (error) {
    console.error('[api/v1/reviews GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar las opiniones' },
      { status: 500 }
    );
  }
}
