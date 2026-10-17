import NextAuth from 'next-auth';
import Nodemailer from 'next-auth/providers/nodemailer';
import PostgresAdapter from '@auth/pg-adapter';
import { pool } from '@/lib/db';
import { strictAdapter } from '@/lib/auth/adapter';
import { sanitizedAuthLogger } from '@/lib/auth/logger';
import { ACCESS_LINK_TTL_MS, SESSION_TTL_MS } from '@/lib/authz/policy';

// Approved defaults (spec #26), single-sourced in the authority policy.
export const EMAIL_LINK_MAX_AGE_SECONDS = ACCESS_LINK_TTL_MS / 1000;
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/**
 * Merchant email login (B01 spike, issue #27). Test runs point
 * AUTH_EMAIL_SERVER at a local mail sink; no production sender is configured
 * or approved. Every entry point is gated by `authSpikeEnabled()`.
 *
 * The config is built lazily, per request, and the Nodemailer provider is
 * added only when a mail server is configured: the provider throws without
 * one, and neither `next build` nor a session check needs mail settings.
 * Without a mail server, existing sessions still verify and sign-in is off.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: strictAdapter(PostgresAdapter(pool)),
  providers: process.env.AUTH_EMAIL_SERVER
    ? [
        Nodemailer({
          server: process.env.AUTH_EMAIL_SERVER,
          from: process.env.AUTH_EMAIL_FROM,
          maxAge: EMAIL_LINK_MAX_AGE_SECONDS,
        }),
      ]
    : [],
  session: { strategy: 'database', maxAge: SESSION_MAX_AGE_SECONDS },
  logger: sanitizedAuthLogger,
}));
