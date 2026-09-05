import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Building, Receipt, Phone, Globe, SealCheck, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import { PassportReviewsList, ReviewItem } from '@/components/passport/PassportReviewsList';
import { StarRating } from '@/components/StarRating';
import { PassportActionButtons } from '@/components/passport/PassportActionButtons';
import { TrustGauge } from '@/components/passport/TrustGauge';
import { OfficialRecordCard } from '@/components/passport/OfficialRecordCard';
import { query } from '@/lib/db';

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
       LEFT JOIN LATERAL (
         SELECT responder_name, response_text, created_at
         FROM review_responses
         WHERE review_id = r.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       ) rr ON true
       WHERE r.business_id = $1 AND r.status = 'published'
       ORDER BY r.created_at DESC, r.id DESC`,
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
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : null;

  const score = Number(business.trust_score) || 0;
  const confidenceLevel = business.confidence_level;
  const effectiveSampleSize = Number(business.effective_reviews_count) || 0;
  const hasScore = effectiveSampleSize > 0;
  const hasOrdersData = business.observed_orders_count > 0;
  const coveragePercent = hasOrdersData ? Math.round(business.invited_orders_count / business.observed_orders_count * 1000) / 10 : null;
  const issuesPer1k = hasOrdersData ? Math.round(cases.length / business.observed_orders_count * 10000) / 10 : null;
  const confirmedCasesCount = cases.filter((item) => item.is_consumer_confirmed).length;
  const resolutionRate = cases.length > 0 ? Math.round(confirmedCasesCount / cases.length * 1000) / 10 : null;
  const identityStatus = (identifier: string | null) => {
    if (!identifier) return 'Sin información disponible';
    const identity = idRes.rows.find((item) => item.identifier === identifier);
    return identity?.status === 'verified' ? 'Identificador verificado' : 'Dato registrado; consulta la fuente';
  };
  const issueLabels: Record<string, string> = { delay: 'Retraso de entrega', damaged_goods: 'Producto dañado', wrong_item: 'Artículo equivocado', refund_pending: 'Reembolso pendiente', no_response: 'Falta de respuesta' };

  const folioCode = `OPN-MX-${new Date().getFullYear()}-${business.id.toString().padStart(5, '0')}`;

  return (
    <div className="min-h-screen bg-[var(--op-canvas)] text-[var(--op-ink-primary)] flex flex-col font-sans selection:bg-[var(--op-verified-ink)] selection:text-[var(--op-sheet)]">
      <Navbar />

      <main id="contenido" tabIndex={-1} className="flex-1 pb-20">
        {/* ========================================================================= */}
        {/* 1. CERTIFIED FINANCIAL CREDENTIAL HEADER (SECTION 10 COMPLIANCE)          */}
        {/* ========================================================================= */}
        <header className="bg-[var(--op-sheet)] border-b border-[var(--op-border-hairline)] pt-10 pb-12 shadow-flat">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
              {/* Left Identity Dossier */}
              <div className="space-y-4 max-w-3xl">
                {/* Official Folio Strip */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-[var(--op-ink-primary)] bg-[var(--op-shaded)] border border-[var(--op-border-hairline)] px-3 py-1 rounded-md">
                    FOLIO: {folioCode}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)] border border-[var(--op-verified-border)]">
                    <SealCheck weight="fill" className="w-4 h-4 text-[var(--op-verified-ink)]" />
                    <span>PASAPORTE DE CONFIANZA</span>
                  </span>
                  {business.claimed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold bg-[var(--op-canvas)] text-[var(--op-ink-secondary)] border border-[var(--op-border-hairline)]">
                      <CheckCircle weight="bold" className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                      Perfil reclamado
                    </span>
                  )}
                </div>

                {/* Main Heading & Legal Identity */}
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--op-ink-primary)] flex items-center gap-3">
                    <BrandLogo name={business.brand_name} src={business.logo_url} category={business.category} sizeClass="size-14 sm:size-16" />
                    <span>{business.brand_name}</span>
                  </h1>
                  {business.legal_name && (
                    <p className="text-sm sm:text-base text-[var(--op-ink-secondary)] mt-1 font-medium font-mono">
                      Razón social: <strong className="text-[var(--op-ink-primary)]">{business.legal_name}</strong>
                    </p>
                  )}
                  <p className="text-xs text-[var(--op-ink-muted)] font-mono mt-0.5">
                    Categoría: {business.category} • Cobertura: {business.operating_area || 'No declarada'}
                  </p>
                </div>

                <a href="#opiniones" className="inline-flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--op-action-border)] bg-[var(--op-action-tint)] px-4 py-3 text-sm text-[var(--op-action-ink)]">
                  {averageRating !== null ? <><StarRating rating={averageRating} size="sm" /><span className="font-semibold">{averageRating.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5</span><span className="underline underline-offset-4">{reviews.length.toLocaleString('es-MX')} {reviews.length === 1 ? 'opinión' : 'opiniones'}</span></> : <span>Este negocio todavía no tiene opiniones</span>}
                </a>

                {business.description && (
                  <p className="text-sm text-[var(--op-ink-secondary)] leading-relaxed max-w-2xl">
                    {business.description}
                  </p>
                )}

                {/* Standardized Metadata Chips */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                  {business.rfc && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] text-[var(--op-ink-secondary)]">
                      <Receipt className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                      RFC: {business.rfc}
                    </span>
                  )}
                  {business.clee && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] text-[var(--op-ink-secondary)]">
                      <Building className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                      INEGI CLEE: {business.clee}
                    </span>
                  )}
                  {business.domain && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] text-[var(--op-ink-secondary)]">
                      <Globe className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                      {business.domain}
                    </span>
                  )}
                  {business.whatsapp && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--op-verified-tint)] border border-[var(--op-verified-border)] text-[var(--op-verified-ink)] font-bold">
                      <Phone className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                      WhatsApp registrado
                    </span>
                  )}
                </div>

                {/* CTAs */}
                <div className="pt-2">
                  <PassportActionButtons slug={business.slug} brandName={business.brand_name} />
                </div>
              </div>

              {/* Right Trust Score Credential Tile */}
              <div className="p-6 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] shadow-flat flex flex-col items-center justify-between gap-4 shrink-0 text-center">
                <TrustGauge
                  score={hasScore ? score : null}
                  size="lg"
                  confidenceLevel={confidenceLevel}
                />

                <div className="space-y-1 font-mono text-xs text-[var(--op-ink-secondary)] pt-1">
                  <div className="text-xs font-bold text-[var(--op-ink-primary)]">
                    Muestra efectiva: {effectiveSampleSize} reseñas
                  </div>
                  <div>
                    {hasOrdersData ? (
                      `${business.observed_orders_count.toLocaleString('es-MX')} pedidos observados`
                    ) : (
                      'Sin volumen conectado aún'
                    )}
                  </div>
                  <div className="text-xs text-[var(--op-ink-muted)]">
                    Calificación Opinio · Escala de 0 a 100
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Secciones del pasaporte" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pt-6 sm:px-6 lg:px-8">{[['existe', 'Identidad'], ['cobertura', 'Pedidos'], ['resuelve', 'Casos'], ['fuentes', 'Fuentes'], ['opiniones', 'Opiniones']].map(([id, label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--op-border-strong)] bg-[var(--op-sheet)] px-4 text-sm font-medium">{label}</a>)}</nav>
        {/* ========================================================================= */}
        {/* MAIN BODY SECTIONS (THE 3 PILLARS & AUDITED DATA)                         */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">

          {/* STAGE 1: EXISTE (IDENTIDAD JURÍDICA Y REGISTRO FISCAL) */}
          <section className="scroll-mt-28 space-y-6" id="existe">
            <div className="border-b border-[var(--op-border-hairline)] pb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-verified-ink)]">
                  01 · Identidad
                </span>
                <h2 className="text-2xl font-black text-[var(--op-ink-primary)] tracking-tight mt-0.5">
                  Identidad del negocio
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--op-verified-ink)] font-bold bg-[var(--op-verified-tint)] px-3 py-1 rounded-md border border-[var(--op-verified-border)]">
                Datos disponibles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">Cédula Fiscal SAT</div>
                <div className="break-words text-base font-bold text-[var(--op-ink-primary)]">{business.rfc || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{identityStatus(business.rfc)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">Censo Económico INEGI</div>
                <div className="break-words text-sm font-bold text-[var(--op-ink-primary)]">{business.clee || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{identityStatus(business.clee)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">Sitio web</div>
                <div className="break-words text-sm font-bold text-[var(--op-ink-primary)]">{business.domain || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{identityStatus(business.domain)}</div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">WhatsApp Comercial</div>
                <div className="text-sm font-bold text-[var(--op-ink-primary)]">{business.whatsapp || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{identityStatus(business.whatsapp)}</div>
              </div>
            </div>
          </section>

          {/* STAGE 2: CUMPLE (EL DENOMINADOR Y COBERTURA DE PEDIDOS) */}
          <section className="scroll-mt-28 space-y-6" id="cobertura">
            <div className="border-b border-[var(--op-border-hairline)] pb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-verified-ink)]">
                  02 · Experiencia de compra
                </span>
                <h2 className="text-2xl font-black text-[var(--op-ink-primary)] tracking-tight mt-0.5">
                  Cobertura de pedidos
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--op-verified-ink)] bg-[var(--op-verified-tint)] px-3 py-1 rounded-md border border-[var(--op-verified-border)]">
                {hasOrdersData ? `${coveragePercent}% con invitación` : 'Sin pedidos conectados'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1 */}
              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-2">
                <div className="text-xs text-[var(--op-ink-muted)] font-mono uppercase tracking-wider">
                  Pedidos con invitación
                </div>
                <div className="break-words text-2xl sm:text-2xl font-black font-mono text-[var(--op-verified-ink)]">
                  {coveragePercent !== null ? `${coveragePercent}%` : 'Sin datos de pedidos'}
                </div>
                <p className="text-xs text-[var(--op-ink-secondary)] leading-relaxed pt-1">
                  {hasOrdersData
                    ? `${business.invited_orders_count.toLocaleString('es-MX')} clientes invitados de ${business.observed_orders_count.toLocaleString('es-MX')} compras observadas.`
                    : 'Este comercio aún no conecta su pasarela de pedidos para medir el denominador.'}
                </p>
              </div>

              {/* Stat 2 */}
              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-2">
                <div className="text-xs text-[var(--op-ink-muted)] font-mono uppercase tracking-wider">
                  Pedidos Conectados
                </div>
                <div className="break-words text-2xl sm:text-2xl font-black font-mono text-[var(--op-ink-primary)]">
                  {hasOrdersData ? business.observed_orders_count.toLocaleString('es-MX') : 'En espera'}
                </div>
                <p className="text-xs text-[var(--op-ink-secondary)] leading-relaxed pt-1">
                  Volumen de pedidos registrado en Opinio. No representa necesariamente todas las ventas del negocio.
                </p>
              </div>

              {/* Stat 3 */}
              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-2">
                <div className="text-xs text-[var(--op-ink-muted)] font-mono uppercase tracking-wider">
                  Opiniones publicadas
                </div>
                <div className="break-words text-2xl sm:text-2xl font-black font-mono text-[var(--op-verified-ink)]">
                  {reviews.length.toLocaleString('es-MX')}
                </div>
                <p className="text-xs text-[var(--op-ink-secondary)] leading-relaxed pt-1">
                  Consulta el tipo de comprobante disponible en cada opinión.
                </p>
              </div>
            </div>
          </section>

          {/* STAGE 3: RESUELVE (INCIDENCIAS Y MEDIACIÓN BILATERAL) */}
          <section className="scroll-mt-28 space-y-6" id="resuelve">
            <div className="border-b border-[var(--op-border-hairline)] pb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-verified-ink)]">
                  03 · Atención a problemas
                </span>
                <h2 className="text-2xl font-black text-[var(--op-ink-primary)] tracking-tight mt-0.5">
                  Cómo responde ante un problema
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--op-verified-ink)] bg-[var(--op-verified-tint)] px-3 py-1 rounded-md border border-[var(--op-verified-border)]">
                {cases.length > 0 ? `${resolutionRate}% Confirmado` : 'Sin casos registrados'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1">
                <div className="text-xs text-[var(--op-ink-muted)] font-mono uppercase">Tasa de Incidencias</div>
                <div className="text-2xl font-black font-mono text-[var(--op-ink-primary)]">
                  {issuesPer1k !== null ? `${issuesPer1k} / 1k` : 'Sin datos'}
                </div>
                <p className="text-xs text-[var(--op-verified-ink)] font-medium pt-1">
                  Casos registrados por cada mil pedidos observados.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1">
                <div className="text-xs text-[var(--op-ink-muted)] font-mono uppercase">Resolución confirmada</div>
                <div className="text-2xl font-black font-mono text-[var(--op-verified-ink)]">
                  {resolutionRate !== null ? `${resolutionRate}%` : 'Sin casos'}
                </div>
                <p className="text-xs text-[var(--op-ink-secondary)] pt-1">
                  {confirmedCasesCount} de {cases.length} casos con confirmación del cliente.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1">
                <div className="text-xs text-[var(--op-ink-muted)] font-mono uppercase">Tiempo Medio de Respuesta</div>
                <div className="break-words text-2xl font-black font-mono text-[var(--op-ink-primary)]">
                  {Number(business.median_response_hours) > 0 ? `${Number(business.median_response_hours)} hrs` : 'Sin datos'}
                </div>
                <p className="text-xs text-[var(--op-ink-secondary)] pt-1">
                  Tiempo de respuesta registrado; no constituye una garantía.
                </p>
              </div>
            </div>

            {/* Case History Docket */}
            {cases.length > 0 && (
              <div className="p-6 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-ink-primary)]">
                  Historial de casos
                </h3>
                <div className="divide-y divide-[var(--op-border-hairline)] text-xs">
                  {cases.slice(0, 4).map((c) => (
                    <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-[var(--op-ink-primary)] flex items-center gap-2">
                          <span>{c.case_number}</span>
                          <span className="text-xs text-[var(--op-ink-secondary)] font-sans font-medium bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-2 py-0.5 rounded-md">
                            Motivo: {issueLabels[c.issue_category] || c.issue_category}
                          </span>
                        </div>
                        <p className="text-[var(--op-ink-secondary)]">
                          {c.remedy_offered || c.resolution_summary || 'Sin solución registrada todavía.'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--op-verified-ink)] bg-[var(--op-verified-tint)] px-2.5 py-0.5 rounded-full border border-[var(--op-verified-border)]">
                          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                          {c.is_consumer_confirmed ? 'Resolución confirmada' : 'Sin confirmación del comprador'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 5: REGISTROS DE DOMINIO PÚBLICO (CERTIFICADOS INEGI & PROFECO) */}
          <section className="scroll-mt-28 space-y-6" id="fuentes">
            <div className="border-b border-[var(--op-border-hairline)] pb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-verified-ink)]">
                  04 · Fuentes
                </span>
                <h2 className="text-2xl font-black text-[var(--op-ink-primary)] tracking-tight mt-0.5">
                  Registros y fuentes públicas
                </h2>
              </div>
            </div>

            {officialRecords.length === 0 && <p className="rounded-xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 text-sm text-[var(--op-ink-secondary)]">Este perfil todavía no tiene fuentes públicas vinculadas.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {officialRecords.map((rec) => (
                <OfficialRecordCard key={rec.id} record={rec} />
              ))}
            </div>
          </section>

          {/* SECTION 6: OPINIONES AUDITADAS */}
          <section className="scroll-mt-28 space-y-6" id="opiniones">
            <div className="border-b border-[var(--op-border-hairline)] pb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-verified-ink)]">
                  05 · Opiniones
                </span>
                <h2 className="text-2xl font-black text-[var(--op-ink-primary)] tracking-tight mt-0.5">
                  Opiniones de compradores ({reviews.length})
                </h2>
              </div>

              <Link
                href={`/escribir-opinion/${business.slug}`}
                className="inline-flex min-h-11 items-center px-5 py-2.5 rounded-full text-sm font-semibold bg-[var(--op-action-accent)] hover:bg-[var(--op-action-ink)] text-[var(--op-sheet)] shadow-2xs transition-colors"
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
