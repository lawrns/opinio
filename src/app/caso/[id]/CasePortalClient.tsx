'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  Send, 
  Check, 
  Scale, 
  MessageSquare, 
  CheckCircle2, 
  ArrowLeft, 
  Lock, 
  Sparkles,
  Loader2
} from 'lucide-react';

export interface CaseData {
  id: number;
  case_number: string;
  business_id: number;
  brand_name: string;
  business_slug: string;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  status: string;
  is_consumer_confirmed: boolean;
  remedy_offered: string | null;
  resolution_summary: string | null;
  median_first_response_minutes: number;
  total_resolution_hours: string | number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface MessageData {
  id: number;
  case_id: number;
  sender_type: 'consumer' | 'merchant' | 'mediator';
  sender_name: string;
  message: string;
  is_private: boolean;
  created_at: string;
}

interface Props {
  initialCase: CaseData;
  initialMessages: MessageData[];
}

const STATUS_DETAILS: Record<string, { label: string; badgeClass: string; description: string }> = {
  opened: {
    label: 'Caso Abierto',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'El caso ha sido registrado y notificado al comercio para su primera respuesta formal.',
  },
  acknowledged: {
    label: 'En Revisión por Comercio',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'El comercio ha tomado el caso y se encuentra investigando la guía o transacción.',
  },
  remedy_offered: {
    label: 'Solución Propuesta',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    description: 'El comercio ha emitido una propuesta formal de solución para tu revisión y aceptación.',
  },
  resolved_consumer_confirmed: {
    label: 'Resuelto de Conformidad',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold',
    description: 'El comprador ha confirmado formalmente que la solución fue recibida y el caso queda cerrado satisfactoriamente.',
  },
  resolved_merchant_asserted: {
    label: 'Cerrado por Comercio (Pendiente)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'El comercio indicó haber cumplido; a la espera de la confirmación expresa del comprador.',
  },
  unresolved: {
    label: 'Sin Acuerdo',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'No se logró un acuerdo voluntario entre las partes. Disponible canal de arbitraje PROFECO.',
  },
  reopened: {
    label: 'Reabierto por Comprador',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    description: 'El caso fue reabierto tras detectarse incumplimiento en la solución acordada.',
  },
};

const ISSUE_LABELS: Record<string, string> = {
  delay: 'Demora o retraso en entrega logística',
  damaged_goods: 'Producto dañado o defectuoso',
  wrong_item: 'Artículo equivocado o incompleto',
  refund_pending: 'Reembolso pendiente o no procesado',
  no_response: 'Falta de comunicación o seguimiento',
};

const REMEDY_LABELS: Record<string, string> = {
  refund: 'Reembolso total o parcial vía SPEI',
  replacement: 'Reenvío / reemplazo inmediato de mercancía',
  compensation: 'Bonificación o monedero de compensación',
  clarification: 'Aclaración de estatus de guía o garantía',
};

export function CasePortalClient({ initialCase, initialMessages }: Props) {
  const [caseData, setCaseData] = useState<CaseData>(initialCase);
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [senderName] = useState(initialCase.customer_name);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const statusInfo = STATUS_DETAILS[caseData.status] || STATUS_DETAILS.opened;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'consumer',
          sender_name: senderName.trim() || caseData.customer_name,
          message: newMessage.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Error al enviar el mensaje.');
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (caseData.is_consumer_confirmed) return;

    setConfirming(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/cases/${caseData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_consumer_confirmed: true,
          status: 'resolved_consumer_confirmed',
          resolution_summary: caseData.resolution_summary || 'El consumidor confirmó de conformidad la solución acordada.',
        }),
      });

      if (!res.ok) {
        throw new Error('Error al confirmar la resolución.');
      }

      setCaseData((prev) => ({
        ...prev,
        is_consumer_confirmed: true,
        status: 'resolved_consumer_confirmed',
        resolved_at: new Date().toISOString(),
      }));

      // Add audit system message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          case_id: caseData.id,
          sender_type: 'consumer',
          sender_name: caseData.customer_name,
          message: '✓ He verificado y confirmo de conformidad que el problema fue resuelto satisfactoriamente.',
          is_private: false,
          created_at: new Date().toISOString(),
        },
      ]);

      setActionSuccess('¡Resolución confirmada con éxito! Tu confirmación ha quedado registrada en el Pasaporte de Confianza del comercio.');
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo confirmar la resolución. Intenta nuevamente.');
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href={`/b/${caseData.business_slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#008B5D] hover:underline transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Pasaporte de {caseData.brand_name}</span>
        </Link>
      </div>

      {/* Main Header & Status Banner */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-[#121511] bg-[#FAFAF8] px-2.5 py-1 rounded-md border border-gray-200">
                {caseData.case_number}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#121511]">
              Portal de Mediación y Resolución
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Incidencia registrada entre <strong className="text-[#121511]">{caseData.customer_name}</strong> y <strong className="text-[#121511]">{caseData.brand_name}</strong>.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-xs text-gray-500">Fecha de apertura</div>
            <div className="text-xs font-mono text-[#121511] font-bold mt-0.5">
              {formatDate(caseData.created_at)}
            </div>
            <div className="text-[11px] text-[#008B5D] font-mono mt-1 font-semibold">
              SLA medido por Opinio
            </div>
          </div>
        </div>

        {/* Status Description Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
          <Scale className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {statusInfo.description} En Opinio, una reclamación solo cuenta como resuelta para el score del comercio cuando <strong className="text-emerald-950">tú como comprador confirmas de conformidad</strong>.
          </p>
        </div>

        {/* SLA Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>1. Apertura de Caso</span>
              <Check className="h-3.5 w-3.5 text-[#00B67A]" />
            </div>
            <div className="text-xs font-bold text-[#121511]">
              Registrado
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {formatDate(caseData.created_at)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>2. Respuesta Comercio</span>
              {caseData.status !== 'opened' ? (
                <Check className="h-3.5 w-3.5 text-[#00B67A]" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-amber-600" />
              )}
            </div>
            <div className="text-xs font-bold text-[#121511]">
              {caseData.median_first_response_minutes > 0 ? `${caseData.median_first_response_minutes} min` : 'En espera'}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              SLA oficial de atención: 24 horas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>3. Cierre Conforme</span>
              {caseData.is_consumer_confirmed ? (
                <Check className="h-3.5 w-3.5 text-[#00B67A]" />
              ) : (
                <span className="text-[10px] text-amber-700 font-bold">Pendiente</span>
              )}
            </div>
            <div className="text-xs font-bold text-[#121511]">
              {caseData.is_consumer_confirmed ? 'Conformidad confirmada' : 'A la espera de confirmación'}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {caseData.resolved_at ? formatDate(caseData.resolved_at) : 'Requiere acción del comprador'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 font-semibold flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-[#00B67A] shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2-Col Layout: Remedy Card & Action (Left) vs Chat Thread (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Remedy & Confirmation Action */}
        <div className="space-y-6">
          {/* Remedy Summary Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#121511] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00B67A]" />
              <span>Remedio y Solución</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-0.5">
                <span className="text-[11px] font-semibold text-gray-500">Motivo del reporte:</span>
                <p className="text-[#121511] font-bold">
                  {ISSUE_LABELS[caseData.issue_category] || caseData.issue_category}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-0.5">
                <span className="text-[11px] font-semibold text-gray-500">Solución solicitada por ti:</span>
                <p className="text-[#121511] font-bold">
                  {REMEDY_LABELS[caseData.customer_requested_remedy] || caseData.customer_requested_remedy}
                </p>
              </div>

              {caseData.remedy_offered && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                  <span className="text-[11px] font-semibold text-emerald-800">Oferta formal del comercio:</span>
                  <p className="text-emerald-950 font-medium leading-relaxed">
                    {caseData.remedy_offered}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation Action Button */}
            <div className="pt-2">
              {caseData.is_consumer_confirmed ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <ShieldCheck className="h-8 w-8 text-[#00B67A] mx-auto" />
                  <div className="text-xs font-bold text-emerald-900">
                    Resolución Confirmada de Conformidad
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Has validado satisfactoriamente el remedio ofrecido por {caseData.brand_name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleConfirmResolution}
                    disabled={confirming}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#00B67A] px-5 py-3.5 text-xs font-bold text-white hover:bg-[#008B5D] transition-all shadow-xs disabled:opacity-50 active:scale-95"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Confirmando conformidad...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirmar resolución de conformidad</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                    Al hacer clic, declaras que el comercio entregó la compensación, reemplazo o reembolso acordado.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Guarantee & PROFECO Notice */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-600 space-y-2 shadow-xs">
            <div className="flex items-center gap-1.5 text-[#121511] font-bold">
              <Scale className="h-4 w-4 text-[#00B67A]" />
              <span>Garantía de Arbitraje</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Si el comercio no cumple con lo ofrecido en este hilo privado dentro de 48 horas, Opinio habilitará la exportación certificada del expediente con sello criptográfico para presentar reclamación directa ante Concilianet de PROFECO.
            </p>
          </div>
        </div>

        {/* Right Column: Private Chat Thread */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col h-[650px]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-xs font-bold text-[#121511]">
                <MessageSquare className="h-4 w-4 text-[#00B67A]" />
                <span>Hilo Privado de Conciliación ({messages.length} mensajes)</span>
              </div>
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Cifrado punto a punto
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.map((msg) => {
                const isConsumer = msg.sender_type === 'consumer';
                const isMerchant = msg.sender_type === 'merchant';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isConsumer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px]">
                      <span className={`font-bold ${
                        isConsumer ? 'text-[#008B5D]' : isMerchant ? 'text-blue-700' : 'text-purple-700'
                      }`}>
                        {msg.sender_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {isConsumer ? '(Comprador)' : isMerchant ? `(${caseData.brand_name} Oficial)` : '(Mediador Opinio)'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        • {formatDate(msg.created_at)}
                      </span>
                    </div>

                    <div
                      className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isConsumer
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-tr-none'
                          : isMerchant
                          ? 'bg-[#F4F2EB] border border-gray-200 text-[#121511] rounded-tl-none'
                          : 'bg-purple-50 border border-purple-200 text-purple-950'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje para el comercio o mediador..."
                  className="flex-1 rounded-2xl bg-[#FAFAF8] border border-gray-200 px-4 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A]"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#121511] hover:bg-black px-5 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-40 shrink-0 shadow-xs"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Enviar</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                <span>Tu comunicación queda registrada para fines de auditoría del caso.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
