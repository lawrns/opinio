'use client';

import React from 'react';
import Link from 'next/link';
import { Plug, ArrowRight, Check, Copy } from 'lucide-react';
import { Business } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IntegrationsManagerProps { business: Business }

const platforms = [
  { id: 'shopify', name: 'Shopify', description: 'Conecta tus pedidos de Shopify para dar seguimiento a las experiencias de compra.' },
  { id: 'tiendanube', name: 'Tiendanube', description: 'Reúne los pedidos de tu Tiendanube en el panel de tu negocio.' },
  { id: 'woocommerce', name: 'WooCommerce', description: 'Vincula las compras de tu tienda WooCommerce con sus opiniones.' },
  { id: 'api', name: 'API de pedidos', description: 'Envía eventos de pedidos desde tu propio sistema.' },
  { id: 'csv', name: 'Archivo CSV', description: 'Importa un historial de pedidos desde una hoja de cálculo.' },
];

export function IntegrationsManager({ business }: IntegrationsManagerProps) {
  const [selected, setSelected] = React.useState('shopify');
  const [copyStatus, setCopyStatus] = React.useState('');
  const platform = platforms.find((item) => item.id === selected)!;
  const example = JSON.stringify({ event: 'order.delivered', business_slug: business.slug, order: { external_id: 'PEDIDO-001', amount: 3499, currency: 'MXN' } }, null, 2);

  async function copyExample() {
    try { await navigator.clipboard.writeText(example); setCopyStatus('Ejemplo copiado.'); }
    catch { setCopyStatus('No se pudo copiar. Selecciona el ejemplo y cópialo manualmente.'); }
  }

  return <div className="space-y-6">
    <div className="rounded-2xl border border-op-border bg-op-sheet p-5 md:p-7">
      <div className="flex items-start gap-3"><Plug className="mt-1 h-6 w-6 shrink-0 text-op-green" aria-hidden="true" /><div><h2 className="text-xl font-semibold text-op-ink">Tus pedidos, en un solo lugar</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-op-secondary">Actualmente hay {business.observed_orders_count.toLocaleString('es-MX')} pedidos registrados para {business.brand_name}. El estado de una conexión automática todavía no está disponible en este panel.</p></div></div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Seleccionar integración">
      {platforms.map((item) => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setCopyStatus(''); }} className={cn('min-h-20 rounded-xl border p-4 text-left text-sm transition-colors', selected === item.id ? 'border-op-green bg-op-green-soft text-op-green-dark' : 'border-op-border bg-op-sheet text-op-secondary hover:bg-op-shaded')}><span className="block font-semibold">{item.name}</span><span className="mt-1 block text-xs">{item.id === 'api' ? 'Vista técnica' : 'Próximamente'}</span></button>)}
    </div>
    <section aria-labelledby="integration-name" className="rounded-2xl border border-op-border bg-op-sheet p-5 md:p-8">
      <div className="max-w-2xl"><h2 id="integration-name" className="text-xl font-semibold text-op-ink">{platform.name}</h2><p className="mt-2 text-sm leading-relaxed text-op-secondary">{platform.description}</p><div className="mt-6 rounded-xl border border-op-border bg-op-canvas p-4"><h3 className="text-sm font-semibold text-op-ink">{selected === 'api' ? 'Configuración pendiente' : 'Esta integración aún no se puede activar aquí'}</h3><p className="mt-2 text-sm leading-relaxed text-op-muted">{selected === 'api' ? 'La recepción de eventos requiere una configuración de acceso y firma. Este panel todavía no puede emitir ni validar esas credenciales.' : 'La conexión y la importación automática todavía no están habilitadas en este panel. Puedes consultar los pedidos registrados y crear enlaces de opinión desde Invitaciones.'}</p></div></div>
      {selected === 'api' && <div className="mt-6 max-w-2xl"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-op-ink">Ejemplo de estructura de un evento</h3><button type="button" onClick={copyExample} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-op-border px-3 text-sm text-op-secondary hover:bg-op-shaded">{copyStatus === 'Ejemplo copiado.' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}Copiar ejemplo</button></div><pre tabIndex={0} aria-label="Ejemplo de evento de pedido en JSON" className="overflow-x-auto rounded-xl bg-op-canvas p-4 text-xs leading-relaxed text-op-ink">{example}</pre><p role="status" className="mt-2 text-sm text-op-muted">{copyStatus}</p></div>}
      <Link href={`/merchant/requests?business=${encodeURIComponent(business.slug)}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-op-green px-4 text-sm font-semibold text-white hover:bg-op-green-dark">Ver pedidos e invitaciones <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </section>
  </div>;
}
