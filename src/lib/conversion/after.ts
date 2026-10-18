import { after } from 'next/server';

/**
 * Runs analytics work after the response is sent (Next `after()`), so it
 * never delays the user. If `after` is unavailable (no request scope), the
 * work still runs without being awaited. Never throws into the caller.
 */
export function afterResponse(work: () => Promise<unknown>): void {
  const run = () => work().catch(() => undefined);
  try {
    after(run);
  } catch {
    void run();
  }
}
