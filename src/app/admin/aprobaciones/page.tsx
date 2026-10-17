import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell, buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { isPlatformAdministrator } from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { merchantAuthEnabled } from '@/lib/auth/spike';
import { approveFirstOwnerAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Aprobaciones — Opinio', robots: { index: false, follow: false } };

const RESULT: Record<string, string> = {
  aprobado: 'Propietario aprobado.',
  invalid_request: 'Revisa los datos: método, autoridad y referencia (por ejemplo VER-1042) son obligatorios.',
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

  return (
    <AuthShell title="Aprobar primer propietario">
      <p>
        Aprueba solo después de verificar, por un medio independiente del listado, que la persona controla el comercio
        (correo del dominio, DNS o llamada a un número verificado) y su autoridad documentada. Un listado reclamado, el
        RFC/CLEE o un contacto enviado no bastan.
      </p>
      {result && <p role="status" data-testid="approval-result">{result}</p>}
      <form action={approveFirstOwnerAction} className="space-y-4">
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
    </AuthShell>
  );
}
