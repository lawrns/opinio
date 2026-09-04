import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  calculateOpinioScore,
  ReviewCalculationItem,
  ResolutionMetricsInput,
} from '@/lib/scoring';

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
  business_slug?: string;
  business_brand_name?: string;
  business_logo_url?: string | null;
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

interface CasePatchInput {
  status?: string;
  remedy_offered?: string;
  resolution_summary?: string;
  is_consumer_confirmed?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identificador de caso requerido' },
        { status: 400 }
      );
    }

    const isNumeric = /^\d+$/.test(identifier);
    const caseSql = isNumeric
      ? `SELECT c.*, b.slug as business_slug, b.brand_name as business_brand_name, b.logo_url as business_logo_url
         FROM resolution_cases c
         INNER JOIN businesses b ON b.id = c.business_id
         WHERE c.id = $1 OR c.case_number = $2
         LIMIT 1`
      : `SELECT c.*, b.slug as business_slug, b.brand_name as business_brand_name, b.logo_url as business_logo_url
         FROM resolution_cases c
         INNER JOIN businesses b ON b.id = c.business_id
         WHERE c.case_number = $1
         LIMIT 1`;
    const caseParams = isNumeric ? [parseInt(identifier, 10), identifier] : [identifier];
    const caseRes = await query<CaseRow>(caseSql, caseParams);

    if (caseRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Caso no encontrado con identificador: ${identifier}` },
        { status: 404 }
      );
    }

    const caseData = caseRes.rows[0];

    // Fetch messages
    const messagesRes = await query<CaseMessageRow>(
      'SELECT * FROM case_messages WHERE case_id = $1 ORDER BY created_at ASC',
      [caseData.id]
    );

    return NextResponse.json({
      success: true,
      case: {
        ...caseData,
        total_resolution_hours: caseData.total_resolution_hours ? Number(caseData.total_resolution_hours) : null,
        messages: messagesRes.rows,
      },
    });
  } catch (error) {
    console.error('[api/v1/cases/[id] GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar el caso' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Identificador de caso requerido' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CasePatchInput;
    const isNumeric = /^\d+$/.test(identifier);
    const findSql = isNumeric
      ? `SELECT * FROM resolution_cases
         WHERE id = $1 OR case_number = $2
         LIMIT 1`
      : `SELECT * FROM resolution_cases
         WHERE case_number = $1
         LIMIT 1`;
    const findParams = isNumeric ? [parseInt(identifier, 10), identifier] : [identifier];
    const findRes = await query<CaseRow>(findSql, findParams);

    if (findRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Caso no encontrado: ${identifier}` },
        { status: 404 }
      );
    }

    const currentCase = findRes.rows[0];
    const caseId = currentCase.id;
    const businessId = currentCase.business_id;

    // Determine status & resolution state
    let newStatus = body.status || currentCase.status;
    let isConfirmed = body.is_consumer_confirmed ?? currentCase.is_consumer_confirmed;

    if (body.is_consumer_confirmed === true || newStatus === 'resolved_consumer_confirmed') {
      isConfirmed = true;
      newStatus = 'resolved_consumer_confirmed';
    }

    const remedyOffered = body.remedy_offered !== undefined ? body.remedy_offered : currentCase.remedy_offered;
    const resolutionSummary = body.resolution_summary !== undefined ? body.resolution_summary : currentCase.resolution_summary;

    let resolvedAtClause = '';
    const updateParams: unknown[] = [newStatus, isConfirmed, remedyOffered, resolutionSummary];
    let paramIndex = 5;

    if (isConfirmed && !currentCase.resolved_at) {
      resolvedAtClause = ', resolved_at = NOW(), total_resolution_hours = GREATEST(1.0, ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0, 1))';
    }

    const updateSql = `
      UPDATE resolution_cases
      SET status = $1,
          is_consumer_confirmed = $2,
          remedy_offered = $3,
          resolution_summary = $4,
          updated_at = NOW()
          ${resolvedAtClause}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    updateParams.push(caseId);

    const updateRes = await query<CaseRow>(updateSql, updateParams);
    const updatedCase = updateRes.rows[0];

    // If consumer confirmed, recalculate business resolution & trust scores
    if (isConfirmed) {
      const [businessRes, allReviewsRes, caseStatsRes] = await Promise.all([
        query<{ id: number; observed_orders_count: number; invited_orders_count: number }>(
          'SELECT id, observed_orders_count, invited_orders_count FROM businesses WHERE id = $1',
          [businessId]
        ),
        query<{ rating: number; verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience'; integrity_factor: string | number; created_at: string }>(
          'SELECT rating, verification_level, integrity_factor, created_at FROM reviews WHERE business_id = $1 AND status = $2',
          [businessId, 'published']
        ),
        query<{ total: string; confirmed: string; responded: string; reopened: string; avg_hours: string | null }>(
          `SELECT 
             COUNT(*)::text as total,
             COUNT(*) FILTER (WHERE is_consumer_confirmed = true)::text as confirmed,
             COUNT(*) FILTER (WHERE status != 'opened')::text as responded,
             COUNT(*) FILTER (WHERE status = 'reopened')::text as reopened,
             AVG(total_resolution_hours)::text as avg_hours
           FROM resolution_cases
           WHERE business_id = $1`,
          [businessId]
        ),
      ]);

      if (businessRes.rows.length > 0) {
        const b = businessRes.rows[0];
        const stats = caseStatsRes.rows[0];
        const casesCount = parseInt(stats.total, 10) || 0;
        const confirmedCount = parseInt(stats.confirmed, 10) || 0;
        const respondedCount = parseInt(stats.responded, 10) || 0;
        const reopenedCount = parseInt(stats.reopened, 10) || 0;
        const medianHours = stats.avg_hours ? Number(stats.avg_hours) : 4.5;

        const nowMs = Date.now();
        const reviewItems: ReviewCalculationItem[] = allReviewsRes.rows.map((r) => ({
          rating: r.rating,
          verificationLevel: r.verification_level,
          ageDays: Math.max(0, Math.floor((nowMs - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))),
          integrityFactor: Number(r.integrity_factor) || 1.0,
        }));

        const resolutionInput: ResolutionMetricsInput = {
          casesCount,
          consumerConfirmedCount: confirmedCount,
          merchantRespondedCount: respondedCount,
          medianResponseHours: medianHours,
          targetResponseHours: 24,
          reopenedCount,
        };

        const newPassport = calculateOpinioScore(
          reviewItems,
          resolutionInput,
          b.observed_orders_count || 0,
          b.invited_orders_count || 0
        );

        await query(
          `UPDATE businesses SET
            trust_score = $1,
            confidence_level = $2,
            resolution_rate = $3,
            issues_per_thousand = $4,
            median_response_hours = $5,
            reopen_rate = $6,
            updated_at = NOW()
           WHERE id = $7`,
          [
            newPassport.opinioScore,
            newPassport.confidenceLevel,
            newPassport.resolutionRate,
            newPassport.issuesPerThousand,
            medianHours,
            casesCount > 0 ? Math.round((reopenedCount / casesCount) * 1000) / 10 : 0,
            businessId,
          ]
        );
      }
    }

    // Fetch messages to return complete case object
    const messagesRes = await query<CaseMessageRow>(
      'SELECT * FROM case_messages WHERE case_id = $1 ORDER BY created_at ASC',
      [caseId]
    );

    return NextResponse.json({
      success: true,
      message: 'Caso actualizado con éxito',
      case: {
        ...updatedCase,
        total_resolution_hours: updatedCase.total_resolution_hours ? Number(updatedCase.total_resolution_hours) : null,
        messages: messagesRes.rows,
      },
    });
  } catch (error) {
    console.error('[api/v1/cases/[id] PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el caso' },
      { status: 500 }
    );
  }
}
