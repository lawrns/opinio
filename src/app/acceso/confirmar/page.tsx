import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { gatedMetadata, merchantAuthEnabled } from '@/lib/auth/spike';
import { ConfirmLogin } from './ConfirmLogin';

export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata {
  return gatedMetadata(merchantAuthEnabled(), { title: 'Confirmar acceso — Opinio', robots: { index: false, follow: false } });
}

export default function ConfirmLoginPage() {
  if (!merchantAuthEnabled()) notFound();
  return (
    <AuthShell title="Confirma tu acceso">
      <p>Presiona el botón para entrar. El enlace funciona una sola vez.</p>
      <ConfirmLogin />
    </AuthShell>
  );
}
