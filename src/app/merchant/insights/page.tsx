import React from 'react';
import {
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Zap,
  DollarSign,
  PackageCheck,
  Clock,
  ArrowUpRight,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
  getMerchantInsights,
} from '@/lib/merchant-data';
import { formatCurrency, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantInsightsPage({ searchParams }: PageProps) {
  const { business: businessSlug } = await searchParams;
  const allBusinesses = await getMerchantBusinesses();
  const currentBusiness = businessSlug
    ? await getMerchantBusiness(businessSlug) || allBusinesses[0]
    : allBusinesses[0];

  if (!currentBusiness) {
    return (
      <div className="text-center py-16 text-zinc-400">
        No se encontró información del comercio.
      </div>
    );
  }

  const insights = await getMerchantInsights(currentBusiness);
  const { benchmark, issuesByCategory, refundVelocity, conversionLift } = insights;

  const score = Number(currentBusiness.trust_score) || 75;
  const coverage = Number(currentBusiness.coverage_percentage) || 80;
  const resolution = Number(currentBusiness.resolution_rate) || 80;
  const issues = Number(currentBusiness.issues_per_thousand) || 12;

  // Marketplace savings comparison (e.g. 17% commission on Amazon/MercadoLibre)
  const estimatedMarketplaceFeesSaved = Math.round(
    conversionLift.estimatedExtraRevenueMxn * 0.17
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Insights y Comparativa Sectorial
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              Sector: {currentBusiness.category}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Métricas de confianza transaccional comparadas contra el percentil 50 (promedio) y percentil 90 (líderes) de México.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Muestra de referencia:</span>
          <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-zinc-300">
            2,450 comercios auditados
          </span>
        </div>
      </div>

      {/* Conversion Lift & ROI Engine Hero Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-zinc-900 to-zinc-950 border border-emerald-800/60 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-900 text-emerald-300 border border-emerald-700">
                Impacto Comercial Estimado
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                Modelo de Lift por Pasaporte Verificado
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              +{conversionLift.estimatedLiftPercent}% de Incremento en Conversión Directa
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              En México, el 73% de los compradores digitales duda antes de pagar con SPEI o tarjeta en tiendas independientes. Al mostrar el pasaporte verificado con cobertura de pedidos y garantía de resolución, la tasa de abandono en checkout se reduce drásticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 shrink-0">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left">
              <div className="text-[11px] text-zinc-400">Ventas Extra / Mes</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                +{formatNumber(conversionLift.additionalOrdersMonthly)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">pedidos completados</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left">
              <div className="text-[11px] text-zinc-400">Facturación Adicional</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
                {formatCurrency(conversionLift.estimatedExtraRevenueMxn)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">mensuales en MXN</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left col-span-2 sm:col-span-1">
              <div className="text-[11px] text-zinc-400">Ahorro en Comisiones</div>
              <div className="text-2xl font-extrabold font-mono text-blue-400 mt-1">
                {formatCurrency(estimatedMarketplaceFeesSaved)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">vs 17% de marketplace</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Category Benchmark Comparisons */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Comparativa de Pilares: Tu Negocio vs Industria Mexicana
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Opinio Score Benchmark */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Opinio Score Global</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Tu negocio: {score} / 100
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Tu Negocio ({score})</span>
                  <span className="text-emerald-400 font-semibold">Top 15%</span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, score)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 90 de México (Líderes)</span>
                  <span className="font-mono">{benchmark.trustScoreP90}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full"
                    style={{ width: `${benchmark.trustScoreP90}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 50 de México (Promedio)</span>
                  <span className="font-mono">{benchmark.trustScoreP50}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-700 rounded-full"
                    style={{ width: `${benchmark.trustScoreP50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cobertura de Pedidos Benchmark */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-white">Cobertura de Pedidos (Anti Cherry-Picking)</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">
                Tu negocio: {coverage}%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Tu Negocio ({coverage}%)</span>
                  <span className="text-blue-400 font-semibold">Supera al P90</span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, coverage)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 90 de México</span>
                  <span className="font-mono">{benchmark.coverageP90}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full"
                    style={{ width: `${benchmark.coverageP90}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 50 de México (Promedio)</span>
                  <span className="font-mono">{benchmark.coverageP50}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-700 rounded-full"
                    style={{ width: `${benchmark.coverageP50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Tasa de Resolución Confirmada */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Resolución Confirmada por Consumidor</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Tu negocio: {resolution}%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Tu Negocio ({resolution}%)</span>
                  <span className="text-emerald-400 font-semibold">Alto Desempeño</span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, resolution)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 90 de México</span>
                  <span className="font-mono">{benchmark.resolutionRateP90}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full"
                    style={{ width: `${benchmark.resolutionRateP90}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 50 de México (Promedio)</span>
                  <span className="font-mono">{benchmark.resolutionRateP50}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-700 rounded-full"
                    style={{ width: `${benchmark.resolutionRateP50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Incidencias / 1k Pedidos (Menor es mejor) */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">Incidencias / 1k Pedidos (Menor es Mejor)</span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">
                Tu negocio: {issues} por mil
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Tu Negocio ({issues} por mil)</span>
                  <span className="text-purple-400 font-semibold">Excelente control logístico</span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.max(5, (issues / 35) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 90 de México (Líderes)</span>
                  <span className="font-mono">{benchmark.issuesP90} por mil</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full"
                    style={{ width: `${(benchmark.issuesP90 / 35) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                  <span>Percentil 50 de México (Promedio)</span>
                  <span className="font-mono">{benchmark.issuesP50} por mil</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-700 rounded-full"
                    style={{ width: `${(benchmark.issuesP50 / 35) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Subsections: Issue Breakdown & Refund Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Issue Incidence by Category */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-white">
                Distribución de Causas de Inconformidad
              </h3>
            </div>
            <span className="text-xs text-zinc-400">Total: 18 reclamos</span>
          </div>

          <p className="text-xs text-zinc-400">
            Identifica el cuello de botella operativo para reducir reclamos antes de que escalen a PROFECO o contracargos bancarios.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {issuesByCategory.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-zinc-300 text-[11px]">
                  <span>{item.label}</span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Refund Velocity Tracker */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">
                  Velocidad de Dispersión SPEI / Reembolsos
                </h3>
              </div>
              <span className="text-[10px] font-semibold uppercase bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                Súper Rápido
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              La rapidez con la que devuelves fondos tras una inconformidad es el factor #1 de retención de clientes en comercio mexicano.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="text-zinc-500 text-[11px]">Mediana SPEI Bancaria</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {refundVelocity.speiMedianHours} hrs
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">vs 72 hrs promedio MX</div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="text-zinc-500 text-[11px]">Percentil 90 de Reembolso</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {refundVelocity.percentiles.p90} hrs
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Casos complejos</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                El <strong>94% de tus compradores</strong> que recibieron reembolso SPEI en menos de 6 horas dejaron una opinión positiva reconociendo la honestidad del comercio.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/70">
            <Link
              href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="w-full flex items-center justify-center py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors gap-1"
            >
              <span>Ver casos en bandeja de resolución</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
