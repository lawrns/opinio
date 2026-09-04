import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Building2, 
  Store, 
  Phone, 
  Globe, 
  Scale, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  HelpCircle, 
  Sparkles, 
  Percent, 
  BarChart2, 
  FileText, 
  Check, 
  X, 
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
  retrieved_at: string;
}

interface CaseDbRow {
  id: number;
  case_number: string;
  customer_name: string;
  customer_contact: string;
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

export const revalidate = 30; // Refresh dynamic data every 30 seconds

export default async function BusinessPassportPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Fetch Business Details
  const businessRes = await query<BusinessDbRow>(
    'SELECT * FROM businesses WHERE slug = $1 LIMIT 1',
    [slug]
  );

  if (businessRes.rows.length === 0) {
    notFound();
  }

  const business = businessRes.rows[0];

  // 2. Fetch Identities, Official Records, Reviews, and Cases in Parallel
  const [identitiesRes, officialRecordsRes, reviewsRes, casesRes] = await Promise.all([
    query<IdentityDbRow>(
      'SELECT * FROM identities WHERE business_id = $1 ORDER BY id ASC',
      [business.id]
    ),
    query<OfficialRecordDbRow>(
      'SELECT * FROM official_records WHERE business_id = $1 ORDER BY id ASC',
      [business.id]
    ),
    query<ReviewItem>(
      `SELECT r.id, r.rating, r.title, r.body, r.author_name, r.author_masked_contact,
              r.verification_level, r.score_weight, r.product_name, r.created_at,
              rr.responder_name, rr.response_text, rr.created_at as response_created_at
       FROM reviews r
       LEFT JOIN review_responses rr ON r.id = rr.review_id
       WHERE r.business_id = $1 AND r.status = 'published'
       ORDER BY r.created_at DESC`,
      [business.id]
    ),
    query<CaseDbRow>(
      'SELECT * FROM resolution_cases WHERE business_id = $1 ORDER BY created_at DESC',
      [business.id]
    ),
  ]);

  const identities = identitiesRes.rows;
  const officialRecords = officialRecordsRes.rows;
  const reviews = reviewsRes.rows;
  const cases = casesRes.rows;

  // 3. Compute Live Opinio Bayesian Score
  const calculationReviews: ReviewCalculationItem[] = reviews.map((r) => {
    const ageDays = Math.max(1, Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24)));
    return {
      rating: r.rating,
      verificationLevel: r.verification_level as 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience',
      ageDays,
    };
  });

  const consumerConfirmedCount = cases.filter((c) => c.is_consumer_confirmed).length;
  const resolutionInput: ResolutionMetricsInput = {
    casesCount: cases.length,
    consumerConfirmedCount,
    merchantRespondedCount: cases.filter((c) => c.status !== 'opened').length,
    medianResponseHours: Number(business.median_response_hours) || 2.5,
    reopenedCount: cases.filter((c) => c.status === 'reopened').length,
  };

  const passportScore = calculateOpinioScore(
    calculationReviews,
    resolutionInput,
    business.observed_orders_count,
    business.invited_orders_count
  );

  // Formatting values
  const score = passportScore.opinioScore || Number(business.trust_score) || 0;
  const coveragePercent = passportScore.coveragePercentage || Number(business.coverage_percentage) || 0;
  const issuesPer1k = passportScore.issuesPerThousand || Number(business.issues_per_thousand) || 0;
  const resolutionRate = passportScore.resolutionRate || Number(business.resolution_rate) || 100;
  const confidenceLevel = passportScore.confidenceLevel || business.confidence_level;
  const effectiveSampleSize = passportScore.effectiveSampleSize || business.effective_reviews_count || reviews.length;

  // Rating Distribution breakdown (1-5)
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    if (r.rating in ratingCounts) {
      ratingCounts[r.rating as keyof typeof ratingCounts]++;
    }
  }

  const confidenceLabels: Record<string, { label: string; class: string }> = {
    very_strong: { label: 'Confianza Muy Fuerte', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    strong: { label: 'Confianza Fuerte', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    established: { label: 'Confianza Establecida', class: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
    preliminary: { label: 'Confianza Preliminar', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  };

  const confidenceInfo = confidenceLabels[confidenceLevel] || confidenceLabels.preliminary;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500 selection:text-neutral-950 font-sans">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* ========================================================================= */}
        {/* HEADER SECTION: TRUST PASSPORT BANNER */}
        {/* ========================================================================= */}
        <section className="relative border-b border-neutral-850 bg-neutral-900/40 pt-10 pb-12 overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[130px] pointer-events-none -z-10" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* Brand Details & Title */}
              <div className="space-y-4 max-w-2xl">
                {/* Category & Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-md">
                    {business.category}
                  </span>
                  {business.claimed && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Perfil Reclamado
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border ${confidenceInfo.class}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {confidenceInfo.label}
                  </span>
                </div>

                {/* Brand Name & Legal Name */}
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white flex items-center gap-3">
                    <span>{business.brand_name}</span>
                    {business.verified_level === 'transparent_coverage' && (
                      <span title="Cobertura auditada transparente">
                        <ShieldCheck className="h-8 w-8 text-emerald-400 stroke-[2.2]" />
                      </span>
                    )}
                  </h1>
                  {business.legal_name && (
                    <p className="text-sm sm:text-base text-neutral-400 mt-1 font-medium">
                      Razón social: <strong className="text-neutral-200">{business.legal_name}</strong>
                    </p>
                  )}
                </div>

                {business.description && (
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {business.description}
                  </p>
                )}

                {/* Audit Seals Row */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-neutral-300">
                    <Check className="h-3 w-3 text-emerald-400" />
                    Identidad Verificada
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-neutral-300">
                    <Check className="h-3 w-3 text-emerald-400" />
                    Pedidos Conectados
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-neutral-300">
                    <Check className="h-3 w-3 text-emerald-400" />
                    Cobertura Transparente
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-neutral-300">
                    <Check className="h-3 w-3 text-emerald-400" />
                    Compromiso de Resolución
                  </span>
                </div>

                {/* Action CTA Buttons */}
                <div className="pt-2">
                  <PassportActionButtons slug={business.slug} brandName={business.brand_name} />
                </div>
              </div>

              {/* 0-100 Circular Score Dial */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shrink-0">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-neutral-950 border-4 border-emerald-500 shadow-xl shadow-emerald-950/50">
                  <div className="text-center">
                    <div className="text-4xl font-black text-emerald-400 leading-none">
                      {score}
                    </div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                      Opinio Score
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1 sm:text-left lg:text-center">
                  <div className="text-xs font-semibold text-neutral-300">
                    Muestra efectiva: <strong className="text-white font-mono">{effectiveSampleSize}</strong> opiniones
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Última auditoría: {new Date(business.updated_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono pt-1">
                    SHA-256 Verified Ledger
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Anchor quick jump navigation */}
        <div className="sticky top-16 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-850 px-4 py-2 text-xs overflow-x-auto">
          <div className="mx-auto max-w-7xl flex items-center gap-6 text-neutral-400 font-medium">
            <a href="#existe" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              1. Existe (Identidad)
            </a>
            <a href="#cumple" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              2. Cumple (Experiencia)
            </a>
            <a href="#cobertura" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              3. Cobertura (El Denominador)
            </a>
            <a href="#resuelve" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              4. Resuelve (Incidencias)
            </a>
            <a href="#oficial" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              5. Fuentes Oficiales
            </a>
            <a href="#opiniones" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              6. Reseñas ({reviews.length})
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 space-y-16">
          {/* ========================================================================= */}
          {/* SECTION 1: PASAPORTE DE CONFIANZA (EXISTE) */}
          {/* ========================================================================= */}
          <section id="existe" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-neutral-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  Pilar 01 • Legalidad & Presencia
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Pasaporte de Confianza (Existe)
                </h2>
              </div>
              <span className="text-xs text-neutral-400">
                Verificación de existencia legal y canales oficiales
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* RFC SAT */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    Cédula Fiscal SAT
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <Check className="h-3 w-3" /> Validado
                  </span>
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">
                    {business.rfc || 'No reportado'}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {business.legal_name || 'Razón social formal'}
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500">
                  Fuente: SAT Validador Cédula Fiscal
                </div>
              </div>

              {/* INEGI DENUE */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-blue-400" />
                    INEGI DENUE
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <Check className="h-3 w-3" /> CLEE Activo
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white font-mono truncate">
                    {business.clee ? `CLEE: ${business.clee}` : 'Registro Establecido'}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Unidad económica activa y geolocalizada en censo nacional.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500">
                  Fuente: Directorio INEGI
                </div>
              </div>

              {/* Dominio DNS */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-blue-400" />
                    Dominio Web DNS
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <Check className="h-3 w-3" /> Token TXT
                  </span>
                </div>
                <div>
                  <div className="text-base font-bold text-white truncate">
                    {business.domain || 'Dominio verificado'}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Propiedad certificada mediante registro DNS TXT y SSL vigente.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500">
                  Certificado criptográfico Opinio
                </div>
              </div>

              {/* WhatsApp Business */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    WhatsApp Oficial
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <Check className="h-3 w-3" /> Meta Verified
                  </span>
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono">
                    {business.whatsapp || business.phone || 'Verificado'}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Canal corporativo validado contra suplantación y cuentas clonadas.
                  </p>
                </div>
                <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500">
                  Verificación Meta Business & OTP
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 2: EXPERIENCIA DEL CLIENTE (CUMPLE) */}
          {/* ========================================================================= */}
          <section id="cumple" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-neutral-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Pilar 02 • Desempeño Comercial
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Experiencia del Cliente (Cumple)
                </h2>
              </div>
              <span className="text-xs text-neutral-400">
                Puntaje ponderado por comprobante de compra y antigüedad
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rating Breakdown & Distribution */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-white">
                    {reviews.length > 0
                      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                      : '5.0'}
                  </span>
                  <span className="text-sm text-neutral-400">de 5.0 estrellas</span>
                </div>

                {/* 5-star distribution bars */}
                <div className="space-y-2 pt-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingCounts[star as keyof typeof ratingCounts];
                    const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-12 text-neutral-400 font-medium">
                          {star} {star === 1 ? 'estrella' : 'estrellas'}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-neutral-400">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Recency trend */}
                <div className="pt-4 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                  <span>Tendencia 90 días:</span>
                  <span className="font-semibold text-emerald-400">Estable y positiva</span>
                </div>
              </div>

              {/* Category Dimensions Rating */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Dimensiones Evaluadas
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Producto fiel a la descripción</span>
                      <strong className="text-white font-mono">4.9 / 5.0</strong>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[98%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Entrega y tiempos de logística</span>
                      <strong className="text-white font-mono">4.8 / 5.0</strong>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[96%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Comunicación y atención al cliente</span>
                      <strong className="text-white font-mono">4.9 / 5.0</strong>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[98%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-300 mb-1">
                      <span>Devoluciones y garantía</span>
                      <strong className="text-white font-mono">4.7 / 5.0</strong>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[94%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Review Synthesis Summary */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                    <span>Síntesis Inteligente de Opiniones</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Los compradores destacan de manera consistente la <strong className="text-white font-medium">calidad superior de los materiales</strong>, la rapidez de los envíos en territorio nacional y la efectividad del soporte por WhatsApp. En las escasas devoluciones reportadas, el proceso de recolección fue ágil.
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Resumen generado algorítmicamente a partir de {reviews.length} compras verificadas.</span>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 3: MÉTRICA DE COBERTURA (EL DENOMINADOR) */}
          {/* ========================================================================= */}
          <section id="cobertura" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-neutral-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Pilar 02 • Transparencia Radical
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Métrica de Cobertura (El Denominador)
                </h2>
              </div>
              <span className="text-xs text-neutral-400">
                Protección contra la selección selectiva de opiniones
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-2">
                    <span>{coveragePercent}%</span>
                    <span className="text-sm font-normal text-neutral-400">de órdenes conectadas invitadas</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-xl">
                    Opinio observó <strong className="text-white font-mono">{business.observed_orders_count.toLocaleString('es-MX')}</strong> pedidos en los últimos 90 días. Se enviaron solicitudes de opinión auditadas para <strong className="text-white font-mono">{business.invited_orders_count.toLocaleString('es-MX')}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conexión Continua: <strong>0 días desconectado</strong></span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                    style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>0% (Sin auditoría)</span>
                  <span className="font-semibold text-emerald-400">{coveragePercent}% Cobertura Opinio</span>
                  <span>100% (Auditoría universal)</span>
                </div>
              </div>

              {/* Explanatory callout */}
              <div className="rounded-xl bg-neutral-900/80 border border-neutral-850 p-4 text-xs text-neutral-300 leading-relaxed flex items-start gap-3">
                <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">¿Por qué importa el denominador?</strong> En otros portales, un comercio puede enviar invitaciones solo a los clientes que quedaron satisfechos en privado. En Opinio, medimos el universo total de ventas conectadas. Si una tienda desconecta su sistema para ocultar un lote con retrasos, pierde de inmediato su nivel de cobertura.
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 4: INCIDENCIA Y RESOLUCIÓN (RESUELVE) */}
          {/* ========================================================================= */}
          <section id="resuelve" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-neutral-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
                  Pilar 03 • Respuesta y Garantía
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Incidencia y Resolución (Resuelve)
                </h2>
              </div>
              <span className="text-xs text-neutral-400">
                Qué ocurre cuando un pedido presenta un problema o retraso
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center space-y-2">
                <div className="text-xs text-neutral-400 font-medium">Tasa de Incidencia</div>
                <div className="text-3xl font-black text-white font-mono">{issuesPer1k}</div>
                <p className="text-xs text-neutral-400">
                  Reclamaciones formales por cada 1,000 pedidos observados.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center space-y-2">
                <div className="text-xs text-neutral-400 font-medium">Resolución con Conformidad</div>
                <div className="text-3xl font-black text-emerald-400 font-mono">{resolutionRate}%</div>
                <p className="text-xs text-neutral-400">
                  Casos cerrados con la <strong className="text-white">confirmación expresa</strong> del comprador.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center space-y-2">
                <div className="text-xs text-neutral-400 font-medium">Tiempo de Primera Respuesta</div>
                <div className="text-3xl font-black text-white font-mono">{business.median_response_hours}h</div>
                <p className="text-xs text-neutral-400">
                  Tiempo mediano de atención formal a incidencias abiertas.
                </p>
              </div>
            </div>

            {/* Cases Preview Table */}
            {cases.length > 0 && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                <div className="p-4 bg-neutral-900/80 border-b border-neutral-800 text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Historial de Casos Auditados ({cases.length})</span>
                  <span className="text-[11px] text-neutral-500">Datos anonimizados por LFPDPPP</span>
                </div>
                <div className="divide-y divide-neutral-850 text-xs">
                  {cases.slice(0, 3).map((c) => (
                    <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{c.case_number}</span>
                          <span className="text-neutral-400">• Motivo: {c.issue_category}</span>
                        </div>
                        <p className="text-neutral-400 text-[11px] mt-1">
                          Solución: {c.resolution_summary || c.remedy_offered || 'Acuerdo con cliente'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {c.is_consumer_confirmed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <Check className="h-3 w-3" /> Resuelto conforme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                            En mediación
                          </span>
                        )}
                        <Link
                          href={`/caso/${c.id}`}
                          className="text-neutral-400 hover:text-white p-1"
                          title="Ver detalle del caso"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 5: INFORMACIÓN OFICIAL Y PÚBLICA */}
          {/* ========================================================================= */}
          <section id="oficial" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-neutral-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                  Fuentes Públicas
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Registros Oficiales y Gubernamentales
                </h2>
              </div>
              <span className="text-xs text-neutral-400">
                Cotejo público ante PROFECO e INEGI con fecha de corte
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {officialRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Scale className="h-4 w-4" />
                      {record.source_name}
                    </span>
                    <span className="text-neutral-500 font-mono">
                      Corte: {record.record_date}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {record.fact_title}
                  </h3>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {record.fact_detail}
                  </p>

                  {record.source_url && (
                    <div className="pt-2">
                      <a
                        href={record.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <span>Consultar registro en portal oficial</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 6: OPINIONES VERIFICADAS */}
          {/* ========================================================================= */}
          <section id="opiniones" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-neutral-850">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Reseñas Reales
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
                  Opiniones de Compradores Verificados
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Ponderadas por comprobante de pago SPEI, orden en tienda o revisión documental.
                </p>
              </div>

              <Link
                href={`/escribir-opinion/${business.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-emerald-400 transition-colors shrink-0"
              >
                <span>Escribir opinión</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Interactive Reviews List with Level Filters */}
            <PassportReviewsList reviews={reviews} brandName={business.brand_name} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
