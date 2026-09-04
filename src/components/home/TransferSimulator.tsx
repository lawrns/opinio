'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertOctagon, 
  Check, 
  X, 
  ArrowRight, 
  RefreshCw, 
  FileSearch, 
  HelpCircle,
  ExternalLink,
  Lock,
  Building,
  CreditCard,
  Phone
} from 'lucide-react';
import Link from 'next/link';

interface SimulationPreset {
  id: string;
  name: string;
  type: 'suspicious' | 'verified' | 'unclaimed';
  input: string;
  label: string;
  verdict: {
    status: 'high_risk' | 'verified_safe' | 'caution';
    score: number;
    title: string;
    description: string;
    rfcStatus: 'verified' | 'missing' | 'unknown';
    denueStatus: 'active' | 'missing' | 'unknown';
    ordersStatus: 'connected' | 'unconnected';
    profecoStatus: 'clear' | 'complaints' | 'not_registered';
    recommendation: string;
    businessSlug?: string;
  };
}

const PRESETS: SimulationPreset[] = [
  {
    id: 'suspicious_ig',
    name: 'WhatsApp sospechoso en Instagram',
    type: 'suspicious',
    input: '+52 55 9182 3401 (Venta calzado Nike 80% desc)',
    label: 'Tienda "SneakersMX Oficial" en Instagram',
    verdict: {
      status: 'high_risk',
      score: 18,
      title: 'Alto Riesgo de Fraude Comercial',
      description: 'El número no cuenta con RFC validado ante el SAT ni establecimiento físico en el DENUE del INEGI. El dominio fue registrado hace solo 14 días y no existen pedidos auditados.',
      rfcStatus: 'missing',
      denueStatus: 'missing',
      ordersStatus: 'unconnected',
      profecoStatus: 'not_registered',
      recommendation: 'NO realices transferencias SPEI directas. Exige pago contra entrega o una pasarela con protección al comprador.',
    },
  },
  {
    id: 'verified_luuna',
    name: 'Comercio con Pasaporte Completo',
    type: 'verified',
    input: '+52 55 4164 0533 (Luuna Colchones)',
    label: 'Comercializadora Zebrands S.A. de C.V.',
    verdict: {
      status: 'verified_safe',
      score: 83,
      title: 'Pasaporte Verificado con Cobertura Auditada',
      description: 'Identidad legal validada (CZE150414AB2), establecimiento físico activo en el DENUE, contrato de adhesión vigente en PROFECO y 93.9% de órdenes auditadas en Opinio.',
      rfcStatus: 'verified',
      denueStatus: 'active',
      ordersStatus: 'connected',
      profecoStatus: 'clear',
      recommendation: 'Transferencia o pago seguro. El comercio cuenta con tasa de resolución de incidencias del 100% y pedidos conectados.',
      businessSlug: 'luuna',
    },
  },
  {
    id: 'unknown_clabe',
    name: 'Cuenta CLABE 18 dígitos desconocida',
    type: 'unclaimed',
    input: '646180123456789012 (STP / Cuenta no vinculada)',
    label: 'Beneficiario no registrado en el padrón',
    verdict: {
      status: 'caution',
      score: 42,
      title: 'Identidad Comercial No Vinculada',
      description: 'La cuenta CLABE corresponde a una cuenta receptora de fondos sin razón social asociada en el padrón de comercio formal ni historial de pedidos conectados.',
      rfcStatus: 'unknown',
      denueStatus: 'missing',
      ordersStatus: 'unconnected',
      profecoStatus: 'not_registered',
      recommendation: 'Solicita al vendedor su perfil público de Opinio o su Cédula de Identificación Fiscal (CIF) antes de transferir.',
    },
  },
];

export function TransferSimulator() {
  const [selectedPreset, setSelectedPreset] = useState<SimulationPreset>(PRESETS[0]);
  const [customInput, setCustomInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleSelectPreset = (preset: SimulationPreset) => {
    setSelectedPreset(preset);
    setCustomInput('');
  };

  const handleCustomAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    setAnalyzing(true);
    setTimeout(() => {
      // Heuristic analysis based on input
      const text = customInput.toLowerCase();
      if (text.includes('luuna') || text.includes('41640533') || text.includes('4164 0533')) {
        setSelectedPreset(PRESETS[1]);
      } else if (text.includes('doto') || text.includes('8526') || text.includes('ahal')) {
        setSelectedPreset({
          id: 'custom_found',
          name: 'Comercio reconocido',
          type: 'verified',
          input: customInput,
          label: 'Marca verificada en catálogo Opinio',
          verdict: {
            status: 'verified_safe',
            score: 84,
            title: 'Negocio Verificado en Directorio Oficial',
            description: 'Encontramos coincidencia oficial con identidad SAT activa, órdenes auditadas y sellos de respuesta.',
            rfcStatus: 'verified',
            denueStatus: 'active',
            ordersStatus: 'connected',
            profecoStatus: 'clear',
            recommendation: 'Operación confiable respaldada por métricas de cobertura y resolución.',
            businessSlug: text.includes('doto') ? 'doto' : 'ahal-cosmetica',
          },
        });
      } else {
        setSelectedPreset({
          id: 'custom_unknown',
          name: 'Análisis de dato ingresado',
          type: 'suspicious',
          input: customInput,
          label: 'Dato ingresado por el usuario',
          verdict: {
            status: 'caution',
            score: 31,
            title: 'Sin Evidencia de Operación Formal',
            description: `No localizamos registros de órdenes conectadas, RFC verificado o establecimiento DENUE para "${customInput}".`,
            rfcStatus: 'missing',
            denueStatus: 'missing',
            ordersStatus: 'unconnected',
            profecoStatus: 'not_registered',
            recommendation: 'Solicita comprobante de cumplimiento antes de transferir por SPEI o depósito bancario.',
          },
        });
      }
      setAnalyzing(false);
    }, 450);
  };

  const { verdict } = selectedPreset;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20 mb-2">
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Simulador Interactivo de Protección</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Verifica antes de transferir
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            Simula la verificación instantánea de un número de WhatsApp, cuenta CLABE o enlace de pago antes de arriesgar tu dinero.
          </p>
        </div>

        {/* Presets buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedPreset.id === preset.id
                  ? preset.type === 'verified'
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Input row */}
      <form onSubmit={handleCustomAnalyze} className="mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={customInput || selectedPreset.input}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Pega aquí WhatsApp, CLABE de 18 dígitos o link de pago..."
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={analyzing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-800 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors shrink-0 disabled:opacity-50"
          >
            {analyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <FileSearch className="h-4 w-4 text-emerald-400" />
            )}
            <span>Analizar dato</span>
          </button>
        </div>
      </form>

      {/* Analysis Results Card */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/70 p-5 sm:p-6 overflow-hidden">
        {/* Status header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800/80">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              verdict.status === 'verified_safe'
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : verdict.status === 'high_risk'
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                : 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
            }`}>
              {verdict.status === 'verified_safe' ? (
                <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
              ) : verdict.status === 'high_risk' ? (
                <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
              ) : (
                <AlertOctagon className="h-6 w-6 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-white">
                  {verdict.title}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-bold ${
                  verdict.score >= 80 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : verdict.score <= 30
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  Score {verdict.score}/100
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                {verdict.description}
              </p>
            </div>
          </div>

          {verdict.businessSlug && (
            <Link
              href={`/b/${verdict.businessSlug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 transition-colors shrink-0"
            >
              <span>Ver Pasaporte Completo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* 4 Checks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          {/* SAT RFC */}
          <div className="rounded-lg bg-neutral-900/80 p-3 border border-neutral-850">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-neutral-500" />
                SAT RFC Legal
              </span>
              {verdict.rfcStatus === 'verified' ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 font-medium text-[11px]">
                  <Check className="h-3 w-3" /> Válido
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-400 font-medium text-[11px]">
                  <X className="h-3 w-3" /> No registrado
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300">
              {verdict.rfcStatus === 'verified' ? 'Persona moral constituida en México' : 'Sin razón social fiscal vinculada'}
            </p>
          </div>

          {/* INEGI DENUE */}
          <div className="rounded-lg bg-neutral-900/80 p-3 border border-neutral-850">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-neutral-500" />
                INEGI DENUE
              </span>
              {verdict.denueStatus === 'active' ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 font-medium text-[11px]">
                  <Check className="h-3 w-3" /> CLEE Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-400 font-medium text-[11px]">
                  <X className="h-3 w-3" /> Sin local
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300">
              {verdict.denueStatus === 'active' ? 'Establecimiento físico geolocalizado' : 'Sin presencia física censada'}
            </p>
          </div>

          {/* Pedidos Conectados */}
          <div className="rounded-lg bg-neutral-900/80 p-3 border border-neutral-850">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-neutral-500" />
                Órdenes Auditadas
              </span>
              {verdict.ordersStatus === 'connected' ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 font-medium text-[11px]">
                  <Check className="h-3 w-3" /> Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-amber-400 font-medium text-[11px]">
                  <X className="h-3 w-3" /> 0% auditado
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300">
              {verdict.ordersStatus === 'connected' ? 'Denominador de compras transparente' : 'Opiniones sin respaldo de compra'}
            </p>
          </div>

          {/* PROFECO Buró */}
          <div className="rounded-lg bg-neutral-900/80 p-3 border border-neutral-850">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-neutral-500" />
                Buró PROFECO
              </span>
              {verdict.profecoStatus === 'clear' ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-400 font-medium text-[11px]">
                  <Check className="h-3 w-3" /> Contrato Adhesión
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-neutral-400 font-medium text-[11px]">
                  Sin registro
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300">
              {verdict.profecoStatus === 'clear' ? 'Contrato de adhesión a distancia registrado' : 'Sin contrato registrado ante autoridad'}
            </p>
          </div>
        </div>

        {/* Final Recommendation */}
        <div className="mt-4 p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-300">
          <span className="font-semibold text-emerald-400 shrink-0">Recomendación Opinio:</span>
          <span>{verdict.recommendation}</span>
        </div>
      </div>
    </div>
  );
}
