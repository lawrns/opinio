import { buyerProofEnabled } from '@/lib/auth/spike';
import { NuevoCasoView } from './NuevoCasoForm';

// Rendered per request so the server-side OPINIO_BUYER_PROOF switch selects the form contract.
export const dynamic = 'force-dynamic';

export default function NuevoCasoPage() {
  return <NuevoCasoView buyerProof={buyerProofEnabled()} />;
}
