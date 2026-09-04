import Link from 'next/link';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" aria-label="Opinio.mx, inicio" className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 ${inverse ? 'text-op-sheet' : 'text-op-ink'}`}>
      <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" className="h-8 w-8 shrink-0 text-op-green" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
        <path d="m16 6.8 2.45 5.1 5.55.82-4 3.96.94 5.58L16 19.62l-4.94 2.64.94-5.58-4-3.96 5.55-.82L16 6.8Z" fill="var(--op-sheet)" />
      </svg>
      <span className="text-2xl font-bold tracking-[-0.035em]">opinio<span className={`ml-0.5 text-sm tracking-normal ${inverse ? 'text-op-green-border' : 'text-op-green-dark'}`}>.mx</span></span>
    </Link>
  );
}
