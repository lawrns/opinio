'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Buildings, 
  ChartBar, 
  Scales, 
  CheckCircle, 
  ShieldCheck, 
  ArrowRight,
  Receipt,
  Clock,
  WarningCircle,
  Eye,
  LockKey
} from '@phosphor-icons/react';

export function ProofBentoGrid() {
  const [activeDenominatorMode, setActiveDenominatorMode] = useState<'opinio' | 'convencional'>('opinio');
  const [activeDisputeStep, setActiveDisputeStep] = useState<1 | 2 | 3>(3);

  return (
    <section id="metodologia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold font-mono uppercase tracking-widest text-[#008B5D]">
          La Confianza Se Demuestra
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-[#121511] tracking-tight">
          El Estándar Arquitectónico de Opinio
        </h2>
        <p className="text-sm text-gray-700 font-medium leading-relaxed">
          En México, cualquier tienda fraudulenta puede inventar 10 opiniones de 5 estrellas en redes sociales. Opinio audita el denominador real de transacciones y conecta tres pilares inseparables.
        </p>
      </div>

      {/* Asymmetric 3-Module Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ========================================================================= */}
        {/* MODULE 1 (Cols 1-4): EXISTE - CÉDULA SAT & DENUE DIGITAL                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F8F2] text-[#008B5D] flex items-center justify-center">
                <Buildings weight="bold" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F4F2EB] text-[#454744] px-2.5 py-1 rounded-full border border-[#E5E7EB]">
                Pilar 01 • Identidad
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-[#121511] tracking-tight">
                Existe
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Verificación física y jurídica ante el SAT y el censo económico de unidades activas del INEGI.
              </p>
            </div>

            {/* Simulated Digital Certificate Slip */}
            <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-[#EBEAE1] space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-[#EBEAE1] pb-2 text-[10px] text-gray-500">
                <span>PADRÓN TRIBUTARIO SAT</span>
                <span className="text-[#008B5D] font-bold">VÁLIDO 4.0</span>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-[#121511]">RFC: CZE150414AB2</div>
                <div className="text-[10px] text-gray-500 truncate">Comercializadora Zebrands S.A. de C.V.</div>
              </div>
              <div className="pt-2 border-t border-[#EBEAE1] flex items-center justify-between text-[10px]">
                <span className="text-gray-500">INEGI CLEE:</span>
                <span className="text-[#121511] font-bold">0901547891234001</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-bold text-[#008B5D]">
            <CheckCircle weight="fill" className="w-4 h-4 text-[#00B67A]" />
            <span>Cero empresas fantasma o anónimas</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 2 (Cols 5-8): CUMPLE - INTERACTIVE DENOMINATOR SIMULATOR           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F8F2] text-[#008B5D] flex items-center justify-center">
                <ChartBar weight="bold" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#E6F8F2] text-[#008B5D] px-2.5 py-1 rounded-full border border-[#B3ECD9]">
                Pilar 02 • El Moat
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-[#121511] tracking-tight">
                Cumple: El Denominador Real
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Interactúa con el comparador para ver por qué una calificación sin denominador es fácil de falsear.
              </p>
            </div>

            {/* Interactive Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#FCFBF3] border border-gray-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveDenominatorMode('opinio')}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeDenominatorMode === 'opinio'
                    ? 'bg-white text-[#121511] shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-[#121511]'
                }`}
              >
                Con Opinio (93.9% Cobertura)
              </button>
              <button
                type="button"
                onClick={() => setActiveDenominatorMode('convencional')}
                className={`py-2 px-3 rounded-xl transition-all ${
                  activeDenominatorMode === 'convencional'
                    ? 'bg-white text-[#121511] shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-[#121511]'
                }`}
              >
                Sitio Tradicional (Filtrado)
              </button>
            </div>

            {/* Dynamic Comparison Panel */}
            <AnimatePresence mode="wait">
              {activeDenominatorMode === 'opinio' ? (
                <motion.div
                  key="opinio-mode"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-4 rounded-2xl bg-[#E6F8F2]/60 border border-[#B3ECD9] space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="font-bold text-[#008B5D]">13,911 invitados / 14,821 órdenes</span>
                    <span className="text-[10px] font-bold text-white bg-[#00B67A] px-2 py-0.5 rounded-full">
                      Cobertura 93.9%
                    </span>
                  </div>
                  <p className="text-gray-700 text-[11px] leading-relaxed">
                    Opinio monitorea todas las ventas por webhook. Se invita al 100% de clientes reales sin importar si tuvieron retraso o no, garantizando honestidad radical.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="conv-mode"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="font-bold text-amber-900">10 opiniones / ? pedidos reales</span>
                    <span className="text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full">
                      Sin Denominador
                    </span>
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    El comercio solo envía enlaces a clientes satisfechos (cherry-picking) u oculta cientos de órdenes no entregadas. La calificación parece perfecta pero es engañosa.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-bold text-[#008B5D]">
            <CheckCircle weight="fill" className="w-4 h-4 text-[#00B67A]" />
            <span>Auditoría continua de pedidos conectados</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 3 (Cols 9-12): RESUELVE - BILATERAL DISPUTE SIGN-OFF               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-[#E6F8F2] text-[#008B5D] flex items-center justify-center">
                <Scales weight="bold" className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F4F2EB] text-[#454744] px-2.5 py-1 rounded-full border border-[#E5E7EB]">
                Pilar 03 • Mediación
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-[#121511] tracking-tight">
                Resuelve
              </h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Ninguna queja se marca como resuelta sin la confirmación expresa del comprador.
              </p>
            </div>

            {/* Live Step Progress */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FCFBF3] border border-gray-200">
                <span className="w-5 h-5 rounded-full bg-[#00B67A] text-white flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <div className="text-[11px] text-gray-700">1. Queja registrada con guía</div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FCFBF3] border border-gray-200">
                <span className="w-5 h-5 rounded-full bg-[#00B67A] text-white flex items-center justify-center font-bold text-[10px]">
                  ✓
                </span>
                <div className="text-[11px] text-gray-700">2. Comercio propone remedio</div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E6F8F2] border border-[#B3ECD9] text-[#008B5D] font-bold">
                <span className="w-5 h-5 rounded-full bg-[#00B67A] text-white flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <div className="text-[11px]">3. Cliente confirma satisfacción</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-bold text-[#008B5D]">
            <CheckCircle weight="fill" className="w-4 h-4 text-[#00B67A]" />
            <span>Firma digital bilateral de conformidad</span>
          </div>
        </div>

      </div>
    </section>
  );
}
