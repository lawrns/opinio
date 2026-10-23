'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Buildings,
  ChartBar,
  Scales,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Storefront,
} from '@phosphor-icons/react';
import { StarRating } from '@/components/StarRating';

interface IllustrativeReviewCard {
  id: string;
  author: string;
  initials: string;
  avatarBg: string;
  rating: number;
  badge: string;
  text: string;
  merchant: string;
  domain: string;
  category: string;
}

const ILLUSTRATIVE_RECENT_REVIEWS: IllustrativeReviewCard[] = [
  {
    id: 'rev-1',
    author: 'Mariana G.',
    initials: 'MG',
    avatarBg: 'bg-[#ffdde8] text-[#1b1a1b]',
    rating: 5,
    badge: 'Compra con comprobante',
    text: 'Llegó con un rasguño en la pata. Subí la foto de la guía, en cuatro días enviaron el repuesto y confirmé el cierre del caso.',
    merchant: 'Casa Nogal (Ejemplo)',
    domain: 'casanogal.mx',
    category: 'Muebles',
  },
  {
    id: 'rev-2',
    author: 'Rodrigo V.',
    initials: 'RV',
    avatarBg: 'bg-[#b2f8cc] text-[#0a2e1d]',
    rating: 5,
    badge: 'Pedido conectado',
    text: 'Café recién tostado con fecha de lote visible. El paquete salió el mismo día desde Veracruz y llegó con factura CFDI.',
    merchant: 'Café Altura (Ejemplo)',
    domain: 'cafealtura.mx',
    category: 'Restaurantes',
  },
  {
    id: 'rev-3',
    author: 'Sofía L.',
    initials: 'SL',
    avatarBg: 'bg-[#ffeed7] text-[#1b1a1b]',
    rating: 4,
    badge: 'Caso cerrado por cliente',
    text: 'La primera graduación no me quedó bien. Abrieron seguimiento en mi perfil y cambiaron las micas sin cobrar envío extra.',
    merchant: 'Óptica Lumen (Ejemplo)',
    domain: 'opticalumen.mx',
    category: 'Salud',
  },
  {
    id: 'rev-4',
    author: 'Daniel C.',
    initials: 'DC',
    avatarBg: 'bg-[#e0e7ff] text-[#1e1b4b]',
    rating: 5,
    badge: 'Compra con comprobante',
    text: 'Revisé primero su RFC y que tuvieran más del 90% de pedidos invitados antes de pagar por transferencia. Todo llegó a tiempo.',
    merchant: 'Taller Norte (Ejemplo)',
    domain: 'tallernorte.mx',
    category: 'Hogar',
  },
];

export function ProofBentoGrid() {
  const [activeDenominatorMode, setActiveDenominatorMode] = useState<'opinio' | 'convencional'>('opinio');
  const [activeDisputeStep, setActiveDisputeStep] = useState<1 | 2 | 3>(3);
  const [replayLines, setReplayLines] = useState(0);
  const reviewsScrollRef = useRef<HTMLDivElement>(null);

  const isOpinio = activeDenominatorMode === 'opinio';

  const scrollReviews = useCallback((dir: 'back' | 'forward') => {
    const el = reviewsScrollRef.current;
    if (!el) return;
    const distance = Math.max(300, Math.round(el.clientWidth * 0.7));
    el.scrollTo({
      left: dir === 'forward' ? el.scrollLeft + distance : el.scrollLeft - distance,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className="space-y-16 py-10 sm:space-y-20 sm:py-14">
      {/* ========================================================================= */}
      {/* SECTION 1: 3-PILLAR CARDS WITH DIAGONAL MOTION GRAPHICS                    */}
      {/* ========================================================================= */}
      <section className="op-container" aria-labelledby="pillars-heading">
        <div className="mb-10 grid items-end gap-6 border-b border-op-border pb-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-green-dark">
              Datos verificables a la vista
            </span>
            <h2
              id="pillars-heading"
              className="mt-2.5 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-op-ink sm:text-4xl"
            >
              Tres preguntas antes de pagar.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-op-secondary">
            En internet cualquier página puede mostrar diez reseñas de cinco estrellas sin contexto. El pasaporte de Opinio organiza la información de cada tienda en tres bloques claros.
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          {/* PILAR 01: EXISTE */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-op-border border-t-[4px] border-t-[#1b1a1b] bg-white p-6 shadow-flat transition-all duration-200 hover:-translate-y-1.5 hover:shadow-elevated sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-blue-dark">
                  01 · EXISTE
                </span>
                <span className="flex size-10 items-center justify-center rounded-xl bg-op-blue-soft text-op-blue-dark transition-transform duration-200 group-hover:scale-110">
                  <Buildings weight="duotone" className="size-5.5" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-op-ink">¿Quién vende?</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">
                  Muestra la razón social, el RFC, el domicilio y el registro en el directorio del INEGI (DENUE). Siempre distinguimos un dato tomado de registros públicos de uno ya verificado.
                </p>
              </div>

              {/* Fictional example slip: explicitly labeled */}
              <div className="rounded-xl border border-op-border bg-[#fcfbf3] p-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-op-border pb-2 text-[10px] text-op-muted">
                  <span className="font-bold uppercase text-op-secondary">Ejemplo ilustrativo</span>
                  <span>Datos ficticios</span>
                </div>
                <div className="mt-2.5 space-y-1">
                  <div className="text-xs font-bold text-op-ink">RFC: XAXX010101000</div>
                  <div className="truncate text-[11px] text-op-muted">Empresa Ejemplo S.A. de C.V.</div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-op-border pt-2 text-[10px]">
                  <span className="text-op-muted">INEGI CLEE:</span>
                  <span className="font-bold text-op-ink">00000000000000</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-op-border pt-4 text-xs font-semibold text-op-green-dark">
              <CheckCircle weight="fill" className="size-4 text-[#00b67a]" />
              <span>Identidad fiscal y canales de contacto</span>
            </div>
          </div>

          {/* PILAR 02: CUMPLE */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-op-border border-t-[4px] border-t-[#00b67a] bg-white p-6 shadow-flat transition-all duration-200 hover:-translate-y-1.5 hover:shadow-elevated sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-green-dark">
                  02 · CUMPLE
                </span>
                <span className="flex size-10 items-center justify-center rounded-xl bg-op-green-soft text-op-green-dark transition-transform duration-200 group-hover:scale-110">
                  <ChartBar weight="duotone" className="size-5.5" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-op-ink">¿Cómo cumple?</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">
                  Cada opinión señala qué comprobante respalda la compra. Cuando el comercio conecta sus pedidos, mostramos qué porcentaje del total tiene invitación registrada.
                </p>
              </div>

              <div className="rounded-xl border border-op-green-border bg-op-green-soft/50 p-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-op-green-dark">Denominador visible</span>
                  <span className="rounded-full bg-[#00b67a] px-2 py-0.5 text-[10px] font-bold text-[#1b1a1b]">
                    Ejemplo: 93.9%
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs font-semibold text-op-ink">
                  13,911 invitados / 14,821 órdenes
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-op-secondary">
                  Muestra ilustrativa: permite distinguir 50 reseñas en 60 ventas de 50 reseñas en 10,000 ventas.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-op-border pt-4 text-xs font-semibold text-op-green-dark">
              <CheckCircle weight="fill" className="size-4 text-[#00b67a]" />
              <span>Cobertura sobre pedidos registrados</span>
            </div>
          </div>

          {/* PILAR 03: RESUELVE */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-op-border border-t-[4px] border-t-[#fd791a] bg-white p-6 shadow-flat transition-all duration-200 hover:-translate-y-1.5 hover:shadow-elevated sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-peach">
                  03 · RESUELVE
                </span>
                <span className="flex size-10 items-center justify-center rounded-xl bg-op-peach-soft text-op-peach transition-transform duration-200 group-hover:scale-110">
                  <Scales weight="duotone" className="size-5.5" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-op-ink">¿Cómo responde?</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">
                  En cualquier tienda puede retrasarse un paquete o llegar una pieza dañada. Aquí ningún reclamo se marca como resuelto hasta que la persona que compró lo confirma.
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2.5 rounded-xl border border-op-border bg-[#fcfbf3] px-3 py-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#1b1a1b] text-[10px] font-bold text-white">
                    1
                  </span>
                  <span className="text-[11px] text-op-secondary">Reclamo registrado con evidencia</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-op-border bg-[#fcfbf3] px-3 py-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#1b1a1b] text-[10px] font-bold text-white">
                    2
                  </span>
                  <span className="text-[11px] text-op-secondary">El comercio propone una solución</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-op-green-border bg-op-green-soft px-3 py-2 font-bold text-op-green-dark">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#00b67a] text-[10px] text-[#1b1a1b]">
                    ✓
                  </span>
                  <span className="text-[11px]">El comprador confirma el cierre</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-op-border pt-4 text-xs font-semibold text-op-green-dark">
              <CheckCircle weight="fill" className="size-4 text-[#00b67a]" />
              <span>Cierre confirmado por quien compró</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: TRUSTPILOT PEACH BANNER (#ffeed7) · DENOMINATOR COMPARATOR     */}
      {/* ========================================================================= */}
      <section className="op-container" aria-labelledby="denominator-heading">
        <div
          onMouseEnter={() => setReplayLines((c) => c + 1)}
          className="relative overflow-hidden rounded-[24px] bg-[#ffeed7] p-6 shadow-flat sm:p-10 lg:p-12"
        >
          {/* Reverse-engineered Trustpilot diagonal animated mint bars (#71eeae) */}
          <div
            key={replayLines}
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-4 hidden h-44 w-56 opacity-90 lg:block"
          >
            <div className="animate-tp-line-1 absolute left-4 top-10 h-6 w-0 origin-left -rotate-45 rounded-full bg-[#71eeae]" />
            <div className="animate-tp-line-2 absolute left-6 top-24 h-6 w-0 origin-left -rotate-45 rounded-full bg-[#04da8d]" />
            <div className="animate-tp-line-3 absolute left-16 top-28 h-6 w-0 origin-left -rotate-45 rounded-full bg-[#71eeae]" />
          </div>

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1b1a1b] px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                Pilar 02 · El denominador de pedidos
              </span>
              <h2
                id="denominator-heading"
                className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl"
              >
                Una calificación sin denominador se distorsiona fácil.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#1b1a1b]/85">
                Si una tienda elige a qué clientes pedirles reseña, su promedio sube aunque la mitad de los envíos se atrase. En Opinio la cobertura compara las invitaciones registradas contra el total de pedidos registrados.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#1b1a1b]/90">
                <li className="flex items-start gap-2.5">
                  <CheckCircle weight="fill" className="mt-0.5 size-4.5 shrink-0 text-[#006845]" />
                  <span>Ves cuántas opiniones hay y de cuántos pedidos registrados salen.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle weight="fill" className="mt-0.5 size-4.5 shrink-0 text-[#006845]" />
                  <span>Cada reseña indica si tiene comprobante de compra o si se escribió de forma abierta.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Comparison Card */}
            <div className="rounded-[20px] border border-[#1b1a1b]/15 bg-white p-5 shadow-elevated sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-op-border pb-4">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-op-muted">
                    Comparador interactivo · Ejemplo ilustrativo
                  </span>
                  <h3 className="mt-0.5 text-base font-bold text-op-ink">Mismo comercio, dos lecturas</h3>
                </div>

                {/* Pill Switcher */}
                <div className="inline-flex rounded-full border border-op-border bg-[#fcfbf3] p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveDenominatorMode('opinio')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      isOpinio ? 'bg-[#1b1a1b] text-white shadow-2xs' : 'text-op-secondary hover:text-op-ink'
                    }`}
                  >
                    Con Opinio
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDenominatorMode('convencional')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                      !isOpinio ? 'bg-[#1b1a1b] text-white shadow-2xs' : 'text-op-secondary hover:text-op-ink'
                    }`}
                  >
                    Sitio tradicional
                  </button>
                </div>
              </div>

              {/* Dynamic Metrics Display */}
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-op-border bg-[#fcfbf3] p-4">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-op-muted">
                    Calificación mostrada
                  </span>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="font-mono text-4xl font-extrabold tracking-tight text-op-ink">
                      {isOpinio ? '4.3' : '4.9'}
                    </span>
                    <span className="text-xs font-medium text-op-muted">/ 5.0</span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={isOpinio ? 4.3 : 4.9} size="sm" />
                  </div>
                  <p className="mt-2 text-xs text-op-secondary">
                    {isOpinio
                      ? 'Incluye compradores con entregas tardías o reclamos.'
                      : 'Muestra solo a quienes la tienda decidió invitar.'}
                  </p>
                </div>

                <div className="rounded-xl border border-op-border bg-[#fcfbf3] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-op-muted">
                      Cobertura de pedidos
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                        isOpinio ? 'bg-op-green-soft text-op-green-dark' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isOpinio ? 'Cobertura 93.9%' : 'Sin denominador'}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-extrabold text-op-ink">{isOpinio ? '93.9%' : '¿?'}</p>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-op-inset" aria-hidden="true">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOpinio ? 'bg-[#00b67a]' : 'bg-amber-500'
                      }`}
                      style={{ width: isOpinio ? '93.9%' : '6%' }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-[11px] font-semibold text-op-secondary">
                    {isOpinio ? '13,911 invitados / 14,821 órdenes' : '10 opiniones / ? pedidos reales'}
                  </p>
                </div>
              </div>

              <div
                className={`mt-5 rounded-xl border p-4 text-xs leading-relaxed ${
                  isOpinio
                    ? 'border-op-green-border bg-op-green-soft/60 text-op-ink'
                    : 'border-amber-200 bg-amber-50 text-amber-950'
                }`}
              >
                {isOpinio
                  ? 'La cobertura divide las invitaciones registradas entre los pedidos que registra la tienda. Así sabes qué tan representativo es el promedio.'
                  : 'Cuando no se conoce el total de pedidos, una tienda puede invitar solo a compradores satisfechos y esconder las entregas con problemas.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: TRUSTPILOT PINK BANNER (#ffdde8) · BILATERAL MEDIATION         */}
      {/* ========================================================================= */}
      <section className="op-container" aria-labelledby="mediation-heading">
        <div className="relative overflow-hidden rounded-[24px] bg-[#ffdde8] p-6 shadow-flat sm:p-10 lg:p-12">
          {/* Reverse-engineered Trustpilot B2B Promo Banner Motion Graphic Wrapper */}
          <svg
            aria-hidden="true"
            viewBox="0 0 420 420"
            className="pointer-events-none absolute -bottom-24 -left-20 size-96 opacity-45"
          >
            <g className="animate-op-float">
              <rect x="60" y="90" width="180" height="180" rx="34" fill="#ffe400" transform="rotate(-14 150 180)" />
              <circle cx="270" cy="240" r="88" fill="#04da8d" />
              <path
                d="M195 60 L275 195 L115 195 Z"
                fill="#fd791a"
                stroke="#fd791a"
                strokeWidth="16"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1b1a1b] px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                Pilar 03 · Mediación bilateral
              </span>
              <h2
                id="mediation-heading"
                className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl"
              >
                Ningún reclamo se cierra sin tu confirmación.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#1b1a1b]/85">
                Si tu pedido llega incompleto o se retrasa, abrir un caso en Opinio deja registro del problema, de la propuesta de la tienda y de tu confirmación cuando cumplen.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/caso/nuevo"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-op-green-dark"
                >
                  Resolver un problema <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link
                  href="/verificar"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#1b1a1b]/25 bg-white px-5 py-3 text-sm font-bold text-[#1b1a1b] transition-all hover:border-[#1b1a1b] hover:bg-[#fcfbf3]"
                >
                  Buscar un comercio
                </Link>
              </div>
            </div>

            {/* Interactive Case #2841 Timeline Card */}
            <div className="relative rounded-[22px] bg-[#1b1a1b] p-5 shadow-hero sm:p-7">
              <div className="mb-4 flex items-center justify-between text-xs text-white/80">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Ejemplo ilustrativo · Flujo bilateral
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10px] text-white/90">
                  Datos ficticios
                </span>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-elevated sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-op-border pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-op-ink">
                      CASO #2841 · Casa Nogal (Ficticio)
                    </span>
                    <p className="mt-0.5 text-xs text-op-muted">Orden #MX-88210 · Mesa de comedor</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-op-green-soft px-3 py-1 font-mono text-xs font-bold text-op-green-dark">
                    <ShieldCheck weight="fill" className="size-3.5 text-[#00b67a]" />
                    Resuelto en 4 días
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      step: 1 as const,
                      title: '1. Reclamo registrado con guía',
                      meta: '12 mar · Comprador adjuntó foto y número de orden',
                      detail: '“La cubierta llegó con un golpe en la esquina. Solicito cambio de pieza.”',
                    },
                    {
                      step: 2 as const,
                      title: '2. El comercio propone una solución',
                      meta: '13 mar · Respuesta en 19 horas',
                      detail: '“Enviamos cubierta nueva con guía DHL #778120 y recolección sin costo.”',
                    },
                    {
                      step: 3 as const,
                      title: '3. Tú confirmas que cumplieron',
                      meta: '16 mar · Cierre bilateral firmado por el comprador',
                      detail: '“Recibí la pieza en buen estado. Confirmo que el caso quedó resuelto.”',
                    },
                  ].map((item) => {
                    const isCurrent = activeDisputeStep === item.step;
                    return (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => setActiveDisputeStep(item.step)}
                        className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                          isCurrent
                            ? 'border-[#00b67a] bg-op-green-soft/60 shadow-2xs'
                            : 'border-op-border bg-[#fcfbf3] hover:border-op-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#00b67a] font-mono text-xs font-bold text-[#1b1a1b]">
                              ✓
                            </span>
                            <span className="text-sm font-bold text-op-ink">{item.title}</span>
                          </div>
                          <span className="font-mono text-[11px] text-op-muted">{item.meta.split(' · ')[0]}</span>
                        </div>
                        <p className="mt-1.5 pl-8.5 text-xs text-op-secondary">{item.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: TRUSTPILOT RECENT REVIEWS CAROUSEL (ILLUSTRATIVE SAMPLES)      */}
      {/* ========================================================================= */}
      <section
        className="op-container"
        data-id="recent-reviews-section"
        aria-labelledby="recent-reviews-heading"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="recent-reviews-heading" className="text-2xl font-extrabold tracking-tight text-op-ink sm:text-[28px]">
                Cómo se leen las opiniones con contexto
              </h2>
              <span className="rounded-full border border-op-border bg-white px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-op-muted">
                Ejemplos ilustrativos
              </span>
            </div>
            <p className="mt-1 text-sm text-op-secondary">
              Muestras ficticias de cómo se etiqueta la evidencia de compra y el seguimiento en cada reseña.
            </p>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => scrollReviews('back')}
              aria-label="Desplazar ejemplos hacia atrás"
              className="inline-flex size-10 items-center justify-center rounded-full border border-op-strong bg-white text-op-ink transition-all hover:border-[#1b1a1b] hover:bg-op-shaded"
            >
              <ArrowLeft aria-hidden="true" className="size-4.5" weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => scrollReviews('forward')}
              aria-label="Desplazar ejemplos hacia adelante"
              className="inline-flex size-10 items-center justify-center rounded-full border border-op-strong bg-white text-op-ink transition-all hover:border-[#1b1a1b] hover:bg-op-shaded"
            >
              <ArrowRight aria-hidden="true" className="size-4.5" weight="bold" />
            </button>
          </div>
        </div>

        <div
          ref={reviewsScrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible"
        >
          {ILLUSTRATIVE_RECENT_REVIEWS.map((card) => (
            <article
              key={card.id}
              className="flex w-[288px] shrink-0 snap-start flex-col justify-between rounded-[20px] border border-op-border bg-white p-5 shadow-flat transition-all duration-150 hover:-translate-y-1 hover:shadow-elevated lg:w-auto"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full font-mono text-xs font-extrabold ${card.avatarBg}`}
                    >
                      {card.initials}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-op-ink">{card.author}</h3>
                      <StarRating rating={card.rating} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-op-green-soft px-2.5 py-0.5 font-mono text-[10px] font-bold text-op-green-dark">
                  <CheckCircle weight="fill" className="size-3 text-[#00b67a]" />
                  {card.badge}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-op-secondary">“{card.text}”</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-op-border pt-3.5 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-op-shaded text-op-ink">
                    <Storefront className="size-4" weight="duotone" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-op-ink">{card.merchant}</p>
                    <p className="truncate font-mono text-[10px] text-op-muted">{card.domain}</p>
                  </div>
                </div>
                <span className="rounded-md bg-[#fcfbf3] px-2 py-0.5 font-mono text-[10px] text-op-muted">
                  Ficticio
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
