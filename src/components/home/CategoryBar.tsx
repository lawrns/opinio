import Link from 'next/link';
import { Armchair, Bed, DeviceMobile, Sparkle, Diamond, TShirt, Storefront, Coffee, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { categoryStyle } from '@/lib/category-style';

export interface CategoryCount { category: string; businesses_count: number }
const categories = [
  { name: 'Hogar', icon: Bed, query: 'Hogar' },
  { name: 'Muebles', icon: Armchair, query: 'Muebles' },
  { name: 'Tecnología', icon: DeviceMobile, query: 'Electrónica' },
  { name: 'Belleza', icon: Sparkle, query: 'Belleza' },
  { name: 'Joyería', icon: Diamond, query: 'Joyería' },
  { name: 'Moda', icon: TShirt, query: 'Moda' },
  { name: 'Servicios', icon: Storefront, query: 'Servicios' },
  { name: 'Café', icon: Coffee, query: 'Café' },
];

export function CategoryBar({ counts }: { counts?: CategoryCount[] }) {
  return (
    <section className="op-container pb-12 pt-10" aria-labelledby="categories-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="categories-title" className="text-lg font-semibold tracking-tight">Encuentra tu próxima compra</h2><Link href="/verificar" className="op-link">Explorar categorías <ArrowRight aria-hidden="true" className="size-4" /></Link></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {categories.map(({ name, icon: Icon, query }) => {
          const count = counts?.filter((row) => row.category.toLocaleLowerCase('es-MX').includes(query.toLocaleLowerCase('es-MX'))).reduce((total, row) => total + Number(row.businesses_count), 0);
          return <Link key={name} href={`/verificar?categoria=${encodeURIComponent(query)}`} className="group flex min-h-32 flex-col items-start rounded-op-control border border-op-border bg-op-sheet p-4 transition-all hover:-translate-y-0.5 hover:border-op-green-border hover:shadow-flat"><span className={`mb-3 flex size-11 items-center justify-center rounded-full border ${categoryStyle(query).tile}`}><Icon aria-hidden="true" className="size-6" weight="duotone" /></span><span className="text-sm font-semibold group-hover:text-op-green-dark">{name}</span>{count !== undefined && <span className="mt-1 text-xs text-op-muted">{count.toLocaleString('es-MX')} {count === 1 ? 'comercio' : 'comercios'}</span>}</Link>;
        })}
      </div>
    </section>
  );
}
