import { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { merchantAuthEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';
import { parseEmail } from '@/lib/authz/policy';
import { sameOrigin } from '@/lib/auth/same-origin';

export const dynamic = 'force-dynamic';

const TOKEN = /^[A-Za-z0-9_-]{16,200}$/;

/**
 * Exchanges the emailed login token for a session (spec #26: a same-origin
 * protected POST). The confirmation page posts the token from its URL
 * fragment; this handler passes it to Auth.js's email callback in-process, so
 * the token never appears in a request URL, browser history or proxy log.
 */
export async function POST(request: NextRequest) {
  if (!merchantAuthEnabled()) return new Response('Not found', { status: 404 });
  const failed = () => new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: '/acceso/error' } });
  if (!sameOrigin(request)) return failed();
  const form = await request.formData().catch(() => null);
  const token = form?.get('token');
  const email = parseEmail(form?.get('email'));
  if (typeof token !== 'string' || !TOKEN.test(token) || !email) return failed();

  const callback = new URL('/api/auth/callback/nodemailer', request.nextUrl.origin);
  callback.searchParams.set('token', token);
  callback.searchParams.set('email', email);
  callback.searchParams.set('callbackUrl', '/cuenta');
  const result = await handlers.GET(new NextRequest(callback, { headers: { cookie: request.headers.get('cookie') ?? '' } }));
  // Auth.js may answer with an immutable redirect; copy it to add the private headers.
  const headers = new Headers(result.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(result.body, { status: result.status, headers });
}
