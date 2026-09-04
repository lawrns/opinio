import React from 'react';
import { getMerchantBusinesses, getMerchantBusiness, getMerchantCases } from '@/lib/merchant-data';
import { ResolutionInboxManager } from '@/components/ResolutionInboxManager';
import { Inbox, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
      <div className="text-center py-16 text-zinc-400">
        No se encontró información del comercio.
      </div>
    );
  }

  const cases = await getMerchantCases(currentBusiness.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Bandeja de Resolución
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {cases.length} casos registrados
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Expedientes de conciliación directa para compradores de{' '}
            <strong className="text-zinc-200">{currentBusiness.brand_name}</strong>. Resolver casos a tiempo protege tu Pasaporte Comercial.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-zinc-400 text-[10px]">Tiempo Mediano de Respuesta</div>
              <div className="font-bold text-white font-mono">
                {currentBusiness.median_response_hours} horas
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-zinc-400 text-[10px]">Tasa de Resolución Confirmada</div>
              <div className="font-bold text-emerald-400 font-mono">
                {currentBusiness.resolution_rate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inbox Interface */}
      <ResolutionInboxManager
        initialCases={cases}
        businessId={currentBusiness.id}
        businessSlug={currentBusiness.slug}
      />
    </div>
  );
}
