import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { currentMerchantUserId } from '@/lib/authz/session';
import { gatedMetadata, merchantAuthEnabled } from '@/lib/auth/spike';
import { AcceptInvitation } from './AcceptInvitation';

export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata {
  return gatedMetadata(merchantAuthEnabled(), { title: 'Invitación — Opinio', robots: { index: false, follow: false } });
}

const RESULT: Record<string, string> = {
  invalid_invitation: 'Esta invitación no es válida: venció, ya se usó o fue retirada. Pide una nueva.',
  wrong_identity: 'Esta invitación es para otro correo. Entra con el correo al que llegó.',
  already_member: 'Ya tienes acceso a este comercio.',
  unavailable: 'No se pudo aceptar. Intenta de nuevo.',
};

/** Staff invitation acceptance. Nothing here reveals which business invited whom. */
export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  if (!merchantAuthEnabled()) notFound();
  const result = RESULT[(await searchParams).resultado ?? ''];
  const signedIn = (await currentMerchantUserId()) !== null;
  return (
    <AuthShell title="Invitación al equipo">
      {result ? (
        <p role="status" data-testid="invitation-result">{result}</p>
      ) : (
        <AcceptInvitation signedIn={signedIn} />
      )}
    </AuthShell>
  );
}
