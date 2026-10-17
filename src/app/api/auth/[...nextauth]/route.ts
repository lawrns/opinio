import type { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { authSpikeEnabled, merchantAuthEnabled } from '@/lib/auth/spike';

// Auth.js endpoints exist only while merchant login (B03) or the B01 spike is switched on.
const notFound = () => new Response('Not found', { status: 404 });

export async function GET(request: NextRequest) {
  if (!merchantAuthEnabled() && !authSpikeEnabled()) return notFound();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!merchantAuthEnabled() && !authSpikeEnabled()) return notFound();
  return handlers.POST(request);
}
