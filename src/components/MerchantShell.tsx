'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Business, ResolutionCase } from '@/lib/types';
import { MerchantSidebar } from './MerchantSidebar';
import { MerchantHeader } from './MerchantHeader';

interface MerchantShellProps {
  allBusinesses: Business[];
  cases: ResolutionCase[];
  children: React.ReactNode;
}

export function MerchantShell({
  allBusinesses,
  cases,
  children,
}: MerchantShellProps) {
  const searchParams = useSearchParams();
  const slugParam = searchParams.get('business');

  // Match the active business from searchParams or default to first claimed (e.g. luuna)
  const currentBusiness = React.useMemo(() => {
    if (slugParam) {
      const found = allBusinesses.find(
        (b) => b.slug.toLowerCase() === slugParam.toLowerCase()
      );
      if (found) return found;
    }
    return allBusinesses[0] || null;
  }, [slugParam, allBusinesses]);

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-op-canvas flex items-center justify-center text-op-ink">
        <p>No se encontraron negocios registrados en Opinio.mx.</p>
      </div>
    );
  }

  const businessCases = cases.filter((c) => c.business_id === currentBusiness.id);
  const pendingCasesCount = businessCases.filter(
    (c) => c.status === 'opened' || c.status === 'reopened' || c.status === 'acknowledged'
  ).length;

  return (
    <div className="min-h-screen bg-op-canvas text-op-ink flex flex-col lg:flex-row antialiased">
      {/* Fixed Left Navigation */}
      <MerchantSidebar
        currentBusiness={currentBusiness}
        allBusinesses={allBusinesses}
        pendingCasesCount={pendingCasesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <MerchantHeader
          currentBusiness={currentBusiness}
          pendingCases={businessCases}
        />
        <main id="contenido" tabIndex={-1} className="flex-1 min-w-0 p-4 md:p-8 bg-op-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}
