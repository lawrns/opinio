import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  Receipt,
  Phone,
  Globe,
  SealCheck,
  CheckCircle,
  ShieldCheck,
  ChatsCircle,
  Fingerprint,
  FileText,
  ArrowUpRight,
} from '@phosphor-icons/react/dist/ssr';
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
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] font-sans text-op-ink selection:bg-op-green-dark selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Navbar />

      <main id="contenido" tabIndex={-1} className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas pb-20">
        {/* ========================================================================= */}
        {/* 1. TRUSTPILOT-INSPIRED PASSPORT HERO BANNER WITH MOTION GRAPHICS          */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3] pb-12 pt-10">
          {/* Geometric background motion graphics */}
          <svg
            aria-hidden="true"
            viewBox="0 0 640 320"
            className="pointer-events-none absolute -right-12 -top-8 hidden h-full w-[560px] opacity-85 lg:block"
          >
            <g className="animate-op-float">
              <circle cx="480" cy="60" r="120" fill="#fd791a" />
              <rect x="280" y="130" width="160" height="160" rx="32" fill="#ffe400" transform="rotate(-14 360 210)" />
              <path
                d="M520 130 L610 285 L430 285 Z"
                fill="#04da8d"
                stroke="#04da8d"
                strokeWidth="14"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px] lg:gap-12">
              {/* Left Identity Dossier */}
              <div className="max-w-3xl space-y-5">
                {/* Official Folio & Credential Ribbon */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span
                    id="folio-code"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1b1a1b] px-3.5 py-1 font-bold text-white"
                  >
                    <span className="size-2 rounded-full bg-[#00b67a]" aria-hidden="true" />
                    FOLIO: {folioCode}
                  </span>
                  {hasScore ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-op-green-border bg-op-green-soft px-3.5 py-1 font-bold text-op-green-dark">
                      <SealCheck weight="fill" className="size-4 text-[#00b67a]" />
                      <span>PASAPORTE DE CONFIANZA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-white px-3.5 py-1 font-bold text-op-secondary">
                      <span>PASAPORTE SIN EVIDENCIA SUFICIENTE</span>
                    </span>
                  )}
                  {business.claimed && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-op-border bg-white px-3 py-1 font-semibold text-op-ink shadow-2xs">
                      <CheckCircle weight="fill" className="size-3.5 text-[#00b67a]" />
                      Perfil reclamado
                    </span>
                  )}
                </div>

                {/* Main Heading & Legal Identity */}
                <div className="flex items-start gap-4">
                  <BrandLogo
                    name={business.brand_name}
                    src={business.logo_url}
                    category={business.category}
                    sizeClass="size-16 sm:size-20"
                    priority
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-op-secondary border border-op-border">
                        {business.category}
                      </span>
                      <span className="font-mono text-xs text-op-muted">
                        · {business.operating_area || 'México'}
                      </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-op-ink sm:text-4xl lg:text-5xl">
                      {business.brand_name}
                    </h1>
                    {business.legal_name && (
                      <p className="font-mono text-xs text-op-secondary sm:text-sm">
                        Razón social: <strong className="text-op-ink">{business.legal_name}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Star Rating Pill Banner */}
                <div>
                  <a
                    href="#opiniones"
                    className="inline-flex min-h-13 flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border border-op-strong bg-white px-5 py-3 text-sm text-op-ink shadow-flat transition-all hover:border-[#00b67a] hover:shadow-elevated"
                  >
                    {averageRating !== null ? (
                      <>
                        <StarRating rating={averageRating} size="sm" />
                        <span className="rounded-md bg-op-green-soft px-2.5 py-0.5 text-xs font-bold text-op-green-dark">
                          {ratingSentimentLabel(averageRating)}
                        </span>
                        <span className="font-mono text-base font-extrabold text-op-ink">
                          {averageRating.toFixed(1)} de 5
                        </span>
                        <span className="font-semibold text-op-green-dark underline decoration-[#00b67a] underline-offset-4">
                          {reviews.length.toLocaleString('es-MX')} {reviews.length === 1 ? 'opinión' : 'opiniones'}
                        </span>
                      </>
                    ) : (
                      <span className="text-op-secondary">Este negocio todavía no tiene opiniones</span>
                    )}
                  </a>
                </div>

                {business.description && (
                  <div className="max-w-2xl rounded-2xl border border-op-border bg-white/85 p-4 backdrop-blur-xs">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-op-muted">
                      Descripción atribuida, registrada en Opinio (texto descriptivo; no es una credencial de verificación)
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-op-secondary">
                      {business.description}
                    </p>
                  </div>
                )}

                {/* Standardized Metadata Chips */}
                <div className="flex flex-wrap gap-2 font-mono text-xs">
                  {business.rfc && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-white px-3.5 py-1.5 text-op-secondary shadow-2xs">
                      <Receipt className="size-3.5 text-[#00b67a]" weight="duotone" />
                      RFC: <strong className="text-op-ink">{business.rfc}</strong>
                    </span>
                  )}
                  {business.clee && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-white px-3.5 py-1.5 text-op-secondary shadow-2xs">
                      <Building className="size-3.5 text-op-blue" weight="duotone" />
                      INEGI CLEE: <strong className="text-op-ink">{business.clee}</strong>
                    </span>
                  )}
                  {business.domain && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-white px-3.5 py-1.5 text-op-secondary shadow-2xs">
                      <Globe className="size-3.5 text-[#00b67a]" weight="duotone" />
                      {business.domain}
                    </span>
                  )}
                  {business.whatsapp && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-op-green-border bg-op-green-soft px-3.5 py-1.5 font-bold text-op-green-dark">
                      <Phone className="size-3.5 text-[#00b67a]" weight="fill" />
                      WhatsApp registrado
                    </span>
                  )}
                </div>

                {/* CTAs */}
                <div className="pt-1">
                  <PassportActionButtons slug={business.slug} brandName={business.brand_name} />
                </div>
              </div>

              {/* Right Trust Score Credential Card */}
              <div className="relative overflow-hidden rounded-[22px] border border-op-ink/15 bg-white p-6 text-center shadow-hero">
                <div className="mb-4 flex items-center justify-between border-b border-op-border pb-3 font-mono text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-op-ink">Puntaje Opinio</span>
                  <span className="rounded-full bg-[#fcfbf3] px-2.5 py-0.5 text-[10px] font-semibold text-op-muted">
                    Escala 0 a 100
                  </span>
                </div>

                <div className="flex justify-center py-1">
                  <TrustGauge
                    score={hasScore ? score : null}
                    size="lg"
                    confidenceLevel={confidenceLevel}
                  />
                </div>

                <div className="mt-4 space-y-1.5 rounded-xl bg-[#fcfbf3] p-3.5 font-mono text-xs text-op-secondary border border-op-border">
                  <div className="font-bold text-op-ink">
                    Muestra efectiva: {effectiveSampleSize} reseñas
                  </div>
                  <div>
                    {hasOrdersData ? (
                      `${business.observed_orders_count.toLocaleString('es-MX')} pedidos observados`
                    ) : (
                      'Sin volumen conectado aún'
                    )}
                  </div>
                  <div className="text-[11px] text-op-muted">
                    Calificación Opinio · Escala de 0 a 100
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sticky Jump Pill Bar */}
        <div className="border-b border-op-border bg-white/90 backdrop-blur-xs">
          <nav
            aria-label="Secciones del pasaporte"
            className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3.5 sm:px-6 lg:px-8"
          >
            {[
              ['dictamen', 'Dictamen'],
              ['existe', '01 · Identidad'],
              ['cobertura', '02 · Pedidos'],
              ['resuelve', '03 · Casos'],
              ['fuentes', '04 · Fuentes'],
              ['opiniones', '05 · Opiniones'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex min-h-10 items-center rounded-full border border-op-border bg-[#fcfbf3] px-4 text-xs font-bold text-op-ink transition-all hover:border-[#00b67a] hover:bg-op-green-soft hover:text-op-green-dark"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY SECTIONS (THE 3 PILLARS & AUDITED DATA)                         */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-7xl space-y-14 px-4 pt-12 sm:px-6 lg:px-8">

          {/* GENERATIVE ENGINE OPTIMIZATION (GEO) & AI CITABILITY VERDICT SECTION */}
          <section
            id="dictamen"
            className="scroll-mt-28 overflow-hidden rounded-[24px] border border-op-border bg-white p-6 shadow-elevated sm:p-9"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-op-border pb-4">
              <div className="flex flex-wrap items-center gap-2">
                {hasScore ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-op-green-border bg-op-green-soft px-3.5 py-1 font-mono text-xs font-bold text-op-green-dark">
                    <SealCheck weight="fill" className="size-4 text-[#00b67a]" /> Dictamen de Confianza Comercial
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-[#fcfbf3] px-3.5 py-1 font-mono text-xs font-bold text-op-secondary">
                    Dictamen sin evidencia suficiente
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-op-muted">
                {latestRecordDateLabel ? `Fuente más reciente: ${latestRecordDateLabel}` : 'Sin fuentes públicas con fecha registrada'}
              </span>
            </div>

            <h2
              id="resumen-confianza"
              className="mt-5 text-2xl font-extrabold tracking-[-0.025em] text-op-ink sm:text-3xl"
            >
              ¿Es confiable comprar en {business.brand_name} en México?
            </h2>

            {/* Self-contained summary of supported facts and registered verification state */}
            <p className="mt-3 text-sm leading-relaxed text-op-secondary sm:text-base">
              {business.brand_name} es un comercio del sector {business.category} con perfil público en Opinio México{business.legal_name ? `; su razón social publicada es ${business.legal_name}` : ''}{business.rfc ? `, con RFC publicado ${business.rfc}` : ''}. Nivel de verificación registrado en Opinio: {verificationLevelLabel(business.verified_level)}. {verifiedIdentities.length > 0 ? `El registro de Opinio incluye ${verifiedIdentities.length} ${verifiedIdentities.length === 1 ? 'identificador con verificación registrada' : 'identificadores con verificación registrada'}${verifiedSources.length > 0 ? `, con fuentes registradas como ${verifiedSources.join(' y ')}` : ', sin fuentes registradas'}.` : officialRecords.length > 0 ? `Opinio ha recopilado ${officialRecords.length} ${officialRecords.length === 1 ? 'registro' : 'registros'} de fuentes públicas para este perfil.` : 'Opinio no tiene todavía registros de identidad verificados ni fuentes públicas vinculadas para este perfil.'} {cases.length > 0 ? `En atención a compradores hay ${cases.length} ${cases.length === 1 ? 'caso registrado' : 'casos registrados'}${resolutionRate !== null ? `, con ${resolutionRate}% de resoluciones confirmadas por el comprador` : ''}.` : 'No hay casos de atención registrados en Opinio.'} Consejo editorial de Opinio: verifica la URL oficial del comercio{business.domain ? ` (${business.domain})` : ''}, exige comprobante fiscal digital (CFDI) y paga mediante métodos trazables como tarjeta o SPEI bancario directo.
            </p>

            {/* Verification metrics micro-grid */}
            <div className="mt-6 grid grid-cols-2 gap-3.5 font-mono text-xs sm:grid-cols-4">
              <div className="rounded-2xl border border-op-border bg-[#fcfbf3] p-4">
                <div className="text-[11px] uppercase tracking-wider text-op-muted">Estatus Fiscal</div>
                <div className="mt-1 break-words text-sm font-bold text-op-ink">{business.rfc ? factEvidence.rfc.label : 'Sin RFC publicado'}</div>
              </div>
              <div className="rounded-2xl border border-op-border bg-[#fcfbf3] p-4">
                <div className="text-[11px] uppercase tracking-wider text-op-muted">Nivel de verificación</div>
                <div className="mt-1 truncate text-sm font-bold text-op-green-dark">{verificationLevelLabel(business.verified_level)}</div>
              </div>
              <div className="rounded-2xl border border-op-border bg-[#fcfbf3] p-4">
                <div className="text-[11px] uppercase tracking-wider text-op-muted">Resolución de casos</div>
                <div className="mt-1 truncate text-sm font-bold text-op-ink">{cases.length > 0 && resolutionRate !== null ? `${resolutionRate}% confirmado` : 'Sin casos registrados'}</div>
              </div>
              <div className="rounded-2xl border border-op-border bg-[#fcfbf3] p-4">
                <div className="text-[11px] uppercase tracking-wider text-op-muted">Opiniones publicadas</div>
                <div className="mt-1 truncate text-sm font-bold text-op-ink">{reviews.length > 0 ? `${reviews.length} (${averageRating?.toFixed(1)}/5)` : 'Sin opiniones publicadas'}</div>
              </div>
            </div>

            {/* Buyer questions answered visibly, from the same source as the FAQPage data */}
            <div className="mt-7 space-y-3.5 border-t border-op-border pt-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-op-ink">
                Preguntas frecuentes antes de comprar en {business.brand_name}
              </h3>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {buyerFaq.map((item) => (
                  <article key={item.question} className="space-y-1.5 rounded-2xl border border-op-border bg-[#fcfbf3] p-4.5">
                    <h4 className="text-sm font-bold text-op-ink">{item.question}</h4>
                    <p className="text-sm leading-relaxed text-op-secondary">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* STAGE 1: EXISTE (IDENTIDAD JURÍDICA Y REGISTRO FISCAL) */}
          <section className="scroll-mt-28 space-y-6" id="existe">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-op-border pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl border border-op-blue-border bg-op-blue-soft text-op-blue-dark">
                  <Fingerprint className="size-6" weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-blue-dark">
                    01 · Identidad
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-op-ink">
                    Identidad del negocio
                  </h2>
                </div>
              </div>
              <span className="rounded-full border border-op-blue-border bg-op-blue-soft px-3.5 py-1 font-mono text-xs font-bold text-op-blue-dark">
                {registeredFactCount > 0 ? `${registeredFactCount} de 4 datos registrados` : 'Sin datos registrados'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 font-mono text-xs md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 rounded-2xl border border-op-border border-t-4 border-t-[#1b1a1b] bg-white p-5 shadow-flat">
                <div className="text-xs text-op-muted">Cédula Fiscal SAT</div>
                <div className="break-words text-base font-bold text-op-ink">{business.rfc || 'No registrado'}</div>
                <div className="text-xs font-bold text-op-green-dark">{factEvidence.rfc.label}</div>
                {factEvidence.rfc.sourceNote && <div className="text-xs text-op-muted">{factEvidence.rfc.sourceNote}</div>}
              </div>

              <div className="space-y-1.5 rounded-2xl border border-op-border border-t-4 border-t-op-blue bg-white p-5 shadow-flat">
                <div className="text-xs text-op-muted">Censo Económico INEGI</div>
                <div className="break-words text-sm font-bold text-op-ink">{business.clee || 'No registrado'}</div>
                <div className="text-xs font-bold text-op-green-dark">{factEvidence.denue.label}</div>
                {factEvidence.denue.sourceNote && <div className="text-xs text-op-muted">{factEvidence.denue.sourceNote}</div>}
              </div>

              <div className="space-y-1.5 rounded-2xl border border-op-border border-t-4 border-t-[#00b67a] bg-white p-5 shadow-flat">
                <div className="text-xs text-op-muted">Sitio web</div>
                <div className="break-words text-sm font-bold text-op-ink">{business.domain || 'No registrado'}</div>
                <div className="text-xs font-bold text-op-green-dark">{factEvidence.domain.label}</div>
                {factEvidence.domain.sourceNote && <div className="text-xs text-op-muted">{factEvidence.domain.sourceNote}</div>}
              </div>

              <div className="space-y-1.5 rounded-2xl border border-op-border border-t-4 border-t-[#fd791a] bg-white p-5 shadow-flat">
                <div className="text-xs text-op-muted">WhatsApp Comercial</div>
                <div className="text-sm font-bold text-op-ink">{business.whatsapp || 'No registrado'}</div>
                <div className="text-xs font-bold text-op-green-dark">{factEvidence.whatsapp.label}</div>
                {factEvidence.whatsapp.sourceNote && <div className="text-xs text-op-muted">{factEvidence.whatsapp.sourceNote}</div>}
              </div>
            </div>
          </section>

          {/* STAGE 2: CUMPLE (EL DENOMINADOR Y COBERTURA DE PEDIDOS — PEACH BANNER) */}
          <section className="scroll-mt-28 rounded-[24px] bg-[#ffeed7] p-6 shadow-flat sm:p-9" id="cobertura">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-[#1b1a1b]/15 pb-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#1b1a1b] text-[#04da8d]">
                  <Receipt className="size-6" weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-green-dark">
                    02 · Experiencia de compra
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#1b1a1b]">
                    Cobertura de pedidos
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-[#1b1a1b] px-4 py-1 font-mono text-xs font-bold text-white">
                {hasOrdersData ? `${coveragePercent}% con invitación` : 'Sin pedidos conectados'}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* Stat 1 */}
              <div className="space-y-2 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <div className="font-mono text-xs uppercase tracking-wider text-op-muted">
                  Pedidos con invitación
                </div>
                <div className="break-words font-mono text-2xl font-extrabold text-op-green-dark">
                  {coveragePercent !== null ? `${coveragePercent}%` : 'Sin datos de pedidos'}
                </div>
                <p className="pt-1 text-xs leading-relaxed text-op-secondary">
                  {hasOrdersData
                    ? `${business.invited_orders_count.toLocaleString('es-MX')} clientes invitados de ${business.observed_orders_count.toLocaleString('es-MX')} compras observadas.`
                    : 'Este comercio aún no conecta su pasarela de pedidos para medir el denominador.'}
                </p>
              </div>

              {/* Stat 2 */}
              <div className="space-y-2 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <div className="font-mono text-xs uppercase tracking-wider text-op-muted">
                  Pedidos Conectados
                </div>
                <div className="break-words font-mono text-2xl font-extrabold text-op-ink">
                  {hasOrdersData ? business.observed_orders_count.toLocaleString('es-MX') : 'En espera'}
                </div>
                <p className="pt-1 text-xs leading-relaxed text-op-secondary">
                  Volumen de pedidos registrado en Opinio. No representa necesariamente todas las ventas del negocio.
                </p>
              </div>

              {/* Stat 3 */}
              <div className="space-y-2 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <div className="font-mono text-xs uppercase tracking-wider text-op-muted">
                  Opiniones publicadas
                </div>
                <div className="break-words font-mono text-2xl font-extrabold text-op-green-dark">
                  {reviews.length.toLocaleString('es-MX')}
                </div>
                <p className="pt-1 text-xs leading-relaxed text-op-secondary">
                  Consulta el tipo de comprobante disponible en cada opinión.
                </p>
              </div>
            </div>
          </section>

          {/* STAGE 3: RESUELVE (INCIDENCIAS Y MEDIACIÓN BILATERAL — PINK BANNER) */}
          <section className="scroll-mt-28 rounded-[24px] bg-[#ffdde8] p-6 shadow-flat sm:p-9" id="resuelve">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-[#1b1a1b]/15 pb-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#1b1a1b] text-[#ffe400]">
                  <ChatsCircle className="size-6" weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1b1a1b]/75">
                    03 · Atención a problemas
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#1b1a1b]">
                    Cómo responde ante un problema
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-[#1b1a1b] px-4 py-1 font-mono text-xs font-bold text-white">
                {cases.length > 0 ? `${resolutionRate}% Confirmado` : 'Sin casos registrados'}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-1 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <div className="font-mono text-xs uppercase text-op-muted">Tasa de Incidencias</div>
                <div className="font-mono text-2xl font-extrabold text-op-ink">
                  {issuesPer1k !== null ? `${issuesPer1k} / 1k` : 'Sin datos'}
                </div>
                <p className="pt-1 text-xs font-medium text-op-green-dark">
                  Casos registrados por cada mil pedidos observados.
                </p>
              </div>

              <div className="space-y-1 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <div className="font-mono text-xs uppercase text-op-muted">Resolución confirmada</div>
                <div className="font-mono text-2xl font-extrabold text-op-green-dark">
                  {resolutionRate !== null ? `${resolutionRate}%` : 'Sin casos'}
                </div>
                <p className="pt-1 text-xs text-op-secondary">
                  {confirmedCasesCount} de {cases.length} casos con confirmación del cliente.
                </p>
              </div>

              <div className="space-y-1 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <div className="font-mono text-xs uppercase text-op-muted">Tiempo Medio de Respuesta</div>
                <div className="break-words font-mono text-2xl font-extrabold text-op-ink">
                  {cases.length > 0 && Number(business.median_response_hours) > 0 ? `${Number(business.median_response_hours)} hrs` : 'Sin datos'}
                </div>
                <p className="pt-1 text-xs text-op-secondary">
                  Tiempo de respuesta registrado; no constituye una garantía.
                </p>
              </div>
            </div>

            {/* Case History Docket */}
            {cases.length > 0 && (
              <div className="mt-6 space-y-3 rounded-2xl border border-[#1b1a1b]/10 bg-white p-6 shadow-flat">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-op-ink">
                  Historial de casos
                </h3>
                <div className="divide-y divide-op-border text-xs">
                  {cases.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-mono font-bold text-op-ink">
                          <span>{c.case_number}</span>
                          <span className="rounded-md border border-op-border bg-[#fcfbf3] px-2 py-0.5 font-sans text-xs font-medium text-op-secondary">
                            Motivo: {issueLabels[c.issue_category] || c.issue_category}
                          </span>
                        </div>
                        <p className="text-op-secondary">
                          {c.remedy_offered || c.resolution_summary || 'Sin solución registrada todavía.'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {c.is_consumer_confirmed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-op-green-border bg-op-green-soft px-3 py-1 text-xs font-bold text-op-green-dark">
                            <CheckCircle weight="fill" className="size-3.5 text-[#00b67a]" />
                            Resolución confirmada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-op-border bg-op-shaded px-3 py-1 text-xs font-bold text-op-secondary">
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
            <div className="flex flex-col items-start justify-between gap-3 border-b border-op-border pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl border border-op-green-border bg-op-green-soft text-op-green-dark">
                  <FileText className="size-6" weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-green-dark">
                    04 · Fuentes
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-op-ink">
                    Registros y fuentes públicas
                  </h2>
                </div>
              </div>
              <span className="rounded-full border border-op-green-border bg-op-green-soft px-3.5 py-1 font-mono text-xs font-bold text-op-green-dark">
                {officialRecords.length > 0 ? `${officialRecords.length} ${officialRecords.length === 1 ? 'registro' : 'registros'}` : 'Sin registros vinculados'}
              </span>
            </div>

            {officialRecords.length === 0 && (
              <p className="rounded-2xl border border-op-border bg-white p-6 text-sm text-op-secondary shadow-flat">
                Este perfil todavía no tiene fuentes públicas vinculadas.
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {officialRecords.map((rec) => (
                <OfficialRecordCard key={rec.id} record={rec} />
              ))}
            </div>
          </section>

          {/* SECTION 6: OPINIONES AUDITADAS */}
          <section className="scroll-mt-28 space-y-6" id="opiniones">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-op-border pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#1b1a1b] text-[#00b67a]">
                  <ShieldCheck className="size-6" weight="fill" aria-hidden="true" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-green-dark">
                    05 · Opiniones
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-op-ink">
                    Opiniones de compradores ({reviews.length})
                  </h2>
                </div>
              </div>

              <Link
                href={`/escribir-opinion/${business.slug}`}
                data-cta="passport_write_review"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-2.5 text-sm font-bold text-white shadow-flat transition-all hover:bg-op-green-dark"
              >
                Escribir opinión
                <ArrowUpRight className="size-4" aria-hidden="true" />
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
