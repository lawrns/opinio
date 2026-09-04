'use client';

import React from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Sliders,
  Check,
  Plus,
  Eye,
} from 'lucide-react';
import { Business, Widget } from '@/lib/types';
import { createOrUpdateWidgetAction } from '@/lib/merchant-actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface WidgetsCustomizerProps {
  business: Business;
  existingWidgets: Widget[];
}

export function WidgetsCustomizer({
  business,
  existingWidgets,
}: WidgetsCustomizerProps) {
  const [widgets, setWidgets] = React.useState<Widget[]>(existingWidgets);
  const [selectedStyle, setSelectedStyle] = React.useState<'badge' | 'floating' | 'reassurance' | 'card'>('badge');
  const [selectedTheme, setSelectedTheme] = React.useState<'light' | 'dark'>('light');
  const [showScore, setShowScore] = React.useState(true);
  const [showCoverage, setShowCoverage] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'script' | 'react' | 'iframe'>('script');
  const [copied, setCopied] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Active token for preview & embed
  const currentWidget = widgets.find((w) => w.widget_type === selectedStyle) || widgets[0];
  const token = currentWidget ? currentWidget.token : `wgt_${business.slug}_${selectedStyle}_2026`;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://opinio.mx';

  const embedScript = `<script 
  src="${baseUrl}/widget.js" 
  data-token="${token}" 
  data-style="${selectedStyle}" 
  data-theme="${selectedTheme}" 
  async>
</script>`;

  const embedReact = `import { OpinioWidget } from '@opinio/react';

export default function CheckoutPage() {
  return (
    <OpinioWidget
      token="${token}"
      style="${selectedStyle}"
      theme="${selectedTheme}"
      showScore={${showScore}}
      showCoverage={${showCoverage}}
    />
  );
}`;

  const embedIframe = `<iframe 
  src="${baseUrl}/widget/${selectedStyle === 'floating' ? 'badge' : selectedStyle}/${token}?theme=${selectedTheme}" 
  width="${selectedStyle === 'badge' ? '280' : selectedStyle === 'reassurance' ? '420' : '360'}" 
  height="${selectedStyle === 'badge' ? '64' : selectedStyle === 'reassurance' ? '120' : '220'}" 
  frameborder="0" 
  scrolling="no" 
  style="border:none; overflow:hidden;"
></iframe>`;

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreateWidget = async () => {
    setCreating(true);
    const newToken = `wgt_${business.slug}_${selectedStyle}_${Date.now().toString().slice(-4)}`;
    const res = await createOrUpdateWidgetAction({
      businessId: business.id,
      token: newToken,
      widgetType: selectedStyle,
      theme: selectedTheme,
      config: { showScore, showCoverage },
    });

    if (res.success && res.widget) {
      setWidgets([res.widget, ...widgets]);
    }
    setCreating(false);
  };

  const isTransparent = Number(business.coverage_percentage) >= 90;

  return (
    <div className="space-y-8">
      {/* 2-Column Customizer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-600" />
              <span>Personalizar Apariencia</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              Selecciona el formato que mejor se integre a tu tienda en línea o pasarela de pago.
            </p>
          </div>

          {/* 1. Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#0F172A]">
              Estilo del Componente
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'badge', name: 'Badge Compacto', desc: 'Para navbar o footer' },
                { id: 'floating', name: 'Sello Flotante', desc: 'Esquina fija en pantalla' },
                { id: 'reassurance', name: 'Tarjeta Checkout', desc: 'Junto al botón de pagar' },
                { id: 'card', name: 'Tarjeta Amplia', desc: 'Con 3 Pilares y reseñas' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id as 'badge' | 'floating' | 'reassurance' | 'card')}
                  className={cn(
                    "p-3 rounded-xl border text-left text-xs transition-all",
                    selectedStyle === style.id
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs font-semibold"
                      : "bg-[#FAFAF8] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  )}
                >
                  <div className="font-semibold">{style.name}</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#0F172A]">
              Tema Visual
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTheme('light')}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  selectedTheme === 'light'
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                    : "bg-[#FAFAF8] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                )}
              >
                <span>Tema Claro</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTheme('dark')}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  selectedTheme === 'dark'
                    ? "bg-[#0F172A] text-white border-[#0F172A] shadow-xs"
                    : "bg-[#FAFAF8] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                )}
              >
                <span>Tema Oscuro</span>
              </button>
            </div>
          </div>

          {/* 3. Toggles */}
          <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
            <label className="flex items-center justify-between text-xs text-[#334155] cursor-pointer">
              <span>Mostrar Opinio Score ({business.trust_score})</span>
              <input
                type="checkbox"
                checked={showScore}
                onChange={(e) => setShowScore(e.target.checked)}
                className="rounded border-[#CBD5E1] text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-[#334155] cursor-pointer">
              <span>Mostrar Distintivo de Cobertura Transparente</span>
              <input
                type="checkbox"
                checked={showCoverage}
                onChange={(e) => setShowCoverage(e.target.checked)}
                className="rounded border-[#CBD5E1] text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
            </label>
          </div>

          {/* Generate Token Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreateWidget}
              disabled={creating}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <span>Creando nuevo token...</span>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Generar Nuevo Token Criptográfico</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Visual Preview & Embed Snippet (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Preview Canvas */}
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B] font-mono">
                  Vista Previa en Vivo
                </h4>
              </div>

              <div className="text-[11px] text-[#64748B] font-mono flex items-center gap-2">
                <span>Fondo: {selectedTheme === 'light' ? 'Claro' : 'Oscuro'}</span>
                <span>•</span>
                <span className="truncate max-w-[150px]">Token: {token}</span>
              </div>
            </div>

            {/* Simulated Store Mock Surface */}
            <div
              className={cn(
                "p-8 rounded-xl border flex items-center justify-center min-h-[220px] transition-colors relative overflow-hidden",
                selectedTheme === 'light'
                  ? "bg-[#FAFAF8] border-[#E2E8F0]"
                  : "bg-slate-900 border-slate-800"
              )}
            >
              {/* 1. Badge Compacto Preview */}
              {selectedStyle === 'badge' && (
                <div
                  className={cn(
                    "inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-sm transition-all select-none",
                    selectedTheme === 'light'
                      ? "bg-white text-[#0F172A] border-[#E2E8F0]"
                      : "bg-slate-950 text-white border-slate-700"
                  )}
                >
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold">
                    Opinio<span className="text-emerald-600">.mx</span>
                  </span>
                  {showScore && (
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      {business.trust_score}
                    </span>
                  )}
                  {showCoverage && isTransparent && (
                    <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      Cobertura {business.coverage_percentage}%
                    </span>
                  )}
                </div>
              )}

              {/* 2. Floating Seal Preview */}
              {selectedStyle === 'floating' && (
                <div
                  className={cn(
                    "p-3.5 rounded-2xl border flex items-center gap-3 shadow-lg max-w-xs select-none",
                    selectedTheme === 'light'
                      ? "bg-white text-[#0F172A] border-[#E2E8F0]"
                      : "bg-slate-950 text-white border-slate-700"
                  )}
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      <span>{business.brand_name}</span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div className="text-[10px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-emerald-600 font-mono">Score {business.trust_score}</span>
                      <span>•</span>
                      <span>{business.coverage_percentage}% Auditado</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Reassurance Card Preview */}
              {selectedStyle === 'reassurance' && (
                <div
                  className={cn(
                    "w-full max-w-md p-4 rounded-xl border space-y-2 select-none",
                    selectedTheme === 'light'
                      ? "bg-white text-[#0F172A] border-[#E2E8F0]"
                      : "bg-slate-950 text-white border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold">Compra respaldada por Opinio.mx</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Score {business.trust_score}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Comercio con identidad jurídica verificada y garantía de resolución confirmada por el comprador.
                  </p>
                </div>
              )}

              {/* 4. Card Preview */}
              {selectedStyle === 'card' && (
                <div
                  className={cn(
                    "w-full max-w-sm p-4 rounded-2xl border space-y-3 select-none",
                    selectedTheme === 'light'
                      ? "bg-white text-[#0F172A] border-[#E2E8F0]"
                      : "bg-slate-950 text-white border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xs">
                        {business.brand_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-xs font-bold">{business.brand_name}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      {business.trust_score} / 100
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] p-2 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0]">
                    <div>
                      <div className="text-[#64748B]">Existe</div>
                      <div className="font-semibold text-emerald-700">SAT / CLEE</div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Cumple</div>
                      <div className="font-semibold text-emerald-700">{business.coverage_percentage}% Cobertura</div>
                    </div>
                    <div>
                      <div className="text-[#64748B]">Resuelve</div>
                      <div className="font-semibold text-emerald-700">{business.resolution_rate}% Confirmado</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right">
              <Link
                href={`/widget/${selectedStyle === 'floating' ? 'badge' : selectedStyle}/${token}`}
                target="_blank"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
              >
                <span>Endpoint directo del iframe: /widget/{selectedStyle === 'floating' ? 'badge' : selectedStyle}/{token}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Copyable Embed Code Snippets */}
          <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-emerald-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] font-mono">
                  Código de Inserción
                </h4>
              </div>

              {/* Code Tab Switcher */}
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('script')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    activeTab === 'script'
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  HTML / Script
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('react')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    activeTab === 'react'
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  React / Next.js
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('iframe')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all",
                    activeTab === 'iframe'
                      ? "bg-white text-[#0F172A] shadow-xs"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  Iframe
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] overflow-x-auto leading-relaxed">
                {activeTab === 'script' && embedScript}
                {activeTab === 'react' && embedReact}
                {activeTab === 'iframe' && embedIframe}
              </pre>

              <button
                type="button"
                onClick={() =>
                  copyCode(
                    activeTab === 'script'
                      ? embedScript
                      : activeTab === 'react'
                      ? embedReact
                      : embedIframe
                  )
                }
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] shadow-xs transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#64748B]" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
