import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface OrderEventInput {
  business_id?: number;
  business_slug?: string;
  external_order_id: string;
  platform?: 'shopify' | 'tiendanube' | 'woocommerce' | 'api' | 'manual';
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  amount?: number;
  currency?: string;
  status?: 'created' | 'fulfilled' | 'delivered' | 'refunded' | 'disputed';
}

interface OrderRow {
  id: number;
  business_id: number;
  external_order_id: string;
  platform: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  amount: string | number | null;
  currency: string;
  status: string;
  order_date: string;
  delivered_date: string | null;
  invited: boolean;
  created_at: string;
}

interface BusinessRow {
  id: number;
  slug: string;
  brand_name: string;
  observed_orders_count: number;
  invited_orders_count: number;
  coverage_percentage: string | number;
  issues_per_thousand: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderEventInput;

    if (!body.external_order_id || typeof body.external_order_id !== 'string' || body.external_order_id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'external_order_id es requerido' },
        { status: 400 }
      );
    }

    // Resolve business_id
    let businessId = body.business_id;
    if (!businessId && body.business_slug) {
      const bRes = await query<{ id: number }>('SELECT id FROM businesses WHERE slug = $1 LIMIT 1', [
        body.business_slug.trim(),
      ]);
      if (bRes.rows.length > 0) {
        businessId = bRes.rows[0].id;
      }
    }

    // If still not found, default to 1 (Luuna) if present in demo mode, else error
    if (!businessId) {
      const firstBiz = await query<{ id: number }>('SELECT id FROM businesses ORDER BY id ASC LIMIT 1');
      if (firstBiz.rows.length > 0) {
        businessId = firstBiz.rows[0].id;
      } else {
        return NextResponse.json(
          { success: false, error: 'business_id o business_slug es requerido' },
          { status: 400 }
        );
      }
    }

    // Verify business exists
    const bizRes = await query<BusinessRow>('SELECT * FROM businesses WHERE id = $1', [businessId]);
    if (bizRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Negocio con ID ${businessId} no encontrado` },
        { status: 404 }
      );
    }

    const platform = body.platform || 'shopify';
    const currency = body.currency?.toUpperCase() || 'MXN';
    const status = body.status || 'delivered';
    const amount = body.amount !== undefined ? Number(body.amount) : null;

    // Check if order already exists
    const existingOrder = await query<OrderRow>(
      'SELECT id FROM orders WHERE business_id = $1 AND external_order_id = $2 LIMIT 1',
      [businessId, body.external_order_id.trim()]
    );

    let order: OrderRow;

    if (existingOrder.rows.length > 0) {
      // Update existing order status
      const updateOrderRes = await query<OrderRow>(
        `UPDATE orders
         SET status = $1,
             customer_name = COALESCE($2, customer_name),
             customer_email = COALESCE($3, customer_email),
             customer_phone = COALESCE($4, customer_phone),
             amount = COALESCE($5, amount)
         WHERE id = $6
         RETURNING *`,
        [
          status,
          body.customer_name?.trim() || null,
          body.customer_email?.trim() || null,
          body.customer_phone?.trim() || null,
          amount,
          existingOrder.rows[0].id,
        ]
      );
      order = updateOrderRes.rows[0];
    } else {
      // Insert new order
      const insertOrderRes = await query<OrderRow>(
        `INSERT INTO orders (
          business_id, external_order_id, platform, customer_name,
          customer_email, customer_phone, amount, currency, status,
          order_date, delivered_date, invited, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), false, NOW())
        RETURNING *`,
        [
          businessId,
          body.external_order_id.trim(),
          platform,
          body.customer_name?.trim() || 'Cliente Verificado',
          body.customer_email?.trim() || null,
          body.customer_phone?.trim() || null,
          amount,
          currency,
          status,
        ]
      );
      order = insertOrderRes.rows[0];

      // Increment observed_orders_count and update coverage
      await query(
        `UPDATE businesses
         SET observed_orders_count = observed_orders_count + 1,
             coverage_percentage = CASE 
               WHEN (observed_orders_count + 1) > 0 
               THEN ROUND((invited_orders_count::numeric / (observed_orders_count + 1)::numeric) * 1000.0) / 10.0
               ELSE 0.0
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [businessId]
      );
    }

    // Fetch updated business stats
    const updatedBizRes = await query<BusinessRow>(
      'SELECT id, slug, brand_name, observed_orders_count, invited_orders_count, coverage_percentage FROM businesses WHERE id = $1',
      [businessId]
    );
    const updatedBiz = updatedBizRes.rows[0];

    return NextResponse.json(
      {
        success: true,
        message: 'Evento de orden procesado con éxito',
        order: {
          ...order,
          amount: order.amount ? Number(order.amount) : null,
        },
        business_metrics: {
          observed_orders_count: updatedBiz.observed_orders_count,
          invited_orders_count: updatedBiz.invited_orders_count,
          coverage_percentage: Number(updatedBiz.coverage_percentage),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/v1/order-events POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el evento de orden' },
      { status: 500 }
    );
  }
}
