import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell, inputClass } from '@/components/auth/AuthShell';
import { pool } from '@/lib/db';
import { listOpenRecoveries } from '@/lib/authz/case-recovery';
import { isPlatformAdministrator } from '@/lib/authz/owners';
import { currentMerchantUserId } from '@/lib/authz/session';
import { buyerProofEnabled, merchantAuthEnabled } from '@/lib/auth/spike';
import { approveRecoveryAction, rejectRecoveryAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Recuperaciones — Opinio', robots: { index: false, follow: false } };

const RESULT: Record<string, string> = {
  aprobada: 'Aprobada. Enviamos un enlace de un solo uso al contacto original del caso.',
  aprobada_sin_envio: 'Aprobada, pero el correo no se pudo enviar. El comprador puede pedir otro enlace desde "Nuevo enlace".',
  cerrada: 'Solicitud cerrada sin enviar nada.',
  not_open: 'Esa solicitud ya no está abierta.',
  not_email: 'El contacto original no es un correo: queda en verificación manual, sin envío.',
  invalid_decision: 'Indica cómo verificaste y una referencia (por ejemplo VER-1042).',
  unavailable: 'No se pudo guardar. Intenta de nuevo.',
};

const KIND = { email: 'correo', phone: 'solo teléfono', ambiguous: 'contacto ambiguo' } as const;

/** Manual review of legacy case recovery (ADR 0005). Platform administrators only; everyone else gets 404. */
export default async function RecoveriesPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!merchantAuthEnabled() || !buyerProofEnabled()) notFound();
  if (!(await isPlatformAdministrator(pool, await currentMerchantUserId()))) notFound();
  const result = RESULT[(await searchParams).resultado ?? ''];
  const open = await listOpenRecoveries(pool);
  return (
    <AuthShell title="Recuperaciones de casos previos">
      <p>
        Aprueba solo después de verificar por un medio independiente (registro del pedido, del comercio o llamada) que la
        persona es quien abrió el caso. El enlace se envía únicamente al contacto original guardado en el caso.
      </p>
      {result && <p role="status" data-testid="recovery-admin-result">{result}</p>}
      {open.length === 0 ? (
        <p data-testid="recovery-queue-empty">No hay solicitudes abiertas.</p>
      ) : (
        <ul className="space-y-4">
          {open.map((r) => (
            <li key={r.requestId} className="space-y-2 rounded-2xl border border-[var(--op-border-hairline)] p-4" data-testid={`recovery-${r.requestId}`}>
              <p>
                {`${r.caseNumber} · ${r.businessSlug} · ${KIND[r.contactKind]} · ${r.storedContact}`}
              </p>
              {r.contactKind === 'email' && r.status === 'pending' && (
                <form action={approveRecoveryAction} className="space-y-2">
                  <input type="hidden" name="requestId" value={r.requestId} />
                  <select name="basis" required className={inputClass} defaultValue="">
                    <option value="" disabled>Cómo verificaste</option>
                    <option value="order_record">Registro del pedido</option>
                    <option value="merchant_record">Registro del comercio</option>
                    <option value="buyer_callback">Llamada al comprador</option>
                    <option value="other_documented">Otro medio documentado</option>
                  </select>
                  <input name="reference" required pattern="[A-Z]{2,10}-[0-9]{1,12}" placeholder="VER-1042" className={inputClass} />
                  <button type="submit" className="font-bold underline">Aprobar y enviar enlace</button>
                </form>
              )}
              <form action={rejectRecoveryAction}>
                <input type="hidden" name="requestId" value={r.requestId} />
                <button type="submit" className="font-bold underline">Cerrar sin enviar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AuthShell>
  );
}
