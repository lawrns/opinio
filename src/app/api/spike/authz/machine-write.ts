import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { authorizeMachineKey, recordAuditEvent, type MachineScope } from '@/lib/authz';
import { authzErrorResponse, bearerToken } from '@/lib/authz/http';
import { authSpikeEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

/**
 * Synthetic protected machine write (B02/B05), 404 unless OPINIO_AUTH_SPIKE=1.
 * The business comes from the key. A `business_id` or `order_id` in the body
 * is only checked against it: another business's, a missing one or a wrong
 * scope is denied before the (audit-only) effect. Real order and invitation
 * writes stay contained until their own tickets.
 */
export async function machineWrite(request: NextRequest, scope: MachineScope) {
  if (!authSpikeEnabled()) return new Response('Not found', { status: 404 });
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const field = (name: string) => (typeof body === 'object' && body && name in body ? (body as Record<string, unknown>)[name] : undefined);
    const orderId = field('order_id');
    const key = await authorizeMachineKey(pool, {
      key: bearerToken(request.headers.get('authorization')),
      scope,
      claimedBusinessId: field('business_id'),
      resource: orderId === undefined ? undefined : { kind: 'order', id: Number(orderId) },
    });
    await recordAuditEvent(pool, { businessId: key.businessId, actor: key, action: 'authz.test_write' });
    return NextResponse.json({ ok: true, business_id: key.businessId }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return authzErrorResponse(error);
  }
}
