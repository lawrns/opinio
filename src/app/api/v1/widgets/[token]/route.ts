import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface WidgetRow {
  id: number;
  business_id: number;
  token: string;
  widget_type: string;
  allowed_domains: string[];
  theme: string;
  config: Record<string, unknown>;
  is_active: boolean;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  trust_score: string | number;
  confidence_level: string;
  coverage_percentage: string | number;
  verified_level: string;
  observed_orders_count: number;
  effective_reviews_count: number;
  resolution_rate: string | number;
  issues_per_thousand: string | number;
  logo_url: string | null;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: rawToken } = await params;
    const token = rawToken?.trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de widget requerido' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Query widget and associated business
    const sql = `
      SELECT w.id, w.business_id, w.token, w.widget_type, w.allowed_domains,
             w.theme, w.config, w.is_active,
             b.slug, b.brand_name, b.legal_name, b.trust_score, b.confidence_level,
             b.coverage_percentage, b.verified_level, b.observed_orders_count,
             b.effective_reviews_count, b.resolution_rate, b.issues_per_thousand,
             b.logo_url
      FROM widgets w
      INNER JOIN businesses b ON b.id = w.business_id
      WHERE w.token = $1 AND w.is_active = true
      LIMIT 1
    `;

    let res = await query<WidgetRow>(sql, [token]);

    // Fallback: If not found by exact token, check if token represents business slug
    if (res.rows.length === 0) {
      const fallbackSql = `
        SELECT w.id, w.business_id, w.token, w.widget_type, w.allowed_domains,
               w.theme, w.config, w.is_active,
               b.slug, b.brand_name, b.legal_name, b.trust_score, b.confidence_level,
               b.coverage_percentage, b.verified_level, b.observed_orders_count,
               b.effective_reviews_count, b.resolution_rate, b.issues_per_thousand,
               b.logo_url
        FROM widgets w
        INNER JOIN businesses b ON b.id = w.business_id
        WHERE b.slug = $1 AND w.is_active = true
        ORDER BY w.id ASC
        LIMIT 1
      `;
      res = await query<WidgetRow>(fallbackSql, [token]);
    }

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Widget no encontrado o inactivo para el token: ${token}` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const w = res.rows[0];

    const host = request.headers.get('host') || 'opinio.mx';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const verificationUrl = `${baseUrl}/b/${w.slug}`;

    return NextResponse.json(
      {
        success: true,
        widget: {
          token: w.token,
          type: w.widget_type,
          theme: w.theme,
          config: w.config || {},
          allowed_domains: w.allowed_domains || [],
        },
        business: {
          name: w.brand_name,
          legal_name: w.legal_name,
          slug: w.slug,
          logo_url: w.logo_url,
          score: Number(w.trust_score) || 0,
          confidence: w.confidence_level || 'preliminary',
          coverage_percentage: Number(w.coverage_percentage) || 0,
          verified_level: w.verified_level || 'unverified',
          observed_orders: w.observed_orders_count || 0,
          effective_reviews: w.effective_reviews_count || 0,
          resolution_rate: Number(w.resolution_rate) || 0,
          issues_per_thousand: Number(w.issues_per_thousand) || 0,
          verification_url: verificationUrl,
        },
        embed_snippet: `<div class="opinio-widget" data-token="${w.token}" data-type="${w.widget_type}"></div><script src="${baseUrl}/widget.js" async></script>`,
      },
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (error) {
    console.error('[api/v1/widgets/[token] GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar el widget' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
