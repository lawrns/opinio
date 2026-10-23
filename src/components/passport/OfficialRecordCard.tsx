import { ArrowSquareOut, FileText } from '@phosphor-icons/react/dist/ssr';
import { formatRecordDate } from '@/lib/passport-evidence';

export interface OfficialRecordProps {
  record: {
    id: number;
    source_name: string;
    fact_title: string;
    fact_detail: string;
    record_date: string;
    source_url: string | null;
  };
}

export function OfficialRecordCard({ record }: OfficialRecordProps) {
  const recordDate = formatRecordDate(record.record_date);
  const sourceUrl = record.source_url && /^https?:\/\//i.test(record.source_url) ? record.source_url : null;
  return (
    <article className="flex flex-col justify-between rounded-[20px] border border-op-border bg-white p-6 shadow-flat transition-all hover:-translate-y-0.5 hover:border-[#00b67a] hover:shadow-elevated">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fcfbf3] px-3 py-1 font-mono text-xs font-bold text-op-ink border border-op-border">
            <FileText size={15} className="text-[#00b67a]" weight="duotone" aria-hidden="true" />
            {record.source_name}
          </span>
          <span className="font-mono text-[11px] text-op-muted">
            {recordDate || record.record_date.trim() || 'No disponible'}
          </span>
        </div>
        <h3 className="mt-4 text-lg font-bold tracking-tight text-op-ink">{record.fact_title}</h3>
        <p className="mt-2 break-words text-sm leading-relaxed text-op-secondary">{record.fact_detail}</p>
      </div>
      <div className="mt-5 border-t border-op-border pt-3.5">
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-op-green-dark underline decoration-[#00b67a] underline-offset-4 hover:text-op-ink"
          >
            Consultar fuente oficial
            <span className="sr-only">{record.source_name}, abre en otra pestaña</span>
            <ArrowSquareOut size={15} aria-hidden="true" />
          </a>
        ) : (
          <p className="font-mono text-xs text-op-muted">Fecha del registro: {recordDate || record.record_date.trim() || 'No disponible'} · Sin enlace externo</p>
        )}
      </div>
    </article>
  );
}
