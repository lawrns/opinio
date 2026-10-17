// Containment gate for the private merchant surfaces (see src/lib/containment.ts).
// While `merchant_panel` is contained, every /merchant/** request, including
// page loads, RSC fetches and server-action POSTs, gets a neutral 503 page
// before any merchant code runs. The merchant layout has the same guard as a
// second layer.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MERCHANT_UNAVAILABLE_HTML, isOperationEnabled } from '@/lib/containment';

export const config = {
  matcher: ['/merchant', '/merchant/:path*'],
};

export function proxy(request: NextRequest) {
  void request;
  if (isOperationEnabled('merchant_panel')) return NextResponse.next();
  return new NextResponse(MERCHANT_UNAVAILABLE_HTML, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '86400',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
