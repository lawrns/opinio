import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { authorizeMerchant, recordAuditEvent } from '@/lib/authz';
import { authzErrorResponse } from '@/lib/authz/http';
import { currentMerchantUserId } from '@/lib/authz/session';
import { authSpikeEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * B02 protected test surface (issue #28), 404 unless OPINIO_AUTH_SPIKE=1.
 * GET is a private read for any active member; POST is an owner-only write.
 * Authorization runs before any private query or write.
 */
export async function GET(_request: Request, { params }: Params) {
  if (!authSpikeEnabled()) return new Response('Not found', { status: 404 });
  try {
    const authority = await authorizeMerchant(pool, {
      userId: await currentMerchantUserId(),
      resource: { kind: 'business', id: Number((await params).id) },
      permission: 'read_operational',
    });
    const { rows } = await pool.query(
      'SELECT count(*)::int AS open_cases FROM resolution_cases WHERE business_id = $1',
      [authority.businessId],
    );
    return NextResponse.json(
      { business_id: authority.businessId, role: authority.role, open_cases: rows[0].open_cases },
      { headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    return authzErrorResponse(error);
  }
}

export async function POST(_request: Request, { params }: Params) {
  if (!authSpikeEnabled()) return new Response('Not found', { status: 404 });
  try {
    const authority = await authorizeMerchant(pool, {
      userId: await currentMerchantUserId(),
      resource: { kind: 'business', id: Number((await params).id) },
      permission: 'manage_settings',
    });
    await recordAuditEvent(pool, {
      businessId: authority.businessId,
      actor: authority.principal,
      action: 'authz.test_write',
      details: { membership_id: authority.membershipId },
    });
    return NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return authzErrorResponse(error);
  }
}
