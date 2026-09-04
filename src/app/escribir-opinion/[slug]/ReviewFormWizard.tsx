'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CircleNotch, Star, WarningCircle } from '@phosphor-icons/react';

interface Props {
  businessId: number;
  slug: string;
  brandName: string;
  legalName: string | null;
  category: string;
}

const RATING_LABELS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];
const inputClass = 'w-full rounded-xl border border-[var(--op-border-strong)] bg-[var(--op-canvas)] px-4 py-3 text-base text-[var(--op-ink-primary)]';
const primaryClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--op-ink-primary)] px-6 py-3 text-sm font-semibold text-[var(--op-sheet)] disabled:cursor-not-allowed disabled:opacity-50';

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
  const moveTo = (nextStep: 1 | 2 | 3) => {
    setStep(nextStep);
    setErrorMsg(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (rating < 1 || body.trim().length < 15 || !authorName.trim() || !acceptTerms) {
      setErrorMsg('Revisa tu calificación, escribe al menos 15 caracteres, añade tu nombre y confirma que la experiencia es real.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, rating, title: title.trim() || undefined, body: body.trim(), author_name: authorName.trim(), verification_level: 'unverified_experience', product_name: productName.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error('No pudimos publicar tu opinión. Tu texto sigue aquí; intenta de nuevo.');
      moveTo(3);
    } catch {
      setErrorMsg('No pudimos publicar tu opinión. Tu texto sigue aquí; intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--op-border-hairline)] bg-[var(--op-sheet)] p-5 text-[var(--op-ink-primary)] sm:p-9">
      <Link href={`/b/${slug}`} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--op-ink-secondary)]"><ArrowLeft aria-hidden="true" size={16} /> Volver al negocio</Link>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--op-verified-ink)]">Comparte tu experiencia</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 break-words text-3xl font-semibold tracking-tight outline-none">{step === 3 ? 'Gracias por compartir tu opinión.' : `Opinar sobre ${brandName}`}</h1>
      <p className="mt-2 text-sm text-[var(--op-ink-muted)]">{legalName || category}</p>
      {step < 3 && <ol aria-label="Progreso de tu opinión" className="my-8 grid grid-cols-2 gap-3 border-y border-[var(--op-border-hairline)] py-4">{['Tu experiencia', 'Revisar y publicar'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`flex items-center gap-2 text-sm ${step === index + 1 ? 'font-semibold' : 'text-[var(--op-ink-muted)]'}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${step === index + 1 ? 'bg-[var(--op-ink-primary)] text-[var(--op-sheet)]' : 'bg-[var(--op-shaded)]'}`}>{index + 1}</span>{label}</li>)}</ol>}
      {errorMsg && <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-[var(--op-danger-border)] bg-[var(--op-danger-tint)] p-4 text-sm text-[var(--op-danger-ink)]"><WarningCircle className="mt-0.5 shrink-0" size={18} />{errorMsg}</div>}
      {step === 1 && <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); if (!rating) { setErrorMsg('Selecciona una calificación de 1 a 5 estrellas.'); return; } if (body.trim().length < 15) { setErrorMsg('Describe tu experiencia con al menos 15 caracteres.'); return; } moveTo(2); }}>
        <fieldset><legend className="mb-3 text-base font-semibold">¿Cómo fue tu experiencia? <span className="text-sm font-normal">(obligatorio)</span></legend><div className="flex flex-wrap gap-2">{RATING_LABELS.map((label, index) => <label key={label} className="cursor-pointer"><input type="radio" name="rating" value={index + 1} checked={rating === index + 1} onChange={() => setRating(index + 1)} required className="peer sr-only" /><span className={`flex min-h-14 min-w-12 flex-col items-center justify-center rounded-xl border px-3 py-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--op-verified-ink)] ${rating === index + 1 ? 'border-[var(--op-verified-ink)] bg-[var(--op-verified-tint)] text-[var(--op-verified-ink)]' : 'border-[var(--op-border-strong)] text-[var(--op-ink-secondary)]'}`}><span className="flex items-center gap-1"><span className="text-base font-semibold">{index + 1}</span><Star size={16} weight={rating === index + 1 ? 'fill' : 'regular'} aria-hidden="true" /></span><span className="mt-1 text-xs">{label}</span></span></label>)}</div></fieldset>
        <div><label htmlFor="review-product" className="mb-2 block text-sm font-semibold">Producto o servicio <span className="font-normal text-[var(--op-ink-muted)]">(opcional)</span></label><input id="review-product" value={productName} onChange={(event) => setProductName(event.target.value)} maxLength={160} className={inputClass} placeholder="¿Qué compraste o contrataste?" /></div>
        <div><label htmlFor="review-title" className="mb-2 block text-sm font-semibold">Título <span className="font-normal text-[var(--op-ink-muted)]">(opcional)</span></label><input id="review-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className={inputClass} placeholder="Resume lo más importante" /></div>
        <div><label htmlFor="review-body" className="mb-2 block text-sm font-semibold">Cuéntanos qué pasó <span className="font-normal">(obligatorio)</span></label><textarea id="review-body" value={body} onChange={(event) => setBody(event.target.value)} required minLength={15} maxLength={5000} rows={6} aria-describedby="review-body-help" className={`${inputClass} leading-relaxed`} placeholder="¿Qué salió bien? ¿Qué podría mejorar? Describe el producto, la atención y la entrega." /><p id="review-body-help" className="mt-2 text-xs leading-relaxed text-[var(--op-ink-muted)]">{body.trim().length}/5,000 caracteres · Mínimo 15. No incluyas teléfonos, domicilios, números de cuenta ni otros datos personales.</p></div>
        <button type="submit" className={`${primaryClass} w-full sm:w-auto`}>Revisar mi opinión <ArrowRight aria-hidden="true" size={17} /></button>
      </form>}
      {step === 2 && <form onSubmit={handleSubmit} className="space-y-6" aria-busy={submitting}>
        <div className="rounded-xl border border-[var(--op-border-hairline)] bg-[var(--op-canvas)] p-5"><h2 className="text-sm font-semibold">Así se verá tu opinión</h2><p className="mt-3 text-sm font-semibold text-[var(--op-verified-ink)]">{rating} de 5 estrellas · {RATING_LABELS[rating - 1]}</p>{title && <p className="mt-3 break-words font-semibold">{title}</p>}<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--op-ink-secondary)]">{body}</p>{productName && <p className="mt-3 break-words text-xs text-[var(--op-ink-muted)]">Producto o servicio: {productName}</p>}</div>
        <div><label htmlFor="review-author" className="mb-2 block text-sm font-semibold">Nombre o alias público <span className="font-normal">(obligatorio)</span></label><input id="review-author" value={authorName} onChange={(event) => setAuthorName(event.target.value)} required maxLength={80} autoComplete="nickname" className={inputClass} placeholder="Cómo quieres aparecer" aria-describedby="review-author-help" /><p id="review-author-help" className="mt-2 text-xs text-[var(--op-ink-muted)]">Este nombre aparecerá junto a tu opinión.</p></div>
        <div className="rounded-xl border border-[var(--op-border-hairline)] p-4 text-sm leading-relaxed text-[var(--op-ink-secondary)]"><p className="font-semibold text-[var(--op-ink-primary)]">Opinión sin comprobante verificado</p><p className="mt-1">Este formulario no valida pagos ni adjunta documentos. Tu opinión se publicará con esa etiqueta para que otros lectores conozcan su alcance.</p></div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} required className="mt-1 size-5 shrink-0 accent-[var(--op-verified-ink)]" /><span>Confirmo que esta opinión refleja mi experiencia real con {brandName} y que quiero publicarla con el nombre indicado.</span></label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" disabled={submitting} onClick={() => moveTo(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--op-border-strong)] px-5 text-sm font-semibold"><ArrowLeft size={17} aria-hidden="true" /> Editar opinión</button><button type="submit" disabled={submitting} className={primaryClass}>{submitting ? <><CircleNotch className="animate-spin" size={17} /> Publicando…</> : <>Publicar opinión <ArrowRight size={17} aria-hidden="true" /></>}</button></div>
      </form>}
      {step === 3 && <div className="mt-8 space-y-6"><div role="status" className="rounded-xl border border-[var(--op-verified-border)] bg-[var(--op-verified-tint)] p-5 text-[var(--op-verified-ink)]"><Check size={24} aria-hidden="true" /><h2 className="mt-3 text-lg font-semibold">Tu opinión se publicó</h2><p className="mt-2 text-sm leading-relaxed">Ya forma parte del pasaporte de {brandName}, con la etiqueta de opinión sin comprobante verificado.</p></div><Link href={`/b/${slug}#opiniones`} className={`${primaryClass} w-full`}>Ver mi opinión <ArrowRight size={17} aria-hidden="true" /></Link></div>}
    </div>
  );
}
