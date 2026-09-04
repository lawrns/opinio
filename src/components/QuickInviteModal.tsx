'use client';

import React from 'react';
import { Send, X, CheckCircle2, MessageSquare, Mail, AlertCircle, Copy } from 'lucide-react';
import { triggerInvitationAction } from '@/lib/merchant-actions';

interface QuickInviteModalProps {
  businessId: number;
  businessSlug: string;
}

export function QuickInviteModal({ businessId }: QuickInviteModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [channel, setChannel] = React.useState<'whatsapp' | 'email'>('whatsapp');
  const [target, setTarget] = React.useState('');
  const [orderId, setOrderId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; token?: string; error?: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('business_id', String(businessId));
    formData.append('channel', channel);
    formData.append('recipient_target', target);
    if (orderId) formData.append('order_id', orderId);

    const res = await triggerInvitationAction(formData);
    setLoading(false);
    setResult(res);

    if (res.success) {
      setTarget('');
      setOrderId('');
    }
  };

  const inviteUrl = result?.token
    ? `https://opinio.mx/r/${result.token}`
    : '';

  const copyToClipboard = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setResult(null);
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-[0.98]"
      >
        <Send className="h-3.5 w-3.5" />
        <span>Invitar por WhatsApp / Email</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAF8]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Enviar Invitación Verificada
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Aumenta tu porcentaje de cobertura hacia el distintivo institucional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-2">
                  Canal de Notificación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      channel === 'whatsapp'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                        : 'bg-[#FAFAF8] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Business API (+52)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      channel === 'email'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                        : 'bg-[#FAFAF8] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Correo Transaccional</span>
                  </button>
                </div>
              </div>

              {/* Target Input */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1">
                  {channel === 'whatsapp'
                    ? 'Número de WhatsApp del Cliente'
                    : 'Correo Electrónico del Cliente'}
                </label>
                <input
                  type={channel === 'whatsapp' ? 'tel' : 'email'}
                  required
                  placeholder={
                    channel === 'whatsapp'
                      ? '+52 55 1234 5678'
                      : 'cliente.nombre@gmail.com'
                  }
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Order ID Input */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1">
                  Número de Pedido o Guía (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="#SH-10482 o guía FedEx"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Mexican Compliance Notice */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
                <div className="text-[#0F172A] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Garantía de Imparcialidad (Anti-Cherry-Picking)
                </div>
                <p>
                  Opinio prohíbe el condicionamiento de invitaciones a clientes insatisfechos. Cada envío genera un enlace criptográfico único de un solo uso.
                </p>
              </div>

              {/* Feedback messages */}
              {result?.success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ¡Invitación enviada y registrada en el denominador!
                  </div>
                  <div className="p-2 rounded bg-white border border-emerald-200 font-mono text-[11px] flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate text-[#0F172A]">{inviteUrl}</span>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] shrink-0"
                      title="Copiar enlace"
                    >
                      {copied ? '¡Copiado!' : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {result?.error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{result.error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition-all"
                >
                  {loading ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Disparar Invitación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
