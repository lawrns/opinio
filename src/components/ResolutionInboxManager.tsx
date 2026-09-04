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
  const remedyDialog = React.useRef<HTMLDialogElement>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (showRemedyModal) remedyDialog.current?.showModal();
    else remedyDialog.current?.close();
  }, [showRemedyModal]);
  const [selectedRemedyType, setSelectedRemedyType] = React.useState<string>('spei');
  const [remedyText, setRemedyText] = React.useState('');
  const [responderName, setResponderName] = React.useState('Equipo de Conciliación');
  const [submittingRemedy, setSubmittingRemedy] = React.useState(false);

  // Message form state
  const [newMessageText, setNewMessageText] = React.useState('');
  const [isPrivateMessage, setIsPrivateMessage] = React.useState(false);
  const [submittingMessage, setSubmittingMessage] = React.useState(false);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);


  // Filter cases
  const filteredCases = cases.filter((c) => {
    if (statusFilter === 'urgent' && c.status !== 'opened' && c.status !== 'reopened') return false;
    if (statusFilter === 'pending_confirmation' && c.status !== 'remedy_offered') return false;
    if (statusFilter === 'resolved' && !c.status.startsWith('resolved')) return false;
    if (categoryFilter !== 'all' && c.issue_category !== categoryFilter) return false;
    return true;
  });

  const selectedCase = filteredCases.find((item) => item.id === selectedCaseId) || filteredCases[0] || null;

  const handleSelectCase = (id: number) => {
    setSelectedCaseId(id);
    setActionSuccess(null);
    setActionError(null);
    setNewMessageText('');
  };

  const handleProposeRemedy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !remedyText.trim()) return;

    setSubmittingRemedy(true);
    setActionError(null);
    const formData = new FormData();
    formData.append('case_id', String(selectedCase.id));
    formData.append('remedy_offered', remedyText.trim());
    formData.append('status', 'remedy_offered');
    formData.append('resolution_summary', `Remedio propuesto vía ${selectedRemedyType.toUpperCase()}: ${remedyText.trim()}`);
    formData.append('responder_name', responderName);

    const res = await updateCaseRemedyAction(formData).catch(() => ({ success: false }));
    setSubmittingRemedy(false);
    if (!res.success) setActionError('No se pudo guardar. Conservamos el texto para que vuelvas a intentarlo.');

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
      setActionSuccess('Propuesta registrada en el expediente. Pendiente de confirmación del consumidor.');
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newMessageText.trim()) return;

    setSubmittingMessage(true);
    setActionError(null);
    const formData = new FormData();
    formData.append('case_id', String(selectedCase.id));
    formData.append('sender_name', 'Atención Opinio');
    formData.append('message', newMessageText.trim());
    formData.append('is_private', String(isPrivateMessage));

    const res = await sendCaseMessageAction(formData).catch(() => ({ success: false }));
    setSubmittingMessage(false);
    if (!res.success) setActionError('No se pudo guardar. Conservamos el texto para que vuelvas a intentarlo.');

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
          className: 'bg-op-danger-soft text-op-danger border-op-danger-soft',
        };
      case 'remedy_offered':
        return {
          label: 'Remedio Propuesto',
          className: 'bg-op-warning-soft text-op-warning border-op-warning-soft',
        };
      case 'resolved_consumer_confirmed':
        return {
          label: 'Resuelto (Confirmado por Consumidor)',
          className: 'bg-op-green-soft text-op-green-dark border-op-green-border',
        };
      case 'resolved_merchant_asserted':
        return {
          label: 'Aseverado por Comercio',
          className: 'bg-op-shaded text-op-secondary border-op-border',
        };
      default:
        return {
          label: status,
          className: 'bg-op-shaded text-op-muted border-op-border',
        };
    }
  };

  return (
    <div className="space-y-6">
      {actionError && !showRemedyModal && <p role="alert" className="rounded-xl bg-op-danger-soft p-4 text-sm text-op-danger">{actionError}</p>}
      {/* Action Success Alert */}
      {actionSuccess && (
        <div role="status" className="p-4 rounded-xl bg-op-green-soft border border-op-green-border text-op-green-dark text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-op-green-dark shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main 2-column layout: Left Case List & Right Case View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Case List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filter Bar */}
          <div className="p-3 rounded-xl bg-white border border-op-border shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                aria-pressed={statusFilter === 'all'}
                onClick={() => { setStatusFilter('all'); setNewMessageText(''); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors font-medium text-xs",
                  statusFilter === 'all'
                    ? "bg-op-ink text-white font-bold"
                    : "text-op-muted hover:text-op-ink"
                )}
              >
                Todos ({cases.length})
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === 'urgent'}
                onClick={() => { setStatusFilter('urgent'); setNewMessageText(''); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors font-medium text-xs",
                  statusFilter === 'urgent'
                    ? "bg-op-danger-soft text-op-danger border border-op-danger-soft font-bold"
                    : "text-op-muted hover:text-op-ink"
                )}
              >
                Urgentes ({cases.filter((c) => c.status === 'opened' || c.status === 'reopened').length})
              </button>
              <button
                type="button"
                aria-pressed={statusFilter === 'pending_confirmation'}
                onClick={() => { setStatusFilter('pending_confirmation'); setNewMessageText(''); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors font-medium text-xs",
                  statusFilter === 'pending_confirmation'
                    ? "bg-op-warning-soft text-op-warning border border-op-warning-soft font-bold"
                    : "text-op-muted hover:text-op-ink"
                )}
              >
                En Espera ({cases.filter((c) => c.status === 'remedy_offered').length})
              </button>
            </div>

            <select
              aria-label="Filtrar casos por motivo"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setNewMessageText(''); }}
              className="px-2 py-1 rounded-lg bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none"
            >
              <option value="all">Todas las causas</option>
              <option value="delay">Demora</option>
              <option value="damaged_goods">Daño</option>
              <option value="wrong_item">Incongruencia</option>
              <option value="refund_pending">Reembolso</option>
              <option value="no_response">Sin respuesta</option>
            </select>
          </div>

          {/* Cases Scrollable List */}
          <div className="space-y-2.5 max-h-[360px] lg:max-h-[720px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-op-border shadow-xs text-op-muted text-xs">
                No hay casos que coincidan con los filtros seleccionados.
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const statusBadge = getStatusBadge(c.status);
                const isUrgent = c.status === 'opened' || c.status === 'reopened';

                return (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    key={c.id}
                    onClick={() => handleSelectCase(c.id)}
                    className={cn(
                      "block w-full p-4 rounded-xl border text-left cursor-pointer transition-all space-y-2",
                      isSelected
                        ? "bg-op-canvas border-op-green-border/60 shadow-xs ring-1 ring-op-green-border/20"
                        : "bg-white hover:bg-op-canvas border-op-border shadow-xs"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-op-ink">
                        {c.case_number}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded border",
                          statusBadge.className
                        )}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-op-ink truncate">
                      {c.customer_name}
                    </div>

                    <div className="text-xs text-op-muted flex items-center justify-between">
                      <span>{getCategoryLabel(c.issue_category)}</span>
                      <span className="text-op-muted font-mono text-xs">
                        {({ refund: 'Reembolso', replacement: 'Reemplazo', compensation: 'Compensación', clarification: 'Aclaración' })[c.customer_requested_remedy]}
                      </span>
                    </div>

                    {isUrgent && (
                      <div className="pt-1.5 border-t border-op-border flex items-center justify-between text-xs text-op-danger">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3 text-op-danger" />
                          Requiere seguimiento
                        </span>
                        <span className="font-mono text-op-muted">
                          Resp. prom: {c.median_first_response_minutes} min
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Details, Messages & Remedy Drawer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="p-6 rounded-2xl bg-white border border-op-border shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-op-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-op-ink">
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
                  <p className="text-xs text-op-muted mt-1">
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-op-green hover:bg-op-green text-white shadow-xs transition-all active:scale-[0.98]"
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
                <div className="p-3.5 rounded-xl bg-op-canvas border border-op-border space-y-1">
                  <div className="text-xs text-op-muted font-medium">
                    Datos del Comprador
                  </div>
                  <div className="font-semibold text-op-ink text-sm">
                    {selectedCase.customer_name}
                  </div>
                  <div className="text-op-muted font-mono text-xs">
                    {selectedCase.customer_contact}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-op-canvas border border-op-border space-y-1">
                  <div className="text-xs text-op-muted font-medium">
                    Motivo e Indemnización Solicitada
                  </div>
                  <div className="font-semibold text-op-green-dark">
                    {getCategoryLabel(selectedCase.issue_category)}
                  </div>
                  <div className="text-op-muted text-xs">
                    Remedio deseado:{' '}
                    <strong className="text-op-ink uppercase">
                      {selectedCase.customer_requested_remedy}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Connected Review context if applicable */}
              {selectedCase.review && (
                <div className="p-4 rounded-xl bg-op-canvas border border-op-border text-xs space-y-1.5">
                  <div className="text-xs font-semibold text-op-muted flex items-center justify-between">
                    <span>Opinión Asociada al Caso</span>
                    <span className="text-op-warning">
                      {'★'.repeat(selectedCase.review.rating)} {selectedCase.review.rating}.0
                    </span>
                  </div>
                  <p className="text-op-secondary italic">
                    &ldquo;{selectedCase.review.body}&rdquo;
                  </p>
                </div>
              )}

              {/* Official Remedy Status Card */}
              {selectedCase.remedy_offered && (
                <div className="p-4 rounded-xl bg-op-green-soft border border-op-green-border text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-op-green-dark flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-op-green-dark" />
                      Propuesta de Remedio Oficial Registrada
                    </span>
                    <span className="text-xs text-op-muted font-mono">
                      {selectedCase.is_consumer_confirmed
                        ? 'Confirmado por consumidor ✓'
                        : 'En espera de confirmación del cliente'}
                    </span>
                  </div>
                  <p className="text-op-green-dark font-medium leading-relaxed">
                    {selectedCase.remedy_offered}
                  </p>
                  {selectedCase.is_consumer_confirmed && (
                    <div className="text-xs text-op-green-dark flex items-center gap-1 font-semibold pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pilar Resuelve: Este caso cuenta formalmente para el 40% de tu Puntaje de Resolución.
                    </div>
                  )}
                </div>
              )}

              {/* Message Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-op-muted uppercase tracking-wider">
                  Historial de Comunicación y Conciliación
                </h4>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {(!selectedCase.messages || selectedCase.messages.length === 0) ? (
                    <div className="p-4 rounded-xl bg-op-canvas border border-op-border text-center text-op-muted text-xs">
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
                              ? "bg-op-warning-soft border border-op-warning-soft text-op-warning"
                              : isMerchant
                              ? "bg-op-green-soft border border-op-green-border text-op-green-dark ml-4"
                              : "bg-op-shaded border border-op-border text-op-ink mr-4"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs text-op-muted">
                            <span className="font-semibold flex items-center gap-1 text-op-ink">
                              {m.is_private && <Lock className="h-3 w-3 text-op-warning" />}
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
              <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-op-border">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="case-message" className="text-xs font-medium text-op-muted">
                    Enviar mensaje o nota interna al expediente:
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-op-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivateMessage}
                      onChange={(e) => setIsPrivateMessage(e.target.checked)}
                      className="rounded border-op-strong text-op-green-dark focus:ring-op-green-border"
                    />
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-op-warning" />
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
                    id="case-message"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="min-w-0 flex-1 px-3.5 py-2 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink placeholder:text-op-muted focus:outline-none focus:border-op-green-border"
                  />
                  <button
                    type="submit"
                    disabled={submittingMessage}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-op-ink hover:bg-op-secondary text-white transition-colors flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white border border-op-border shadow-xs text-op-muted">
              Selecciona un caso del panel izquierdo para ver los detalles.
            </div>
          )}
        </div>
      </div>

      {/* Remedy Proposal Modal Drawer */}
      {selectedCase && (
        <dialog ref={remedyDialog} onCancel={() => setShowRemedyModal(false)} aria-labelledby="remedy-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-op-border bg-op-sheet p-0 text-op-ink shadow-2xl backdrop:bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-op-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            <div className="p-5 border-b border-op-border flex items-center justify-between bg-op-canvas">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-op-green-dark" />
                <h3 id="remedy-title" className="text-sm font-bold text-op-ink">
                  Proponer Solución Formal — {selectedCase.case_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRemedyModal(false)}
                className="text-op-muted hover:text-op-ink text-xs"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleProposeRemedy} className="p-5 space-y-4">
              {actionError && <p role="alert" className="rounded-xl bg-op-danger-soft p-3 text-sm text-op-danger">{actionError}</p>}
              {/* Remedy Type Selector */}
              <div>
                <label className="block text-xs font-medium text-op-ink mb-2">
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
                        ? "bg-op-green-soft text-op-green-dark border-op-green-border shadow-xs font-semibold"
                        : "bg-op-canvas text-op-secondary border-op-border hover:bg-op-shaded"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <DollarSign className="h-3.5 w-3.5 text-op-green-dark" />
                      Reembolso SPEI
                    </div>
                    <div className="text-xs text-op-muted">Transferencia bancaria directa</div>
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
                        ? "bg-op-green-soft text-op-green-dark border-op-green-border shadow-xs font-semibold"
                        : "bg-op-canvas text-op-secondary border-op-border hover:bg-op-shaded"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <Package className="h-3.5 w-3.5 text-op-secondary" />
                      Reemplazo Urgente
                    </div>
                    <div className="text-xs text-op-muted">Envío de producto nuevo</div>
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
                        ? "bg-op-green-soft text-op-green-dark border-op-green-border shadow-xs font-semibold"
                        : "bg-op-canvas text-op-secondary border-op-border hover:bg-op-shaded"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <RotateCcw className="h-3.5 w-3.5 text-op-secondary" />
                      Compensación
                    </div>
                    <div className="text-xs text-op-muted">Saldo o cupón compensatorio</div>
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
                        ? "bg-op-green-soft text-op-green-dark border-op-green-border shadow-xs font-semibold"
                        : "bg-op-canvas text-op-secondary border-op-border hover:bg-op-shaded"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                      <FileText className="h-3.5 w-3.5 text-op-warning" />
                      Aclaración Logística
                    </div>
                    <div className="text-xs text-op-muted">Seguimiento con transportista</div>
                  </button>
                </div>
              </div>

              {/* Responder title */}
              <div>
                <label htmlFor="remedy-responder" className="block text-xs font-medium text-op-ink mb-1">
                  Representante o Área
                </label>
                <input
                  type="text"
                  required
                  id="remedy-responder"
                  value={responderName}
                  onChange={(e) => setResponderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink"
                />
              </div>

              {/* Remedy description */}
              <div>
                <label htmlFor="remedy-detail" className="block text-xs font-medium text-op-ink mb-1">
                  Detalle de la Propuesta al Consumidor
                </label>
                <textarea
                  required
                  rows={4}
                  id="remedy-detail"
                  value={remedyText}
                  onChange={(e) => setRemedyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink leading-relaxed focus:outline-none focus:border-op-green-border"
                  placeholder="Detalla los términos del reembolso o reemplazo..."
                />
              </div>

              <div className="p-3 rounded-xl bg-op-canvas border border-op-border text-xs text-op-muted space-y-1">
                <span className="font-semibold text-op-ink flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-op-green-dark" />
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
                  className="px-4 py-2 rounded-xl text-xs text-op-muted hover:text-op-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRemedy}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-op-green hover:bg-op-green text-white transition-colors"
                >
                  {submittingRemedy ? 'Enviando...' : 'Enviar Propuesta de Solución'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
