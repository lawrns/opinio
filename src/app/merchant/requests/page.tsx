import React from 'react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
  getMerchantInvitations,
  getMerchantOrders,
} from '@/lib/merchant-data';
import { RequestsManager } from '@/components/RequestsManager';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantRequestsPage({ searchParams }: PageProps) {
  const { business: businessSlug } = await searchParams;
  const allBusinesses = await getMerchantBusinesses();
  const currentBusiness = businessSlug
    ? await getMerchantBusiness(businessSlug) || allBusinesses[0]
    : allBusinesses[0];

  if (!currentBusiness) {
    return (
      <div className="text-center py-16 text-zinc-400">
        No se encontró información del comercio.
      </div>
    );
  }

  const invitations = await getMerchantInvitations(currentBusiness.id);
  const orders = await getMerchantOrders(currentBusiness.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          Solicitudes y Cobertura de Pedidos
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Administra el motor de invitaciones y la representatividad estadística del Pasaporte de Confianza de{' '}
          <strong className="text-[#0F172A]">{currentBusiness.brand_name}</strong>.
        </p>
      </div>

      <RequestsManager
        business={currentBusiness}
        invitations={invitations}
        orders={orders}
      />
    </div>
  );
}
