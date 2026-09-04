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
            const matched = list.find((b: BusinessOption) => b.slug.toLowerCase() === prefilledSlug.toLowerCase());
            if (matched) setSelectedBusinessId(matched.id);
          } else if (list.length > 0) {
            setSelectedBusinessId(list[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadBusinesses();
  }, [prefilledSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !customerName.trim() || !customerContact.trim() || !initialMessage.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos (*).');
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#121511] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300 mb-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>Portal de Mediación y Casos</span>
        </div>
        <h1 className="text-3xl font-black text-[#121511] tracking-tight">
          Abrir un Caso de Resolución
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
          Si tuviste un problema con tu compra (retraso, producto equivocado o reembolso no procesado), abre un caso oficial. Opinio supervisará el SLA de respuesta del comercio.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Business select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#121511] flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            Comercio o Marca involucrada *
          </label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(Number(e.target.value))}
            className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-3.5 py-2.5 text-xs text-[#121511] focus:outline-none focus:border-[#00B67A]"
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
            <label className="text-xs font-bold text-[#121511]">
              Tu Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. Roberto Sánchez P."
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-3.5 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#121511]">
              Correo o WhatsApp de Notificación *
            </label>
            <input
              type="text"
              required
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="roberto@gmail.com o 55 9876 5432"
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-3.5 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] font-mono"
            />
          </div>
        </div>

        {/* Issue Category & Remedy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#121511]">
              Motivo de la Incidencia *
            </label>
            <select
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-3.5 py-2.5 text-xs text-[#121511] focus:outline-none focus:border-[#00B67A]"
            >
              <option value="delay">Demora o retraso en entrega</option>
              <option value="damaged_goods">Producto dañado o defectuoso</option>
              <option value="wrong_item">Artículo equivocado o incompleto</option>
              <option value="refund_pending">Reembolso no procesado</option>
              <option value="no_response">Falta de respuesta del comercio</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#121511]">
              Solución que solicitas *
            </label>
            <select
              value={requestedRemedy}
              onChange={(e) => setRequestedRemedy(e.target.value)}
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-3.5 py-2.5 text-xs text-[#121511] focus:outline-none focus:border-[#00B67A]"
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
          <label className="text-xs font-bold text-[#121511]">
            Descripción detallada del problema y número de guía/orden *
          </label>
          <textarea
            required
            rows={4}
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Describe qué compraste, cuándo debió llegar, número de guía de paquetería o captura de WhatsApp..."
            className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 p-3.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] leading-relaxed"
          />
        </div>

        {/* SLA Notice */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
            <Clock className="h-4 w-4 text-emerald-600" />
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#121511] hover:bg-black px-6 py-3.5 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50 active:scale-95"
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
    <div className="min-h-screen bg-[#FCFBF3] text-[#121511] flex flex-col font-sans selection:bg-[#00B67A] selection:text-white">
      <Navbar />
      <main className="flex-1 py-10 sm:py-16">
        <Suspense fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00B67A]" />
          </div>
        }>
          <NuevoCasoContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
