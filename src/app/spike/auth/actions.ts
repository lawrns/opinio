'use server';

import { auth } from '@/auth';
import { query } from '@/lib/db';
import { authSpikeEnabled } from '@/lib/auth/spike';

/**
 * B01 protected server action. Authorization is checked inside the action
 * itself (not by the page that renders the form), so a stale tab or a direct
 * POST with the action ID gets no write once the session is gone.
 */
export async function renameSignedInUser(formData: FormData): Promise<void> {
  if (!authSpikeEnabled()) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const name = String(formData.get('name') ?? '').slice(0, 80);
  await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
}
