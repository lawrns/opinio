import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { getWidgetDataByToken } from '@/lib/merchant-data';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export default async function WidgetBadgePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { theme: themeQuery } = await searchParams;

  const widgetData = await getWidgetDataByToken(token);

  if (!widgetData) {
    return (
      <div className="p-3 bg-zinc-900 text-zinc-400 text-xs text-center font-sans">
        Widget no disponible
      </div>
    );
  }

  const theme = themeQuery || widgetData.theme || 'light';
  const isDark = theme === 'dark';
  const coverage = Number(widgetData.coverage_percentage) || 0;

  return (
    <div className={cn(
      "w-full h-full p-2 flex items-center justify-center font-sans select-none antialiased",
      isDark ? "bg-transparent text-white" : "bg-transparent text-zinc-900"
    )}>
      <Link
        href={`/b/${widgetData.b_slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Ver Pasaporte de Confianza de ${widgetData.brand_name} en Opinio.mx`}
        className={cn(
          "group inline-flex items-center gap-3 px-3.5 py-2 rounded-full border shadow-sm transition-all hover:scale-[1.02] active:scale-[0.99]",
          isDark
            ? "bg-zinc-950 text-white border-zinc-800 hover:border-emerald-500/50 shadow-black"
            : "bg-white text-zinc-900 border-zinc-200 hover:border-emerald-500/50 shadow-zinc-200/80"
        )}
      >
        {/* Shield Icon */}
        <div className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-3.5 w-3.5" />
        </div>

        {/* Brand & Score */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="font-bold tracking-tight text-xs">
              Opinio<span className="text-emerald-500">.mx</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium hidden sm:inline">
              Verificado
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono font-extrabold text-emerald-500 text-xs">
            <span>★</span>
            <span>{widgetData.trust_score}</span>
          </div>

          {coverage >= 90 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Cobertura {coverage}%
            </span>
          )}
        </div>

        <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-emerald-500 transition-colors shrink-0" />
      </Link>
    </div>
  );
}
