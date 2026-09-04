import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MessageSquareText, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { StarRating } from '@/components/StarRating';
import { categoryStyle } from '@/lib/category-style';
import { CategoryBar, type CategoryCount } from '@/components/home/CategoryBar';
import { BusinessCard } from '@/components/home/BusinessCard';
import { TrustGraphHero } from '@/components/home/TrustGraphHero';
import { ConnectedPipeline } from '@/components/home/ConnectedPipeline';
import { query } from '@/lib/db';
import type { Business, ReviewVerificationLevel } from '@/lib/types';

interface RecentReview {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  author_name: string;
  verification_level: ReviewVerificationLevel;
  created_at: string;
  brand_name: string;
  slug: string;
  category: string;
}
const evidenceLabels: Record<ReviewVerificationLevel, string> = {
  confirmed_payment: 'Pago confirmado',
  confirmed_store_order: 'Pedido confirmado',
  reviewed_proof: 'Comprobante revisado',
  unverified_experience: 'Sin comprobante verificado',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [businessResult, reviewResult, categoryResult] = await Promise.allSettled([
    query<Business>(`SELECT b.*, stats.review_count, stats.average_rating FROM businesses b
      CROSS JOIN LATERAL (SELECT COUNT(*)::int AS review_count, ROUND(AVG(r.rating), 1) AS average_rating
        FROM reviews r WHERE r.business_id = b.id AND r.status = 'published') stats
      ORDER BY b.trust_score DESC, b.id ASC LIMIT 6`),
    query<RecentReview>(`SELECT * FROM (SELECT DISTINCT ON (r.business_id)
      r.id, r.rating, r.title, r.body, r.author_name, r.verification_level, r.created_at,
      b.brand_name, b.slug, b.category FROM reviews r JOIN businesses b ON r.business_id = b.id
      WHERE r.status = 'published' ORDER BY r.business_id, r.created_at DESC, r.id DESC) latest
      ORDER BY created_at DESC, id DESC LIMIT 6`),
    query<CategoryCount>('SELECT category, COUNT(*)::int AS businesses_count FROM businesses GROUP BY category'),
  ]);
  const businesses = businessResult.status === 'fulfilled' ? businessResult.value.rows : [];
  const reviews = reviewResult.status === 'fulfilled' ? reviewResult.value.rows : [];
  return (
    <div className="flex min-h-screen flex-col bg-op-canvas text-op-ink">
      <Navbar />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <TrustGraphHero business={businesses[0]} />
        <CategoryBar counts={categoryResult.status === 'fulfilled' ? categoryResult.value.rows : undefined} />
        <section className="op-container pb-16 pt-3" aria-labelledby="businesses-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="op-eyebrow mb-3">El directorio</p><h2 id="businesses-title" className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Comercios para conocer mejor</h2><p className="mt-2 text-sm text-op-secondary">Consulta su puntaje, sus opiniones y la evidencia disponible.</p></div>
            <Link href="/verificar" className="op-link">Explorar todos <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
          {businesses.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{businesses.map((business) => <BusinessCard key={business.id} business={business} />)}</div> : <div className="rounded-op-card border border-op-border bg-op-sheet p-8"><p className="font-medium">{businessResult.status === 'rejected' ? 'El directorio no está disponible por el momento.' : 'Todavía no hay comercios para mostrar.'}</p><p className="mt-2 text-sm text-op-secondary">Puedes abrir el buscador e intentarlo de nuevo.</p><Link href="/verificar" className="op-link mt-3">Ir al buscador <ArrowRight aria-hidden="true" className="size-4" /></Link></div>}
        </section>
        <section className="border-y border-op-border bg-op-blue-soft" aria-labelledby="opinion-title">
          <div className="op-container flex flex-col justify-between gap-6 py-8 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4"><MessageSquareText aria-hidden="true" className="mt-1 size-6 shrink-0 text-op-blue-dark" /><div><h2 id="opinion-title" className="text-xl font-semibold tracking-tight">Tu experiencia le sirve a alguien más.</h2><p className="mt-2 text-sm text-op-secondary">Cuéntanos cómo te fue. Empieza eligiendo el comercio donde compraste.</p></div></div>
            <Link href="/verificar?accion=opinar" className="op-button shrink-0">Escribir una opinión <ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
        </section>
        <section className="op-container op-section" aria-labelledby="reviews-title">
          <div className="mb-6"><p className="op-eyebrow mb-3">Voces de compradores</p><h2 id="reviews-title" className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Experiencias que hacen la diferencia</h2><p className="mt-2 text-sm text-op-secondary">Una opinión reciente por comercio, con su nivel de evidencia visible.</p></div>
          {reviews.length ? <div className="grid gap-4 md:grid-cols-3">{reviews.map((review) => <article key={review.id} className="flex flex-col rounded-op-card border border-op-border bg-op-sheet p-6">
            <div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold"><span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-xs ${categoryStyle(review.category).tile}`}>{review.author_name.slice(0, 1).toUpperCase()}</span><span className="break-words">{review.author_name}</span></span><time dateTime={new Date(review.created_at).toISOString()} className="text-xs text-op-muted">{new Date(review.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' })}</time></div>
            <div className="mb-4 mt-4"><StarRating rating={review.rating} size="sm" /></div>
            {review.title && <h3 className="mb-2 text-base font-semibold leading-snug">{review.title}</h3>}
            <p className="line-clamp-4 text-sm leading-relaxed text-op-secondary">{review.body}</p>
            <p className="mb-5 mt-4 text-xs text-op-secondary">{evidenceLabels[review.verification_level] || 'Sin comprobante verificado'}</p>
            <Link href={`/b/${review.slug}#opiniones`} className="mt-auto flex min-h-11 items-center justify-between gap-2 border-t border-op-border pt-4 text-sm font-semibold text-op-blue-dark">{review.brand_name}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></Link>
          </article>)}</div> : <p className="rounded-op-card border border-op-border bg-op-sheet p-6 text-sm text-op-secondary">{reviewResult.status === 'rejected' ? 'No pudimos cargar las opiniones. Inténtalo más tarde.' : 'Las nuevas opiniones aparecerán aquí cuando se publiquen.'}</p>}
        </section>
        <ConnectedPipeline />
        <section id="casos" className="op-container op-section grid gap-8 md:grid-cols-2 md:gap-16">
          <div><p className="op-eyebrow mb-4">Cuando algo no sale bien</p><h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">La conversación no termina en una estrella.</h2></div>
          <div><p className="text-base leading-relaxed text-op-secondary">Describe el problema, solicita una solución y consulta el seguimiento de tu caso. Tú confirmas si se resolvió.</p><Link href="/caso/nuevo" className="op-link mt-5">Abrir un caso <ArrowRight aria-hidden="true" className="size-4" /></Link><p className="mt-3 text-xs leading-relaxed text-op-muted">Opinio facilita el registro y seguimiento; no garantiza una respuesta o un reembolso.</p></div>
        </section>
        <section id="independencia" className="op-container pb-16">
          <div className="grid items-center gap-8 rounded-op-card bg-op-ink p-7 text-op-sheet sm:p-10 md:grid-cols-[1.4fr_1fr]">
            <div><ShieldCheck aria-hidden="true" className="mb-5 size-7 text-op-green-border" /><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">La confianza no se compra.<br />Se construye, experiencia a experiencia.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-op-sheet/80">El plan de un comercio no modifica su puntaje. Las opiniones se ponderan por su evidencia y las soluciones se distinguen por quién las confirma.</p></div>
            <div className="border-t border-op-sheet/20 pt-7 md:border-l md:border-t-0 md:pl-8 md:pt-0"><h3 className="text-lg font-semibold">¿Tienes un comercio?</h3><p className="mb-5 mt-3 text-sm leading-relaxed text-op-sheet/80">Reúne tus opiniones, responde a tus clientes y conoce las herramientas de tu panel.</p><Link href="/merchant" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-op-sheet underline underline-offset-4">Conocer el panel para comercios <ArrowUpRight aria-hidden="true" className="size-4" /></Link></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
