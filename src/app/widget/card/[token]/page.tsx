import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, Star, ExternalLink, ArrowUpRight } from 'lucide-react';
import { getWidgetDataByToken, getMerchantReviews } from '@/lib/merchant-data';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export default async function WidgetCardPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { theme: themeQuery } = await searchParams;

  const widgetData = await getWidgetDataByToken(token);

  if (!widgetData) {
    return (
      <div className="p-4 bg-zinc-900 text-zinc-400 text-xs text-center font-sans">
        Widget no disponible
      </div>
    );
  }

  const reviews = await getMerchantReviews(widgetData.id);
  const topReview = reviews[0] || null;

  const theme = themeQuery || widgetData.theme || 'light';
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "w-full h-full p-2 flex items-center justify-center font-sans antialiased select-none",
      isDark ? "bg-transparent text-white" : "bg-transparent text-zinc-900"
    )}>
      <div className={cn(
        "w-full max-w-sm p-5 rounded-2xl border shadow-lg transition-all space-y-4",
        isDark
          ? "bg-zinc-950 text-white border-zinc-800 shadow-black/80"
          : "bg-white text-zinc-900 border-zinc-200 shadow-zinc-200/80"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold text-xs shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs leading-none flex items-center gap-1">
                <span>{widgetData.brand_name}</span>
                <span className="text-emerald-500 text-[10px]">✓</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-none">
                {widgetData.category}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-sm font-extrabold text-emerald-500 flex items-center justify-end gap-1">
              <span>★</span>
              <span>{widgetData.trust_score}</span>
            </div>
            <div className="text-[9px] text-zinc-400 font-medium">
              Opinio Score
            </div>
          </div>
        </div>

        {/* 3 Proof Pillars: Existe, Cumple, Resuelve */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-0.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              1. Existe
            </div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
              SAT / CLEE
            </div>
            <div className="text-[8px] text-zinc-500">Legal</div>
          </div>

          <div className="space-y-0.5 border-x border-zinc-200 dark:border-zinc-800 px-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              2. Cumple
            </div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              {widgetData.coverage_percentage}%
            </div>
            <div className="text-[8px] text-zinc-500">Cobertura</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              3. Resuelve
            </div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              {widgetData.resolution_rate}%
            </div>
            <div className="text-[8px] text-zinc-500">Garantía</div>
          </div>
        </div>

        {/* Customer Review Snippet */}
        {topReview && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center text-amber-400">
                {'★'.repeat(topReview.rating)}
              </div>
              <span className="text-zinc-400 font-medium">
                {topReview.author_name} (Compra verificada)
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 italic line-clamp-2 leading-relaxed">
              &ldquo;{topReview.body}&rdquo;
            </p>
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
          <span className="text-[10px] text-zinc-400 font-medium">
            Pasaporte Comercial Oficial
          </span>
          <Link
            href={`/b/${widgetData.b_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>Ver Pasaporte</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
