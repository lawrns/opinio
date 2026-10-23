'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight, PenLine } from 'lucide-react';
import { Brand } from './Brand';

const links = [
  { href: '/directorio', label: 'Directorio' },
  { href: '/verificar', label: 'Buscar tienda' },
  { href: '/#metodologia', label: 'Cómo funciona' },
  { href: '/caso/nuevo', label: 'Resolver un problema' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return (
    <header ref={header} className="sticky top-0 z-50 border-b border-white/10 bg-[#1b1a1b] text-white">
      <div className="op-container flex h-[72px] items-center justify-between gap-5">
        <div className="flex items-center gap-9">
          <Brand inverse />
          <nav aria-label="Navegación principal" className="hidden items-center gap-7 lg:flex">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className="flex min-h-11 items-center text-[14px] font-medium text-white/85 transition-colors hover:text-white aria-[current=page]:font-bold aria-[current=page]:text-[#00b67a]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/verificar?accion=opinar"
            data-cta="nav_write_review"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2 text-[13.5px] font-semibold text-white transition-all hover:border-white hover:bg-white/15"
          >
            <PenLine aria-hidden="true" className="size-3.5 text-[#00b67a]" />
            Escribir opinión
          </Link>
          <Link
            href="/merchant"
            prefetch={false}
            data-cta="nav_merchant_panel"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#a6c8ff] px-4.5 py-2 text-[13.5px] font-bold text-[#1b1a1b] transition-all hover:bg-[#00b67a] hover:text-[#1b1a1b]"
          >
            Para comercios
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 lg:hidden"
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Navegación móvil"
          className="op-container border-t border-white/10 bg-[#1b1a1b] pb-5 pt-3 text-white lg:hidden"
        >
          {[...links, { href: '/verificar?accion=opinar', label: 'Escribir opinión', cta: 'nav_write_review' }].map(
            ({ href, label, cta }: { href: string; label: string; cta?: string }) => (
              <Link
                key={href}
                href={href}
                data-cta={cta}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center border-b border-white/10 text-sm font-medium text-white/90 hover:text-[#00b67a]"
              >
                {label}
              </Link>
            )
          )}
          <Link
            href="/merchant"
            prefetch={false}
            data-cta="nav_merchant_panel"
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#a6c8ff] px-5 py-2.5 text-sm font-bold text-[#1b1a1b]"
          >
            Para comercios <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </nav>
      )}
    </header>
  );
}
