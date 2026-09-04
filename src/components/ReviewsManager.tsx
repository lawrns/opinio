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
  const [actionError, setActionError] = React.useState<string | null>(null);
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
    setActionError(null);
    const formData = new FormData();
    formData.append('review_id', String(reviewId));
    formData.append('business_id', String(businessId));
    formData.append('responder_name', responderName.trim());
    formData.append('response_text', replyText.trim());

    const res = await postReviewResponseAction(formData).catch(() => ({ success: false, response: undefined }));
    setSubmitting(false);
    if (!res.success) setActionError('No se pudo publicar la respuesta. El texto se conserva para que vuelvas a intentarlo.');

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
          color: 'bg-op-green-soft text-op-green-dark border-op-green-border',
        };
      case 'confirmed_store_order':
        return {
          label: 'Pedido Conectado (0.90)',
          color: 'bg-op-shaded text-op-secondary border-op-border',
        };
      case 'reviewed_proof':
        return {
          label: 'Comprobante Subido (0.75)',
          color: 'bg-op-shaded text-op-secondary border-op-border',
        };
      default:
        return {
          label: 'No Verificada (0.35)',
          color: 'bg-op-shaded text-op-secondary border-op-border',
        };
    }
  };

  return (
    <div className="space-y-6">
      {actionError && <p role="alert" className="rounded-xl bg-op-danger-soft p-4 text-sm text-op-danger">{actionError}</p>}
      {/* Alert Banner */}
      {actionSuccessMessage && (
        <div role="status" className="p-4 rounded-xl bg-op-green-soft border border-op-green-border text-op-green-dark text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-op-green-dark shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-op-border shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-op-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Buscar opiniones por cliente, palabra clave o producto"
              placeholder="Buscar cliente, palabra clave o producto…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink placeholder:text-op-muted focus:outline-none focus:border-op-green-border transition-colors"
            />
          </div>

          {/* Response Status Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-op-canvas border border-op-border text-xs shrink-0">
            <button
              type="button"
              aria-pressed={responseFilter === 'all'}
              onClick={() => setResponseFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'all'
                  ? "bg-op-ink text-white font-semibold"
                  : "text-op-muted hover:text-op-ink"
              )}
            >
              Todas ({reviews.length})
            </button>
            <button
              type="button"
              aria-pressed={responseFilter === 'pending'}
              onClick={() => setResponseFilter('pending')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'pending'
                  ? "bg-op-warning-soft text-op-warning font-semibold border border-op-warning-soft"
                  : "text-op-muted hover:text-op-ink"
              )}
            >
              Pendientes ({reviews.filter((r) => !r.response).length})
            </button>
            <button
              type="button"
              aria-pressed={responseFilter === 'answered'}
              onClick={() => setResponseFilter('answered')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-colors",
                responseFilter === 'answered'
                  ? "bg-op-green-soft text-op-green-dark font-semibold border border-op-green-border"
                  : "text-op-muted hover:text-op-ink"
              )}
            >
              Respondidas ({reviews.filter((r) => !!r.response).length})
            </button>
          </div>
        </div>

        {/* Second row: Star filter & Verification Level */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-op-border text-xs">
          <span className="text-op-muted text-xs font-medium mr-1">Calificación:</span>
          {[null, 5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating === null ? 'all-stars' : `star-${rating}`}
              type="button"
              aria-pressed={ratingFilter === rating}
              aria-label={rating === null ? 'Todas las calificaciones' : `${rating} estrellas`}
              onClick={() => setRatingFilter(rating)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1",
                ratingFilter === rating
                  ? "bg-op-ink text-white border border-op-ink font-bold"
                  : "bg-op-canvas text-op-muted hover:text-op-ink border border-op-border"
              )}
            >
              {rating === null ? (
                'Todas'
              ) : (
                <>
                  <span className="text-op-warning">★</span>
                  <span>{rating}</span>
                </>
              )}
            </button>
          ))}

          <div className="h-4 w-px bg-op-border mx-2 hidden sm:block" />

          <span className="text-op-muted text-xs font-medium mr-1">Verificación:</span>
          <select
            aria-label="Nivel de verificación"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none focus:border-op-green-border"
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
          <div className="p-12 text-center rounded-2xl bg-white border border-op-border shadow-xs text-op-muted">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-op-muted" />
            <p className="font-semibold text-sm text-op-ink">
              No se encontraron opiniones con los filtros seleccionados.
            </p>
            <button type="button" onClick={() => { setSearchQuery(''); setRatingFilter(null); setVerificationFilter('all'); setResponseFilter('all'); }} className="mt-4 min-h-11 rounded-xl border border-op-border px-4 text-sm text-op-green-dark">Restablecer filtros</button>
          </div>
        ) : (
          filteredReviews.map((r) => {
            const badge = getVerificationBadge(r.verification_level);
            const isReplying = replyingReviewId === r.id;

            return (
              <div
                key={r.id}
                className="p-5 rounded-2xl bg-white border border-op-border shadow-xs space-y-3.5"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 text-op-warning text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < r.rating ? "text-op-warning" : "text-op-border"}
                        >
                          ★
                        </span>
                      ))}
                      <span className="ml-1 text-xs font-bold text-op-ink font-mono">
                        {r.rating}.0
                      </span>
                    </div>

                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded border",
                        badge.color
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-xs text-op-muted font-mono">
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
                    <h4 className="text-sm font-semibold text-op-ink mb-1">
                      {r.title}
                    </h4>
                  )}
                  <p className="text-xs text-op-secondary leading-relaxed">
                    {r.body}
                  </p>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-op-border text-xs">
                  <div className="flex items-center gap-2 text-op-muted text-xs">
                    <span className="font-semibold text-op-ink">{r.author_name}</span>
                    <span>•</span>
                    <span className="font-mono text-op-muted">
                      {r.author_masked_contact || 'Contacto Protegido'}
                    </span>
                    {r.product_name && (
                      <>
                        <span>•</span>
                        <span className="text-op-muted">
                          Producto: <strong className="text-op-ink">{r.product_name}</strong>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-op-green-dark hover:text-op-green-dark bg-op-green-soft hover:bg-op-green-soft border border-op-green-border transition-colors"
                      >
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span>Responder Oficialmente</span>
                      </button>
                    )}

                    {r.response && !isReplying && (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(r)}
                        className="text-xs text-op-muted hover:text-op-ink hover:underline"
                      >
                        Editar respuesta oficial
                      </button>
                    )}
                  </div>
                </div>

                {/* Existing Official Response */}
                {r.response && !isReplying && (
                  <div className="mt-3 p-4 rounded-xl bg-op-green-soft/70 border-l-2 border-op-green-border border-y border-r border-op-green-border space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-op-green-dark flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-op-green-dark" />
                        Respuesta Oficial de {r.response.responder_name}
                      </span>
                      <span className="text-op-muted font-mono text-xs">
                        {new Date(r.response.created_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-op-green-dark italic leading-relaxed">
                      &ldquo;{r.response.response_text}&rdquo;
                    </p>
                  </div>
                )}

                {/* Inline Response Form */}
                {isReplying && (
                  <form
                    onSubmit={(e) => handleSubmitResponse(e, r.id)}
                    className="mt-3 p-4 rounded-xl bg-op-canvas border border-op-green-border space-y-3 animate-in fade-in duration-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-op-green-dark flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-op-green-dark" />
                        Publicar Respuesta Oficial en Opinio.mx
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingReviewId(null)}
                        className="text-xs text-op-muted hover:text-op-ink"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div>
                      <label htmlFor="review-responder" className="block text-xs font-medium text-op-ink mb-1">
                        Cargo o Nombre del Representante
                      </label>
                      <input
                        type="text"
                        required
                        id="review-responder"
                        value={responderName}
                        onChange={(e) => setResponderName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-op-strong text-base text-op-ink focus:outline-none focus:border-op-green-border"
                        placeholder="Ej. Dirección de Servicio al Cliente"
                      />
                    </div>

                    <div>
                      <label htmlFor="review-response" className="block text-xs font-medium text-op-ink mb-1">
                        Mensaje Oficial al Consumidor
                      </label>
                      <textarea
                        required
                        rows={3}
                        id="review-response"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-op-strong text-base text-op-ink placeholder:text-op-muted focus:outline-none focus:border-op-green-border leading-relaxed"
                        placeholder="Agradecemos tus comentarios. En nuestro pasaporte de confianza nos aseguramos de..."
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <span className="text-xs text-op-muted">
                        Esta respuesta será pública y visible en el Pasaporte de Confianza.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-op-muted hover:text-op-ink"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-op-green hover:bg-op-green text-white transition-colors"
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
