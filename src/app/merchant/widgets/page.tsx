import React from 'react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
  getMerchantWidgets,
} from '@/lib/merchant-data';
import { WidgetsCustomizer } from '@/components/WidgetsCustomizer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Widgets del negocio · Opinio.mx' };

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantWidgetsPage({ searchParams }: PageProps) {
  const { business: businessSlug } = await searchParams;
  const allBusinesses = await getMerchantBusinesses();
  const currentBusiness = businessSlug
    ? await getMerchantBusiness(businessSlug) || allBusinesses[0]
    : allBusinesses[0];

  if (!currentBusiness) {
    return (
      <div className="text-center py-16 text-op-muted">
        No se encontró información del comercio.
      </div>
    );
  }

  const widgets = await getMerchantWidgets(currentBusiness.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-op-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-op-ink">
          Widgets y Sellos Embebidos
        </h1>
        <p className="text-sm text-op-muted mt-2">
          Configura sellos flotantes, badges compactos y tarjetas de checkout para{' '}
          <strong className="text-op-ink">{currentBusiness.brand_name}</strong>. Todos los widgets están respaldados por tu Pasaporte de Confianza en tiempo real.
        </p>
      </div>

      <WidgetsCustomizer
        business={currentBusiness}
        existingWidgets={widgets}
      />
    </div>
  );
}
