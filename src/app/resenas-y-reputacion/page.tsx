import type { Metadata } from 'next';
import Link from 'next/link';
import { LinkedText } from '@/components/LinkedText';
import { ChevronDown, MessageSquare, ShieldCheck, Star, ArrowUpRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
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
    number: '01 · EXISTE',
    accent: 'border-t-[#1b1a1b]',
    iconBg: 'bg-op-blue-soft text-op-blue-dark border-op-blue-border',
    title: 'Identidad verificable',
    body: (
      <>
        <Link
          href="/blog/demostrar-confiabilidad-negocio-mas-alla-estrellas"
          className="font-semibold text-op-green-dark underline decoration-[#00b67a] underline-offset-4 hover:text-op-ink"
        >
          Tu perfil reúne los datos registrados del negocio
        </Link>
        : RFC, CLEE de INEGI, dominio y WhatsApp, con su fuente cuando existe.
      </>
    ),
  },
  {
    Icon: Star,
    number: '02 · CUMPLE',
    accent: 'border-t-[#00b67a]',
    iconBg: 'bg-op-green-soft text-op-green-dark border-op-green-border',
    title: 'Opiniones con evidencia',
    body: 'Cada opinión indica su tipo de evidencia y la cobertura compara las invitaciones registradas con los pedidos registrados.',
  },
  {
    Icon: MessageSquare,
    number: '03 · RESUELVE',
    accent: 'border-t-[#fd791a]',
    iconBg: 'bg-op-peach-soft text-op-peach border-op-peach-border',
    title: 'Respuestas y casos',
    body: (
      <>
        <Link
          href="/blog/responder-resena-negativa-mostrar-resolucion"
          className="font-semibold text-op-green-dark underline decoration-[#00b67a] underline-offset-4 hover:text-op-ink"
        >
          Tu comercio puede responder opiniones
        </Link>{' '}
        y cada caso de atención queda con su seguimiento en el perfil.
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
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas pb-16">
        <section className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3]">
          {/* Trustpilot-inspired animated geometric background shapes */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 280"
            className="pointer-events-none absolute right-0 top-0 hidden h-full w-[520px] opacity-85 lg:block"
          >
            <g className="animate-op-float">
              <circle cx="460" cy="50" r="110" fill="#fd791a" />
              <rect x="290" y="120" width="150" height="150" rx="28" fill="#ffe400" transform="rotate(-12 365 195)" />
              <path
                d="M510 120 L590 255 L430 255 Z"
                fill="#04da8d"
                stroke="#04da8d"
                strokeWidth="14"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pt-14 lg:px-8">
            <Breadcrumbs
              siteUrl={SITE_URL}
              items={[
                { name: 'Inicio', href: '/' },
                { name: RESENAS_H1, href: RESENAS_PATH },
              ]}
            />
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-op-ink/15 bg-white px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-op-ink shadow-2xs">
              <span className="size-2 rounded-full bg-[#00b67a]" aria-hidden="true" />
              Para comercios · México
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-extrabold tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl lg:text-5xl">
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
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-3 text-sm font-bold text-white shadow-flat transition-all hover:bg-op-green-dark"
              >
                Panel para comercios
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/directorio"
                data-cta="reputation_directory"
                className="inline-flex min-h-11 items-center rounded-full border border-op-strong bg-white px-6 py-3 text-sm font-bold text-op-ink shadow-2xs transition-all hover:border-[#1b1a1b] hover:bg-op-shaded"
              >
                Ver el directorio
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map(({ Icon, number, accent, iconBg, title, body }) => (
              <div
                key={title}
                className={`rounded-[22px] border border-op-border border-t-4 ${accent} bg-white p-6 shadow-flat transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated sm:p-7`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-muted">
                    {number}
                  </span>
                  <span className={`flex size-10 items-center justify-center rounded-xl border ${iconBg}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-op-ink">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-[24px] border border-op-border bg-white p-6 shadow-elevated sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#b2f8cc] px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-[#0a2e1d]">
              12 preguntas frecuentes · Guía práctica
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.025em] text-op-ink sm:text-3xl">
              Preguntas de dueños de negocio
            </h2>
            <p className="mt-2 text-sm text-op-secondary">
              <Link
                href="/blog"
                className="font-semibold underline decoration-[#00b67a] decoration-2 underline-offset-4 hover:text-op-green-dark"
              >
                Las dudas más comunes sobre reseñas y reputación en México, respondidas con cómo funciona Opinio.
              </Link>
            </p>
            <div className="mt-6 divide-y divide-op-border">
              {RESENAS_FAQ.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-bold text-op-ink transition-colors hover:text-op-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-op-green [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#fcfbf3] text-op-ink transition-colors group-open:bg-[#00b67a] group-open:text-[#1b1a1b]">
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                      />
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-op-secondary">
                    <LinkedText text={item.a} link={item.answerLink} />
                  </p>
                </details>
              ))}
            </div>
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
