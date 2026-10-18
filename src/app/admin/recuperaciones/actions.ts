'use server';

import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { AccessDenied, AuthorityUnavailable, Unauthenticated } from '@/lib/authz';
import { recordTransportOutcome } from '@/lib/authz/buyer-access';
import { RecoveryRejected, approveCaseRecovery, rejectCaseRecovery } from '@/lib/authz/case-recovery';
import { currentMerchantUserId } from '@/lib/authz/session';
import { sendCaseAccessLink } from '@/lib/auth/case-email';
import { buyerProofEnabled, merchantAuthEnabled } from '@/lib/auth/spike';

function idField(formData: FormData): number {
  const raw = formData.get('requestId');
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
}

function failure(error: unknown, what: string): string {
  if (error instanceof Unauthenticated || error instanceof AccessDenied) redirect('/acceso');
  if (error instanceof AuthorityUnavailable) return 'unavailable';
  if (error instanceof RecoveryRejected) return error.reason;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
  console.error(`[case-recovery] ${what} failed (code ${code})`);
  return 'unavailable';
}

/** Administrator only: approve after out-of-band verification; one link goes to the stored original email. */
export async function approveRecoveryAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled() || !buyerProofEnabled()) redirect('/');
  let outcome: string;
  try {
    const issued = await approveCaseRecovery(pool, await currentMerchantUserId(), {
      requestId: idField(formData),
      basis: formData.get('basis'),
      reference: formData.get('reference'),
    });
    const accepted = await sendCaseAccessLink(issued.email, issued.token);
    await recordTransportOutcome(pool, issued.tokenId, accepted);
    outcome = accepted ? 'aprobada' : 'aprobada_sin_envio';
  } catch (error) {
    outcome = failure(error, 'recovery approval');
  }
  redirect(`/admin/recuperaciones?resultado=${outcome}`);
}

/** Administrator only: close a request without sending anything. */
export async function rejectRecoveryAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled() || !buyerProofEnabled()) redirect('/');
  let outcome: string;
  try {
    await rejectCaseRecovery(pool, await currentMerchantUserId(), idField(formData));
    outcome = 'cerrada';
  } catch (error) {
    outcome = failure(error, 'recovery rejection');
  }
  redirect(`/admin/recuperaciones?resultado=${outcome}`);
}
