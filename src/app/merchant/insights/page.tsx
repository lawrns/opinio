import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  PackageCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
  getMerchantInsights,
} from '@/lib/merchant-data';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantInsightsPage({ searchParams }: PageProps) {
  const { business: businessSlug } = await searchParams;
  const allBusinesses = await getMerchantBusinesses();
  const currentBusiness = businessSlug
    ? (await getMerchantBusiness(businessSlug)) || allBusinesses[0]
    : allBusinesses[0];

  if (!currentBusiness) {
    return (
      <div className="text-center py-16 text-[#64748B]">
        No se encontró información del comercio.
      </div>
    );
  }

  const insights = await getMerchantInsights(currentBusiness);
  const { benchmark, conversionLift, issuesByCategory, refundVelocity } = insights;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('es-MX').format(val);
  };

  const score = Number(currentBusiness.trust_score) || 0;
  const coverage = Number(currentBusiness.coverage_percentage) || 0;
  const resolution = Number(currentBusiness.resolution_rate) || 0;
  const issues = Number(currentBusiness.issues_per_thousand) || 0;

  const estimatedMarketplaceFeesSaved = conversionLift.estimatedExtraRevenueMxn * 0.17;


  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Insights y Benchmarks Sectoriales
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentBusiness.category}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Métricas de ROI, conversión estimada y percentiles de la industria mexicana para{' '}
            <strong className="text-[#0F172A]">{currentBusiness.brand_name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B]">Muestra de referencia:</span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] font-mono text-[#0F172A] shadow-xs">
            2,450 comercios auditados
          </span>
        </div>
      </div>

      {/* Conversion Lift & ROI Engine Hero Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200 relative overflow-hidden shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Impacto Comercial Estimado
              </span>
              <span className="text-xs text-[#64748B] font-medium">
                Modelo de Lift por Pasaporte Verificado
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              +{conversionLift.estimatedLiftPercent}% de Incremento en Conversión Directa
            </h2>
            <p className="text-xs text-[#334155] leading-relaxed">
              En México, el 73% de los compradores digitales duda antes de pagar con SPEI o tarjeta en tiendas independientes. Al mostrar el pasaporte verificado con cobertura de pedidos y garantía de resolución, la tasa de abandono en checkout se reduce drásticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 shrink-0">
            <div className="p-4 rounded-xl bg-white border border-emerald-200 text-left shadow-xs">
              <div className="text-[11px] text-[#64748B]">Ventas Extra / Mes</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
                +{formatNumber(conversionLift.additionalOrdersMonthly)}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">pedidos completados</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-emerald-200 text-left shadow-xs">
              <div className="text-[11px] text-[#64748B]">Facturación Adicional</div>
              <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
                {formatCurrency(conversionLift.estimatedExtraRevenueMxn)}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">mensuales en MXN</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-emerald-200 text-left col-span-2 sm:col-span-1 shadow-xs">
              <div className="text-[11px] text-[#64748B]">Ahorro en Comisiones</div>
              <div className="text-2xl font-extrabold font-mono text-blue-700 mt-1">
                {formatCurrency(estimatedMarketplaceFeesSaved)}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">vs 17% de marketplace</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Category Benchmark Comparisons */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
          Comparativa de Pilares: Tu Negocio vs Industria Mexicana
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Opinio Score Benchmark */}
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-[#0F172A]">Opinio Score Global</span>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {score} / 100
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Tu Negocio</span>
                  <span className="font-mono font-semibold text-[#0F172A]">{score} pts</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full"
                    style={{ width: `${Math.min(100, score)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 90 (Top 10% México)</span>
                  <span className="font-mono">{benchmark.trustScoreP90} pts</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#94A3B8] rounded-full"
                    style={{ width: `${benchmark.trustScoreP90}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 50 (Mediana Industria)</span>
                  <span className="font-mono">{benchmark.trustScoreP50} pts</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CBD5E1] rounded-full"
                    style={{ width: `${benchmark.trustScoreP50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Cobertura de Pedidos Benchmark */}
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-[#0F172A]">Cobertura de Pedidos (Denominador)</span>
              </div>
              <span className="font-mono text-sm font-bold text-blue-700">
                {coverage}%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Tu Negocio</span>
                  <span className="font-mono font-semibold text-[#0F172A]">{coverage}%</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min(100, coverage)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 90 (Sello Cobertura)</span>
                  <span className="font-mono">{benchmark.coverageP90}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#94A3B8] rounded-full"
                    style={{ width: `${benchmark.coverageP90}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 50 (Mediana Nacional)</span>
                  <span className="font-mono">{benchmark.coverageP50}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CBD5E1] rounded-full"
                    style={{ width: `${benchmark.coverageP50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Tasa de Resolución Confirmada */}
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-[#0F172A]">Tasa de Resolución Confirmada</span>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-700">
                {resolution}%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Tu Negocio</span>
                  <span className="font-mono font-semibold text-[#0F172A]">{resolution}%</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full"
                    style={{ width: `${Math.min(100, resolution)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 90 México</span>
                  <span className="font-mono">{benchmark.resolutionRateP90}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#94A3B8] rounded-full"
                    style={{ width: `${benchmark.resolutionRateP90}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 50 México</span>
                  <span className="font-mono">{benchmark.resolutionRateP50}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CBD5E1] rounded-full"
                    style={{ width: `${benchmark.resolutionRateP50}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Incidencias / 1k Pedidos (Menor es mejor) */}
          <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-[#0F172A]">Incidencias / 1k Pedidos</span>
              </div>
              <span className="font-mono text-sm font-bold text-purple-700">
                {issues} / 1k
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Tu Negocio</span>
                  <span className="font-mono font-semibold text-[#0F172A]">{issues} por mil</span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${Math.max(5, (issues / 35) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 90 (Excelente: {benchmark.issuesP90} / 1k)</span>
                  <span className="font-mono">{benchmark.issuesP90}</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#94A3B8] rounded-full"
                    style={{ width: `${(benchmark.issuesP90 / 35) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#64748B] mb-1">
                  <span>Percentil 50 (Mediana: {benchmark.issuesP50} / 1k)</span>
                  <span className="font-mono">{benchmark.issuesP50}</span>
                </div>
                <div className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CBD5E1] rounded-full"
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
        <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold text-sm text-[#0F172A]">
                Distribución de Causas de Inconformidad
              </h3>
            </div>
            <span className="text-xs text-[#64748B]">Total: 18 reclamos</span>
          </div>

          <p className="text-xs text-[#64748B]">
            Identifica el cuello de botella operativo para reducir reclamos antes de que escalen a PROFECO o contracargos bancarios.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {issuesByCategory.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-[#334155] text-[11px]">
                  <span>{item.label}</span>
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
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
        <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold text-sm text-[#0F172A]">
                  Velocidad de Dispersión SPEI / Reembolsos
                </h3>
              </div>
              <span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-200">
                Súper Rápido
              </span>
            </div>

            <p className="text-xs text-[#64748B]">
              La rapidez con la que devuelves fondos tras una inconformidad es el factor #1 de retención de clientes en comercio mexicano.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[#64748B] text-[11px]">Mediana SPEI Bancaria</div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {refundVelocity.speiMedianHours} hrs
                </div>
                <div className="text-[10px] text-[#64748B] mt-0.5">vs 72 hrs promedio MX</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-[#64748B] text-[11px]">Percentil 90 de Reembolso</div>
                <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
                  {refundVelocity.percentiles.p90} hrs
                </div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Casos complejos</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                El <strong>94% de tus compradores</strong> que recibieron reembolso SPEI en menos de 6 horas dejaron una opinión positiva reconociendo la honestidad del comercio.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0]">
            <Link
              href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="w-full flex items-center justify-center py-2 text-xs font-semibold text-[#334155] hover:text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg transition-colors gap-1"
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
