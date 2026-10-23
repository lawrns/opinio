'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Buildings,
  ChartBar,
  Scales,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
} from '@phosphor-icons/react';
import { StarRating } from '@/components/StarRating';

export function ProofBentoGrid() {
  const [activeDenominatorMode, setActiveDenominatorMode] = useState<'opinio' | 'convencional'>('opinio');
  const [activeDisputeStep, setActiveDisputeStep] = useState<1 | 2 | 3>(3);

  const isOpinio = activeDenominatorMode === 'opinio';

  return (
    <div className="space-y-16 py-12 sm:space-y-24 sm:py-16">
      {/* ========================================================================= */}
      {/* SECTION 1: 3-PILLAR EDITORIAL STRIP (FROM OPINIO HOME V3)                  */}
      {/* ========================================================================= */}
      <section className="op-container" aria-labelledby="pillars-heading">
        <div className="mb-10 grid items-end gap-6 border-b border-op-border pb-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-green-dark">
              La evidencia, a la vista
            </span>
            <h2
              id="pillars-heading"
              className="mt-2.5 text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] text-op-ink sm:text-4xl"
            >
              Tres preguntas antes de pagar.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-op-secondary">
            En México, cualquier página puede mostrar 10 reseñas de 5 estrellas sin contexto. El pasaporte de Opinio separa la evidencia en tres pilares verificables.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* PILAR 01: EXISTE */}
          <div className="flex flex-col justify-between rounded-2xl border border-op-border border-t-[3px] border-t-op-ink bg-white p-6 shadow-flat sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-blue-dark">
                  01 · EXISTE
                </span>
                <span className="flex size-9 items-center justify-center rounded-xl bg-op-blue-soft text-op-blue-dark">
                  <Buildings weight="duotone" className="size-5" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-op-ink">¿Quién vende?</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">
                  Razón social, RFC, domicilio y registro en el directorio estadístico de unidades económicas (DENUE). Un dato público y uno verificado se distinguen siempre.
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
              <span>Identidad jurídica y canales claros</span>
            </div>
          </div>

          {/* PILAR 02: CUMPLE */}
          <div className="flex flex-col justify-between rounded-2xl border border-op-border border-t-[3px] border-t-[#00b67a] bg-white p-6 shadow-flat sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-green-dark">
                  02 · CUMPLE
                </span>
                <span className="flex size-9 items-center justify-center rounded-xl bg-op-green-soft text-op-green-dark">
                  <ChartBar weight="duotone" className="size-5" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-op-ink">¿Cómo cumple?</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">
                  Cada opinión indica su tipo de evidencia. Cuando el comercio registra pedidos, mostramos qué porcentaje de esos pedidos cuenta con invitación registrada.
                </p>
              </div>

              <div className="rounded-xl border border-op-green-border bg-op-green-soft/50 p-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-op-green-dark">Denominador visible</span>
                  <span className="rounded-full bg-[#00b67a] px-2 py-0.5 text-[10px] font-bold text-white">
                    Ejemplo: 93.9%
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs font-semibold text-op-ink">
                  13,911 invitados / 14,821 órdenes
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-op-secondary">
                  Muestra ilustrativa: permite distinguir 50 reseñas sobre 60 ventas de 50 reseñas sobre 10,000 ventas.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-op-border pt-4 text-xs font-semibold text-op-green-dark">
              <CheckCircle weight="fill" className="size-4 text-[#00b67a]" />
              <span>Cobertura sobre pedidos registrados</span>
            </div>
          </div>

          {/* PILAR 03: RESUELVE */}
          <div className="flex flex-col justify-between rounded-2xl border border-op-border border-t-[3px] border-t-op-peach bg-white p-6 shadow-flat sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-peach">
                  03 · RESUELVE
                </span>
                <span className="flex size-9 items-center justify-center rounded-xl bg-op-peach-soft text-op-peach">
                  <Scales weight="duotone" className="size-5" />
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-op-ink">¿Cómo responde?</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-secondary">
                  Vender sin errores es imposible; responder bien es una decisión. Ningún caso se marca como resuelto sin la confirmación expresa de quien compró.
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2.5 rounded-xl border border-op-border bg-[#fcfbf3] px-3 py-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#00b67a] text-[10px] font-bold text-white">
                    1
                  </span>
                  <span className="text-[11px] text-op-secondary">Queja registrada con evidencia</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-op-border bg-[#fcfbf3] px-3 py-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#00b67a] text-[10px] font-bold text-white">
                    2
                  </span>
                  <span className="text-[11px] text-op-secondary">Comercio propone remedio</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-op-green-border bg-op-green-soft px-3 py-2 font-bold text-op-green-dark">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#00b67a] text-[10px] text-white">
                    ✓
                  </span>
                  <span className="text-[11px]">Comprador confirma solución</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-op-border pt-4 text-xs font-semibold text-op-green-dark">
              <CheckCircle weight="fill" className="size-4 text-[#00b67a]" />
              <span>Cierre bilateral verificable</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: INTERACTIVE DENOMINATOR COMPARATOR (FROM OPINIO HOME V3)       */}
      {/* ========================================================================= */}
      <section className="op-container" aria-labelledby="denominator-heading">
        <div className="grid items-center gap-10 rounded-3xl border border-op-border bg-white p-6 shadow-elevated sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:p-12">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-green-dark">
              Pilar 02 · El denominador real
            </span>
            <h2
              id="denominator-heading"
              className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] text-op-ink sm:text-4xl"
            >
              Una calificación sin denominador es fácil de falsear.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-op-secondary">
              Cuando una tienda elige a quién invitar, el promedio sube aunque el servicio falle. En Opinio, la cobertura compara las invitaciones registradas contra el total de pedidos registrados.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-op-secondary">
              <li className="flex items-start gap-2.5">
                <CheckCircle weight="fill" className="mt-0.5 size-4.5 shrink-0 text-[#00b67a]" />
                <span>
                  <strong className="font-semibold text-op-ink">Denominador visible:</strong> ves tanto el número de opiniones como el universo de órdenes registradas.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle weight="fill" className="mt-0.5 size-4.5 shrink-0 text-[#00b67a]" />
                <span>
                  <strong className="font-semibold text-op-ink">Evidencia etiquetada:</strong> cada reseña distingue si cuenta con prueba de compra verificada o si es abierta.
                </span>
              </li>
            </ul>
          </div>

          {/* Interactive Comparison Card */}
          <div className="rounded-2xl border border-op-strong bg-[#fcfbf3] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-op-border pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-op-muted">
                  Comparador interactivo · Ejemplo ilustrativo
                </span>
                <h3 className="mt-0.5 text-base font-bold text-op-ink">Mismo comercio, dos lecturas</h3>
              </div>

              {/* Pill Switcher */}
              <div className="inline-flex rounded-full border border-op-border bg-white p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveDenominatorMode('opinio')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isOpinio ? 'bg-op-ink text-white shadow-2xs' : 'text-op-secondary hover:text-op-ink'
                  }`}
                >
                  Con Opinio
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDenominatorMode('convencional')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    !isOpinio ? 'bg-op-ink text-white shadow-2xs' : 'text-op-secondary hover:text-op-ink'
                  }`}
                >
                  Sitio tradicional
                </button>
              </div>
            </div>

            {/* Dynamic Metrics Display */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-op-border bg-white p-4">
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
                    ? 'Incluye compradores con entregas tardías o incidencias.'
                    : 'Solo muestra a quienes el comercio decidió invitar.'}
                </p>
              </div>

              <div className="rounded-xl border border-op-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-op-muted">
                    Cobertura de pedidos
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                      isOpinio
                        ? 'bg-op-green-soft text-op-green-dark'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {isOpinio ? 'Cobertura 93.9%' : 'Sin denominador'}
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-extrabold text-op-ink">
                  {isOpinio ? '93.9%' : '¿?'}
                </p>
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
                ? 'La cobertura se calcula sobre los pedidos que registra el comercio. Cuenta las invitaciones registradas para clientes reales, permitiendo evaluar el peso estadístico del puntaje.'
                : 'Sin un denominador de órdenes, un comercio puede invitar únicamente a compradores seleccionados (cherry-picking) y ocultar el volumen real de problemas.'}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: BILATERAL MEDIATION TIMELINE (FROM OPINIO HOME V3)             */}
      {/* ========================================================================= */}
      <section className="op-container" aria-labelledby="mediation-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-op-peach">
              Pilar 03 · Mediación bilateral
            </span>
            <h2
              id="mediation-heading"
              className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] text-op-ink sm:text-4xl"
            >
              Ninguna queja se marca como resuelta sin tu confirmación.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-op-secondary">
              Cuando algo sale mal con tu pedido, abrir un caso en Opinio deja constancia pública del problema, la respuesta del comercio y si realmente cumplió con la solución.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/caso/nuevo"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-op-ink px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-op-green-dark"
              >
                Resolver un problema <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/verificar"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-op-strong bg-white px-5 py-3 text-sm font-semibold text-op-ink transition-all hover:border-op-ink hover:bg-op-shaded"
              >
                Buscar un comercio
              </Link>
            </div>
          </div>

          {/* Interactive Case #2841 Timeline Card */}
          <div className="relative rounded-3xl bg-linear-to-br from-[#0f1d1a] via-[#132a24] to-[#0f1d1a] p-5 sm:p-8 shadow-hero">
            <div className="mb-4 flex items-center justify-between text-xs text-white/75">
              <span className="font-mono text-[11px] uppercase tracking-wider">
                Ejemplo ilustrativo · Flujo bilateral
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10px] text-white/90">
                Datos ficticios
              </span>
            </div>

            <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-elevated">
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
                    title: '1. Queja registrada con guía',
                    meta: '12 mar · Comprador adjuntó foto y número de orden',
                    detail: '“La cubierta llegó con un golpe en la esquina; solicito cambio de pieza.”',
                  },
                  {
                    step: 2 as const,
                    title: '2. El comercio propone un remedio',
                    meta: '13 mar · Respuesta en 19 horas',
                    detail: '“Enviamos cubierta nueva con guía DHL #778120 y recolección sin costo.”',
                  },
                  {
                    step: 3 as const,
                    title: '3. Tú confirmas la solución',
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
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#00b67a] font-mono text-xs font-bold text-white">
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
      </section>
    </div>
  );
}
