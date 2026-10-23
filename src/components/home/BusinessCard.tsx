import Link from 'next/link';
import { meetsEvidenceThreshold } from '@/lib/evidence-threshold';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { StarRating, ratingSentimentLabel } from '@/components/StarRating';
import type { Business } from '@/lib/types';

export interface BusinessCardProps {
  business: Business;
}

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
  const hasScore = meetsEvidenceThreshold(business.verified_reviews_count) && business.trust_score !== null;
  const count = Number(business.review_count || 0);
  const hasIdentity = ['identity_verified', 'connected_orders', 'transparent_coverage'].includes(
    business.verified_level
  );

  return (
    <Link
      href={`/b/${business.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-op-border bg-white p-5 shadow-flat transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00b67a] hover:shadow-elevated sm:p-6"
    >
      <div className="flex items-start gap-3.5">
        <BrandLogo name={business.brand_name} src={business.logo_url} category={business.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-lg font-bold tracking-tight text-op-ink group-hover:text-op-green-dark">
              {business.brand_name}
            </h3>
            {hasIdentity && <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-[#00b67a]" />}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-op-muted">{business.domain || business.category}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-op-shaded text-op-muted transition-colors group-hover:bg-op-green-soft group-hover:text-op-green-dark">
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </span>
      </div>

      <div className="my-5 rounded-xl bg-op-canvas px-3.5 py-3">
        {count > 0 && business.average_rating != null ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <StarRating rating={Number(business.average_rating)} size="sm" />
              <span className="text-xs font-bold text-op-ink">
                {ratingSentimentLabel(Number(business.average_rating))}
              </span>
              <span className="font-data text-sm font-bold text-op-ink">
                {Number(business.average_rating).toLocaleString('es-MX', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                <span className="ml-0.5 text-xs font-normal text-op-muted">/5</span>
              </span>
            </div>
            <p className="mt-1.5 text-xs text-op-secondary">
              {count.toLocaleString('es-MX')} {count === 1 ? 'opinión publicada' : 'opiniones publicadas'}
            </p>
          </>
        ) : (
          <p className="text-xs font-medium text-op-muted">Aún no tiene opiniones publicadas</p>
        )}
      </div>

      <div className="mt-auto border-t border-op-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-op-border bg-op-shaded px-2.5 py-0.5 text-xs font-medium text-op-secondary">
            {business.category}
          </span>
          <span className="rounded-full border border-op-green-border bg-op-green-soft px-2.5 py-0.5 font-mono text-xs font-bold text-op-green-dark">
            Opinio {hasScore ? `${Number(business.trust_score).toLocaleString('es-MX', { maximumFractionDigits: 1 })} / 100` : 'sin puntaje'}
          </span>
        </div>
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${hasIdentity ? 'text-op-green-dark' : 'text-op-muted'}`}>
          {hasIdentity && <ShieldCheck aria-hidden="true" className="size-3.5" />}
          {levels[business.verified_level] || 'Evidencia por consultar'}
        </p>
        {hasOrders && (
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-op-muted">
            {Number(business.coverage_percentage).toLocaleString('es-MX', { maximumFractionDigits: 1 })}% de{' '}
            {Number(business.observed_orders_count).toLocaleString('es-MX')} pedidos registrados con invitación
          </p>
        )}
      </div>
    </Link>
  );
}
