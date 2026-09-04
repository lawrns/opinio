import React from 'react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
} from '@/lib/merchant-data';
import { IntegrationsManager } from '@/components/IntegrationsManager';

export const dynamic = 'force-dynamic';

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
      <div className="text-center py-16 text-[#64748B]">
        No se encontró información del comercio.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Integraciones y Feed de Pedidos
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Conecta plataformas de comercio electrónico, APIs de pago SPEI y webhooks para auditar el 100% de los pedidos de{' '}
          <strong className="text-[#0F172A]">{currentBusiness.brand_name}</strong>.
        </p>
      </div>

      <IntegrationsManager business={currentBusiness} />
    </div>
  );
}
