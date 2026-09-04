'use client';

import React from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Layers,
  Sparkles,
  Eye,
  Sliders,
  Check,
  Zap,
  Globe,
  Plus,
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
    const formData = new FormData();
    formData.append('business_id', String(business.id));
    formData.append('widget_type', selectedStyle === 'floating' ? 'badge' : selectedStyle);
    formData.append('theme', selectedTheme);
    formData.append('style', selectedStyle);
    formData.append('showScore', String(showScore));
    formData.append('showCoverage', String(showCoverage));

    const res = await createOrUpdateWidgetAction(formData);
    setCreating(false);

    if (res.success && res.widget) {
      setWidgets((prev) => [res.widget as Widget, ...prev]);
    }
  };

  return (
    <div className="space-y-8">
      {/* 2-Column Customizer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>Personalizar Apariencia</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Selecciona el formato que mejor se integre a tu tienda en línea o pasarela de pago.
            </p>
          </div>

          {/* 1. Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">
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
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/60 shadow-sm"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white"
                  )}
                >
                  <div className="font-semibold text-white">{style.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">
              Tema Visual
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTheme('light')}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  selectedTheme === 'light'
                    ? "bg-white text-zinc-950 border-white shadow"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
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
                    ? "bg-zinc-800 text-emerald-400 border-emerald-500/60 shadow"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
                )}
              >
                <span>Tema Oscuro</span>
              </button>
            </div>
          </div>

          {/* 3. Toggles */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Mostrar Opinio Score ({business.trust_score})</span>
              <input
                type="checkbox"
                checked={showScore}
                onChange={(e) => setShowScore(e.target.checked)}
                className="rounded bg-zinc-950 border-zinc-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Mostrar Distintivo de Cobertura Transparente</span>
              <input
                type="checkbox"
                checked={showCoverage}
                onChange={(e) => setShowCoverage(e.target.checked)}
                className="rounded bg-zinc-950 border-zinc-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
              />
            </label>
          </div>

          {/* Generate Token Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreateWidget}
              disabled={creating}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-2"
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
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Vista Previa en Vivo
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {selectedTheme === 'light' ? 'Fondo Claro' : 'Fondo Oscuro'} • Token: {token.substring(0, 14)}...
              </span>
            </div>

            {/* Rendered Preview Box */}
            <div
              className={cn(
                "p-8 rounded-2xl flex items-center justify-center min-h-[220px] transition-all border",
                selectedTheme === 'light'
                  ? "bg-zinc-100 border-zinc-300"
                  : "bg-zinc-950 border-zinc-800"
              )}
            >
              {/* 1. Badge Compacto Preview */}
              {selectedStyle === 'badge' && (
                <div
                  className={cn(
                    "inline-flex items-center gap-3 px-4 py-2.5 rounded-full border shadow-sm transition-all select-none",
                    selectedTheme === 'light'
                      ? "bg-white text-zinc-900 border-zinc-300 shadow-zinc-200"
                      : "bg-zinc-900 text-white border-zinc-700/80"
                  )}
                >
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold tracking-tight">
                      Opinio<span className="text-emerald-500">.mx</span>
                    </span>
                    {showScore && (
                      <span className="font-mono font-bold text-emerald-500">
                        {business.trust_score}
                      </span>
                    )}
                    {showCoverage && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                        Cobertura {business.coverage_percentage}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Floating Seal Preview */}
              {selectedStyle === 'floating' && (
                <div
                  className={cn(
                    "p-3 rounded-2xl border shadow-xl flex items-center gap-3 select-none max-w-xs",
                    selectedTheme === 'light'
                      ? "bg-white text-zinc-900 border-zinc-200 shadow-xl"
                      : "bg-zinc-900 text-white border-zinc-700 shadow-2xl"
                  )}
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-xs font-bold">
                      <span>{business.brand_name}</span>
                      <span className="text-emerald-500">✓</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                      <span>Score: <strong className="text-emerald-500 font-mono">{business.trust_score}</strong></span>
                      <span>•</span>
                      <span>Resolución {business.resolution_rate}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Reassurance Checkout Preview */}
              {selectedStyle === 'reassurance' && (
                <div
                  className={cn(
                    "w-full max-w-sm p-4 rounded-xl border space-y-2 select-none shadow-sm",
                    selectedTheme === 'light'
                      ? "bg-white text-zinc-900 border-zinc-200"
                      : "bg-zinc-900 text-white border-zinc-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>Compra Protegida por Opinio.mx</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      RFC SAT Validado
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 leading-snug">
                    Comercio auditado con{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {business.coverage_percentage}% de pedidos verificados
                    </strong>{' '}
                    y compromiso formal de resolución ante demoras o reclamaciones.
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span>94% reembolsos en &lt; 6h</span>
                    <span className="text-emerald-500 font-medium">Ver pasaporte ↗</span>
                  </div>
                </div>
              )}

              {/* 4. Card Preview */}
              {selectedStyle === 'card' && (
                <div
                  className={cn(
                    "w-full max-w-sm p-5 rounded-2xl border space-y-3 select-none shadow-md",
                    selectedTheme === 'light'
                      ? "bg-white text-zinc-900 border-zinc-200"
                      : "bg-zinc-900 text-white border-zinc-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">{business.brand_name}</div>
                      <div className="text-[10px] text-zinc-500">{business.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-extrabold text-emerald-500">
                        ★ {business.trust_score}
                      </div>
                      <div className="text-[9px] text-zinc-400">Score Opinio</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <div>
                      <div className="text-zinc-400">Existe</div>
                      <div className="font-semibold text-emerald-500">SAT / CLEE</div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Cumple</div>
                      <div className="font-semibold text-emerald-500">{business.coverage_percentage}%</div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Resuelve</div>
                      <div className="font-semibold text-emerald-500">{business.resolution_rate}%</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-500 italic">
                    &ldquo;Excelente atención y entrega puntual en CDMX. Súper confiable.&rdquo;
                  </div>
                </div>
              )}
            </div>

            {/* Direct Link to Widget Endpoint */}
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
              <span>Endpoint directo del iframe:</span>
              <Link
                href={`/widget/${selectedStyle === 'floating' ? 'badge' : selectedStyle}/${token}?theme=${selectedTheme}`}
                target="_blank"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                <span>/widget/{selectedStyle === 'floating' ? 'badge' : selectedStyle}/{token}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Copyable Embed Code Snippets */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                  Código de Inserción
                </h3>
              </div>

              {/* Code Tab Switcher */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('script')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-medium transition-colors",
                    activeTab === 'script'
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  HTML / Script
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('react')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-medium transition-colors",
                    activeTab === 'react'
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  React / Next.js
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('iframe')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-medium transition-colors",
                    activeTab === 'iframe'
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Iframe
                </button>
              </div>
            </div>

            {/* Code Block with Copy Button */}
            <div className="relative rounded-xl bg-zinc-950 border border-zinc-800/80 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
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
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-sans font-semibold flex items-center gap-1.5 shadow"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              <pre className="pr-20 whitespace-pre leading-relaxed">
                {activeTab === 'script'
                  ? embedScript
                  : activeTab === 'react'
                  ? embedReact
                  : embedIframe}
              </pre>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Los widgets de Opinio están firmados criptográficamente y se actualizan dinámicamente con tu puntaje y porcentaje de cobertura en tiempo real.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Registered Widgets */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">
              Widgets Creados para este Comercio
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            {widgets.length} componente(s) activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Token Criptográfico</th>
                <th className="py-2.5 px-3">Tema</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {widgets.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-zinc-200 capitalize">
                    {w.widget_type}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                    {w.token}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-zinc-800 text-zinc-300">
                      {w.theme}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Activo
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/widget/${w.widget_type}/${w.token}`}
                      target="_blank"
                      className="text-emerald-400 hover:underline text-[11px] flex items-center gap-1"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
