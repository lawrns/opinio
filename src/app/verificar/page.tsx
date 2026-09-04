'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Search, RefreshCw, ShieldCheck, AlertCircle, X, SlidersHorizontal } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { StarRating } from '@/components/StarRating';
import { categoryStyle } from '@/lib/category-style';

interface BusinessItem {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  domain: string | null;
  operating_area: string | null;
  claimed: boolean;
  verified_level: string;
  trust_score: number | string | null;
  coverage_percentage: number | string | null;
  observed_orders_count: number;
  effective_reviews_count: number;
  review_count: number;
  average_rating: number | string | null;
}

type SortOrder = 'score' | 'rating' | 'reviews';
interface DirectoryFilters { query: string; category: string; rating: number; connected: boolean; sort: SortOrder }
const CATEGORIES = ['Todos', 'Hogar', 'Electrónica', 'Belleza', 'Joyería', 'Muebles'];
const RATINGS = [0, 1, 2, 3, 4, 4.5, 5];
const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

function evidenceLabel(business: BusinessItem) {
  if (business.claimed && business.verified_level === 'transparent_coverage' && business.observed_orders_count > 0) return 'Cobertura de pedidos registrada';
  if (business.observed_orders_count > 0) return 'Con datos de pedidos';
  return business.claimed ? 'Perfil reclamado' : 'Información pública';
}

function VerificarContent() {
  const searchParams = useSearchParams();
  const writeReview = searchParams.get('accion') === 'opinar';
  const searchTerm = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('categoria') || searchParams.get('cat') || 'Todos';
  const ratingParam = Number(searchParams.get('rating') || 0);
  const minimumRating = Number.isFinite(ratingParam) && ratingParam >= 0 && ratingParam <= 5 ? ratingParam : 0;
  const connectedOnly = searchParams.get('connected') === '1';
  const sortParam = searchParams.get('sort');
  const sortOrder: SortOrder = sortParam === 'rating' || sortParam === 'reviews' ? sortParam : 'score';
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hasFilters = !!searchTerm || selectedCategory !== 'Todos' || minimumRating > 0 || connectedOnly || sortOrder !== 'score';

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (selectedCategory !== 'Todos') params.set('category', selectedCategory);
      if (minimumRating > 0) params.set('rating', String(minimumRating));
      if (connectedOnly) params.set('connected', '1');
      params.set('sort', sortOrder);
      try {
        const response = await fetch(`/api/v1/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        if (!controller.signal.aborted) {
          const results = data.results || [];
          setBusinesses(results);
          setTotalResults(Number(data.total_results) || results.length);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchTerm, selectedCategory, minimumRating, connectedOnly, sortOrder, attempt]);

  function updateFilters(changes: Partial<DirectoryFilters>) {
    const next = { query: searchTerm, category: selectedCategory, rating: minimumRating, connected: connectedOnly, sort: sortOrder, ...changes };
    const params = new URLSearchParams();
    if (next.query) params.set('q', next.query);
    if (next.category !== 'Todos') params.set('categoria', next.category);
    if (next.rating > 0) params.set('rating', String(next.rating));
    if (next.connected) params.set('connected', '1');
    if (next.sort !== 'score') params.set('sort', next.sort);
    if (writeReview) params.set('accion', 'opinar');
    const nextUrl = `/verificar${params.size ? `?${params}` : ''}`;
    if (nextUrl === `${window.location.pathname}${window.location.search}`) return;
    setLoading(true);
    window.history.replaceState(null, '', nextUrl);
  }

  const clearFilters = () => updateFilters({ query: '', category: 'Todos', rating: 0, connected: false, sort: 'score' });
  const selectClass = 'min-h-12 w-full rounded-xl border border-op-strong bg-op-canvas px-3 text-base text-op-ink';
  const resultSummary = businesses.length < totalResults
    ? `Mostrando ${businesses.length.toLocaleString('es-MX')} de ${totalResults.toLocaleString('es-MX')} negocios encontrados`
    : `${totalResults.toLocaleString('es-MX')} ${totalResults === 1 ? 'negocio encontrado' : 'negocios encontrados'}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-op-green-dark"><ShieldCheck size={16} aria-hidden="true" /> Directorio de negocios en México</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{writeReview ? 'Tu experiencia empieza con un nombre.' : 'Conoce el negocio antes de comprar.'}</h1>
        <p className="mt-4 text-base leading-relaxed text-op-secondary">{writeReview ? 'Encuentra el negocio correcto para compartir tu opinión. Comprueba su nombre y dominio antes de continuar.' : 'Compara calificaciones, lee experiencias y conoce los datos detrás de cada negocio.'}</p>
      </div>

      <section aria-label="Buscar y filtrar negocios" className="mb-8 rounded-2xl border border-op-border bg-op-sheet p-4 shadow-flat sm:p-6">
        <label htmlFor="business-search" className="mb-2 block text-sm font-semibold">Nombre, sitio web, RFC o teléfono</label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-op-muted" />
          <input id="business-search" type="search" value={searchTerm} maxLength={200} onChange={(event) => updateFilters({ query: event.target.value })} placeholder="Ej. Luuna, luuna.mx o un RFC" autoComplete="off" className="min-h-14 w-full rounded-xl border border-op-strong bg-op-canvas py-3 pl-12 pr-14 text-base" />
          {searchTerm && <button type="button" onClick={() => updateFilters({ query: '' })} aria-label="Borrar búsqueda" className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-op-muted hover:bg-op-shaded"><X size={18} /></button>}
        </div>
        <div role="group" aria-label="Categorías de negocios" className="mt-4 flex flex-wrap gap-2">
          {[...CATEGORIES, ...(!CATEGORIES.includes(selectedCategory) ? [selectedCategory] : [])].map((category) => <button key={category} type="button" aria-pressed={selectedCategory === category} onClick={() => updateFilters({ category })} className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${selectedCategory === category ? 'border-op-blue bg-op-blue text-white' : 'border-op-border text-op-secondary hover:border-op-blue-border hover:bg-op-blue-soft'}`}>{category}</button>)}
        </div>
        <div className="mt-5 grid items-end gap-4 border-t border-op-border pt-5 md:grid-cols-3">
          <div>
            <label htmlFor="business-rating" className="mb-2 block text-sm font-semibold">Calificación de clientes</label>
            <select id="business-rating" value={minimumRating} onChange={(event) => updateFilters({ rating: Number(event.target.value) })} className={selectClass}>
              {[...RATINGS, ...(!RATINGS.includes(minimumRating) ? [minimumRating] : [])].sort((a, b) => a - b).map((rating) => <option key={rating} value={rating}>{rating === 0 ? 'Todas las calificaciones' : rating === 5 ? '5 estrellas' : `${numberFormat.format(rating)} estrellas o más`}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="business-sort" className="mb-2 block text-sm font-semibold">Ordenar negocios por</label>
            <select id="business-sort" value={sortOrder} onChange={(event) => updateFilters({ sort: event.target.value as SortOrder })} className={selectClass}>
              <option value="score">Mayor puntaje Opinio</option>
              <option value="rating">Mejor calificación de clientes</option>
              <option value="reviews">Más opiniones publicadas</option>
            </select>
          </div>
          <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${connectedOnly ? 'border-op-green-border bg-op-green-soft text-op-green-dark' : 'border-op-border text-op-secondary hover:bg-op-canvas'}`}>
            <input type="checkbox" checked={connectedOnly} onChange={(event) => updateFilters({ connected: event.target.checked })} className="size-4 shrink-0 accent-op-green" />
            <span>Con pedidos registrados</span>
          </label>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p role="status" aria-live="polite" className="text-op-secondary">{loading ? 'Buscando negocios…' : error ? 'La búsqueda no está disponible' : resultSummary}</p>
        {hasFilters && <button type="button" onClick={clearFilters} className="inline-flex min-h-11 items-center gap-2 font-semibold text-op-blue-dark underline underline-offset-4"><SlidersHorizontal size={16} aria-hidden="true" /> Limpiar filtros</button>}
      </div>
      {!loading && !error && businesses.length < totalResults && <p className="mb-5 rounded-xl border border-op-blue-border bg-op-blue-soft px-4 py-3 text-sm leading-relaxed text-op-blue-dark">La búsqueda muestra hasta 50 negocios. Ajusta la categoría o la calificación para encontrar más opciones.</p>}

      <section aria-label="Resultados de búsqueda" aria-busy={loading}>
        {loading ? <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">{[1, 2, 3, 4].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-op-border bg-op-sheet p-6"><div className="mb-5 size-12 rounded-xl bg-op-blue-soft" /><div className="mb-4 h-6 w-1/2 rounded bg-op-inset" /><div className="h-4 w-3/4 rounded bg-op-shaded" /></div>)}</div> : error ? (
          <div role="alert" className="rounded-2xl border border-op-strong bg-op-sheet p-8 text-center">
            <AlertCircle aria-hidden="true" className="mx-auto mb-3 text-op-muted" /><h2 className="text-xl font-semibold">No pudimos cargar los negocios</h2><p className="mt-2 text-sm text-op-secondary">Intenta de nuevo. Conservamos tu búsqueda y tus filtros.</p>
            <button type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }} className="op-button mx-auto mt-5"><RefreshCw size={16} aria-hidden="true" /> Reintentar</button>
          </div>
        ) : businesses.length ? <div className="grid gap-4 md:grid-cols-2">{businesses.map((business) => {
          const publishedCount = Number(business.review_count) || 0;
          const averageRating = Number(business.average_rating);
          const hasRating = publishedCount > 0 && business.average_rating !== null && Number.isFinite(averageRating);
          const hasScore = Number(business.effective_reviews_count) > 0 && business.trust_score !== null && Number.isFinite(Number(business.trust_score));
          const category = categoryStyle(business.category);
          const profileUrl = `/b/${encodeURIComponent(business.slug)}`;
          return <article key={business.id} className={`flex flex-col rounded-2xl border border-t-4 border-op-border bg-op-sheet p-5 shadow-flat sm:p-6 ${category.edge}`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-xl border text-lg font-semibold ${category.tile}`}>{business.brand_name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="mb-1 text-xs text-op-muted">{business.category}</p><h2 className="text-xl font-semibold tracking-tight"><Link href={profileUrl} className="break-words hover:text-op-blue-dark hover:underline">{business.brand_name}</Link></h2><p className="mt-1 break-words text-sm text-op-secondary">{business.domain || business.legal_name || 'Identidad comercial por completar'}</p></div>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-op-muted">Calificación de clientes</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StarRating rating={hasRating ? averageRating : 0} label={hasRating ? `${numberFormat.format(averageRating)} de 5 estrellas, promedio de opiniones publicadas` : 'Sin calificación de clientes todavía'} />
                <p className="font-data text-2xl font-semibold">{hasRating ? numberFormat.format(averageRating) : '—'}<span className="ml-1 text-sm font-normal text-op-muted">/ 5</span></p>
              </div>
              <Link href={`${profileUrl}#opiniones`} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-op-blue-dark underline decoration-op-blue-border underline-offset-4 hover:decoration-current">{publishedCount.toLocaleString('es-MX')} {publishedCount === 1 ? 'opinión publicada' : 'opiniones publicadas'}</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-op-canvas p-4 text-sm">
              <div><p className="text-xs text-op-muted">Puntaje Opinio</p><p className="mt-1 font-data font-semibold">{hasScore ? numberFormat.format(Number(business.trust_score)) : 'Sin datos'}{hasScore && <span className="ml-1 text-xs font-normal text-op-muted">/ 100</span>}</p></div>
              <div><p className="text-xs text-op-muted">Pedidos con invitación</p><p className="mt-1 font-data font-semibold">{business.observed_orders_count > 0 && business.coverage_percentage !== null ? `${numberFormat.format(Number(business.coverage_percentage))}%` : 'Sin datos'}</p></div>
            </div>
            <p className="mb-5 mt-3 text-xs font-medium text-op-green-dark">{evidenceLabel(business)}</p>
            <Link href={writeReview ? `/escribir-opinion/${encodeURIComponent(business.slug)}` : profileUrl} className="mt-auto flex min-h-12 items-center justify-between gap-3 rounded-xl border border-op-blue-border bg-op-blue-soft px-4 py-3 text-sm font-semibold text-op-blue-dark transition-colors hover:bg-op-blue hover:text-white"><span>{writeReview ? `Opinar sobre ${business.brand_name}` : 'Ver opiniones y perfil'}</span><ArrowRight className="shrink-0" size={17} aria-hidden="true" /></Link>
          </article>;
        })}</div> : (
          <div className="mx-auto max-w-2xl rounded-2xl border border-op-border bg-op-sheet p-8 text-center sm:p-12">
            <Search size={28} className="mx-auto mb-4 text-op-muted" aria-hidden="true" /><h2 className="break-words text-xl font-semibold">{searchTerm ? `No encontramos “${searchTerm}” con estos filtros` : 'No hay negocios con estos filtros'}</h2><p className="mt-3 text-sm leading-relaxed text-op-secondary">Prueba otro nombre o amplía la categoría, la calificación y el filtro de pedidos. Que un negocio no aparezca aquí no determina si es confiable.</p><button type="button" onClick={clearFilters} className="op-button mt-6">Explorar todos los negocios</button>
          </div>
        )}
      </section>
      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-op-muted">Las estrellas muestran el promedio de las opiniones publicadas. El puntaje Opinio sobre 100 es un indicador distinto que toma en cuenta los datos disponibles del negocio. Ni una calificación ni la presencia en el directorio garantizan una compra.</p>
    </div>
  );
}

export default function VerificarPage() {
  return <div className="flex min-h-screen flex-col bg-op-canvas text-op-ink"><Navbar /><main id="contenido" tabIndex={-1} className="flex-1"><Suspense fallback={<p role="status" className="p-12 text-center">Cargando directorio…</p>}><VerificarContent /></Suspense></main><Footer /></div>;
}
