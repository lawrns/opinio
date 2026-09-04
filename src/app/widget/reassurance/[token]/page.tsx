import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { getWidgetDataByToken } from '@/lib/merchant-data';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export default async function WidgetReassurancePage({ params, searchParams }: PageProps) {
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

  return (
    <div className={cn(
      "w-full h-full p-2 flex items-center justify-center font-sans antialiased select-none",
      isDark ? "bg-transparent text-white" : "bg-transparent text-zinc-900"
    )}>
      <div className={cn(
        "w-full max-w-md p-4 rounded-xl border transition-all space-y-2.5 shadow-sm",
        isDark
          ? "bg-zinc-950 text-white border-zinc-800 shadow-black"
          : "bg-white text-zinc-900 border-zinc-200 shadow-zinc-100"
      )}>
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold tracking-tight">
              Compra Verificada por Opinio<span className="text-emerald-500">.mx</span>
            </span>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            ★ {widgetData.trust_score} / 100
          </span>
        </div>

        {/* Cues */}
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Identidad Legal:</strong> RFC {widgetData.rfc || 'Validado SAT'}
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Cobertura:</strong> {widgetData.coverage_percentage}% de ventas auditadas
            </span>
          </div>
        </div>

        {/* Bottom guarantee link */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-500" />
            <span>Resolución garantizada en &lt; 24h</span>
          </span>

          <Link
            href={`/b/${widgetData.b_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Ver Pasaporte Público</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
