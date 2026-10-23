import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Building, Receipt, Phone, Globe, SealCheck, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { countVerifiedReviews, meetsEvidenceThreshold } from '@/lib/evidence-threshold';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import { PassportReviewsList, ReviewItem } from '@/components/passport/PassportReviewsList';
import { StarRating, ratingSentimentLabel } from '@/components/StarRating';
import { PassportActionButtons } from '@/components/passport/PassportActionButtons';
import { TrustGauge } from '@/components/passport/TrustGauge';
import { OfficialRecordCard } from '@/components/passport/OfficialRecordCard';
import { query } from '@/lib/db';
import { passportMetadata } from '@/lib/passport-metadata';
import { buildBuyerFaq } from '@/lib/passport-buyer-faq';
import { factStatus, formatRecordDate, latestRecordDateValue, verificationLevelLabel } from '@/lib/passport-evidence';
import { publicCaseColumnsSql } from '@/lib/case-access';
import { toPublicReview } from '@/lib/public-reviews';

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx';

  try {
    const res = await query<BusinessDbRow>(
      `SELECT * FROM businesses WHERE slug = $1 LIMIT 1`,
      [slug]
    );

    if (res.rows.length === 0) {
      return {
        title: 'Comercio no encontrado | Opinio México',
        description: 'Este comercio no está registrado en Opinio México.',
      };
    }

    const b = res.rows[0];
    const { title, description } = passportMetadata(b);
    const canonicalUrl = `${baseUrl}/b/${slug}`;
    const ogImageUrl = `${baseUrl}/b/${slug}/opengraph-image`;

    return {
      title,
      description,
      keywords: [
        `es confiable ${b.brand_name}`,
        `opiniones ${b.brand_name}`,
        `quejas ${b.brand_name} profeco`,
        `es seguro comprar en ${b.brand_name}`,
        `rfc ${b.brand_name}`,
        `opinio mexico`,
        b.brand_name,
      ],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: 'Opinio.mx',
        locale: 'es_MX',
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Pasaporte de Confianza Comercial de ${b.brand_name}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Error querying business:', error);
    return {
      title: 'Comercio no disponible | Opinio México',
      description: 'No pudimos cargar la información de este comercio en Opinio México.',
    };
  }
}

export default async function BusinessPassportPage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === 'locomotion') {
    redirect('/b/locomotion-is');
  }

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
        r.id, r.rating, r.title, r.body, r.author_name,
        r.verification_level, r.score_weight, r.product_name, r.created_at,
        COALESCE(ac.author_review_count, 1)::int as author_review_count,
        rr.responder_name, rr.response_text, rr.created_at as response_created_at
       FROM reviews r
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS author_review_count
         FROM reviews r2
         WHERE (
           (r.author_masked_contact IS NOT NULL AND r2.author_masked_contact = r.author_masked_contact)
           OR (r.author_masked_contact IS NULL AND r2.author_name = r.author_name)
         )
         AND r2.status = 'published'
       ) ac ON true
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
      `SELECT ${publicCaseColumnsSql()} FROM resolution_cases WHERE business_id = $1 ORDER BY created_at DESC`,
      [business.id]
    )
  ]);

  const officialRecords = offRes.rows;
  // Defense in depth: the query selects no contact column; strip it anyway.
  const reviews = revRes.rows.map(toPublicReview);
  const cases = caseRes.rows;
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : null;

  const score = Number(business.trust_score) || 0;
  const folioCode = `OP-${business.id.toString().padStart(6, '0')}`;
  const confidenceLevel = business.confidence_level;
  const effectiveSampleSize = Number(business.effective_reviews_count) || 0;
  const hasScore = meetsEvidenceThreshold(countVerifiedReviews(reviews)) && effectiveSampleSize > 0;
  const hasOrdersData = business.observed_orders_count > 0;
  const coveragePercent = hasOrdersData ? Math.round(business.invited_orders_count / business.observed_orders_count * 1000) / 10 : null;
  const issuesPer1k = hasOrdersData ? Math.round(cases.length / business.observed_orders_count * 10000) / 10 : null;
  const confirmedCasesCount = cases.filter((item) => item.is_consumer_confirmed).length;
  const resolutionRate = cases.length > 0 ? Math.round(confirmedCasesCount / cases.length * 1000) / 10 : null;
  const factEvidence = {
    rfc: factStatus({ type: 'rfc', value: business.rfc }, idRes.rows),
    denue: factStatus({ type: 'denue', value: business.clee }, idRes.rows),
    domain: factStatus({ type: 'domain', value: business.domain }, idRes.rows),
    whatsapp: factStatus({ type: 'whatsapp', value: business.whatsapp }, idRes.rows),
  };
  const registeredFactCount = Object.values(factEvidence).filter((evidence) => evidence.status !== 'missing').length;
  const verifiedIdentities = idRes.rows.filter((row) => row.status === 'verified');
  const verifiedSources = [...new Set(verifiedIdentities.map((row) => row.source?.trim()).filter((source): source is string => Boolean(source)))].slice(0, 2);
  const latestRecordDateRaw = latestRecordDateValue(officialRecords);
  const latestRecordDateLabel = latestRecordDateRaw ? formatRecordDate(latestRecordDateRaw) : null;
  const issueLabels: Record<string, string> = { delay: 'Retraso de entrega', damaged_goods: 'Producto dañado', wrong_item: 'Artículo equivocado', refund_pending: 'Reembolso pendiente', no_response: 'Falta de respuesta' };

  const envPageUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envPageUrl && !envPageUrl.includes('fertilitylistings') ? envPageUrl : 'https://opinio.mx';
  const canonicalUrl = `${baseUrl}/b/${business.slug}`;
  const logoAbsoluteUrl = business.logo_url ? `${baseUrl}${business.logo_url}` : undefined;

  // One source for the buyer Q&A: rendered visibly below and mirrored in the
  // FAQPage structured data (SEO-GEO-001 finding 1, JEV-001).
  const buyerFaq = buildBuyerFaq({
    brandName: business.brand_name,
    legalName: business.legal_name,
    rfc: business.rfc,
    rfcLabel: factEvidence.rfc.label,
    domain: business.domain,
    verificationLabel: verificationLevelLabel(business.verified_level),
    reviewsCount: reviews.length,
    averageRating,
    casesCount: cases.length,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${canonicalUrl}#organization`,
        name: business.brand_name,
        ...(business.legal_name ? { legalName: business.legal_name } : {}),
        url: business.domain ? (business.domain.startsWith('http') ? business.domain : `https://${business.domain}`) : canonicalUrl,
        logo: logoAbsoluteUrl,
        taxID: business.rfc || undefined,
        telephone: business.phone && /\d/.test(business.phone) ? business.phone : undefined,
        description: `Perfil público de ${business.brand_name} en Opinio México; sector registrado: ${business.category}.`,
        ...(averageRating !== null && reviews.length > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: averageRating.toFixed(1),
            reviewCount: reviews.length,
            bestRating: '5',
            worstRating: '1',
          },
          review: reviews.slice(0, 10).map((r) => ({
            '@type': 'Review',
            ...(r.author_name && r.author_name.trim() ? {
              author: {
                '@type': 'Person',
                name: r.author_name,
              },
            } : {}),
            datePublished: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : undefined,
            reviewRating: {
              '@type': 'Rating',
              ratingValue: r.rating,
              bestRating: '5',
              worstRating: '1',
            },
            reviewBody: r.body,
          })),
        } : {}),
      },
      {
        '@type': 'WebPage',
        '@id': canonicalUrl,
        url: canonicalUrl,
        name: `¿Es confiable ${business.brand_name}? Pasaporte de Confianza | Opinio México`,
        description: `Perfil público de ${business.brand_name} en Opinio México: datos registrados, fuentes públicas y opiniones de compradores.`,
        inLanguage: 'es-MX',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}#website`,
          name: 'Opinio México',
          url: baseUrl,
        },
        about: {
          '@id': `${canonicalUrl}#organization`,
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['#resumen-confianza', '#folio-code'],
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Directorio de Empresas',
            item: `${baseUrl}/directorio`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: business.brand_name,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: buyerFaq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--op-canvas)] text-[var(--op-ink-primary)] flex flex-col font-sans selection:bg-[var(--op-verified-ink)] selection:text-[var(--op-sheet)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
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
                  {hasScore ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)] border border-[var(--op-verified-border)]">
                      <SealCheck weight="fill" className="w-4 h-4 text-[var(--op-verified-ink)]" />
                      <span>PASAPORTE DE CONFIANZA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold bg-[var(--op-canvas)] text-[var(--op-ink-secondary)] border border-[var(--op-border-hairline)]">
                      <span>PASAPORTE SIN EVIDENCIA SUFICIENTE</span>
                    </span>
                  )}
                  {business.claimed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold bg-[var(--op-canvas)] text-[var(--op-ink-secondary)] border border-[var(--op-border-hairline)]">
                      <CheckCircle weight="bold" className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                      Perfil reclamado
                    </span>
                  )}
                </div>

                {/* Main Heading & Legal Identity */}
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--op-ink-primary)] flex items-center gap-3">
                    <BrandLogo name={business.brand_name} src={business.logo_url} category={business.category} sizeClass="size-14 sm:size-16" priority />
                    <span>{business.brand_name}</span>
                  </h1>
                  {business.legal_name && (
                    <p className="text-sm sm:text-base text-[var(--op-ink-secondary)] mt-1 font-medium font-mono">
                      Razón social: <strong className="text-[var(--op-ink-primary)]">{business.legal_name}</strong>
                    </p>
                  )}
                  <p className="text-xs text-[var(--op-ink-muted)] font-mono mt-0.5">
                    Categoría: {business.category} • Ámbito registrado: {business.operating_area || 'No declarado'}
                  </p>
                </div>

                <a href="#opiniones" className="inline-flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-op-green-border bg-[#fcfbf3] px-4 py-3 text-sm text-op-ink shadow-2xs transition-colors hover:border-[#00b67a]">
                  {averageRating !== null ? (
                    <>
                      <StarRating rating={averageRating} size="sm" />
                      <span className="rounded-md bg-op-green-soft px-2 py-0.5 text-xs font-bold text-op-green-dark">
                        {ratingSentimentLabel(averageRating)}
                      </span>
                      <span className="font-mono font-bold">
                        {averageRating.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5
                      </span>
                      <span className="font-semibold text-op-green-dark underline underline-offset-4">
                        {reviews.length.toLocaleString('es-MX')} {reviews.length === 1 ? 'opinión' : 'opiniones'}
                      </span>
                    </>
                  ) : (
                    <span className="text-op-secondary">Este negocio todavía no tiene opiniones</span>
                  )}
                </a>

                {business.description && (
                  <div className="max-w-2xl space-y-1">
                    <p className="text-xs font-mono uppercase tracking-wider text-[var(--op-ink-muted)]">
                      Descripción atribuida, registrada en Opinio (texto descriptivo; no es una credencial de verificación)
                    </p>
                    <p className="text-sm text-[var(--op-ink-secondary)] leading-relaxed">
                      {business.description}
                    </p>
                  </div>
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

        <nav aria-label="Secciones del pasaporte" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pt-6 sm:px-6 lg:px-8">{[['dictamen', 'Dictamen'], ['existe', 'Identidad'], ['cobertura', 'Pedidos'], ['resuelve', 'Casos'], ['fuentes', 'Fuentes'], ['opiniones', 'Opiniones']].map(([id, label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--op-border-strong)] bg-[var(--op-sheet)] px-4 text-sm font-medium">{label}</a>)}</nav>
        {/* ========================================================================= */}
        {/* MAIN BODY SECTIONS (THE 3 PILLARS & AUDITED DATA)                         */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 space-y-16">

          {/* GENERATIVE ENGINE OPTIMIZATION (GEO) & AI CITABILITY VERDICT SECTION */}
          <section id="dictamen" className="scroll-mt-28 p-6 sm:p-8 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {hasScore ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)] border border-[var(--op-verified-border)]">
                  <SealCheck weight="fill" className="w-4 h-4 text-[var(--op-verified-ink)]" /> Dictamen de Confianza Comercial
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-[var(--op-canvas)] text-[var(--op-ink-secondary)] border border-[var(--op-border-hairline)]">
                  Dictamen sin evidencia suficiente
                </span>
              )}
              <span className="text-xs font-mono text-[var(--op-ink-muted)]">
                {latestRecordDateLabel ? `Fuente más reciente: ${latestRecordDateLabel}` : 'Sin fuentes públicas con fecha registrada'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[var(--op-ink-primary)] tracking-tight">
              ¿Es confiable comprar en {business.brand_name} en México?
            </h2>

            {/* Self-contained summary of supported facts and registered verification state */}
            <p className="text-sm sm:text-base text-[var(--op-ink-secondary)] leading-relaxed font-sans">
              {business.brand_name} es un comercio del sector {business.category} con perfil público en Opinio México{business.legal_name ? `; su razón social publicada es ${business.legal_name}` : ''}{business.rfc ? `, con RFC publicado ${business.rfc}` : ''}. Nivel de verificación registrado en Opinio: {verificationLevelLabel(business.verified_level)}. {verifiedIdentities.length > 0 ? `El registro de Opinio incluye ${verifiedIdentities.length} ${verifiedIdentities.length === 1 ? 'identificador con verificación registrada' : 'identificadores con verificación registrada'}${verifiedSources.length > 0 ? `, con fuentes registradas como ${verifiedSources.join(' y ')}` : ', sin fuentes registradas'}.` : officialRecords.length > 0 ? `Opinio ha recopilado ${officialRecords.length} ${officialRecords.length === 1 ? 'registro' : 'registros'} de fuentes públicas para este perfil.` : 'Opinio no tiene todavía registros de identidad verificados ni fuentes públicas vinculadas para este perfil.'} {cases.length > 0 ? `En atención a compradores hay ${cases.length} ${cases.length === 1 ? 'caso registrado' : 'casos registrados'}${resolutionRate !== null ? `, con ${resolutionRate}% de resoluciones confirmadas por el comprador` : ''}.` : 'No hay casos de atención registrados en Opinio.'} Consejo editorial de Opinio: verifica la URL oficial del comercio{business.domain ? ` (${business.domain})` : ''}, exige comprobante fiscal digital (CFDI) y paga mediante métodos trazables como tarjeta o SPEI bancario directo.
            </p>

            {/* Verification metrics micro-grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
                <div className="text-[var(--op-ink-muted)]">Estatus Fiscal</div>
                <div className="font-bold text-[var(--op-ink-primary)] text-sm mt-0.5 break-words">{business.rfc ? factEvidence.rfc.label : 'Sin RFC publicado'}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
                <div className="text-[var(--op-ink-muted)]">Nivel de verificación</div>
                <div className="font-bold text-[var(--op-verified-ink)] text-sm truncate mt-0.5">{verificationLevelLabel(business.verified_level)}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
                <div className="text-[var(--op-ink-muted)]">Resolución de casos</div>
                <div className="font-bold text-[var(--op-ink-primary)] text-sm truncate mt-0.5">{cases.length > 0 && resolutionRate !== null ? `${resolutionRate}% confirmado` : 'Sin casos registrados'}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
                <div className="text-[var(--op-ink-muted)]">Opiniones publicadas</div>
                <div className="font-bold text-[var(--op-ink-primary)] text-sm truncate mt-0.5">{reviews.length > 0 ? `${reviews.length} (${averageRating?.toFixed(1)}/5)` : 'Sin opiniones publicadas'}</div>
              </div>
            </div>

            {/* Buyer questions answered visibly, from the same source as the FAQPage data */}
            <div className="space-y-3 pt-4 border-t border-[var(--op-border-hairline)]">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--op-ink-primary)]">
                Preguntas del comprador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {buyerFaq.map((item) => (
                  <article key={item.question} className="p-4 rounded-xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] space-y-1.5">
                    <h4 className="text-sm font-bold text-[var(--op-ink-primary)]">{item.question}</h4>
                    <p className="text-sm text-[var(--op-ink-secondary)] leading-relaxed">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

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
                {registeredFactCount > 0 ? `${registeredFactCount} de 4 datos registrados` : 'Sin datos registrados'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">Cédula Fiscal SAT</div>
                <div className="break-words text-base font-bold text-[var(--op-ink-primary)]">{business.rfc || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{factEvidence.rfc.label}</div>
                {factEvidence.rfc.sourceNote && <div className="text-xs text-[var(--op-ink-muted)]">{factEvidence.rfc.sourceNote}</div>}
              </div>

              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">Censo Económico INEGI</div>
                <div className="break-words text-sm font-bold text-[var(--op-ink-primary)]">{business.clee || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{factEvidence.denue.label}</div>
                {factEvidence.denue.sourceNote && <div className="text-xs text-[var(--op-ink-muted)]">{factEvidence.denue.sourceNote}</div>}
              </div>

              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">Sitio web</div>
                <div className="break-words text-sm font-bold text-[var(--op-ink-primary)]">{business.domain || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{factEvidence.domain.label}</div>
                {factEvidence.domain.sourceNote && <div className="text-xs text-[var(--op-ink-muted)]">{factEvidence.domain.sourceNote}</div>}
              </div>

              <div className="p-5 rounded-2xl bg-[var(--op-sheet)] border border-[var(--op-border-hairline)] shadow-flat space-y-1.5">
                <div className="text-[var(--op-ink-muted)] text-xs">WhatsApp Comercial</div>
                <div className="text-sm font-bold text-[var(--op-ink-primary)]">{business.whatsapp || 'No registrado'}</div>
                <div className="text-xs text-[var(--op-verified-ink)] font-bold">{factEvidence.whatsapp.label}</div>
                {factEvidence.whatsapp.sourceNote && <div className="text-xs text-[var(--op-ink-muted)]">{factEvidence.whatsapp.sourceNote}</div>}
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
                  {cases.length > 0 && Number(business.median_response_hours) > 0 ? `${Number(business.median_response_hours)} hrs` : 'Sin datos'}
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
                        {c.is_consumer_confirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--op-verified-ink)] bg-[var(--op-verified-tint)] px-2.5 py-0.5 rounded-full border border-[var(--op-verified-border)]">
                            <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[var(--op-verified-ink)]" />
                            Resolución confirmada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--op-ink-secondary)] bg-[var(--op-shaded)] px-2.5 py-0.5 rounded-full border border-[var(--op-border-hairline)]">
                            Sin confirmación del comprador
                          </span>
                        )}
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
              <span className="text-xs font-mono font-bold text-[var(--op-verified-ink)] bg-[var(--op-verified-tint)] px-3 py-1 rounded-md border border-[var(--op-verified-border)]">
                {officialRecords.length > 0 ? `${officialRecords.length} ${officialRecords.length === 1 ? 'registro' : 'registros'}` : 'Sin registros vinculados'}
              </span>
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
                data-cta="passport_write_review"
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
