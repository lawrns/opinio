import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export type MatchState =
  | 'strong_evidence'
  | 'moderate_evidence'
  | 'claimed_unconnected'
  | 'public_info'
  | 'no_match';

interface BusinessSearchRow {
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
  effective_reviews_count: number;
}

function determineMatchState(business: BusinessSearchRow): MatchState {
  if (business.claimed && business.verified_level === 'transparent_coverage' && business.observed_orders_count > 0) {
    return 'strong_evidence';
  }
  if (business.claimed && (business.verified_level === 'connected_orders' || business.observed_orders_count > 0)) {
    return 'moderate_evidence';
  }
  if (business.claimed && (business.verified_level === 'identity_verified' || business.verified_level === 'claimed')) {
    return 'claimed_unconnected';
  }
  if (business.verified_level === 'public_info' || !business.claimed) {
    return 'public_info';
  }
  return 'moderate_evidence';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const category = searchParams.get('category')?.trim();

    if (!q) {
      const catSql = category && category !== 'Todos'
        ? `SELECT b.* FROM businesses b WHERE b.category ILIKE $1 ORDER BY b.trust_score DESC LIMIT 50`
        : `SELECT b.* FROM businesses b ORDER BY b.trust_score DESC LIMIT 50`;
      
      const res = await query<BusinessSearchRow>(
        catSql,
        category && category !== 'Todos' ? [`%${category}%`] : []
      );
      const results = res.rows.map((row) => ({
        ...row,
        trust_score: Number(row.trust_score) || 0,
        coverage_percentage: Number(row.coverage_percentage) || 0,
        issues_per_thousand: Number(row.issues_per_thousand) || 0,
        resolution_rate: Number(row.resolution_rate) || 0,
        median_response_hours: Number(row.median_response_hours) || 0,
        match_state: determineMatchState(row),
      }));

      return NextResponse.json({
        success: true,
        query: '',
        match_state: 'strong_evidence' as MatchState,
        total_results: results.length,
        results,
      });
    }

    // Clean search token (strip URL protocols, clean phones, rfc)
    const cleanDomain = q.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').toLowerCase();
    const phoneDigits = q.replace(/\D/g, '');
    const cleanPhone = phoneDigits.length >= 7 ? phoneDigits.replace(/^52(?=\d{10}$)/, '') : '';
    const cleanQuery = `%${q}%`;
    const cleanDomainQuery = `%${cleanDomain}%`;

    const sql = `
      SELECT DISTINCT b.id, b.slug, b.brand_name, b.legal_name, b.category, b.description,
             b.rfc, b.clee, b.phone, b.whatsapp, b.domain, b.logo_url, b.operating_area,
             b.claimed, b.verified_level, b.trust_score, b.confidence_level,
             b.coverage_percentage, b.observed_orders_count, b.invited_orders_count,
             b.issues_per_thousand, b.resolution_rate, b.median_response_hours,
             b.effective_reviews_count
      FROM businesses b
      LEFT JOIN identities i ON i.business_id = b.id
      WHERE (
        b.brand_name ILIKE $1
        OR b.slug ILIKE $1
        OR b.legal_name ILIKE $1
        OR b.domain ILIKE $2
        OR b.rfc ILIKE $1
        OR ($3 != '' AND (regexp_replace(b.phone, '[^0-9]', '', 'g') LIKE $4 OR regexp_replace(b.whatsapp, '[^0-9]', '', 'g') LIKE $4))
        OR (i.identifier ILIKE $1)
      ) AND ($5::text IS NULL OR b.category ILIKE $5)
      ORDER BY b.trust_score DESC, b.observed_orders_count DESC
      LIMIT 20
    `;

    const res = await query<BusinessSearchRow>(sql, [
      cleanQuery,
      cleanDomainQuery,
      cleanPhone,
      `%${cleanPhone}%`,
      category && category !== 'Todos' ? `%${category}%` : null,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({
        success: true,
        query: q,
        match_state: 'no_match' as MatchState,
        total_results: 0,
        results: [],
      });
    }

    const results = res.rows.map((row) => ({
      ...row,
      trust_score: Number(row.trust_score) || 0,
      coverage_percentage: Number(row.coverage_percentage) || 0,
      issues_per_thousand: Number(row.issues_per_thousand) || 0,
      resolution_rate: Number(row.resolution_rate) || 0,
      median_response_hours: Number(row.median_response_hours) || 0,
      match_state: determineMatchState(row),
    }));

    // Primary match state is the strongest match state among the top result
    const primaryMatchState = results[0]?.match_state || 'no_match';

    return NextResponse.json({
      success: true,
      query: q,
      match_state: primaryMatchState,
      total_results: results.length,
      results,
    });
  } catch (error) {
    console.error('[api/v1/search] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error searching businesses',
        match_state: 'no_match' as MatchState,
        results: [],
      },
      { status: 500 }
    );
  }
}
