import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { authSpikeEnabled } from '@/lib/auth/spike';
import { renameSignedInUser } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** B01 compatibility spike page (issue #27); 404 unless the switch is on. */
export default async function AuthSpikePage() {
  if (!authSpikeEnabled()) notFound();
  const session = await auth();

  return (
    <main id="contenido" className="mx-auto max-w-md p-8">
      <h1 className="text-lg font-semibold">Auth.js spike</h1>
      <p data-testid="session-state">{session?.user?.email ? 'signed-in' : 'signed-out'}</p>
      <form action={renameSignedInUser}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" className="border" />
        <button type="submit">Save</button>
      </form>
    </main>
  );
}
