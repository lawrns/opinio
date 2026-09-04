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
  CheckCircle2,
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
  pendingCasesCount = 0,
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
    <aside className="w-64 shrink-0 bg-white text-[#334155] border-r border-[#E2E8F0] flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-[#0F172A] hover:opacity-90 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-none text-[#0F172A] flex items-center gap-1">
              Opinio<span className="text-emerald-600">.mx</span>
            </span>
            <span className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase mt-0.5">
              Merchant OS
            </span>
          </div>
        </Link>

        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          PRO
        </span>
      </div>

      {/* Store Switcher */}
      <div className="p-3 border-b border-[#E2E8F0] relative bg-[#FAFAF8]">
        <button
          type="button"
          onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-all text-left group shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#334155] shrink-0 overflow-hidden font-semibold text-xs">
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
              <div className="text-xs font-semibold text-[#0F172A] truncate group-hover:text-emerald-700 transition-colors">
                {currentBusiness.brand_name}
              </div>
              <div className="text-[10px] text-[#64748B] truncate flex items-center gap-1">
                <span className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isTransparent ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )} />
                {isTransparent ? 'Cobertura Transparente' : 'Pedidos Conectados'}
              </div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#0F172A] transition-transform duration-150 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {storeDropdownOpen && (
          <div className="absolute top-full left-3 right-3 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
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
                      ? "bg-emerald-50 text-emerald-800 font-semibold"
                      : "text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  )}
                >
                  <div className="h-6 w-6 rounded bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[10px] shrink-0 font-bold text-[#334155]">
                    {b.brand_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[#0F172A]">{b.brand_name}</div>
                    <div className="text-[10px] text-[#64748B] truncate">
                      Score: {b.trust_score} • {b.coverage_percentage}% Cobertura
                    </div>
                  </div>
                  {b.slug === currentBusiness.slug && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
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
                  ? "bg-[#F4F2EB] text-[#0F172A] font-semibold border border-[#DDD7CD] shadow-xs"
                  : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-emerald-600" : "text-[#64748B] group-hover:text-[#0F172A]"
                  )}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.isNew && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    NUEVO
                  </span>
                )}
                {item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums",
                      item.badgeVariant === 'urgent'
                        ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                        : item.badgeVariant === 'success'
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : item.badgeVariant === 'warning'
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
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
      <div className="p-3 border-t border-[#E2E8F0] bg-[#FAFAF8] space-y-2">
        <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-[11px] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Sincronización</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Shopify Activo
            </span>
          </div>
          <div className="flex items-center justify-between text-[#64748B] text-[10px]">
            <span>Pedidos monitoreados</span>
            <span className="text-[#0F172A] font-mono font-semibold">
              {currentBusiness.observed_orders_count.toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        <Link
          href={`/b/${currentBusiness.slug}`}
          target="_blank"
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all group"
        >
          <span>Ver Pasaporte Público</span>
          <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </aside>
  );
}
