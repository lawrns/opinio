import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell, buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { buyerProofEnabled, gatedMetadata } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata {
  return gatedMetadata(buyerProofEnabled(), { title: 'Recuperar el acceso a tu caso — Opinio', robots: { index: false, follow: false } });
}

/** Recovery request for cases opened before access emails existed. The answer never says whether anything matched. */
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!buyerProofEnabled()) notFound();
  const done = (await searchParams).resultado === 'recibido';
  return (
    <AuthShell title="Recuperar el acceso a tu caso">
      {done ? (
        <p role="status" data-testid="recovery-result">
          Recibimos tu solicitud. Si corresponde a un caso, una persona de Opinio la revisará antes de enviar cualquier enlace al
          contacto original del caso. Esto puede tardar.
        </p>
      ) : (
        <>
          <p>
            Para casos abiertos antes de que Opinio enviara enlaces de acceso. Una persona revisa cada solicitud; nunca enviamos el
            enlace a un correo nuevo.
          </p>
          <form method="post" action="/caso/recuperar/enviar" className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="caseNumber" className={labelClass}>Número de caso</label>
              <input id="caseNumber" name="caseNumber" required maxLength={50} placeholder="CASO-XXXX-2026-1234" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className={labelClass}>Correo con el que abriste el caso</label>
              <input id="email" name="email" type="email" required maxLength={254} className={inputClass} />
            </div>
            <button type="submit" className={buttonClass}>Solicitar revisión</button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
