import type { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { requestCaseRecovery } from '@/lib/authz/case-recovery';
import { clientAddress } from '@/lib/auth/rate-limit';
import { sameOrigin } from '@/lib/auth/same-origin';
import { buyerProofEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/** Same answer for every input. Nothing is ever sent from here; requests only queue for human review. */
export async function POST(request: NextRequest) {
  if (!buyerProofEnabled()) return new Response('Not found', { status: 404 });
  const done = new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: '/caso/recuperar?resultado=recibido' } });
  if (!sameOrigin(request)) return done;
  const form = await request.formData().catch(() => null);
  try {
    await requestCaseRecovery(pool, {
      caseNumber: form?.get('caseNumber'),
      email: form?.get('email'),
      client: clientAddress(request.headers.get('x-forwarded-for')),
    });
  } catch {
    console.error('[case-recovery] request failed');
  }
  return done;
}
