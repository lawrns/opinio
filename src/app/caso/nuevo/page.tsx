'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building2,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface BusinessOption {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
}

function NuevoCasoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefilledSlug = searchParams.get('b') || '';

  const [businessQuery, setBusinessQuery] = useState(prefilledSlug);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [businessError, setBusinessError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [issueCategory, setIssueCategory] = useState('delay');
  const [requestedRemedy, setRequestedRemedy] = useState('refund');
  const [initialMessage, setInitialMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingBusinesses(true);
      setBusinessError(false);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(businessQuery)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        if (controller.signal.aborted) return;
        const list: BusinessOption[] = data.results || [];
        setBusinesses(list);
        if (prefilledSlug && businessQuery === prefilledSlug) {
          const matched = list.find((business) => business.slug === prefilledSlug);
          if (matched) setSelectedBusinessId(matched.id);
        }
      } catch {
        if (!controller.signal.aborted) setBusinessError(true);
      } finally {
        if (!controller.signal.aborted) setLoadingBusinesses(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [prefilledSlug, businessQuery, loadAttempt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedBusinessId || !customerName.trim() || !customerContact.trim() || !initialMessage.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos (*).');
      return;
    }

    const contact = customerContact.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !/^\+?[\d\s()-]{10,20}$/.test(contact)) {
      setErrorMsg('Escribe un correo válido o un teléfono de al menos 10 dígitos.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: selectedBusinessId,
          customer_name: customerName.trim(),
          customer_contact: customerContact.trim(),
          issue_category: issueCategory,
          customer_requested_remedy: requestedRemedy,
          initial_message: initialMessage.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al abrir el caso.');
      }

      const data = await res.json();
      router.push(`/caso/${data.case.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'No se pudo registrar el caso.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--op-ink-muted)] hover:text-[var(--op-ink-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--op-warning-tint)] px-3 py-1 text-xs font-bold text-[var(--op-warning-ink)] border border-[var(--op-warning-border)] mb-2">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--op-warning-ink)]" />
          <span>Seguimiento de problemas de compra</span>
        </div>
        <h1 className="text-3xl font-black text-[var(--op-ink-primary)] tracking-tight">
          Cuéntanos qué pasó con tu compra
        </h1>
        <p className="text-sm text-[var(--op-ink-secondary)] mt-1 leading-relaxed">
          Registra el problema y la solución que solicitas. Podrás consultar el estado del caso y continuar la conversación desde su página.
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="mb-6 rounded-2xl bg-[var(--op-danger-tint)] border border-[var(--op-danger-border)] p-4 text-xs text-[var(--op-danger-ink)] font-semibold flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--op-danger-ink)]" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-3xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Business select */}
        <div className="space-y-1.5">
          <label htmlFor="case-business" className="text-sm font-bold text-[var(--op-ink-primary)] flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-[var(--op-link)]" />
            Comercio o Marca involucrada *
          </label>
          <label htmlFor="case-business-search" className="sr-only">Buscar negocio por nombre</label>
          <input id="case-business-search" type="search" value={businessQuery} onChange={(event) => { setBusinessQuery(event.target.value); setSelectedBusinessId(''); setLoadingBusinesses(true); }} placeholder="Busca por nombre o dominio" className="mb-2 min-h-12 w-full rounded-xl border border-[var(--op-border-strong)] bg-[var(--op-canvas)] px-4 text-base" />
          {businessError && <p role="alert" className="mb-2 text-sm text-[var(--op-danger-ink)]">No pudimos cargar los negocios. <button type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="min-h-11 font-semibold underline">Reintentar</button></p>}
          <select
            id="case-business"
            required
            disabled={loadingBusinesses || businessError}
            aria-describedby="case-business-help"
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(Number(e.target.value))}
            className="w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-3.5 py-2.5 text-base text-[var(--op-ink-primary)] focus:outline-none focus:border-[var(--op-verified-accent)]"
          >
            <option value="">{loadingBusinesses ? 'Buscando negocios…' : 'Selecciona el negocio correcto'}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.brand_name} {b.legal_name ? `(${b.legal_name})` : ''}
              </option>
            ))}
          </select>
          <p id="case-business-help" role="status" className="text-xs text-[var(--op-ink-muted)]">{!loadingBusinesses && !businessError && businesses.length === 0 ? 'Sin coincidencias. Prueba otro nombre o dominio.' : 'Comprueba la razón social antes de enviar tu caso.'}</p>
        </div>

        {/* Customer Name & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="case-name" className="text-sm font-bold text-[var(--op-ink-primary)]">
              Tu Nombre Completo *
            </label>
            <input
              type="text"
              required
              id="case-name" autoComplete="name" maxLength={100}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. Roberto Sánchez P."
              className="w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-3.5 py-2.5 text-base text-[var(--op-ink-primary)] placeholder-[var(--op-ink-muted)] focus:outline-none focus:border-[var(--op-verified-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="case-contact" className="text-sm font-bold text-[var(--op-ink-primary)]">
              Correo o teléfono de contacto *
            </label>
            <input
              type="text"
              required
              id="case-contact" maxLength={150}
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="roberto@gmail.com o 55 9876 5432"
              className="w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-3.5 py-2.5 text-base text-[var(--op-ink-primary)] placeholder-[var(--op-ink-muted)] focus:outline-none focus:border-[var(--op-verified-accent)] font-mono"
            />
          </div>
        </div>

        {/* Issue Category & Remedy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="case-issue" className="text-sm font-bold text-[var(--op-ink-primary)]">
              Motivo de la Incidencia *
            </label>
            <select
              id="case-issue"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-3.5 py-2.5 text-base text-[var(--op-ink-primary)] focus:outline-none focus:border-[var(--op-verified-accent)]"
            >
              <option value="delay">Demora o retraso en entrega</option>
              <option value="damaged_goods">Producto dañado o defectuoso</option>
              <option value="wrong_item">Artículo equivocado o incompleto</option>
              <option value="refund_pending">Reembolso no procesado</option>
              <option value="no_response">Falta de respuesta del comercio</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="case-remedy" className="text-sm font-bold text-[var(--op-ink-primary)]">
              Solución que solicitas *
            </label>
            <select
              id="case-remedy"
              value={requestedRemedy}
              onChange={(e) => setRequestedRemedy(e.target.value)}
              className="w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] px-3.5 py-2.5 text-base text-[var(--op-ink-primary)] focus:outline-none focus:border-[var(--op-verified-accent)]"
            >
              <option value="refund">Reembolso monetario (SPEI / Tarjeta)</option>
              <option value="replacement">Reenvío o reemplazo urgente</option>
              <option value="compensation">Bonificación o descuento</option>
              <option value="clarification">Aclaración y entrega inmediata</option>
            </select>
          </div>
        </div>

        {/* Problem description */}
        <div className="space-y-1.5">
          <label htmlFor="case-description" className="text-sm font-bold text-[var(--op-ink-primary)]">
            Describe el problema y el número de pedido *
          </label>
          <textarea
            required
            rows={4}
            id="case-description" minLength={15} maxLength={5000} aria-describedby="case-description-help"
              value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Describe qué compraste, cuándo ocurrió y qué respuesta has recibido del negocio."
            className="w-full rounded-2xl bg-[var(--op-canvas)] border border-[var(--op-border-hairline)] p-3.5 text-base text-[var(--op-ink-primary)] placeholder-[var(--op-ink-muted)] focus:outline-none focus:border-[var(--op-verified-accent)] leading-relaxed"
          />
          <p id="case-description-help" className="text-xs leading-relaxed text-[var(--op-ink-muted)]">Mínimo 15 caracteres. No compartas contraseñas, datos bancarios ni documentos de identidad.</p>
        </div>

        {/* Case expectations */}
        <div className="p-4 rounded-2xl bg-[var(--op-verified-tint)] border border-[var(--op-verified-border)] text-xs text-[var(--op-verified-ink)] space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--op-verified-ink)] font-bold">
            <Clock className="h-4 w-4 text-[var(--op-verified-ink)]" />
            <span>Qué ocurre después</span>
          </div>
          <p className="text-xs leading-relaxed">
            Se creará una página para dar seguimiento a tu caso. Guarda su enlace y consulta allí las respuestas. Abrir un caso no garantiza un plazo de respuesta ni un reembolso.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || loadingBusinesses || businessError || !selectedBusinessId}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[var(--op-ink-primary)] hover:bg-[var(--op-ink-secondary)] px-6 py-3.5 text-xs font-bold text-[var(--op-sheet)] transition-all shadow-xs disabled:opacity-50 active:scale-95"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generando expediente...</span>
              </>
            ) : (
              <>
                <span>Registrar mi caso</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NuevoCasoPage() {
  return (
    <div className="min-h-screen bg-[var(--op-canvas)] text-[var(--op-ink-primary)] flex flex-col font-sans selection:bg-[var(--op-verified-ink)] selection:text-[var(--op-sheet)]">
      <Navbar />
      <main id="contenido" className="flex-1 py-10 sm:py-16">
        <Suspense fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--op-verified-ink)]" />
          </div>
        }>
          <NuevoCasoContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
