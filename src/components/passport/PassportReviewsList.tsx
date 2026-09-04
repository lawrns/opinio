'use client';

import { useState } from 'react';
import { CornerDownRight, Star } from 'lucide-react';

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

const VERIFICATION_LABELS: Record<string, string> = { confirmed_payment: 'Pago confirmado', confirmed_store_order: 'Pedido conectado', reviewed_proof: 'Comprobante revisado', unverified_experience: 'Sin comprobante verificado' };
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'America/Mexico_City' });
};

export function PassportReviewsList({ reviews, brandName }: { reviews: ReviewItem[]; brandName: string }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const filtered = reviews.filter((review) => filter === 'all' || review.verification_level === filter).sort((a, b) => sort === 'lowest' ? a.rating - b.rating : sort === 'highest' ? b.rating - a.rating : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return <div className="space-y-5">
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1"><label htmlFor="review-filter" className="mb-2 block text-sm font-semibold">Tipo de comprobante</label><select id="review-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-12 w-full rounded-lg border border-[var(--op-border-strong)] bg-[var(--op-canvas)] px-3 text-base"><option value="all">Todas las opiniones ({reviews.length})</option>{Object.entries(VERIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label} ({reviews.filter((review) => review.verification_level === value).length})</option>)}</select></div>
      <div className="min-w-0 sm:w-48"><label htmlFor="review-sort" className="mb-2 block text-sm font-semibold">Ordenar por</label><select id="review-sort" value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-12 w-full rounded-lg border border-[var(--op-border-strong)] bg-[var(--op-canvas)] px-3 text-base"><option value="recent">Más recientes</option><option value="lowest">Menor calificación</option><option value="highest">Mayor calificación</option></select></div>
    </div>
    <p role="status" className="text-sm text-[var(--op-ink-muted)]">{filtered.length} {filtered.length === 1 ? 'opinión' : 'opiniones'}</p>
    {filtered.length ? filtered.map((review) => <article key={review.id} className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="break-words text-sm font-semibold">{review.author_name}</p><p className="mt-1 text-xs text-[var(--op-ink-muted)]">Publicado el {formatDate(review.created_at)}</p></div><span className="rounded-full bg-[var(--op-shaded)] px-3 py-1 text-xs text-[var(--op-ink-secondary)]">{VERIFICATION_LABELS[review.verification_level] || 'Comprobante no especificado'}</span></div>
      <div className="my-4 flex items-center gap-1" role="img" aria-label={`${review.rating} de 5 estrellas`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} aria-hidden="true" size={18} className={star <= review.rating ? 'fill-[var(--op-verified-ink)] text-[var(--op-verified-ink)]' : 'text-[var(--op-border-strong)]'} />)}</div>
      {review.title && <h3 className="mb-2 break-words text-base font-semibold">{review.title}</h3>}<p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--op-ink-secondary)]">{review.body}</p>{review.product_name && <p className="mt-4 break-words text-xs text-[var(--op-ink-muted)]">Producto o servicio: {review.product_name}</p>}
      {review.response_text && <div className="mt-5 rounded-xl border-l-2 border-[var(--op-verified-border)] bg-[var(--op-verified-tint)] p-4"><p className="flex items-center gap-2 text-sm font-semibold text-[var(--op-verified-ink)]"><CornerDownRight size={16} aria-hidden="true" />Respuesta de {review.responder_name || brandName}</p>{review.response_created_at && <p className="mt-1 text-xs text-[var(--op-ink-muted)]">{formatDate(review.response_created_at)}</p>}<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--op-ink-secondary)]">{review.response_text}</p></div>}
    </article>) : <div className="rounded-xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-8 text-center"><h3 className="font-semibold">{reviews.length ? 'No hay opiniones con este comprobante' : 'Este negocio todavía no tiene opiniones'}</h3><p className="mt-2 text-sm text-[var(--op-ink-secondary)]">{reviews.length ? 'Selecciona otro tipo para seguir leyendo.' : 'Tu experiencia puede ayudar a la próxima persona que compre aquí.'}</p>{filter !== 'all' && <button onClick={() => setFilter('all')} className="mt-4 min-h-11 text-sm font-semibold text-[var(--op-link)] underline">Ver todas las opiniones</button>}</div>}
  </div>;
}
