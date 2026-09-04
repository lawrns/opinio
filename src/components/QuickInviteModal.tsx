'use client';

import React from 'react';
import { Send, X, Copy } from 'lucide-react';
import { triggerInvitationAction } from '@/lib/merchant-actions';

interface QuickInviteModalProps {
  businessId: number;
  businessSlug: string;
}

export function QuickInviteModal({ businessId }: QuickInviteModalProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const [channel, setChannel] = React.useState<'whatsapp' | 'email'>('whatsapp');
  const [target, setTarget] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; token?: string; error?: string } | null>(null);
  const [copyStatus, setCopyStatus] = React.useState('');
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  const inviteUrl = result?.token ? `https://opinio.mx/r/${result.token}` : '';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const cleanTarget = target.trim();
    if (channel === 'whatsapp' && !/^\+?52\d{10}$/.test(cleanTarget.replace(/[\s()-]/g, ''))) {
      setResult({ success: false, error: 'Escribe +52 seguido de los 10 dígitos del celular.' });
      return;
    }
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('business_id', String(businessId));
    formData.append('channel', channel);
    formData.append('recipient_target', cleanTarget);
    try {
      const response = await triggerInvitationAction(formData);
      setResult(response.success ? response : { success: false, error: 'No se pudo registrar la invitación. Revisa los datos e inténtalo de nuevo.' });
      if (response.success) setTarget('');
    } catch {
      setResult({ success: false, error: 'No pudimos conectar. Conservamos tus datos para que vuelvas a intentarlo.' });
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(inviteUrl); setCopyStatus('Enlace copiado.'); }
    catch { setCopyStatus('No se pudo copiar. Selecciona el enlace para copiarlo manualmente.'); }
  }

  return <>
    <button ref={trigger} type="button" onClick={() => { setResult(null); setCopyStatus(''); dialog.current?.showModal(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-op-green px-4 py-2 text-sm font-semibold text-white hover:bg-op-green-dark">
      <Send className="h-4 w-4" aria-hidden="true" /> Crear invitación
    </button>
    <dialog ref={dialog} aria-labelledby="invite-title" aria-describedby="invite-description" onCancel={() => trigger.current?.focus()} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-op-border bg-op-sheet p-0 text-op-ink shadow-2xl backdrop:bg-black/40">
      <div className="flex items-start justify-between gap-4 border-b border-op-border p-5">
        <div><h2 id="invite-title" className="text-xl font-semibold">Invitar a un cliente</h2><p id="invite-description" className="mt-1 text-sm leading-relaxed text-op-muted">Crea un enlace de opinión y compártelo con tu cliente.</p></div>
        <button type="button" onClick={close} aria-label="Cerrar invitación" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-op-shaded"><X className="h-5 w-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <fieldset><legend className="mb-2 text-sm font-semibold">Canal para compartir</legend><div className="grid grid-cols-2 gap-3">{(['whatsapp', 'email'] as const).map((value) => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-op-border px-3 text-sm"><input type="radio" name="invite-channel" value={value} checked={channel === value} onChange={() => { setChannel(value); setTarget(''); }} />{value === 'whatsapp' ? 'WhatsApp' : 'Correo'}</label>)}</div></fieldset>
        <div><label htmlFor="quick-invite-target" className="mb-2 block text-base font-semibold">{channel === 'whatsapp' ? 'Celular del cliente' : 'Correo del cliente'}</label><input id="quick-invite-target" type={channel === 'whatsapp' ? 'tel' : 'email'} autoComplete={channel === 'whatsapp' ? 'tel' : 'email'} required value={target} onChange={(event) => setTarget(event.target.value)} placeholder={channel === 'whatsapp' ? '+52 55 1234 5678' : 'cliente@ejemplo.com'} className="min-h-12 w-full rounded-xl border border-op-border bg-op-canvas px-3 text-base" /></div>
        <p className="rounded-xl bg-op-shaded p-3 text-sm leading-relaxed text-op-secondary">Invita a tus clientes sin seleccionar por su nivel de satisfacción. Crear el enlace no confirma su entrega por WhatsApp o correo.</p>
        {result?.success && <div role="status" className="space-y-3 rounded-xl border border-op-green-border bg-op-green-soft p-4 text-sm text-op-green-dark"><p className="font-semibold">Invitación registrada. Ya puedes compartir el enlace.</p><input aria-label="Enlace de invitación" readOnly value={inviteUrl} onFocus={(event) => event.target.select()} className="min-h-11 w-full rounded-lg border border-op-border bg-op-sheet px-2 text-base text-op-ink" /><button type="button" onClick={copyLink} className="flex min-h-11 items-center gap-2 font-semibold"><Copy className="h-4 w-4" />Copiar enlace</button><p aria-live="polite">{copyStatus}</p></div>}
        {result?.error && <p role="alert" className="rounded-xl bg-op-danger-soft p-3 text-sm text-op-danger">{result.error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-3"><button type="button" onClick={close} className="min-h-11 rounded-xl px-4 text-sm font-semibold hover:bg-op-shaded">Cerrar</button><button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-op-green px-4 text-sm font-semibold text-white hover:bg-op-green-dark disabled:opacity-60">{loading ? 'Registrando…' : 'Crear enlace de opinión'}</button></div>
      </form>
    </dialog>
  </>;
}
