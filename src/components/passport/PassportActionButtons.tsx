'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  PenLine, 
  AlertTriangle, 
  Share2, 
  Check, 
  ShieldAlert, 
  QrCode,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface Props {
  slug: string;
  brandName: string;
}

export function PassportActionButtons({ slug, brandName }: Props) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : `https://opinio.mx/b/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Primary CTA: Escribir Opinión */}
      <Link
        href={`/escribir-opinion/${slug}`}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-neutral-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-950/40"
      >
        <PenLine className="h-3.5 w-3.5" />
        <span>Escribir opinión</span>
      </Link>

      {/* Secondary CTA: Abrir un Caso */}
      <Link
        href={`/caso/nuevo?b=${slug}`}
        className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-850 hover:text-white transition-colors"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span>Abrir un caso</span>
      </Link>

      {/* Share Button */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-850 hover:text-white transition-colors"
        title="Copiar enlace de verificación"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400">¡Enlace copiado!</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5 text-neutral-400" />
            <span>Compartir</span>
          </>
        )}
      </button>

      {/* Audit Certificate Jump */}
      <a
        href="#existe"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 px-2.5 py-2 transition-colors"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        <span>Ver credenciales SAT/DENUE</span>
      </a>
    </div>
  );
}
