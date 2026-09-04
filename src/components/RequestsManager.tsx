'use client';

import React from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MessageSquare,
  Mail,
  Zap,
  TrendingUp,
  Package,
  Layers,
  Copy,
  ExternalLink,
  Users,
} from 'lucide-react';
import { Business, Invitation, Order } from '@/lib/types';
import { triggerInvitationAction } from '@/lib/merchant-actions';
import { cn, formatCurrency } from '@/lib/utils';

interface RequestsManagerProps {
  business: Business;
  initialInvitations: Invitation[];
  recentOrders: Order[];
}

export function RequestsManager({
  business,
  initialInvitations,
  recentOrders,
}: RequestsManagerProps) {
  const [invitations, setInvitations] = React.useState(initialInvitations);
  const [orders, setOrders] = React.useState(recentOrders);
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
    if (orderId.trim()) formData.append('order_id', orderId.trim());

    const res = await triggerInvitationAction(formData);
    setLoading(false);
    setFeedback(res);

    if (res.success && res.token) {
      setInvitations((prev) => [
        {
          id: Date.now(),
          business_id: business.id,
          order_id: orderId ? Number(orderId) : null,
          token: res.token!,
          channel,
          recipient_target: target.trim(),
          status: 'sent',
          sent_at: new Date().toISOString(),
          completed_at: null,
          customer_name: target.trim(),
        },
        ...prev,
      ]);
      setTarget('');
      setOrderId('');
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `https://opinio.mx/r/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Top Coverage Denominator Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                Auditoría de Denominador
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Actualizado en tiempo real
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Porcentaje de Cobertura de Pedidos: {coveragePercent}%
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              El motor de Opinio audita el 100% de tus ventas conectadas. Mantener una tasa de invitación ≥ 90% certifica ante los compradores que no seleccionas únicamente clientes satisfechos (prohibición de cherry-picking).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 shrink-0">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {coveragePercent}%
              </div>
              <div className="text-[11px] text-zinc-400">
                {isTransparent ? 'Distintivo Activo ✓' : 'Meta: 90.0%'}
              </div>
            </div>
            <div className="h-10 w-px bg-zinc-800" />
            <div className="text-left text-xs">
              <div className="text-zinc-400">Estatus Institucional</div>
              <div className="font-semibold text-zinc-200">
                {isTransparent ? 'Cobertura Transparente' : 'Pedidos Conectados'}
              </div>
            </div>
          </div>
        </div>

        {/* Meter */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                coveragePercent >= 90
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-amber-500 to-emerald-500"
              )}
              style={{ width: `${Math.min(100, Math.max(5, coveragePercent))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>0%</span>
            <span>Promedio México: 62%</span>
            <span className="text-emerald-400 font-semibold">Umbral Transparente: 90%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 4 Key Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="text-zinc-400 font-medium">Pedidos Observados (Denominador)</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {business.observed_orders_count.toLocaleString('es-MX')}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Sincronizados vía Shopify/Tiendanube</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="text-zinc-400 font-medium">Invitaciones Disparadas</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {business.invited_orders_count.toLocaleString('es-MX')}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Vía WhatsApp Business y Correo</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="text-zinc-400 font-medium">Tasa de Conversión a Opinión</div>
          <div className="text-2xl font-bold text-blue-400 font-mono mt-1">
            14.2%
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">WhatsApp supera al email (3.8x)</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <div className="text-zinc-400 font-medium">Tasa de Opt-Out (Bajas)</div>
          <div className="text-2xl font-bold text-zinc-300 font-mono mt-1">
            1.1%
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Bajo umbral de spam (&lt;3%)</div>
        </div>
      </div>

      {/* 2 Columns: Trigger New Invitation & Automated Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dispatch Form (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">
              Disparar Nueva Invitación de Opinión
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
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
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/50"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
                )}
              >
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>WhatsApp (+52 México)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={cn(
                  "p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  channel === 'email'
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/50"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900"
                )}
              >
                <Mail className="h-4 w-4 text-blue-400" />
                <span>Correo Transaccional</span>
              </button>
            </div>

            {/* Target input */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Order external reference */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Referencia de Pedido (Opcional)
              </label>
              <input
                type="text"
                placeholder="#ORD-2026-9481"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Feedback */}
            {feedback?.success && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Invitación registrada correctamente
                </div>
                <div className="p-2 rounded bg-black/40 font-mono text-[11px] flex items-center justify-between gap-2 overflow-hidden">
                  <span className="truncate">https://opinio.mx/r/{feedback.token}</span>
                  <button
                    type="button"
                    onClick={() => copyInviteLink(feedback.token!)}
                    className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white shrink-0"
                  >
                    {copiedToken === feedback.token ? '¡Copiado!' : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-2"
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
        <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-white">
              Reglas de Envío Automático
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Configuración recomendada de acuerdo a la Norma Mexicana de Comercio Electrónico.
          </p>

          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="font-semibold text-zinc-200 flex items-center justify-between">
                <span>Tiempo de Espera tras Entrega</span>
                <span className="text-emerald-400 font-mono font-bold">3 Días</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Permite que el comprador pruebe el producto antes de recibir la solicitud de calificación.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="font-semibold text-zinc-200 flex items-center justify-between">
                <span>Recordatorios Máximos</span>
                <span className="text-emerald-400 font-mono font-bold">1 Recordatorio</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Enviado a los 5 días si la invitación original no fue abierta.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="font-semibold text-zinc-200 flex items-center justify-between">
                <span>Anti-Cherry-Picking Activo</span>
                <span className="text-emerald-400 font-bold">100% Inclusivo</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                No se permite filtrar clientes que hayan tenido reportes de entrega o incidencias previas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Orders Table */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">
              Pedidos Monitoreados Recientes (Feed de Tienda)
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            Mostrando {orders.length} pedidos conectados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Pedido</th>
                <th className="py-2.5 px-3">Plataforma</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Invitación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-zinc-500">
                    No hay pedidos registrados en el feed reciente.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-200">
                      {o.external_order_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-zinc-800 text-zinc-300">
                        {o.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">
                      {o.customer_name || 'Comprador'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-200">
                      {o.amount ? formatCurrency(Number(o.amount)) : '$—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                        {o.status === 'delivered' ? 'Entregado' : o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {o.invited ? (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Invitado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTarget(o.customer_email || o.customer_phone || '');
                            setOrderId(o.external_order_id);
                          }}
                          className="text-[10px] text-emerald-400 hover:underline font-semibold"
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
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-white">
              Historial de Invitaciones Despachadas
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            {invitations.length} invitaciones registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Token</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3">Destinatario</th>
                <th className="py-2.5 px-3">Fecha de Envío</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Enlace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-zinc-500">
                    No hay invitaciones enviadas todavía.
                  </td>
                </tr>
              ) : (
                invitations.slice(0, 15).map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                      {inv.token.substring(0, 12)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                        {inv.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300 text-[11px]">
                      {inv.recipient_target}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
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
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                          : inv.status === 'opened'
                          ? "bg-blue-950/70 text-blue-300 border-blue-800"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
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
                        className="text-zinc-400 hover:text-white text-[11px] flex items-center gap-1 font-mono"
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
