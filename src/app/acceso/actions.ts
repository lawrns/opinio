'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { pool } from '@/lib/db';
import { allowLoginLink } from '@/lib/auth/rate-limit';
import { merchantAuthEnabled } from '@/lib/auth/spike';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a login link when the address is valid and within the rate limits.
 * Every outcome redirects to the same page, so the response never reveals
 * whether an address exists, was rate limited or failed to send.
 */
export async function requestLoginLink(formData: FormData): Promise<void> {
  if (!merchantAuthEnabled()) redirect('/');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (EMAIL.test(email) && email.length <= 255) {
    try {
      const client = ((await headers()).get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
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
