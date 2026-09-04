import React from 'react';
import {
  getMerchantBusinesses,
  getMerchantBusiness,
  getMerchantIdentities,
  getMerchantOfficialRecords,
} from '@/lib/merchant-data';
import { SettingsManager } from '@/components/SettingsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configuración del negocio · Opinio.mx' };

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantSettingsPage({ searchParams }: PageProps) {
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

  const identities = await getMerchantIdentities(currentBusiness.id);
  const officialRecords = await getMerchantOfficialRecords(currentBusiness.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-op-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-op-ink">
          Configuración e Identidad Comercial
        </h1>
        <p className="text-sm text-op-muted mt-2">
          Gestiona las credenciales jurídicas, validación ante el SAT, registro INEGI DENUE y equipo autorizado de{' '}
          <strong className="text-op-ink">{currentBusiness.brand_name}</strong>.
        </p>
      </div>

      <SettingsManager
        key={currentBusiness.id}
        business={currentBusiness}
        identities={identities}
        officialRecords={officialRecords}
      />
    </div>
  );
}
