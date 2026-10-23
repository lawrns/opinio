'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PenLine,
  AlertTriangle,
  Share2,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  slug: string;
  brandName: string;
}

export function PassportActionButtons({ slug }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : `https://opinio.mx/b/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span role="status" className="sr-only">
        {copied ? 'Enlace copiado' : copyFailed ? 'No se pudo copiar. Copia el enlace desde la barra de direcciones.' : ''}
      </span>
      {/* Primary CTA: Escribir Opinión (Trustpilot Pill Style) */}
      <Link
        href={`/escribir-opinion/${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-5 py-2.5 text-xs font-bold text-white shadow-flat transition-all hover:bg-op-green-dark active:scale-95"
      >
        <PenLine className="size-4 text-[#00b67a]" />
        <span>Escribir opinión</span>
      </Link>

      {/* Secondary CTA: Abrir un Caso */}
      <Link
        href={`/caso/nuevo?b=${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-op-strong bg-white px-4.5 py-2.5 text-xs font-bold text-op-ink shadow-2xs transition-all hover:border-[#1b1a1b] hover:bg-op-shaded"
      >
        <AlertTriangle className="size-3.5 text-[#c2410c]" />
        <span>Abrir un caso</span>
      </Link>

      {/* Share Button */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-op-strong bg-white px-4.5 py-2.5 text-xs font-bold text-op-secondary shadow-2xs transition-all hover:border-[#1b1a1b] hover:text-op-ink"
        title="Copiar enlace de verificación"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-[#00b67a]" />
            <span className="font-bold text-op-green-dark">¡Enlace copiado!</span>
          </>
        ) : (
          <>
            <Share2 className="size-3.5 text-op-muted" />
            <span>Compartir</span>
          </>
        )}
      </button>

      {copyFailed && (
        <p className="w-full text-sm text-op-secondary">
          No se pudo copiar. Copia el enlace desde la barra de direcciones de tu navegador.
        </p>
      )}
      {/* Identity section jump */}
      <a
        href="#existe"
        className="inline-flex min-h-11 items-center gap-1.5 px-2 py-2 text-xs font-bold text-op-secondary transition-colors hover:text-op-green-dark"
      >
        <ShieldCheck className="size-4 text-[#00b67a]" />
        <span>Consultar identidad</span>
      </a>
    </div>
  );
}
