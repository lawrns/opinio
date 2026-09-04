import { ArrowSquareOut, FileText } from '@phosphor-icons/react/dist/ssr';

export interface OfficialRecordProps {
  record: { id: number; source_name: string; fact_title: string; fact_detail: string; record_date: string; source_url: string | null };
}

export function OfficialRecordCard({ record }: OfficialRecordProps) {
  const date = new Date(record.record_date);
  const sourceUrl = record.source_url && /^https?:\/\//i.test(record.source_url) ? record.source_url : null;
  return <article className="flex flex-col rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 sm:p-6">
    <p className="flex items-center gap-2 text-xs font-semibold text-[var(--op-ink-muted)]"><FileText size={17} aria-hidden="true" />{record.source_name}</p>
    <h3 className="mt-4 text-lg font-semibold text-[var(--op-ink-primary)]">{record.fact_title}</h3>
    <p className="mt-2 break-words text-sm leading-relaxed text-[var(--op-ink-secondary)]">{record.fact_detail}</p>
    <p className="mt-4 text-xs text-[var(--op-ink-muted)]">Fecha del registro: {Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
    {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--op-link)] underline-offset-4 hover:underline">Consultar fuente <span className="sr-only">{record.source_name}, abre en otra pestaña</span><ArrowSquareOut size={16} aria-hidden="true" /></a> : <p className="mt-4 text-xs text-[var(--op-ink-muted)]">Sin enlace a la fuente disponible.</p>}
  </article>;
}
