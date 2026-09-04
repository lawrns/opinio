import React from 'react';
import { getMerchantBusinesses, getMerchantBusiness, getMerchantCases } from '@/lib/merchant-data';
import { ResolutionInboxManager } from '@/components/ResolutionInboxManager';
import { Inbox, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Casos del negocio · Opinio.mx' };

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

export default async function MerchantInboxPage({ searchParams }: PageProps) {
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

  const cases = await getMerchantCases(currentBusiness.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-op-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-op-ink">
              Bandeja de Resolución
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-op-green-soft text-op-green-dark border border-op-green-border">
              {cases.length} casos registrados
            </span>
          </div>
          <p className="text-sm text-op-muted mt-2">
            Expedientes de conciliación directa para compradores de{' '}
            <strong className="text-op-ink">{currentBusiness.brand_name}</strong>. Resolver casos a tiempo protege tu Pasaporte Comercial.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-op-border shadow-xs flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-op-green-dark" />
            <div>
              <div className="text-op-muted text-xs">Tiempo Mediano de Respuesta</div>
              <div className="font-bold text-op-ink font-mono">
                {currentBusiness.median_response_hours} horas
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-op-border shadow-xs flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-op-secondary" />
            <div>
              <div className="text-op-muted text-xs">Tasa de Resolución Confirmada</div>
              <div className="font-bold text-op-green-dark font-mono">
                {currentBusiness.resolution_rate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inbox Interface */}
      <ResolutionInboxManager
        key={currentBusiness.id}
        initialCases={cases}
        businessId={currentBusiness.id}
        businessSlug={currentBusiness.slug}
      />
    </div>
  );
}
