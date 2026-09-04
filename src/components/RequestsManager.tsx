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
  const [copyError, setCopyError] = React.useState('');
  const [visibleInvitations, setVisibleInvitations] = React.useState(15);
  const targetRef = React.useRef<HTMLInputElement>(null);

  const coveragePercent = Number(business.coverage_percentage) || 0;
  const isTransparent = coveragePercent >= 90;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim() || loading) return;
    if (channel === 'whatsapp' && !/^\+?52\d{10}$/.test(target.replace(/[\s()-]/g, ''))) {
      setFeedback({ success: false, error: 'Escribe +52 seguido de los 10 dígitos del celular.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('business_id', String(business.id));
    formData.append('channel', channel);
    formData.append('recipient_target', target.trim());
    if (orderId) formData.append('order_id', orderId.trim());

    const res = await triggerInvitationAction(formData).catch(() => ({ success: false, error: 'No pudimos conectar. Conservamos tus datos para volver a intentarlo.', token: undefined }));
    setLoading(false);
    setFeedback(res);

    if (res.success && res.token) {
      setInvitations([
        {
          id: Date.now(),
          business_id: business.id,
          order_id: orderId ? Number(orderId) : null,
          token: res.token,
          channel,
          recipient_target: target.trim(),
          status: 'sent',
          sent_at: new Date().toISOString(),
          completed_at: null,
        },
        ...invitations,
      ]);
      setTarget('');
      setOrderId('');
    }
  };

  const copyInviteLink = async (token: string) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/escribir-opinion/${encodeURIComponent(business.slug)}`);
      setCopiedToken(token);
    } catch {
      setCopyError('No se pudo copiar el enlace. Selecciona el texto para copiarlo manualmente.');
    }
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
      <div className="p-6 rounded-2xl bg-op-canvas border border-op-border shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-op-green-soft text-op-green-dark border border-op-green-border">
                Auditoría de Denominador
              </span>
              <span className="text-xs text-op-muted font-mono">
                Datos registrados
              </span>
            </div>
            <h2 className="text-lg font-bold text-op-ink">
              Porcentaje de Cobertura de Pedidos: {coveragePercent}%
            </h2>
            <p className="text-xs text-op-secondary leading-relaxed">
              La cobertura compara las invitaciones registradas con los pedidos observados. Invita a todos tus clientes, incluidas las personas que tuvieron una experiencia negativa.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-op-border shadow-xs shrink-0">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-op-green-dark">
                {coveragePercent}%
              </div>
              <div className="text-xs text-op-muted">
                {isTransparent ? 'Distintivo Activo ✓' : 'Meta: 90.0%'}
              </div>
            </div>
            <div className="h-10 w-px bg-op-border" />
            <div className="text-left text-xs">
              <div className="text-op-muted">Estatus Institucional</div>
              <div className="font-semibold text-op-ink">
                {isTransparent ? 'Cobertura Transparente' : 'Pedidos Conectados'}
              </div>
            </div>
          </div>
        </div>

        {/* Meter */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-op-border rounded-full overflow-hidden p-0.5 border border-op-strong">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                coveragePercent >= 90
                  ? "bg-op-green"
                  : "bg-op-warning"
              )}
              style={{ width: `${Math.min(100, Math.max(0, coveragePercent))}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-between text-xs text-op-muted font-mono">
            <span>0%</span>

            <span className="text-op-green-dark font-bold">Umbral Transparente: 90%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 4 Key Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white border border-op-border shadow-xs">
          <div className="text-op-muted font-medium">Pedidos Observados (Denominador)</div>
          <div className="text-2xl font-bold text-op-ink font-mono mt-1">
            {business.observed_orders_count.toLocaleString('es-MX')}
          </div>
          <div className="text-xs text-op-muted mt-1">Disponible en el historial del negocio</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-op-border shadow-xs">
          <div className="text-op-muted font-medium">Invitaciones registradas</div>
          <div className="text-2xl font-bold text-op-green-dark font-mono mt-1">
            {business.invited_orders_count.toLocaleString('es-MX')}
          </div>
          <div className="text-xs text-op-muted mt-1">Registros de invitación del negocio</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-op-border shadow-xs">
          <div className="text-op-muted font-medium">Invitaciones completadas</div>
          <div className="text-2xl font-bold text-op-secondary font-mono mt-1">
            {invitations.filter((invitation) => invitation.status === 'completed').length}
          </div>
          <div className="text-xs text-op-muted mt-1">En el historial registrado</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-op-border shadow-xs">
          <div className="text-op-muted font-medium">Solicitudes de baja</div>
          <div className="text-2xl font-bold text-op-secondary font-mono mt-1">
            {invitations.filter((invitation) => invitation.status === 'opt_out').length}
          </div>
          <div className="text-xs text-op-muted mt-1">En el historial registrado</div>
        </div>
      </div>

      {/* 2 Columns: Trigger New Invitation & Automated Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dispatch Form (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-op-border shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-op-green-dark" />
            <h3 className="font-semibold text-sm text-op-ink">
              Crear una invitación de opinión
            </h3>
          </div>
          <p className="text-xs text-op-muted">
            Registra una invitación y comparte el formulario público. Este enlace no identifica la invitación ni acredita una compra. El registro tampoco confirma la entrega del mensaje.
          </p>

          <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
            {/* Channel buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={channel === 'whatsapp'}
                onClick={() => { setChannel('whatsapp'); setTarget(''); }}
                className={cn(
                  "p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  channel === 'whatsapp'
                    ? "bg-op-green-soft text-op-green-dark border-op-green-border shadow-xs"
                    : "bg-op-canvas text-op-muted border-op-border hover:bg-op-shaded"
                )}
              >
                <MessageSquare className="h-4 w-4 text-op-green-dark" />
                <span>WhatsApp (+52 México)</span>
              </button>

              <button
                type="button"
                aria-pressed={channel === 'email'}
                onClick={() => { setChannel('email'); setTarget(''); }}
                className={cn(
                  "p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                  channel === 'email'
                    ? "bg-op-green-soft text-op-green-dark border-op-green-border shadow-xs"
                    : "bg-op-canvas text-op-muted border-op-border hover:bg-op-shaded"
                )}
              >
                <Mail className="h-4 w-4 text-op-secondary" />
                <span>Correo Transaccional</span>
              </button>
            </div>

            {/* Target input */}
            <div>
              <label htmlFor="request-target" className="block text-xs font-medium text-op-ink mb-1">
                {channel === 'whatsapp'
                  ? 'Teléfono celular (+52)'
                  : 'Correo del comprador'}
              </label>
              <input
                id="request-target"
                ref={targetRef}
                autoComplete={channel === 'whatsapp' ? 'tel' : 'email'}
                type={channel === 'whatsapp' ? 'tel' : 'email'}
                required
                placeholder={
                  channel === 'whatsapp'
                    ? '+52 55 9876 5432'
                    : 'cliente@ejemplo.com'
                }
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink placeholder:text-op-muted focus:outline-none focus:border-op-green-border"
              />
            </div>

            <div>
              <label htmlFor="request-order" className="mb-1 block text-sm font-medium text-op-ink">Pedido relacionado (opcional)</label>
              <select id="request-order" value={orderId} onChange={(event) => setOrderId(event.target.value)} className="min-h-12 w-full rounded-xl border border-op-border bg-op-canvas px-3 text-base text-op-ink">
                <option value="">Sin pedido relacionado</option>
                {orders.map((order) => <option key={order.id} value={String(order.id)}>{order.external_order_id} · {order.customer_name || 'Comprador'}</option>)}
              </select>
            </div>
            {feedback?.error && <p role="alert" className="rounded-xl bg-op-danger-soft p-3 text-sm text-op-danger">No se pudo registrar la invitación. {feedback.error.includes('conectar') || feedback.error.includes('dígitos') ? feedback.error : 'Revisa los datos e inténtalo de nuevo.'}</p>}
            {copyError && <p role="alert" className="text-sm text-op-danger">{copyError}</p>}
            {/* Feedback */}
            {feedback?.success && (
              <div role="status" className="p-3 rounded-xl bg-op-green-soft border border-op-green-border text-xs text-op-green-dark space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-op-green-dark" />
                  Invitación registrada correctamente
                </div>
                <div className="p-2 rounded bg-white border border-op-green-border font-mono text-xs flex items-center justify-between gap-2 overflow-hidden">
                  <input aria-label="Enlace al formulario público de opiniones" readOnly value={`${window.location.origin}/escribir-opinion/${encodeURIComponent(business.slug)}`} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 bg-op-sheet text-base text-op-ink" />
                  <button
                    type="button"
                    aria-label="Copiar enlace al formulario público"
                    onClick={() => copyInviteLink(feedback.token!)}
                    className="p-1 rounded bg-op-shaded hover:bg-op-border text-op-ink shrink-0"
                  >
                    {copiedToken === feedback.token ? '¡Copiado!' : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-op-green hover:bg-op-green text-white shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Registrando...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Registrar invitación</span>
                </>
              )}
            </button>
          </form>
        </div>

        <aside className="lg:col-span-5 rounded-2xl border border-op-border bg-op-sheet p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-op-ink"><Zap className="h-5 w-5 text-op-green" aria-hidden="true" /> Invitaciones imparciales</h3>
          <p className="mt-3 text-sm leading-relaxed text-op-secondary">Comparte el enlace después de la entrega y permite que cada cliente cuente su experiencia con libertad.</p>
          <p className="mt-4 rounded-xl bg-op-canvas p-4 text-sm leading-relaxed text-op-muted">Los envíos automáticos y recordatorios todavía no están configurados desde este panel.</p>
        </aside>
      </div>

      {/* Connected Orders Table */}
      <div className="p-6 rounded-2xl bg-white border border-op-border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-op-secondary" />
            <h3 className="font-semibold text-sm text-op-ink">
              Pedidos registrados recientes
            </h3>
          </div>
          <span className="text-xs text-op-muted">
            Mostrando {orders.length} pedidos registrados
          </span>
        </div>

        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Pedidos registrados, tabla desplazable">
          <table className="w-full text-left text-xs">
            <thead className="bg-op-canvas border-b border-op-border text-op-muted uppercase text-xs tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Pedido</th>
                <th className="py-2.5 px-3">Plataforma</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Invitación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-op-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-op-muted">
                    No hay pedidos registrados en el feed reciente.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-op-canvas transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-op-ink">
                      {o.external_order_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs uppercase font-semibold bg-op-shaded text-op-secondary">
                        {o.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-op-secondary">
                      {o.customer_name || 'Comprador'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-op-ink">
                      {o.amount ? formatCurrency(Number(o.amount)) : '$—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs font-medium text-op-green-dark bg-op-green-soft px-2 py-0.5 rounded border border-op-green-border">
                        {o.status === 'delivered' ? 'Entregado' : o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {o.invited ? (
                        <span className="text-xs font-semibold text-op-green-dark flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Invitado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setChannel(o.customer_email ? 'email' : 'whatsapp');
                            setTarget(o.customer_email || o.customer_phone || '');
                            setOrderId(String(o.id));
                            targetRef.current?.focus();
                            targetRef.current?.scrollIntoView({ block: 'center' });
                          }}
                          className="text-xs text-op-green-dark hover:underline font-semibold"
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
      <div className="p-6 rounded-2xl bg-white border border-op-border shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-op-green-dark" />
            <h3 className="font-semibold text-sm text-op-ink">
              Historial de invitaciones
            </h3>
          </div>
          <span className="text-xs text-op-muted">
            {invitations.length} invitaciones registradas
          </span>
        </div>

        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Historial de invitaciones, tabla desplazable">
          <table className="w-full text-left text-xs">
            <thead className="bg-op-canvas border-b border-op-border text-op-muted uppercase text-xs tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Token</th>
                <th className="py-2.5 px-3">Canal</th>
                <th className="py-2.5 px-3">Destinatario</th>
                <th className="py-2.5 px-3">Fecha de registro</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Enlace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-op-border">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-op-muted">
                    No hay invitaciones registradas todavía.
                  </td>
                </tr>
              ) : (
                invitations.slice(0, visibleInvitations).map((inv) => (
                  <tr key={inv.id} className="hover:bg-op-canvas transition-colors">
                    <td className="py-2.5 px-3 font-mono text-op-muted text-xs">
                      {inv.token.substring(0, 12)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-op-shaded text-op-secondary">
                        {inv.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-op-ink text-xs">
                      {inv.recipient_target}
                    </td>
                    <td className="py-2.5 px-3 text-op-muted text-xs">
                      {new Date(inv.sent_at).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded border",
                        inv.status === 'completed'
                          ? "bg-op-green-soft text-op-green-dark border-op-green-border"
                          : inv.status === 'opened'
                          ? "bg-op-shaded text-op-secondary border-op-border"
                          : "bg-op-shaded text-op-muted border-op-border"
                      )}>
                        {inv.status === 'completed'
                          ? 'Completada'
                          : inv.status === 'opened'
                          ? 'Abierta'
                          : inv.status === 'delivered' ? 'Entregada' : inv.status === 'opt_out' ? 'Baja solicitada' : 'Registrada'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => copyInviteLink(inv.token)}
                        className="text-op-muted hover:text-op-ink text-xs flex items-center gap-1 font-mono"
                      >
                        <Copy className="h-3 w-3" />
                        <span>{copiedToken === inv.token ? '¡Copiado!' : 'Copiar formulario'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {visibleInvitations < invitations.length && <button type="button" onClick={() => setVisibleInvitations((count) => count + 15)} className="min-h-11 rounded-xl border border-op-border px-4 text-sm font-semibold text-op-green-dark">Mostrar más invitaciones ({invitations.length - visibleInvitations} restantes)</button>}
      </div>
    </div>
  );
}
