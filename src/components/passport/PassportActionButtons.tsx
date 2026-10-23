'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PenLine,
  AlertTriangle,
  Share2,
  Check,
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
      <Link
        href={`/escribir-opinion/${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-5 py-2.5 text-xs font-semibold text-white shadow-flat transition-colors hover:bg-op-green-dark"
      >
        <PenLine className="size-4 text-[#00b67a]" />
        <span>Escribir opinión</span>
      </Link>

      <Link
        href={`/caso/nuevo?b=${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-op-border bg-white px-4.5 py-2.5 text-xs font-semibold text-op-ink shadow-2xs transition-colors hover:border-op-strong hover:bg-op-shaded"
      >
        <AlertTriangle className="size-3.5 text-op-secondary" />
        <span>Abrir un caso</span>
      </Link>

      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-op-border bg-white px-4.5 py-2.5 text-xs font-semibold text-op-secondary shadow-2xs transition-colors hover:border-op-strong hover:text-op-ink"
        title="Copiar enlace de verificación"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-[#00b67a]" />
            <span className="font-semibold text-op-green-dark">¡Enlace copiado!</span>
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
    </div>
  );
}
