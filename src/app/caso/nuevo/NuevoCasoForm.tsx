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
  Clock,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface BusinessOption {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
}

function NuevoCasoContent({ buyerProof }: { buyerProof: boolean }) {
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
  // B06 (buyerProof): a private access email, and one key per form so a retry never opens a second case.
  const [accessEmail, setAccessEmail] = useState('');
  const [submissionKey] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [registered, setRegistered] = useState<{ id: number; caseNumber: string; linkSent: boolean } | null>(null);
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
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [prefilledSlug, businessQuery, loadAttempt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const contact = customerContact.trim();
    if (buyerProof) {
      if (!selectedBusinessId || !customerName.trim() || !accessEmail.trim() || !initialMessage.trim()) {
        setErrorMsg('Por favor completa todos los campos requeridos (*).');
        return;
      }
      if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(accessEmail.trim())) {
        setErrorMsg('Escribe un correo válido para recibir el enlace de acceso a tu caso.');
        return;
      }
      if (contact && (contact.includes('@') || !/^\+?[\d\s()-]{10,20}$/.test(contact))) {
        setErrorMsg('El teléfono es opcional; si lo escribes, usa al menos 10 dígitos.');
        return;
      }
    } else {
      if (!selectedBusinessId || !customerName.trim() || !customerContact.trim() || !initialMessage.trim()) {
        setErrorMsg('Por favor completa todos los campos requeridos (*).');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !/^\+?[\d\s()-]{10,20}$/.test(contact)) {
        setErrorMsg('Escribe un correo válido o un teléfono de al menos 10 dígitos.');
        return;
      }
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
          ...(buyerProof ? { access_email: accessEmail.trim(), submission_key: submissionKey } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al abrir el caso.');
      }

      const data = await res.json();
      if (buyerProof) {
        setRegistered({
          id: data.case.id,
          caseNumber: data.case.case_number,
          linkSent: data.access_link !== 'not_sent',
        });
        setSubmitting(false);
        return;
      }
      router.push(`/caso/${data.case.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'No se pudo registrar el caso.');
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6" data-testid="case-registered">
        <div className="rounded-[24px] border border-op-green-border bg-white p-7 shadow-elevated sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-op-green-soft px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-wider text-op-green-dark">
            <CheckCircle2 className="size-4 text-[#00b67a]" />
            Expediente creado
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-op-ink">Caso registrado</h1>
          <p className="mt-3 text-base leading-relaxed text-op-secondary">
            Tu número de caso es <strong className="font-mono text-op-ink">{registered.caseNumber}</strong>.{' '}
            {registered.linkSent
              ? 'Te enviamos un enlace privado a tu correo para ver tu caso. Vence en 15 minutos y funciona una vez.'
              : 'No pudimos enviar el enlace a tu correo en este momento. Tu caso está guardado; pide un enlace nuevo con tu número de caso.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-op-border pt-6 text-sm">
            <Link
              href={`/caso/${registered.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1b1a1b] px-5 py-2.5 font-bold text-white transition-all hover:bg-op-green-dark"
            >
              Ver la página pública del caso
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/caso/acceso/reenviar"
              className="inline-flex min-h-11 items-center rounded-full border border-op-strong bg-white px-5 py-2.5 font-bold text-op-ink transition-all hover:border-[#1b1a1b] hover:bg-op-shaded"
            >
              Pedir un enlace nuevo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Trustpilot-inspired Cream & Pink Hero Header */}
      <section className="relative overflow-hidden border-b border-op-border bg-[#fcfbf3] py-10 sm:py-14">
        <svg
          aria-hidden="true"
          viewBox="0 0 600 260"
          className="pointer-events-none absolute right-0 top-0 hidden h-full w-[520px] opacity-80 lg:block"
        >
          <g className="animate-op-float">
            <circle cx="460" cy="40" r="110" fill="#fd791a" />
            <rect x="290" y="110" width="150" height="150" rx="28" fill="#ffe400" transform="rotate(-12 365 185)" />
            <path
              d="M510 110 L590 245 L430 245 Z"
              fill="#04da8d"
              stroke="#04da8d"
              strokeWidth="14"
              strokeLinejoin="round"
            />
          </g>
        </svg>

        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-op-secondary transition-colors hover:text-op-green-dark"
          >
            <ArrowLeft className="size-4" />
            <span>Volver al inicio</span>
          </Link>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdde8] px-3.5 py-1 font-mono text-xs font-bold text-[#1b1a1b]">
              <AlertTriangle className="size-3.5 text-[#c2410c]" />
              <span>03 · Resuelve · Seguimiento de problemas de compra</span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[#1b1a1b] sm:text-4xl lg:text-5xl">
            Cuéntanos qué pasó con tu compra
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-op-secondary">
            Registra el problema y la solución que solicitas. Podrás consultar el estado del caso y continuar la conversación desde su página.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {errorMsg && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-2xl border border-[var(--op-danger-border)] bg-[var(--op-danger-tint)] p-4 text-xs font-semibold text-[var(--op-danger-ink)]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--op-danger-ink)]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[24px] border border-op-border border-t-4 border-t-[#fd791a] bg-white p-6 shadow-elevated sm:p-9"
        >
          {/* Business select */}
          <div className="space-y-2">
            <label htmlFor="case-business" className="flex items-center gap-1.5 text-sm font-bold text-op-ink">
              <Building2 className="size-4 text-[#00b67a]" />
              Comercio o Marca involucrada *
            </label>
            <label htmlFor="case-business-search" className="sr-only">
              Buscar negocio por nombre
            </label>
            <input
              id="case-business-search"
              type="search"
              value={businessQuery}
              onChange={(event) => {
                setBusinessQuery(event.target.value);
                setSelectedBusinessId('');
                setLoadingBusinesses(true);
              }}
              placeholder="Busca por nombre o dominio"
              className="mb-2 min-h-12 w-full rounded-full border border-op-strong bg-[#fcfbf3] px-4 text-base text-op-ink transition-colors focus:border-[#00b67a] focus:bg-white"
            />
            {businessError && (
              <p role="alert" className="mb-2 text-sm text-[var(--op-danger-ink)]">
                No pudimos cargar los negocios.{' '}
                <button
                  type="button"
                  onClick={() => setLoadAttempt((value) => value + 1)}
                  className="min-h-11 font-semibold underline"
                >
                  Reintentar
                </button>
              </p>
            )}
            <select
              id="case-business"
              required
              disabled={loadingBusinesses || businessError}
              aria-describedby="case-business-help"
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(Number(e.target.value))}
              className="min-h-12 w-full rounded-xl border border-op-strong bg-white px-3.5 py-2.5 text-base text-op-ink focus:border-[#00b67a] focus:outline-none"
            >
              <option value="">{loadingBusinesses ? 'Buscando negocios…' : 'Selecciona el negocio correcto'}</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.brand_name} {b.legal_name ? `(${b.legal_name})` : ''}
                </option>
              ))}
            </select>
            <p id="case-business-help" role="status" className="text-xs text-op-muted">
              {!loadingBusinesses && !businessError && businesses.length === 0
                ? 'Sin coincidencias. Prueba otro nombre o dominio.'
                : 'Confirma que seleccionaste el comercio correcto antes de enviar tu caso.'}
            </p>
          </div>

          {/* Customer Name & Contact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="case-name" className="text-sm font-bold text-op-ink">
                Tu Nombre Completo *
              </label>
              <input
                type="text"
                required
                id="case-name"
                autoComplete="name"
                maxLength={100}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. Roberto Sánchez P."
                className="min-h-12 w-full rounded-xl border border-op-strong bg-[#fcfbf3] px-3.5 py-2.5 text-base text-op-ink placeholder-op-muted focus:border-[#00b67a] focus:bg-white focus:outline-none"
              />
            </div>

            {buyerProof && (
              <div className="space-y-1.5">
                <label htmlFor="case-access-email" className="text-sm font-bold text-op-ink">
                  Correo privado para acceder a tu caso *
                </label>
                <input
                  type="email"
                  required
                  id="case-access-email"
                  maxLength={254}
                  autoComplete="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  placeholder="roberto@gmail.com"
                  className="min-h-12 w-full rounded-xl border border-op-strong bg-[#fcfbf3] px-3.5 py-2.5 font-mono text-base text-op-ink placeholder-op-muted focus:border-[#00b67a] focus:bg-white focus:outline-none"
                />
                <p className="text-xs text-op-muted">
                  Te enviaremos ahí un enlace para ver tu caso. No se muestra públicamente.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="case-contact" className="text-sm font-bold text-op-ink">
                {buyerProof ? 'Teléfono (opcional)' : 'Correo o teléfono de contacto *'}
              </label>
              <input
                type={buyerProof ? 'tel' : 'text'}
                required={!buyerProof}
                id="case-contact"
                maxLength={buyerProof ? 30 : 150}
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder={buyerProof ? '55 9876 5432' : 'roberto@gmail.com o 55 9876 5432'}
                className="min-h-12 w-full rounded-xl border border-op-strong bg-[#fcfbf3] px-3.5 py-2.5 font-mono text-base text-op-ink placeholder-op-muted focus:border-[#00b67a] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Issue Category & Remedy */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="case-issue" className="text-sm font-bold text-op-ink">
                Motivo de la Incidencia *
              </label>
              <select
                id="case-issue"
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-op-strong bg-white px-3.5 py-2.5 text-base text-op-ink focus:border-[#00b67a] focus:outline-none"
              >
                <option value="delay">Demora o retraso en entrega</option>
                <option value="damaged_goods">Producto dañado o defectuoso</option>
                <option value="wrong_item">Artículo equivocado o incompleto</option>
                <option value="refund_pending">Reembolso no procesado</option>
                <option value="no_response">Falta de respuesta del comercio</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="case-remedy" className="text-sm font-bold text-op-ink">
                Solución que solicitas *
              </label>
              <select
                id="case-remedy"
                value={requestedRemedy}
                onChange={(e) => setRequestedRemedy(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-op-strong bg-white px-3.5 py-2.5 text-base text-op-ink focus:border-[#00b67a] focus:outline-none"
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
            <label htmlFor="case-description" className="text-sm font-bold text-op-ink">
              Describe el problema y el número de pedido *
            </label>
            <textarea
              required
              rows={4}
              id="case-description"
              minLength={15}
              maxLength={5000}
              aria-describedby="case-description-help"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Describe qué compraste, cuándo ocurrió y qué respuesta has recibido del negocio."
              className="w-full rounded-2xl border border-op-strong bg-[#fcfbf3] p-4 text-base leading-relaxed text-op-ink placeholder-op-muted focus:border-[#00b67a] focus:bg-white focus:outline-none"
            />
            <p id="case-description-help" className="text-xs leading-relaxed text-op-muted">
              Mínimo 15 caracteres. No compartas contraseñas, datos bancarios ni documentos de identidad.
            </p>
          </div>

          {/* Case expectations */}
          <div className="space-y-1.5 rounded-2xl border border-op-green-border bg-op-green-soft/70 p-4 text-xs text-op-green-dark">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="size-4 text-[#00b67a]" />
              <span>Qué ocurre después</span>
            </div>
            <p className="text-xs leading-relaxed text-op-secondary">
              Se creará una página para dar seguimiento a tu caso. Guarda su enlace y consulta allí las respuestas. Abrir un caso no garantiza un plazo de respuesta ni un reembolso.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || loadingBusinesses || businessError || !selectedBusinessId}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-3.5 text-sm font-bold text-white shadow-flat transition-all hover:bg-op-green-dark active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Generando expediente...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4 text-[#00b67a]" />
                  <span>Registrar mi caso</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** The case-entry page; `buyerProof` (server switch OPINIO_BUYER_PROOF) selects the B06 contract. */
export function NuevoCasoView({ buyerProof }: { buyerProof: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#1b1a1b] font-sans text-op-ink selection:bg-op-green-dark selection:text-white">
      <Navbar />
      <main id="contenido" className="flex-1 overflow-hidden rounded-b-[32px] bg-op-canvas pb-16">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-op-green-dark" />
            </div>
          }
        >
          <NuevoCasoContent buyerProof={buyerProof} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
