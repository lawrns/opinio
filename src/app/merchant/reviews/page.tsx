import React from 'react';
import { getMerchantBusinesses, getMerchantBusiness, getMerchantReviews } from '@/lib/merchant-data';
import { ReviewsManager } from '@/components/ReviewsManager';
import { Star, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantReviewsPage({ searchParams }: PageProps) {
  const { business: businessSlug } = await searchParams;
  const allBusinesses = await getMerchantBusinesses();
  const currentBusiness = businessSlug
    ? await getMerchantBusiness(businessSlug) || allBusinesses[0]
    : allBusinesses[0];

  if (!currentBusiness) {
    return (
      <div className="text-center py-16 text-zinc-400">
        No se encontró información del comercio.
      </div>
    );
  }

  const reviews = await getMerchantReviews(currentBusiness.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Opiniones Verificadas
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {reviews.length} opiniones
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gestiona y responde oficialmente a las experiencias compartidas por compradores de{' '}
            <strong className="text-zinc-200">{currentBusiness.brand_name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-zinc-400">Opinio Score Actual</div>
            <div className="text-xl font-bold text-white font-mono flex items-center justify-end gap-1">
              <span className="text-amber-400">★</span>
              <span>{currentBusiness.trust_score}</span>
              <span className="text-zinc-500 text-xs">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reviews Manager with Filters and Inline Reply Forms */}
      <ReviewsManager
        initialReviews={reviews}
        businessId={currentBusiness.id}
        businessSlug={currentBusiness.slug}
      />
    </div>
  );
}
