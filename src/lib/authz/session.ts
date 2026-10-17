import { auth } from '@/auth';

/** The signed-in merchant user's ID from the database session, or null. */
export async function currentMerchantUserId(): Promise<number | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** True when the app is served over HTTPS (AUTH_URL), which selects `__Host-` cookies. */
export function servedOverHttps(): boolean {
  return (process.env.AUTH_URL ?? '').startsWith('https://');
}
