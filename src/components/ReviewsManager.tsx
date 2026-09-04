'use client';

import React from 'react';
import {
  Search,
  MessageSquare,
  CheckCircle2,
  CornerDownRight,
} from 'lucide-react';
import { Review, ReviewResponse } from '@/lib/types';
import { postReviewResponseAction } from '@/lib/merchant-actions';
import { cn } from '@/lib/utils';

interface ReviewsManagerProps {
  initialReviews: (Review & { response?: ReviewResponse | null })[];
  businessId: number;
  businessSlug: string;
}

export function ReviewsManager({
  initialReviews,
  businessId,
}: ReviewsManagerProps) {
  const [reviews, setReviews] = React.useState(initialReviews);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [ratingFilter, setRatingFilter] = React.useState<number | null>(null);
  const [verificationFilter, setVerificationFilter] = React.useState<string>('all');
  const [responseFilter, setResponseFilter] = React.useState<'all' | 'pending' | 'answered'>('all');

  // Replying state
  const [replyingReviewId, setReplyingReviewId] = React.useState<number | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [responderName, setResponderName] = React.useState('Dirección de Atención a Clientes');
  const [submitting, setSubmitting] = React.useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Filter logic
  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter !== null && r.rating !== ratingFilter) return false;
    if (verificationFilter !== 'all' && r.verification_level !== verificationFilter) return false;
    if (responseFilter === 'pending' && !!r.response) return false;
    if (responseFilter === 'answered' && !r.response) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesAuthor = r.author_name.toLowerCase().includes(q);
      const matchesBody = r.body.toLowerCase().includes(q);
      const matchesTitle = r.title ? r.title.toLowerCase().includes(q) : false;
      const matchesProduct = r.product_name ? r.product_name.toLowerCase().includes(q) : false;
      if (!matchesAuthor && !matchesBody && !matchesTitle && !matchesProduct) return false;
    }
    return true;
  });

  const handleOpenReply = (review: Review & { response?: ReviewResponse | null }) => {
    setReplyingReviewId(review.id);
    setReplyText(review.response ? review.response.response_text : '');
    setResponderName(review.response ? review.response.responder_name : 'Dirección de Atención a Clientes');
    setActionSuccessMessage(null);
  };

  const handleSubmitResponse = async (e: React.FormEvent, reviewId: number) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('review_id', String(reviewId));
    formData.append('business_id', String(businessId));
    formData.append('responder_name', responderName.trim());
    formData.append('response_text', replyText.trim());

    const res = await postReviewResponseAction(formData);
    setSubmitting(false);

    if (res.success && res.response) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, response: res.response } : r
        )
      );
      setReplyingReviewId(null);
      setReplyText('');
      setActionSuccessMessage('Respuesta oficial publicada exitosamente en el Pasaporte de Confianza.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  const getVerificationBadge = (level: string) => {
    switch (level) {
      case 'confirmed_payment':
        return {
          label: 'Pago SPEI Confirmado (1.00)',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'confirmed_store_order':
        return {
          label: 'Pedido Conectado (0.90)',
          color: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'reviewed_proof':
        return {
          label: 'Comprobante Subido (0.75)',
          color: 'bg-purple-50 text-purple-800 border-purple-200',
        };
      default:
        return {
          label: 'No Verificada (0.35)',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, palabra clave o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Response Status Quick Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs shrink-0">
            <button
              type="button"
              onClick={() => setResponseFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'all'
                  ? "bg-[#0F172A] text-white font-semibold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              Todas ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setResponseFilter('pending')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'pending'
                  ? "bg-amber-50 text-amber-800 font-semibold border border-amber-300"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              Pendientes ({reviews.filter((r) => !r.response).length})
            </button>
            <button
              type="button"
              onClick={() => setResponseFilter('answered')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'answered'
                  ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-300"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              Respondidas ({reviews.filter((r) => !!r.response).length})
            </button>
          </div>
        </div>

        {/* Second row: Star filter & Verification Level */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E8F0] text-xs">
          <span className="text-[#64748B] text-[11px] font-medium mr-1">Calificación:</span>
          {[null, 5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating === null ? 'all-stars' : `star-${rating}`}
              type="button"
              onClick={() => setRatingFilter(rating)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1",
                ratingFilter === rating
                  ? "bg-[#0F172A] text-white border border-[#0F172A] font-bold"
                  : "bg-[#FAFAF8] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]"
              )}
            >
              {rating === null ? (
                'Todas'
              ) : (
                <>
                  <span className="text-amber-500">★</span>
                  <span>{rating}</span>
                </>
              )}
            </button>
          ))}

          <div className="h-4 w-px bg-[#E2E8F0] mx-2 hidden sm:block" />

          <span className="text-[#64748B] text-[11px] font-medium mr-1">Verificación:</span>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos los niveles</option>
            <option value="confirmed_payment">Pago SPEI/Bancario (1.00)</option>
            <option value="confirmed_store_order">Pedido Conectado (0.90)</option>
            <option value="reviewed_proof">Comprobante Subido (0.75)</option>
            <option value="unverified_experience">No Verificada (0.35)</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-[#E2E8F0] shadow-xs text-[#64748B]">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-[#94A3B8]" />
            <p className="font-semibold text-sm text-[#0F172A]">
              No se encontraron opiniones con los filtros seleccionados.
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Prueba cambiando la calificación o el término de búsqueda.
            </p>
          </div>
        ) : (
          filteredReviews.map((r) => {
            const badge = getVerificationBadge(r.verification_level);
            const isReplying = replyingReviewId === r.id;

            return (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3.5"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 text-amber-500 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < r.rating ? "text-amber-500" : "text-[#E2E8F0]"}
                        >
                          ★
                        </span>
                      ))}
                      <span className="ml-1 text-xs font-bold text-[#0F172A] font-mono">
                        {r.rating}.0
                      </span>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded border",
                        badge.color
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#64748B] font-mono">
                    {new Date(r.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                {/* Review content */}
                <div>
                  {r.title && (
                    <h4 className="text-sm font-semibold text-[#0F172A] mb-1">
                      {r.title}
                    </h4>
                  )}
                  <p className="text-xs text-[#334155] leading-relaxed">
                    {r.body}
                  </p>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] text-xs">
                  <div className="flex items-center gap-2 text-[#64748B] text-[11px]">
                    <span className="font-semibold text-[#0F172A]">{r.author_name}</span>
                    <span>•</span>
                    <span className="font-mono text-[#64748B]">
                      {r.author_masked_contact || 'Contacto Protegido'}
                    </span>
                    {r.product_name && (
                      <>
                        <span>•</span>
                        <span className="text-[#64748B]">
                          Producto: <strong className="text-[#0F172A]">{r.product_name}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Reply button */}
                  <div>
                    {!r.response && !isReplying && (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span>Responder Oficialmente</span>
                      </button>
                    )}

                    {r.response && !isReplying && (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(r)}
                        className="text-xs text-[#64748B] hover:text-[#0F172A] hover:underline"
                      >
                        Editar respuesta oficial
                      </button>
                    )}
                  </div>
                </div>

                {/* Existing Official Response */}
                {r.response && !isReplying && (
                  <div className="mt-3 p-4 rounded-xl bg-emerald-50/70 border-l-2 border-emerald-600 border-y border-r border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Respuesta Oficial de {r.response.responder_name}
                      </span>
                      <span className="text-[#64748B] font-mono text-[10px]">
                        {new Date(r.response.created_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-950 italic leading-relaxed">
                      &ldquo;{r.response.response_text}&rdquo;
                    </p>
                  </div>
                )}

                {/* Inline Response Form */}
                {isReplying && (
                  <form
                    onSubmit={(e) => handleSubmitResponse(e, r.id)}
                    className="mt-3 p-4 rounded-xl bg-[#FAFAF8] border border-emerald-300 space-y-3 animate-in fade-in duration-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        Publicar Respuesta Oficial en Opinio.mx
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingReviewId(null)}
                        className="text-xs text-[#64748B] hover:text-[#0F172A]"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#0F172A] mb-1">
                        Cargo o Nombre del Representante
                      </label>
                      <input
                        type="text"
                        required
                        value={responderName}
                        onChange={(e) => setResponderName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. Dirección de Servicio al Cliente"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#0F172A] mb-1">
                        Mensaje Oficial al Consumidor
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500 leading-relaxed"
                        placeholder="Agradecemos tus comentarios. En nuestro pasaporte de confianza nos aseguramos de..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#64748B]">
                        Esta respuesta será pública y visible en el Pasaporte de Confianza.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-[#64748B] hover:text-[#0F172A]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          {submitting ? 'Publicando...' : 'Publicar Respuesta'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
