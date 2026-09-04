import React, { Suspense } from 'react';
import { getMerchantBusinesses, getMerchantCases } from '@/lib/merchant-data';
import { MerchantShell } from '@/components/MerchantShell';

export const dynamic = 'force-dynamic';

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allBusinesses = await getMerchantBusinesses();
  // Fetch active cases for all businesses to show real-time notifications
  const cases = (await Promise.all(allBusinesses.map((business) => getMerchantCases(business.id)))).flat();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-op-canvas flex items-center justify-center text-op-muted">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-op-green-border border-t-transparent animate-spin" />
            <span className="text-sm">Cargando Opinio Merchant OS...</span>
          </div>
        </div>
      }
    >
      <MerchantShell allBusinesses={allBusinesses} cases={cases}>
        {children}
      </MerchantShell>
    </Suspense>
  );
}
