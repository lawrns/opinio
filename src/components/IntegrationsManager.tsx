'use client';

import React from 'react';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Globe,
  FileText,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { Business } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IntegrationsManagerProps {
  business: Business;
}

export function IntegrationsManager({ business }: IntegrationsManagerProps) {
  const [activePlatform, setActivePlatform] = React.useState<'shopify' | 'tiendanube' | 'woocommerce' | 'api' | 'csv'>('shopify');
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvUploading, setCsvUploading] = React.useState(false);
  const [csvSuccess, setCsvSuccess] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncSuccess, setSyncSuccess] = React.useState(false);

  const webhookSecret = `whsec_${business.slug}_${business.id}x9842a1b`;
  const webhookUrl = `https://opinio.mx/api/v1/webhooks/orders`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSyncNow = () => {
    setSyncing(true);
    setSyncSuccess(false);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    }, 1500);
  };

  const handleCsvUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvUploading(true);
    setTimeout(() => {
      setCsvUploading(false);
      setCsvSuccess(true);
      setCsvFile(null);
      setTimeout(() => setCsvSuccess(false), 5000);
    }, 1800);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Denominator Ingestion */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
              Conexión Continua
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Feed de Pedidos en Vivo
            </span>
          </div>
          <h2 className="text-base font-bold text-white">
            Alimenta el Denominador de Confianza Automáticamente
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Conecta tu catálogo y pedidos entregados. Opinio reconcilia las transacciones para calcular tu cobertura real y enviar invitaciones verificadas sin intervención manual.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin text-emerald-400")} />
            <span>{syncing ? 'Sincronizando feed...' : 'Sincronizar Ahora'}</span>
          </button>
        </div>
      </div>

      {syncSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Feed de Shopify sincronizado exitosamente: 14,820 pedidos reconciliados al día de hoy.</span>
        </div>
      )}

      {/* Integration Platform Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'shopify', name: 'Shopify App', status: 'Conectado', activeColor: 'text-emerald-400' },
          { id: 'tiendanube', name: 'Tiendanube', status: 'Disponible', activeColor: 'text-blue-400' },
          { id: 'woocommerce', name: 'WooCommerce', status: 'Disponible', activeColor: 'text-purple-400' },
          { id: 'api', name: 'REST Webhooks', status: 'Desarrollador', activeColor: 'text-amber-400' },
          { id: 'csv', name: 'Importador CSV', status: 'Manual', activeColor: 'text-zinc-300' },
        ].map((plat) => (
          <button
            key={plat.id}
            type="button"
            onClick={() => setActivePlatform(plat.id as 'shopify' | 'tiendanube' | 'woocommerce' | 'api' | 'csv')}
            className={cn(
              "p-3.5 rounded-xl border text-left text-xs transition-all",
              activePlatform === plat.id
                ? "bg-zinc-800/90 text-white border-emerald-500/60 shadow-sm"
                : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white"
            )}
          >
            <div className="font-semibold text-white truncate">{plat.name}</div>
            <div className={cn("text-[10px] font-medium mt-0.5", plat.activeColor)}>
              {plat.status}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Platform Configuration Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
        {/* 1. Shopify */}
        {activePlatform === 'shopify' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400">
                  🛍️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Shopify App Oficial</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Conexión Activa
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Sincronización bidireccional de pedidos entregados y despacho de invitaciones vía WhatsApp.
                  </p>
                </div>
              </div>

              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Webhook v2026.04 Activo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <div className="text-zinc-500 text-[11px]">Tienda Conectada</div>
                <div className="font-semibold text-white font-mono">{business.domain || `${business.slug}.myshopify.com`}</div>
                <div className="text-zinc-500 text-[10px]">Shopify Plus / Advanced</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <div className="text-zinc-500 text-[11px]">Eventos Escuchados</div>
                <div className="font-semibold text-emerald-400">orders/fulfilled, orders/delivered</div>
                <div className="text-zinc-500 text-[10px]">Actualización en tiempo real</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <div className="text-zinc-500 text-[11px]">Pedidos Reconciliados</div>
                <div className="font-semibold text-white font-mono">
                  {business.observed_orders_count.toLocaleString('es-MX')} pedidos
                </div>
                <div className="text-zinc-500 text-[10px]">Últimos 90 días</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="text-xs font-semibold text-white">
                Firma Criptográfica del Webhook (App Secret)
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 font-mono text-xs text-zinc-300">
                <span className="truncate">{webhookSecret}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookSecret, 'shopify_sec')}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] flex items-center gap-1 shrink-0 ml-2"
                >
                  {copiedKey === 'shopify_sec' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'shopify_sec' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Tiendanube */}
        {activePlatform === 'tiendanube' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                ☁️
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Tiendanube México</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Instalación en 1-Clic
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Conecta tu tienda Tiendanube en México para sincronizar ventas y pasarela Pago Nube.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-lg text-xs">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  URL de tu Tiendanube
                </label>
                <input
                  type="text"
                  placeholder="https://tutienda.mitiendanube.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Access Token de la API de Tiendanube
                </label>
                <input
                  type="password"
                  placeholder="tn_sec_live_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
                />
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Conectar Tiendanube
              </button>
            </div>
          </div>
        )}

        {/* 3. WooCommerce */}
        {activePlatform === 'woocommerce' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400">
                🛒
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>WooCommerce Plugin</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    WordPress 6.0+
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Plugin oficial de Opinio para WooCommerce con soporte para SPEI y Conekta.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-lg text-xs">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Consumer Key (WooCommerce REST API)
                </label>
                <input
                  type="text"
                  placeholder="ck_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Consumer Secret
                </label>
                <input
                  type="password"
                  placeholder="cs_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono"
                />
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Vincular WooCommerce
              </button>
            </div>
          </div>
        )}

        {/* 4. Custom REST Webhooks */}
        {activePlatform === 'api' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>API REST Personalizada &amp; Webhooks</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                    Desarrolladores
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Envía pedidos desde tu backend propio (Node.js, Python, Laravel, Go) con firma HMAC SHA-256.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-zinc-300">
                Endpoint Receptor de Órdenes
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300">
                <span>POST {webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, 'wh_url')}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] flex items-center gap-1"
                >
                  {copiedKey === 'wh_url' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>Copiar URL</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">
                Ejemplo de Payload JSON (`order.delivered`)
              </div>
              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
{`{
  "event": "order.delivered",
  "business_slug": "${business.slug}",
  "order": {
    "external_id": "ORD-2026-9482",
    "customer": {
      "name": "Mariana Gómez",
      "email": "mariana.g@gmail.com",
      "phone": "+525541640533"
    },
    "amount": 3499.00,
    "currency": "MXN",
    "delivered_at": "2026-09-04T12:00:00Z"
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* 5. CSV Importer */}
        {activePlatform === 'csv' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Importador de Órdenes vía Archivo CSV</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Histórico
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Carga tus pedidos históricos de los últimos 30 a 90 días para construir tu base de cobertura.
                </p>
              </div>
            </div>

            {csvSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Archivo CSV procesado con éxito: 480 órdenes agregadas al denominador.</span>
              </div>
            )}

            <form onSubmit={handleCsvUpload} className="space-y-4 max-w-lg">
              <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 rounded-2xl p-8 text-center transition-colors">
                <Upload className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                <label className="block text-xs font-semibold text-white cursor-pointer hover:text-emerald-400 transition-colors">
                  <span>Haz clic para seleccionar o arrastra tu archivo CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {csvFile ? `Seleccionado: ${csvFile.name}` : 'Columnas requeridas: external_id, customer_email, amount, delivered_date'}
                </p>
              </div>

              <button
                type="submit"
                disabled={!csvFile || csvUploading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
              >
                {csvUploading ? 'Validando y cargando órdenes...' : 'Procesar e Importar CSV'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
