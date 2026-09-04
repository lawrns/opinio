'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ThumbsUp, 
  CornerDownRight, 
  Calendar, 
  Filter
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
    label: 'Pago SPEI Confirmado',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    weight: 'Peso: 1.00',
  },
  confirmed_store_order: {
    label: 'Pedido en Tienda Conectado',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    weight: 'Peso: 0.90',
  },
  reviewed_proof: {
    label: 'Comprobante Subido',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    weight: 'Peso: 0.75',
  },
  unverified_experience: {
    label: 'Sin Comprobante de Compra',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
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
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white border border-gray-200 text-xs shadow-2xs">
        <span className="text-gray-500 font-semibold px-2 flex items-center gap-1 text-[11px]">
          <Filter className="h-3.5 w-3.5" /> Filtrar por comprobante:
        </span>
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            selectedFilter === 'all'
              ? 'bg-[#121511] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#121511] hover:bg-gray-100'
          }`}
        >
          Todas ({reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('confirmed_payment')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            selectedFilter === 'confirmed_payment'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
              : 'text-gray-600 hover:text-[#121511] hover:bg-gray-100'
          }`}
        >
          Pago SPEI Confirmado (1.00)
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('confirmed_store_order')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            selectedFilter === 'confirmed_store_order'
              ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs'
              : 'text-gray-600 hover:text-[#121511] hover:bg-gray-100'
          }`}
        >
          Pedido en Tienda (0.90)
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('reviewed_proof')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
            selectedFilter === 'reviewed_proof'
              ? 'bg-purple-50 text-purple-900 border border-purple-300 shadow-xs'
              : 'text-gray-600 hover:text-[#121511] hover:bg-gray-100'
          }`}
        >
          Comprobante Subido (0.75)
        </button>
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const vInfo = VERIFICATION_LABELS[review.verification_level] || {
              label: review.verification_level,
              badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
              weight: '0.50',
            };
            const isHelpful = helpfulMap[review.id];

            return (
              <div
                key={review.id}
                className="tp-card p-6 space-y-4"
              >
                {/* Review Header: Stars, Author, Verification Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={star <= review.rating ? "tp-star-box text-xs w-4.5 h-4.5" : "tp-star-box-empty text-xs w-4.5 h-4.5"}
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#121511] font-bold">
                      <span>{review.author_name}</span>
                      {review.author_masked_contact && (
                        <span className="text-gray-400 font-mono text-[11px] font-normal">
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
                    <span className="text-[10px] text-gray-400 font-mono">
                      {vInfo.weight}
                    </span>
                  </div>
                </div>

                {/* Review Content */}
                <div>
                  {review.title && (
                    <h4 className="text-sm font-bold text-[#121511] mb-1.5">
                      {review.title}
                    </h4>
                  )}
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {review.body}
                  </p>
                </div>

                {/* Metadata & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      Fecha de experiencia: {formatDate(review.created_at)}
                    </span>
                    {review.product_name && (
                      <span className="text-gray-600">
                        Producto: <strong className="text-[#121511]">{review.product_name}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHelpful(review.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors px-2.5 py-1 rounded-full border ${
                      isHelpful
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-gray-50 text-gray-600 hover:text-[#121511] border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>Útil {isHelpful ? '(1)' : ''}</span>
                  </button>
                </div>

                {/* Official Response */}
                {review.response_text && (
                  <div className="mt-3 p-4 rounded-xl bg-emerald-50/70 border-l-2 border-emerald-600 border-y border-r border-emerald-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CornerDownRight className="h-3.5 w-3.5 text-emerald-600" />
                        Respuesta Oficial de {review.responder_name || brandName}
                      </span>
                      {review.response_created_at && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatDate(review.response_created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-950 italic leading-relaxed">
                      &ldquo;{review.response_text}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-white border border-gray-200 text-gray-500 text-xs">
          No hay opiniones con el nivel de comprobante seleccionado.
        </div>
      )}
    </div>
  );
}
