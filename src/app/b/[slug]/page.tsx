import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  ShieldCheck,
  ArrowUpRight,
  Question,
} from '@phosphor-icons/react/dist/ssr';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import { PassportReviewsList, ReviewItem } from '@/components/passport/PassportReviewsList';
import { StarRating, ratingSentimentLabel } from '@/components/StarRating';
import { PassportActionButtons } from '@/components/passport/PassportActionButtons';
import { query } from '@/lib/db';
import { passportMetadata } from '@/lib/passport-metadata';
import { buildBuyerFaq } from '@/lib/passport-buyer-faq';
import { factStatus, verificationLevelLabel, type IdentityEvidenceRow } from '@/lib/passport-evidence';
import { publicCaseColumnsSql } from '@/lib/case-access';
import { isAutomatedReview, isCustomerReview, toPublicReview } from '@/lib/public-reviews';

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
        `${b.brand_name} es confiable`,
        `es confiable ${b.brand_name}`,
        `opiniones ${b.brand_name}`,
        `quejas ${b.brand_name}`,
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
            alt: `Opiniones sobre ${b.brand_name} en Opinio México`,
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

  // 2. Fetch Published Reviews, Identities & Resolution Cases for truthful buyer FAQ
  const [idRes, revRes, caseRes] = await Promise.all([
    query<IdentityEvidenceRow>(
      `SELECT type, identifier, status, source FROM identities WHERE business_id = $1 ORDER BY id ASC`,
      [business.id]
    ),
    query<ReviewItem>(
      `SELECT
        r.id, r.rating, r.title, r.body, r.author_name,
        r.verification_level, r.content_origin, r.score_weight, r.product_name, r.created_at,
        CASE WHEN r.content_origin = 'automated' THEN NULL ELSE COALESCE(ac.author_review_count, 1) END::int AS author_review_count,
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
         AND r2.content_origin IS DISTINCT FROM 'automated'
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
    ),
  ]);

  // Defense in depth: the query selects no contact column; strip it anyway.
  const reviews = revRes.rows.map(toPublicReview);
  const customerReviews = reviews.filter(isCustomerReview);
  const cases = caseRes.rows;
  const averageRating = customerReviews.length
    ? customerReviews.reduce((sum, review) => sum + Number(review.rating), 0) / customerReviews.length
    : null;
  const rfcEvidence = factStatus({ type: 'rfc', value: business.rfc }, idRes.rows);

  // Customer rating uses published non-automated reviews. Null origin stays historical.
  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of customerReviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
    starCounts[bucket] = (starCounts[bucket] || 0) + 1;
  }

  const envPageUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envPageUrl && !envPageUrl.includes('fertilitylistings') ? envPageUrl : 'https://opinio.mx';
  const canonicalUrl = `${baseUrl}/b/${business.slug}`;
  const logoAbsoluteUrl = business.logo_url ? `${baseUrl}${business.logo_url}` : undefined;
  const { title: pageMetaTitle, description: pageMetaDescription } = passportMetadata(business);

  // Single source for visible buyer Q&A and FAQPage JSON-LD (SEO-GEO-001 / JEV-001).
  const buyerFaq = buildBuyerFaq({
    brandName: business.brand_name,
    legalName: business.legal_name,
    rfc: business.rfc,
    rfcLabel: rfcEvidence.label,
    domain: business.domain,
    verificationLabel: verificationLevelLabel(business.verified_level),
    reviewsCount: customerReviews.length,
    automatedReviewsCount: reviews.length - customerReviews.length,
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
        url: business.domain
          ? business.domain.startsWith('http')
            ? business.domain
            : `https://${business.domain}`
          : canonicalUrl,
        logo: logoAbsoluteUrl,
        taxID: business.rfc || undefined,
        telephone: business.phone && /\d/.test(business.phone) ? business.phone : undefined,
        description: `Opiniones publicadas, quejas y datos registrados sobre ${business.brand_name} en Opinio México; categoría: ${business.category}.`,
        ...(averageRating !== null && customerReviews.length > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: averageRating.toFixed(1),
                reviewCount: customerReviews.length,
                bestRating: '5',
                worstRating: '1',
              },
              review: customerReviews.slice(0, 10).map((r) => ({
                '@type': 'Review',
                ...(r.author_name && r.author_name.trim() && !isAutomatedReview(r)
                  ? {
                      author: {
                        '@type': 'Person',
                        name: r.author_name,
                      },
                    }
                  : {}),
                datePublished: r.created_at
                  ? new Date(r.created_at).toISOString().split('T')[0]
                  : undefined,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: r.rating,
                  bestRating: '5',
                  worstRating: '1',
                },
                reviewBody: r.body,
              })),
            }
          : {}),
      },
      {
        '@type': 'WebPage',
        '@id': canonicalUrl,
        url: canonicalUrl,
        name: pageMetaTitle,
        description: pageMetaDescription,
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
          cssSelector: ['#preguntas-comprador', '#opiniones'],
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
        {/* 1. COMPANY HEADER BANNER WITH REAL REVIEW BREAKDOWN                       */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3] pb-12 pt-10">
          {/* Trustpilot-inspired geometric background shapes */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 280"
            className="pointer-events-none absolute right-0 top-0 hidden h-full w-[520px] opacity-80 lg:block"
          >
            <g className="animate-op-float">
              <circle cx="460" cy="50" r="110" fill="#fd791a" />
              <rect x="290" y="120" width="150" height="150" rx="28" fill="#ffe400" transform="rotate(-12 365 195)" />
              <path
                d="M510 120 L590 255 L430 255 Z"
                fill="#04da8d"
                stroke="#04da8d"
                strokeWidth="14"
                strokeLinejoin="round"
              />
            </g>
          </svg>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
              {/* Left Company Identity & Actions */}
              <div className="max-w-3xl space-y-5">
                <div className="flex items-start gap-4">
                  <BrandLogo
                    name={business.brand_name}
                    src={business.logo_url}
                    category={business.category}
                    sizeClass="size-16 sm:size-20"
                    priority
                  />
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-op-border bg-white px-3 py-0.5 font-mono text-[11px] font-semibold text-op-secondary">
                        {business.category}
                      </span>
                      {business.domain && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-op-border bg-white px-3 py-0.5 font-mono text-xs text-op-secondary">
                          <Globe className="size-3.5 text-op-green-dark" />
                          {business.domain}
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-op-ink sm:text-4xl lg:text-5xl">
                      {business.brand_name}
                    </h1>
                  </div>
                </div>

                {/* Star Rating Summary Pill */}
                <div>
                  <a
                    href="#opiniones"
                    className="inline-flex min-h-13 flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border border-op-border bg-white px-5 py-3 text-sm text-op-ink shadow-flat transition-colors hover:border-op-strong"
                  >
                    {averageRating !== null ? (
                      <>
                        <StarRating rating={averageRating} size="sm" />
                        <span className="rounded-md border border-op-border bg-[#fcfbf3] px-2.5 py-0.5 text-xs font-semibold text-op-ink">
                          {ratingSentimentLabel(averageRating)}
                        </span>
                        <span className="font-mono text-base font-extrabold text-op-ink">
                          {averageRating.toFixed(1)} de 5
                        </span>
                        <span className="font-semibold text-op-green-dark underline decoration-[#008b5d] underline-offset-4">
                          {customerReviews.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {customerReviews.length === 1 ? 'opinión' : 'opiniones'}
                        </span>
                      </>
                    ) : reviews.length > 0 ? (
                      <span className="text-op-secondary">Sin calificación de clientes</span>
                    ) : (
                      <span className="text-op-secondary">Este negocio todavía no tiene opiniones</span>
                    )}
                  </a>
                </div>

                {business.description && (
                  <p className="max-w-2xl text-sm leading-relaxed text-op-secondary sm:text-base">
                    {business.description}
                  </p>
                )}

                {/* CTAs */}
                <div className="pt-1">
                  <PassportActionButtons slug={business.slug} brandName={business.brand_name} />
                </div>
              </div>

              {/* Right Real Review Breakdown Card (5★ to 1★) */}
              <div className="overflow-hidden rounded-2xl border border-op-border bg-white p-6 shadow-flat">
                <div className="mb-4 flex items-center justify-between border-b border-op-border pb-3">
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-op-muted">
                      Calificación de clientes
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-extrabold text-op-ink">
                        {averageRating !== null ? averageRating.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs font-semibold text-op-muted">de 5</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {averageRating !== null && (
                      <span className="inline-block rounded-full border border-op-border bg-[#fcfbf3] px-3 py-1 text-xs font-semibold text-op-ink">
                        {ratingSentimentLabel(averageRating)}
                      </span>
                    )}
                    <p className="mt-1 font-mono text-xs text-op-muted">
                      {customerReviews.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {customerReviews.length === 1 ? 'opinión' : 'opiniones'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = starCounts[stars] || 0;
                    const percent = customerReviews.length > 0 ? Math.round((count / customerReviews.length) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-16 shrink-0 font-semibold text-op-ink">
                          {stars} {stars === 1 ? 'estrella' : 'estrellas'}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-op-shaded">
                          <div
                            className="h-full rounded-full bg-[#008b5d]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right font-mono text-op-muted">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. PUBLISHED REVIEWS                                                      */}
        {/* ========================================================================= */}
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <section className="scroll-mt-28 space-y-6" id="opiniones">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-op-border pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#1b1a1b] text-[#00b67a]">
                  <ShieldCheck className="size-6" weight="fill" aria-hidden="true" />
                </span>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-green-dark">
                    Contenido publicado
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight text-op-ink">
                    Opiniones publicadas ({reviews.length})
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

          {/* ========================================================================= */}
          {/* 3. BUYER FAQ SECTION (MIRRORS FAQPage JSON-LD, SEO-GEO-001 / JEV-001)     */}
          {/* ========================================================================= */}
          <section className="mt-14 scroll-mt-28 space-y-6" id="preguntas-comprador">
            <div className="flex items-center gap-3 border-b border-op-border pb-4">
              <span className="flex size-11 items-center justify-center rounded-xl border border-op-border bg-white text-op-green-dark">
                <Question className="size-6" weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-op-green-dark">
                  Preguntas del comprador
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-op-ink">
                  ¿Es confiable {business.brand_name}? Dudas frecuentes
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {buyerFaq.map((item) => (
                <article
                  key={item.question}
                  className="space-y-2 rounded-2xl border border-op-border bg-white p-5 shadow-flat"
                >
                  <h3 className="text-base font-bold text-op-ink">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-op-secondary">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
