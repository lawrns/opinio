'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Loader2 } from 'lucide-react';

interface SearchResult {
  id: number;
  slug: string;
  brand_name: string;
  category: string;
  domain: string | null;
  trust_score: number | string;
  effective_reviews_count: number;
  review_count: number;
  average_rating: number | null;
}

export function HomeSearch() {
  const router = useRouter();
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<{ query: string; results: SearchResult[]; error: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const trimmed = query.trim();
  const current = response?.query === trimmed ? response : null;
  const loading = trimmed.length >= 2 && !current;
  const results = current?.results ?? [];
  const expanded = open && trimmed.length >= 2;
  const searchHref = `/verificar?q=${encodeURIComponent(trimmed)}`;

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Search unavailable');
        const data = await res.json();
        if (!data.success) throw new Error('Search unavailable');
        if (!controller.signal.aborted) setResponse({ query: trimmed, results: data.results.slice(0, 5), error: false });
      } catch {
        if (!controller.signal.aborted) setResponse({ query: trimmed, results: [], error: true });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [trimmed]);

  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, expanded, id]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    setOpen(false);
    router.push(active >= 0 && results[active] ? `/b/${results[active].slug}` : searchHref);
  }

  return (
    <div ref={wrapper} className="relative w-full" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={id} className="mb-2.5 block text-sm font-semibold text-op-ink">¿Qué comercio quieres conocer?</label>
        <div className="flex items-center gap-2 rounded-op-card border border-op-strong bg-op-sheet p-2 shadow-flat transition-colors focus-within:border-op-green">
          <Search aria-hidden="true" className="ml-2 hidden size-5 shrink-0 text-op-muted sm:block" />
          <input id={id} name="q" value={query} autoComplete="off" spellCheck={false} maxLength={200}
            role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-results`} aria-activedescendant={active >= 0 && expanded && results[active] ? `${id}-option-${active}` : undefined}
            aria-describedby={`${id}-hint`} placeholder="Nombre, sitio web o WhatsApp"
            onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { setOpen(false); setActive(-1); }
              if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setOpen(true); setActive((index) => (index + 1) % results.length); }
              if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setOpen(true); setActive((index) => index <= 0 ? results.length - 1 : index - 1); }
            }}
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base text-op-ink placeholder:text-op-muted focus:outline-none" />
          <button type="submit" aria-label="Buscar comercios" disabled={!trimmed} className="op-button min-w-12 shrink-0 disabled:opacity-50">
            {loading ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <Search aria-hidden="true" className="size-5 sm:hidden" />}
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </div>
        <div className="sr-only" role="status">{expanded ? loading ? 'Buscando comercios' : current?.error ? 'Búsqueda no disponible' : `${results.length} sugerencias disponibles` : ''}</div>
        {expanded && <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-op-card border border-op-border bg-op-sheet text-left shadow-elevated">
          <ul id={`${id}-results`} role="listbox" aria-label="Sugerencias de comercios" className="max-h-72 overflow-y-auto">
            {results.map((business, index) => <li key={business.id} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
              onPointerDown={(event) => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => { setOpen(false); router.push(`/b/${business.slug}`); }}
              className={`flex cursor-pointer items-center justify-between gap-3 border-b border-op-border px-4 py-4 ${active === index ? 'bg-op-green-soft' : 'hover:bg-op-shaded'}`}>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{business.brand_name}</p><p className="mt-1 truncate text-xs text-op-muted">{business.domain || business.category}</p></div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-op-muted">{business.average_rating != null && <span className="font-semibold text-op-green-dark">{Number(business.average_rating).toFixed(1)} / 5</span>}<ArrowRight aria-hidden="true" className="size-4" /></div>
            </li>)}
          </ul>
          {loading && <p className="p-5 text-sm text-op-muted">Buscando en el directorio…</p>}
          {!loading && !results.length && <p className="p-5 text-sm leading-relaxed text-op-secondary">{current?.error ? 'No pudimos cargar las sugerencias. Abre el directorio para volver a intentar.' : 'No encontramos coincidencias. Prueba con el nombre comercial o su sitio web.'}</p>}
          {!loading && <Link href={searchHref} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between gap-3 bg-op-shaded px-4 py-3 text-sm font-semibold text-op-blue-dark">Ver resultados en el directorio <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>}
        </div>}
      </form>
      <p id={`${id}-hint`} className="mt-3 text-xs leading-relaxed text-op-muted">También puedes buscar por RFC. La información disponible cambia según cada comercio.</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-op-muted">
        <span>Prueba con</span>
        {['Luuna', 'doto', 'Ahal'].map((name) => <Link href={`/verificar?q=${encodeURIComponent(name)}`} className="inline-flex min-h-9 items-center gap-1 font-medium text-op-secondary underline decoration-op-strong underline-offset-4 hover:text-op-green" key={name}>{name}<ArrowRight aria-hidden="true" className="size-3" /></Link>)}
      </div>
    </div>
  );
}
