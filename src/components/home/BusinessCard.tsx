import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { StarRating } from '@/components/StarRating';
import type { Business } from '@/lib/types';

export interface BusinessCardProps { business: Business }
const levels: Record<string, string> = {
  transparent_coverage: 'Cobertura de pedidos registrada',
  connected_orders: 'Pedidos conectados',
  identity_verified: 'Identidad verificada',
  claimed: 'Perfil reclamado',
  public_info: 'Información pública',
  unverified: 'Sin verificar',
};

export function BusinessCard({ business }: BusinessCardProps) {
  const hasOrders = business.observed_orders_count > 0;
  const hasScore = Number(business.effective_reviews_count) > 0 && business.trust_score !== null;
  const count = Number(business.review_count || 0);
  const hasIdentity = ['identity_verified', 'connected_orders', 'transparent_coverage'].includes(business.verified_level);
  return (
    <Link href={`/b/${business.slug}`} className="group flex h-full flex-col rounded-op-card border border-op-border bg-op-sheet p-5 shadow-flat transition-colors hover:border-op-blue sm:p-6">
      <div className="flex items-start gap-3">
        <BrandLogo name={business.brand_name} src={business.logo_url} category={business.category} />
        <div className="min-w-0 flex-1"><h3 className="text-lg font-semibold tracking-tight group-hover:text-op-blue-dark">{business.brand_name}</h3><p className="mt-1 truncate text-xs text-op-muted">{business.domain || business.category}</p></div>
        <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-op-muted" />
      </div>
      <div className="my-5">
        {count > 0 && business.average_rating != null ? <><div className="flex flex-wrap items-center gap-3"><StarRating rating={Number(business.average_rating)} size="sm" /><span className="font-data text-lg font-semibold">{Number(business.average_rating).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<span className="ml-1 text-xs font-normal text-op-muted">/ 5</span></span></div><p className="mt-2 text-xs text-op-secondary">{count.toLocaleString('es-MX')} {count === 1 ? 'opinión publicada' : 'opiniones publicadas'}</p></> : <p className="text-sm text-op-muted">Aún no tiene opiniones publicadas</p>}
      </div>
      <div className="mt-auto border-t border-op-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-op-secondary">{business.category}</span><span className="rounded-md bg-op-green-soft px-2 py-1 text-xs font-medium text-op-green-dark">Opinio {hasScore ? `${Number(business.trust_score).toLocaleString('es-MX', { maximumFractionDigits: 1 })} / 100` : 'sin puntaje'}</span></div>
        <p className={`mt-4 flex items-center gap-1.5 text-xs font-medium ${hasIdentity ? 'text-op-green-dark' : 'text-op-muted'}`}>{hasIdentity && <ShieldCheck aria-hidden="true" className="size-4" />}{levels[business.verified_level] || 'Evidencia por consultar'}</p>
        {hasOrders && <p className="mt-2 text-xs leading-relaxed text-op-muted">{Number(business.coverage_percentage).toLocaleString('es-MX', { maximumFractionDigits: 1 })}% de {Number(business.observed_orders_count).toLocaleString('es-MX')} pedidos registrados con invitación</p>}
      </div>
    </Link>
  );
}
