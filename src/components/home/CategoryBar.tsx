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
import { categoryStyle } from '@/lib/category-style';

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
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="op-container pb-10 pt-10" aria-labelledby="categories-title">
      {/* Reverse-engineered Trustpilot HeaderBar with Scroll Back / Scroll Forward Circular Controls */}
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
            className="inline-flex size-10 items-center justify-center rounded-full border border-op-strong bg-white text-op-ink transition-all hover:border-[#1b1a1b] hover:bg-op-shaded disabled:opacity-35"
          >
            <ArrowLeft aria-hidden="true" className="size-4.5" weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('forward')}
            disabled={atEnd}
            aria-label="Desplazar categorías hacia adelante"
            data-scroll-forward-button="true"
            className="inline-flex size-10 items-center justify-center rounded-full border border-op-strong bg-white text-op-ink transition-all hover:border-[#1b1a1b] hover:bg-op-shaded disabled:opacity-35"
          >
            <ArrowRight aria-hidden="true" className="size-4.5" weight="bold" />
          </button>
          <Link
            href="/verificar"
            data-view-all-categories-button="true"
            className="ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-op-strong bg-white px-4 py-2 text-sm font-bold text-op-ink transition-all hover:border-[#1b1a1b] hover:bg-op-shaded"
          >
            Ver todas
          </Link>
        </div>
      </div>

      {/* Horizontal Carousel with Left/Right Shadow Panels (Trustpilot styles_carouselContainer__U8y2A) */}
      <div className="relative">
        {!atStart && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-linear-to-r from-op-canvas to-transparent"
          />
        )}
        {!atEnd && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-linear-to-l from-op-canvas to-transparent"
          />
        )}

        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-8 lg:overflow-visible"
        >
          {categories.map(({ name, subtitle, icon: Icon, query }) => {
            const count = counts
              ?.filter((row) => row.category.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX')))
              .reduce((total, row) => total + Number(row.businesses_count), 0);

            return (
              <Link
                key={name}
                href={`/verificar?categoria=${encodeURIComponent(query)}`}
                className="group relative flex min-h-36 w-40 shrink-0 snap-start flex-col justify-between rounded-2xl border border-op-border bg-white p-4 shadow-flat transition-all duration-150 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-[#00b67a] hover:shadow-elevated lg:w-auto"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex size-11 items-center justify-center rounded-xl border ${categoryStyle(query).tile}`}>
                    <Icon aria-hidden="true" className="size-5.5" weight="duotone" />
                  </span>
                  <span className="flex size-6 items-center justify-center rounded-full bg-op-shaded text-op-muted transition-colors group-hover:bg-op-green-soft group-hover:text-op-green-dark">
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="block text-sm font-bold text-op-ink group-hover:text-op-green-dark">{name}</span>
                  {count !== undefined ? (
                    <span className="mt-0.5 block font-mono text-[11px] text-op-muted">
                      {count.toLocaleString('es-MX')} {count === 1 ? 'comercio' : 'comercios'}
                    </span>
                  ) : (
                    <span className="mt-0.5 line-clamp-1 block text-[11px] text-op-muted">{subtitle}</span>
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
