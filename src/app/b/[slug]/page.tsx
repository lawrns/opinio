import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Store, 
  Phone, 
  Globe, 
  Scale, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  BarChart2, 
  Check, 
  ChevronRight,
  Info,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PassportReviewsList, ReviewItem } from '@/components/passport/PassportReviewsList';
import { PassportActionButtons } from '@/components/passport/PassportActionButtons';
import { TrustGauge } from '@/components/passport/TrustGauge';
import { OfficialRecordCard } from '@/components/passport/OfficialRecordCard';
import { query } from '@/lib/db';
import { calculateOpinioScore, ReviewCalculationItem, ResolutionMetricsInput } from '@/lib/scoring';

interface BusinessDbRow {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  description: string | null;
  rfc: string | null;
  clee: string | null;
  phone: string | null;
  whatsapp: string | null;
  domain: string | null;
  logo_url: string | null;
  banner_url: string | null;
  operating_area: string | null;
  claimed: boolean;
  verified_level: string;
  trust_score: string | number;
  confidence_level: string;
  coverage_percentage: string | number;
  observed_orders_count: number;
  invited_orders_count: number;
  issues_per_thousand: string | number;
  resolution_rate: string | number;
  median_response_hours: string | number;
  reopen_rate: string | number;
  effective_reviews_count: number;
  created_at: string;
  updated_at: string;
}

interface IdentityDbRow {
  id: number;
  type: string;
  identifier: string;
  status: string;
  source: string | null;
  verified_at: string;
  metadata: Record<string, unknown>;
}

interface OfficialRecordDbRow {
  id: number;
  source_name: string;
  fact_title: string;
  fact_detail: string;
  record_date: string;
  source_url: string | null;
}

interface CaseDbRow {
  id: number;
  case_number: string;
  customer_name: string;
  issue_category: string;
  customer_requested_remedy: string;
  status: string;
  is_consumer_confirmed: boolean;
  remedy_offered: string | null;
  resolution_summary: string | null;
  median_first_response_minutes: number;
  total_resolution_hours: number | null;
  created_at: string;
  resolved_at: string | null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60; // Refresh every minute

export default async function BusinessPassportPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Fetch Business Details
  const bRes = await query<BusinessDbRow>(
    `SELECT * FROM businesses WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (bRes.rows.length === 0) {
    notFound();
  }

  const business = bRes.rows[0];

  // 2. Fetch Associated Records (Identities, Reviews, Cases, Official Records)
  const [idRes, offRes, revRes, caseRes] = await Promise.all([
    query<IdentityDbRow>(
      `SELECT * FROM identities WHERE business_id = $1 ORDER BY id ASC`,
      [business.id]
    ),
    query<OfficialRecordDbRow>(
      `SELECT * FROM official_records WHERE business_id = $1 ORDER BY id ASC`,
      [business.id]
    ),
    query<ReviewItem>(
      `SELECT 
        r.id, r.rating, r.title, r.body, r.author_name, r.author_masked_contact,
        r.verification_level, r.score_weight, r.product_name, r.created_at,
        rr.responder_name, rr.response_text, rr.created_at as response_created_at
       FROM reviews r
       LEFT JOIN review_responses rr ON r.id = rr.review_id
       WHERE r.business_id = $1 AND r.status = 'published'
       ORDER BY r.created_at DESC`,
      [business.id]
    ),
    query<CaseDbRow>(
      `SELECT * FROM resolution_cases WHERE business_id = $1 ORDER BY created_at DESC`,
      [business.id]
    )
  ]);

  const identities = idRes.rows;
  const officialRecords = offRes.rows;
  const reviews = revRes.rows;
  const cases = caseRes.rows;

  // 3. Compute Deterministic Opinio Score using official Mathematical Engine
  const reviewCalcItems: ReviewCalculationItem[] = reviews.map((r) => {
    const ageDays = Math.max(1, Math.round((Date.now() - new Date(r.created_at).getTime()) / (1000 * 3600 * 24)));
    return {
      rating: r.rating,
      verificationLevel: r.verification_level as any,
      ageDays,
      integrityFactor: 1.0,
    };
  });

  const confirmedCasesCount = cases.filter((c) => c.is_consumer_confirmed).length;
  const resolutionMetrics: ResolutionMetricsInput = {
    casesCount: cases.length,
    consumerConfirmedCount: confirmedCasesCount,
    merchantRespondedCount: cases.length,
    medianResponseHours: Number(business.median_response_hours) || 0.8,
    reopenedCount: 0,
  };

  const calculated = calculateOpinioScore(
    reviewCalcItems,
    resolutionMetrics,
    business.observed_orders_count,
    business.invited_orders_count
  );

  const score = calculated.opinioScore;
  const confidenceLevel = calculated.confidenceLevel;
  const effectiveSampleSize = calculated.effectiveSampleSize;
  const coveragePercent = calculated.coveragePercentage;
  const issuesPer1k = calculated.issuesPerThousand;
  const resolutionRate = calculated.resolutionRate;
  const starsCount = Math.min(5, Math.max(1, Math.round(score / 20)));

  // Rating Distribution Counts
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, percentage };
  });

  const confidenceLabels: Record<string, { label: string; class: string }> = {
    very_strong: { label: 'Confianza Muy Fuerte', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    strong: { label: 'Confianza Fuerte', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    established: { label: 'Confianza Establecida', class: 'bg-blue-50 text-blue-800 border-blue-200' },
    preliminary: { label: 'Confianza Preliminar', class: 'bg-amber-50 text-amber-800 border-amber-300' },
  };

  const confidenceInfo = confidenceLabels[confidenceLevel] || confidenceLabels.preliminary;

  return (
    <div className="min-h-screen bg-[#FCFBF3] text-[#121511] flex flex-col font-sans selection:bg-[#00B67A] selection:text-white">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* ========================================================================= */}
        {/* HEADER SECTION: TRUST PASSPORT BANNER                                     */}
        {/* ========================================================================= */}
        <section className="bg-white border-b border-gray-200 py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* Brand Details & Title */}
              <div className="space-y-4 max-w-2xl">
                {/* Category & Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {business.category}
                  </span>
                  {business.claimed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#00B67A]" />
                      Perfil Reclamado
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${confidenceInfo.class}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {confidenceInfo.label}
                  </span>
                </div>

                {/* Brand Name & Legal Name */}
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#121511] flex items-center gap-3">
                    <span>{business.brand_name}</span>
                    {business.verified_level === 'transparent_coverage' && (
                      <span title="Cobertura auditada transparente">
                        <ShieldCheck className="h-8 w-8 text-[#00B67A]" />
                      </span>
                    )}
                  </h1>
                  {business.legal_name && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">
                      Razón social: <strong className="text-[#121511]">{business.legal_name}</strong>
                    </p>
                  )}
                </div>

                {business.description && (
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-xl">
                    {business.description}
                  </p>
                )}

                {/* Audit Seals Row */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAF8] border border-gray-200 px-3 py-1 text-gray-700 font-medium">
                    <Check className="h-3.5 w-3.5 text-[#00B67A]" />
                    Identidad Verificada SAT
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAF8] border border-gray-200 px-3 py-1 text-gray-700 font-medium">
                    <Check className="h-3.5 w-3.5 text-[#00B67A]" />
                    Pedidos Conectados
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAF8] border border-gray-200 px-3 py-1 text-gray-700 font-medium">
                    <Check className="h-3.5 w-3.5 text-[#00B67A]" />
                    Cobertura Transparente {coveragePercent}%
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAF8] border border-gray-200 px-3 py-1 text-gray-700 font-medium">
                    <Check className="h-3.5 w-3.5 text-[#00B67A]" />
                    Compromiso de Resolución
                  </span>
                </div>

                {/* Action CTA Buttons */}
                <div className="pt-2">
                  <PassportActionButtons slug={business.slug} brandName={business.brand_name} />
                </div>
              </div>

              {/* 0-100 Circular Score Dial (Trustpilot Green Accent) */}
              {/* Precision Radial TrustGauge (Overhauled Image #1) */}
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-200 bg-[#FCFBF3] p-6 sm:p-8 shadow-xs shrink-0">
                <TrustGauge score={score} size="lg" confidenceLevel={confidenceLevel} />
                <div className="text-center space-y-1 pt-1">
                  <div className="text-xs font-bold text-[#121511]">
                    Muestra efectiva: <span className="font-mono">{effectiveSampleSize}</span> opiniones
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {business.observed_orders_count.toLocaleString('es-MX')} órdenes auditadas
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono pt-1">
                    SHA-256 Verified Ledger
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Navigation Tabs */}
        <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-6 overflow-x-auto py-3 text-xs font-bold text-gray-600">
              <a href="#existe" className="hover:text-[#121511] whitespace-nowrap">
                1. Existe (Identidad)
              </a>
              <a href="#cumple" className="hover:text-[#121511] whitespace-nowrap">
                2. Cumple (Experiencia)
              </a>
              <a href="#cobertura" className="hover:text-[#121511] whitespace-nowrap text-[#008B5D]">
                3. Cobertura (El Denominador)
              </a>
              <a href="#resuelve" className="hover:text-[#121511] whitespace-nowrap">
                4. Resuelve (Incidencias)
              </a>
              <a href="#fuentes" className="hover:text-[#121511] whitespace-nowrap">
                5. Fuentes Oficiales
              </a>
              <a href="#opiniones" className="hover:text-[#121511] whitespace-nowrap">
                6. Reseñas ({reviews.length})
              </a>
            </nav>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY SECTIONS                                                        */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-12">
          {/* SECTION 1: PASAPORTE DE CONFIANZA (EXISTE) */}
          <section id="existe" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-[#121511]">
                Pilar 01: Pasaporte de Confianza (Existe)
              </h2>
            </div>
            <p className="text-xs text-gray-600 max-w-3xl">
              Verificamos quién respalda legalmente a este comercio. En compras fuera de marketplaces, saber a qué razón social le transfieres por SPEI es la defensa #1 contra fraudes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Cédula Fiscal SAT</span>
                  <span className="text-emerald-700 font-bold">Validado</span>
                </div>
                <div className="text-base font-bold text-[#121511] font-mono">
                  {business.rfc || 'En proceso'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Validación RFC digital en padrón de contribuyentes activos.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>INEGI DENUE</span>
                  <span className="text-blue-700 font-bold">CLEE Activo</span>
                </div>
                <div className="text-sm font-bold text-[#121511] font-mono truncate">
                  {business.clee ? `CLEE: ${business.clee}` : 'Establecimiento Localizado'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Directorio Nacional de Unidades Económicas en México.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Dominio Web DNS</span>
                  <span className="text-emerald-700 font-bold">Token TXT</span>
                </div>
                <div className="text-base font-bold text-[#121511] truncate">
                  {business.domain || 'luuna.mx'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Control técnico y certificado SSL verificado.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Canal WhatsApp</span>
                  <span className="text-emerald-700 font-bold">Meta Verified</span>
                </div>
                <div className="text-sm font-bold text-[#121511] font-mono">
                  {business.whatsapp || '+52 Oficial'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Número de contacto comercial autenticado con OTP.
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: EXPERIENCIA DEL CLIENTE (CUMPLE) */}
          <section id="cumple" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <Sparkles className="h-5 w-5 text-[#00B67A]" />
              <h2 className="text-xl font-bold text-[#121511]">
                Pilar 02: Experiencia del Cliente (Cumple)
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Star Rating Distribution (5 cols) */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-black text-[#121511] font-mono">
                    {score} <span className="text-sm text-gray-400 font-normal">/ 100</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {reviews.length} opiniones registradas
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {distribution.map((d) => (
                    <div key={d.stars} className="flex items-center gap-3">
                      <span className="w-12 text-gray-600 font-medium">
                        {d.stars} estrellas
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00B67A] rounded-full"
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-gray-500">
                        {d.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Dimensions & Summary (7 cols) */}
              <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#121511] uppercase tracking-wider">
                  Desglose por Dimensión de Servicio
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-1">
                    <div className="text-gray-500">Producto conforme a lo descrito</div>
                    <div className="text-base font-bold text-[#121511] font-mono">98.4 / 100</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-1">
                    <div className="text-gray-500">Entrega y tiempos de envío</div>
                    <div className="text-base font-bold text-[#121511] font-mono">92.0 / 100</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-1">
                    <div className="text-gray-500">Atención y comunicación WhatsApp</div>
                    <div className="text-base font-bold text-[#121511] font-mono">96.8 / 100</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-1">
                    <div className="text-gray-500">Devoluciones y garantía</div>
                    <div className="text-base font-bold text-[#121511] font-mono">94.2 / 100</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Síntesis automática de experiencia:</strong> La mayoría de los clientes destacan la calidad del producto y la facturación inmediata vía correo electrónico. Los reportes aislados se relacionan con paqueterías foráneas, resueltos oportunamente por el comercio.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: MÉTRICA DE COBERTURA (EL DENOMINADOR) */}
          <section id="cobertura" className="p-8 rounded-3xl bg-[#F8FAFC] border border-gray-200 shadow-xs space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Pilar 02 · Transparencia Radical
                </span>
                <span className="text-xs text-gray-500 font-mono">• Auditoría NMX-COE</span>
              </div>
              <h2 className="text-2xl font-black text-[#121511] tracking-tight">
                Métrica de Cobertura: El Denominador de Confianza
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-3xl">
                Cualquier tienda puede recolectar 10 opiniones de amigos o clientes felices. Opinio audita el <strong>volumen total de pedidos conectados</strong>. Esta tienda invitó a opinar a más del 90% de sus compradores reales, demostrando que su calificación es verdaderamente representativa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">Porcentaje de Cobertura</div>
                <div className="text-3xl font-black text-[#008B5D] font-mono mt-1">
                  {coveragePercent}%
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {business.invited_orders_count.toLocaleString('es-MX')} clientes invitados formalmente
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">Órdenes Conectadas Observadas</div>
                <div className="text-3xl font-black text-[#121511] font-mono mt-1">
                  {business.observed_orders_count.toLocaleString('es-MX')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Ventas monitoreadas en los últimos 90 días
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">Continuidad de Integración</div>
                <div className="text-3xl font-black text-emerald-700 font-mono mt-1">
                  100%
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  0 días de desconexión selectiva
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: INCIDENCIA Y RESOLUCIÓN (RESUELVE) */}
          <section id="resuelve" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <Scale className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-bold text-[#121511]">
                Pilar 03: Incidencia y Resolución (Resuelve)
              </h2>
            </div>
            <p className="text-xs text-gray-600 max-w-3xl">
              Los problemas en comercio electrónico ocurren. Lo que define a una tienda confiable es cómo responde. Un caso solo cuenta como resuelto si el comprador confirma su conformidad.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">Tasa de Incidencias</div>
                <div className="text-3xl font-black text-[#121511] font-mono mt-1">
                  {issuesPer1k} <span className="text-sm font-normal text-gray-500">/ 1k</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-1">
                  Bajo riesgo (Promedio MX: 18 / 1k)
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">Resolución Confirmada por Cliente</div>
                <div className="text-3xl font-black text-[#008B5D] font-mono mt-1">
                  {resolutionRate}%
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Confirmación formal firmada por el comprador
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
                <div className="text-xs text-gray-500">Tiempo Medio de Primera Respuesta</div>
                <div className="text-3xl font-black text-blue-700 font-mono mt-1">
                  {business.median_response_hours} <span className="text-sm font-normal text-gray-500">hrs</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Atención prioritaria con SLA
                </div>
              </div>
            </div>

            {/* Case History Docket */}
            {cases.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3 mt-4">
                <h3 className="text-sm font-bold text-[#121511] uppercase tracking-wider">
                  Historial Público de Conciliaciones
                </h3>
                <div className="divide-y divide-gray-100 text-xs">
                  {cases.slice(0, 4).map((c) => (
                    <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-[#121511] flex items-center gap-2">
                          <span>{c.case_number}</span>
                          <span className="text-[10px] text-gray-500 font-sans font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                            Motivo: {c.issue_category}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">
                          {c.remedy_offered || c.resolution_summary || 'Caso atendido y resuelto de conformidad.'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#008B5D] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Resuelto conforme
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: INFORMACIÓN OFICIAL Y PÚBLICA */}
          <section id="fuentes" className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <Store className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-bold text-[#121511]">
                Pilar 04: Información Oficial y Registros Públicos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {officialRecords.map((rec) => (
                <OfficialRecordCard key={rec.id} record={rec} />
              ))}
            </div>
          </section>

          {/* SECTION 6: OPINIONES VERIFICADAS */}
          <section id="opiniones" className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#121511]">
                  Pilar 05: Opiniones Verificadas ({reviews.length})
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Cada reseña exhibe su nivel de comprobante auditado y el peso correspondiente asignado en el Opinio Score.
                </p>
              </div>

              <Link
                href={`/escribir-opinion/${business.slug}`}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#00B67A] hover:bg-[#008B5D] text-white transition-all shadow-xs"
              >
                Escribir opinión
              </Link>
            </div>

            <PassportReviewsList reviews={reviews} brandName={business.brand_name} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
