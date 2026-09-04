'use client';

import React from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  ShieldCheck,
  RotateCcw,
  DollarSign,
  Package,
  Zap,
  Lock,
  FileText,
} from 'lucide-react';
import { ResolutionCase } from '@/lib/types';
import { updateCaseRemedyAction, sendCaseMessageAction } from '@/lib/merchant-actions';
import { cn } from '@/lib/utils';

interface ResolutionInboxManagerProps {
  initialCases: ResolutionCase[];
  businessId: number;
  businessSlug: string;
}

export function ResolutionInboxManager({
  initialCases,
}: ResolutionInboxManagerProps) {
  const [cases, setCases] = React.useState(initialCases);
  const [selectedCaseId, setSelectedCaseId] = React.useState<number | null>(
    initialCases.length > 0 ? initialCases[0].id : null
  );
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  // Remedy drawer state
  const [showRemedyModal, setShowRemedyModal] = React.useState(false);
  const [selectedRemedyType, setSelectedRemedyType] = React.useState<string>('spei');
  const [remedyText, setRemedyText] = React.useState('');
  const [responderName, setResponderName] = React.useState('Equipo de Conciliación');
  const [submittingRemedy, setSubmittingRemedy] = React.useState(false);

  // Message form state
  const [newMessageText, setNewMessageText] = React.useState('');
  const [isPrivateMessage, setIsPrivateMessage] = React.useState(false);
  const [submittingMessage, setSubmittingMessage] = React.useState(false);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || cases[0] || null;

  // Filter cases
  const filteredCases = cases.filter((c) => {
    if (statusFilter === 'urgent' && c.status !== 'opened' && c.status !== 'reopened') return false;
    if (statusFilter === 'pending_confirmation' && c.status !== 'remedy_offered') return false;
    if (statusFilter === 'resolved' && !c.status.startsWith('resolved')) return false;
    if (categoryFilter !== 'all' && c.issue_category !== categoryFilter) return false;
    return true;
  });

  const handleSelectCase = (id: number) => {
    setSelectedCaseId(id);
    setActionSuccess(null);
  };

  const handleProposeRemedy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !remedyText.trim()) return;

    setSubmittingRemedy(true);
    const formData = new FormData();
    formData.append('case_id', String(selectedCase.id));
    formData.append('remedy_offered', remedyText.trim());
    formData.append('status', 'remedy_offered');
    formData.append('resolution_summary', `Remedio propuesto vía ${selectedRemedyType.toUpperCase()}: ${remedyText.trim()}`);
    formData.append('responder_name', responderName);

    const res = await updateCaseRemedyAction(formData);
    setSubmittingRemedy(false);

    if (res.success) {
      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? {
                ...c,
                status: 'remedy_offered',
                remedy_offered: remedyText.trim(),
                resolution_summary: `Remedio propuesto: ${remedyText.trim()}`,
                messages: [
                  ...(c.messages || []),
                  {
                    id: Date.now(),
                    case_id: c.id,
                    sender_type: 'merchant',
                    sender_name: responderName,
                    message: `Propuesta de solución formal: ${remedyText.trim()}`,
                    is_private: false,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : c
        )
      );
      setShowRemedyModal(false);
      setRemedyText('');
      setActionSuccess('Propuesta de solución enviada al cliente. El SLA se encuentra en pausa esperando confirmación del consumidor.');
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newMessageText.trim()) return;

    setSubmittingMessage(true);
    const formData = new FormData();
    formData.append('case_id', String(selectedCase.id));
    formData.append('sender_name', 'Atención Opinio');
    formData.append('message', newMessageText.trim());
    formData.append('is_private', String(isPrivateMessage));

    const res = await sendCaseMessageAction(formData);
    setSubmittingMessage(false);

    if (res.success) {
      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? {
                ...c,
                messages: [
                  ...(c.messages || []),
                  {
                    id: Date.now(),
                    case_id: c.id,
                    sender_type: 'merchant',
                    sender_name: 'Atención Opinio',
                    message: newMessageText.trim(),
                    is_private: isPrivateMessage,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : c
        )
      );
      setNewMessageText('');
      setActionSuccess(isPrivateMessage ? 'Nota interna guardada.' : 'Mensaje enviado en el expediente de conciliación.');
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'delay':
        return 'Demora en Paquetería';
      case 'damaged_goods':
        return 'Producto Dañado / Embalaje';
      case 'wrong_item':
        return 'Variante / Talla Incongruente';
      case 'refund_pending':
        return 'Aclaración Reembolso SPEI';
      case 'no_response':
        return 'Falta de Respuesta';
      default:
        return cat;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'opened':
      case 'reopened':
        return {
          label: 'Abierto (SLA Urgente)',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'remedy_offered':
        return {
          label: 'Remedio Propuesto',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'resolved_consumer_confirmed':
        return {
          label: 'Resuelto (Confirmado por Consumidor)',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'resolved_merchant_asserted':
        return {
          label: 'Aseverado por Comercio',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      default:
        return {
          label: status,
          className: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main 2-column layout: Left Case List & Right Case View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Case List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filter Bar */}
          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px]",
                  statusFilter === 'all'
                    ? "bg-[#0F172A] text-white font-bold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                Todos ({cases.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('urgent')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px]",
                  statusFilter === 'urgent'
                    ? "bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                Urgentes ({cases.filter((c) => c.status === 'opened' || c.status === 'reopened').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending_confirmation')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors font-medium text-[11px]",
                  statusFilter === 'pending_confirmation'
                    ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                )}
              >
                En Espera ({cases.filter((c) => c.status === 'remedy_offered').length})
              </button>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[#FAFAF8] border border-[#E2E8F0] text-[11px] text-[#0F172A] focus:outline-none"
            >
              <option value="all">Todas las causas</option>
              <option value="delay">Demora</option>
              <option value="damaged_goods">Daño</option>
              <option value="wrong_item">Incongruencia</option>
              <option value="refund_pending">Reembolso</option>
            </select>
          </div>

          {/* Cases Scrollable List */}
          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-[#E2E8F0] shadow-xs text-[#64748B] text-xs">
                No hay casos que coincidan con los filtros seleccionados.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const statusBadge = getStatusBadge(c.status);
                const isUrgent = c.status === 'opened' || c.status === 'reopened';

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCase(c.id)}
                    className={cn(
                      "p-4 rounded-xl border text-left cursor-pointer transition-all space-y-2",
                      isSelected
                        ? "bg-[#F8FAFC] border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/20"
                        : "bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] shadow-xs"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#0F172A]">
                        {c.case_number}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded border",
                          statusBadge.className
                        )}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#0F172A] truncate">
                      {c.customer_name}
                    </div>

                    <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                      <span>{getCategoryLabel(c.issue_category)}</span>
                      <span className="text-[#94A3B8] font-mono text-[10px]">
                        Ped: {c.customer_requested_remedy}
                      </span>
                    </div>

                    {isUrgent && (
                      <div className="pt-1.5 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-rose-700">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3 text-rose-600" />
                          SLA &lt; 24h
                        </span>
                        <span className="font-mono text-[#64748B]">
                          Resp. prom: {c.median_first_response_minutes} min
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Details, Messages & Remedy Drawer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-[#0F172A]">
                      {selectedCase.case_number}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                        getStatusBadge(selectedCase.status).className
                      )}
                    >
                      {getStatusBadge(selectedCase.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Abierto el{' '}
                    {new Date(selectedCase.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Remedy Action Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRemedyModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Zap className="h-4 w-4" />
                    <span>
                      {selectedCase.remedy_offered ? 'Actualizar Propuesta' : 'Proponer Remedio'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer Claim & Requested Remedy Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
                  <div className="text-[11px] text-[#64748B] font-medium">
                    Datos del Comprador
                  </div>
                  <div className="font-semibold text-[#0F172A] text-sm">
                    {selectedCase.customer_name}
                  </div>
                  <div className="text-[#64748B] font-mono text-[11px]">
                    {selectedCase.customer_contact}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] space-y-1">
                  <div className="text-[11px] text-[#64748B] font-medium">
                    Motivo e Indemnización Solicitada
                  </div>
                  <div className="font-semibold text-emerald-800">
                    {getCategoryLabel(selectedCase.issue_category)}
                  </div>
                  <div className="text-[#64748B] text-[11px]">
                    Remedio deseado:{' '}
                    <strong className="text-[#0F172A] uppercase">
                      {selectedCase.customer_requested_remedy}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Connected Review context if applicable */}
              {selectedCase.review && (
                <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#64748B] flex items-center justify-between">
                    <span>Opinión Asociada al Caso</span>
                    <span className="text-amber-500">
                      {'★'.repeat(selectedCase.review.rating)} {selectedCase.review.rating}.0
                    </span>
                  </div>
                  <p className="text-[#334155] italic">
                    &ldquo;{selectedCase.review.body}&rdquo;
                  </p>
                </div>
              )}

              {/* Official Remedy Status Card */}
              {selectedCase.remedy_offered && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Propuesta de Remedio Oficial Registrada
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">
                      {selectedCase.is_consumer_confirmed
                        ? 'Confirmado por consumidor ✓'
                        : 'En espera de confirmación del cliente'}
                    </span>
                  </div>
                  <p className="text-emerald-950 font-medium leading-relaxed">
                    {selectedCase.remedy_offered}
                  </p>
                  {selectedCase.is_consumer_confirmed && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pilar Resuelve: Este caso cuenta formalmente para el 40% de tu Puntaje de Resolución.
                    </div>
                  )}
                </div>
              )}

              {/* Message Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Historial de Comunicación y Conciliación
                </h4>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {(!selectedCase.messages || selectedCase.messages.length === 0) ? (
                    <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-center text-[#64748B] text-xs">
                      No hay mensajes en este expediente todavía.
                    </div>
                  ) : (
                    selectedCase.messages.map((m) => {
                      const isMerchant = m.sender_type === 'merchant';
                      const isConsumer = m.sender_type === 'consumer';

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "p-3.5 rounded-xl text-xs space-y-1",
                            m.is_private
                              ? "bg-amber-50 border border-amber-200 text-amber-900"
                              : isMerchant
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-950 ml-4"
                              : "bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] mr-4"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                            <span className="font-semibold flex items-center gap-1 text-[#0F172A]">
                              {m.is_private && <Lock className="h-3 w-3 text-amber-600" />}
                              {m.sender_name} ({isMerchant ? 'Comercio' : isConsumer ? 'Comprador' : 'Opinio Mediador'})
                            </span>
                            <span className="font-mono">
                              {new Date(m.created_at).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {m.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Message Form */}
              <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#64748B]">
                    Enviar mensaje o nota interna al expediente:
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-[#64748B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivateMessage}
                      onChange={(e) => setIsPrivateMessage(e.target.checked)}
                      className="rounded border-[#CBD5E1] text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-amber-600" />
                      Nota interna (Privada para el equipo)
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={
                      isPrivateMessage
                        ? 'Escribe una nota interna para tu equipo de atención...'
                        : 'Escribe un mensaje de seguimiento para el comprador...'
                    }
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingMessage}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F172A] hover:bg-[#1E293B] text-white transition-colors flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white border border-[#E2E8F0] shadow-xs text-[#64748B]">
              Selecciona un caso del panel izquierdo para ver los detalles.
            </div>
          )}
        </div>
      </div>

      {/* Remedy Proposal Modal Drawer */}
      {showRemedyModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAF8]">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Proponer Solución Formal — {selectedCase.case_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRemedyModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-xs"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleProposeRemedy} className="p-5 space-y-4">
              {/* Remedy Type Selector */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-2">
                  Tipo de Solución Ofrecida
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRemedyType('spei');
                      setRemedyText('Reembolso íntegro vía transferencia SPEI procesado a tu cuenta bancaria (clave de rastreo adjunta).');
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-left text-xs transition-all",
                      selectedRemedyType === 'spei'
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs font-semibold"
                        : "bg-[#FAFAF8] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      Reembolso SPEI
                    </div>
                    <div className="text-[10px] text-[#64748B]">Transferencia bancaria directa</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRemedyType('replacement');
                      setRemedyText('Envío urgente de reemplazo sin costo adicional con guía de paquetería prioritaria.');
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-left text-xs transition-all",
                      selectedRemedyType === 'replacement'
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs font-semibold"
                        : "bg-[#FAFAF8] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <Package className="h-3.5 w-3.5 text-blue-600" />
                      Reemplazo Urgente
                    </div>
                    <div className="text-[10px] text-[#64748B]">Envío de producto nuevo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRemedyType('compensation');
                      setRemedyText('Compensación en monedero / cupón de compra y entrega prioritaria del pedido.');
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-left text-xs transition-all",
                      selectedRemedyType === 'compensation'
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs font-semibold"
                        : "bg-[#FAFAF8] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
                      Compensación
                    </div>
                    <div className="text-[10px] text-[#64748B]">Saldo o cupón compensatorio</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRemedyType('clarification');
                      setRemedyText('Confirmación de entrega con transportista y prueba de recepción firmada.');
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-left text-xs transition-all",
                      selectedRemedyType === 'clarification'
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs font-semibold"
                        : "bg-[#FAFAF8] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <FileText className="h-3.5 w-3.5 text-amber-600" />
                      Aclaración Logística
                    </div>
                    <div className="text-[10px] text-[#64748B]">Seguimiento con transportista</div>
                  </button>
                </div>
              </div>

              {/* Responder title */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1">
                  Representante o Área
                </label>
                <input
                  type="text"
                  required
                  value={responderName}
                  onChange={(e) => setResponderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A]"
                />
              </div>

              {/* Remedy description */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A] mb-1">
                  Detalle de la Propuesta al Consumidor
                </label>
                <textarea
                  required
                  rows={4}
                  value={remedyText}
                  onChange={(e) => setRemedyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E2E8F0] text-xs text-[#0F172A] leading-relaxed focus:outline-none focus:border-emerald-500"
                  placeholder="Detalla los términos del reembolso o reemplazo..."
                />
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
                <span className="font-semibold text-[#0F172A] flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Regla de Integridad de Opinio
                </span>
                <p>
                  El caso se considerará &ldquo;Confirmado por Consumidor&rdquo; únicamente cuando el comprador verifique haber recibido el reembolso o reemplazo prometido.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemedyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRemedy}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  {submittingRemedy ? 'Enviando...' : 'Enviar Propuesta de Solución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
