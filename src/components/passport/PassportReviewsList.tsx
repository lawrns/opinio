'use client';

import React, { useState } from 'react';
import { 
  Star, 
  ShieldCheck, 
  CheckCircle2, 
  ThumbsUp, 
  CornerDownRight, 
  Calendar, 
  Package, 
  Filter,
  Check
} from 'lucide-react';

export interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  author_masked_contact: string | null;
  verification_level: string;
  score_weight: number | string;
  product_name: string | null;
  created_at: string;
  responder_name?: string | null;
  response_text?: string | null;
  response_created_at?: string | null;
}

interface Props {
  reviews: ReviewItem[];
  brandName: string;
}

const VERIFICATION_LABELS: Record<string, { label: string; badgeClass: string; weight: string }> = {
  confirmed_payment: {
    label: 'Pago Confirmado',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    weight: 'Peso: 1.00',
  },
  confirmed_store_order: {
    label: 'Pedido en Tienda Confirmado',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    weight: 'Peso: 0.90',
  },
  reviewed_proof: {
    label: 'Comprobante Revisado',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    weight: 'Peso: 0.75',
  },
  unverified_experience: {
    label: 'Sin Comprobante de Compra',
    badgeClass: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    weight: 'Peso: 0.35',
  },
};

export function PassportReviewsList({ reviews, brandName }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [helpfulMap, setHelpfulMap] = useState<Record<number, boolean>>({});

  const filteredReviews = reviews.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.verification_level === selectedFilter;
  });

  const toggleHelpful = (id: number) => {
    setHelpfulMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Verification Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
        <span className="text-neutral-500 font-medium px-2 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Nivel de prueba:
        </span>
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            selectedFilter === 'all'
              ? 'bg-neutral-800 text-white ring-1 ring-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Todas ({reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('confirmed_payment')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            selectedFilter === 'confirmed_payment'
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Pago Confirmado (1.00)
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('confirmed_store_order')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            selectedFilter === 'confirmed_store_order'
              ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Pedido en Tienda (0.90)
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('reviewed_proof')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
            selectedFilter === 'reviewed_proof'
              ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Comprobante Revisado (0.75)
        </button>
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const vInfo = VERIFICATION_LABELS[review.verification_level] || {
              label: review.verification_level,
              badgeClass: 'bg-neutral-800 text-neutral-400 border-neutral-700',
              weight: '0.50',
            };
            const isHelpful = helpfulMap[review.id];

            return (
              <div
                key={review.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-sm space-y-4 hover:border-neutral-750 transition-colors"
              >
                {/* Review Header: Stars, Author, Verification Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-850">
                  <div className="flex items-center gap-3">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-700'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                      <span>{review.author_name}</span>
                      {review.author_masked_contact && (
                        <span className="text-neutral-500 text-[11px]">
                          ({review.author_masked_contact})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Verification Level Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${vInfo.badgeClass}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      {vInfo.label}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {vInfo.weight}
                    </span>
                  </div>
                </div>

                {/* Review Content */}
                <div>
                  {review.title && (
                    <h4 className="text-sm font-bold text-white mb-1.5">
                      {review.title}
                    </h4>
                  )}
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {review.body}
                  </p>
                </div>

                {/* Product & Date Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-neutral-500">
                  <div className="flex items-center gap-4">
                    {review.product_name && (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        <Package className="h-3.5 w-3.5 text-neutral-500" />
                        {review.product_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-neutral-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHelpful(review.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      isHelpful
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Útil {isHelpful ? '(1)' : ''}</span>
                  </button>
                </div>

                {/* Merchant Response (if exists) */}
                {review.response_text && (
                  <div className="mt-3 rounded-xl bg-neutral-950/80 border border-neutral-850 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CornerDownRight className="h-3.5 w-3.5" />
                      <span>Respuesta oficial de {review.responder_name || brandName}</span>
                      {review.response_created_at && (
                        <span className="text-[11px] font-normal text-neutral-500 ml-auto">
                          {formatDate(review.response_created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed pl-5">
                      {review.response_text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-400">
          No hay opiniones con el nivel de verificación seleccionado ({selectedFilter}).
        </div>
      )}
    </div>
  );
}
