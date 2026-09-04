import Link from 'next/link';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" aria-label="Opinio.mx, inicio" className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 ${inverse ? 'text-op-sheet' : 'text-op-ink'}`}>
      <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-op-green" fill="none">
        <path d="M16 2 28 7v9c0 7-12 14-12 14S4 23 4 16V7L16 2Z" fill="currentColor" />
        <path d="m10 15 4 4 8-8" stroke="var(--op-sheet)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-2xl font-bold tracking-[-0.06em]">opinio<span className={`ml-0.5 text-sm tracking-tight ${inverse ? 'text-op-green-border' : 'text-op-green'}`}>.mx</span></span>
    </Link>
  );
}
