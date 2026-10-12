import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ReviewProvenance } from '@/lib/review-eligibility';
import { buildPublicWidgetPayload } from '@/lib/widget-payload';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface WidgetContextRow {
  widget_type: string;
  theme: string;
  config: Record<string, unknown> | null;
  allowed_domains: string[] | null;
  slug: string;
  brand_name: string;
  logo_url: string | null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;
  const token = rawToken?.trim();

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token de widget requerido' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const widgetRes = await query<WidgetContextRow>(
      `SELECT w.widget_type, w.theme, w.config, w.allowed_domains,
              b.slug, b.brand_name, b.logo_url
         FROM widgets w
         INNER JOIN businesses b ON b.id = w.business_id
        WHERE w.token = $1 AND w.is_active = true
        LIMIT 1`,
      [token],
    );

    if (widgetRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Widget no encontrado o inactivo' },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const w = widgetRes.rows[0];

    // Server-side allowed_domains enforcement.
    const origin = request.headers.get('origin') || request.headers.get('referer');
    const allowed = w.allowed_domains ?? [];
    if (origin && allowed.length > 0) {
      try {
        const originHost = new URL(origin).hostname.toLowerCase();
        const isAllowed = allowed.some((domain) => {
          const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();
          return originHost === clean || originHost.endsWith(`.${clean}`);
        });
        if (!isAllowed) {
          return NextResponse.json(
            { success: false, error: 'Dominio de origen no autorizado para este widget' },
            { status: 403, headers: CORS_HEADERS },
          );
        }
      } catch {
        // Malformed origin: fall through to the gated payload.
      }
    }

    const reviewRes = await query<ReviewProvenance>(
      `SELECT r.id, r.rating, r.status, r.customer_authored, r.transaction_verified,
              r.owner_attested, r.provenance_source
         FROM reviews r
         INNER JOIN widgets w ON w.business_id = r.business_id
        WHERE w.token = $1 AND r.status = 'published'`,
      [token],
    );

    const payload = buildPublicWidgetPayload(
      { name: w.brand_name, slug: w.slug, logo_url: w.logo_url },
      reviewRes.rows,
    );

    return NextResponse.json(
      {
        success: true,
        token,
        type: w.widget_type,
        theme: w.theme,
        config: w.config ?? {},
        ...payload,
      },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[api/v1/widgets/[token] GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar el widget' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
