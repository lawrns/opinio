// BL-04 / OPN-06: public reviews start 'pending' and become public only when a
// platform administrator approves them. Helpers for the review POST and the
// admin queue.
import type { PoolClient } from 'pg';
import { hashSecret } from '@/lib/authz/secrets';
import { isOperationEnabled } from '@/lib/containment';
import {
  calculateOpinioScore,
  type ResolutionMetricsInput,
  type ReviewCalculationItem,
} from '@/lib/scoring';

export const REVIEW_PENDING = 'pending';
export const REVIEW_REJECTED = 'removed';

/** Case, space and punctuation-insensitive form of a review body, for duplicate detection. */
export function normalizeReviewBody(body: string): string {
  return body.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export const reviewBodyHash = (body: string): string => hashSecret(`review-body:${normalizeReviewBody(body)}`);
export const reviewEmailHash = (email: string): string => hashSecret(`review-email:${email.trim().toLowerCase()}`);
export const reviewClientHash = (client: string): string => hashSecret(`review-client:${client}`);

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare Turnstile check. The secret comes from TURNSTILE_SECRET_KEY. When
 * that variable is unset the check is a no-op ('skipped') so nothing changes
 * until it is configured. When set, a missing or invalid token is refused and
 * an unreachable verifier fails closed ('unavailable').
 */
export async function verifyCaptcha(
  token: unknown,
  remoteIp: string,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<'skipped' | 'ok' | 'invalid' | 'unavailable'> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return 'skipped';
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return 'invalid';
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (remoteIp !== 'unknown') form.set('remoteip', remoteIp);
    const res = await fetcher(TURNSTILE_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'unavailable';
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? 'ok' : 'invalid';
  } catch {
    return 'unavailable';
  }
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

/** Recalculates and stores a business's score from its published reviews. */
export async function recalculateBusinessScore(client: Pick<PoolClient, 'query'>, businessId: number): Promise<void> {
  const bizRes = await client.query<BusinessStatsRow>(
    'SELECT id, observed_orders_count, invited_orders_count, median_response_hours FROM businesses WHERE id = $1 FOR UPDATE',
    [businessId],
  );
  const business = bizRes.rows[0];
  if (!business) return;

  const [allReviewsRes, caseStatsRes] = await Promise.all([
    client.query<{ rating: number; verification_level: ReviewCalculationItem['verificationLevel']; integrity_factor: string | number; created_at: string }>(
      'SELECT rating, verification_level, integrity_factor, created_at FROM reviews WHERE business_id = $1 AND status = $2',
      [businessId, 'published'],
    ),
    client.query<CaseStatsRow>(
      `SELECT
         COUNT(*)::text as total,
         COUNT(*) FILTER (WHERE is_consumer_confirmed = true)::text as confirmed,
         COUNT(*) FILTER (WHERE status != 'opened')::text as responded,
         COUNT(*) FILTER (WHERE status = 'reopened')::text as reopened,
         AVG(total_resolution_hours)::text as avg_hours
       FROM resolution_cases
       WHERE business_id = $1`,
      [businessId],
    ),
  ]);

  const nowMs = Date.now();
  const reviewItems: ReviewCalculationItem[] = allReviewsRes.rows.map((r) => ({
    rating: r.rating,
    verificationLevel: r.verification_level,
    ageDays: Math.max(0, Math.floor((nowMs - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))),
    integrityFactor: Number(r.integrity_factor) || 1.0,
  }));

  const stats = caseStatsRes.rows[0] || { total: '0', confirmed: '0', responded: '0', reopened: '0', avg_hours: null };
  const resolutionInput: ResolutionMetricsInput = {
    casesCount: parseInt(stats.total, 10) || 0,
    consumerConfirmedCount: parseInt(stats.confirmed, 10) || 0,
    merchantRespondedCount: parseInt(stats.responded, 10) || 0,
    medianResponseHours: stats.avg_hours ? Number(stats.avg_hours) : Number(business.median_response_hours) || 4.5,
    targetResponseHours: 24,
    reopenedCount: parseInt(stats.reopened, 10) || 0,
  };

  const passport = calculateOpinioScore(
    reviewItems,
    resolutionInput,
    business.observed_orders_count || 0,
    business.invited_orders_count || 0,
  );

  await client.query(
    `UPDATE businesses SET
       trust_score = $1, confidence_level = $2, effective_reviews_count = $3,
       resolution_rate = $4, issues_per_thousand = $5, updated_at = NOW()
     WHERE id = $6`,
    [
      passport.opinioScore,
      passport.confidenceLevel,
      Math.round(passport.effectiveSampleSize),
      passport.resolutionRate,
      passport.issuesPerThousand,
      businessId,
    ],
  );
}

export type ModerationDecision = 'approve' | 'reject';

/**
 * Moves a pending review to published ('approve') or removed ('reject'). Only
 * pending reviews change, so a decision is never applied twice. Approval
 * recalculates the stored score, except for an unverified review while claimed
 * verification stays contained (same rule the POST applied before moderation).
 * Returns false when no pending review had that id.
 */
export async function moderateReview(
  client: Pick<PoolClient, 'query'>,
  input: { reviewId: number; decision: ModerationDecision; administratorUserId: number },
): Promise<boolean> {
  const next = input.decision === 'approve' ? 'published' : REVIEW_REJECTED;
  const res = await client.query<{ business_id: number; verification_level: string }>(
    `UPDATE reviews SET status = $1, moderated_by_user_id = $2, moderated_at = NOW(), updated_at = NOW()
      WHERE id = $3 AND status = $4
      RETURNING business_id, verification_level`,
    [next, input.administratorUserId, input.reviewId, REVIEW_PENDING],
  );
  const row = res.rows[0];
  if (!row) return false;
  if (input.decision === 'approve' && (isOperationEnabled('review_claimed_verification') || row.verification_level !== 'unverified_experience')) {
    await recalculateBusinessScore(client, row.business_id);
  }
  return true;
}
