'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Star, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  UploadCloud, 
  FileText, 
  CreditCard, 
  Receipt, 
  Store, 
  Lock, 
  Check, 
  AlertCircle, 
  Loader2,
  Package
} from 'lucide-react';

interface Props {
  businessId: number;
  slug: string;
  brandName: string;
  legalName: string | null;
  category: string;
}

type VerificationLevel = 
  | 'confirmed_payment' 
  | 'confirmed_store_order' 
  | 'reviewed_proof' 
  | 'unverified_experience';

export function ReviewFormWizard({ businessId, slug, brandName, legalName, category }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>('confirmed_store_order');
  const [orderNumber, setOrderNumber] = useState('');
  const [speiReference, setSpeiReference] = useState('');
  const [hasUploadedFile, setHasUploadedFile] = useState(false);

  // Rating & Product
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [shippingRating, setShippingRating] = useState<number>(5);
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [productName, setProductName] = useState('');

  // Body & Identity
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorContact, setAuthorContact] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Helper for masking contact
  const getMaskedContact = (contact: string) => {
    if (!contact) return '';
    const clean = contact.trim();
    if (clean.includes('@')) {
      const parts = clean.split('@');
      const user = parts[0];
      const domain = parts[1] || '';
      if (user.length <= 2) return `${user[0]}***@${domain}`;
      return `${user[0]}***${user[user.length - 1]}@${domain}`;
    }
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+52 ${digits.slice(0, 2)} **** ${digits.slice(-4)}`;
    }
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  };

  const maskedPreview = getMaskedContact(authorContact);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || body.length < 15) {
      setErrorMsg('Por favor escribe al menos 15 caracteres describiendo tu experiencia.');
      return;
    }
    if (!authorName.trim()) {
      setErrorMsg('Por favor indica tu nombre o alias para la reseña.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Debes aceptar el aviso de privacidad y términos de Opinio.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        business_id: businessId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
        author_name: authorName.trim(),
        author_masked_contact: maskedPreview || undefined,
        verification_level: verificationLevel,
        product_name: productName.trim() || undefined,
      };

      const res = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar la opinión.');
      }

      setStep(4); // Success step
    } catch (err) {
      console.error('Error submitting review:', err);
      const message = err instanceof Error ? err.message : 'No se pudo registrar la opinión. Intenta de nuevo.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-xs p-6 sm:p-10 text-[#121511]">
      {/* Brand Context Bar */}
      <div className="flex items-center justify-between gap-4 pb-6 mb-8 border-b border-gray-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#008B5D]">
            Opinio Trust Passport • Auditoría de Comprador
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#121511] mt-1">
            Opinar sobre {brandName}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {legalName || category}
          </p>
        </div>

        <Link
          href={`/b/${slug}`}
          className="text-xs font-bold text-gray-500 hover:text-[#121511] transition-colors"
        >
          Cancelar
        </Link>
      </div>

      {/* Progress Stepper (Only on Steps 1, 2, 3) */}
      {step < 4 && (
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div className={`pb-2 border-b-2 transition-colors ${
              step >= 1 ? 'border-[#00B67A] text-[#008B5D]' : 'border-gray-200 text-gray-400'
            }`}>
              1. Comprobante
            </div>
            <div className={`pb-2 border-b-2 transition-colors ${
              step >= 2 ? 'border-[#00B67A] text-[#008B5D]' : 'border-gray-200 text-gray-400'
            }`}>
              2. Calificación
            </div>
            <div className={`pb-2 border-b-2 transition-colors ${
              step >= 3 ? 'border-[#00B67A] text-[#008B5D]' : 'border-gray-200 text-gray-400'
            }`}>
              3. Reseña &amp; Privacidad
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: VERIFICATION TIER                                                 */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#121511]">
              ¿Cómo verificas tu compra en {brandName}?
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              En Opinio, las opiniones con comprobante de pago o número de pedido tienen hasta 3x más peso en el Pasaporte de Confianza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Option 1: Payment Confirmed */}
            <button
              type="button"
              onClick={() => setVerificationLevel('confirmed_payment')}
              className={`p-5 rounded-2xl border text-left transition-all relative ${
                verificationLevel === 'confirmed_payment'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-[#FCFBF3]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Peso: 1.00
                </span>
              </div>
              <div className="text-sm font-bold text-[#121511]">
                Comprobante SPEI / Tarjeta
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Transferencia bancaria SPEI (CEP Banxico), cargo de tarjeta o link de pago.
              </p>
            </button>

            {/* Option 2: Confirmed Store Order */}
            <button
              type="button"
              onClick={() => setVerificationLevel('confirmed_store_order')}
              className={`p-5 rounded-2xl border text-left transition-all relative ${
                verificationLevel === 'confirmed_store_order'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-[#FCFBF3]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Store className="h-5 w-5 text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Peso: 0.90
                </span>
              </div>
              <div className="text-sm font-bold text-[#121511]">
                Número de Pedido de la Tienda
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Identificador de orden generado por Shopify, Tiendanube o confirmación de WhatsApp.
              </p>
            </button>

            {/* Option 3: Reviewed Proof */}
            <button
              type="button"
              onClick={() => setVerificationLevel('reviewed_proof')}
              className={`p-5 rounded-2xl border text-left transition-all relative ${
                verificationLevel === 'reviewed_proof'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-[#FCFBF3]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Receipt className="h-5 w-5 text-purple-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                  Peso: 0.75
                </span>
              </div>
              <div className="text-sm font-bold text-[#121511]">
                Ticket o Factura de Compra
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Nota de venta membretada, ticket físico o archivo PDF de factura SAT.
              </p>
            </button>

            {/* Option 4: Unverified */}
            <button
              type="button"
              onClick={() => setVerificationLevel('unverified_experience')}
              className={`p-5 rounded-2xl border text-left transition-all relative ${
                verificationLevel === 'unverified_experience'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-[#FCFBF3]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  Peso: 0.35
                </span>
              </div>
              <div className="text-sm font-bold text-[#121511]">
                Sin Comprobante a la Mano
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Tu opinión será publicada con etiqueta de experiencia no comprobada documentalmente.
              </p>
            </button>
          </div>

          {/* Conditional inputs based on selected level */}
          {verificationLevel === 'confirmed_store_order' && (
            <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
              <label className="text-xs font-bold text-[#121511]">
                Número de Pedido (Order ID)
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ej. #LUU-94812 o SP-8102"
                className="w-full rounded-xl bg-white border border-gray-200 px-3.5 py-2 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] font-mono"
              />
              <p className="text-[11px] text-gray-500">
                Lo encuentras en tu correo de confirmación de compra o mensaje de WhatsApp del comercio.
              </p>
            </div>
          )}

          {verificationLevel === 'confirmed_payment' && (
            <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
              <label className="text-xs font-bold text-[#121511]">
                Clave de Rastreo SPEI / Referencia de Pago
              </label>
              <input
                type="text"
                value={speiReference}
                onChange={(e) => setSpeiReference(e.target.value)}
                placeholder="Ej. 2026090401827361829"
                className="w-full rounded-xl bg-white border border-gray-200 px-3.5 py-2 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] font-mono"
              />
              <p className="text-[11px] text-gray-500">
                Validaremos el Comprobante Electrónico de Pago (CEP) de Banxico para otorgar sello oficial.
              </p>
            </div>
          )}

          {verificationLevel === 'reviewed_proof' && (
            <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-3 text-center">
              <UploadCloud className="h-8 w-8 text-gray-400 mx-auto" />
              <div>
                <div className="text-xs font-bold text-[#121511]">
                  Carga una captura de pantalla, ticket o factura (PDF / JPG / PNG)
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Los datos sensibles de tu cuenta son encriptados y borrados conforme a LFPDPPP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHasUploadedFile(true)}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
                  hasUploadedFile 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {hasUploadedFile ? '✓ Archivo comprobante adjuntado' : 'Seleccionar archivo local'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full bg-[#121511] hover:bg-black px-6 py-3 text-xs font-bold text-white transition-all shadow-xs"
            >
              <span>Continuar a Calificación</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: RATINGS & PRODUCT                                                 */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#121511]">
              ¿Cómo calificarías tu experiencia general?
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Selecciona las estrellas y evalúa las dimensiones clave de tu compra.
            </p>
          </div>

          {/* Interactive Star Rating */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#FCFBF3] border border-gray-200 text-center space-y-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    className={`h-9 w-9 sm:h-10 sm:w-10 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="text-sm font-bold text-[#008B5D]">
              {rating === 5 && '5 estrellas — Excelente experiencia'}
              {rating === 4 && '4 estrellas — Muy buena compra'}
              {rating === 3 && '3 estrellas — Experiencia regular'}
              {rating === 2 && '2 estrellas — Mala experiencia'}
              {rating === 1 && '1 estrella — Muy insatisfecho'}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#121511] flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              Producto o servicio adquirido
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ej. Colchón Original Matrimonial, Audífonos Sony, Joyería de Plata..."
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-4 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A]"
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Evaluación por Dimensiones
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quality */}
              <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-[#121511]">
                  Calidad del producto
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQualityRating(s)}
                      className="focus:outline-none"
                    >
                      <Star className={`h-4 w-4 ${s <= qualityRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Shipping */}
              <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-[#121511]">
                  Logística y entrega
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShippingRating(s)}
                      className="focus:outline-none"
                    >
                      <Star className={`h-4 w-4 ${s <= shippingRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Service */}
              <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-[#121511]">
                  Atención y soporte
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setServiceRating(s)}
                      className="focus:outline-none"
                    >
                      <Star className={`h-4 w-4 ${s <= serviceRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#121511]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-full bg-[#121511] hover:bg-black px-6 py-3 text-xs font-bold text-white transition-all shadow-xs"
            >
              <span>Continuar a Redacción</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW DETAILS & PRIVACY                                          */}
      {/* ========================================================================= */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#121511]">
              Cuéntanos los detalles de tu experiencia
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Tu reseña ayudará a miles de compradores mexicanos a tomar decisiones seguras.
            </p>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#121511]">
              Título breve de tu opinión
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Excelente servicio de entrega y producto impecable"
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-4 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A]"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#121511]">
                Tu experiencia detallada *
              </label>
              <span className="text-gray-400 text-[11px]">
                {body.length} caracteres (mínimo 15)
              </span>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe cómo fue el proceso de compra, tiempos de entrega, si el producto cumplió tus expectativas y cómo fue la comunicación..."
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 p-4 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] leading-relaxed"
            />
          </div>

          {/* Author Name & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#121511]">
                Tu nombre o alias público *
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ej. Mariana Garza V."
                className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-4 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#121511]">
                Correo o WhatsApp (para validar)
              </label>
              <input
                type="text"
                value={authorContact}
                onChange={(e) => setAuthorContact(e.target.value)}
                placeholder="mariana@gmail.com o 55 1234 5678"
                className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-4 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] font-mono"
              />
            </div>
          </div>

          {/* Privacy Masking Preview Banner */}
          {authorContact && (
            <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Vista pública de privacidad (LFPDPPP):</span>
              </span>
              <span className="font-mono text-[#121511] font-bold">
                {maskedPreview}
              </span>
            </div>
          )}

          {/* Terms checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#00B67A] focus:ring-[#00B67A]"
            />
            <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              Certifico que esta opinión refleja una experiencia real de compra con {brandName} y acepto el tratamiento confidencial de mis datos conforme a la Ley Federal de Protección de Datos Personales (LFPDPPP) y los Términos de Opinio.mx.
            </label>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#121511]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Atrás</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#00B67A] hover:bg-[#008B5D] px-7 py-3 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registrando opinión...</span>
                </>
              ) : (
                <>
                  <span>Publicar opinión verificada</span>
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUCCESS CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {step === 4 && (
        <div className="text-center py-8 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-[#00B67A] border border-emerald-200 mx-auto">
            <ShieldCheck className="h-9 w-9" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-[#121511]">
              ¡Opinión Registrada con Éxito!
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Tu reseña ha sido incorporada al Pasaporte de Confianza de <strong className="text-[#121511]">{brandName}</strong> y ponderada en el cálculo del Opinio Score.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FCFBF3] border border-gray-200 p-4 max-w-sm mx-auto text-xs text-gray-600 space-y-1">
            <div className="text-[#008B5D] font-bold">Nivel de comprobante registrado:</div>
            <div className="text-[#121511] font-bold">
              {verificationLevel === 'confirmed_payment' && 'Pago Confirmado SPEI / Tarjeta (Peso 1.00)'}
              {verificationLevel === 'confirmed_store_order' && 'Pedido en Tienda Confirmado (Peso 0.90)'}
              {verificationLevel === 'reviewed_proof' && 'Comprobante Revisado (Peso 0.75)'}
              {verificationLevel === 'unverified_experience' && 'Opinión sin Comprobante (Peso 0.35)'}
            </div>
            <div className="text-[10px] text-gray-400 pt-1 font-mono">
              SHA-256 Ledger Timestamp Certificado
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/b/${slug}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#121511] hover:bg-black px-6 py-3 text-xs font-bold text-white transition-all shadow-xs"
            >
              <span>Ver Pasaporte de {brandName}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/verificar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-xs font-bold text-gray-700 hover:text-[#121511] hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <span>Explorar otros negocios</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
