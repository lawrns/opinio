import type { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { revokeCaseSession } from '@/lib/authz/buyer-access';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { servedOverHttps } from '@/lib/authz/https';
import { sameOrigin } from '@/lib/auth/same-origin';
import { buyerProofEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/** The buyer ends their session for one case: revoked server-side, cookie cleared. */
export async function POST(request: NextRequest) {
  if (!buyerProofEnabled()) return new Response('Not found', { status: 404 });
  const form = await request.formData().catch(() => null);
  const raw = form?.get('caseId');
  const caseId = typeof raw === 'string' && /^\d{1,12}$/.test(raw) ? Number(raw) : NaN;
  const headers = new Headers({ ...PRIVATE_HEADERS, Location: Number.isSafeInteger(caseId) ? `/caso/${caseId}` : '/' });
  if (sameOrigin(request) && Number.isSafeInteger(caseId)) {
    const name = caseSessionCookieName(caseId, servedOverHttps());
    await revokeCaseSession(pool, request.cookies.get(name)?.value, caseId);
    headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${servedOverHttps() ? '; Secure' : ''}`);
  }
  return new Response(null, { status: 303, headers });
}
