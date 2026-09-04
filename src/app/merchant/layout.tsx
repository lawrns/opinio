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
  const defaultBusiness = allBusinesses[0];
  const cases = defaultBusiness ? await getMerchantCases(defaultBusiness.id) : [];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
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
