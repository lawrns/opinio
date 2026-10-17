import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authSpikeEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/** B01 protected route handler: reads the database session on every request. */
export async function GET() {
  if (!authSpikeEnabled()) return new Response('Not found', { status: 404 });
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: PRIVATE_HEADERS });
  }
  return NextResponse.json({ email: session.user.email }, { headers: PRIVATE_HEADERS });
}
