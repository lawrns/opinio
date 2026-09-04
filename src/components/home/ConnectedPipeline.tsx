'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TreeStructure, 
  Buildings, 
  ChartBar, 
  Scales, 
  CheckCircle, 
  ArrowRight,
  ShieldCheck, 
  Receipt, 
  Clock, 
  Fingerprint,
  Storefront,
  Phone,
  SealCheck
} from '@phosphor-icons/react';

export function ConnectedPipeline() {
  const [activeCoverageDemo, setActiveCoverageDemo] = useState<'opinio' | 'cherrypicking'>('opinio');

  return (
    <section id="metodologia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12">
      {/* Editorial Section Header */}
      <div className="max-w-3xl space-y-3">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#059669]">
          Arquitectura de Confianza
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
          El pipeline de prueba comercial: de la identidad al cierre bilateral.
        </h2>
        <p className="text-sm sm:text-base text-[#334155] leading-relaxed">
          En lugar de mostrar un promedio opaco de estrellas, Opinio conecta tres momentos indispensables del comercio: comprobar quién existe jurídicamente, auditar qué porcentaje de sus ventas reales son calificadas y registrar cómo responde ante una inconformidad.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* UNIFIED CONNECTED PIPELINE (EXISTE -> CUMPLE -> RESUELVE)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* ======================================================================= */}
        {/* 1. EXISTE (Cols 1-3.5): IDENTITY RESOLUTION GRAPH                      */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Buildings weight="bold" className="w-4 h-4 text-[#059669]" />
                ETAPA 01
              </span>
              <span className="text-[#059669] font-semibold">EXISTE</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#0F172A]">
                Resolución de Identidad
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Vincula la marca comercial de Instagram, Shopify o WhatsApp con su entidad jurídica registrada ante el SAT.
              </p>
            </div>

            {/* Visual Resolution Tree Diagram */}
            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E2E8F0] space-y-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#0F172A] font-bold">
                <Storefront className="w-4 h-4 text-[#475569]" />
                <span>Marca Comercial: Luuna</span>
              </div>
              <div className="pl-6 border-l-2 border-[#CBD5E1] space-y-2 text-[11px] text-[#475569]">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Razón Social: Comercializadora Zebrands</span>
                </div>
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-[#059669]" />
                  <span>RFC Activo: CZE150414AB2</span>
                </div>
                <div className="flex items-center gap-2">
                  <Buildings className="w-3.5 h-3.5 text-[#059669]" />
                  <span>INEGI CLEE: 0901547891234001</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] font-bold text-[#065F46]">
                <span>IDENTIDAD VERIFICADA</span>
                <span>SIN EMPRESAS FANTASMA</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
            <span>Padrón SAT 4.0</span>
            <span className="font-bold text-[#0F172A]">Validado</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 2. CUMPLE (Cols 4-8): THE SIGNATURE DENOMINATOR CENTERPIECE            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 p-7 rounded-2xl bg-white border-2 border-[#059669] shadow-elevated flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Subtle signature badge */}
          <div className="absolute top-4 right-4">
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              CENTRO DE PRUEBA
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <ChartBar weight="bold" className="w-4 h-4 text-[#059669]" />
                ETAPA 02 • EL NÚCLEO
              </span>
              <span className="text-[#059669] font-bold">CUMPLE</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-[#0F172A]">
                La Métrica de Cobertura (El Denominador)
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Opinio prohíbe el cherry-picking. Observamos el universo total de ventas conectadas y exigimos invitar a la gran mayoría de compradores reales.
              </p>
            </div>

            {/* Interactive Mode Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#FAF9F5] border border-[#E2E8F0] text-xs font-mono text-center">
              <button
                type="button"
                onClick={() => setActiveCoverageDemo('opinio')}
                className={`py-1.5 px-2.5 rounded-lg transition-all ${
                  activeCoverageDemo === 'opinio'
                    ? 'bg-white text-[#0F172A] font-bold shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Con Denominador (Opinio)
              </button>
              <button
                type="button"
                onClick={() => setActiveCoverageDemo('cherrypicking')}
                className={`py-1.5 px-2.5 rounded-lg transition-all ${
                  activeCoverageDemo === 'cherrypicking'
                    ? 'bg-white text-[#0F172A] font-bold shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Sin Denominador (Tradicional)
              </button>
            </div>

            {/* Visual Denominator Breakdown Spectrum */}
            <AnimatePresence mode="wait">
              {activeCoverageDemo === 'opinio' ? (
                <motion.div
                  key="opinio-view"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="space-y-3 pt-1"
                >
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[#64748B]">
                      <span>UNIVERSO DE PEDIDOS OBSERVADOS:</span>
                      <span className="font-bold text-[#0F172A]">14,821</span>
                    </div>
                    <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#334155] rounded-full w-full" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[#64748B]">
                      <span>COMPRADORES REALES INVITADOS:</span>
                      <span className="font-bold text-[#059669]">13,911 (93.9%)</span>
                    </div>
                    <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#059669] rounded-full w-[93.9%]" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[#64748B]">
                      <span>OPINIONES VERIFICADAS AUDITADAS:</span>
                      <span className="font-bold text-[#0F172A]">1,107</span>
                    </div>
                    <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0284C7] rounded-full w-[8.2%]" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] text-[#065F46] font-medium leading-relaxed">
                    ✓ <strong>93.9% de cobertura confirmada:</strong> Ningún comprador insatisfecho fue excluido arbitrariamente de la invitación de opinión.
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cherry-view"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="space-y-3 pt-1"
                >
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[#64748B]">
                      <span>UNIVERSO DE PEDIDOS TOTALES:</span>
                      <span className="font-bold text-amber-900">DESCONOCIDO (?)</span>
                    </div>
                    <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full w-1/4" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[#64748B]">
                      <span>RESEÑAS 5 ESTRELLAS EXHIBIDAS:</span>
                      <span className="font-bold text-[#0F172A]">10</span>
                    </div>
                    <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0F172A] rounded-full w-full" />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium leading-relaxed">
                    ⚠ <strong>Vulnerabilidad de reputación:</strong> El comercio solo invita a amigos o clientes felices. Cientos de entregas fallidas o quejas quedan silenciadas.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#065F46] font-bold">
            <span>AUDITORÍA ANTI-CHERRY-PICKING</span>
            <span>COBERTURA ≥ 90%</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 3. RESUELVE (Cols 9-12): AUDITABLE DISPUTE RESOLUTION LOOP             */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 p-7 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 text-xs font-mono">
              <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <Scales weight="bold" className="w-4 h-4 text-[#059669]" />
                ETAPA 03
              </span>
              <span className="text-[#059669] font-semibold">RESUELVE</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#0F172A]">
                Resolución Bilateral
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                El comercio no puede auto-declarar casos como resueltos. Requiere confirmación expresa del comprador.
              </p>
            </div>

            {/* Linear Step Progression */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E2E8F0]">
                <span className="w-4 h-4 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-[9px]">
                  1
                </span>
                <span className="text-[#334155] text-[11px]">Queja con guía de envío</span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E2E8F0]">
                <span className="w-4 h-4 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-[9px]">
                  2
                </span>
                <span className="text-[#334155] text-[11px]">Respuesta formal SLA &lt;24h</span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E2E8F0]">
                <span className="w-4 h-4 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-[9px]">
                  3
                </span>
                <span className="text-[#334155] text-[11px]">Remedio SPEI / Reemplazo</span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-bold">
                <span className="w-4 h-4 rounded-full bg-[#059669] text-white flex items-center justify-center text-[9px]">
                  ✓
                </span>
                <span className="text-[11px]">Comprador confirma solución</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
            <span>Sello Bilateral</span>
            <span className="font-bold text-[#059669]">Auditable</span>
          </div>
        </div>

      </div>
    </section>
  );
}
