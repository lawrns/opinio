import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Fingerprint,
  Receipt,
  ChatsCircle,
  ShieldCheck,
} from '@phosphor-icons/react/dist/ssr';
import type { Business } from '@/lib/types';
import { meetsEvidenceThreshold } from '@/lib/evidence-threshold';
import { BrandLogo } from '@/components/BrandLogo';
import { StarRating, ratingSentimentLabel } from '@/components/StarRating';
import { HomeSearch } from './HomeSearch';

const SAMPLE_PASSPORT = {
  name: 'Casa Nogal',
  domain: 'casanogal.mx · Muebles y diseño',
  category: 'Muebles',
  score: 86,
  rating: 4.6,
  reviewsCount: '1,248 opiniones',
  rfc: 'CNO210415KA9 · Guadalajara, JAL',
  coveragePct: '93.9%',
  ordersLabel: '13,911 invitados de 14,821 pedidos',
  resuelveTitle: '18 de 19 casos cerrados con confirmación',
};

function formatInt(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function TrustGraphHero({ business }: { business?: Business }) {
  const hasScore = Boolean(business && meetsEvidenceThreshold(business.verified_reviews_count));
  const scoreLabel =
    business && hasScore
      ? Number(business.trust_score).toFixed(1).replace(/\.0$/, '')
      : business
        ? 'Sin dato'
        : String(SAMPLE_PASSPORT.score);

  return (
    <div>
      <section className="relative min-h-[491px] overflow-hidden border-b border-op-border bg-[#fcfbf3]">
        {/* Trustpilot-inspired 1280x491 Geometric Background Layer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1280 491"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full"
          >
            <defs>
              <clipPath id="tp-hero-clip">
                <rect width="1280" height="491" x="0" y="0" />
              </clipPath>
            </defs>
            <g clipPath="url(#tp-hero-clip)">
              {/* Layer 1: Yellow Rounded Square (rgb(255,228,0)) */}
              <g className="animate-tp-rect">
                <path
                  fill="rgb(255,228,0)"
                  d="M500.79,50.45 C500.79,50.45 500.79,450.34 500.79,450.34 C500.79,478.19 478.19,500.79 450.34,500.79 C450.34,500.79 50.45,500.79 50.45,500.79 C22.60,500.79 0,478.19 0,450.34 C0,450.34 0,50.45 0,50.45 C0,22.60 22.60,0 50.45,0 C50.45,0 450.34,0 450.34,0 C478.19,0 500.79,22.60 500.79,50.45z"
                />
              </g>
              {/* Layer 2: Emerald Rounded Triangle (rgb(4,218,141)) */}
              <g className="animate-tp-triangle">
                <path
                  fill="rgb(4,218,141)"
                  d="M350.86,87.17 C373.23,48.43 429.14,48.43 451.51,87.17 C451.51,87.17 698.29,514.61 698.29,514.61 C720.66,553.35 692.69,601.77 647.96,601.77 C647.96,601.77 154.40,601.77 154.40,601.77 C109.67,601.77 81.70,553.35 104.07,514.61 C104.07,514.61 350.86,87.17 350.86,87.17z"
                />
              </g>
              {/* Layer 3: Orange Circle (rgb(253,121,26)) */}
              <g className="animate-tp-circle">
                <path
                  fill="rgb(253,121,26)"
                  d="M303.91,607.14 C471.75,607.14 607.82,471.23 607.82,303.57 C607.82,135.91 471.75,0 303.91,0 C136.06,0 0,135.91 0,303.57 C0,471.23 136.06,607.14 303.91,607.14z"
                />
              </g>
            </g>
          </svg>
        </div>

        <div className="op-container relative z-10 grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:py-20">
          {/* Left Column: Clear Headline + Search (solid rendering, no opacity:0 or backdrop-blur) */}
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-op-ink/15 bg-white px-3.5 py-1.5 shadow-2xs">
              <span className="size-2 rounded-full bg-[#00b67a]" aria-hidden="true" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1a1b]">
                Directorio de confianza · México
              </span>
            </div>

            <h1 className="max-w-xl text-[clamp(2.35rem,4.5vw,3.85rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[#1b1a1b]">
              Antes de comprar, conoce a quién{' '}
              <span className="text-op-green-dark">le compras.</span>
            </h1>

            <p className="mb-8 mt-4 max-w-[520px] rounded-xl bg-[#fcfbf3] px-3 py-1.5 -mx-3 text-base font-medium leading-relaxed text-[#1b1a1b]/90 sm:text-[17px]">
              Lee opiniones de compradores en México, revisa cuántos pedidos registra la tienda y mira si resuelve los reclamos.
            </p>

            <HomeSearch />
          </div>

          {/* Right Column: Calm, Focused Pasaporte Opinio Card */}
          <div className="relative z-10 min-w-0">
            <div className="overflow-hidden rounded-2xl border border-op-border bg-white shadow-elevated">
              {/* Calm Neutral Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-op-border bg-[#fcfbf3] px-5 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="size-4 text-op-green-dark" weight="fill" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-op-ink">
                    Pasaporte Opinio · MX
                  </span>
                </div>
                <span className="rounded-full border border-op-border bg-white px-2.5 py-0.5 font-mono text-[10px] font-medium text-op-muted">
                  {business ? 'Perfil del directorio' : 'Ejemplo ilustrativo · Datos ficticios'}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                {/* Store Identity + Score */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <BrandLogo
                      name={business ? business.brand_name : SAMPLE_PASSPORT.name}
                      src={business?.logo_url}
                      category={business ? business.category : SAMPLE_PASSPORT.category}
                      priority
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold tracking-tight text-op-ink">
                        {business ? business.brand_name : SAMPLE_PASSPORT.name}
                      </h2>
                      <p className="mt-0.5 truncate font-mono text-xs text-op-muted">
                        {business ? business.domain || business.category : SAMPLE_PASSPORT.domain}
                      </p>
                      {business ? (
                        Number(business.review_count) > 0 && business.average_rating != null ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StarRating rating={Number(business.average_rating)} size="sm" />
                            <span className="text-xs font-semibold text-op-ink">
                              {Number(business.average_rating).toFixed(1)}
                            </span>
                            <span className="text-xs text-op-muted">
                              ({formatInt(Number(business.review_count))} opiniones)
                            </span>
                          </div>
                        ) : null
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StarRating rating={SAMPLE_PASSPORT.rating} size="sm" />
                          <span className="text-xs font-semibold text-op-ink">
                            {ratingSentimentLabel(SAMPLE_PASSPORT.rating)} · {SAMPLE_PASSPORT.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-op-muted">({SAMPLE_PASSPORT.reviewsCount})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Calm Score Box */}
                  <div className="shrink-0 rounded-xl border border-op-border bg-[#fcfbf3] px-3.5 py-2 text-right">
                    <p className="font-mono text-2xl font-bold leading-none tracking-tight text-op-ink">
                      {scoreLabel}
                      {(!business || hasScore) && (
                        <span className="ml-0.5 text-xs font-normal text-op-muted">/100</span>
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-op-muted">Puntaje Opinio</p>
                  </div>
                </div>

                {/* Required SEO anchor link & context subtitle */}
                <p className="mt-5 text-xs text-op-secondary">
                  <Link
                    href="/blog"
                    className="font-semibold text-op-ink underline decoration-[#00b67a] decoration-2 underline-offset-4 hover:text-op-green-dark"
                  >
                    Más que una calificación.
                  </Link>{' '}
                  Tres datos claros por tienda:
                </p>

                {/* 3 Calm, Uniform Pillar Rows */}
                <div className="mt-3 divide-y divide-op-border rounded-xl border border-op-border bg-[#fcfbf3]/60 px-4">
                  {/* 01 EXISTE */}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-op-border bg-white text-op-ink">
                        <Fingerprint aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-op-ink">Identidad registrada</p>
                        <p className="truncate font-mono text-[11px] text-op-muted">
                          {business ? business.legal_name || 'Datos fiscales y contacto' : SAMPLE_PASSPORT.rfc}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-op-border bg-white px-2.5 py-0.5 font-mono text-[10px] font-medium text-op-secondary">
                      SAT · DENUE
                    </span>
                  </div>

                  {/* 02 CUMPLE */}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-op-border bg-white text-op-ink">
                        <Receipt aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-op-ink">Cobertura de pedidos</p>
                        <p className="truncate font-mono text-[11px] text-op-muted">
                          {business && business.observed_orders_count > 0
                            ? `${Number(business.coverage_percentage).toFixed(1).replace(/\.0$/, '')}% de pedidos con invitación`
                            : SAMPLE_PASSPORT.ordersLabel}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-op-border bg-white px-2.5 py-0.5 font-mono text-[10px] font-semibold text-op-ink">
                      {business && business.observed_orders_count > 0
                        ? `${Number(business.coverage_percentage).toFixed(1).replace(/\.0$/, '')}%`
                        : SAMPLE_PASSPORT.coveragePct}
                    </span>
                  </div>

                  {/* 03 RESUELVE */}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-op-border bg-white text-op-ink">
                        <ChatsCircle aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-op-ink">Atención a reclamos</p>
                        <p className="truncate text-[11px] text-op-muted">
                          {business ? 'Seguimiento público de casos' : SAMPLE_PASSPORT.resuelveTitle}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-op-border bg-white px-2.5 py-0.5 font-mono text-[10px] font-medium text-op-secondary">
                      Confirmado
                    </span>
                  </div>
                </div>

                {/* Calm Card Footer */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-op-border pt-4">
                  <span className="text-xs text-op-muted">Cada perfil muestra sus fuentes</span>
                  <Link
                    href={business ? `/b/${business.slug}` : '/verificar'}
                    data-cta="home_explore_directory"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#1b1a1b] px-4.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-op-green-dark"
                  >
                    <span>{business ? 'Consultar este pasaporte' : 'Explorar el directorio'}</span>
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calm Secondary Prompt */}
      <div className="op-container pt-8">
        <div className="flex items-center gap-4">
          <div className="hidden h-px flex-1 bg-op-border md:block" aria-hidden="true" />
          <Link
            href="/verificar?accion=opinar"
            className="group mx-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-op-border bg-white px-5 py-2 text-sm font-medium text-op-ink shadow-flat transition-colors hover:border-op-strong"
          >
            <span className="text-op-secondary">¿Compraste en una tienda recientemente?</span>
            <span className="inline-flex items-center gap-1 font-semibold text-op-green-dark group-hover:underline">
              Escribir una opinión
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </Link>
          <div className="hidden h-px flex-1 bg-op-border md:block" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
