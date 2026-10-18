import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell, buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { isPlatformAdministrator } from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { gatedMetadata, merchantAuthEnabled } from '@/lib/auth/spike';
import { approveFirstOwnerAction, revokeOwnerApprovalAction } from './actions';

export const dynamic = 'force-dynamic';
/** Metadata only for platform administrators; everyone else gets a plain 404 (no route title). */
export async function generateMetadata(): Promise<Metadata> {
  const admin = merchantAuthEnabled() && (await isPlatformAdministrator(pool, await currentMerchantUserId().catch(() => null)));
  return gatedMetadata(admin, { title: 'Aprobaciones — Opinio', robots: { index: false, follow: false } });
}

const RESULT: Record<string, string> = {
  aprobado: 'Propietario aprobado.',
  transferido: 'Transferencia aprobada. El acceso anterior, las invitaciones pendientes y las claves del comercio quedaron revocados.',
  no_current_owner: 'Este comercio no tiene propietario; usa la aprobación de primer propietario.',
  already_owner: 'Esa persona ya es la propietaria.',
  stale_access: 'Este comercio aún tiene accesos activos sin propietario. Revócalos antes de aprobar.',
  invalid_request:
    'Revisa los datos: método, lo verificado (dominio o teléfono +52…), autoridad y referencia (por ejemplo VER-1042) son obligatorios.',
  revocado: 'Aprobación revocada. El acceso del propietario terminó.',
  approval_not_found: 'No hay una aprobación vigente con ese número.',
  business_not_found: 'No existe un comercio con ese identificador.',
  applicant_not_signed_in: 'La persona debe entrar a Opinio con ese correo antes de aprobarla.',
  self_approval: 'No puedes aprobarte a ti mismo.',
  owner_exists: 'Este comercio ya tiene propietario; un cambio requiere una transferencia.',
  unavailable: 'No se pudo guardar. Intenta de nuevo.',
};

/** First-owner approval for platform administrators only; everyone else gets 404. */
export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!merchantAuthEnabled()) notFound();
  if (!(await isPlatformAdministrator(pool, await currentMerchantUserId()))) notFound();
  const result = RESULT[(await searchParams).resultado ?? ''];
  const { rows: approvals } = await pool.query<{ id: number; slug: string; evidence_reference: string }>(
    `SELECT a.id, b.slug, a.evidence_reference
       FROM ownership_approvals a JOIN businesses b ON b.id = a.business_id
      WHERE a.revoked_at IS NULL
      ORDER BY a.id DESC LIMIT 50`,
  );

  return (
    <AuthShell title="Aprobar propietario">
      <p>
        Aprueba solo después de verificar, por un medio independiente del listado, que la persona controla el comercio
        (correo del dominio, DNS o llamada a un número verificado) y su autoridad documentada. Un listado reclamado, el
        RFC/CLEE o un contacto enviado no bastan.
      </p>
      {result && <p role="status" data-testid="approval-result">{result}</p>}
      <form action={approveFirstOwnerAction} className="space-y-4">
        <fieldset className="space-y-1.5">
          <legend className={labelClass}>Tipo de aprobación</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="kind" value="first_owner" defaultChecked /> Primer propietario
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="kind" value="transfer" /> Transferencia (revoca todo acceso actual del comercio)
          </label>
          <p data-testid="transfer-warning">
            Una transferencia revoca el acceso del propietario anterior y de todo su equipo, las invitaciones pendientes y
            las claves de integración del comercio. El nuevo propietario debe invitar de nuevo a su equipo.
          </p>
        </fieldset>
        <div className="space-y-1.5">
          <label htmlFor="businessSlug" className={labelClass}>Comercio (slug)</label>
          <input id="businessSlug" name="businessSlug" required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="applicantEmail" className={labelClass}>Correo con el que la persona entró</label>
          <input id="applicantEmail" name="applicantEmail" type="email" required className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="evidenceMethod" className={labelClass}>Control verificado por</label>
          <select id="evidenceMethod" name="evidenceMethod" required className={inputClass}>
            <option value="domain_email">Correo del dominio establecido de forma independiente</option>
            <option value="dns">Registro DNS del dominio</option>
            <option value="business_callback">Llamada a un número establecido de forma independiente</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="evidenceSubject" className={labelClass}>Dominio o teléfono verificado</label>
          <input id="evidenceSubject" name="evidenceSubject" required maxLength={253} placeholder="tienda.mx o +525512345678" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="authorityBasis" className={labelClass}>Autoridad documentada</label>
          <select id="authorityBasis" name="authorityBasis" required className={inputClass}>
            <option value="legal_representative">Representante legal</option>
            <option value="owner_of_record">Titular registrado</option>
            <option value="written_authorization">Autorización escrita</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="evidenceReference" className={labelClass}>Referencia de la evidencia</label>
          <input id="evidenceReference" name="evidenceReference" required pattern="[A-Z]{2,10}-[0-9]{1,12}" placeholder="VER-1042" className={inputClass} />
        </div>
        <button type="submit" className={buttonClass}>Aprobar</button>
      </form>
      {approvals.length > 0 && (
        <section className="space-y-3" aria-labelledby="vigentes">
          <h2 id="vigentes" className="text-base font-bold">Aprobaciones vigentes</h2>
          <ul className="space-y-2">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3" data-testid={`approval-${a.id}`}>
                <span>
                  #{a.id} · {a.slug} · {a.evidence_reference}
                </span>
                <form action={revokeOwnerApprovalAction}>
                  <input type="hidden" name="approvalId" value={a.id} />
                  <button type="submit" className="font-bold underline">Revocar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AuthShell>
  );
}
