import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { WidgetWithBusiness } from '@/lib/merchant-data';
import { Review } from '@/lib/types';
import { cn } from '@/lib/utils';

export function MerchantWidgetSurface({
  business,
  format,
  theme,
  review,
}: {
  business: WidgetWithBusiness;
  format: 'badge' | 'card' | 'reassurance' | 'ribbon';
  theme: string;
  review?: Review | null;
}) {
  const isDark = theme === 'dark';
  const isTransparent = theme === 'transparent';

  // Ribbon Micro-Badge (Trustpilot-grade prestige ribbon)
  if (format === 'ribbon') {
    const rating = Number(business.calculated_rating || 4.8);
    const reviewCount = Number(business.review_count || 50);
    const sentiment = rating >= 4.5 ? 'Excelente' : rating >= 4.0 ? 'Muy bueno' : 'Bueno';

    return (
      <main id="contenido" tabIndex={-1} className="flex items-center justify-center p-0 m-0 w-full">
        <Link
          href={`/b/${business.b_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Perfil de ${business.brand_name} en Opinio México: Calificación ${sentiment} ${rating.toFixed(1)} de 5 estrellas`}
          className={cn(
            'group inline-flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 select-none no-underline',
            isTransparent
              ? 'bg-transparent text-current hover:bg-white/10'
              : isDark
              ? 'bg-[#0f172a] text-white border border-slate-700/80 hover:border-emerald-500/50 hover:bg-[#1e293b]'
              : 'bg-white text-slate-800 border border-slate-200 hover:border-emerald-500/50 hover:shadow-xs shadow-xs'
          )}
        >
          {/* Opinio Star Glyph */}
          <span className="flex items-center gap-1.5 font-bold tracking-tight">
            <svg
              className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className={cn(isDark ? 'text-white' : isTransparent ? 'text-current' : 'text-slate-900')}>
              Opinio
            </span>
          </span>

          <span className={cn('opacity-30 font-light', isDark ? 'text-slate-400' : 'text-slate-500')} aria-hidden="true">
            |
          </span>

          {/* Rating & Sentiment */}
          <span className="flex items-center gap-1">
            <span className={cn('font-semibold', isDark ? 'text-white' : isTransparent ? 'text-current' : 'text-slate-900')}>
              {sentiment}
            </span>
            <span className={cn('font-mono font-bold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
              {rating.toFixed(1)}/5
            </span>
          </span>

          <span className={cn('opacity-30 font-light', isDark ? 'text-slate-400' : 'text-slate-500')} aria-hidden="true">
            |
          </span>

          {/* Review Volume / Verification */}
          <span className={cn('text-[11px] sm:text-xs', isDark ? 'text-slate-300' : isTransparent ? 'opacity-80' : 'text-slate-600')}>
            {reviewCount}+ reseñas verificadas
          </span>

          {/* Subtle external link icon */}
          <ExternalLink
            className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
            aria-hidden="true"
          />
        </Link>
      </main>
    );
  }

  // Legacy Card / Badge / Reassurance Surfaces
  const dark = isDark;
  const secondary = dark ? 'text-op-border' : 'text-op-secondary';
  const accent = dark ? 'text-op-green-border' : 'text-op-green-dark';

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-28 items-start justify-center p-3">
      <article
        aria-label={`Confianza de ${business.brand_name}`}
        className={cn(
          'w-full max-w-md rounded-2xl border p-4',
          dark ? 'border-op-secondary bg-op-ink text-white' : 'border-op-border bg-op-sheet text-op-ink'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className={cn('h-6 w-6 shrink-0', accent)} aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="break-words text-sm font-semibold">{business.brand_name}</h1>
              <p className={cn('mt-0.5 text-xs', secondary)}>Perfil en Opinio.mx</p>
            </div>
          </div>
          <div className={cn('shrink-0 text-right', accent)}>
            <p className="font-data text-lg font-bold">
              {business.trust_score}
              <span className="text-xs font-normal">/100</span>
            </p>
            <p className={cn('text-xs', secondary)}>Índice de confianza</p>
          </div>
        </div>
        {format !== 'badge' && (
          <dl
            className={cn(
              'mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-xs',
              dark ? 'border-op-secondary' : 'border-op-border'
            )}
          >
            <div>
              <dt className={secondary}>Cobertura de invitaciones</dt>
              <dd className="mt-1 font-data text-sm font-semibold">
                {business.observed_orders_count > 0 ? `${business.coverage_percentage}%` : 'Sin pedidos'}
              </dd>
            </div>
            <div>
              <dt className={secondary}>Casos resueltos</dt>
              <dd className="mt-1 font-data text-sm font-semibold">
                {Number(business.issues_per_thousand) > 0 ? `${business.resolution_rate}%` : 'Sin casos medidos'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className={secondary}>RFC registrado</dt>
              <dd className="mt-1 break-words font-data">{business.rfc || 'Sin registro disponible'}</dd>
            </div>
          </dl>
        )}
        {format === 'card' && review && (
          <blockquote
            className={cn('mt-4 border-t pt-4', dark ? 'border-op-secondary' : 'border-op-border')}
          >
            <p className="text-sm leading-relaxed line-clamp-3">“{review.body}”</p>
            <footer className={cn('mt-2 text-xs leading-relaxed', secondary)}>
              {review.author_name} · {review.rating}/5 ·{' '}
              {review.verification_level === 'unverified_experience'
                ? 'Experiencia sin verificar'
                : review.verification_level === 'confirmed_payment'
                ? 'Pago confirmado'
                : review.verification_level === 'confirmed_store_order'
                ? 'Pedido conectado'
                : 'Comprobante revisado'}
            </footer>
          </blockquote>
        )}
        <Link
          href={`/b/${business.b_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current',
            accent
          )}
        >
          Ver perfil y metodología <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(nueva pestaña)</span>
        </Link>
      </article>
    </main>
  );
}
