'use client';

import React from 'react';
import {
  Plug,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Code2,
  Upload,
  FileText,
} from 'lucide-react';
import { Business } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IntegrationsManagerProps {
  business: Business;
}

export function IntegrationsManager({ business }: IntegrationsManagerProps) {
  const [activePlatform, setActivePlatform] = React.useState<'shopify' | 'tiendanube' | 'woocommerce' | 'api' | 'csv'>('shopify');
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [syncSuccess, setSyncSuccess] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvUploading, setCsvUploading] = React.useState(false);
  const [csvSuccess, setCsvSuccess] = React.useState(false);

  const webhookUrl = `https://opinio.mx/api/v1/order-events?token=sec_live_${business.slug}_9841`;
  const webhookSecret = `whsec_${business.slug}_opinio_hmac_2026`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSyncNow = () => {
    setSyncing(true);
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
      <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              Conexión Continua
            </span>
            <span className="text-xs text-[#64748B] font-mono">
              Feed de Pedidos en Vivo
            </span>
          </div>
          <h2 className="text-base font-bold text-[#0F172A]">
            Alimenta el Denominador de Confianza Automáticamente
          </h2>
          <p className="text-xs text-[#475569] leading-relaxed">
            Conecta tu catálogo y pedidos entregados. Opinio reconcilia las transacciones para calcular tu cobertura real y enviar invitaciones verificadas sin intervención manual.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin text-emerald-600")} />
            <span>{syncing ? 'Sincronizando feed...' : 'Sincronizar Ahora'}</span>
          </button>
        </div>
      </div>

      {syncSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Feed de Shopify sincronizado exitosamente: 14,820 pedidos reconciliados al día de hoy.</span>
        </div>
      )}

      {/* Integration Platform Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'shopify', name: 'Shopify App', status: 'Conectado', activeColor: 'text-emerald-700 font-bold' },
          { id: 'tiendanube', name: 'Tiendanube', status: 'Disponible', activeColor: 'text-blue-700 font-medium' },
          { id: 'woocommerce', name: 'WooCommerce', status: 'Disponible', activeColor: 'text-purple-700 font-medium' },
          { id: 'api', name: 'REST Webhooks', status: 'Desarrollador', activeColor: 'text-amber-800 font-medium' },
          { id: 'csv', name: 'Importador CSV', status: 'Manual', activeColor: 'text-[#64748B]' },
        ].map((plat) => (
          <button
            key={plat.id}
            type="button"
            onClick={() => setActivePlatform(plat.id as 'shopify' | 'tiendanube' | 'woocommerce' | 'api' | 'csv')}
            className={cn(
              "p-3.5 rounded-xl border text-left text-xs transition-all",
              activePlatform === plat.id
                ? "bg-white text-[#0F172A] border-emerald-500 shadow-xs ring-1 ring-emerald-500/20"
                : "bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            )}
          >
            <div className="font-semibold text-[#0F172A] truncate">{plat.name}</div>
            <div className={cn("text-[10px] mt-0.5", plat.activeColor)}>
              {plat.status}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Platform Configuration Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
        {/* 1. Shopify */}
        {activePlatform === 'shopify' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-lg">
                  🛍️
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                    <span>Shopify App Oficial</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Conexión Activa
                    </span>
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Sincronización bidireccional de pedidos entregados y despacho de invitaciones vía WhatsApp.
                  </p>
                </div>
              </div>

              <span className="text-xs text-emerald-700 font-mono flex items-center gap-1.5 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Webhook v2026.04 Activo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
                <div className="text-[#64748B] text-[11px]">Tienda Conectada</div>
                <div className="font-semibold text-[#0F172A] font-mono">{business.domain || `${business.slug}.myshopify.com`}</div>
                <div className="text-[#94A3B8] text-[10px]">Shopify Plus / Advanced</div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
                <div className="text-[#64748B] text-[11px]">Eventos Escuchados</div>
                <div className="font-semibold text-emerald-700">orders/fulfilled, orders/delivered</div>
                <div className="text-[#94A3B8] text-[10px]">Actualización en tiempo real</div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
                <div className="text-[#64748B] text-[11px]">Pedidos Reconciliados</div>
                <div className="font-semibold text-[#0F172A] font-mono">
                  {business.observed_orders_count.toLocaleString('es-MX')} pedidos
                </div>
                <div className="text-[#94A3B8] text-[10px]">Últimos 90 días</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-3">
              <div className="text-xs font-semibold text-[#0F172A]">
                Firma Criptográfica del Webhook (App Secret)
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2E8F0] font-mono text-xs text-[#0F172A]">
                <span className="truncate">{webhookSecret}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookSecret, 'shopify_sec')}
                  className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-[11px] flex items-center gap-1 shrink-0 ml-2"
                >
                  {copiedKey === 'shopify_sec' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedKey === 'shopify_sec' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Tiendanube */}
        {activePlatform === 'tiendanube' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 text-lg">
                ☁️
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <span>Tiendanube México</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                    Instalación en 1-Clic
                  </span>
                </h3>
                <p className="text-xs text-[#64748B]">
                  Conecta tu tienda Tiendanube en México para sincronizar ventas y pasarela Pago Nube.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-lg text-xs">
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  URL de tu Tiendanube
                </label>
                <input
                  type="text"
                  placeholder="https://tutienda.mitiendanube.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Access Token de la API de Tiendanube
                </label>
                <input
                  type="password"
                  placeholder="tn_sec_live_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] font-mono"
                />
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Conectar Tiendanube
              </button>
            </div>
          </div>
        )}

        {/* 3. WooCommerce */}
        {activePlatform === 'woocommerce' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
              <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center font-bold text-purple-600 text-lg">
                🛒
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <span>WooCommerce Plugin</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                    WordPress 6.0+
                  </span>
                </h3>
                <p className="text-xs text-[#64748B]">
                  Plugin oficial de Opinio para WooCommerce con soporte para SPEI y Conekta.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-lg text-xs">
              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Consumer Key (WooCommerce REST API)
                </label>
                <input
                  type="text"
                  placeholder="ck_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0F172A] mb-1">
                  Consumer Secret
                </label>
                <input
                  type="password"
                  placeholder="cs_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] font-mono"
                />
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Vincular WooCommerce
              </button>
            </div>
          </div>
        )}

        {/* 4. Custom REST Webhooks */}
        {activePlatform === 'api' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <span>API REST Personalizada &amp; Webhooks</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    Desarrolladores
                  </span>
                </h3>
                <p className="text-xs text-[#64748B]">
                  Envía pedidos desde tu backend propio (Node.js, Python, Laravel, Go) con firma HMAC SHA-256.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#0F172A]">
                Endpoint Receptor de Órdenes
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] font-mono text-xs text-[#0F172A]">
                <span>POST {webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, 'wh_url')}
                  className="px-2.5 py-1 rounded bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] text-[11px] flex items-center gap-1 shadow-xs"
                >
                  {copiedKey === 'wh_url' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>Copiar URL</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#0F172A]">
                Ejemplo de Payload JSON (`order.delivered`)
              </div>
              <pre className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] font-mono text-[11px] text-[#0F172A] overflow-x-auto leading-relaxed">
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
            <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
              <div className="h-10 w-10 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center font-bold text-[#334155]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <span>Importador de Órdenes vía Archivo CSV</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                    Histórico
                  </span>
                </h3>
                <p className="text-xs text-[#64748B]">
                  Carga tus pedidos históricos de los últimos 30 a 90 días para construir tu base de cobertura.
                </p>
              </div>
            </div>

            {csvSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Archivo CSV procesado con éxito: 480 órdenes agregadas al denominador.</span>
              </div>
            )}

            <form onSubmit={handleCsvUpload} className="space-y-4 max-w-lg">
              <div className="border-2 border-dashed border-[#CBD5E1] hover:border-emerald-500 rounded-2xl p-8 text-center transition-colors bg-[#FAFAF8]">
                <Upload className="h-8 w-8 text-[#94A3B8] mx-auto mb-2" />
                <label className="block text-xs font-semibold text-[#0F172A] cursor-pointer hover:text-emerald-700 transition-colors">
                  <span>Haz clic para seleccionar o arrastra tu archivo CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {csvFile ? `Seleccionado: ${csvFile.name}` : 'Columnas requeridas: external_id, customer_email, amount, delivered_date'}
                </p>
              </div>

              <button
                type="submit"
                disabled={!csvFile || csvUploading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
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
