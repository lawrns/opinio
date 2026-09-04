import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { WidgetWithBusiness } from '@/lib/merchant-data';
import { Review } from '@/lib/types';
import { cn } from '@/lib/utils';

export function MerchantWidgetSurface({ business, format, theme, review }: { business: WidgetWithBusiness; format: 'badge' | 'card' | 'reassurance'; theme: string; review?: Review | null }) {
  const dark = theme === 'dark';
  const secondary = dark ? 'text-op-border' : 'text-op-secondary';
  const accent = dark ? 'text-op-green-border' : 'text-op-green-dark';
  return <main id="contenido" tabIndex={-1} className="flex min-h-28 items-start justify-center p-3">
    <article aria-label={`Confianza de ${business.brand_name}`} className={cn('w-full max-w-md rounded-2xl border p-4', dark ? 'border-op-secondary bg-op-ink text-white' : 'border-op-border bg-op-sheet text-op-ink')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2"><ShieldCheck className={cn('h-6 w-6 shrink-0', accent)} aria-hidden="true" /><div className="min-w-0"><h1 className="break-words text-sm font-semibold">{business.brand_name}</h1><p className={cn('mt-0.5 text-xs', secondary)}>Perfil en Opinio.mx</p></div></div>
        <div className={cn('shrink-0 text-right', accent)}><p className="font-data text-lg font-bold">{business.trust_score}<span className="text-xs font-normal">/100</span></p><p className={cn('text-xs', secondary)}>Índice de confianza</p></div>
      </div>
      {format !== 'badge' && <dl className={cn('mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-xs', dark ? 'border-op-secondary' : 'border-op-border')}>
        <div><dt className={secondary}>Cobertura de invitaciones</dt><dd className="mt-1 font-data text-sm font-semibold">{business.coverage_percentage}%</dd></div>
        <div><dt className={secondary}>Casos resueltos</dt><dd className="mt-1 font-data text-sm font-semibold">{business.resolution_rate}%</dd></div>
        <div className="col-span-2"><dt className={secondary}>RFC registrado</dt><dd className="mt-1 break-words font-data">{business.rfc || 'Sin registro disponible'}</dd></div>
      </dl>}
      {format === 'card' && review && <blockquote className={cn('mt-4 border-t pt-4', dark ? 'border-op-secondary' : 'border-op-border')}><p className="text-sm leading-relaxed line-clamp-3">“{review.body}”</p><footer className={cn('mt-2 text-xs leading-relaxed', secondary)}>{review.author_name} · {review.rating}/5 · {review.verification_level === 'unverified_experience' ? 'Experiencia sin verificar' : review.verification_level === 'confirmed_payment' ? 'Pago confirmado' : review.verification_level === 'confirmed_store_order' ? 'Pedido conectado' : 'Comprobante revisado'}</footer></blockquote>}
      <Link href={`/b/${business.b_slug}`} target="_blank" rel="noopener noreferrer" className={cn('mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current', accent)}>Ver perfil y metodología <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">(nueva pestaña)</span></Link>
    </article>
  </main>;
}
