import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Business } from '@/lib/types';

export type MatchState = 'strong_evidence' | 'moderate_evidence' | 'claimed_unconnected' | 'public_info' | 'no_match';
interface BusinessSearchRow extends Business {
  total_count: number;
  review_count: number;
  average_rating: string | number | null;
}

function determineMatchState(business: Business): MatchState {
  if (business.claimed && business.verified_level === 'transparent_coverage' && business.observed_orders_count > 0) return 'strong_evidence';
  if (business.claimed && (business.verified_level === 'connected_orders' || business.observed_orders_count > 0)) return 'moderate_evidence';
  if (business.claimed) return 'claimed_unconnected';
  return 'public_info';
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = (params.get('q') || '').trim().slice(0, 200);
    const category = params.get('category')?.trim();
    const minimum = Number(params.get('rating') || 0);
    const minRating = Number.isFinite(minimum) && minimum >= 0 && minimum <= 5 ? minimum : 0;
    const connected = params.get('connected') === '1';
    const sort = params.get('sort');
    const order = sort === 'rating' ? 'stats.average_rating DESC NULLS LAST, stats.review_count DESC'
      : sort === 'reviews' ? 'stats.review_count DESC, stats.average_rating DESC NULLS LAST'
      : 'b.trust_score DESC, stats.review_count DESC';
    const cleanDomain = q.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').toLowerCase();
    const phoneDigits = q.replace(/\D/g, '');
    const cleanPhone = phoneDigits.length >= 7 ? phoneDigits.replace(/^52(?=\d{10}$)/, '') : '';
    const result = await query<BusinessSearchRow>(`
      SELECT b.*, stats.review_count, ROUND(stats.average_rating, 1) AS average_rating, COUNT(*) OVER()::int AS total_count
      FROM businesses b
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS review_count, AVG(r.rating) AS average_rating
        FROM reviews r WHERE r.business_id = b.id AND r.status = 'published'
      ) stats ON true
      WHERE ($1 = '' OR b.brand_name ILIKE $2 OR b.slug ILIKE $2 OR b.legal_name ILIKE $2
        OR b.category ILIKE $2 OR b.domain ILIKE $3 OR b.rfc ILIKE $2
        OR ($4 != '' AND (regexp_replace(b.phone, '[^0-9]', '', 'g') LIKE $5
          OR regexp_replace(b.whatsapp, '[^0-9]', '', 'g') LIKE $5))
        OR EXISTS (SELECT 1 FROM identities i WHERE i.business_id = b.id AND i.identifier ILIKE $2))
      AND ($6::text IS NULL OR b.category ILIKE $6)
      AND ($7::numeric = 0 OR stats.average_rating >= $7)
      AND ($8::boolean = false OR b.observed_orders_count > 0)
      ORDER BY ${order}, b.id ASC
      LIMIT 50`, [q, `%${q}%`, `%${cleanDomain}%`, cleanPhone, `%${cleanPhone}%`, category && category !== 'Todos' ? `%${category}%` : null, minRating, connected]);
    const results = result.rows.map((business) => ({
      ...business,
      trust_score: Number(business.trust_score),
      coverage_percentage: Number(business.coverage_percentage),
      average_rating: business.average_rating === null ? null : Number(business.average_rating),
      issues_per_thousand: Number(business.issues_per_thousand),
      resolution_rate: Number(business.resolution_rate),
      median_response_hours: Number(business.median_response_hours),
      match_state: determineMatchState(business),
    }));
    return NextResponse.json({ success: true, query: q, match_state: results[0]?.match_state || 'no_match', total_results: result.rows[0]?.total_count || 0, results });
  } catch (error) {
    console.error('[api/v1/search] Error:', error);
    return NextResponse.json({ success: false, error: 'No pudimos cargar los comercios. Intenta de nuevo.', results: [] }, { status: 500 });
  }
}
