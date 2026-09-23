import type { Metadata } from 'next';
import { Brand } from '@/components/Brand';

const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const baseUrl = envSiteUrl && !envSiteUrl.includes('fertilitylistings') ? envSiteUrl : 'https://opinio.mx';

export const metadata: Metadata = {
  alternates: {
    canonical: baseUrl,
  },
};

export default function HomePage() {
  return (
    <main id="contenido" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-16 focus:outline-none sm:py-24">
      <div className="w-full max-w-2xl rounded-op-card border border-op-border bg-op-sheet p-8 sm:p-12">
        <Brand />
        <h1 className="mt-8 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
          Opinio México está fuera de línea.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-op-secondary">
          Los perfiles públicos de comercios, las calificaciones, las opiniones y los casos de resolución están
          deshabilitados. Mientras se revisa la verificación de los datos que respaldan cada ficha, no se publica ningún
          perfil y no se reciben opiniones.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-op-secondary">
          Los perfiles se publicarán de nuevo únicamente cuando cada dato pueda acreditarse con su fuente.
        </p>
      </div>
    </main>
  );
}
