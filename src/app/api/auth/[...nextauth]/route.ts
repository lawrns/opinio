import type { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { authSpikeEnabled, merchantAuthEnabled } from '@/lib/auth/spike';

// Auth.js endpoints exist only while merchant login (B03) or the B01 spike is switched on.
const notFound = () => new Response('Not found', { status: 404 });

/**
 * With merchant login on (and not the test-only B01 spike), two Auth.js
 * routes stay closed to outside callers:
 * - POST /signin/*: a link may only be requested through /acceso, which
 *   applies the rate limits. A direct POST would skip them.
 * - GET /callback/nodemailer: the emailed link is exchanged by the
 *   same-origin POST at /acceso/confirmar/entrar, so the token never travels
 *   in a request URL that proxies log.
 */
function closedToOutsideCallers(request: NextRequest): boolean {
  if (authSpikeEnabled()) return false;
  const path = request.nextUrl.pathname;
  return request.method === 'POST' ? path.startsWith('/api/auth/signin') : path.startsWith('/api/auth/callback/nodemailer');
}

export async function GET(request: NextRequest) {
  if (!merchantAuthEnabled() && !authSpikeEnabled()) return notFound();
  if (closedToOutsideCallers(request)) return notFound();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!merchantAuthEnabled() && !authSpikeEnabled()) return notFound();
  if (closedToOutsideCallers(request)) return notFound();
  return handlers.POST(request);
}
