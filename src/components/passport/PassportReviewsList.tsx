'use client';

import { useState } from 'react';
import { Check, CornerDownRight, MessageSquareText, Search, SlidersHorizontal, X } from 'lucide-react';
import { StarRating, ratingSentimentLabel } from '@/components/StarRating';

export interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  author_review_count?: number;
  verification_level: string;
  score_weight: number | string;
  product_name: string | null;
  created_at: string;
  responder_name?: string | null;
  response_text?: string | null;
  response_created_at?: string | null;
}

const VERIFICATION_LABELS: Record<string, string> = {
  confirmed_payment: 'Pago confirmado',
  confirmed_store_order: 'Pedido conectado',
  reviewed_proof: 'Comprobante revisado',
  unverified_experience: 'Sin comprobante verificado',
};
const RATING_COLORS: Record<number, string> = {
  5: '#00b67a',
  4: '#73cf11',
  3: '#ffce00',
  2: '#ff8622',
  1: '#ff3722',
};
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Mexico_City',
      });
};
const selectClass =
  'min-h-12 w-full rounded-xl border border-[var(--op-border-strong)] bg-[var(--op-sheet)] px-3 text-base';

export function PassportReviewsList({ reviews, brandName }: { reviews: ReviewItem[]; brandName: string }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [keyword, setKeyword] = useState('');
  const [ratings, setRatings] = useState<number[]>([]);
  const [repliedOnly, setRepliedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : null;
  const replyCount = reviews.filter((review) => Boolean(review.response_text?.trim())).length;
  const normalizedKeyword = normalize(keyword.trim());
  const filtersApplied = filter !== 'all' || normalizedKeyword.length > 0 || ratings.length > 0 || repliedOnly;
  const filtered = reviews
    .filter((review) => {
      if (filter !== 'all' && review.verification_level !== filter) return false;
      if (ratings.length && !ratings.includes(Number(review.rating))) return false;
      if (repliedOnly && !review.response_text?.trim()) return false;
      return (
        !normalizedKeyword ||
        normalize([review.title, review.body, review.product_name].filter(Boolean).join(' ')).includes(normalizedKeyword)
      );
    })
    .sort((a, b) => {
      const dateOrder = new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id;
      return sort === 'lowest' ? a.rating - b.rating || dateOrder : sort === 'highest' ? b.rating - a.rating || dateOrder : dateOrder;
    });
  const clearFilters = () => {
    setFilter('all');
    setKeyword('');
    setRatings([]);
    setRepliedOnly(false);
    setVisibleCount(10);
  };
  const toggleRating = (rating: number) => {
    setRatings((current) => (current.includes(rating) ? current.filter((item) => item !== rating) : [...current, rating]));
    setVisibleCount(10);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-8">
      <aside
        aria-label="Resumen y distribución de opiniones"
        className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 shadow-flat sm:p-6 lg:sticky lg:top-28"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-op-ink">Lo que opinan sus clientes</h3>
          {average !== null && (
            <span className="rounded-full bg-op-green-soft px-2.5 py-0.5 text-xs font-bold text-op-green-dark">
              {ratingSentimentLabel(average)}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-data text-5xl font-extrabold tracking-tight text-op-ink">
            {average === null ? '—' : average.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="text-sm text-[var(--op-ink-muted)]">de 5 estrellas</span>
        </div>
        {average !== null && (
          <div className="mt-3">
            <StarRating
              rating={average}
              label={`Promedio de opiniones: ${average.toLocaleString('es-MX', { maximumFractionDigits: 1 })} de 5 estrellas`}
            />
          </div>
        )}
        <p className="mt-3 text-sm font-medium text-[var(--op-ink-secondary)]">
          {reviews.length.toLocaleString('es-MX')} {reviews.length === 1 ? 'opinión publicada' : 'opiniones publicadas'}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--op-ink-muted)]">
          Promedio de las estrellas de todas las opiniones publicadas. El puntaje Opinio de 0 a 100 también considera evidencia y resolución.
        </p>
        <fieldset className="mt-6 border-t border-[var(--op-border-hairline)] pt-5">
          <legend className="sr-only">Filtrar por número de estrellas</legend>
          <p className="mb-3 text-xs font-medium text-[var(--op-ink-muted)]">Elige una o varias calificaciones</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviews.filter((review) => Number(review.rating) === rating).length;
              const percent = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              const selected = ratings.includes(rating);
              return (
                <label
                  key={rating}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm transition-colors ${
                    selected ? 'bg-op-green-soft font-semibold' : 'hover:bg-[var(--op-canvas)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleRating(rating)}
                    className="size-4 shrink-0 accent-[#00b67a]"
                    aria-label={`${rating} ${rating === 1 ? 'estrella' : 'estrellas'}: ${count} ${
                      count === 1 ? 'opinión' : 'opiniones'
                    }, ${percent}%`}
                  />
                  <span className="w-8 shrink-0 font-mono text-xs font-semibold" aria-hidden="true">
                    {rating} ★
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#dcdce6]/70"
                  >
                    <span
                      className="block h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%`, backgroundColor: RATING_COLORS[rating] }}
                    />
                  </span>
                  <span aria-hidden="true" className="w-10 shrink-0 text-right font-data text-xs font-medium">
                    {percent}%
                  </span>
                  <span aria-hidden="true" className="w-7 shrink-0 text-right text-xs text-[var(--op-ink-muted)]">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-op-green-border bg-op-green-soft/60 p-3 text-op-green-dark">
          <MessageSquareText className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          <p className="text-xs font-medium leading-relaxed">
            {replyCount} {replyCount === 1 ? 'opinión tiene' : 'opiniones tienen'} respuesta del comercio.
          </p>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <section
          aria-label="Buscar y ordenar opiniones"
          className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-4 shadow-flat sm:p-5"
        >
          <label htmlFor="review-search" className="mb-2 block text-sm font-semibold">
            Busca lo que te importa en las opiniones
          </label>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--op-ink-muted)]" />
            <input
              id="review-search"
              type="search"
              value={keyword}
              maxLength={150}
              onChange={(event) => {
                setKeyword(event.target.value);
                setVisibleCount(10);
              }}
              placeholder="Ej. entrega, calidad, atención…"
              className="min-h-12 w-full rounded-full border border-[var(--op-border-strong)] bg-[#fcfbf3] py-3 pl-11 pr-12 text-base transition-colors focus:border-[#00b67a] focus:bg-white"
              aria-describedby="review-search-help"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  setVisibleCount(10);
                }}
                aria-label="Borrar búsqueda en opiniones"
                className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--op-ink-muted)]"
              >
                <X size={17} />
              </button>
            )}
          </div>
          <p id="review-search-help" className="mt-2 text-xs text-[var(--op-ink-muted)]">
            Busca en el título, la experiencia y el producto o servicio.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div className="min-w-0">
              <label htmlFor="review-filter" className="mb-2 block text-sm font-semibold">
                Tipo de comprobante
              </label>
              <select
                id="review-filter"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setVisibleCount(10);
                }}
                className={selectClass}
              >
                <option value="all">Todos los comprobantes</option>
                {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} ({reviews.filter((review) => review.verification_level === value).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="review-sort" className="mb-2 block text-sm font-semibold">
                Ordenar por
              </label>
              <select
                id="review-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setVisibleCount(10);
                }}
                className={selectClass}
              >
                <option value="recent">Más recientes</option>
                <option value="lowest">Menor calificación</option>
                <option value="highest">Mayor calificación</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={repliedOnly}
                onChange={(event) => {
                  setRepliedOnly(event.target.checked);
                  setVisibleCount(10);
                }}
                className="size-4 accent-[#00b67a]"
              />
              Con respuesta del comercio
            </label>
            {filtersApplied && (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-11 text-sm font-semibold text-op-green-dark underline underline-offset-4"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className="text-sm font-medium text-[var(--op-ink-secondary)]">
            {filtered.length.toLocaleString('es-MX')} de {reviews.length.toLocaleString('es-MX')}{' '}
            {reviews.length === 1 ? 'opinión' : 'opiniones'}
            {ratings.length > 0 ? ` · ${[...ratings].sort().join(', ')} estrellas` : ''}
          </p>
          {filtersApplied && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-op-green-soft px-3 py-1 text-xs font-semibold text-op-green-dark">
              <SlidersHorizontal size={13} aria-hidden="true" />
              Filtros activos
            </span>
          )}
        </div>

        {filtered.length ? (
          <>
            {filtered.slice(0, visibleCount).map((review) => {
              const withEvidence = ['confirmed_payment', 'confirmed_store_order', 'reviewed_proof'].includes(
                review.verification_level
              );
              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 shadow-flat transition-shadow hover:shadow-elevated sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-op-border/70 pb-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-op-green-soft text-sm font-bold text-op-green-dark"
                      >
                        {review.author_name.trim().slice(0, 2).toLocaleUpperCase('es-MX')}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 break-words text-sm font-bold text-op-ink">
                          <span>{review.author_name}</span>
                          {review.author_review_count ? (
                            <span className="inline-flex items-center rounded-md border border-[var(--op-border-hairline)] bg-[var(--op-shaded)] px-2 py-0.5 text-[11px] font-medium text-[var(--op-ink-secondary)]">
                              {review.author_review_count} {review.author_review_count === 1 ? 'opinión' : 'opiniones'}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--op-ink-muted)]">
                          Publicado el {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        withEvidence
                          ? 'border border-op-green-border bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)]'
                          : 'bg-[var(--op-shaded)] text-[var(--op-ink-secondary)]'
                      }`}
                    >
                      {withEvidence && <Check size={13} aria-hidden="true" />}
                      {VERIFICATION_LABELS[review.verification_level] || 'Comprobante no especificado'}
                    </span>
                  </div>
                  <div className="my-4">
                    <StarRating rating={Number(review.rating)} size="sm" />
                  </div>
                  {review.title && <h3 className="mb-2 break-words text-base font-bold text-op-ink">{review.title}</h3>}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--op-ink-secondary)]">
                    {review.body}
                  </p>
                  {review.product_name && (
                    <p className="mt-4 inline-block rounded-lg bg-op-shaded px-2.5 py-1 text-xs font-medium text-[var(--op-ink-muted)]">
                      Producto o servicio: {review.product_name}
                    </p>
                  )}
                  {review.response_text && (
                    <div className="mt-5 rounded-xl border-l-3 border-[#00b67a] bg-[#fcfbf3] p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-op-ink">
                        <CornerDownRight size={16} className="text-[#00b67a]" aria-hidden="true" />
                        Respuesta de {review.responder_name || brandName}
                      </p>
                      {review.response_created_at && (
                        <p className="mt-0.5 text-xs text-[var(--op-ink-muted)]">
                          {formatDate(review.response_created_at)}
                        </p>
                      )}
                      <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--op-ink-secondary)]">
                        {review.response_text}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
            {visibleCount < filtered.length && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 10)}
                  className="min-h-12 rounded-full border border-op-strong bg-white px-6 text-sm font-semibold text-op-ink shadow-2xs transition-all hover:border-[#00b67a] hover:text-op-green-dark"
                >
                  Mostrar más opiniones ({Math.min(visibleCount, filtered.length)} de {filtered.length})
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-8 text-center">
            <Search size={24} className="mx-auto mb-4 text-[var(--op-ink-muted)]" aria-hidden="true" />
            <h3 className="font-semibold">
              {reviews.length ? 'No hay opiniones que coincidan' : 'Este negocio todavía no tiene opiniones'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--op-ink-secondary)]">
              {reviews.length
                ? 'Prueba con otra palabra o quita algún filtro para seguir leyendo.'
                : 'Tu experiencia puede ayudar a la próxima persona que compre aquí.'}
            </p>
            {filtersApplied && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 min-h-11 text-sm font-semibold text-op-green-dark underline"
              >
                Ver todas las opiniones
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
