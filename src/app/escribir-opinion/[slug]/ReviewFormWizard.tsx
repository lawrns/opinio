'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CircleNotch, Star, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { conversionContext, trackStepStarted } from '@/lib/conversion/client';

interface Props {
  businessId: number;
  slug: string;
  brandName: string;
  legalName: string | null;
  category: string;
}

const RATING_LABELS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];
const inputClass =
  'w-full rounded-xl border border-op-strong bg-[#fcfbf3] px-4 py-3 text-base text-op-ink transition-colors focus:border-[#008b5d] focus:bg-white focus:outline-none';
const primaryClass =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1b1a1b] px-6 py-3 text-sm font-bold text-white shadow-flat transition-all hover:bg-op-green-dark disabled:cursor-not-allowed disabled:opacity-50';

export function ReviewFormWizard({ businessId, slug, brandName, legalName, category }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rating, setRating] = useState(0);
  const [productName, setProductName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // CONVERSION-001 step start (intent only), consented journeys only.
  useEffect(() => {
    trackStepStarted('consumer_review', 'review_form_experience');
  }, []);

  const moveTo = (nextStep: 1 | 2 | 3) => {
    if (nextStep === 2) trackStepStarted('consumer_review', 'review_form_publish');
    setStep(nextStep);
    setErrorMsg(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (rating < 1 || body.trim().length < 15 || !authorName.trim() || !acceptTerms) {
      setErrorMsg(
        'Revisa tu calificación, escribe al menos 15 caracteres, añade tu nombre y confirma que la experiencia es real.'
      );
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `conversion` is the consented journey association only; the server
        // records the milestone after its own commit and ignores any stage here.
        body: JSON.stringify({
          business_id: businessId,
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
          author_name: authorName.trim(),
          verification_level: 'unverified_experience',
          product_name: productName.trim() || undefined,
          conversion: conversionContext(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error('No pudimos publicar tu opinión. Tu texto sigue aquí; intenta de nuevo.');
      moveTo(3);
    } catch {
      setErrorMsg('No pudimos publicar tu opinión. Tu texto sigue aquí; intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-op-border bg-white p-6 text-op-ink shadow-elevated sm:p-9">
      <Link
        href={`/b/${slug}`}
        className="mb-4 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-op-secondary hover:text-op-green-dark"
      >
        <ArrowLeft aria-hidden="true" size={15} /> Volver al negocio
      </Link>
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-op-green-dark">
        Comparte tu experiencia
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 break-words text-3xl font-extrabold tracking-tight text-op-ink outline-none"
      >
        {step === 3 ? 'Gracias por compartir tu opinión.' : `Opinar sobre ${brandName}`}
      </h1>
      <p className="mt-1 font-mono text-xs text-op-muted">{legalName || category}</p>

      {step < 3 && (
        <ol
          aria-label="Progreso de tu opinión"
          className="my-7 grid grid-cols-2 gap-3 rounded-2xl border border-op-border bg-[#fcfbf3] p-3.5"
        >
          {['Tu experiencia', 'Revisar y publicar'].map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? 'step' : undefined}
              className={`flex items-center gap-2.5 text-sm ${
                step === index + 1 ? 'font-bold text-op-ink' : 'text-op-muted'
              }`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                  step === index + 1 ? 'bg-[#1b1a1b] text-white' : 'bg-op-shaded text-op-muted'
                }`}
              >
                {index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-2xl border border-[var(--op-danger-border)] bg-[var(--op-danger-tint)] p-4 text-sm font-medium text-[var(--op-danger-ink)]"
        >
          <WarningCircle className="mt-0.5 shrink-0" size={18} />
          {errorMsg}
        </div>
      )}

      {step === 1 && (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!rating) {
              setErrorMsg('Selecciona una calificación de 1 a 5 estrellas.');
              return;
            }
            if (body.trim().length < 15) {
              setErrorMsg('Describe tu experiencia con al menos 15 caracteres.');
              return;
            }
            moveTo(2);
          }}
        >
          <fieldset>
            <legend className="mb-3 text-base font-bold text-op-ink">
              ¿Cómo fue tu experiencia? <span className="text-sm font-normal text-op-muted">(obligatorio)</span>
            </legend>
            <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              {RATING_LABELS.map((label, index) => {
                const selected = rating === index + 1;
                const filled = rating >= index + 1;
                return (
                  <label key={label} className="cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={index + 1}
                      checked={selected}
                      onChange={() => setRating(index + 1)}
                      required
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-16 min-w-14 flex-col items-center justify-center rounded-2xl border px-3 py-2.5 transition-all peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#008b5d] ${
                        selected
                          ? 'border-[#1b1a1b] bg-[#fcfbf3] text-op-ink shadow-flat'
                          : 'border-op-border bg-white text-op-secondary hover:border-op-strong'
                      }`}
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-[5px] text-white transition-colors"
                        style={{ backgroundColor: filled ? '#008b5d' : '#dcdce6' }}
                      >
                        <Star size={18} weight="fill" aria-hidden="true" />
                      </span>
                      <span className="mt-1.5 font-mono text-xs font-bold">{index + 1} ★</span>
                      <span className="text-[11px] font-medium text-op-muted">{label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="review-product" className="mb-2 block text-sm font-bold text-op-ink">
              Producto o servicio <span className="font-normal text-op-muted">(opcional)</span>
            </label>
            <input
              id="review-product"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              maxLength={160}
              className={inputClass}
              placeholder="¿Qué compraste o contrataste?"
            />
          </div>

          <div>
            <label htmlFor="review-title" className="mb-2 block text-sm font-bold text-op-ink">
              Título <span className="font-normal text-op-muted">(opcional)</span>
            </label>
            <input
              id="review-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className={inputClass}
              placeholder="Resume lo más importante"
            />
          </div>

          <div>
            <label htmlFor="review-body" className="mb-2 block text-sm font-bold text-op-ink">
              Cuéntanos qué pasó <span className="font-normal text-op-muted">(obligatorio)</span>
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              minLength={15}
              maxLength={5000}
              rows={6}
              aria-describedby="review-body-help"
              className={`${inputClass} leading-relaxed`}
              placeholder="¿Qué salió bien? ¿Qué podría mejorar? Describe el producto, la atención y la entrega."
            />
            <p id="review-body-help" className="mt-2 text-xs leading-relaxed text-op-muted">
              {body.trim().length}/5,000 caracteres · Mínimo 15. No incluyas teléfonos, domicilios, números de cuenta ni otros datos personales.
            </p>
          </div>

          <button type="submit" className={`${primaryClass} w-full sm:w-auto`}>
            Revisar mi opinión <ArrowRight aria-hidden="true" size={17} />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6" aria-busy={submitting}>
          <div className="rounded-2xl border border-op-border bg-[#fcfbf3] p-5">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-op-muted">
              Así se verá tu opinión
            </h2>
            <p className="mt-2 text-sm font-bold text-op-green-dark">
              {rating} de 5 estrellas · {RATING_LABELS[rating - 1]}
            </p>
            {title && <p className="mt-3 break-words font-bold text-op-ink">{title}</p>}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-op-secondary">{body}</p>
            {productName && (
              <p className="mt-3 break-words font-mono text-xs text-op-muted">Producto o servicio: {productName}</p>
            )}
          </div>

          <div>
            <label htmlFor="review-author" className="mb-2 block text-sm font-bold text-op-ink">
              Nombre o alias público <span className="font-normal text-op-muted">(obligatorio)</span>
            </label>
            <input
              id="review-author"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              required
              maxLength={80}
              autoComplete="nickname"
              className={inputClass}
              placeholder="Cómo quieres aparecer"
              aria-describedby="review-author-help"
            />
            <p id="review-author-help" className="mt-2 text-xs text-op-muted">
              Este nombre aparecerá junto a tu opinión.
            </p>
          </div>

          <div className="rounded-2xl border border-op-border bg-[#fcfbf3] p-4 text-sm leading-relaxed text-op-secondary">
            <p className="font-bold text-op-ink">Opinión sin comprobante verificado</p>
            <p className="mt-1">
              Este formulario no valida pagos ni adjunta documentos. Tu opinión se publicará con esa etiqueta para que otros lectores conozcan su alcance.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              required
              className="mt-1 size-5 shrink-0 accent-[#00b67a]"
            />
            <span>
              Confirmo que esta opinión refleja mi experiencia real con {brandName} y que quiero publicarla con el nombre indicado.
            </span>
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              disabled={submitting}
              onClick={() => moveTo(1)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-op-strong bg-white px-5 text-sm font-bold text-op-ink transition-colors hover:border-[#1b1a1b]"
            >
              <ArrowLeft size={17} aria-hidden="true" /> Editar opinión
            </button>
            <button type="submit" disabled={submitting} className={primaryClass}>
              {submitting ? (
                <>
                  <CircleNotch className="animate-spin" size={17} /> Publicando…
                </>
              ) : (
                <>
                  Publicar opinión <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-6">
          <div
            role="status"
            className="rounded-2xl border border-op-green-border bg-op-green-soft p-6 text-op-green-dark"
          >
            <Check size={28} aria-hidden="true" />
            <h2 className="mt-3 text-xl font-extrabold">Tu opinión se publicó</h2>
            <p className="mt-2 text-sm leading-relaxed">
              Ya forma parte del pasaporte de {brandName}, con la etiqueta de opinión sin comprobante verificado.
            </p>
          </div>
          <Link href={`/b/${slug}#opiniones`} className={`${primaryClass} w-full`}>
            Ver mi opinión <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
