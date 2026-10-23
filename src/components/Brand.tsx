import Link from 'next/link';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Opinio.mx, inicio"
      className={`group inline-flex min-h-11 shrink-0 items-center gap-2.5 ${inverse ? 'text-op-sheet' : 'text-op-ink'}`}
    >
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#00b67a] shadow-[0_2px_8px_rgba(0,182,122,0.28)] transition-transform duration-200 group-hover:scale-[1.03]">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" className="size-[19px] fill-white">
          <path d="m12 2.4 2.78 5.65 6.22.9-4.5 4.38 1.06 6.2L12 16.6l-5.56 2.93 1.06-6.2L3 8.95l6.22-.9L12 2.4Z" />
        </svg>
      </span>
      <span className="text-[1.45rem] font-extrabold tracking-[-0.04em] leading-none">
        opinio<span className={inverse ? 'text-[#00b67a]' : 'text-[#009e68]'}>.mx</span>
      </span>
    </Link>
  );
}
