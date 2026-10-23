'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Fingerprint,
  Receipt,
  ChatsCircle,
  ShieldCheck,
  CheckCircle,
} from '@phosphor-icons/react/dist/ssr';
import type { Business } from '@/lib/types';
import { meetsEvidenceThreshold } from '@/lib/evidence-threshold';
import { BrandLogo } from '@/components/BrandLogo';
import { StarRating, ratingSentimentLabel } from '@/components/StarRating';
import { HomeSearch } from './HomeSearch';

interface IllustrativePassport {
  id: string;
  name: string;
  domain: string;
  category: string;
  score: number;
  rating: number;
  reviewsCount: string;
  rfc: string;
  coveragePct: number;
  ordersLabel: string;
  resuelveTitle: string;
  resuelveBadge: string;
  resuelveTone: 'green' | 'amber';
  quote: string;
  quoteAuthor: string;
  receiptCode: string;
}

const ILLUSTRATIVE_PASSPORTS: IllustrativePassport[] = [
  {
    id: 'nogal',
    name: 'Casa Nogal',
    domain: 'casanogal.mx · Muebles y diseño',
    category: 'Muebles',
    score: 86,
    rating: 4.6,
    reviewsCount: '1,248 opiniones',
    rfc: 'CNO210415KA9 · Guadalajara, JAL',
    coveragePct: 93.9,
    ordersLabel: '13,911 invitados / 14,821 órdenes',
    resuelveTitle: '18 de 19 casos confirmados',
    resuelveBadge: '3.2 d prom.',
    resuelveTone: 'green',
    quote: '“Llegó con un rasguño. En cuatro días repusieron la pieza y confirmé el cierre.”',
    quoteAuthor: 'Mariana G. · Guadalajara',
    receiptCode: 'Orden #MX-4821 · Compra verificada',
  },
  {
    id: 'altura',
    name: 'Café Altura',
    domain: 'cafealtura.mx · Tostadores de especialidad',
    category: 'Restaurantes',
    score: 91,
    rating: 4.8,
    reviewsCount: '842 opiniones',
    rfc: 'CAL190812P41 · Córdoba, VER',
    coveragePct: 97.2,
    ordersLabel: '9,140 invitados / 9,403 órdenes',
    resuelveTitle: '7 de 7 casos confirmados',
    resuelveBadge: '1.4 d prom.',
    resuelveTone: 'green',
    quote: '“Tostado fresco con lote trazable. El pedido llegó al día siguiente.”',
    quoteAuthor: 'Rodrigo V. · CDMX',
    receiptCode: 'Orden #MX-9104 · Compra verificada',
  },
  {
    id: 'lumen',
    name: 'Óptica Lumen',
    domain: 'opticalumen.mx · Salud visual',
    category: 'Salud',
    score: 74,
    rating: 4.1,
    reviewsCount: '319 opiniones',
    rfc: 'OLU200304M18 · Monterrey, NL',
    coveragePct: 68.4,
    ordersLabel: '2,120 invitados / 3,100 órdenes',
    resuelveTitle: '5 de 8 casos confirmados',
    resuelveBadge: '3 abiertos',
    resuelveTone: 'amber',
    quote: '“Tardaron en ajustar la graduación, pero el caso siguió abierto hasta quedar listo.”',
    quoteAuthor: 'Sofía L. · Monterrey',
    receiptCode: 'Orden #MX-3092 · Seguimiento activo',
  },
];

export function TrustGraphHero({ business }: { business?: Business }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (business || paused) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % ILLUSTRATIVE_PASSPORTS.length);
    }, 4600);
    return () => clearInterval(timer);
  }, [business, paused]);

  const sample = ILLUSTRATIVE_PASSPORTS[activeIdx];
  const score =
    business && meetsEvidenceThreshold(business.verified_reviews_count)
      ? Number(business.trust_score).toLocaleString('es-MX', { maximumFractionDigits: 1 })
      : 'Sin dato';

  const gaugeValue = business
    ? meetsEvidenceThreshold(business.verified_reviews_count)
      ? Math.min(100, Math.max(0, Number(business.trust_score) || 0))
      : 0
    : sample.score;

  const gaugeColor = gaugeValue >= 80 ? '#00b67a' : gaugeValue >= 60 ? '#f59e0b' : '#94a3b8';

  return (
    <div>
      <section className="relative min-h-[491px] overflow-hidden border-b border-op-border bg-[#fcfbf3]">
        {/* Reverse-engineered Trustpilot Lottie 1280x491 Geometric Motion Layer */}
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

        <div className="op-container relative z-10 grid items-center gap-12 py-12 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:py-20">
          {/* Left Column: Staggered Editorial Headline + Pill Search + Trust Strip */}
          <div>
            <div className="animate-tp-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-op-ink/15 bg-white/95 px-3.5 py-1.5 shadow-2xs backdrop-blur-xs">
              <span className="size-2 rounded-full bg-[#00b67a]" aria-hidden="true" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-op-ink">
                Pasaporte de confianza · México / MX
              </span>
            </div>

            <h1 className="animate-tp-fade-up max-w-2xl text-[clamp(2.5rem,4.8vw,4.15rem)] font-extrabold leading-[1.04] tracking-[-0.038em] text-[#1b1a1b]">
              Antes de comprar,
              <br />
              conoce a quién{' '}
              <span className="relative inline-block text-op-green-dark">
                le compras.
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-xs bg-[#04da8d]/35"
                />
              </span>
            </h1>

            <p className="animate-tp-fade-up-1 mb-8 mt-5 max-w-[540px] rounded-2xl bg-[#fcfbf3]/85 py-1 text-[17px] font-medium leading-[1.55] text-[#1b1a1b]/85 backdrop-blur-[2px]">
              Lee opiniones de compradores en México, revisa cuántos pedidos registra la tienda y mira si resuelve los reclamos.
            </p>

            <div className="animate-tp-fade-up-2">
              <HomeSearch />
            </div>

            {/* 3-pillar summary strip under search */}
            <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-op-ink/10 bg-white/92 p-4 shadow-flat backdrop-blur-xs sm:gap-5">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-op-blue-dark">
                  <span className="size-1.5 rounded-full bg-op-blue" aria-hidden="true" />
                  01 · Existe
                </div>
                <p className="mt-1 text-xs leading-snug text-op-secondary">
                  Razón social, RFC y canales registrados.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-op-green-dark">
                  <span className="size-1.5 rounded-full bg-[#00b67a]" aria-hidden="true" />
                  02 · Cumple
                </div>
                <p className="mt-1 text-xs leading-snug text-op-secondary">
                  Invitaciones sobre pedidos registrados.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-op-peach">
                  <span className="size-1.5 rounded-full bg-op-peach" aria-hidden="true" />
                  03 · Resuelve
                </div>
                <p className="mt-1 text-xs leading-snug text-op-secondary">
                  Casos cerrados cuando el cliente confirma.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Passport Showcase Card with Concentric Rings */}
          <div
            className="relative min-w-0 lg:py-4"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              aria-hidden="true"
              className="animate-op-ring pointer-events-none absolute -inset-4 hidden rounded-[28px] border border-[#1b1a1b]/20 sm:block"
            />
            <div
              aria-hidden="true"
              className="animate-op-ring-delayed pointer-events-none absolute -inset-8 hidden rounded-[34px] border border-[#00b67a]/25 lg:block"
            />

            {/* Floating Verified Purchase Badge (Top Right) */}
            {!business && (
              <div className="animate-op-float mb-3 flex items-center justify-between gap-2 rounded-xl border border-op-border bg-white/95 px-3.5 py-2 shadow-elevated backdrop-blur-xs sm:absolute sm:-right-3 sm:-top-3 sm:z-20 sm:mb-0">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-op-green-soft text-op-green-dark">
                    <CheckCircle aria-hidden="true" className="size-4" weight="fill" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-op-ink">Evidencia de compra</p>
                    <p className="font-mono text-[10px] text-op-muted">{sample.receiptCode}</p>
                  </div>
                </div>
                <span className="rounded-full bg-op-shaded px-2 py-0.5 font-mono text-[10px] font-semibold text-op-muted">
                  Ejemplo ilustrativo
                </span>
              </div>
            )}

            {/* Main Passport Card */}
            <div className="relative z-10 overflow-hidden rounded-[22px] border border-op-ink/15 bg-white shadow-hero">
              {/* Top Passport Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-op-border bg-[#1b1a1b] px-5 py-3 text-xs text-white">
                <div className="flex items-center gap-2">
                  <span className="animate-op-blink size-2 rounded-full bg-[#00b67a]" aria-hidden="true" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">
                    Pasaporte Opinio · MX
                  </span>
                </div>
                {!business ? (
                  <div className="flex items-center gap-1" role="tablist" aria-label="Ejemplos ilustrativos de pasaporte">
                    {ILLUSTRATIVE_PASSPORTS.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={activeIdx === idx}
                        onClick={() => setActiveIdx(idx)}
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium transition-colors ${
                          activeIdx === idx
                            ? 'bg-[#00b67a] font-bold text-[#1b1a1b]'
                            : 'bg-white/10 text-white/75 hover:bg-white/20'
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="font-mono text-[11px] text-white/70">OP / PERFIL</span>
                )}
              </div>

              {/* Fictional Example Disclaimer Strip when showing illustrative data */}
              {!business && (
                <div className="flex items-center justify-between border-b border-op-border bg-[#fcfbf3] px-5 py-2 font-mono text-[10px] tracking-wider text-op-muted">
                  <span className="font-semibold uppercase text-op-secondary">
                    Ejemplo ilustrativo · Datos ficticios
                  </span>
                  <span>CADA PERFIL MUESTRA SUS FUENTES</span>
                </div>
              )}

              <div className="p-6 sm:p-7">
                {business ? (
                  <>
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <BrandLogo
                          name={business.brand_name}
                          src={business.logo_url}
                          category={business.category}
                          priority
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-op-muted">Un comercio del directorio</p>
                          <h2 className="mt-1 text-2xl font-bold tracking-tight text-op-ink">{business.brand_name}</h2>
                          <p className="mt-0.5 break-words text-xs text-op-muted">
                            {business.domain || business.category}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-4xl font-bold tracking-tight text-op-green-dark">{score}</p>
                        <p className="mt-1 text-[11px] font-medium text-op-muted">Puntaje Opinio / 100</p>
                      </div>
                    </div>
                    {Number(business.review_count) > 0 && business.average_rating != null && (
                      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl bg-op-shaded px-3.5 py-2.5">
                        <StarRating rating={Number(business.average_rating)} size="sm" />
                        <span className="text-sm font-bold text-op-ink">
                          {ratingSentimentLabel(Number(business.average_rating))}
                        </span>
                        <span className="font-mono text-sm font-semibold text-op-secondary">
                          {Number(business.average_rating).toLocaleString('es-MX', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          / 5
                        </span>
                        <span className="text-xs text-op-muted">
                          · {Number(business.review_count).toLocaleString('es-MX')} opiniones
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Illustrative Merchant Header with Conic Score Gauge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <BrandLogo name={sample.name} category={sample.category} priority />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h2 className="text-xl font-bold tracking-tight text-op-ink sm:text-2xl">{sample.name}</h2>
                            <span className="inline-flex items-center gap-1 rounded-full bg-op-green-soft px-2 py-0.5 text-[11px] font-semibold text-op-green-dark">
                              <ShieldCheck aria-hidden="true" className="size-3.5" weight="fill" />
                              Identidad
                            </span>
                          </div>
                          <p className="mt-0.5 truncate font-mono text-xs text-op-muted">{sample.domain}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <StarRating rating={sample.rating} size="sm" />
                            <span className="text-xs font-bold text-op-ink">{ratingSentimentLabel(sample.rating)}</span>
                            <span className="font-mono text-xs font-semibold text-op-secondary">
                              {sample.rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-op-muted">({sample.reviewsCount})</span>
                          </div>
                        </div>
                      </div>

                      {/* Conic Score Gauge */}
                      <div className="flex shrink-0 flex-col items-center">
                        <div
                          className="relative flex size-16 items-center justify-center rounded-full p-1.5"
                          style={{
                            background: `conic-gradient(${gaugeColor} ${gaugeValue * 3.6}deg, #e2e8e4 0deg)`,
                          }}
                        >
                          <div className="flex size-full flex-col items-center justify-center rounded-full bg-white">
                            <span className="font-mono text-xl font-extrabold leading-none tracking-tight text-op-ink">
                              {gaugeValue}
                            </span>
                            <span className="font-mono text-[9px] font-semibold uppercase text-op-muted">/100</span>
                          </div>
                        </div>
                        <span className="mt-1 font-mono text-[10px] font-medium text-op-muted">Puntaje</span>
                      </div>
                    </div>

                    {/* Required SEO anchor link & context subtitle */}
                    <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-op-border bg-[#fcfbf3] px-4 py-2.5">
                      <p className="text-xs font-semibold text-op-ink">
                        <Link
                          href="/blog"
                          className="underline decoration-[#00b67a] decoration-2 underline-offset-4 hover:text-op-green-dark"
                        >
                          Más que una calificación.
                        </Link>{' '}
                        <span className="font-normal text-op-secondary">Tres datos claros por tienda:</span>
                      </p>
                    </div>
                  </>
                )}

                {/* 3 Pillars Inside the Passport Card */}
                <div className="mt-4 divide-y divide-op-border rounded-xl border border-op-border bg-op-canvas/60 px-4">
                  {/* 01 EXISTE */}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-op-blue-soft text-op-blue-dark">
                        <Fingerprint aria-hidden="true" className="size-4.5" weight="duotone" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-op-blue-dark">
                            01 · Existe
                          </span>
                          <span className="text-xs font-semibold text-op-ink">Quién vende</span>
                        </div>
                        <p className="truncate font-mono text-[11px] text-op-muted">
                          {business ? business.legal_name || 'Identidad y datos del comercio' : sample.rfc}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-op-blue-border bg-op-blue-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-op-blue-dark">
                      SAT · DENUE
                    </span>
                  </div>

                  {/* 02 CUMPLE */}
                  <div className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-op-green-soft text-op-green-dark">
                          <Receipt aria-hidden="true" className="size-4.5" weight="duotone" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-op-green-dark">
                              02 · Cumple
                            </span>
                            <span className="text-xs font-semibold text-op-ink">Cómo cumple</span>
                          </div>
                          <p className="truncate font-mono text-[11px] text-op-muted">
                            {business && business.observed_orders_count > 0
                              ? `${Number(business.coverage_percentage).toLocaleString('es-MX')}% de compradores invitados a opinar`
                              : sample.ordersLabel}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-op-green-border bg-op-green-soft px-2.5 py-0.5 font-mono text-[11px] font-bold text-op-green-dark">
                        {business && business.observed_orders_count > 0
                          ? `${Number(business.coverage_percentage).toLocaleString('es-MX')}%`
                          : `${sample.coveragePct}%`}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-op-inset" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-[#00b67a] transition-all duration-500"
                        style={{
                          width: `${
                            business
                              ? meetsEvidenceThreshold(business.verified_reviews_count)
                                ? Math.min(100, Math.max(0, Number(business.coverage_percentage) || 0))
                                : 0
                              : sample.coveragePct
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 03 RESUELVE */}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-op-peach-soft text-op-peach">
                        <ChatsCircle aria-hidden="true" className="size-4.5" weight="duotone" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-op-peach">
                            03 · Resuelve
                          </span>
                          <span className="text-xs font-semibold text-op-ink">Cómo responde</span>
                        </div>
                        <p className="truncate text-[11px] text-op-muted">
                          {business ? 'Casos y seguimiento de soluciones' : sample.resuelveTitle}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                        !business && sample.resuelveTone === 'amber'
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-op-green-border bg-op-green-soft text-op-green-dark'
                      }`}
                    >
                      {business ? 'Bilateral' : sample.resuelveBadge}
                    </span>
                  </div>
                </div>

                {/* Illustrative Customer Quote Strip */}
                {!business && (
                  <div className="mt-4 rounded-xl border border-op-border bg-white px-4 py-3 shadow-2xs">
                    <p className="text-xs italic leading-relaxed text-op-secondary">{sample.quote}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-op-muted">
                      <span className="font-semibold text-op-ink">{sample.quoteAuthor}</span>
                      <span className="font-mono text-[10px] text-op-green-dark">Resolución confirmada</span>
                    </div>
                  </div>
                )}

                {/* Bottom CTA + Stamp */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex -rotate-1 items-center gap-1.5 rounded-md border-[1.5px] border-op-green-dark/80 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-op-green-dark">
                    <span className="size-1.5 rounded-full bg-[#00b67a]" aria-hidden="true" />
                    Verificado Opinio · MX
                  </span>

                  <Link
                    href={business ? `/b/${business.slug}` : '/verificar'}
                    data-cta="home_explore_directory"
                    className="inline-flex min-h-11 flex-1 items-center justify-between gap-3 rounded-full bg-[#1b1a1b] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-op-green-dark sm:flex-initial"
                  >
                    <span>{business ? 'Consultar este pasaporte' : 'Explorar el directorio'}</span>
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-3.5 flex items-start gap-2 rounded-xl bg-white/85 px-3 py-2 text-xs leading-relaxed text-op-secondary backdrop-blur-xs">
              <ArrowRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-op-green-dark" />
              Cada perfil indica qué datos están verificados y cuáles provienen de registros públicos.
            </p>
          </div>
        </div>
      </section>

      {/* Reverse-engineered Trustpilot "Bought something recently? Write a review" Flanking-Line Pill Banner */}
      <div className="op-container pt-8">
        <div className="flex items-center gap-4">
          <div className="hidden h-px flex-1 bg-op-border md:block" aria-hidden="true" />
          <Link
            href="/verificar?accion=opinar"
            className="group mx-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-op-strong bg-white px-5 py-2 text-sm font-medium text-op-ink shadow-flat transition-all hover:border-[#1b1a1b] hover:shadow-elevated"
          >
            <span className="text-op-secondary">¿Compraste en una tienda recientemente?</span>
            <span className="inline-flex items-center gap-1 font-bold text-op-green-dark group-hover:underline">
              Escribir una opinión
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </span>
          </Link>
          <div className="hidden h-px flex-1 bg-op-border md:block" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
