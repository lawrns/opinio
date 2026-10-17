import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { AccessDenied, Unauthenticated, authorizeMerchant } from '@/lib/authz';
import { currentMerchantUserId } from '@/lib/authz/session';
import { merchantAuthEnabled } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Acceso al comercio — Opinio', robots: { index: false, follow: false } };

const ROLE_LABEL = { owner: 'Propietario', staff: 'Equipo' } as const;
const METHOD_LABEL: Record<string, string> = {
  domain_email: 'correo del dominio del comercio',
  dns: 'registro DNS del dominio',
  business_callback: 'llamada al número verificado del comercio',
};

/**
 * The approved business's access screen. Authorization runs before any read;
 * another business's ID and a missing one both give 404.
 */
export default async function BusinessAccessPage({ params }: { params: Promise<{ id: string }> }) {
  if (!merchantAuthEnabled()) notFound();
  let authority;
  try {
    authority = await authorizeMerchant(pool, {
      userId: await currentMerchantUserId(),
      resource: { kind: 'business', id: Number((await params).id) },
      permission: 'read_operational',
    });
  } catch (error) {
    if (error instanceof Unauthenticated) redirect('/acceso');
    if (error instanceof AccessDenied) notFound();
    throw new Error('unavailable');
  }

  const { rows } = await pool.query(
    `SELECT b.brand_name, a.evidence_method, a.approved_at
       FROM businesses b
       LEFT JOIN business_memberships m ON m.id = $2
       LEFT JOIN ownership_approvals a ON a.id = m.approval_id
      WHERE b.id = $1`,
    [authority.businessId, authority.membershipId],
  );
  const row = rows[0] as { brand_name: string; evidence_method: string | null; approved_at: Date | null };

  return (
    <AuthShell title={row.brand_name}>
      <p data-testid="business-access">
        Acceso aprobado como <strong>{ROLE_LABEL[authority.role]}</strong>
        {row.approved_at && row.evidence_method
          ? ` el ${row.approved_at.toISOString().slice(0, 10)}, verificado por ${METHOD_LABEL[row.evidence_method]}.`
          : '.'}
      </p>
      <p>El panel del comercio se abrirá por partes, conforme cada función pase sus pruebas de acceso.</p>
      <p>
        <Link href="/cuenta" className="font-bold underline">Volver</Link>
      </p>
    </AuthShell>
  );
}
