import { headers } from 'next/headers';
import { after, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { recordTransportOutcome, requestCaseLinkResend } from '@/lib/authz/buyer-access';
import { clientAddress } from '@/lib/auth/rate-limit';
import { sendCaseAccessLink } from '@/lib/auth/case-email';
import { sameOrigin } from '@/lib/auth/same-origin';
import { buyerProofEnabled, PRIVATE_HEADERS } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';

/**
 * Same answer for every input: a match, a mismatch, a limit or a failure.
 * The email goes out after the response (`after`), so a match does not take
 * measurably longer than a mismatch by waiting on the mail server.
 */
export async function POST(request: NextRequest) {
  if (!buyerProofEnabled()) return new Response('Not found', { status: 404 });
  const done = new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: '/caso/acceso/reenviar?resultado=revisa' } });
  if (!sameOrigin(request)) return done;
  const form = await request.formData().catch(() => null);
  try {
    const resend = await requestCaseLinkResend(pool, {
      caseNumber: form?.get('caseNumber'),
      email: form?.get('email'),
      client: clientAddress((await headers()).get('x-forwarded-for')),
    });
    if (resend) {
      after(async () => {
        await recordTransportOutcome(pool, resend.tokenId, await sendCaseAccessLink(resend.email, resend.token)).catch(() => {
          console.error('[case-access] resend outcome not recorded');
        });
      });
    }
  } catch {
    console.error('[case-access] resend failed');
  }
  return done;
}
