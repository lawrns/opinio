import Link from 'next/link';
import { Armchair, Smartphone, Sparkles, Gem, Shirt, Package, ArrowRight } from 'lucide-react';

const categories = [
  { name: 'Hogar y muebles', icon: Armchair, query: 'Hogar' },
  { name: 'Tecnología', icon: Smartphone, query: 'Electrónica' },
  { name: 'Belleza', icon: Sparkles, query: 'Belleza' },
  { name: 'Joyería', icon: Gem, query: 'Joyería' },
  { name: 'Moda', icon: Shirt, query: 'Moda' },
  { name: 'Servicios', icon: Package, query: 'Servicios' },
];

export function CategoryBar() {
  return (
    <section className="op-container pb-10 pt-10" aria-labelledby="categories-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="categories-title" className="text-lg font-semibold tracking-tight">Encuentra tu próxima compra</h2><Link href="/verificar" className="op-link">Todas las categorías <ArrowRight aria-hidden="true" className="size-4" /></Link></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map(({ name, icon: Icon, query }) => <Link key={name} href={`/verificar?categoria=${encodeURIComponent(query)}`} className="group flex min-h-16 items-center gap-3 rounded-op-control border border-op-border px-4 py-4 transition-colors hover:border-op-green hover:bg-op-green-soft"><Icon aria-hidden="true" className="size-5 shrink-0 text-op-secondary group-hover:text-op-green" /><span className="text-sm font-medium">{name}</span></Link>)}
      </div>
    </section>
  );
}
