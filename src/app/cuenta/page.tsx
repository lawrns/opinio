import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AuthShell, buttonClass } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { listMemberBusinesses } from '@/lib/authz';
import { currentMerchantUserId } from '@/lib/authz/session';
import { merchantAuthEnabled } from '@/lib/auth/spike';
import { signOutAction } from '@/app/acceso/actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu acceso — Opinio', robots: { index: false, follow: false } };

const ROLE_LABEL = { owner: 'Propietario', staff: 'Equipo' } as const;

/**
 * Signed-in account screen. Without an approved membership it shows only the
 * pending state; with one it lists the approved businesses and nothing else.
 * The merchant dashboard stays closed.
 */
export default async function AccountPage() {
  if (!merchantAuthEnabled()) notFound();
  const userId = await currentMerchantUserId();
  if (!userId) redirect('/acceso');
  const businesses = await listMemberBusinesses(pool, userId);

  return (
    <AuthShell title="Tu acceso">
      {businesses.length === 0 ? (
        <p data-testid="access-pending">
          Tu acceso está pendiente. Un administrador de Opinio debe verificar de forma independiente que controlas el
          comercio y que tienes autoridad para representarlo antes de darte acceso.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="access-businesses">
          {businesses.map((b) => (
            <li key={b.businessId}>
              <Link href={`/cuenta/negocios/${b.businessId}`} className="font-bold underline">
                {b.brandName}
              </Link>{' '}
              · {ROLE_LABEL[b.role]}
            </li>
          ))}
        </ul>
      )}
      <form action={signOutAction}>
        <button type="submit" className={buttonClass}>Cerrar sesión</button>
      </form>
    </AuthShell>
  );
}
