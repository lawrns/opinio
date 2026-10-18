'use client';

import { useActionState } from 'react';
import { buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell';
import { createKeyAction, revokeKeyAction, rotateKeyAction, type KeyActionState } from './key-actions';

const SCOPE_LABEL = { order_events: 'Eventos de pedidos', invitations: 'Crear invitaciones a opinar' } as const;
type Scope = keyof typeof SCOPE_LABEL;

const RESULT: Record<string, string> = {
  revocada: 'Clave revocada. Deja de funcionar en su siguiente uso.',
  invalid_label: 'El nombre solo puede tener letras, números, espacios y . _ - (hasta 80).',
  invalid_scopes: 'Elige al menos un permiso.',
  too_many_keys: 'Este comercio ya tiene el máximo de claves activas. Revoca alguna primero.',
  not_found: 'Esa clave ya no está activa.',
  unavailable: 'No se pudo guardar. Intenta de nuevo.',
};

export interface KeyRow {
  keyId: number;
  label: string;
  prefix: string;
  scopes: Scope[];
  createdAt: string;
  revoked: boolean;
}

/** Shows a new key once. It exists only in this response's memory; reloading the page drops it. */
function NewKey({ state }: { state: KeyActionState }) {
  if (!state.key) return null;
  return (
    <div className="space-y-2 rounded-2xl border border-[var(--op-border-hairline)] p-4" data-testid="new-key">
      <p className="font-bold text-[var(--op-ink-primary)]">
        {state.outcome === 'rotada' ? 'Clave reemplazada.' : 'Clave creada.'} Cópiala ahora: no la volveremos a mostrar.
      </p>
      <code className="block break-all text-xs" data-testid="new-key-value">{state.key}</code>
    </div>
  );
}

/** Owner-only integration keys of one business: issue, list safe metadata, rotate, revoke. */
export function KeyManager({ businessId, keys }: { businessId: number; keys: KeyRow[] }) {
  const initial: KeyActionState = { outcome: null };
  const [created, create, creating] = useActionState(createKeyAction, initial);
  const [rotated, rotate, rotating] = useActionState(rotateKeyAction, initial);
  const [revoked, revoke] = useActionState(revokeKeyAction, initial);
  const message = [revoked, rotated, created].map((s) => (s.outcome ? RESULT[s.outcome] : undefined)).find(Boolean);

  return (
    <section className="space-y-4" aria-labelledby="claves" data-testid="keys">
      <h2 id="claves" className="text-base font-bold text-[var(--op-ink-primary)]">Claves de integración</h2>
      <p>
        Una clave permite que tu sistema registre eventos para este comercio, solo con los permisos que elijas. No da
        acceso a esta cuenta. Las funciones que la usan se abrirán cuando pasen sus pruebas.
      </p>
      <NewKey state={rotated.key ? rotated : created} />
      {message && <p role="status" data-testid="key-result">{message}</p>}
      <ul className="space-y-2">
        {keys.map((k) => (
          <li key={k.keyId} className="flex items-center justify-between gap-3" data-testid={`key-${k.keyId}`}>
            <span>
              {`${k.label} · opk_${k.prefix}_… · ${k.scopes.map((s) => SCOPE_LABEL[s]).join(', ')}${k.revoked ? ' · revocada' : ''}`}
            </span>
            {!k.revoked && (
              <span className="flex gap-3">
                <form action={rotate}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="keyId" value={k.keyId} />
                  <button type="submit" className="font-bold underline" disabled={rotating}>Reemplazar</button>
                </form>
                <form action={revoke}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="keyId" value={k.keyId} />
                  <button type="submit" className="font-bold underline">Revocar</button>
                </form>
              </span>
            )}
          </li>
        ))}
      </ul>
      <form action={create} className="space-y-3">
        <input type="hidden" name="businessId" value={businessId} />
        <div className="space-y-1.5">
          <label htmlFor="keyLabel" className={labelClass}>Nombre de la clave</label>
          <input id="keyLabel" name="label" required maxLength={80} placeholder="Tienda en línea" className={inputClass} />
        </div>
        <fieldset className="space-y-1.5">
          <legend className={labelClass}>Permisos</legend>
          {(Object.keys(SCOPE_LABEL) as Scope[]).map((scope) => (
            <label key={scope} className="flex items-center gap-2">
              <input type="checkbox" name="scopes" value={scope} /> {SCOPE_LABEL[scope]}
            </label>
          ))}
        </fieldset>
        <button type="submit" className={buttonClass} disabled={creating}>Crear clave</button>
      </form>
    </section>
  );
}
