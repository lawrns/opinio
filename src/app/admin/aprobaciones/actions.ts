'use server';

import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { AccessDenied, Unauthenticated } from '@/lib/authz';
import { ApprovalRejected, approveFirstOwner, parseFirstOwnerApproval, requireAdministrator } from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { merchantAuthEnabled } from '@/lib/auth/spike';

/**
 * Administrator-only first-owner approval. The administrator check runs
 * first, so a direct call by anyone else changes nothing and learns nothing.
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
    });
    if (!found?.rows[0]) throw new ApprovalRejected('business_not_found');
    if (!request) throw new ApprovalRejected('invalid_request');
    await approveFirstOwner(userId, request);
    outcome = 'aprobado';
  } catch (error) {
    if (error instanceof Unauthenticated || error instanceof AccessDenied) redirect('/acceso');
    if (error instanceof ApprovalRejected) {
      outcome = error.reason;
    } else {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
      console.error(`[authz] first-owner approval failed (code ${code})`);
      outcome = 'unavailable';
    }
  }
  redirect(`/admin/aprobaciones?resultado=${outcome}`);
}
