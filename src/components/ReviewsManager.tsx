'use client';

import React from 'react';
import {
  Star,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MessageSquare,
  Search,
  Filter,
  Send,
  AlertCircle,
  ChevronDown,
  UserCheck,
  CornerDownRight,
  ExternalLink,
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
  businessSlug,
}: ReviewsManagerProps) {
  const [reviews, setReviews] = React.useState(initialReviews);
  const [ratingFilter, setRatingFilter] = React.useState<number | null>(null);
  const [verificationFilter, setVerificationFilter] = React.useState<string>('all');
  const [responseFilter, setResponseFilter] = React.useState<'all' | 'pending' | 'answered'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Expanded reply forms map: reviewId -> boolean
  const [replyingReviewId, setReplyingReviewId] = React.useState<number | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [responderName, setResponderName] = React.useState('Atención Oficial Opinio');
  const [submitting, setSubmitting] = React.useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter !== null && r.rating !== ratingFilter) return false;
    if (verificationFilter !== 'all' && r.verification_level !== verificationFilter) return false;
    if (responseFilter === 'pending' && r.response) return false;
    if (responseFilter === 'answered' && !r.response) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAuthor = r.author_name.toLowerCase().includes(q);
      const matchBody = r.body.toLowerCase().includes(q);
      const matchProduct = r.product_name?.toLowerCase().includes(q);
      if (!matchAuthor && !matchBody && !matchProduct) return false;
    }
    return true;
  });

  const handleOpenReply = (review: Review) => {
    setReplyingReviewId(review.id);
    setReplyText(review.response?.response_text || '');
    setResponderName(review.response?.responder_name || 'Atención Oficial Opinio');
    setActionSuccessMessage(null);
  };

  const handleSubmitResponse = async (e: React.FormEvent, reviewId: number) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('review_id', String(reviewId));
    formData.append('business_id', String(businessId));
    formData.append('responder_name', responderName);
    formData.append('response_text', replyText.trim());

    const res = await postReviewResponseAction(formData);
    setSubmitting(false);

    if (res.success) {
      setReviews((prev) =>
        prev.map((item) => {
          if (item.id === reviewId) {
            return {
              ...item,
              response: {
                id: Date.now(),
                review_id: reviewId,
                business_id: businessId,
                responder_name: responderName,
                response_text: replyText.trim(),
                created_at: new Date().toISOString(),
              },
            };
          }
          return item;
        })
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
          label: 'Pago Bancario Confirmado (1.00)',
          color: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
        };
      case 'confirmed_store_order':
        return {
          label: 'Pedido de Tienda Conectada (0.90)',
          color: 'bg-blue-950/70 text-blue-300 border-blue-700/60',
        };
      case 'reviewed_proof':
        return {
          label: 'Comprobante Auditado (0.75)',
          color: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
        };
      default:
        return {
          label: 'Experiencia No Verificada (0.35)',
          color: 'bg-zinc-800 text-zinc-400 border-zinc-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert message */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, palabra clave o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Response Status Quick Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setResponseFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'all'
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
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
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-zinc-400 hover:text-white"
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
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Respondidas ({reviews.filter((r) => !!r.response).length})
            </button>
          </div>
        </div>

        {/* Second row: Star filter & Verification Level */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60 text-xs">
          <span className="text-zinc-400 text-[11px] font-medium mr-1">Calificación:</span>
          {[null, 5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating === null ? 'all-stars' : `star-${rating}`}
              type="button"
              onClick={() => setRatingFilter(rating)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1",
                ratingFilter === rating
                  ? "bg-zinc-800 text-white border border-zinc-700 font-bold"
                  : "bg-zinc-950/70 text-zinc-400 hover:text-zinc-200 border border-zinc-800/70"
              )}
            >
              {rating === null ? (
                'Todas'
              ) : (
                <>
                  <span className="text-amber-400">★</span>
                  <span>{rating}</span>
                </>
              )}
            </button>
          ))}

          <div className="h-4 w-px bg-zinc-800 mx-2 hidden sm:block" />

          <span className="text-zinc-400 text-[11px] font-medium mr-1">Verificación:</span>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
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
          <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-400">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
            <p className="font-semibold text-sm text-zinc-300">
              No se encontraron opiniones con los filtros seleccionados.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
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
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-3.5"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 text-amber-400 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < r.rating ? "text-amber-400" : "text-zinc-700"}
                        >
                          ★
                        </span>
                      ))}
                      <span className="ml-1 text-xs font-bold text-white font-mono">
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

                  <div className="text-[11px] text-zinc-400 font-mono">
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
                    <h4 className="text-sm font-semibold text-white mb-1">
                      {r.title}
                    </h4>
                  )}
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {r.body}
                  </p>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                    <span className="font-semibold text-zinc-200">{r.author_name}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-500">
                      {r.author_masked_contact || 'Contacto Protegido'}
                    </span>
                    {r.product_name && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-400">
                          Producto: <strong className="text-zinc-300">{r.product_name}</strong>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/50 transition-colors"
                      >
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span>Responder Oficialmente</span>
                      </button>
                    )}

                    {r.response && !isReplying && (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(r)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 hover:underline"
                      >
                        Editar respuesta oficial
                      </button>
                    )}
                  </div>
                </div>

                {/* Existing Official Response */}
                {r.response && !isReplying && (
                  <div className="mt-3 p-4 rounded-xl bg-zinc-950/80 border-l-2 border-emerald-500 border-y border-r border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Respuesta Oficial de {r.response.responder_name}
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px]">
                        {new Date(r.response.created_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 italic leading-relaxed">
                      &ldquo;{r.response.response_text}&rdquo;
                    </p>
                  </div>
                )}

                {/* Inline Response Form */}
                {isReplying && (
                  <form
                    onSubmit={(e) => handleSubmitResponse(e, r.id)}
                    className="mt-3 p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 space-y-3 animate-in fade-in duration-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Publicar Respuesta Oficial en Opinio.mx
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingReviewId(null)}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Cargo o Nombre del Representante
                      </label>
                      <input
                        type="text"
                        required
                        value={responderName}
                        onChange={(e) => setResponderName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. Dirección de Servicio al Cliente"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Mensaje Oficial al Consumidor
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
                        placeholder="Agradecemos tus comentarios. En nuestro pasaporte de confianza nos aseguramos de..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-500">
                        Esta respuesta será pública y visible en el Pasaporte de Confianza.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
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
