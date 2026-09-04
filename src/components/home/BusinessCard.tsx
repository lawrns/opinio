import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { Business } from '@/lib/types';

export interface BusinessCardProps { business: Business }
const levels: Record<string, string> = {
  transparent_coverage: 'Cobertura transparente',
  connected_orders: 'Pedidos conectados',
  identity_verified: 'Identidad verificada',
  claimed: 'Perfil reclamado',
  public_info: 'Información pública',
  unverified: 'Sin verificar',
};

export function BusinessCard({ business }: BusinessCardProps) {
  const hasOrders = business.observed_orders_count > 0;
  const hasReviews = Number(business.effective_reviews_count) > 0;
  const hasIdentity = ['identity_verified', 'connected_orders', 'transparent_coverage'].includes(business.verified_level);
  return (
    <Link href={`/b/${business.slug}`} className="group flex h-full flex-col rounded-op-card border border-op-border bg-op-sheet p-5 shadow-flat transition-colors hover:border-op-green sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-op-control border border-op-border bg-op-shaded text-sm font-semibold">{business.brand_name.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><h3 className="text-base font-semibold tracking-tight group-hover:text-op-green">{business.brand_name}</h3><p className="mt-1 truncate text-xs text-op-muted">{business.domain || business.category}</p></div>
        <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-op-muted" />
      </div>
      <div className="my-5 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-medium tracking-tight">{hasReviews ? Number(business.trust_score).toLocaleString('es-MX', { maximumFractionDigits: 1 }) : '—'}</span>
        <span className="text-xs text-op-muted">{hasReviews ? '/ 100 · Puntaje Opinio' : 'Sin opiniones suficientes'}</span>
      </div>
      <div className="mt-auto border-t border-op-border pt-4">
        <div className="flex items-center justify-between gap-2 text-xs"><span className="text-op-secondary">Compradores invitados</span><span className="font-mono font-medium">{hasOrders ? `${Number(business.coverage_percentage).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%` : 'Sin conexión'}</span></div>
        {hasOrders && <p className="mt-1 text-[11px] text-op-muted">de {business.observed_orders_count.toLocaleString('es-MX')} pedidos registrados</p>}
        <p className={`mt-4 flex items-center gap-1.5 text-xs font-medium ${hasIdentity ? 'text-op-green-dark' : 'text-op-muted'}`}>{hasIdentity && <ShieldCheck aria-hidden="true" className="size-4" />}{levels[business.verified_level] || 'Evidencia por consultar'}</p>
      </div>
    </Link>
  );
}
