import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell, buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { buyerProofEnabled, gatedMetadata } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata {
  return gatedMetadata(buyerProofEnabled(), { title: 'Nuevo enlace para tu caso — Opinio', robots: { index: false, follow: false } });
}

/** Bounded resend. The answer never says whether a case or address exists. */
export default async function ResendPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!buyerProofEnabled()) notFound();
  const done = (await searchParams).resultado === 'revisa';
  return (
    <AuthShell title="Nuevo enlace para tu caso">
      {done ? (
        <p role="status" data-testid="resend-result">
          Si los datos coinciden con un caso, enviamos un enlace nuevo al correo privado del caso. Revisa tu bandeja; puede
          tardar unos minutos.
        </p>
      ) : (
        <form method="post" action="/caso/acceso/reenviar/enviar" className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="caseNumber" className={labelClass}>Número de caso</label>
            <input id="caseNumber" name="caseNumber" required maxLength={50} placeholder="CASO-XXXX-2026-1234" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className={labelClass}>Correo privado del caso</label>
            <input id="email" name="email" type="email" required maxLength={254} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Enviar enlace nuevo</button>
        </form>
      )}
      {!done && (
        <p>
          ¿Abriste tu caso antes de que pidiéramos un correo privado?{' '}
          <Link href="/caso/recuperar" className="font-bold underline">Solicita recuperar el acceso</Link>.
        </p>
      )}
    </AuthShell>
  );
}
