import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { getMerchantBusinesses, getMerchantBusiness, getMerchantCases } from '@/lib/merchant-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Métricas del negocio · Opinio.mx' };

export default async function MerchantInsightsPage({ searchParams }: { searchParams: Promise<{ business?: string }> }) {
  const { business: slug } = await searchParams;
  const businesses = await getMerchantBusinesses();
  const business = slug ? (await getMerchantBusiness(slug)) || businesses[0] : businesses[0];
  if (!business) return <p className="py-16 text-center text-op-muted">No se encontró información del negocio.</p>;
  const cases = await getMerchantCases(business.id);
  const categories = [
    { key: 'delay', label: 'Demora en la entrega' },
    { key: 'damaged_goods', label: 'Producto dañado' },
    { key: 'wrong_item', label: 'Producto incorrecto' },
    { key: 'refund_pending', label: 'Reembolso pendiente' },
    { key: 'no_response', label: 'Falta de respuesta' },
  ].map((item) => ({ ...item, count: cases.filter((record) => record.issue_category === item.key).length }));
  const pending = cases.filter((item) => ['opened', 'reopened', 'acknowledged'].includes(item.status)).length;
  const confirmed = cases.filter((item) => item.status === 'resolved_consumer_confirmed').length;
  const metrics = [
    { label: 'Índice de confianza', value: `${business.trust_score}/100`, note: 'Consulta la metodología en el perfil público.' },
    { label: 'Cobertura de invitaciones', value: `${business.coverage_percentage}%`, note: `${business.invited_orders_count.toLocaleString('es-MX')} invitaciones de ${business.observed_orders_count.toLocaleString('es-MX')} pedidos registrados.` },
    { label: 'Casos por mil pedidos', value: String(business.issues_per_thousand), note: 'Indicador registrado en el perfil del negocio.' },
    { label: 'Tiempo de respuesta', value: `${business.median_response_hours} h`, note: 'Mediana de respuesta registrada.' },
  ];
  return <div className="mx-auto max-w-7xl space-y-8 pb-12">
    <header className="border-b border-op-border pb-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-op-green-dark">{business.category}</p><h1 className="text-3xl font-semibold tracking-tight text-op-ink">Métricas de {business.brand_name}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-op-muted">Comprende tu cobertura y prioriza la atención con los registros disponibles de tu negocio.</p></header>
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.label} className="rounded-2xl border border-op-border bg-op-sheet p-5"><dt className="text-sm font-medium text-op-secondary">{metric.label}</dt><dd className="mt-3"><span className="font-data text-3xl font-semibold text-op-ink">{metric.value}</span><span className="mt-3 block text-xs leading-relaxed text-op-muted">{metric.note}</span></dd></div>)}</dl>
    <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
      <section className="rounded-2xl border border-op-border bg-op-sheet p-5 md:p-7"><h2 className="flex items-center gap-2 text-lg font-semibold text-op-ink"><BarChart3 className="h-5 w-5 text-op-green" aria-hidden="true" /> Motivos de los casos</h2><p className="mt-2 text-sm text-op-muted">Distribución de {cases.length} casos registrados.</p>{cases.length ? <ul className="mt-6 space-y-5">{categories.map((category) => <li key={category.key}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="text-op-secondary">{category.label}</span><span className="font-data font-semibold text-op-ink">{category.count} <span className="font-normal text-op-muted">({Math.round(category.count / cases.length * 100)}%)</span></span></div><div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-op-shaded"><div className="h-full rounded-full bg-op-green" style={{ width: `${category.count / cases.length * 100}%` }} /></div></li>)}</ul> : <p className="mt-6 rounded-xl bg-op-canvas p-5 text-sm text-op-muted">Todavía no hay casos para calcular esta distribución.</p>}</section>
      <section className="rounded-2xl border border-op-border bg-op-sheet p-5 md:p-7"><h2 className="text-lg font-semibold text-op-ink">Tu siguiente acción</h2><p className="mt-3 text-sm leading-relaxed text-op-secondary">{pending > 0 ? `${pending} casos requieren seguimiento de tu equipo.` : 'No hay casos nuevos o reconocidos pendientes de seguimiento.'} {confirmed} resoluciones fueron confirmadas por el consumidor.</p><Link href={`/merchant/inbox?business=${encodeURIComponent(business.slug)}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-op-green px-4 text-sm font-semibold text-white hover:bg-op-green-dark">Revisar casos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><div className="mt-6 border-t border-op-border pt-5"><h3 className="text-sm font-semibold text-op-ink">Qué falta por medir</h3><p className="mt-2 text-sm leading-relaxed text-op-muted">Las comparaciones sectoriales y el impacto en ventas necesitan una muestra y mediciones propias. Todavía no hay datos suficientes para mostrarlos en este panel.</p></div></section>
    </div>
  </div>;
}
