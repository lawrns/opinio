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
    badgeClass: 'bg-[var(--op-warning-tint)] text-[var(--op-warning-ink)] border-[var(--op-warning-border)]',
    description: 'El caso está registrado y espera una respuesta del comercio.',
  },
  acknowledged: {
    label: 'En Revisión por Comercio',
    badgeClass: 'bg-[var(--op-shaded)] text-[var(--op-link)] border-[var(--op-border-strong)]',
    description: 'El comercio ha tomado el caso y se encuentra investigando la guía o transacción.',
  },
  remedy_offered: {
    label: 'Solución Propuesta',
    badgeClass: 'bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)] border-[var(--op-verified-border)]',
    description: 'El comercio ha emitido una propuesta formal de solución para tu revisión y aceptación.',
  },
  resolved_consumer_confirmed: {
    label: 'Resuelto de Conformidad',
    badgeClass: 'bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)] border-[var(--op-verified-border)] font-bold',
    description: 'El comprador ha confirmado formalmente que la solución fue recibida y el caso queda cerrado satisfactoriamente.',
  },
  resolved_merchant_asserted: {
    label: 'Cerrado por Comercio (Pendiente)',
    badgeClass: 'bg-[var(--op-warning-tint)] text-[var(--op-warning-ink)] border-[var(--op-warning-border)]',
    description: 'El comercio indicó haber cumplido; a la espera de la confirmación expresa del comprador.',
  },
  unresolved: {
    label: 'Sin Acuerdo',
    badgeClass: 'bg-[var(--op-danger-tint)] text-[var(--op-danger-ink)] border-[var(--op-danger-border)]',
    description: 'No se registró un acuerdo entre las partes. Puedes conservar el historial para dar seguimiento por otros canales.',
  },
  reopened: {
    label: 'Reabierto por Comprador',
    badgeClass: 'bg-[var(--op-shaded)] text-[var(--op-link)] border-[var(--op-border-strong)]',
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
  const [resolutionReceived, setResolutionReceived] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const statusInfo = STATUS_DETAILS[caseData.status] || STATUS_DETAILS.opened;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !newMessage.trim()) return;

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
    if (confirming || !resolutionReceived || caseData.is_consumer_confirmed) return;

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

      const data = await res.json();
      setCaseData((previous) => ({ ...previous, ...data.case }));
      if (Array.isArray(data.case.messages)) setMessages(data.case.messages);

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
      if (Number.isNaN(d.getTime())) return 'Fecha no disponible';
      return d.toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City',
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--op-verified-ink)] hover:underline transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Pasaporte de {caseData.brand_name}</span>
        </Link>
      </div>

      {/* Main Header & Status Banner */}
      <div className="rounded-3xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--op-border-hairline)]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-[var(--op-ink-primary)] bg-[var(--op-canvas)] px-2.5 py-1 rounded-md border border-[var(--op-border-hairline)]">
                {caseData.case_number}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--op-ink-primary)]">
              Seguimiento de tu caso
            </h1>
            <p className="text-sm text-[var(--op-ink-secondary)] mt-1">
              Incidencia registrada entre <strong className="text-[var(--op-ink-primary)]">{caseData.customer_name}</strong> y <strong className="text-[var(--op-ink-primary)]">{caseData.brand_name}</strong>.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-xs text-[var(--op-ink-muted)]">Fecha de apertura</div>
            <div className="text-xs font-mono text-[var(--op-ink-primary)] font-bold mt-0.5">
              {formatDate(caseData.created_at)}
            </div>
            <div className="text-xs text-[var(--op-verified-ink)] font-mono mt-1 font-semibold">
              Estado del caso registrado
            </div>
          </div>
        </div>

        {/* Status Description Banner */}
        <div className="p-4 rounded-2xl bg-[var(--op-verified-tint)]/70 border border-[var(--op-verified-border)] flex items-start gap-3 text-xs text-[var(--op-verified-ink)]">
          <Scale className="h-4 w-4 text-[var(--op-verified-ink)] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {statusInfo.description} En Opinio, una reclamación solo cuenta como resuelta para el score del comercio cuando <strong className="text-[var(--op-verified-ink)]">tú como comprador confirmas de conformidad</strong>.
          </p>
        </div>

        {/* SLA Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
            <div className="flex items-center justify-between text-xs text-[var(--op-ink-muted)] mb-1">
              <span>1. Apertura de Caso</span>
              <Check className="h-3.5 w-3.5 text-[var(--op-verified-ink)]" />
            </div>
            <div className="text-xs font-bold text-[var(--op-ink-primary)]">
              Registrado
            </div>
            <p className="text-xs text-[var(--op-ink-muted)] mt-0.5">
              {formatDate(caseData.created_at)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
            <div className="flex items-center justify-between text-xs text-[var(--op-ink-muted)] mb-1">
              <span>2. Respuesta Comercio</span>
              {caseData.status !== 'opened' ? (
                <Check className="h-3.5 w-3.5 text-[var(--op-verified-ink)]" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-[var(--op-warning-ink)]" />
              )}
            </div>
            <div className="text-xs font-bold text-[var(--op-ink-primary)]">
              {caseData.median_first_response_minutes > 0 ? `${caseData.median_first_response_minutes} min` : 'En espera'}
            </div>
            <p className="text-xs text-[var(--op-ink-muted)] mt-0.5">
              Tiempo transcurrido hasta la primera respuesta
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)]">
            <div className="flex items-center justify-between text-xs text-[var(--op-ink-muted)] mb-1">
              <span>3. Cierre Conforme</span>
              {caseData.is_consumer_confirmed ? (
                <Check className="h-3.5 w-3.5 text-[var(--op-verified-ink)]" />
              ) : (
                <span className="text-xs text-[var(--op-warning-ink)] font-bold">Pendiente</span>
              )}
            </div>
            <div className="text-xs font-bold text-[var(--op-ink-primary)]">
              {caseData.is_consumer_confirmed ? 'Conformidad confirmada' : 'A la espera de confirmación'}
            </div>
            <p className="text-xs text-[var(--op-ink-muted)] mt-0.5">
              {caseData.resolved_at ? formatDate(caseData.resolved_at) : 'Requiere acción del comprador'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div role="status" className="rounded-2xl bg-[var(--op-verified-tint)] border border-[var(--op-verified-border)] p-4 text-sm text-[var(--op-verified-ink)] font-semibold flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-[var(--op-verified-ink)] shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="rounded-2xl bg-[var(--op-danger-tint)] border border-[var(--op-danger-border)] p-4 text-sm text-[var(--op-danger-ink)] font-semibold flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--op-danger-ink)]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2-Col Layout: Remedy Card & Action (Left) vs Chat Thread (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Remedy & Confirmation Action */}
        <div className="space-y-6">
          {/* Remedy Summary Card */}
          <div className="rounded-3xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--op-ink-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--op-verified-ink)]" />
              <span>Remedio y Solución</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] space-y-0.5">
                <span className="text-xs font-semibold text-[var(--op-ink-muted)]">Motivo del reporte:</span>
                <p className="text-[var(--op-ink-primary)] font-bold">
                  {ISSUE_LABELS[caseData.issue_category] || caseData.issue_category}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] space-y-0.5">
                <span className="text-xs font-semibold text-[var(--op-ink-muted)]">Solución solicitada por ti:</span>
                <p className="text-[var(--op-ink-primary)] font-bold">
                  {REMEDY_LABELS[caseData.customer_requested_remedy] || caseData.customer_requested_remedy}
                </p>
              </div>

              {caseData.remedy_offered && (
                <div className="p-3.5 rounded-2xl bg-[var(--op-verified-tint)] border border-[var(--op-verified-border)] space-y-0.5">
                  <span className="text-xs font-semibold text-[var(--op-verified-ink)]">Oferta formal del comercio:</span>
                  <p className="text-[var(--op-verified-ink)] font-medium leading-relaxed">
                    {caseData.remedy_offered}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation Action Button */}
            <div className="pt-2">
              {caseData.is_consumer_confirmed ? (
                <div className="p-4 rounded-2xl bg-[var(--op-verified-tint)] border border-[var(--op-verified-border)] text-center space-y-2">
                  <ShieldCheck className="h-8 w-8 text-[var(--op-verified-ink)] mx-auto" />
                  <div className="text-xs font-bold text-[var(--op-verified-ink)]">
                    Resolución Confirmada de Conformidad
                  </div>
                  <p className="text-xs text-[var(--op-verified-ink)]">
                    Has validado satisfactoriamente el remedio ofrecido por {caseData.brand_name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-2 text-sm leading-relaxed"><input type="checkbox" checked={resolutionReceived} onChange={(event) => setResolutionReceived(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--op-verified-ink)]" /><span>Ya recibí la solución acordada y quiero cerrar el caso.</span></label>
                  <button
                    type="button"
                    onClick={handleConfirmResolution}
                    disabled={confirming || !resolutionReceived}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--op-verified-ink)] px-5 py-3.5 text-xs font-bold text-[var(--op-sheet)] hover:bg-[var(--op-verified-ink)] transition-all shadow-xs disabled:opacity-50 active:scale-95"
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
                  <p className="text-xs text-[var(--op-ink-muted)] text-center leading-relaxed">
                    Al hacer clic, declaras que el comercio entregó la compensación, reemplazo o reembolso acordado.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Guarantee & PROFECO Notice */}
          <div className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 text-xs text-[var(--op-ink-secondary)] space-y-2 shadow-xs">
            <div className="flex items-center gap-1.5 text-[var(--op-ink-primary)] font-bold">
              <Scale className="h-4 w-4 text-[var(--op-verified-ink)]" />
              <span>Conserva el seguimiento</span>
            </div>
            <p className="text-xs leading-relaxed">
              Guarda el enlace del caso y los comprobantes de tu compra. El seguimiento en Opinio no garantiza una solución ni sustituye otros canales de atención al consumidor.
            </p>
          </div>
        </div>

        {/* Right Column: Private Chat Thread */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-6 shadow-xs flex min-w-0 flex-col h-[min(750px,85dvh)] min-h-[500px]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--op-border-hairline)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--op-ink-primary)]">
                <MessageSquare className="h-4 w-4 text-[var(--op-verified-ink)]" />
                <span>Conversación del caso ({messages.length} mensajes)</span>
              </div>

            </div>

            {/* Messages Scroll Area */}
            <div role="log" aria-label="Mensajes del caso" aria-live="polite" tabIndex={0} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.length === 0 && <p className="py-8 text-center text-sm text-[var(--op-ink-muted)]">Todavía no hay mensajes. Describe lo que necesitas para iniciar la conversación.</p>}
              {messages.map((msg) => {
                const isConsumer = msg.sender_type === 'consumer';
                const isMerchant = msg.sender_type === 'merchant';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isConsumer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1 text-xs">
                      <span className={`font-bold ${
                        isConsumer ? 'text-[var(--op-verified-ink)]' : isMerchant ? 'text-[var(--op-link)]' : 'text-[var(--op-link)]'
                      }`}>
                        {msg.sender_name}
                      </span>
                      <span className="text-xs text-[var(--op-ink-muted)]">
                        {isConsumer ? '(Comprador)' : isMerchant ? `(${caseData.brand_name} Oficial)` : '(Mediador Opinio)'}
                      </span>
                      <span className="text-xs text-[var(--op-ink-muted)]">
                        • {formatDate(msg.created_at)}
                      </span>
                    </div>

                    <div
                      className={`max-w-full break-words whitespace-pre-wrap p-4 rounded-2xl text-sm leading-relaxed shadow-2xs ${
                        isConsumer
                          ? 'bg-[var(--op-verified-tint)] border border-[var(--op-verified-border)] text-[var(--op-verified-ink)] rounded-tr-none'
                          : isMerchant
                          ? 'bg-[var(--op-shaded)] border border-[var(--op-border-hairline)] text-[var(--op-ink-primary)] rounded-tl-none'
                          : 'bg-[var(--op-shaded)] border border-[var(--op-border-strong)] text-[var(--op-link)]'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-[var(--op-border-hairline)] space-y-2">
              <label htmlFor="case-message" className="block text-sm font-semibold">Tu mensaje</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="case-message"
                  maxLength={5000}
                  required
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje para el comercio o mediador..."
                  className="min-w-0 min-h-12 flex-1 rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-4 py-2.5 text-base text-[var(--op-ink-primary)] placeholder-[var(--op-ink-muted)] focus:outline-none focus:border-[var(--op-verified-accent)]"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--op-ink-primary)] hover:bg-[var(--op-ink-secondary)] px-5 py-2.5 text-xs font-bold text-[var(--op-sheet)] transition-colors disabled:opacity-40 shrink-0 shadow-xs"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Enviar</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--op-ink-muted)] px-1">
                <span>Tu comunicación queda registrada para fines de auditoría del caso.</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
