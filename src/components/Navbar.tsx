'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Brand } from './Brand';

const links = [
  { href: '/verificar', label: 'Explorar comercios' },
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
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); };
  }, [open]);

  return (
    <header ref={header} className="sticky top-0 z-50 border-b border-op-border bg-op-canvas/95 backdrop-blur-md">
      <div className="op-container flex h-[76px] items-center justify-between gap-5">
        <Brand />
        <nav aria-label="Navegación principal" className="hidden items-center gap-7 lg:flex">
          {links.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className="flex min-h-11 items-center text-sm font-medium text-op-secondary transition-colors hover:text-op-green-dark aria-[current=page]:text-op-green-dark">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/verificar?accion=opinar" className="op-link">Escribir opinión</Link>
          <Link href="/merchant" className="op-button">Para comercios <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
        </div>
        <button ref={trigger} type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} className="flex size-11 items-center justify-center rounded-op-control border border-op-border text-op-ink lg:hidden">
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {open && <nav id="mobile-navigation" aria-label="Navegación móvil" className="op-container border-t border-op-border pb-5 pt-3 lg:hidden">
        {[...links, { href: '/verificar?accion=opinar', label: 'Escribir opinión' }].map(({ href, label }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center border-b border-op-border text-sm font-medium">{label}</Link>)}
        <Link href="/merchant" onClick={() => setOpen(false)} className="op-button mt-4 w-full">Para comercios <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
      </nav>}
    </header>
  );
}
