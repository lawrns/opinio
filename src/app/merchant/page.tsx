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
  PackageCheck,
  ChevronRight,
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
export const metadata = { title: 'Resumen del negocio · Opinio.mx' };

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantDashboardPage({ searchParams }: PageProps) {
  const { business: businessSlug } = await searchParams;
  const allBusinesses = await getMerchantBusinesses();
  const currentBusiness = businessSlug
    ? (await getMerchantBusiness(businessSlug)) || allBusinesses[0]
    : allBusinesses[0];

  if (!currentBusiness) {
    return (
      <div className="text-center py-16 text-op-muted">
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-op-ink">
              Panel de Control Comercial
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-op-shaded text-op-secondary border border-op-border">
              {currentBusiness.category}
            </span>
          </div>
          <p className="text-sm text-op-muted mt-1">
            Registros de confianza, cobertura y atención al cliente de{' '}
            <strong className="text-op-ink">{currentBusiness.brand_name}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/b/${currentBusiness.slug}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-op-secondary hover:text-op-ink bg-white hover:bg-op-canvas border border-op-border shadow-xs transition-colors"
          >
            <span>Pasaporte Público</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <QuickInviteModal businessId={currentBusiness.id} businessSlug={currentBusiness.slug} />
        </div>
      </div>

      {/* SLA Alert Banner (if urgent cases exist) */}
      {urgentCases.length > 0 && (
        <div className="p-4 rounded-xl bg-op-warning-soft border border-op-warning-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-op-warning-soft text-op-warning border border-op-warning-soft shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-op-warning flex items-center gap-2">
                <span>Casos que necesitan tu atención</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-op-warning-soft text-op-warning border border-op-warning-soft font-bold">
                  Pendientes
                </span>
              </div>
              <p className="text-xs text-op-warning mt-0.5">
                Tienes <strong>{urgentCases.length} caso(s) abierto(s)</strong> sin propuesta de remedio oficial. Revisa el expediente y ofrece una solución al cliente.
              </p>
            </div>
          </div>

          <Link
            href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-op-warning hover:bg-op-warning text-white shadow-xs transition-colors whitespace-nowrap"
          >
            <span>Resolver Casos Ahora</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Opinio Score */}
        <div className="p-5 rounded-xl bg-white border border-op-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-op-muted font-medium">
              <span>Opinio Score</span>
              <span className="p-1.5 rounded-md bg-op-green-soft text-op-green-dark border border-op-green-border">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-op-ink font-mono">
                {currentBusiness.trust_score}
              </span>
              <span className="text-xs text-op-muted">/ 100</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-op-border flex items-center justify-between text-xs">
            <span className="text-op-muted">Confianza:</span>
            <span className="font-semibold text-op-green-dark uppercase tracking-wider text-xs bg-op-green-soft px-2 py-0.5 rounded border border-op-green-border">
              {({ preliminary: 'Preliminar', established: 'Establecida', strong: 'Fuerte', very_strong: 'Muy fuerte' })[currentBusiness.confidence_level]}
            </span>
          </div>
        </div>

        {/* Card 2: Cobertura % */}
        <div className="p-5 rounded-xl bg-white border border-op-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-op-muted font-medium">
              <span>Cobertura de Pedidos</span>
              <span className="p-1.5 rounded-md bg-op-shaded text-op-secondary border border-op-border">
                <Send className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-op-ink font-mono">
                {currentBusiness.coverage_percentage}%
              </span>
              <span className="text-xs text-op-green-dark font-medium">
                {isTransparent ? '✓ Meta alcanzada' : 'Meta: 90%'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-op-border flex items-center justify-between text-xs">
            <span className="text-op-muted">Invitaciones enviadas:</span>
            <span className="font-mono text-op-ink font-medium">
              {currentBusiness.invited_orders_count.toLocaleString('es-MX')} / {currentBusiness.observed_orders_count.toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        {/* Card 3: Casos Abiertos */}
        <div className="p-5 rounded-xl bg-white border border-op-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-op-muted font-medium">
              <span>Casos Abiertos (SLA)</span>
              <span className={cn(
                "p-1.5 rounded-md border",
                openCases.length > 0
                  ? "bg-op-warning-soft text-op-warning border-op-warning-soft"
                  : "bg-op-green-soft text-op-green-dark border-op-green-border"
              )}>
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-op-ink font-mono">
                {openCases.length}
              </span>
              <span className="text-xs text-op-muted">en gestión</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-op-border flex items-center justify-between text-xs">
            <span className="text-op-muted">Tasa de resolución:</span>
            <span className="font-mono font-medium text-op-green-dark">
              {currentBusiness.resolution_rate}% confirmado
            </span>
          </div>
        </div>

        {/* Card 4: Incidencias / 1k */}
        <div className="p-5 rounded-xl bg-white border border-op-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-op-muted font-medium">
              <span>Incidencias / 1k Pedidos</span>
              <span className="p-1.5 rounded-md bg-op-shaded text-op-secondary border border-op-border">
                <PackageCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-op-ink font-mono">
                {currentBusiness.issues_per_thousand}
              </span>
              <span className="text-xs text-op-muted">por mil</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-op-border flex items-center justify-between text-xs">
            <span className="text-op-muted">Pedidos registrados:</span>
            <span className="text-op-green-dark font-medium">{currentBusiness.observed_orders_count.toLocaleString('es-MX')}</span>
          </div>
        </div>
      </div>

      {/* Coverage Health Meter (The Denominator Engine) */}
      <div className="p-6 rounded-2xl bg-op-canvas border border-op-border relative overflow-hidden shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold tracking-wide uppercase bg-op-green-soft text-op-green-dark border border-op-green-border">
                El Moat de Opinio: Confianza con Denominador
              </span>
              <span className="text-xs text-op-muted">• Norma Mexicana NMX-COE</span>
            </div>
            <h2 className="text-lg font-bold text-op-ink">
              Salud de Cobertura Transparente (Target: ≥ 90%)
            </h2>
            <p className="text-xs text-op-secondary leading-relaxed">
              La cobertura compara invitaciones con pedidos registrados. Una cobertura ≥ 90% alcanza el umbral de{' '}
              <strong className="text-op-green-dark">Cobertura Transparente</strong> en tus widgets y en tu pasaporte público.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-op-ink">
                {currentBusiness.coverage_percentage}%
              </div>
              <div className="text-xs text-op-muted">
                {isTransparent ? 'Distintivo Activo' : 'En camino al distintivo'}
              </div>
            </div>
            <Link
              href={`/merchant/requests?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-op-shaded text-op-ink border border-op-strong shadow-xs transition-colors"
            >
              Gestionar Envíos
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="h-3 w-full bg-op-border rounded-full overflow-hidden p-0.5 border border-op-strong">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                coveragePercent >= 90
                  ? "bg-op-green"
                  : "bg-op-warning"
              )}
              style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-between text-xs text-op-muted font-mono">
            <span>0%</span>
            
            <span className="text-op-green-dark font-bold">90% Sello Cobertura Transparente</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Reviews & Resolution Inbox Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Reviews */}
        <div className="p-6 rounded-2xl bg-white border border-op-border shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-op-green-dark" />
                <h3 className="font-semibold text-sm text-op-ink">
                  Últimas Opiniones Verificadas
                </h3>
              </div>
              <Link
                href={`/merchant/reviews?business=${encodeURIComponent(currentBusiness.slug)}`}
                className="text-xs text-op-green-dark hover:text-op-green-dark font-medium flex items-center gap-1"
              >
                <span>Ver todas ({reviews.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {reviews.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl bg-op-canvas border border-op-border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-op-warning text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < r.rating ? "text-op-warning" : "text-op-strong"}
                        >
                          ★
                        </span>
                      ))}
                      <span className="text-op-muted font-medium ml-1.5 text-xs">
                        {r.rating}.0
                      </span>
                    </div>

                    <span className="text-xs font-medium text-op-green-dark bg-op-green-soft px-2 py-0.5 rounded border border-op-green-border">
                      {r.verification_level === 'confirmed_store_order' ? 'Pedido Verificado' : 'Pago Confirmado'}
                    </span>
                  </div>

                  <p className="text-xs text-op-secondary font-medium line-clamp-2">
                    &ldquo;{r.body}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-xs text-op-muted pt-1">
                    <span>{r.author_name} ({r.author_masked_contact || 'Cliente'})</span>
                    {r.response ? (
                      <span className="text-op-green-dark text-xs flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Respondido
                      </span>
                    ) : (
                      <Link
                        href={`/merchant/reviews?business=${encodeURIComponent(currentBusiness.slug)}`}
                        className="text-op-green-dark hover:underline text-xs font-semibold"
                      >
                        Responder oficialmente
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-op-border">
            <Link
              href={`/merchant/reviews?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="w-full flex items-center justify-center py-2 text-xs font-semibold text-op-secondary hover:text-op-ink bg-op-canvas hover:bg-op-shaded border border-op-border rounded-lg transition-colors"
            >
              Administrar Respuestas Oficiales
            </Link>
          </div>
        </div>

        {/* Right: Resolution Inbox & Remedies */}
        <div className="p-6 rounded-2xl bg-white border border-op-border shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-op-warning" />
                <h3 className="font-semibold text-sm text-op-ink">
                  Casos de Resolución y Conciliación
                </h3>
              </div>
              <Link
                href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
                className="text-xs text-op-green-dark hover:text-op-green-dark font-medium flex items-center gap-1"
              >
                <span>Ver bandeja ({cases.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {cases.length === 0 && <p className="py-4 text-sm text-op-muted">No hay casos registrados para este negocio.</p>}
              {cases.slice(0, 3).map((c) => {
                const isUrgent = c.status === 'opened' || c.status === 'reopened';
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-op-canvas border border-op-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-op-ink font-semibold">
                        {c.case_number}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded border",
                          isUrgent
                            ? "bg-op-danger-soft text-op-danger border-op-danger-soft"
                            : c.status === 'resolved_consumer_confirmed'
                            ? "bg-op-green-soft text-op-green-dark border-op-green-border"
                            : "bg-op-shaded text-op-secondary border-op-border"
                        )}
                      >
                        {c.status === 'opened'
                          ? 'Abierto (SLA)'
                          : c.status === 'remedy_offered'
                          ? 'Remedio Propuesto'
                          : c.status === 'resolved_consumer_confirmed'
                          ? 'Confirmado por Consumidor'
                          : ({ acknowledged: 'En seguimiento', unresolved: 'Sin resolver', reopened: 'Reabierto', resolved_merchant_asserted: 'Resolución reportada' })[c.status]}
                      </span>
                    </div>

                    <div className="text-xs text-op-ink font-medium">
                      Cliente: {c.customer_name} • <span className="text-op-muted">Motivo: {({ delay: 'Demora', damaged_goods: 'Producto dañado', wrong_item: 'Producto incorrecto', refund_pending: 'Reembolso pendiente', no_response: 'Sin respuesta' })[c.issue_category]}</span>
                    </div>

                    <div className="text-xs text-op-muted flex items-center justify-between">
                      <span>Remedio pedido: <strong className="text-op-secondary">{({ refund: 'Reembolso', replacement: 'Reemplazo', compensation: 'Compensación', clarification: 'Aclaración' })[c.customer_requested_remedy]}</strong></span>
                      <span className="font-mono text-op-muted">Resp. prom: {c.median_first_response_minutes}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-op-border">
            <Link
              href={`/merchant/inbox?business=${encodeURIComponent(currentBusiness.slug)}`}
              className="w-full flex items-center justify-center py-2 text-xs font-semibold text-op-secondary hover:text-op-ink bg-op-canvas hover:bg-op-shaded border border-op-border rounded-lg transition-colors"
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
          className="p-4 rounded-xl bg-white border border-op-border hover:border-op-strong shadow-xs transition-all group flex items-start gap-3"
        >
          <div className="p-2.5 rounded-lg bg-op-green-soft text-op-green-dark border border-op-green-border group-hover:scale-105 transition-transform">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-op-ink group-hover:text-op-green-dark transition-colors flex items-center gap-1">
              <span>Configurar Widgets Embebidos</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </div>
            <p className="text-xs text-op-muted mt-1">
              Inserta el Sello Flotante o el Badge de Checkout en Shopify, Tiendanube o código HTML.
            </p>
          </div>
        </Link>

        <Link
          href={`/merchant/insights?business=${encodeURIComponent(currentBusiness.slug)}`}
          className="p-4 rounded-xl bg-white border border-op-border hover:border-op-strong shadow-xs transition-all group flex items-start gap-3"
        >
          <div className="p-2.5 rounded-lg bg-op-shaded text-op-secondary border border-op-border group-hover:scale-105 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-op-ink group-hover:text-op-secondary transition-colors flex items-center gap-1">
              <span>Comparativa Sectorial México</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </div>
            <p className="text-xs text-op-muted mt-1">
              Compara tu tasa de incidencias y velocidad de reembolso contra el percentil 90 del país.
            </p>
          </div>
        </Link>

        <Link
          href={`/merchant/settings?business=${encodeURIComponent(currentBusiness.slug)}`}
          className="p-4 rounded-xl bg-white border border-op-border hover:border-op-strong shadow-xs transition-all group flex items-start gap-3"
        >
          <div className="p-2.5 rounded-lg bg-op-shaded text-op-secondary border border-op-border group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-op-ink group-hover:text-op-secondary transition-colors flex items-center gap-1">
              <span>Identidad SAT &amp; DENUE</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </div>
            <p className="text-xs text-op-muted mt-1">
              Vincula tu Cédula Fiscal SAT, código CLEE de INEGI y canal oficial de WhatsApp Business.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
