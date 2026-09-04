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
      <span role="status" className="sr-only">{copied ? 'Enlace copiado' : copyFailed ? 'No se pudo copiar. Copia el enlace desde la barra de direcciones.' : ''}</span>
      {/* Primary CTA: Escribir Opinión (Trustpilot Style) */}
      <Link
        href={`/escribir-opinion/${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--op-verified-ink)] hover:bg-[var(--op-verified-ink)] px-5 py-2.5 text-xs font-bold text-[var(--op-sheet)] transition-all shadow-xs active:scale-95"
      >
        <PenLine className="h-4 w-4" />
        <span>Escribir opinión</span>
      </Link>

      {/* Secondary CTA: Abrir un Caso */}
      <Link
        href={`/caso/nuevo?b=${slug}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--op-border-strong)] bg-[var(--op-sheet)] px-4 py-2.5 text-xs font-semibold text-[var(--op-ink-primary)] hover:bg-[var(--op-canvas)] transition-colors shadow-2xs"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--op-warning-ink)]" />
        <span>Abrir un caso</span>
      </Link>

      {/* Share Button */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--op-border-strong)] bg-[var(--op-sheet)] px-4 py-2.5 text-xs font-semibold text-[var(--op-ink-secondary)] hover:text-[var(--op-ink-primary)] hover:bg-[var(--op-canvas)] transition-colors shadow-2xs"
        title="Copiar enlace de verificación"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[var(--op-verified-ink)]" />
            <span className="text-[var(--op-verified-ink)] font-bold">¡Enlace copiado!</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5 text-[var(--op-ink-muted)]" />
            <span>Compartir</span>
          </>
        )}
      </button>

      {copyFailed && <p className="w-full text-sm text-[var(--op-ink-secondary)]">No se pudo copiar. Copia el enlace desde la barra de direcciones de tu navegador.</p>}
      {/* Identity section jump */}
      <a
        href="#existe"
        className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[var(--op-ink-secondary)] hover:text-[var(--op-ink-primary)] px-2 py-2 transition-colors"
      >
        <ShieldCheck className="h-4 w-4 text-[var(--op-verified-ink)]" />
        <span>Consultar identidad</span>
      </a>
    </div>
  );
}
