import type { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { AuthorityUnavailable } from '@/lib/authz';
import { currentMerchantUserId } from '@/lib/authz/session';
import { StaffRejected, acceptStaffInvitation } from '@/lib/authz/staff';
import { sameOrigin } from '@/lib/auth/same-origin';
import { merchantAuthEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

const go = (location: string) => new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: location } });

/**
 * Accepts a staff invitation for the signed-in user (same-origin POST only).
 * The token arrives in the form body, never in a URL.
 */
export async function POST(request: NextRequest) {
  if (!merchantAuthEnabled()) return new Response('Not found', { status: 404 });
  if (!sameOrigin(request)) return go('/cuenta/invitacion?resultado=invalid_invitation');
  const userId = await currentMerchantUserId().catch((error) => {
    if (error instanceof AuthorityUnavailable) return undefined;
    throw error;
  });
  if (userId === undefined) return go('/cuenta/invitacion?resultado=unavailable');
  if (userId === null) return go('/acceso');
  const form = await request.formData().catch(() => null);
  try {
    const { businessId } = await acceptStaffInvitation(pool, { userId, token: form?.get('token') });
    return go(`/cuenta/negocios/${businessId}`);
  } catch (error) {
    if (error instanceof StaffRejected) return go(`/cuenta/invitacion?resultado=${error.reason}`);
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
    console.error(`[authz] staff invitation acceptance failed (code ${code})`);
    return go('/cuenta/invitacion?resultado=unavailable');
  }
}
