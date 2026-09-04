'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Star, Inbox, Send, BarChart3, Code2, Plug, Settings, ShieldCheck, ExternalLink } from 'lucide-react';
import { Business } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MerchantSidebarProps {
  currentBusiness: Business;
  allBusinesses: Business[];
  pendingCasesCount?: number;
}

export function MerchantSidebar({ currentBusiness, allBusinesses, pendingCasesCount = 0 }: MerchantSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navItems = [
    { label: 'Resumen', path: '/merchant', icon: LayoutDashboard },
    { label: 'Opiniones', path: '/merchant/reviews', icon: Star },
    { label: 'Resolver casos', path: '/merchant/inbox', icon: Inbox, count: pendingCasesCount },
    { label: 'Invitar clientes', path: '/merchant/requests', icon: Send },
    { label: 'Métricas', path: '/merchant/insights', icon: BarChart3 },
    { label: 'Widgets', path: '/merchant/widgets', icon: Code2 },
    { label: 'Integraciones', path: '/merchant/integrations', icon: Plug },
    { label: 'Configuración', path: '/merchant/settings', icon: Settings },
  ];

  return (
    <aside className="shrink-0 border-b border-op-border bg-op-sheet text-op-secondary lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-op-border px-4 py-3">
        <Link href="/" aria-label="Opinio.mx, inicio" className="flex items-center gap-2 font-bold text-op-ink">
          <ShieldCheck className="h-7 w-7 text-op-green" aria-hidden="true" />
          <span className="text-xl tracking-tight">Opinio<span className="text-op-green">.mx</span></span>
        </Link>
        <span className="text-xs text-op-muted lg:hidden">Para negocios</span>
      </div>
      <div className="px-4 py-3">
        <label htmlFor="merchant-business" className="mb-1.5 block text-xs font-semibold text-op-muted">Negocio seleccionado</label>
        <select
          id="merchant-business"
          value={currentBusiness.slug}
          onChange={(event) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('business', event.target.value);
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="min-h-11 w-full rounded-xl border border-op-border bg-op-canvas px-3 text-base font-semibold text-op-ink"
        >
          {allBusinesses.map((business) => <option key={business.id} value={business.slug}>{business.brand_name}</option>)}
        </select>
      </div>
      <nav aria-label="Panel del negocio" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:py-2">
        {navItems.map(({ label, path, icon: Icon, count }) => {
          const active = path === '/merchant' ? pathname === path : pathname.startsWith(path);
          return (
            <Link
              key={path}
              href={`${path}?business=${encodeURIComponent(currentBusiness.slug)}`}
              aria-current={active ? 'page' : undefined}
              className={cn('flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-op-green-soft text-op-green-dark' : 'text-op-secondary hover:bg-op-shaded hover:text-op-ink')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
              {!!count && <span className="ml-auto rounded-full bg-op-danger-soft px-2 text-xs font-semibold text-op-danger">{count}<span className="sr-only"> pendientes</span></span>}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-op-border p-4 lg:block">
        <p className="mb-3 text-xs leading-relaxed text-op-muted">{currentBusiness.observed_orders_count.toLocaleString('es-MX')} pedidos registrados · {currentBusiness.coverage_percentage}% de cobertura</p>
        <Link href={`/b/${currentBusiness.slug}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-op-border text-sm font-semibold text-op-green-dark hover:bg-op-green-soft">
          Ver perfil público <ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only">(nueva pestaña)</span>
        </Link>
      </div>
    </aside>
  );
}
