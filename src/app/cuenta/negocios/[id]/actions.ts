'use server';

import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { AccessDenied, AuthorityUnavailable, Unauthenticated } from '@/lib/authz';
import { currentMerchantUserId } from '@/lib/authz/session';
import {
  StaffRejected,
  createStaffInvitation,
  removeStaffMembership,
  revokeStaffInvitation,
} from '@/lib/authz/staff';
import { sendStaffInvitation } from '@/lib/auth/staff-email';
import { merchantAuthEnabled } from '@/lib/auth/spike';

/** A positive integer form field, or NaN (authorization then denies it). */
function idField(formData: FormData, name: string): number {
  const raw = formData.get(name);
  return typeof raw === 'string' && raw.length <= 12 ? Number(raw) : NaN;
}

/** Where to show the outcome. The business ID here only picks the page; every action authorizes on its own. */
function back(formData: FormData, outcome: string): never {
  const businessId = idField(formData, 'businessId');
  redirect(Number.isSafeInteger(businessId) && businessId > 0 ? `/cuenta/negocios/${businessId}?equipo=${outcome}` : '/cuenta');
}

/** Signed-out callers go to /acceso, anyone not allowed gets a 404-like page; rejections keep their reason. */
function failure(error: unknown, what: string): string {
  if (error instanceof Unauthenticated) redirect('/acceso');
  if (error instanceof AuthorityUnavailable) return 'unavailable';
  if (error instanceof AccessDenied) redirect('/cuenta');
  if (error instanceof StaffRejected) return error.reason;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
  console.error(`[authz] ${what} failed (code ${code})`);
  return 'unavailable';
}

/** Owner only: invites an address as staff and emails it the single-use link. */
export async function inviteStaffAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  let outcome: string;
  try {
    // Inside the try: a database outage while checking the session is a handled failure, not a 500.
    const ownerUserId = await currentMerchantUserId();
    const invitation = await createStaffInvitation(pool, {
      ownerUserId,
      businessId: idField(formData, 'businessId'),
      email: formData.get('email'),
    });
    let sent = false;
    try {
      sent = await sendStaffInvitation(invitation.email, invitation.token);
    } catch {
      console.error('[authz] staff invitation email failed');
    }
    if (sent) {
      outcome = 'invitado';
    } else {
      // An invitation nobody received must not stay usable.
      await revokeStaffInvitation(pool, { ownerUserId, invitationId: invitation.invitationId });
      outcome = 'mail_unavailable';
    }
  } catch (error) {
    outcome = failure(error, 'staff invitation');
  }
  back(formData, outcome);
}

/** Owner only: withdraws a pending invitation. */
export async function revokeInvitationAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  let outcome: string;
  try {
    await revokeStaffInvitation(pool, { ownerUserId: await currentMerchantUserId(), invitationId: idField(formData, 'invitationId') });
    outcome = 'invitacion_retirada';
  } catch (error) {
    outcome = failure(error, 'staff invitation revocation');
  }
  back(formData, outcome);
}

/** Owner only: removes a staff member; their access ends on their next request. */
export async function removeStaffAction(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  let outcome: string;
  try {
    await removeStaffMembership(pool, { ownerUserId: await currentMerchantUserId(), membershipId: idField(formData, 'membershipId') });
    outcome = 'removido';
  } catch (error) {
    outcome = failure(error, 'staff removal');
  }
  back(formData, outcome);
}
