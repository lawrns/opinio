import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { authorizeMachineKey, recordAuditEvent } from '@/lib/authz';
import { authzErrorResponse, bearerToken } from '@/lib/authz/http';
import { authSpikeEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/**
 * B02 protected test surface: a machine write scoped to order events,
 * 404 unless OPINIO_AUTH_SPIKE=1. The business comes from the key; a
 * different `business_id` in the body is denied.
 */
export async function POST(request: NextRequest) {
  if (!authSpikeEnabled()) return new Response('Not found', { status: 404 });
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const claimed = typeof body === 'object' && body && 'business_id' in body ? body.business_id : undefined;
    const key = await authorizeMachineKey(pool, {
      key: bearerToken(request.headers.get('authorization')),
      scope: 'order_events',
      claimedBusinessId: claimed,
    });
    await recordAuditEvent(pool, { businessId: key.businessId, actor: key, action: 'authz.test_write' });
    return NextResponse.json({ ok: true, business_id: key.businessId }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return authzErrorResponse(error);
  }
}
