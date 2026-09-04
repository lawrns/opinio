'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Search, RefreshCw, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

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
}

const CATEGORIES = ['Todos', 'Hogar', 'Electrónica', 'Belleza', 'Joyería', 'Muebles'];

function evidenceLabel(business: BusinessItem) {
  if (business.claimed && business.verified_level === 'transparent_coverage' && business.observed_orders_count > 0) return 'Cobertura de pedidos registrada';
  if (business.observed_orders_count > 0) return 'Con datos de pedidos';
  return business.claimed ? 'Perfil reclamado' : 'Información pública';
}

function VerificarContent() {
  const searchParams = useSearchParams();
  const writeReview = searchParams.get('accion') === 'opinar';
  const initialCategory = searchParams.get('categoria') || searchParams.get('cat') || 'Todos';
  const searchTerm = searchParams.get('q') || '';
  const selectedCategory = initialCategory;
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (selectedCategory !== 'Todos') params.set('category', selectedCategory);
      try {
        const response = await fetch(`/api/v1/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        if (!controller.signal.aborted) setBusinesses(data.results || []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchTerm, selectedCategory, attempt]);

  const updateFilters = (query: string, category: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'Todos') params.set('categoria', category);
    if (writeReview) params.set('accion', 'opinar');
    window.history.replaceState(null, '', `/verificar${params.size ? `?${params}` : ''}`);
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--op-verified-ink)]"><ShieldCheck size={16} aria-hidden="true" /> Directorio de negocios en México</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{writeReview ? 'Tu experiencia empieza con un nombre.' : 'Conoce el negocio antes de comprar.'}</h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--op-ink-secondary)]">{writeReview ? 'Encuentra el negocio correcto para compartir tu opinión. Comprueba su nombre y dominio antes de continuar.' : 'Busca un negocio y consulta sus opiniones, datos de identidad y atención a problemas en un solo lugar.'}</p>
      </div>
      <section aria-label="Buscar y filtrar negocios" className="mb-8 rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-4 sm:p-6">
        <label htmlFor="business-search" className="mb-2 block text-sm font-semibold">Nombre, sitio web, RFC o teléfono</label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--op-ink-muted)]" />
          <input id="business-search" type="search" value={searchTerm} onChange={(event) => updateFilters(event.target.value, selectedCategory)} placeholder="Ej. Luuna, luuna.mx o un RFC" autoComplete="off" className="min-h-14 w-full rounded-xl border border-[var(--op-border-strong)] bg-[var(--op-canvas)] py-3 pl-12 pr-14 text-base" />
          {searchTerm && <button type="button" onClick={() => updateFilters('', selectedCategory)} aria-label="Borrar búsqueda" className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--op-ink-muted)]"><X size={18} /></button>}
        </div>
        <div aria-label="Categorías" className="mt-4 flex flex-wrap gap-2">
          {[...CATEGORIES, ...(!CATEGORIES.includes(selectedCategory) ? [selectedCategory] : [])].map((category) => <button key={category} type="button" aria-pressed={selectedCategory === category} onClick={() => updateFilters(searchTerm, category)} className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${selectedCategory === category ? 'border-[var(--op-ink-primary)] bg-[var(--op-ink-primary)] text-[var(--op-sheet)]' : 'border-[var(--op-border-hairline)] text-[var(--op-ink-secondary)] hover:bg-[var(--op-shaded)]'}`}>{category}</button>)}
        </div>
      </section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p role="status" aria-live="polite" className="text-[var(--op-ink-secondary)]">{loading ? 'Buscando negocios…' : error ? 'La búsqueda no está disponible' : `${businesses.length} ${businesses.length === 1 ? 'negocio encontrado' : 'negocios encontrados'}`}</p>
        {(searchTerm || selectedCategory !== 'Todos') && <button onClick={() => updateFilters('', 'Todos')} className="min-h-11 font-semibold text-[var(--op-link)] underline underline-offset-4">Limpiar filtros</button>}
      </div>
      <section aria-label="Resultados de búsqueda" aria-busy={loading}>
        {loading ? <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">{[1, 2, 3, 4].map((item) => <div key={item} className="h-60 animate-pulse rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-6"><div className="mb-4 h-6 w-1/2 rounded bg-[var(--op-inset)]" /><div className="h-4 w-3/4 rounded bg-[var(--op-shaded)]" /></div>)}</div> : error ? <div role="alert" className="rounded-2xl border border-[var(--op-border-strong)] bg-[var(--op-sheet)] p-8 text-center"><AlertCircle className="mx-auto mb-3 text-[var(--op-ink-muted)]" /><h2 className="text-xl font-semibold">No pudimos cargar los negocios</h2><p className="mt-2 text-sm text-[var(--op-ink-secondary)]">Intenta de nuevo. Conservamos tu búsqueda y tus filtros.</p><button onClick={() => { setLoading(true); setAttempt((value) => value + 1); }} className="mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-full bg-[var(--op-ink-primary)] px-5 font-semibold text-[var(--op-sheet)]"><RefreshCw size={16} /> Reintentar</button></div> : businesses.length ? <div className="grid gap-4 md:grid-cols-2">{businesses.map((business) => {
          const hasScore = Number(business.effective_reviews_count) > 0 && business.trust_score !== null;
          return <article key={business.id} className="flex flex-col rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="mb-2 text-xs text-[var(--op-ink-muted)]">{business.category}</p><h2 className="text-xl font-semibold tracking-tight"><Link href={`/b/${business.slug}`} className="break-words hover:underline">{business.brand_name}</Link></h2><p className="mt-1 break-words text-sm text-[var(--op-ink-secondary)]">{business.domain || business.legal_name || 'Identidad comercial por completar'}</p></div><div className="shrink-0 text-right"><p className="font-data text-2xl font-semibold">{hasScore ? Number(business.trust_score).toLocaleString('es-MX', { maximumFractionDigits: 1 }) : '—'}</p><p className="text-xs text-[var(--op-ink-muted)]">{hasScore ? 'Opinio / 100' : 'Sin calificación'}</p></div></div>
            <p className="mt-5 text-xs font-medium text-[var(--op-verified-ink)]">{evidenceLabel(business)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--op-border-hairline)] pt-4 text-sm"><div><p className="font-data font-semibold">{Number(business.effective_reviews_count || 0).toLocaleString('es-MX')}</p><p className="text-xs text-[var(--op-ink-muted)]">Opiniones efectivas</p></div><div><p className="font-data font-semibold">{business.observed_orders_count > 0 && business.coverage_percentage !== null ? `${Number(business.coverage_percentage).toLocaleString('es-MX')}%` : 'Sin datos'}</p><p className="text-xs text-[var(--op-ink-muted)]">Pedidos con invitación</p></div></div>
            <Link href={writeReview ? `/escribir-opinion/${business.slug}` : `/b/${business.slug}`} className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[var(--op-canvas)] px-4 text-sm font-semibold text-[var(--op-link)] hover:bg-[var(--op-shaded)]"><span>{writeReview ? `Opinar sobre ${business.brand_name}` : 'Ver pasaporte de confianza'}</span><ArrowRight className="shrink-0" size={17} aria-hidden="true" /></Link>
          </article>;
        })}</div> : <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-8 text-center sm:p-12"><Search size={28} className="mx-auto mb-4 text-[var(--op-ink-muted)]" aria-hidden="true" /><h2 className="break-words text-xl font-semibold">{searchTerm ? `No encontramos “${searchTerm}”` : 'No hay negocios en esta categoría'}</h2><p className="mt-3 text-sm leading-relaxed text-[var(--op-ink-secondary)]">Prueba con el nombre comercial, el dominio sin “www” o elimina el filtro de categoría. Que un negocio no aparezca aquí no determina si es confiable.</p><button onClick={() => updateFilters('', 'Todos')} className="mt-6 min-h-11 rounded-full bg-[var(--op-ink-primary)] px-5 text-sm font-semibold text-[var(--op-sheet)]">Explorar todos los negocios</button></div>}
      </section>
      <p className="mt-8 max-w-2xl text-xs leading-relaxed text-[var(--op-ink-muted)]">Cada pasaporte distingue los datos disponibles de lo que aún no se ha confirmado. La presencia en el directorio y la calificación no garantizan una compra.</p>
    </div>
  );
}

export default function VerificarPage() {
  return <div className="flex min-h-screen flex-col bg-[var(--op-canvas)] text-[var(--op-ink-primary)]"><Navbar /><main id="contenido" className="flex-1"><Suspense fallback={<p role="status" className="p-12 text-center">Cargando directorio…</p>}><VerificarContent /></Suspense></main><Footer /></div>;
}
