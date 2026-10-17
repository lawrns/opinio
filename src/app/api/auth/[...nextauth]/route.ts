import type { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { authSpikeEnabled } from '@/lib/auth/spike';

// Auth.js endpoints exist only while the B01 spike switch is on (issue #27).
const notFound = () => new Response('Not found', { status: 404 });

export async function GET(request: NextRequest) {
  if (!authSpikeEnabled()) return notFound();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!authSpikeEnabled()) return notFound();
  return handlers.POST(request);
}
