/**
 * B01 compatibility spike switch (issue #27). Off unless the server process
 * is started with OPINIO_AUTH_SPIKE=1, so production keeps every auth and
 * spike surface closed (404) and no merchant operation is reopened.
 */
export function authSpikeEnabled(): boolean {
  return process.env.OPINIO_AUTH_SPIKE === '1';
}

/** Private, non-cacheable, non-indexable response headers for auth surfaces. */
export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;
