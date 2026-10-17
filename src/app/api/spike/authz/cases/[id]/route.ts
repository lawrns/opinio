import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { authorizeCaseSession } from '@/lib/authz';
import { authzErrorResponse } from '@/lib/authz/http';
import { caseSessionCookieName } from '@/lib/authz/policy';
import { servedOverHttps } from '@/lib/authz/session';
import { authSpikeEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/** B02 protected test surface: a buyer's private case read, 404 unless OPINIO_AUTH_SPIKE=1. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authSpikeEnabled()) return new Response('Not found', { status: 404 });
  try {
    const caseId = Number((await params).id);
    const proof = await authorizeCaseSession(pool, {
      sessionToken: request.cookies.get(caseSessionCookieName(caseId, servedOverHttps()))?.value,
      caseId,
    });
    const { rows } = await pool.query('SELECT id, customer_name FROM resolution_cases WHERE id = $1', [proof.caseId]);
    return NextResponse.json(rows[0], { headers: PRIVATE_HEADERS });
  } catch (error) {
    return authzErrorResponse(error);
  }
}
