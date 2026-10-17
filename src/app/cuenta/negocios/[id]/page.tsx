import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AuthShell, buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { AccessDenied, Unauthenticated, authorizeMerchant } from '@/lib/authz';
import { roleAllows } from '@/lib/authz/policy';
import { currentMerchantUserId } from '@/lib/authz/session';
import { listBusinessTeam } from '@/lib/authz/staff';
import { merchantAuthEnabled } from '@/lib/auth/spike';
import { inviteStaffAction, removeStaffAction, revokeInvitationAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Acceso al comercio — Opinio', robots: { index: false, follow: false } };

const ROLE_LABEL = { owner: 'Propietario', staff: 'Equipo' } as const;
const METHOD_LABEL: Record<string, string> = {
  domain_email: 'correo del dominio del comercio',
  dns: 'registro DNS del dominio',
  business_callback: 'llamada al número verificado del comercio',
};

const TEAM_RESULT: Record<string, string> = {
  invitado: 'Invitación enviada. Vence en 24 horas.',
  invitacion_retirada: 'Invitación retirada.',
  removido: 'La persona ya no tiene acceso a este comercio.',
  invalid_email: 'Revisa el correo.',
  already_member: 'Esa persona ya tiene acceso a este comercio.',
  too_many_pending: 'Hay demasiadas invitaciones pendientes. Retira alguna antes de invitar.',
  rate_limited: 'Enviaste muchas invitaciones en poco tiempo. Intenta de nuevo en unos minutos.',
  not_found: 'Esa invitación ya no está pendiente.',
  not_staff: 'Solo puedes quitar a personas del equipo. El propietario cambia solo con una transferencia aprobada.',
  mail_unavailable: 'No pudimos enviar la invitación; no quedó activa.',
  unavailable: 'No se pudo guardar. Intenta de nuevo.',
};

/**
 * The approved business's access screen. Authorization runs before any read;
 * another business's ID and a missing one both give 404.
 */
export default async function BusinessAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ equipo?: string }>;
}) {
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
  // Team management is owner-only; staff see none of it.
  const team = roleAllows(authority.role, 'manage_staff') ? await listBusinessTeam(pool, authority.businessId) : null;
  const teamResult = TEAM_RESULT[(await searchParams).equipo ?? ''];

  return (
    <AuthShell title={row.brand_name}>
      <p data-testid="business-access">
        Acceso aprobado como <strong>{ROLE_LABEL[authority.role]}</strong>
        {row.approved_at && row.evidence_method
          ? ` el ${row.approved_at.toISOString().slice(0, 10)}, verificado por ${METHOD_LABEL[row.evidence_method]}.`
          : '.'}
      </p>
      <p>El panel del comercio se abrirá por partes, conforme cada función pase sus pruebas de acceso.</p>
      {team && (
        <section className="space-y-4" aria-labelledby="equipo" data-testid="team">
          <h2 id="equipo" className="text-base font-bold text-[var(--op-ink-primary)]">Equipo</h2>
          {teamResult && <p role="status" data-testid="team-result">{teamResult}</p>}
          <ul className="space-y-2">
            {team.members.map((m) => (
              <li key={m.membershipId} className="flex items-center justify-between gap-3" data-testid={`member-${m.membershipId}`}>
                <span>
                  {m.email} · {ROLE_LABEL[m.role]}
                </span>
                {m.role === 'staff' && (
                  <form action={removeStaffAction}>
                    <input type="hidden" name="businessId" value={authority.businessId} />
                    <input type="hidden" name="membershipId" value={m.membershipId} />
                    <button type="submit" className="font-bold underline">Quitar acceso</button>
                  </form>
                )}
              </li>
            ))}
            {team.pendingInvitations.map((i) => (
              <li key={i.invitationId} className="flex items-center justify-between gap-3" data-testid={`invitation-${i.invitationId}`}>
                <span>
                  {i.email} · invitación pendiente
                </span>
                <form action={revokeInvitationAction}>
                  <input type="hidden" name="businessId" value={authority.businessId} />
                  <input type="hidden" name="invitationId" value={i.invitationId} />
                  <button type="submit" className="font-bold underline">Retirar</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={inviteStaffAction} className="space-y-3">
            <input type="hidden" name="businessId" value={authority.businessId} />
            <div className="space-y-1.5">
              <label htmlFor="staffEmail" className={labelClass}>Invitar a alguien del equipo (correo)</label>
              <input id="staffEmail" name="email" type="email" required maxLength={254} className={inputClass} />
            </div>
            <p>
              La persona debe entrar a Opinio con ese mismo correo. El equipo puede leer y responder; no puede invitar,
              cambiar ajustes ni crear claves.
            </p>
            <button type="submit" className={buttonClass}>Invitar</button>
          </form>
        </section>
      )}
      <p>
        <Link href="/cuenta" className="font-bold underline">Volver</Link>
      </p>
    </AuthShell>
  );
}
