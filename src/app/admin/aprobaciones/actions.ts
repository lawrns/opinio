'use server';

import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { AccessDenied, Unauthenticated } from '@/lib/authz';
import {
  ApprovalRejected,
  approveFirstOwner,
  approveOwnershipTransfer,
  parseFirstOwnerApproval,
  requireAdministrator,
  revokeOwnerApproval,
} from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { merchantAuthEnabled } from '@/lib/auth/spike';

/**
 * Administrator-only first-owner approval or ownership transfer (`kind`). The
 * administrator check runs first, so a direct call by anyone else changes
 * nothing and learns nothing.
 */
export async function approveFirstOwnerAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  const userId = await currentMerchantUserId();
  let outcome: string;
  try {
    await requireAdministrator(pool, userId);
    const slug = String(formData.get('businessSlug') ?? '').trim();
    const found = slug ? await pool.query('SELECT id FROM businesses WHERE slug = $1', [slug.slice(0, 120)]) : null;
    const request = parseFirstOwnerApproval({
      businessId: found?.rows[0]?.id,
      applicantEmail: formData.get('applicantEmail'),
      evidenceMethod: formData.get('evidenceMethod'),
      authorityBasis: formData.get('authorityBasis'),
      evidenceReference: formData.get('evidenceReference'),
      evidenceSubject: formData.get('evidenceSubject'),
    });
    if (!found?.rows[0]) throw new ApprovalRejected('business_not_found');
    if (!request) throw new ApprovalRejected('invalid_request');
    if (formData.get('kind') === 'transfer') {
      await approveOwnershipTransfer(pool, userId, request);
      outcome = 'transferido';
    } else {
      await approveFirstOwner(pool, userId, request);
      outcome = 'aprobado';
    }
  } catch (error) {
    outcome = failureOutcome(error, 'ownership approval');
  }
  redirect(`/admin/aprobaciones?resultado=${outcome}`);
}

/** Administrator-only: revokes an approval and the owner membership it backs. */
export async function revokeOwnerApprovalAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  let outcome: string;
  try {
    const raw = formData.get('approvalId');
    await revokeOwnerApproval(pool, await currentMerchantUserId(), typeof raw === 'string' && raw.length <= 12 ? Number(raw) : NaN);
    outcome = 'revocado';
  } catch (error) {
    outcome = failureOutcome(error, 'approval revocation');
  }
  redirect(`/admin/aprobaciones?resultado=${outcome}`);
}

/** Non-administrators go to /acceso; rejections keep their reason; anything else logs a code only. */
function failureOutcome(error: unknown, what: string): string {
  if (error instanceof Unauthenticated || error instanceof AccessDenied) redirect('/acceso');
  if (error instanceof ApprovalRejected) return error.reason;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
  console.error(`[authz] ${what} failed (code ${code})`);
  return 'unavailable';
}
