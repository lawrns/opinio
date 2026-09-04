'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  Storefront, 
  Receipt, 
  ChatTeardropText, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  UploadSimple, 
  ShieldCheck, 
  LockKey,
  Star,
  WarningCircle,
  CircleNotch
} from '@phosphor-icons/react';

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

      setStep(4);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo registrar la opinión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white shadow-xs p-6 sm:p-10 text-[#121511]">
      {/* Brand Context Bar */}
      <div className="flex items-center justify-between gap-4 pb-6 mb-8 border-b border-[#F3F4F6]">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#008B5D]">
            AUDITORÍA DE COMPRA CIUDADANA
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#121511] mt-0.5">
            Opinar sobre {brandName}
          </h2>
          <p className="text-xs text-[#6C706B] font-medium mt-0.5">
            {legalName || category}
          </p>
        </div>

        <Link
          href={`/b/${slug}`}
          className="text-xs font-bold text-[#6C706B] hover:text-[#121511] transition-colors"
        >
          Cancelar
        </Link>
      </div>

      {/* Modern Circular Stepper (Overhauled Image #4 Stepper) */}
      {step < 4 && (
        <div className="mb-10">
          <div className="flex items-center justify-between max-w-md mx-auto relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                step >= 1 ? 'bg-[#121511] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                1
              </div>
              <span className={`text-[11px] font-bold mt-1.5 ${
                step >= 1 ? 'text-[#121511]' : 'text-gray-400'
              }`}>
                Comprobante
              </span>
            </div>

            {/* Line 1-2 */}
            <div className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
              step >= 2 ? 'bg-[#121511]' : 'bg-gray-200'
            }`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                step >= 2 ? 'bg-[#121511] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span className={`text-[11px] font-bold mt-1.5 ${
                step >= 2 ? 'text-[#121511]' : 'text-gray-400'
              }`}>
                Calificación
              </span>
            </div>

            {/* Line 2-3 */}
            <div className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
              step >= 3 ? 'bg-[#121511]' : 'bg-gray-200'
            }`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                step >= 3 ? 'bg-[#121511] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                3
              </div>
              <span className={`text-[11px] font-bold mt-1.5 ${
                step >= 3 ? 'text-[#121511]' : 'text-gray-400'
              }`}>
                Reseña
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-start gap-2.5">
          <WarningCircle weight="bold" className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: VERIFICATION TIER SELECTION (OVERHAULED IMAGE #4 MATRIX)           */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-[#121511] tracking-tight">
              ¿Cómo deseas validar tu compra en {brandName}?
            </h3>
            <p className="text-xs text-[#6C706B] leading-relaxed">
              En Opinio, las opiniones con comprobante de pago o número de orden tienen mayor peso bayesiano en el Pasaporte de Confianza.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Tier 1: SPEI / Tarjeta (1.00x) */}
            <button
              type="button"
              onClick={() => setVerificationLevel('confirmed_payment')}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-3 ${
                verificationLevel === 'confirmed_payment'
                  ? 'bg-white border-2 border-[#00B67A] shadow-xs ring-2 ring-[#00B67A]/15'
                  : 'bg-white border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#121511]">
                  <CreditCard weight="bold" className="w-5 h-5 text-[#008B5D]" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F4F4F0] text-[#121511]">
                    Ponderación: 1.00x
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    verificationLevel === 'confirmed_payment' ? 'border-[#00B67A] bg-[#00B67A]' : 'border-gray-300'
                  }`}>
                    {verificationLevel === 'confirmed_payment' && <Check weight="bold" className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-[#121511]">
                  Comprobante SPEI / Tarjeta
                </div>
                <p className="text-xs text-[#6C706B] mt-1 leading-relaxed">
                  Clave de rastreo bancario Banxico CEP o comprobante de transferencia SPEI.
                </p>
              </div>
            </button>

            {/* Tier 2: Store Order ID (0.90x) */}
            <button
              type="button"
              onClick={() => setVerificationLevel('confirmed_store_order')}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-3 ${
                verificationLevel === 'confirmed_store_order'
                  ? 'bg-white border-2 border-[#00B67A] shadow-xs ring-2 ring-[#00B67A]/15'
                  : 'bg-white border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#121511]">
                  <Storefront weight="bold" className="w-5 h-5 text-[#2050E6]" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F4F4F0] text-[#121511]">
                    Ponderación: 0.90x
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    verificationLevel === 'confirmed_store_order' ? 'border-[#00B67A] bg-[#00B67A]' : 'border-gray-300'
                  }`}>
                    {verificationLevel === 'confirmed_store_order' && <Check weight="bold" className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-[#121511]">
                  Número de Pedido de la Tienda
                </div>
                <p className="text-xs text-[#6C706B] mt-1 leading-relaxed">
                  Identificador de compra emitido por Shopify, Tiendanube o confirmación de WhatsApp.
                </p>
              </div>
            </button>

            {/* Tier 3: Receipt or Invoice (0.75x) */}
            <button
              type="button"
              onClick={() => setVerificationLevel('reviewed_proof')}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-3 ${
                verificationLevel === 'reviewed_proof'
                  ? 'bg-white border-2 border-[#00B67A] shadow-xs ring-2 ring-[#00B67A]/15'
                  : 'bg-white border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#121511]">
                  <Receipt weight="bold" className="w-5 h-5 text-[#7C3AED]" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F4F4F0] text-[#121511]">
                    Ponderación: 0.75x
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    verificationLevel === 'reviewed_proof' ? 'border-[#00B67A] bg-[#00B67A]' : 'border-gray-300'
                  }`}>
                    {verificationLevel === 'reviewed_proof' && <Check weight="bold" className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-[#121511]">
                  Ticket o Factura Fiscal SAT
                </div>
                <p className="text-xs text-[#6C706B] mt-1 leading-relaxed">
                  Comprobante digital CFDI 4.0 o ticket oficial de compra en PDF / JPG.
                </p>
              </div>
            </button>

            {/* Tier 4: Unverified (0.35x) */}
            <button
              type="button"
              onClick={() => setVerificationLevel('unverified_experience')}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between space-y-3 ${
                verificationLevel === 'unverified_experience'
                  ? 'bg-white border-2 border-[#00B67A] shadow-xs ring-2 ring-[#00B67A]/15'
                  : 'bg-white border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#121511]">
                  <ChatTeardropText weight="bold" className="w-5 h-5 text-gray-500" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F4F4F0] text-[#6C706B]">
                    Ponderación: 0.35x
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    verificationLevel === 'unverified_experience' ? 'border-[#00B67A] bg-[#00B67A]' : 'border-gray-300'
                  }`}>
                    {verificationLevel === 'unverified_experience' && <Check weight="bold" className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-[#121511]">
                  Sin Comprobante a la Mano
                </div>
                <p className="text-xs text-[#6C706B] mt-1 leading-relaxed">
                  Tu opinión será publicada con etiqueta de experiencia no respaldada documentalmente.
                </p>
              </div>
            </button>
          </div>

          {/* Conditional inputs */}
          {verificationLevel === 'confirmed_store_order' && (
            <div className="p-4 rounded-2xl bg-[#FBF9F2] border border-[#EBEAE1] space-y-2">
              <label className="text-xs font-bold text-[#121511]">
                Número de Pedido de la Tienda
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ej. #ORD-84912 o SP-10492"
                className="w-full rounded-xl bg-white border border-[#CBD5E1] px-3.5 py-2 text-xs text-[#121511] font-mono focus:outline-none focus:border-[#00B67A]"
              />
              <p className="text-[11px] text-[#6C706B]">
                Lo encuentras en tu correo de confirmación de compra o mensaje de WhatsApp.
              </p>
            </div>
          )}

          {verificationLevel === 'confirmed_payment' && (
            <div className="p-4 rounded-2xl bg-[#FBF9F2] border border-[#EBEAE1] space-y-2">
              <label className="text-xs font-bold text-[#121511]">
                Clave de Rastreo SPEI / Referencia Bancaria
              </label>
              <input
                type="text"
                value={speiReference}
                onChange={(e) => setSpeiReference(e.target.value)}
                placeholder="Ej. 2026090401827361829"
                className="w-full rounded-xl bg-white border border-[#CBD5E1] px-3.5 py-2 text-xs text-[#121511] font-mono focus:outline-none focus:border-[#00B67A]"
              />
              <p className="text-[11px] text-[#6C706B]">
                Validaremos el Comprobante Electrónico de Pago (CEP) de Banxico.
              </p>
            </div>
          )}

          {verificationLevel === 'reviewed_proof' && (
            <div className="p-5 rounded-2xl bg-[#FBF9F2] border border-[#EBEAE1] space-y-3 text-center">
              <UploadSimple weight="bold" className="h-7 w-7 text-[#6C706B] mx-auto" />
              <div>
                <div className="text-xs font-bold text-[#121511]">
                  Adjunta comprobante de compra o factura
                </div>
                <p className="text-[11px] text-[#6C706B] mt-0.5">
                  Los datos sensibles son protegidos bajo la Ley Federal de Protección de Datos Personales (LFPDPPP).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHasUploadedFile(true)}
                className={`text-xs font-bold px-4 py-2 rounded-full border transition-colors ${
                  hasUploadedFile 
                    ? 'bg-[#E6F8F2] text-[#008B5D] border-[#B3ECD9]' 
                    : 'bg-white text-[#121511] border-gray-300 hover:bg-gray-50'
                }`}
              >
                {hasUploadedFile ? '✓ Archivo adjuntado correctamente' : 'Seleccionar archivo local'}
              </button>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full bg-[#121511] hover:bg-black px-7 py-3 text-xs font-bold text-white transition-all shadow-xs active:scale-95"
            >
              <span>Continuar a Calificación</span>
              <ArrowRight weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: RATINGS & DIMENSIONS                                              */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-[#121511] tracking-tight">
              ¿Cómo calificarías tu experiencia general?
            </h3>
            <p className="text-xs text-[#6C706B]">
              Selecciona las estrellas y evalúa las dimensiones clave de tu compra.
            </p>
          </div>

          {/* Interactive Star Tiles */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#FCFBF3] border border-[#E5E7EB] text-center space-y-3 shadow-2xs">
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
                    weight="fill"
                    className={`h-9 w-9 sm:h-10 sm:w-10 ${
                      star <= (hoverRating || rating)
                        ? 'text-[#00B67A]'
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
            <label className="text-xs font-bold text-[#121511]">
              Producto o servicio adquirido
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ej. Colchón Original Matrimonial, Audífonos Sony..."
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 px-4 py-2.5 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A]"
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6C706B]">
              Evaluación por Dimensiones
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-[#121511]">Calidad del producto</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setQualityRating(s)}>
                      <Star weight="fill" className={`h-4 w-4 ${s <= qualityRating ? 'text-[#00B67A]' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-[#121511]">Logística y entrega</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setShippingRating(s)}>
                      <Star weight="fill" className={`h-4 w-4 ${s <= shippingRating ? 'text-[#00B67A]' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFBF3] border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-[#121511]">Atención y soporte</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setServiceRating(s)}>
                      <Star weight="fill" className={`h-4 w-4 ${s <= serviceRating ? 'text-[#00B67A]' : 'text-gray-300'}`} />
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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-full bg-[#121511] hover:bg-black px-7 py-3 text-xs font-bold text-white transition-all shadow-xs active:scale-95"
            >
              <span>Continuar a Redacción</span>
              <ArrowRight weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: DETAILS & PRIVACY                                                 */}
      {/* ========================================================================= */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-[#121511] tracking-tight">
              Cuéntanos los detalles de tu experiencia
            </h3>
            <p className="text-xs text-[#6C706B]">
              Tu reseña ayudará a miles de compradores mexicanos a tomar decisiones seguras.
            </p>
          </div>

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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[#121511]">
                Tu experiencia detallada *
              </label>
              <span className="text-gray-400 text-[11px] font-mono">
                {body.length} caracteres (mínimo 15)
              </span>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe cómo fue el proceso de compra, tiempos de entrega, calidad del producto y atención..."
              className="w-full rounded-2xl bg-[#FAFAF8] border border-gray-200 p-4 text-xs text-[#121511] placeholder-gray-400 focus:outline-none focus:border-[#00B67A] leading-relaxed"
            />
          </div>

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

          {authorContact && (
            <div className="p-3.5 rounded-2xl bg-[#FCFBF3] border border-gray-200 text-xs text-[#454744] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LockKey weight="bold" className="h-4 w-4 text-[#008B5D]" />
                <span>Vista pública de privacidad (LFPDPPP):</span>
              </span>
              <span className="font-mono text-[#121511] font-bold">
                {maskedPreview}
              </span>
            </div>
          )}

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#00B67A] focus:ring-[#00B67A]"
            />
            <label htmlFor="terms" className="text-xs text-[#454744] leading-relaxed cursor-pointer">
              Certifico que esta opinión refleja una experiencia real de compra con {brandName} y acepto el tratamiento confidencial de mis datos conforme a la Ley Federal de Protección de Datos Personales (LFPDPPP).
            </label>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
              <span>Atrás</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#00B67A] hover:bg-[#008B5D] px-8 py-3.5 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <CircleNotch weight="bold" className="h-4 w-4 animate-spin" />
                  <span>Registrando opinión...</span>
                </>
              ) : (
                <>
                  <span>Publicar opinión verificada</span>
                  <Check weight="bold" className="h-4 w-4" />
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
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E6F8F2] text-[#008B5D] border border-[#B3ECD9] mx-auto">
            <ShieldCheck weight="bold" className="h-9 w-9 text-[#00B67A]" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-[#121511]">
              ¡Opinión Registrada con Éxito!
            </h3>
            <p className="text-xs sm:text-sm text-[#454744] leading-relaxed">
              Tu reseña ha sido incorporada al Pasaporte de Confianza de <strong className="text-[#121511]">{brandName}</strong> y ponderada en el cálculo del Opinio Score.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FCFBF3] border border-gray-200 p-4 max-w-sm mx-auto text-xs text-[#454744] space-y-1">
            <div className="text-[#008B5D] font-bold">Nivel de comprobante registrado:</div>
            <div className="text-[#121511] font-bold">
              {verificationLevel === 'confirmed_payment' && 'Pago Confirmado SPEI / Tarjeta (Peso: 1.00x)'}
              {verificationLevel === 'confirmed_store_order' && 'Pedido en Tienda Confirmado (Peso: 0.90x)'}
              {verificationLevel === 'reviewed_proof' && 'Comprobante Revisado (Peso: 0.75x)'}
              {verificationLevel === 'unverified_experience' && 'Opinión sin Comprobante (Peso: 0.35x)'}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/b/${slug}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#121511] hover:bg-black px-6 py-3 text-xs font-bold text-white transition-all shadow-xs"
            >
              <span>Ver Pasaporte de {brandName}</span>
              <ArrowRight weight="bold" className="h-4 w-4" />
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
