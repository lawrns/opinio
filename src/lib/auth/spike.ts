import type { Metadata } from 'next';
/**
 * B01 compatibility spike switch (issue #27). Off unless the server process
 * is started with OPINIO_AUTH_SPIKE=1, so production keeps every auth and
 * spike surface closed (404) and no merchant operation is reopened.
 */
export function authSpikeEnabled(): boolean {
  return process.env.OPINIO_AUTH_SPIKE === '1';
}

/**
 * Merchant login switch (B03, issue #29): /acceso, /cuenta, /admin/aprobaciones
 * and the Auth.js endpoints. Off unless OPINIO_MERCHANT_AUTH=1; production
 * stays off until the email sender and secrets administrator are designated.
 */
export function merchantAuthEnabled(): boolean {
  return process.env.OPINIO_MERCHANT_AUTH === '1';
}

/** Private, non-cacheable, non-indexable response headers for auth surfaces. */
export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

/**
 * A gated page's metadata, or none when the gate is closed: the 404 then
 * carries the site's default title, like any route that doesn't exist, so a
 * route title can't hint that a switched-off surface is there (QA-048).
 */
export function gatedMetadata(open: boolean, metadata: Metadata): Metadata {
  return open ? metadata : {};
}

