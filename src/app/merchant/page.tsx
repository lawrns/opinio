import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  Code2,
  CheckCircle2,
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  Zap,
  Users,
  PackageCheck,
  ChevronRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
  getMerchantReviews,
  getMerchantCases,
} from '@/lib/merchant-data';
import { cn } from '@/lib/utils';
import { QuickInviteModal } from '@/components/QuickInviteModal';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantDashboardPage({ searchParams }: PageProps) {
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

  const reviews = await getMerchantReviews(currentBusiness.id);
  const cases = await getMerchantCases(currentBusiness.id);

  const urgentCases = cases.filter(
    (c) => c.status === 'opened' || c.status === 'reopened'
  );
  const openCases = cases.filter(
    (c) => c.status !== 'resolved_consumer_confirmed' && c.status !== 'resolved_merchant_asserted'
  );

  const coveragePercent = Number(currentBusiness.coverage_percentage) || 0;
  const isTransparent = coveragePercent >= 90;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header with Title & Quick Action Modal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Panel de Control Comercial
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {currentBusiness.category}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Monitoreo en tiempo real de confianza transaccional, cobertura y resolución para{' '}
            <strong className="text-zinc-200">{currentBusiness.brand_name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/b/${currentBusiness.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <span>Pasaporte Público</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <QuickInviteModal businessId={currentBusiness.id} businessSlug={currentBusiness.slug} />
        </div>
      </div>

      {/* SLA Alert Banner (if urgent cases exist) */}
      {urgentCases.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-zinc-900 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/30 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-rose-200 flex items-center gap-2">
                <span>Atención prioritaria requerida por SLA</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-700">
                  &lt; 14h restantes
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Tienes <strong>{urgentCases.length} caso(s) abierto(s)</strong> sin propuesta de remedio oficial. Responder dentro del SLA evita penalización en tu Puntaje de Resolución.
              </p>
            </div>
          </div>

          <Link
            href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors whitespace-nowrap"
          >
            <span>Resolver Casos Ahora</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Opinio Score */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Opinio Score</span>
              <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {currentBusiness.trust_score}
              </span>
              <span className="text-xs text-zinc-500">/ 100</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Confianza:</span>
            <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              {currentBusiness.confidence_level === 'very_strong' ? 'Muy Fuerte' : currentBusiness.confidence_level}
            </span>
          </div>
        </div>

        {/* Card 2: Cobertura % */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Cobertura de Pedidos</span>
              <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Send className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {currentBusiness.coverage_percentage}%
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {isTransparent ? '✓ Meta alcanzada' : 'Meta: 90%'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Invitaciones enviadas:</span>
            <span className="font-mono text-zinc-200">
              {currentBusiness.invited_orders_count.toLocaleString('es-MX')} / {currentBusiness.observed_orders_count.toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        {/* Card 3: Casos Abiertos */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Casos Abiertos (SLA)</span>
              <span className={cn(
                "p-1.5 rounded-md border",
                openCases.length > 0
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {openCases.length}
              </span>
              <span className="text-xs text-zinc-500">en gestión</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Tasa de resolución:</span>
            <span className="font-mono font-medium text-emerald-400">
              {currentBusiness.resolution_rate}% confirmado
            </span>
          </div>
        </div>

        {/* Card 4: Incidencias / 1k */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>Incidencias / 1k Pedidos</span>
              <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <PackageCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {currentBusiness.issues_per_thousand}
              </span>
              <span className="text-xs text-zinc-500">por mil</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Benchmark México:</span>
            <span className="text-emerald-400 font-medium">Top 10% sectorial</span>
          </div>
        </div>
      </div>

      {/* Coverage Health Meter (The Denominator Engine) */}
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                El Moat de Opinio: Confianza con Denominador
              </span>
              <span className="text-xs text-zinc-400">• Norma Mexicana NMX-COE</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Salud de Cobertura Transparente (Target: ≥ 90%)
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A diferencia de directorios convencionales donde los comercios filtran solo a clientes felices, Opinio audita el volumen real de pedidos conectados. Mantener una cobertura ≥ 90% activa el sello institucional{' '}
              <strong className="text-emerald-400">Cobertura Transparente</strong> en tus widgets y en tu pasaporte público.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {currentBusiness.coverage_percentage}%
              </div>
              <div className="text-[11px] text-zinc-400">
                {isTransparent ? 'Distintivo Activo' : 'En camino al distintivo'}
              </div>
            </div>
            <Link
              href={`/merchant/requests?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors"
            >
              Gestionar Envíos
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/60">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                coveragePercent >= 90
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-amber-500 to-emerald-500"
              )}
              style={{ width: `${Math.min(100, Math.max(5, coveragePercent))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>0%</span>
            <span className="text-amber-400/80">60% Promedio MX</span>
            <span className="text-emerald-400 font-semibold">90% Sello Cobertura Transparente</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Reviews & Resolution Inbox Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Reviews */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">
                  Últimas Opiniones Verificadas
                </h3>
              </div>
              <Link
                href={`/merchant/reviews?business=${encodeURIComponent(currentBusiness.slug)}`}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>Ver todas ({reviews.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {reviews.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < r.rating ? "text-amber-400" : "text-zinc-700"}
                        >
                          ★
                        </span>
                      ))}
                      <span className="text-zinc-400 font-medium ml-1.5 text-[11px]">
                        {r.rating}.0
                      </span>
                    </div>

                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50">
                      {r.verification_level === 'confirmed_store_order' ? 'Pedido Verificado' : 'Pago Confirmado'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 font-medium line-clamp-2">
                    &ldquo;{r.body}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>{r.author_name} ({r.author_masked_contact || 'Cliente'})</span>
                    {r.response ? (
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Respondido
                      </span>
                    ) : (
                      <Link
                        href={`/merchant/reviews?business=${encodeURIComponent(currentBusiness.slug)}`}
                        className="text-emerald-400 hover:underline text-[10px] font-semibold"
                      >
                        Responder oficialmente
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/70">
            <Link
              href={`/merchant/reviews?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="w-full flex items-center justify-center py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Administrar Respuestas Oficiales
            </Link>
          </div>
        </div>

        {/* Right: Resolution Inbox & Remedies */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">
                  Casos de Resolución y Conciliación
                </h3>
              </div>
              <Link
                href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <span>Ver bandeja ({cases.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {cases.slice(0, 3).map((c) => {
                const isUrgent = c.status === 'opened' || c.status === 'reopened';
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-emerald-400 font-semibold">
                        {c.case_number}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded border",
                          isUrgent
                            ? "bg-rose-950/60 text-rose-300 border-rose-800/80"
                            : c.status === 'resolved_consumer_confirmed'
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                            : "bg-blue-950/60 text-blue-300 border-blue-800/80"
                        )}
                      >
                        {c.status === 'opened'
                          ? 'Abierto (SLA)'
                          : c.status === 'remedy_offered'
                          ? 'Remedio Propuesto'
                          : c.status === 'resolved_consumer_confirmed'
                          ? 'Confirmado por Consumidor'
                          : c.status}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-200 font-medium">
                      Cliente: {c.customer_name} • <span className="text-zinc-400">Motivo: {c.issue_category}</span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>Remedio pedido: <strong className="text-zinc-300">{c.customer_requested_remedy}</strong></span>
                      <span className="font-mono text-zinc-500">Resp. prom: {c.median_first_response_minutes}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/70">
            <Link
              href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="w-full flex items-center justify-center py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Proponer Remedios SPEI / Reemplazo
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Quick Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/merchant/widgets?business=${encodeURIComponent(currentBusiness.slug)}`}
          className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all group flex items-start gap-3"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
              <span>Configurar Widgets Embebidos</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Inserta el Sello Flotante o el Badge de Checkout en Shopify, Tiendanube o código HTML.
            </p>
          </div>
        </Link>

        <Link
          href={`/merchant/insights?business=${encodeURIComponent(currentBusiness.slug)}`}
          className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all group flex items-start gap-3"
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1">
              <span>Comparativa Sectorial México</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Compara tu tasa de incidencias y velocidad de reembolso contra el percentil 90 del país.
            </p>
          </div>
        </Link>

        <Link
          href={`/merchant/settings?business=${encodeURIComponent(currentBusiness.slug)}`}
          className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all group flex items-start gap-3"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors flex items-center gap-1">
              <span>Identidad SAT &amp; DENUE</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Vincula tu Cédula Fiscal SAT, código CLEE de INEGI y canal oficial de WhatsApp Business.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
