'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Scale, 
  Building2, 
  Lock, 
  Check, 
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
    async function loadBusinesses() {
      try {
        const res = await fetch('/api/v1/search?limit=20');
        if (res.ok) {
          const data = await res.json();
          const list = data.results || data.businesses || [];
          setBusinesses(list);

          if (prefilledSlug) {
            const found = list.find((b: BusinessOption) => b.slug === prefilledSlug);
            if (found) setSelectedBusinessId(found.id);
          } else if (list.length > 0) {
            setSelectedBusinessId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading businesses:', err);
      }
    }
    loadBusinesses();
  }, [prefilledSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) {
      setErrorMsg('Selecciona el negocio involucrado.');
      return;
    }
    if (!customerName.trim() || !customerContact.trim()) {
      setErrorMsg('Por favor completa tu nombre y correo/teléfono de contacto.');
      return;
    }
    if (!initialMessage.trim() || initialMessage.length < 15) {
      setErrorMsg('Por favor describe lo sucedido con al menos 15 caracteres.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        business_id: Number(selectedBusinessId),
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim(),
        issue_category: issueCategory,
        customer_requested_remedy: requestedRemedy,
        initial_message: initialMessage.trim(),
      };

      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al abrir el caso.');
      }

      const data = await res.json();
      const caseItem = data.case;
      router.push(`/caso/${caseItem.id || caseItem.case_number}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'No se pudo abrir el caso. Intenta de nuevo.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link
          href="/verificar"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver al directorio</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20 mb-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Portal de Mediación y Casos</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Abrir un Caso de Resolución
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
          Si tuviste un problema con tu compra (retraso, producto equivocado o reembolso no procesado), abre un caso oficial. Opinio supervisará el SLA de respuesta del comercio.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Business select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
            Comercio o Marca involucrada *
          </label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(Number(e.target.value))}
            className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.brand_name} {b.legal_name ? `(${b.legal_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Name & Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Tu Nombre Completo *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. Roberto Sánchez P."
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Correo o WhatsApp de Notificación *
            </label>
            <input
              type="text"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="roberto@gmail.com o 55 9876 5432"
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Issue Category & Remedy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Motivo de la Incidencia *
            </label>
            <select
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="delay">Demora o retraso en entrega</option>
              <option value="damaged_goods">Producto dañado o defectuoso</option>
              <option value="wrong_item">Artículo equivocado o incompleto</option>
              <option value="refund_pending">Reembolso no procesado</option>
              <option value="no_response">Falta de respuesta del comercio</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Solución que solicitas *
            </label>
            <select
              value={requestedRemedy}
              onChange={(e) => setRequestedRemedy(e.target.value)}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
          <label className="text-xs font-semibold text-neutral-300">
            Descripción detallada del problema y número de guía/orden *
          </label>
          <textarea
            rows={4}
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Describe qué compraste, cuándo debió llegar, número de guía de paquetería o captura de WhatsApp..."
            className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
          />
        </div>

        {/* SLA Notice */}
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>SLA de Respuesta Garantizado</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            El comercio recibirá una notificación urgente por API y WhatsApp con un plazo de 24 horas para proponer una solución. Tu caso no se cerrará hasta que confirmes tu satisfacción.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold text-neutral-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generando expediente...</span>
              </>
            ) : (
              <>
                <span>Abrir Caso Oficial con Opinio</span>
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      <Navbar />
      <main className="flex-1 py-10 sm:py-16">
        <Suspense fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        }>
          <NuevoCasoContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
