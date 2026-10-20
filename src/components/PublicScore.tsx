import { meetsEvidenceThreshold } from '@/lib/evidence-threshold';

const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

/** Public 0-100 score cell: shown only with enough verified reviews, else 'Sin datos'. */
export function PublicScore({ score, verifiedCount }: { score: number | string | null; verifiedCount?: number | string | null }) {
  const hasScore = meetsEvidenceThreshold(verifiedCount) && score !== null && Number.isFinite(Number(score));
  return (
    <>
      {hasScore ? numberFormat.format(Number(score)) : 'Sin datos'}
      {hasScore && <span className="ml-1 text-xs font-normal text-op-muted">/ 100</span>}
    </>
  );
}
