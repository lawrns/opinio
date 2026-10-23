'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Armchair,
  Bed,
  DeviceMobile,
  Sparkle,
  Diamond,
  ForkKnife,
  FirstAidKit,
  Barbell,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
} from '@phosphor-icons/react/dist/ssr';

export interface CategoryCount {
  category: string;
  businesses_count: number;
}

const categories = [
  { name: 'Restaurantes', subtitle: 'Cafés, bares y comida', icon: ForkKnife, query: 'Restaurantes' },
  { name: 'Salud', subtitle: 'Ópticas, clínicas y farmacia', icon: FirstAidKit, query: 'Salud' },
  { name: 'Fitness', subtitle: 'Gimnasios y equipamiento', icon: Barbell, query: 'Fitness' },
  { name: 'Hogar', subtitle: 'Colchones, blancos y jardín', icon: Bed, query: 'Hogar' },
  { name: 'Tecnología', subtitle: 'Cómputo, audio y móviles', icon: DeviceMobile, query: 'Electrónica' },
  { name: 'Belleza', subtitle: 'Cuidado personal y piel', icon: Sparkle, query: 'Belleza' },
  { name: 'Joyería', subtitle: 'Relojes, plata y diseño', icon: Diamond, query: 'Joyería' },
  { name: 'Muebles', subtitle: 'Salas, comedores y estudio', icon: Armchair, query: 'Muebles' },
];

function formatInt(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function CategoryBar({ counts }: { counts?: CategoryCount[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const handleScroll = useCallback((direction: 'back' | 'forward') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = Math.max(280, Math.round(el.clientWidth * 0.65));
    el.scrollTo({
      left: direction === 'forward' ? el.scrollLeft + distance : el.scrollLeft - distance,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const canScroll = el.scrollWidth > el.clientWidth + 4;
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(!canScroll || el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="op-container pb-10 pt-10" aria-labelledby="categories-title">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="categories-title" className="text-2xl font-extrabold tracking-tight text-op-ink sm:text-[28px]">
            ¿Qué estás buscando?
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll('back')}
            disabled={atStart}
            aria-label="Desplazar categorías hacia atrás"
            data-scroll-back-button="true"
            className="inline-flex size-10 items-center justify-center rounded-full border border-op-border bg-white text-op-ink transition-colors hover:border-op-strong hover:bg-op-shaded disabled:opacity-35 lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('forward')}
            disabled={atEnd}
            aria-label="Desplazar categorías hacia adelante"
            data-scroll-forward-button="true"
            className="inline-flex size-10 items-center justify-center rounded-full border border-op-border bg-white text-op-ink transition-colors hover:border-op-strong hover:bg-op-shaded disabled:opacity-35 lg:hidden"
          >
            <ArrowRight aria-hidden="true" className="size-4.5" />
          </button>
          <Link
            href="/verificar"
            data-view-all-categories-button="true"
            className="ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-op-border bg-white px-4 py-2 text-sm font-semibold text-op-ink transition-colors hover:border-op-strong hover:bg-op-shaded"
          >
            Ver todas
          </Link>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-8 lg:overflow-visible"
        >
          {categories.map(({ name, subtitle, icon: Icon, query }) => {
            const count = counts
              ?.filter((row) => row.category.toLowerCase().includes(query.toLowerCase()))
              .reduce((total, row) => total + Number(row.businesses_count), 0);

            return (
              <Link
                key={name}
                href={`/verificar?categoria=${encodeURIComponent(query)}`}
                className="group relative flex min-h-36 w-40 shrink-0 snap-start flex-col justify-between rounded-2xl border border-op-border bg-white p-4 shadow-flat transition-all duration-150 hover:-translate-y-0.5 hover:border-op-strong hover:shadow-elevated lg:w-auto"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-op-border bg-[#fcfbf3] text-op-ink transition-colors group-hover:border-op-green-border group-hover:bg-op-green-soft group-hover:text-op-green-dark">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#f4f6f4] text-op-muted transition-colors group-hover:text-op-ink">
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-op-ink">{name}</span>
                  {count !== undefined ? (
                    <span className="mt-0.5 block font-mono text-[11px] text-op-muted">
                      {formatInt(count)} {count === 1 ? 'comercio' : 'comercios'}
                    </span>
                  ) : (
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-op-muted">
                      {subtitle}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
