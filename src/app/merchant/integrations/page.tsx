import React from 'react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
} from '@/lib/merchant-data';
import { IntegrationsManager } from '@/components/IntegrationsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Integraciones del negocio · Opinio.mx' };

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantIntegrationsPage({ searchParams }: PageProps) {
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-op-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-op-ink">
          Integraciones y Feed de Pedidos
        </h1>
        <p className="text-sm text-op-muted mt-2">
          Consulta las opciones disponibles para registrar los pedidos de{' '}
          <strong className="text-op-ink">{currentBusiness.brand_name}</strong>.
        </p>
      </div>

      <IntegrationsManager key={currentBusiness.id} business={currentBusiness} />
    </div>
  );
}
