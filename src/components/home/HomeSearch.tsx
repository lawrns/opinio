'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Loader2 } from 'lucide-react';
import { trackStepStarted } from '@/lib/conversion/client';
import { StarRating } from '@/components/StarRating';

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
    // Intent only; the search text is never sent.
    trackStepStarted('consumer_discovery', 'search_submitted');
    setOpen(false);
    router.push(active >= 0 && results[active] ? `/b/${results[active].slug}` : searchHref);
  }

  return (
    <div
      ref={wrapper}
      className="relative w-full max-w-[580px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <form role="search" onSubmit={submit} data-cta="home_search_submit" className="relative">
        <label htmlFor={id} className="mb-2.5 block text-sm font-semibold text-op-ink">
          ¿Qué comercio quieres conocer?
        </label>
        <div className="flex min-h-[60px] items-center gap-2 rounded-full border-[1.5px] border-op-strong bg-white py-1.5 pl-5 pr-2 shadow-elevated transition-all focus-within:border-[#00b67a] focus-within:ring-4 focus-within:ring-[#00b67a]/15">
          <Search aria-hidden="true" className="size-5 shrink-0 text-op-muted" />
          <input
            id={id}
            name="q"
            value={query}
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={`${id}-results`}
            aria-activedescendant={active >= 0 && expanded && results[active] ? `${id}-option-${active}` : undefined}
            aria-describedby={`${id}-hint`}
            placeholder="Busca una tienda, sitio web o RFC…"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpen(false);
                setActive(-1);
              }
              if (event.key === 'ArrowDown' && results.length) {
                event.preventDefault();
                setOpen(true);
                setActive((index) => (index + 1) % results.length);
              }
              if (event.key === 'ArrowUp' && results.length) {
                event.preventDefault();
                setOpen(true);
                setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
              }
            }}
            className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-base text-op-ink placeholder:text-op-muted focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Buscar comercios"
            disabled={!trimmed}
            className="inline-flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#008b5d] px-6 text-[15px] font-semibold text-white shadow-2xs transition-all hover:bg-[#006845] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            ) : (
              <Search aria-hidden="true" className="size-5 sm:hidden" />
            )}
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </div>
        <div className="sr-only" role="status">
          {expanded
            ? loading
              ? 'Buscando comercios'
              : current?.error
                ? 'Búsqueda no disponible'
                : `${results.length} sugerencias disponibles`
            : ''}
        </div>
        {expanded && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2.5 overflow-hidden rounded-2xl border border-op-border bg-white text-left shadow-hero">
            <ul id={`${id}-results`} role="listbox" aria-label="Sugerencias de comercios" className="max-h-80 overflow-y-auto divide-y divide-op-border">
              {results.map((business, index) => (
                <li
                  key={business.id}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={active === index}
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/b/${business.slug}`);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
                    active === index ? 'bg-op-green-soft' : 'hover:bg-op-shaded'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-op-ink">{business.brand_name}</p>
                    <p className="mt-0.5 truncate text-xs text-op-muted">{business.domain || business.category}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5 text-xs text-op-muted">
                    {business.average_rating != null && Number(business.review_count) > 0 && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-op-ink">
                        <StarRating rating={Number(business.average_rating)} size="sm" />
                        <span className="font-mono text-xs">{Number(business.average_rating).toFixed(1)}</span>
                      </span>
                    )}
                    <ArrowRight aria-hidden="true" className="size-4 text-op-muted" />
                  </div>
                </li>
              ))}
            </ul>
            {loading && <p className="p-5 text-sm text-op-muted">Buscando en el directorio…</p>}
            {!loading && !results.length && (
              <p className="p-5 text-sm leading-relaxed text-op-secondary">
                {current?.error
                  ? 'No pudimos cargar las sugerencias. Abre el directorio para volver a intentar.'
                  : 'No encontramos coincidencias. Prueba con el nombre comercial o su sitio web.'}
              </p>
            )}
            {!loading && (
              <Link
                href={searchHref}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-between gap-3 bg-op-shaded px-5 py-3 text-sm font-semibold text-op-green-dark transition-colors hover:bg-op-green-soft"
              >
                Ver todos los resultados en el directorio <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            )}
          </div>
        )}
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-op-muted">
        <span className="font-medium text-op-secondary">Prueba con:</span>
        {['Luuna', 'doto', 'Ahal'].map((name) => (
          <Link
            href={`/verificar?q=${encodeURIComponent(name)}`}
            key={name}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-op-border bg-white px-3 py-1 text-xs font-medium text-op-ink shadow-2xs transition-all hover:border-[#00b67a] hover:bg-op-green-soft hover:text-op-green-dark"
          >
            {name}
            <ArrowRight aria-hidden="true" className="size-3 text-op-muted" />
          </Link>
        ))}
        <span id={`${id}-hint`} className="ml-1 text-xs text-op-muted">
          · También puedes buscar por RFC.
        </span>
      </div>
    </div>
  );
}
