'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { pool } from '@/lib/db';
import { parseEmail } from '@/lib/authz/policy';
import { allowLoginLink, clientAddress } from '@/lib/auth/rate-limit';
import { merchantAuthEnabled } from '@/lib/auth/spike';

/**
 * Sends a login link when the address is valid and within the rate limits.
 * Every outcome redirects to the same page, so the response never reveals
 * whether an address exists, was rate limited or failed to send. This is the
 * only way to request a link: direct Auth.js sign-in POSTs are closed.
 */
export async function requestLoginLink(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  const email = parseEmail(formData.get('email'));
  if (email) {
    try {
      const client = clientAddress((await headers()).get('x-forwarded-for'));
      if (await allowLoginLink(pool, { email, client })) {
        await signIn('nodemailer', { email, redirect: false, redirectTo: '/cuenta' });
      }
    } catch {
      console.error('[auth] login link request failed');
    }
  }
  redirect('/acceso/revisa-tu-correo');
}

/** Ends the current database session. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/acceso' });
}
