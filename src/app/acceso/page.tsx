import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AuthShell, buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { gatedMetadata, merchantAuthEnabled } from '@/lib/auth/spike';
import { currentMerchantUserId } from '@/lib/authz/session';
import { requestLoginLink } from './actions';

export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata {
  return gatedMetadata(merchantAuthEnabled(), { title: 'Entrar — Opinio', robots: { index: false, follow: false } });
}

export default async function LoginPage() {
  if (!merchantAuthEnabled()) notFound();
  if (await currentMerchantUserId()) redirect('/cuenta');
  return (
    <AuthShell title="Entrar como comercio">
      <p>Te enviamos un enlace de acceso por correo. No necesitas contraseña.</p>
      <form action={requestLoginLink} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>Correo</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
        <button type="submit" className={buttonClass}>Enviar enlace</button>
      </form>
    </AuthShell>
  );
}
