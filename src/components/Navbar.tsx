'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShieldCheck, 
  Menu, 
  X, 
  ArrowRight, 
  Search, 
  Building2, 
  Sparkles,
  Scale
} from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: 'Verificar negocio', href: '/verificar', icon: Search },
    { label: 'Para comercios', href: '/merchant', icon: Building2 },
    { label: 'Metodología', href: '/#metodologia', icon: Sparkles },
    { label: 'Casos resueltos', href: '/#casos', icon: Scale },
  ];

  const isActive = (href: string) => {
    if (href.startsWith('/#')) return false;
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="group flex items-center gap-2.5 transition-transform active:scale-98"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 shadow-md shadow-emerald-950/40 ring-1 ring-white/20">
              <ShieldCheck className="h-5 w-5 text-neutral-950 stroke-[2.2]" />
              <div className="absolute inset-0 rounded-xl bg-white/15 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Opinio<span className="text-emerald-400">.mx</span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  Pasaporte
                </span>
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center">
            <span className="text-xs font-medium text-neutral-500 border-l border-neutral-800 pl-4">
              La confianza se demuestra
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                  active 
                    ? 'bg-neutral-900 text-emerald-400 ring-1 ring-neutral-800' 
                    : 'text-neutral-300 hover:bg-neutral-900/70 hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 transition-colors ${
                  active ? 'text-emerald-400' : 'text-neutral-500 group-hover:text-neutral-300'
                }`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/merchant"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-emerald-400 active:scale-98"
          >
            <span>Demostrar mi reputación</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/verificar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white focus:outline-none"
            aria-label="Menu principal"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-neutral-200" />
            ) : (
              <Menu className="h-5 w-5 text-neutral-200" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active 
                      ? 'bg-neutral-900 text-emerald-400 font-semibold' 
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-neutral-900">
            <Link
              href="/merchant"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-md transition-colors hover:bg-emerald-400"
            >
              <span>Demostrar mi reputación</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-2 text-center text-[11px] text-neutral-500">
              Para marcas, tiendas DTC y negocios de WhatsApp en México
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
