import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { authorizeCaseSession } from '@/lib/authz';
import { authzErrorResponse } from '@/lib/authz/http';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { servedOverHttps } from '@/lib/authz/https';
import { buyerProofEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/** Whether the caller holds a live buyer session for this case. Reveals nothing else. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!buyerProofEnabled()) return new Response('Not found', { status: 404 });
  try {
    const caseId = Number((await params).id);
    const proof = await authorizeCaseSession(pool, {
      sessionToken: request.cookies.get(caseSessionCookieName(caseId, servedOverHttps()))?.value,
      caseId,
    });
    return NextResponse.json({ verified: true, case_id: proof.caseId }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return authzErrorResponse(error);
  }
}
