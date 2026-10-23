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
  return (
    <section className="op-container pb-12 pt-12" aria-labelledby="categories-title">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.09em] text-op-green-dark">
            Explora por giro comercial
          </p>
          <h2 id="categories-title" className="mt-1.5 text-2xl font-bold tracking-tight text-op-ink sm:text-3xl">
            Encuentra tu próxima compra
          </h2>
        </div>
        <Link
          href="/verificar"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-op-border bg-white px-4 py-2 text-sm font-semibold text-op-ink shadow-2xs transition-all hover:border-op-green hover:text-op-green-dark"
        >
          Explorar categorías <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
        {categories.map(({ name, subtitle, icon: Icon, query }) => {
          const count = counts
            ?.filter((row) => row.category.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX')))
            .reduce((total, row) => total + Number(row.businesses_count), 0);

          return (
            <Link
              key={name}
              href={`/verificar?categoria=${encodeURIComponent(query)}`}
              className="group relative flex min-h-36 flex-col justify-between rounded-2xl border border-op-border bg-white p-4 shadow-flat transition-all duration-200 hover:-translate-y-1 hover:border-[#00b67a] hover:shadow-elevated"
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
    </section>
  );
}
