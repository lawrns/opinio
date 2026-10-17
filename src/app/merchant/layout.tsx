import React, { Suspense } from 'react';
import { isOperationEnabled } from '@/lib/containment';
import { MerchantUnavailable } from '@/components/MerchantUnavailable';
import { getMerchantBusinesses, getMerchantCasesForBusinesses } from '@/lib/merchant-data';
import { MerchantShell } from '@/components/MerchantShell';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Contained until merchant auth exists (src/lib/containment.ts).
  if (!isOperationEnabled('merchant_panel')) return <MerchantUnavailable />;
  const allBusinesses = await getMerchantBusinesses();
  // One batched round trip for every listed business: the layout cannot read the
  // selected `?business=` value (only pages can), and querying per business
  // starves the shared pool against a remote database (issue #2).
  const cases = await getMerchantCasesForBusinesses(allBusinesses.map((business) => business.id));

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
