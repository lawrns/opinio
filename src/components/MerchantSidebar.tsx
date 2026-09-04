'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Star,
  Inbox,
  Send,
  BarChart3,
  Code2,
  Plug,
  Settings,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Store,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { Business } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MerchantSidebarProps {
  currentBusiness: Business;
  allBusinesses: Business[];
  pendingCasesCount?: number;
}

export function MerchantSidebar({
  currentBusiness,
  allBusinesses,
  pendingCasesCount = 3,
}: MerchantSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [storeDropdownOpen, setStoreDropdownOpen] = React.useState(false);

  // Preserve ?business= slug in navigation links
  const businessParam = searchParams.get('business') || currentBusiness.slug;
  const createHref = (basePath: string) => {
    return `${basePath}?business=${encodeURIComponent(businessParam)}`;
  };

  const navItems = [
    {
      label: 'Resumen',
      href: createHref('/merchant'),
      basePath: '/merchant',
      exact: true,
      icon: LayoutDashboard,
    },
    {
      label: 'Opiniones',
      href: createHref('/merchant/reviews'),
      basePath: '/merchant/reviews',
      icon: Star,
      badge: currentBusiness.effective_reviews_count > 0 ? String(currentBusiness.effective_reviews_count) : undefined,
    },
    {
      label: 'Bandeja de Resolución',
      href: createHref('/merchant/inbox'),
      basePath: '/merchant/inbox',
      icon: Inbox,
      badge: pendingCasesCount > 0 ? String(pendingCasesCount) : undefined,
      badgeVariant: 'urgent' as const,
    },
    {
      label: 'Solicitudes de Cobertura',
      href: createHref('/merchant/requests'),
      basePath: '/merchant/requests',
      icon: Send,
      badge: `${currentBusiness.coverage_percentage}%`,
      badgeVariant: Number(currentBusiness.coverage_percentage) >= 90 ? 'success' as const : 'warning' as const,
    },
    {
      label: 'Insights y Métricas',
      href: createHref('/merchant/insights'),
      basePath: '/merchant/insights',
      icon: BarChart3,
    },
    {
      label: 'Widgets Embebidos',
      href: createHref('/merchant/widgets'),
      basePath: '/merchant/widgets',
      icon: Code2,
      isNew: true,
    },
    {
      label: 'Integraciones',
      href: createHref('/merchant/integrations'),
      basePath: '/merchant/integrations',
      icon: Plug,
    },
    {
      label: 'Configuración',
      href: createHref('/merchant/settings'),
      basePath: '/merchant/settings',
      icon: Settings,
    },
  ];

  const handleSelectBusiness = (slug: string) => {
    setStoreDropdownOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('business', slug);
    router.push(`${pathname}?${params.toString()}`);
  };

  const isTransparent = currentBusiness.verified_level === 'transparent_coverage';

  return (
    <aside className="w-64 shrink-0 bg-zinc-950 text-zinc-300 border-r border-zinc-800/80 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-zinc-800/80 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:opacity-90 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-none text-zinc-100 flex items-center gap-1.5">
              Opinio<span className="text-emerald-400">.mx</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase mt-0.5">
              Merchant OS
            </span>
          </div>
        </Link>

        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
          PRO
        </span>
      </div>

      {/* Store Switcher */}
      <div className="p-3 border-b border-zinc-800/60 relative">
        <button
          type="button"
          onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800 transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200 shrink-0 overflow-hidden font-semibold text-xs">
              {currentBusiness.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentBusiness.logo_url}
                  alt={currentBusiness.brand_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                currentBusiness.brand_name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
                {currentBusiness.brand_name}
              </div>
              <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                <span className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isTransparent ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                )} />
                {isTransparent ? 'Cobertura Transparente' : 'Pedidos Conectados'}
              </div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-150 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {storeDropdownOpen && (
          <div className="absolute top-full left-3 right-3 mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              Mis Tiendas Verificadas
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {allBusinesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBusiness(b.slug)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors",
                    b.slug === currentBusiness.slug
                      ? "bg-emerald-500/10 text-emerald-300 font-medium"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  <div className="h-6 w-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                    {b.brand_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{b.brand_name}</div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      Score: {b.trust_score} • {b.coverage_percentage}% Cobertura
                    </div>
                  </div>
                  {b.slug === currentBusiness.slug && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.basePath
            : pathname.startsWith(item.basePath);

          const Icon = item.icon;

          return (
            <Link
              key={item.basePath}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all",
                isActive
                  ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"
                  )}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.isNew && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    NUEVO
                  </span>
                )}
                {item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums",
                      item.badgeVariant === 'urgent'
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                        : item.badgeVariant === 'success'
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : item.badgeVariant === 'warning'
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Passport Connection Health & Direct Public Link */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 space-y-2">
        <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Sincronización</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Shopify Activo
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400 text-[10px]">
            <span>Pedidos monitoreados</span>
            <span className="text-zinc-200 font-mono font-medium">
              {currentBusiness.observed_orders_count.toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        <Link
          href={`/b/${currentBusiness.slug}`}
          target="_blank"
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 hover:border-emerald-700 transition-all group"
        >
          <span>Ver Pasaporte Público</span>
          <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </aside>
  );
}
