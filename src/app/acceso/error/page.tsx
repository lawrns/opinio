import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { merchantAuthEnabled } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Enlace no válido — Opinio', robots: { index: false, follow: false } };

/** One message for every login failure; the provider's error code is not shown. */
export default function LoginErrorPage() {
  if (!merchantAuthEnabled()) notFound();
  return (
    <AuthShell title="Este enlace ya no sirve">
      <p>El enlace venció, ya se usó o está incompleto.</p>
      <p>
        <Link href="/acceso" className="font-bold underline">Pide un enlace nuevo</Link>.
      </p>
    </AuthShell>
  );
}
