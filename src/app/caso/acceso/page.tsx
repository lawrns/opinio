import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { buyerProofEnabled } from '@/lib/auth/spike';
import { ConfirmCaseAccess } from './ConfirmCaseAccess';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Acceso a tu caso — Opinio', robots: { index: false, follow: false } };

const RESULT: Record<string, string> = {
  invalido: 'Este enlace ya no es válido: venció, ya se usó o se pidió uno más nuevo.',
};

/** Landing for the buyer's emailed link. Loads no analytics or third-party assets. */
export default async function CaseAccessPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!buyerProofEnabled()) notFound();
  const result = RESULT[(await searchParams).resultado ?? ''];
  return (
    <AuthShell title="Acceso a tu caso">
      {result ? (
        <p role="status" data-testid="case-access-result">
          {result} <Link href="/caso/acceso/reenviar" className="font-bold underline">Pide uno nuevo</Link>.
        </p>
      ) : (
        <>
          <p>Presiona el botón para ver tu caso. El enlace funciona una sola vez.</p>
          <ConfirmCaseAccess />
        </>
      )}
    </AuthShell>
  );
}
