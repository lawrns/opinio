import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface InvitationInput {
  business_id?: number;
  order_id?: number | null;
  channel?: 'whatsapp' | 'email' | 'sms';
  recipient_target: string;
}

interface InvitationRow {
  id: number;
  business_id: number;
  order_id: number | null;
  token: string;
  channel: string;
  recipient_target: string;
  status: string;
  sent_at: string;
  completed_at: string | null;
  customer_name?: string | null;
  order_amount?: string | number | null;
  business_slug?: string;
  business_brand_name?: string;
}

interface OrderLookupRow {
  id: number;
  business_id: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
}

interface BusinessStatsRow {
  id: number;
  slug: string;
  brand_name: string;
  observed_orders_count: number;
  invited_orders_count: number;
  coverage_percentage: string | number;
  effective_reviews_count: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InvitationInput;

    if (!body.recipient_target || typeof body.recipient_target !== 'string' || body.recipient_target.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'recipient_target (WhatsApp o email) es requerido' },
        { status: 400 }
      );
    }

    let businessId = body.business_id;
    const orderId = body.order_id || null;

    // If order_id provided, look up order to get business_id and mark invited
    if (orderId) {
      const orderRes = await query<OrderLookupRow>(
        'SELECT id, business_id, customer_name, customer_email, customer_phone FROM orders WHERE id = $1',
        [orderId]
      );
      if (orderRes.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: `Orden con ID ${orderId} no encontrada` },
          { status: 404 }
        );
      }
      businessId = orderRes.rows[0].business_id;

      // Mark order as invited
      await query('UPDATE orders SET invited = true WHERE id = $1', [orderId]);
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'business_id es requerido si no se proporciona un order_id válido' },
        { status: 400 }
      );
    }

    // Verify business exists
    const bizRes = await query<BusinessStatsRow>(
      'SELECT id, slug, brand_name, observed_orders_count, invited_orders_count, coverage_percentage, effective_reviews_count FROM businesses WHERE id = $1',
      [businessId]
    );

    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio con ID ${businessId} no encontrado` },
        { status: 404 }
      );
    }

    const business = bizRes.rows[0];
    const channel = body.channel || 'whatsapp';

    // Generate unique invitation token
    const randomHex = Math.random().toString(36).substring(2, 8);
    const token = `inv_${business.slug.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now().toString(36)}_${randomHex}`;

    // Insert invitation
    const insertRes = await query<InvitationRow>(
      `INSERT INTO invitations (
        business_id, order_id, token, channel, recipient_target, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, 'sent', NOW())
      RETURNING *`,
      [businessId, orderId, token, channel, body.recipient_target.trim()]
    );

    const createdInvitation = insertRes.rows[0];

    // Increment invited_orders_count and recalculate coverage percentage
    const newInvitedCount = business.invited_orders_count + 1;
    const observedCount = Math.max(business.observed_orders_count, newInvitedCount);
    const newCoverage = Math.min(100.0, Math.round((newInvitedCount / observedCount) * 1000.0) / 10.0);

    // Recalculate confidence level based on spec section 7.3:
    // very_strong: n_eff >= 200 and coverage >= 80%
    // strong: n_eff >= 50
    // established: n_eff >= 10
    // preliminary: else
    let newConfidence = 'preliminary';
    if (business.effective_reviews_count >= 200 && newCoverage >= 80.0) {
      newConfidence = 'very_strong';
    } else if (business.effective_reviews_count >= 50) {
      newConfidence = 'strong';
    } else if (business.effective_reviews_count >= 10) {
      newConfidence = 'established';
    }

    await query(
      `UPDATE businesses
       SET invited_orders_count = $1,
           coverage_percentage = $2,
           confidence_level = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [newInvitedCount, newCoverage, newConfidence, businessId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Invitación de opinión enviada exitosamente',
        invitation: createdInvitation,
        review_url: `https://opinio.mx/opinar/${token}`,
        business_metrics: {
          observed_orders_count: observedCount,
          invited_orders_count: newInvitedCount,
          coverage_percentage: newCoverage,
          confidence_level: newConfidence,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/invitations POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al enviar la invitación' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get('business_id');
    const statusParam = searchParams.get('status');
    const channelParam = searchParams.get('channel');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10) || 50));
    const offset = Math.max(0, parseInt(offsetParam || '0', 10) || 0);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (businessIdParam) {
      const businessId = parseInt(businessIdParam, 10);
      if (businessId > 0) {
        conditions.push(`i.business_id = $${paramIndex++}`);
        params.push(businessId);
      }
    }

    if (statusParam) {
      conditions.push(`i.status = $${paramIndex++}`);
      params.push(statusParam.trim());
    }

    if (channelParam) {
      conditions.push(`i.channel = $${paramIndex++}`);
      params.push(channelParam.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT i.*, o.customer_name, o.amount as order_amount, b.slug as business_slug, b.brand_name as business_brand_name
      FROM invitations i
      INNER JOIN businesses b ON b.id = i.business_id
      LEFT JOIN orders o ON o.id = i.order_id
      ${whereClause}
      ORDER BY i.sent_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const res = await query<InvitationRow>(sql, params);

    const invitations = res.rows.map((row) => ({
      ...row,
      order_amount: row.order_amount ? Number(row.order_amount) : null,
      review_url: `https://opinio.mx/opinar/${row.token}`,
    }));

    return NextResponse.json({
      success: true,
      count: invitations.length,
      limit,
      offset,
      invitations,
    });
  } catch (error) {
    console.error('[api/v1/invitations GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar las invitaciones' },
      { status: 500 }
    );
  }
}
