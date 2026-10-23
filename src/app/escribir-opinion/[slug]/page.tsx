import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, PenLine } from 'lucide-react';
import { query } from '@/lib/db';
import { sharePreview } from '@/lib/share-preview';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import { ReviewFormWizard } from './ReviewFormWizard';

interface BusinessRow {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  domain: string | null;
  whatsapp: string | null;
  trust_score: string | number;
  coverage_percentage: string | number;
  observed_orders_count: number;
}

interface BusinessMetaRow {
  slug: string;
  brand_name: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function siteBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = envUrl && !envUrl.includes('fertilitylistings') ? envUrl : 'https://opinio.mx';
  return baseUrl.replace(/\/+$/, '');
}

// The opinion-entry page stays indexable (approved indexing policy): each
// merchant slug gets its own self-canonical, so incidental parameters on the
// form URL normalize to the merchant path and are never cross-canonicalized
// to the /b/<slug> passport.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const res = await query<BusinessMetaRow>(
    'SELECT slug, brand_name FROM businesses WHERE slug = $1 LIMIT 1',
    [slug]
  );

  if (res.rows.length === 0) {
    return {
      title: 'Comercio no encontrado | Opinio México',
      description: 'Este comercio no está registrado en Opinio México.',
    };
  }

  const business = res.rows[0];
  const title = `Escribir una opinión sobre ${business.brand_name} | Opinio México`;
  const description = `Comparte tu experiencia con ${business.brand_name}: qué compraste, cómo respondió y cómo resolvió. Tu opinión ayuda a otros compradores en México a decidir con evidencia.`;
  const canonical = `${siteBaseUrl()}/escribir-opinion/${business.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    // The share preview reuses the merchant identity and the self-canonical, so
    // incidental parameters on the form URL stay out of the share metadata and
    // the preview is never cross-linked to the /b/<slug> passport.
    ...sharePreview({ title, description, url: canonical }),
  };
}

export default async function EscribirOpinionPage({ params }: PageProps) {
  const { slug } = await params;

  const res = await query<BusinessRow>(
    'SELECT id, slug, brand_name, legal_name, category, domain, whatsapp, trust_score, coverage_percentage, observed_orders_count FROM businesses WHERE slug = $1 LIMIT 1',
    [slug]
  );

  if (res.rows.length === 0) {
    notFound();
  }

  const business = res.rows[0];

  return (
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] font-sans text-op-ink selection:bg-op-green-dark selection:text-white">
      <Navbar />
      <main id="contenido" className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas pb-16">
        <section className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3] py-10 sm:py-12">
          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Link
              href={`/b/${business.slug}`}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-op-secondary transition-colors hover:text-op-green-dark"
            >
              <ArrowLeft className="size-4" />
              <span>Volver al pasaporte de {business.brand_name}</span>
            </Link>

            <div className="flex items-center gap-4">
              <BrandLogo name={business.brand_name} category={business.category} sizeClass="size-14 sm:size-16" priority />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-op-border bg-white px-3 py-0.5 font-mono text-xs font-bold text-op-ink shadow-2xs">
                  <PenLine className="size-3.5 text-[#008b5d]" />
                  Comparte tu experiencia
                </span>
                <p className="mt-1 font-mono text-xs text-op-muted">
                  {business.domain || business.legal_name || business.category}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <ReviewFormWizard
            businessId={business.id}
            slug={business.slug}
            brandName={business.brand_name}
            legalName={business.legal_name}
            category={business.category}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
