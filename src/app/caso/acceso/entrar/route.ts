import type { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { CaseAccessRejected, exchangeCaseAccessToken } from '@/lib/authz/buyer-access';
import { caseSessionCookieName, caseSessionCookieOptions } from '@/lib/authz/policy';
import { servedOverHttps } from '@/lib/authz/https';
import { sameOrigin } from '@/lib/auth/same-origin';
import { buyerProofEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

const go = (location: string, cookie?: string) => {
  const headers = new Headers({ ...PRIVATE_HEADERS, Location: location });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
};

/**
 * Exchanges the emailed token for a session scoped to its case (same-origin
 * POST only). The token arrives in the form body; the redirect is clean.
 */
export async function POST(request: NextRequest) {
  if (!buyerProofEnabled()) return new Response('Not found', { status: 404 });
  if (!sameOrigin(request)) return go('/caso/acceso?resultado=invalido');
  const form = await request.formData().catch(() => null);
  try {
    const { caseId, sessionToken, expiresAt } = await exchangeCaseAccessToken(pool, form?.get('token'));
    const secure = servedOverHttps();
    const o = caseSessionCookieOptions(secure, expiresAt);
    const cookie = `${caseSessionCookieName(caseId, secure)}=${sessionToken}; Path=${o.path}; Expires=${o.expires.toUTCString()}; HttpOnly; SameSite=Lax${o.secure ? '; Secure' : ''}`;
    return go(`/caso/${caseId}`, cookie);
  } catch (error) {
    if (error instanceof CaseAccessRejected) return go('/caso/acceso?resultado=invalido');
    console.error('[case-access] exchange failed');
    return go('/caso/acceso?resultado=invalido');
  }
}
