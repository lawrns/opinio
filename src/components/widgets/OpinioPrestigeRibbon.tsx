import React from 'react';

export interface OpinioPrestigeRibbonProps {
  slug: string;
  brandName?: string;
  rating?: number;
  reviewCount?: number;
  theme?: 'dark' | 'light' | 'transparent' | 'lime' | 'navy';
  className?: string;
}

export function OpinioPrestigeRibbon({
  slug,
  brandName,
  rating = 4.8,
  reviewCount = 55,
  theme = 'dark',
  className = '',
}: OpinioPrestigeRibbonProps) {
  const sentiment = rating >= 4.5 ? 'Excelente' : rating >= 4.0 ? 'Muy bueno' : 'Bueno';
  const label = brandName ? `Perfil de ${brandName} en Opinio México` : 'Opinio México';

  // Base theme classes
  let themeClasses = 'bg-[#0f172a] text-white border-slate-700/80 hover:border-emerald-500/50 hover:bg-[#1e293b]';
  let starColor = 'text-emerald-400 fill-emerald-400';
  let starBg = 'bg-emerald-500/15 text-emerald-400';
  let ratingColor = 'text-emerald-400';

  if (theme === 'light') {
    themeClasses = 'bg-white text-slate-900 border-slate-200/90 shadow-xs hover:border-emerald-500/40 hover:bg-slate-50/80';
    starColor = 'text-emerald-600 fill-emerald-600';
    starBg = 'bg-emerald-50 text-emerald-600';
    ratingColor = 'text-emerald-700 font-bold';
  } else if (theme === 'transparent') {
    themeClasses = 'bg-white/[0.06] text-white/90 border-white/15 hover:bg-white/[0.12] hover:border-white/30 backdrop-blur-xs';
    starColor = 'text-emerald-400 fill-emerald-400';
    starBg = 'bg-emerald-400/20 text-emerald-300';
    ratingColor = 'text-emerald-300';
  } else if (theme === 'lime') {
    themeClasses = 'bg-ink-950/80 text-white border-white/15 hover:border-lime/40 hover:bg-ink-900';
    starColor = 'text-lime fill-lime';
    starBg = 'bg-lime/20 text-lime';
    ratingColor = 'text-lime font-bold';
  } else if (theme === 'navy') {
    themeClasses = 'bg-blue-950/40 text-white border-white/20 hover:border-[#7da7f0]/50 hover:bg-blue-900/40 backdrop-blur-xs';
    starColor = 'text-emerald-400 fill-emerald-400';
    starBg = 'bg-emerald-400/20 text-emerald-300';
    ratingColor = 'text-[#7da7f0] font-bold';
  }

  return (
    <a
      href={`https://opinio.mx/b/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`${label}: ${sentiment} ${rating.toFixed(1)}/5 (${reviewCount}+ reseñas verificadas)`}
      aria-label={`${label}: Calificación ${sentiment} ${rating.toFixed(1)} de 5 estrellas`}
      className={`group inline-flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 rounded-full border text-[11px] sm:text-xs font-medium transition-all duration-200 select-none no-underline max-w-full truncate ${themeClasses} ${className}`}
    >
      {/* Opinio Star Glyph & Brand */}
      <span className="flex items-center gap-1.5 font-bold tracking-tight shrink-0">
        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${starBg}`}>
          <svg
            className={`w-2.5 h-2.5 ${starColor}`}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
        <span className="tracking-tight font-semibold">Opinio</span>
      </span>

      <span className="opacity-30 font-light shrink-0" aria-hidden="true">
        |
      </span>

      {/* Rating & Sentiment */}
      <span className="flex items-center gap-1 shrink-0">
        <span className="font-semibold">{sentiment}</span>
        <span className={`font-mono ${ratingColor}`}>{rating.toFixed(1)}/5</span>
      </span>

      <span className="opacity-30 font-light hidden sm:inline shrink-0" aria-hidden="true">
        |
      </span>

      {/* Review volume */}
      <span className="opacity-80 hidden sm:inline truncate shrink-0">
        {reviewCount}+ opiniones verificadas
      </span>

      {/* External link micro glyph */}
      <svg
        className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 17L17 7M17 7H7M17 7V17" />
      </svg>
    </a>
  );
}
