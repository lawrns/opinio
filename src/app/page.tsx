import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Search, 
  Scale, 
  BarChart3, 
  AlertCircle, 
  Zap, 
  Users, 
  TrendingUp, 
  Check, 
  X,
  ExternalLink,
  Lock,
  Phone,
  Store,
  FileCheck,
  Percent
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HomeSearch } from '@/components/home/HomeSearch';
import { TransferSimulator } from '@/components/home/TransferSimulator';
import { query } from '@/lib/db';

interface BusinessItem {
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  rfc: string | null;
  domain: string | null;
  whatsapp: string | null;
  trust_score: string | number;
  confidence_level: string;
  coverage_percentage: string | number;
  observed_orders_count: number;
  issues_per_thousand: string | number;
  resolution_rate: string | number;
  effective_reviews_count: number;
  verified_level: string;
}

export const revalidate = 60; // Refresh every minute

export default async function HomePage() {
  let featuredBusinesses: BusinessItem[] = [];

  try {
    const res = await query<BusinessItem>(`
      SELECT 
        slug, brand_name, legal_name, category, rfc, domain, whatsapp,
        trust_score, confidence_level, coverage_percentage,
        observed_orders_count, issues_per_thousand, resolution_rate,
        effective_reviews_count, verified_level
      FROM businesses
      ORDER BY trust_score DESC
      LIMIT 6
    `);
    featuredBusinesses = res.rows;
  } catch (error) {
    console.error('Error fetching businesses for homepage:', error);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-neutral-950 font-sans">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 border-b border-neutral-900">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[250px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 backdrop-blur-md shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Pasaporte de Confianza Comercial • México 2026</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                La confianza <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                  se demuestra.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg lg:text-xl text-neutral-300 font-normal leading-relaxed max-w-2xl mx-auto">
                Antes de pagar por transferencia, WhatsApp o tienda en línea, comprueba{' '}
                <strong className="text-white font-semibold">quién vende</strong>,{' '}
                <strong className="text-white font-semibold">cómo cumple</strong> y{' '}
                <strong className="text-white font-semibold">cómo responde</strong> ante un problema.
              </p>

              {/* Interactive Search Bar */}
              <div className="pt-4">
                <HomeSearch />
              </div>

              {/* Micro Trust Pills */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  RFC y Cédula SAT
                </span>
                <span className="text-neutral-700">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  INEGI DENUE Geolocalizado
                </span>
                <span className="text-neutral-700">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  PROFECO Buró Comercial
                </span>
                <span className="text-neutral-700">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Órdenes Reales Auditadas
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* THE 3 PROOF PILLARS */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-neutral-900/30 border-b border-neutral-900" id="como-funciona">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Estructura de Auditoría
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Los 3 Pilares del Pasaporte Opinio
              </h2>
              <p className="text-sm sm:text-base text-neutral-400">
                Un negocio puede tener reseñas compradas pero no existir legalmente. Puede existir pero resolver pésimo. Opinio expone cada dimensión sin filtros.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Pillar 1: EXISTE */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                      Pilar 01
                    </span>
                    <Building2 className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Existe
                  </h3>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                    ¿A quién le estás pagando realmente?
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                    Verificamos la razón social de la empresa, su Cédula Fiscal SAT (RFC), su registro físico activo en el DENUE de INEGI, titularidad de dominios y línea de WhatsApp comercial.
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                    <span>Razón social y RFC validado ante SAT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                    <span>Establecimiento físico censado en INEGI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                    <span>Contrato de Adhesión PROFECO verificado</span>
                  </div>
                </div>
              </div>

              {/* Pillar 2: CUMPLE */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 sm:p-8 flex flex-col justify-between hover:border-emerald-500/50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                      Pilar 02 • El Denominador
                    </span>
                    <Percent className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Cumple
                  </h3>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-4">
                    ¿Reciben los compradores lo prometido?
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                    La métrica que nadie más muestra: <strong className="text-white">el denominador</strong>. Conectamos Tiendanube, Shopify y SPEI para certificar qué porcentaje de pedidos fueron invitados a opinar y cuántos incidentes ocurren por cada 1,000 ventas.
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-emerald-900/60 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Cobertura transparente de pedidos (&gt;90%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tasa de incidencias por 1,000 órdenes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Reseñas ponderadas por nivel de comprobante</span>
                  </div>
                </div>
              </div>

              {/* Pillar 3: RESUELVE */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 px-2.5 py-1 text-xs font-bold text-teal-400 ring-1 ring-inset ring-teal-500/20">
                      Pilar 03
                    </span>
                    <Scale className="h-6 w-6 text-teal-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Resuelve
                  </h3>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                    ¿Qué pasa cuando algo sale mal?
                  </p>
                  <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                    Un buen negocio no es el que nunca tiene fallas logísticas, sino el que responde rápido y cumple. Medimos resolución confirmada por el consumidor, tiempo de primera respuesta y tasa de reapertura.
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-teal-400" />
                    <span>Resolución confirmada por el comprador</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-teal-400" />
                    <span>SLA de respuesta en horas medido por sistema</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-teal-400" />
                    <span>Trazabilidad de reembolsos y compensaciones</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LIVE FEATURED MEXICAN PASSPORTS */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 border-b border-neutral-900" id="pasaportes-destacados">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Transparencia en Tiempo Real
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                  Pasaportes de Confianza Activos
                </h2>
                <p className="text-sm text-neutral-400 mt-1 max-w-xl">
                  Negocios mexicanos con órdenes conectadas, identidades SAT/DENUE validadas y monitoreo continuo de satisfacción.
                </p>
              </div>

              <Link
                href="/verificar"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>Explorar todo el directorio verificado</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Passports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredBusinesses.map((biz) => {
                const score = Number(biz.trust_score) || 0;
                const coverage = Number(biz.coverage_percentage) || 0;
                const issues = Number(biz.issues_per_thousand) || 0;
                const resolution = Number(biz.resolution_rate) || 0;

                return (
                  <Link
                    key={biz.slug}
                    href={`/b/${biz.slug}`}
                    className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:bg-neutral-900/90 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      {/* Top Bar: Brand, Category, Score Dial */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {biz.brand_name}
                            </h3>
                            {biz.verified_level === 'transparent_coverage' && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 p-1 text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                            {biz.legal_name || biz.category}
                          </p>
                          <span className="inline-block mt-2 text-[11px] font-medium text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                            {biz.category}
                          </span>
                        </div>

                        {/* Circular Score Badge */}
                        <div className="relative flex flex-col items-center justify-center h-14 w-14 rounded-full bg-neutral-950 border-2 border-emerald-500/80 shadow-md shadow-emerald-950/40 shrink-0">
                          <span className="text-base font-black text-emerald-400 leading-none">
                            {score}
                          </span>
                          <span className="text-[9px] font-semibold text-neutral-500 uppercase tracking-tighter">
                            Opinio
                          </span>
                        </div>
                      </div>

                      {/* Verified Identifiers Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-5 text-[10px]">
                        {biz.rfc && (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-neutral-300 font-mono">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            RFC: {biz.rfc}
                          </span>
                        )}
                        {biz.domain && (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-neutral-300">
                            <Store className="h-3 w-3 text-neutral-400" />
                            {biz.domain}
                          </span>
                        )}
                        {biz.whatsapp && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-emerald-300">
                            <Phone className="h-3 w-3 text-emerald-400" />
                            WhatsApp Verificado
                          </span>
                        )}
                      </div>

                      {/* Metrics 3-Col Bar */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-neutral-800/80 text-center mb-4">
                        <div>
                          <div className="text-xs font-bold text-white">
                            {coverage > 0 ? `${coverage}%` : 'N/D'}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            Cobertura
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {issues}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            Quejas/1k
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-400">
                            {resolution > 0 ? `${resolution}%` : '100%'}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            Resolución
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-emerald-400 group-hover:text-emerald-300 pt-1">
                      <span>Ver Pasaporte y Registro DENUE</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE VERIFICATION SIMULATOR */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-neutral-900/30 border-b border-neutral-900" id="simulador">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <TransferSimulator />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* WHY NOT TRUSTPILOT COMPARISON TABLE */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 border-b border-neutral-900" id="metodologia">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Diferenciador Radical
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Por qué México no necesita otro Trustpilot
              </h2>
              <p className="text-sm sm:text-base text-neutral-400">
                Trustpilot y Google Maps operan con opiniones abiertas sin comprobar si existió una compra ni conocer el volumen total de pedidos. Opinio construye la capa de verdad del comercio nacional.
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-md">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/80">
                    <th className="py-4 px-4 sm:px-6 text-neutral-400 font-semibold w-1/3">
                      Criterio de Confianza
                    </th>
                    <th className="py-4 px-4 sm:px-6 text-neutral-400 font-semibold w-1/3">
                      Plataformas Genéricas (Trustpilot / Google)
                    </th>
                    <th className="py-4 px-4 sm:px-6 text-emerald-400 font-bold w-1/3 bg-emerald-950/20">
                      Opinio.mx (Pasaporte de Confianza)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  <tr>
                    <td className="py-4 px-4 sm:px-6 font-medium text-white">
                      El Denominador (Métrica de Cobertura)
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-neutral-400">
                      <div className="flex items-center gap-2 text-red-400">
                        <X className="h-4 w-4 shrink-0" />
                        <span>Desconocido. Solo ven quién se queja o quién invita selectivamente.</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-emerald-950/10 text-neutral-200">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Auditado. Publica el % de órdenes conectadas invitadas (ej. 93.9%).</span>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 px-4 sm:px-6 font-medium text-white">
                      Identidad Legal Mexicana
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-neutral-400">
                      <div className="flex items-center gap-2 text-red-400">
                        <X className="h-4 w-4 shrink-0" />
                        <span>Nula. Cualquier persona crea una página con un correo y logo genérico.</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-emerald-950/10 text-neutral-200">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>SAT RFC + INEGI DENUE + Validación DNS y Meta Business WhatsApp.</span>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 px-4 sm:px-6 font-medium text-white">
                      Resolución de Reclamaciones
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-neutral-400">
                      <div className="flex items-center gap-2 text-red-400">
                        <X className="h-4 w-4 shrink-0" />
                        <span>Basta con que el comercio responda un mensaje público para marcar &quot;resuelto&quot;.</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-emerald-950/10 text-neutral-200">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Resolución confirmada obligatoriamente por el consumidor y SLA medido.</span>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 px-4 sm:px-6 font-medium text-white">
                      Integración Oficial PROFECO
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-neutral-400">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <X className="h-4 w-4 shrink-0" />
                        <span>Inexistente. No cruzan información con autoridades mexicanas.</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-emerald-950/10 text-neutral-200">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Cita pública de Contratos de Adhesión y sanciones del Buró Comercial.</span>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 px-4 sm:px-6 font-medium text-white">
                      Reputación Fuera de Marketplaces
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-neutral-400">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <X className="h-4 w-4 shrink-0" />
                        <span>Atrapada en Mercado Libre o Amazon sin portabilidad a tiendas directas.</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-emerald-950/10 text-neutral-200">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Portable para Shopify, Tiendanube, transferencias SPEI y ventas por WhatsApp.</span>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-4 px-4 sm:px-6 font-medium text-white">
                      Firewall Comercial
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-neutral-400">
                      <div className="flex items-center gap-2 text-red-400">
                        <X className="h-4 w-4 shrink-0" />
                        <span>Pagar planes premium permite ocultar opiniones negativas o destacar artificialmente.</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-emerald-950/10 text-neutral-200">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Inviolable. Pagar suscripción NO altera el score ni elimina reseñas legítimas.</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* AMVO 2026 STATS & MEXICAN COMMERCE REALITIES */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-neutral-900/30 border-b border-neutral-900" id="estadisticas">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Evidencia de Mercado
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                La Realidad del Comercio Electrónico en México
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Datos del Estudio de Venta Online México 2026 elaborado por la Asociación Mexicana de Venta Online (AMVO).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-xs font-medium">Volumen Total 2025</span>
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">$941 MM</div>
                <p className="text-xs text-neutral-400 mt-2">
                  Millones de pesos mexicanos en comercio minorista digital, con crecimiento del <strong className="text-emerald-400">+19.2% anual</strong>.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-xs font-medium">Compradores Digitales</span>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">77.2 M</div>
                <p className="text-xs text-neutral-400 mt-2">
                  Mexicanos que compran recurrentemente en línea en canales directos, redes sociales y aplicaciones.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-xs font-medium">Ventas por WhatsApp</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">48%</div>
                <p className="text-xs text-neutral-400 mt-2">
                  De los compradores interactúan o cierran compras directamente vía WhatsApp o redes sociales sin protección de marketplace.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
                <div className="flex items-center justify-between text-neutral-400 mb-2">
                  <span className="text-xs font-medium">Freno a la Conversión</span>
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">62%</div>
                <p className="text-xs text-neutral-400 mt-2">
                  De carritos abandonados ocurren por desconfianza en el método de pago o temor a fraude comercial.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CALL TO ACTION FOR MERCHANTS */}
        {/* ========================================================================= */}
        <section className="py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-emerald-950/20 to-neutral-950 -z-10" />
          <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ¿Vendes por tienda en línea o WhatsApp?
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
              Deja de perder ventas ante compradores desconfiados. Conecta tu tienda en 3 minutos, audita tu cobertura y obtén el sello dinámico que multiplica tu tasa de conversión.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/merchant"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-neutral-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-950/60"
              >
                <span>Demostrar mi reputación con Opinio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/verificar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-850 hover:text-white transition-colors"
              >
                <Search className="h-4 w-4 text-neutral-400" />
                <span>Consultar el Directorio</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
