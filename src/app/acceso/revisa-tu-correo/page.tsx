import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { merchantAuthEnabled } from '@/lib/auth/spike';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Revisa tu correo — Opinio', robots: { index: false, follow: false } };

/** The same page for every login request, whatever the address or outcome. */
export default function CheckEmailPage() {
  if (!merchantAuthEnabled()) notFound();
  return (
    <AuthShell title="Revisa tu correo">
      <p>Si ese correo puede entrar a Opinio, te enviamos un enlace. Vence en 15 minutos y funciona una sola vez.</p>
      <p>
        ¿No llegó? Espera unos minutos y <Link href="/acceso" className="font-bold underline">pide otro enlace</Link>.
      </p>
    </AuthShell>
  );
}
