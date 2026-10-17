import { NextResponse } from 'next/server';
import { AccessDenied, AuthorityUnavailable, Unauthenticated } from '@/lib/authz';
import { PRIVATE_HEADERS } from '@/lib/auth/spike';

/**
 * Maps an authorization failure to a sanitized, non-cacheable response.
 * Not found and not permitted share one 404 so denials reveal nothing.
 */
export function authzErrorResponse(error: unknown): NextResponse {
  if (error instanceof Unauthenticated) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: PRIVATE_HEADERS });
  }
  if (error instanceof AccessDenied) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: PRIVATE_HEADERS });
  }
  if (!(error instanceof AuthorityUnavailable)) {
    console.error('[authz] unexpected failure');
  }
  return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: PRIVATE_HEADERS });
}

/** Bearer credential from the Authorization header, or null. */
export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer ([A-Za-z0-9_-]{1,200})$/);
  return match ? match[1] : null;
}
