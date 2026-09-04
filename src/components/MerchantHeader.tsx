'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, Plus, ExternalLink, ArrowRight } from 'lucide-react';
import { Business, ResolutionCase } from '@/lib/types';

interface MerchantHeaderProps {
  currentBusiness: Business;
  pendingCases?: ResolutionCase[];
}

export function MerchantHeader({ currentBusiness, pendingCases = [] }: MerchantHeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);
  const notificationButton = React.useRef<HTMLButtonElement>(null);
  const activeCases = pendingCases.filter((item) => !item.status.startsWith('resolved') && item.status !== 'unresolved');
  const query = `business=${encodeURIComponent(currentBusiness.slug)}`;

  React.useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        notificationButton.current?.focus();
      }
    }
    if (!notificationsOpen) return;
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [notificationsOpen]);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-op-border bg-op-sheet/95 px-4 py-2 backdrop-blur-md md:px-8">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-op-ink">{currentBusiness.brand_name}</p>
        <p className="text-xs text-op-muted">Índice de confianza <strong className="font-data text-op-green-dark">{currentBusiness.trust_score}/100</strong></p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/merchant/requests?${query}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-op-green px-3 text-sm font-semibold text-white hover:bg-op-green-dark">
          <Plus className="h-4 w-4" aria-hidden="true" /><span>Invitar<span className="hidden sm:inline"> clientes</span></span>
        </Link>
        <Link href={`/b/${currentBusiness.slug}`} target="_blank" rel="noopener noreferrer" className="hidden min-h-11 items-center gap-2 rounded-xl border border-op-border px-3 text-sm text-op-secondary hover:bg-op-shaded sm:inline-flex">
          Perfil público <ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only">(nueva pestaña)</span>
        </Link>
        <div ref={notificationRef} className="relative">
          <button ref={notificationButton} type="button" aria-label={`Casos pendientes: ${activeCases.length}`} aria-expanded={notificationsOpen} aria-controls="merchant-notifications" onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-op-border text-op-secondary hover:bg-op-shaded">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {activeCases.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-op-danger px-1.5 text-xs text-white">{activeCases.length}</span>}
          </button>
          {notificationsOpen && <section id="merchant-notifications" aria-label="Casos pendientes" className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-op-border bg-op-sheet shadow-xl">
            <h2 className="border-b border-op-border p-4 text-sm font-semibold text-op-ink">Casos que requieren seguimiento</h2>
            <div className="max-h-80 overflow-y-auto">
              {activeCases.length === 0 ? <p className="p-4 text-sm text-op-muted">No hay casos pendientes registrados para este negocio.</p> : activeCases.slice(0, 5).map((item) => <Link key={item.id} href={`/merchant/inbox?${query}`} onClick={() => setNotificationsOpen(false)} className="block border-b border-op-border p-4 hover:bg-op-shaded">
                <span className="font-data text-xs text-op-green-dark">{item.case_number}</span>
                <p className="mt-1 text-sm font-semibold text-op-ink">{item.customer_name}</p>
                <p className="mt-1 text-xs text-op-muted">{item.status === 'remedy_offered' ? 'Propuesta pendiente de confirmación' : 'Pendiente de seguimiento'}</p>
              </Link>)}
            </div>
            <Link href={`/merchant/inbox?${query}`} onClick={() => setNotificationsOpen(false)} className="flex min-h-12 items-center justify-between gap-2 p-4 text-sm font-semibold text-op-green-dark hover:bg-op-green-soft">Ver todos los casos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </section>}
        </div>
      </div>
    </header>
  );
}
