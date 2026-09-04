import React from 'react';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
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

interface PageProps {
  params: Promise<{ slug: string }>;
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
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
