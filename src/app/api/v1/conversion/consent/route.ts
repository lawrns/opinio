import { NextRequest, NextResponse } from 'next/server';
import { isOpaqueId } from '@/lib/conversion/contract';
import { withdrawJourney } from '@/lib/conversion/ledger';

/**
 * CONVERSION-001 consent withdrawal. The browser sends the opaque journey ID
 * it just deleted; every undelivered ledger row of that journey is stopped
 * and the journey is unlinked. 204 only once the database confirms, so the
 * browser keeps the withdrawal queued and retries on the next load otherwise.
 * Accepts nothing but an opaque `jrn_` ID and only ever removes data.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { journeyId?: unknown; consent?: unknown } | null;
  if (!isOpaqueId('journey', body?.journeyId) || body?.consent !== 'denied') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  try {
    await withdrawJourney(body.journeyId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.warn(`[conversion] withdrawal not saved: error=${error instanceof Error ? error.name : 'error'}`);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
