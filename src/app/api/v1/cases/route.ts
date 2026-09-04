import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface CaseInput {
  business_id: number;
  review_id?: number | null;
  order_id?: number | null;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  initial_message: string;
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
  business_slug?: string;
  business_brand_name?: string;
}

interface BusinessRow {
  id: number;
  slug: string;
  brand_name: string;
  observed_orders_count: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CaseInput;

    if (!body.business_id || typeof body.business_id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'El campo business_id es requerido y debe ser un número' },
        { status: 400 }
      );
    }

    if (!body.customer_name || typeof body.customer_name !== 'string' || body.customer_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El nombre del cliente es requerido' },
        { status: 400 }
      );
    }

    if (!body.customer_contact || typeof body.customer_contact !== 'string' || body.customer_contact.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'El medio de contacto del cliente (WhatsApp o email) es requerido' },
        { status: 400 }
      );
    }

    if (!body.issue_category || typeof body.issue_category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La categoría del problema es requerida' },
        { status: 400 }
      );
    }

    if (!body.customer_requested_remedy || typeof body.customer_requested_remedy !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La solución solicitada es requerida' },
        { status: 400 }
      );
    }

    if (!body.initial_message || typeof body.initial_message !== 'string' || body.initial_message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'El mensaje inicial del caso debe contener al menos 5 caracteres' },
        { status: 400 }
      );
    }

    // Verify business exists
    const bizRes = await query<BusinessRow>(
      'SELECT id, slug, brand_name, observed_orders_count FROM businesses WHERE id = $1',
      [body.business_id]
    );

    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio con ID ${body.business_id} no existe` },
        { status: 404 }
      );
    }

    const business = bizRes.rows[0];

    // Generate unique case_number
    const slugPrefix = business.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'GEN';
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const caseNumber = `CASO-${slugPrefix}-${year}-${randomSuffix}`;

    // Insert Resolution Case
    const insertRes = await query<CaseRow>(
      `INSERT INTO resolution_cases (
        business_id, review_id, order_id, case_number, customer_name,
        customer_contact, issue_category, customer_requested_remedy, status,
        is_consumer_confirmed, median_first_response_minutes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'opened', false, 45, NOW(), NOW())
      RETURNING *`,
      [
        body.business_id,
        body.review_id || null,
        body.order_id || null,
        caseNumber,
        body.customer_name.trim(),
        body.customer_contact.trim(),
        body.issue_category.trim(),
        body.customer_requested_remedy.trim(),
      ]
    );

    const createdCase = insertRes.rows[0];

    // Insert initial customer message
    await query(
      `INSERT INTO case_messages (case_id, sender_type, sender_name, message, is_private, created_at)
       VALUES ($1, 'consumer', $2, $3, false, NOW())`,
      [createdCase.id, body.customer_name.trim(), body.initial_message.trim()]
    );

    // Update issues_per_thousand in business table
    const countCasesRes = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM resolution_cases WHERE business_id = $1',
      [body.business_id]
    );
    const totalCases = parseInt(countCasesRes.rows[0]?.count || '1', 10);
    if (business.observed_orders_count > 0) {
      const issuesPerThousand = Math.round((totalCases / (business.observed_orders_count / 1000)) * 10) / 10;
      await query(
        'UPDATE businesses SET issues_per_thousand = $1, updated_at = NOW() WHERE id = $2',
        [issuesPerThousand, body.business_id]
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Caso de resolución abierto con éxito',
        case: createdCase,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/cases POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al abrir el caso de resolución' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get('business_id');
    const caseNumberParam = searchParams.get('case_number');
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10) || 50));
    const offset = Math.max(0, parseInt(offsetParam || '0', 10) || 0);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (caseNumberParam) {
      conditions.push(`c.case_number = $${paramIndex++}`);
      params.push(caseNumberParam.trim());
    }

    if (businessIdParam) {
      const businessId = parseInt(businessIdParam, 10);
      if (businessId > 0) {
        conditions.push(`c.business_id = $${paramIndex++}`);
        params.push(businessId);
      }
    }

    if (statusParam) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(statusParam.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT c.*, b.slug as business_slug, b.brand_name as business_brand_name
      FROM resolution_cases c
      INNER JOIN businesses b ON b.id = c.business_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const res = await query<CaseRow>(sql, params);

    const cases = res.rows.map((row) => ({
      ...row,
      total_resolution_hours: row.total_resolution_hours ? Number(row.total_resolution_hours) : null,
    }));

    return NextResponse.json({
      success: true,
      count: cases.length,
      limit,
      offset,
      cases,
    });
  } catch (error) {
    console.error('[api/v1/cases GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar casos de resolución' },
      { status: 500 }
    );
  }
}
