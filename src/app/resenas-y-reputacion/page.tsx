import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, MessageSquare, ShieldCheck, Star } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  RESENAS_DESCRIPTION,
  RESENAS_FAQ,
  RESENAS_H1,
  RESENAS_PATH,
  resolveCanonicalBase,
  resenasFaqMainEntity,
} from '@/lib/resenas-reputacion';

// Same guarded site-URL pattern as layout.tsx, directorio, sitemap and /b/
// profiles: a stale fertilitylistings value in the env must never leak into
// the canonical or og:url.
const SITE_URL = resolveCanonicalBase(process.env.NEXT_PUBLIC_SITE_URL);
const CANONICAL = `${SITE_URL}${RESENAS_PATH}`;

export const metadata: Metadata = {
  title: 'Reseñas y reputación para tu negocio en México | Opinio.mx',
  description: RESENAS_DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Reseñas y reputación para tu negocio en México | Opinio.mx',
    description: RESENAS_DESCRIPTION,
    url: CANONICAL,
    siteName: 'Opinio.mx',
    locale: 'es_MX',
    type: 'website',
  },
};

const steps = [
  {
    Icon: ShieldCheck,
    title: 'Identidad verificable',
    body: (
      <>
        <Link href="/blog/demostrar-confiabilidad-negocio-mas-alla-estrellas">Tu perfil reúne los datos registrados del negocio</Link>
        : RFC, CLEE de INEGI, dominio y WhatsApp, con su fuente cuando existe.
      </>
    ),
  },
  {
    Icon: Star,
    title: 'Opiniones con evidencia',
    body: 'Cada opinión indica su tipo de evidencia y la cobertura muestra qué porcentaje de pedidos registrados recibió invitación a opinar.',
  },
  {
    Icon: MessageSquare,
    title: 'Respuestas y casos',
    body: (
      <>
        <Link href="/blog/responder-resena-negativa-mostrar-resolucion">Tu comercio puede responder opiniones</Link>
        {' '}y cada caso de atención queda con su seguimiento en el perfil.
      </>
    ),
  },
];

/**
 * GEO answer page (issue #17): the twelve ES-MX business-owner prompts
 * opinio.mx was absent from (0 of 24) in the pass-1 AI-answer scan.
 * Server-rendered — H1, the twelve questions and their answers are in the
 * initial HTML — and the FAQPage JSON-LD is built from the same array the
 * page renders. No stats, no ranking promises, no competitor names.
 */
export default function ResenasYReputacionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-op-canvas text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1">
        <section className="border-b border-op-border bg-op-shaded">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 lg:px-8">
            <p className="op-eyebrow mb-3">Para comercios</p>
            <h1 className="max-w-4xl text-3xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
              {RESENAS_H1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-op-secondary">
              Opinio es la plataforma mexicana donde tu negocio tiene un perfil público con evidencia:
              identidad registrada, opiniones con su tipo de evidencia y casos con seguimiento. Aquí
              están las respuestas a las dudas más comunes de dueños de negocio en México.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/merchant"
                data-cta="reputation_merchant_panel"
                className="inline-flex min-h-11 items-center rounded-full bg-op-action-accent px-6 py-3 text-sm font-semibold text-op-sheet transition-colors hover:bg-op-action-ink"
              >
                Panel para comercios
              </Link>
              <Link
                href="/directorio"
                data-cta="reputation_directory"
                className="inline-flex min-h-11 items-center rounded-full border border-op-border-strong px-6 py-3 text-sm font-medium"
              >
                Ver el directorio
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-op-border bg-op-sheet p-6">
                <Icon aria-hidden="true" className="size-5 text-op-green-dark" />
                <h2 className="mt-3 text-base font-bold">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-op-secondary">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black tracking-[-0.02em] sm:text-3xl">
            Preguntas de dueños de negocio
          </h2>
          <p className="mt-2 text-sm text-op-secondary">
            Las dudas más comunes sobre reseñas y reputación en México, respondidas con cómo funciona
            Opinio.
          </p>
          <div className="mt-6">
            {RESENAS_FAQ.map((item) => (
              <details key={item.q} className="group border-b border-op-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-op-green [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="pb-5 pr-8 text-sm leading-relaxed text-op-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: resenasFaqMainEntity(),
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}
