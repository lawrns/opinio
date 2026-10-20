'use server';

import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { AccessDenied, Unauthenticated } from '@/lib/authz';
import { requireAdministrator } from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { inTransaction } from '@/lib/authz/transaction';
import { merchantAuthEnabled } from '@/lib/auth/spike';
import { moderateReview, type ModerationDecision } from '@/lib/review-moderation';

/** Administrator-only: publish ('approve') or remove ('reject') one pending review. */
export async function moderateReviewAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  let outcome: string;
  try {
    const admin = await requireAdministrator(pool, await currentMerchantUserId());
    const raw = formData.get('reviewId');
    const reviewId = typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
    const decision: ModerationDecision | null =
      formData.get('decision') === 'approve' ? 'approve' : formData.get('decision') === 'reject' ? 'reject' : null;
    if (!decision || !Number.isInteger(reviewId)) {
      outcome = 'invalid_request';
    } else {
      const done = await inTransaction(pool, (client) =>
        moderateReview(client, { reviewId, decision, administratorUserId: admin.userId }),
      );
      outcome = done ? (decision === 'approve' ? 'aprobada' : 'rechazada') : 'not_pending';
    }
  } catch (error) {
    if (error instanceof Unauthenticated || error instanceof AccessDenied) redirect('/acceso');
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
    console.error(`[review-moderation] decision failed (code ${code})`);
    outcome = 'unavailable';
  }
  redirect(`/admin/resenas?resultado=${outcome}`);
}
