import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Fingerprint, Receipt, ChatsCircle } from '@phosphor-icons/react/dist/ssr';
import type { Business } from '@/lib/types';
import { StarRating } from '@/components/StarRating';
import { HomeSearch } from './HomeSearch';

export function TrustGraphHero({ business }: { business?: Business }) {
  const score = business && Number(business.effective_reviews_count) > 0 ? Number(business.trust_score).toLocaleString('es-MX', { maximumFractionDigits: 1 }) : '—';
  return (
    <section className="border-b border-op-border">
      <div className="op-container grid items-center gap-12 py-12 md:py-16 lg:grid-cols-[1.2fr_0.85fr] lg:gap-20 lg:py-20">
        <div>
          <p className="op-eyebrow mb-6">Opiniones con contexto. Compras con confianza.</p>
          <h1 className="max-w-2xl text-[clamp(2.75rem,5vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.04em]">Antes de comprar,<br />conoce a quién<br /><span className="text-op-green-dark">le compras.</span></h1>
          <p className="mb-8 mt-6 max-w-lg text-base leading-relaxed text-op-secondary">Consulta opiniones, revisa la evidencia y descubre cómo responde un comercio cuando algo sale mal.</p>
          <HomeSearch />
        </div>
        <div className="relative min-w-0">
          <div className="mb-3 flex items-center justify-between px-1 text-xs font-medium text-op-muted"><span>EL PASAPORTE DE CONFIANZA</span><span>MÉXICO / MX</span></div>
          <div className="overflow-hidden rounded-op-card border border-op-strong bg-op-sheet shadow-elevated">
            <div className="flex items-center justify-between border-b border-op-border bg-op-green-soft px-6 py-3 text-xs font-medium text-op-green-dark"><span>La evidencia, a la vista</span><span className="font-mono">OP / 01</span></div>
            <div className="p-6 sm:p-8">
              {business ? <>
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0"><p className="text-xs text-op-muted">Un comercio del directorio</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{business.brand_name}</h2><p className="mt-1 break-words text-sm text-op-muted">{business.domain || business.category}</p></div>
                  <div className="text-right"><p className="font-mono text-4xl font-medium tracking-tight text-op-green-dark">{score}</p><p className="mt-1 text-xs text-op-muted">Puntaje Opinio / 100</p></div>
                </div>
                {Number(business.review_count) > 0 && business.average_rating != null && <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2"><StarRating rating={Number(business.average_rating)} size="sm" /><span className="text-sm font-semibold">{Number(business.average_rating).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5</span><span className="text-xs text-op-secondary">{Number(business.review_count).toLocaleString('es-MX')} opiniones</span></div>}
                <div className="my-6 h-1.5 overflow-hidden rounded-full bg-op-shaded" aria-hidden="true"><div className="h-full rounded-full bg-op-green" style={{ width: `${Number(business.effective_reviews_count) > 0 ? Math.min(100, Math.max(0, Number(business.trust_score) || 0)) : 0}%` }} /></div>
              </> : <div className="mb-6"><h2 className="text-2xl font-semibold tracking-tight">Más que una calificación.</h2><p className="mt-2 text-sm leading-relaxed text-op-secondary">Tres preguntas para conocer mejor a un comercio.</p></div>}
              <div className="divide-y divide-op-border">
                {[{ icon: Fingerprint, name: 'Quién vende', detail: business?.legal_name || 'Identidad y datos del comercio', label: 'EXISTE' }, { icon: Receipt, name: 'Cómo cumple', detail: business && business.observed_orders_count > 0 ? `${Number(business.coverage_percentage).toLocaleString('es-MX')}% de compradores invitados a opinar` : 'Opiniones y evidencia de compra', label: 'CUMPLE' }, { icon: ChatsCircle, name: 'Cómo responde', detail: 'Casos y seguimiento de soluciones', label: 'RESUELVE' }].map(({ icon: Icon, name, detail, label }) => <div key={label} className="flex items-start gap-3 py-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-op-green-soft text-op-green-dark"><Icon aria-hidden="true" className="size-5" weight="duotone" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{name}</h3><p className="mt-1 text-xs leading-relaxed text-op-muted">{detail}</p></div><span className="pt-1 text-xs font-medium tracking-wider text-op-muted">{label}</span></div>)}
              </div>
              <Link href={business ? `/b/${business.slug}` : '/verificar'} className="mt-5 flex min-h-12 items-center justify-between rounded-op-control bg-op-ink px-4 text-sm font-medium text-op-sheet transition-colors hover:bg-op-green-dark">{business ? 'Consultar este pasaporte' : 'Explorar el directorio'}<ArrowUpRight aria-hidden="true" className="size-4" /></Link>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 px-1 text-xs leading-relaxed text-op-muted"><ArrowRight aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />Cada dato cuenta una parte. Consulta las fuentes y el alcance en el perfil.</p>
        </div>
      </div>
    </section>
  );
}
