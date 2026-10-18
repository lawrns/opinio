/**
 * conversion/consent.ts — Opinio's existing opt-in consent
 * (src/components/Analytics.tsx, key `opinio.analytics-consent`). Only an
 * explicit "granted" allows measurement; "pending" and "denied" both mean no
 * journey ID, no events and no server forwarding.
 */
import type { ConsentState } from './contract';

export const CONSENT_STORAGE_KEY = 'opinio.analytics-consent';
export const CONVERSION_STORAGE_KEY = 'opinio.conversion-v1';

export function resolveConsent(stored: string | null | undefined): ConsentState {
  return stored === 'granted' ? 'granted' : 'denied';
}

export function readConsent(win: { localStorage?: Pick<Storage, 'getItem'> } | undefined = typeof window === 'undefined' ? undefined : window): ConsentState {
  if (!win) return 'denied';
  try {
    return resolveConsent(win.localStorage?.getItem(CONSENT_STORAGE_KEY) ?? null);
  } catch {
    return 'denied';
  }
}
