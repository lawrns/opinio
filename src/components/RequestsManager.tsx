'use client';

import React from 'react';
import {
  Send,
  MessageSquare,
  Mail,
  CheckCircle2,
  Package,
  Layers,
  Copy,
  Zap,
} from 'lucide-react';
import { Business, Order, Invitation } from '@/lib/types';
import { triggerInvitationAction } from '@/lib/merchant-actions';
import { cn } from '@/lib/utils';

interface RequestsManagerProps {
  business: Business;
  orders: Order[];
  invitations: Invitation[];
}

export function RequestsManager({
  business,
  orders,
  invitations: initialInvitations,
}: RequestsManagerProps) {
  const [invitations, setInvitations] = React.useState(initialInvitations);
  const [channel, setChannel] = React.useState<'whatsapp' | 'email'>('whatsapp');
  const [target, setTarget] = React.useState('');
  const [orderId, setOrderId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ success: boolean; token?: string; error?: string } | null>(null);
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const coveragePercent = Number(business.coverage_percentage) || 0;
  const isTransparent = coveragePercent >= 90;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('business_id', String(business.id));
    formData.append('channel', channel);
    formData.append('recipient_target', target.trim());
    if (orderId) formData.append('order_id', orderId.trim());

    const res = await triggerInvitationAction(formData);
    setLoading(false);
    setFeedback(res);

    if (res.success && res.token) {
      setInvitations([
        {
          id: Date.now(),
          business_id: business.id,
          order_id: null,
          token: res.token,
          channel,
          recipient_target: target.trim(),
          status: 'delivered',
          sent_at: new Date().toISOString(),
          completed_at: null,
        },
        ...invitations,
      ]);
      setTarget('');
      setOrderId('');
    }
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`https://opinio.mx/r/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* Top Coverage Denominator Banner */}
      <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Auditoría de Denominador
              </span>
              <span className="text-xs text-[#64748B] font-mono">
                Actualizado en tiempo real
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              Porcentaje de Cobertura de Pedidos: {coveragePercent}%
            </h2>
            <p className="text-xs text-[#475569] leading-relaxed">
              El motor de Opinio audita el 100% de tus ventas conectadas. Mantener una tasa de invitación ≥ 90% certifica ante los compradores que no seleccionas únicamente clientes satisfechos (prohibición de cherry-picking).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs shrink-0">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {coveragePercent}%
              </div>
              <div className="text-[11px] text-[#64748B]">
                {isTransparent ? 'Distintivo Activo ✓' : 'Meta: 90.0%'}
              </div>
            </div>
            <div className="h-10 w-px bg-[#E2E8F0]" />
            <div className="text-left text-xs">
              <div className="text-[#64748B]">Estatus Institucional</div>
              <div className="font-semibold text-[#0F172A]">
                {isTransparent ? 'Cobertura Transparente' : 'Pedidos Conectados'}
              </div>
            </div>
          </div>
        </div>

        {/* Meter */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-[#E2E8F0] rounded-full overflow-hidden p-0.5 border border-[#CBD5E1]">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                coveragePercent >= 90
                  ? "bg-[#059669]"
                  : "bg-amber-500"
              )}
              style={{ width: `${Math.min(100, Math.max(5, coveragePercent))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#64748B] font-mono">
            <span>0%</span>
            <span>Promedio México: 62%</span>
            <span className="text-emerald-700 font-bold">Umbral Transparente: 90%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 4 Key Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-[#64748B] font-medium">Pedidos Observados (Denominador)</div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono mt-1">
            {business.observed_orders_count.toLocaleString('es-MX')}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Sincronizados vía Shopify/Tiendanube</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-[#64748B] font-medium">Invitaciones Disparadas</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {business.invited_orders_count.toLocaleString('es-MX')}
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Vía WhatsApp Business y Correo</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-[#64748B] font-medium">Tasa de Conversión a Opinión</div>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1">
            14.2%
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">WhatsApp supera al email (3.8x)</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="text-[#64748B] font-medium">Tasa de Opt-Out (Bajas)</div>
          <div className="text-2xl font-bold text-[#334155] font-mono mt-1">
            1.1%
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1">Bajo umbral de spam (&lt;3%)</div>
        </div>
      </div>

      {/* 2 Columns: Trigger New Invitation & Automated Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dispatch Form (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-[#0F172A]">
              Disparar Nueva Invitación de Opinión
            </h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Envía una solicitud individual para registrar la transacción en el denominador de confianza.
          </p>

          <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
            {/* Channel buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={cn(
                  "p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  channel === 'whatsapp'
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                    : "bg-[#FAFAF8] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                )}
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>WhatsApp (+52 México)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={cn(
                  "p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  channel === 'email'
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                    : "bg-[#FAFAF8] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                )}
              >
                <Mail className="h-4 w-4 text-blue-600" />
                <span>Correo Transaccional</span>
              </button>
            </div>

            {/* Target input */}
            <div>
              <label className="block text-xs font-medium text-[#0F172A] mb-1">
                {channel === 'whatsapp'
                  ? 'Teléfono celular (+52)'
                  : 'Correo del comprador'}
              </label>
              <input
                type={channel === 'whatsapp' ? 'tel' : 'email'}
                required
                placeholder={
                  channel === 'whatsapp'
                    ? '+52 55 9876 5432'
                    : 'cliente@ejemplo.com'
                }
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Order external reference */}
            <div>
              <label className="block text-xs font-medium text-[#0F172A] mb-1">
                Referencia de Pedido (Opcional)
              </label>
              <input
                type="text"
                placeholder="#ORD-2026-9481"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Feedback */}
            {feedback?.success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Invitación registrada correctamente
                </div>
                <div className="p-2 rounded bg-white border border-emerald-200 font-mono text-[11px] flex items-center justify-between gap-2 overflow-hidden">
                  <span className="truncate text-[#0F172A]">https://opinio.mx/r/{feedback.token}</span>
                  <button
                    type="button"
                    onClick={() => copyInviteLink(feedback.token!)}
                    className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] shrink-0"
                  >
                    {copiedToken === feedback.token ? '¡Copiado!' : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Registrando...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar Invitación Verificada</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Automation Policy (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold text-sm text-[#0F172A]">
              Reglas de Envío Automático
            </h3>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Configuración recomendada de acuerdo a la Norma Mexicana de Comercio Electrónico.
          </p>

          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
              <div className="font-semibold text-[#0F172A] flex items-center justify-between">
                <span>Tiempo de Espera tras Entrega</span>
                <span className="text-emerald-700 font-mono font-bold">3 Días</span>
              </div>
              <p className="text-[#64748B] text-[11px]">
                Permite que el comprador pruebe el producto antes de recibir la solicitud de calificación.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
              <div className="font-semibold text-[#0F172A] flex items-center justify-between">
                <span>Recordatorios Máximos</span>
                <span className="text-emerald-700 font-mono font-bold">1 Recordatorio</span>
              </div>
              <p className="text-[#64748B] text-[11px]">
                Enviado a los 5 días si la invitación original no fue abierta.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
              <div className="font-semibold text-[#0F172A] flex items-center justify-between">
                <span>Anti-Cherry-Picking Activo</span>
                <span className="text-emerald-700 font-bold">100% Inclusivo</span>
              </div>
              <p className="text-[#64748B] text-[11px]">
                No se permite filtrar clientes que hayan tenido reportes de entrega o incidencias previas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Orders Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-[#0F172A]">
              Pedidos Monitoreados Recientes (Feed de Tienda)
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            Mostrando {orders.length} pedidos conectados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF8] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Pedido</th>
                <th className="py-2.5 px-3">Plataforma</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Invitación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[#94A3B8]">
                    No hay pedidos registrados en el feed reciente.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0F172A]">
                      {o.external_order_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[#F1F5F9] text-[#334155]">
                        {o.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">
                      {o.customer_name || 'Comprador'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#0F172A]">
                      {o.amount ? formatCurrency(Number(o.amount)) : '$—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {o.status === 'delivered' ? 'Entregado' : o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {o.invited ? (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Invitado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTarget(o.customer_email || o.customer_phone || '');
                            setOrderId(o.external_order_id);
                          }}
                          className="text-[10px] text-emerald-700 hover:underline font-semibold"
                        >
                          Invitar ahora
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations History Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-[#0F172A]">
              Historial de Invitaciones Despachadas
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            {invitations.length} invitaciones registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAF8] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Token</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3">Destinatario</th>
                <th className="py-2.5 px-3">Fecha de Envío</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Enlace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[#94A3B8]">
                    No hay invitaciones enviadas todavía.
                  </td>
                </tr>
              ) : (
                invitations.slice(0, 15).map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[#64748B] text-[11px]">
                      {inv.token.substring(0, 12)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#334155]">
                        {inv.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#0F172A] text-[11px]">
                      {inv.recipient_target}
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B] text-[11px]">
                      {new Date(inv.sent_at).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded border",
                        inv.status === 'completed'
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : inv.status === 'opened'
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]"
                      )}>
                        {inv.status === 'completed'
                          ? 'Completada'
                          : inv.status === 'opened'
                          ? 'Abierta'
                          : 'Entregada'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => copyInviteLink(inv.token)}
                        className="text-[#64748B] hover:text-[#0F172A] text-[11px] flex items-center gap-1 font-mono"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedToken === inv.token ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
