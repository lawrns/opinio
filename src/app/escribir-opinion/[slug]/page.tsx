import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { sharePreview } from '@/lib/share-preview';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined;
  const captchaRequired = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() || turnstileSiteKey);

  return (
    <div className="min-h-screen bg-[var(--op-canvas)] text-[var(--op-ink-primary)] flex flex-col font-sans selection:bg-[var(--op-verified-ink)] selection:text-[var(--op-sheet)]">
      <Navbar />
      <main id="contenido" className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ReviewFormWizard
            businessId={business.id}
            slug={business.slug}
            brandName={business.brand_name}
            legalName={business.legal_name}
            category={business.category}
            turnstileSiteKey={turnstileSiteKey}
            captchaRequired={captchaRequired}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
