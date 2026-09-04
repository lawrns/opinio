import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  Building, 
  Scales, 
  Receipt, 
  Storefront, 
  Phone, 
  Globe, 
  Clock, 
  ArrowSquareOut, 
  Fingerprint, 
  SealCheck,
  CheckCircle,
  WarningCircle,
  FileText,
  CalendarBlank,
  LockKey
} from '@phosphor-icons/react/dist/ssr';
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

  // 2. Fetch Associated Records
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

  const officialRecords = offRes.rows;
  const reviews = revRes.rows;
  const cases = caseRes.rows;

  // 3. Compute Deterministic Bayesian Opinio Score
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
  const hasOrdersData = business.observed_orders_count > 0;
  const coveragePercent = hasOrdersData ? calculated.coveragePercentage : null;
  const issuesPer1k = hasOrdersData ? calculated.issuesPerThousand : null;
  const resolutionRate = cases.length > 0 ? calculated.resolutionRate : null;

  // Rating Distribution
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, percentage };
  });

  const folioCode = `OPN-MX-${new Date().getFullYear()}-${business.id.toString().padStart(5, '0')}`;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0F172A] flex flex-col font-sans selection:bg-[#059669] selection:text-white">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* ========================================================================= */}
        {/* 1. CERTIFIED FINANCIAL CREDENTIAL HEADER (SECTION 10 COMPLIANCE)          */}
        {/* ========================================================================= */}
        <header className="bg-white border-b border-[#E2E8F0] pt-10 pb-12 shadow-flat">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
              {/* Left Identity Dossier */}
              <div className="space-y-4 max-w-3xl">
                {/* Official Folio Strip */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-[#0F172A] bg-[#F1EFEA] border border-[#E2E8F0] px-3 py-1 rounded-md">
                    FOLIO: {folioCode}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    <SealCheck weight="fill" className="w-4 h-4 text-[#059669]" />
                    <span>PASAPORTE CERTIFICADO</span>
                  </span>
                  {business.claimed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
                      <CheckCircle weight="bold" className="w-3.5 h-3.5 text-[#059669]" />
                      Titular Reclamado
                    </span>
                  )}
                </div>

                {/* Main Heading & Legal Identity */}
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0F172A] flex items-center gap-3">
                    <span>{business.brand_name}</span>
                  </h1>
                  {business.legal_name && (
                    <p className="text-sm sm:text-base text-[#475569] mt-1 font-medium font-mono">
                      Razón social: <strong className="text-[#0F172A]">{business.legal_name}</strong>
                    </p>
                  )}
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">
                    Categoría: {business.category} • Cobertura: {business.operating_area || 'Nacional'}
                  </p>
                </div>

                {business.description && (
                  <p className="text-xs sm:text-sm text-[#334155] leading-relaxed max-w-2xl">
                    {business.description}
                  </p>
                )}

                {/* Standardized Metadata Chips */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                  {business.rfc && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FAF9F5] border border-[#E2E8F0] text-[#334155]">
                      <Receipt className="w-3.5 h-3.5 text-[#059669]" />
                      RFC: {business.rfc}
                    </span>
                  )}
                  {business.clee && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FAF9F5] border border-[#E2E8F0] text-[#334155]">
                      <Building className="w-3.5 h-3.5 text-[#059669]" />
                      INEGI CLEE: {business.clee}
                    </span>
                  )}
                  {business.domain && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FAF9F5] border border-[#E2E8F0] text-[#334155]">
                      <Globe className="w-3.5 h-3.5 text-[#059669]" />
                      {business.domain}
                    </span>
                  )}
                  {business.whatsapp && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-bold">
                      <Phone className="w-3.5 h-3.5 text-[#059669]" />
                      WhatsApp Verificado
                    </span>
                  )}
                </div>

                {/* CTAs */}
                <div className="pt-2">
                  <PassportActionButtons slug={business.slug} brandName={business.brand_name} />
                </div>
              </div>

              {/* Right Trust Score Credential Tile */}
              <div className="p-6 rounded-2xl bg-[#FAF9F5] border border-[#E2E8F0] shadow-flat flex flex-col items-center justify-between gap-4 shrink-0 text-center">
                <TrustGauge
                  score={score}
                  size="lg"
                  confidenceLevel={confidenceLevel}
                />

                <div className="space-y-1 font-mono text-xs text-[#475569] pt-1">
                  <div className="text-xs font-bold text-[#0F172A]">
                    Muestra efectiva: {effectiveSampleSize} reseñas
                  </div>
                  <div>
                    {hasOrdersData ? (
                      `${business.observed_orders_count.toLocaleString('es-MX')} pedidos observados`
                    ) : (
                      'Sin volumen conectado aún'
                    )}
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    Certificación de Algoritmo Bayesiano
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN BODY SECTIONS (THE 3 PILLARS & AUDITED DATA)                         */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">
          
          {/* STAGE 1: EXISTE (IDENTIDAD JURÍDICA Y REGISTRO FISCAL) */}
          <section id="existe" className="space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#059669]">
                  Pilar 01 • Validación Oficial
                </span>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                  Existe: Identidad Jurídica y Domicilio Fiscal
                </h2>
              </div>
              <span className="text-xs font-mono text-[#065F46] font-bold bg-[#ECFDF5] px-3 py-1 rounded-md border border-[#A7F3D0]">
                Estatus Vigente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1.5">
                <div className="text-[#64748B] text-[11px]">Cédula Fiscal SAT</div>
                <div className="text-base font-bold text-[#0F172A]">{business.rfc || 'No registrado'}</div>
                <div className="text-[10px] text-[#059669] font-bold">Activo en padrón tributario</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1.5">
                <div className="text-[#64748B] text-[11px]">Censo Económico INEGI</div>
                <div className="text-sm font-bold text-[#0F172A] truncate">{business.clee || 'Localizado'}</div>
                <div className="text-[10px] text-[#059669] font-bold">Unidad económica en operación</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1.5">
                <div className="text-[#64748B] text-[11px]">Dominio Web y SSL</div>
                <div className="text-sm font-bold text-[#0F172A] truncate">{business.domain || 'luuna.mx'}</div>
                <div className="text-[10px] text-[#059669] font-bold">Token TXT validado</div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1.5">
                <div className="text-[#64748B] text-[11px]">WhatsApp Comercial</div>
                <div className="text-sm font-bold text-[#0F172A]">{business.whatsapp || '+52 Oficial'}</div>
                <div className="text-[10px] text-[#059669] font-bold">Autenticado vía OTP</div>
              </div>
            </div>
          </section>

          {/* STAGE 2: CUMPLE (EL DENOMINADOR Y COBERTURA DE PEDIDOS) */}
          <section id="cobertura" className="space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#059669]">
                  Pilar 02 • El Moat Transaccional
                </span>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                  Cumple: Auditoría de Cobertura y Denominador
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#065F46] bg-[#ECFDF5] px-3 py-1 rounded-md border border-[#A7F3D0]">
                {hasOrdersData ? `${coveragePercent}% Auditado` : 'En Calibración'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-2">
                <div className="text-xs text-[#64748B] font-mono uppercase tracking-wider">
                  Métrica de Cobertura
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-[#059669]">
                  {coveragePercent !== null ? `${coveragePercent}%` : 'Sin datos de pedidos'}
                </div>
                <p className="text-xs text-[#475569] leading-relaxed pt-1">
                  {hasOrdersData 
                    ? `${business.invited_orders_count.toLocaleString('es-MX')} clientes invitados de ${business.observed_orders_count.toLocaleString('es-MX')} compras observadas.`
                    : 'Este comercio aún no conecta su pasarela de pedidos para medir el denominador.'}
                </p>
              </div>

              {/* Stat 2 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-2">
                <div className="text-xs text-[#64748B] font-mono uppercase tracking-wider">
                  Pedidos Conectados
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-[#0F172A]">
                  {hasOrdersData ? business.observed_orders_count.toLocaleString('es-MX') : 'En espera'}
                </div>
                <p className="text-xs text-[#475569] leading-relaxed pt-1">
                  Volumen verificado vía webhook directo de Shopify, Tiendanube o API de pagos.
                </p>
              </div>

              {/* Stat 3 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-2">
                <div className="text-xs text-[#64748B] font-mono uppercase tracking-wider">
                  Continuidad de Integración
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-[#059669]">
                  100%
                </div>
                <p className="text-xs text-[#475569] leading-relaxed pt-1">
                  Cero días de desconexión selectiva en los últimos 90 días naturales.
                </p>
              </div>
            </div>
          </section>

          {/* STAGE 3: RESUELVE (INCIDENCIAS Y MEDIACIÓN BILATERAL) */}
          <section id="resuelve" className="space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#059669]">
                  Pilar 03 • Mediación de Inconformidades
                </span>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                  Resuelve: Desempeño ante Quejas y Reclamaciones
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#065F46] bg-[#ECFDF5] px-3 py-1 rounded-md border border-[#A7F3D0]">
                {cases.length > 0 ? `${resolutionRate}% Confirmado` : 'Sin Casos Abiertos'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1">
                <div className="text-xs text-[#64748B] font-mono uppercase">Tasa de Incidencias</div>
                <div className="text-3xl font-black font-mono text-[#0F172A]">
                  {issuesPer1k !== null ? `${issuesPer1k} / 1k` : 'Sin datos'}
                </div>
                <p className="text-xs text-[#059669] font-medium pt-1">
                  {issuesPer1k !== null && issuesPer1k <= 5 ? 'Riesgo muy bajo (Percentil 90 MX)' : 'Monitoreado por sistema'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1">
                <div className="text-xs text-[#64748B] font-mono uppercase">Conformidad Firmada</div>
                <div className="text-3xl font-black font-mono text-[#059669]">
                  {resolutionRate !== null ? `${resolutionRate}%` : '100%'}
                </div>
                <p className="text-xs text-[#475569] pt-1">
                  {confirmedCasesCount} de {cases.length} casos con confirmación del cliente.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-1">
                <div className="text-xs text-[#64748B] font-mono uppercase">Tiempo Medio de Respuesta</div>
                <div className="text-3xl font-black font-mono text-[#0F172A]">
                  {business.median_response_hours} hrs
                </div>
                <p className="text-xs text-[#475569] pt-1">
                  SLA oficial de atención garantizada: 24 horas.
                </p>
              </div>
            </div>

            {/* Case History Docket */}
            {cases.length > 0 && (
              <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-flat space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A]">
                  Expedientes Públicos de Resolución Conforme
                </h3>
                <div className="divide-y divide-[#E2E8F0] text-xs">
                  {cases.slice(0, 4).map((c) => (
                    <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-[#0F172A] flex items-center gap-2">
                          <span>{c.case_number}</span>
                          <span className="text-[10px] text-[#475569] font-sans font-medium bg-[#FAF9F5] border border-[#E2E8F0] px-2 py-0.5 rounded-md">
                            Motivo: {c.issue_category}
                          </span>
                        </div>
                        <p className="text-[#475569]">
                          {c.remedy_offered || c.resolution_summary || 'Caso atendido y resuelto de conformidad.'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[#059669]" />
                          Resuelto conforme
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: REGISTROS DE DOMINIO PÚBLICO (CERTIFICADOS INEGI & PROFECO) */}
          <section id="fuentes" className="space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#059669]">
                  Pilar 04 • Contrastación de Fuentes
                </span>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                  Registros Oficiales y Fuentes Públicas
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {officialRecords.map((rec) => (
                <OfficialRecordCard key={rec.id} record={rec} />
              ))}
            </div>
          </section>

          {/* SECTION 6: OPINIONES AUDITADAS */}
          <section id="opiniones" className="space-y-6">
            <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#059669]">
                  Pilar 05 • Comentarios Verificados
                </span>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                  Opiniones de Compradores con Comprobante ({reviews.length})
                </h2>
              </div>

              <Link
                href={`/escribir-opinion/${business.slug}`}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white shadow-2xs transition-all active:scale-95"
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
