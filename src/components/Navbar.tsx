'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  User,
  Star,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#121511] text-white select-none shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Opinio Star Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            {/* The Iconic Trust Green Star with Shield */}
            <div className="relative flex items-center justify-center">
              <svg 
                className="w-7 h-7 text-[#00B67A] fill-current group-hover:scale-105 transition-transform" 
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-[#121511]" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                Opinio
              </span>
              <span className="text-xs font-bold text-[#00B67A]">.mx</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-white/90">
            <Link 
              href="/verificar" 
              className="hover:text-[#00B67A] transition-colors py-1 flex items-center gap-1"
            >
              <span>Verificar negocio</span>
            </Link>
            <Link 
              href="/verificar?categoria=all" 
              className="hover:text-[#00B67A] transition-colors py-1"
            >
              Categorías
            </Link>
            <Link 
              href="/#metodologia" 
              className="hover:text-[#00B67A] transition-colors py-1"
            >
              Metodología NMX
            </Link>
            <Link 
              href="/#casos" 
              className="hover:text-[#00B67A] transition-colors py-1"
            >
              Resolución de quejas
            </Link>
          </nav>
        </div>

        {/* Right Utility & Actions */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/escribir-opinion/luuna"
            className="text-xs font-semibold text-white/90 hover:text-[#00B67A] transition-colors"
          >
            Escribir opinión
          </Link>

          <Link
            href="/#guias"
            className="text-xs font-semibold text-white/90 hover:text-[#00B67A] transition-colors"
          >
            Blog &amp; Guías SPEI
          </Link>

          <div className="h-4 w-px bg-white/20" />

          {/* For Businesses Button (Trustpilot Soft Blue Pill) */}
          <Link
            href="/merchant"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-xs transition-all active:scale-[0.98]"
          >
            <span>Para comercios</span>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex lg:hidden items-center gap-3">
          <Link
            href="/merchant"
            className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#3B82F6] text-white"
          >
            Comercios
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#121511] px-4 py-5 space-y-4 animate-in fade-in duration-150">
          <nav className="flex flex-col space-y-3 text-sm font-semibold">
            <Link 
              href="/verificar" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#00B67A] transition-colors"
            >
              Verificar negocio
            </Link>
            <Link 
              href="/verificar?categoria=all" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#00B67A] transition-colors"
            >
              Categorías comerciales
            </Link>
            <Link 
              href="/#metodologia" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#00B67A] transition-colors"
            >
              Metodología del Denominador
            </Link>
            <Link 
              href="/#casos" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#00B67A] transition-colors"
            >
              Resolución de quejas
            </Link>
            <Link 
              href="/escribir-opinion/luuna" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#00B67A] hover:underline"
            >
              Escribir opinión con comprobante
            </Link>
          </nav>

          <div className="pt-4 border-t border-white/10">
            <Link
              href="/merchant"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center py-2.5 rounded-full text-xs font-bold bg-[#3B82F6] text-white"
            >
              Ingresar a Opinio Merchant OS
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
