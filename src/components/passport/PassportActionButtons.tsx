'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  PenLine, 
  AlertTriangle, 
  Share2, 
  Check, 
  ShieldCheck
} from 'lucide-react';

interface Props {
  slug: string;
  brandName: string;
}

export function PassportActionButtons({ slug }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : `https://opinio.mx/b/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Primary CTA: Escribir Opinión (Trustpilot Style) */}
      <Link
        href={`/escribir-opinion/${slug}`}
        className="inline-flex items-center gap-2 rounded-full bg-[#00B67A] hover:bg-[#008B5D] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs active:scale-95"
      >
        <PenLine className="h-4 w-4" />
        <span>Escribir opinión</span>
      </Link>

      {/* Secondary CTA: Abrir un Caso */}
      <Link
        href={`/caso/nuevo?b=${slug}`}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#121511] hover:bg-gray-50 transition-colors shadow-2xs"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <span>Abrir un caso</span>
      </Link>

      {/* Share Button */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:text-[#121511] hover:bg-gray-50 transition-colors shadow-2xs"
        title="Copiar enlace de verificación"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[#00B67A]" />
            <span className="text-[#00B67A] font-bold">¡Enlace copiado!</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5 text-gray-500" />
            <span>Compartir</span>
          </>
        )}
      </button>

      {/* Audit Certificate Jump */}
      <a
        href="#existe"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#121511] px-2 py-2 transition-colors"
      >
        <ShieldCheck className="h-4 w-4 text-[#00B67A]" />
        <span>Ver credenciales SAT/DENUE</span>
      </a>
    </div>
  );
}
