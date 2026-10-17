'use client';

import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/auth/AuthShell';

/** sessionStorage key that keeps an opened invitation across the login round trip (this tab only). */
export const PENDING_INVITATION_KEY = 'opinio.staff-invitation';

/**
 * Reads the invitation token from the URL fragment (or from this tab's
 * storage after a login), removes it from the address bar at once, and posts
 * it only when the signed-in person presses the button.
 */
export function AcceptInvitation({ signedIn }: { signedIn: boolean }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const fromFragment = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (fromFragment) window.sessionStorage.setItem(PENDING_INVITATION_KEY, fromFragment);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fragment and storage only exist in the browser
    setToken(fromFragment ?? window.sessionStorage.getItem(PENDING_INVITATION_KEY));
  }, []);

  if (token === undefined) return <p>Preparando la invitación…</p>;
  if (token === null) {
    return (
      <p>
        No encontramos una invitación en este enlace. Ábrelo de nuevo desde el correo que recibiste.
      </p>
    );
  }
  if (!signedIn) {
    return (
      <p data-testid="invitation-sign-in">
        Primero entra a Opinio con el correo al que llegó la invitación. Después vuelve a{' '}
        <a href="/cuenta" className="font-bold underline">tu cuenta</a> para aceptarla.{' '}
        <a href="/acceso" className="font-bold underline">Entrar</a>
      </p>
    );
  }
  return (
    <form
      method="post"
      action="/cuenta/invitacion/aceptar"
      onSubmit={() => window.sessionStorage.removeItem(PENDING_INVITATION_KEY)}
    >
      <input type="hidden" name="token" value={token} />
      <button type="submit" className={buttonClass}>Aceptar la invitación</button>
    </form>
  );
}

/** On /cuenta: a pointer back to an invitation opened in this tab before signing in. */
export function PendingInvitationNotice() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage only exists in the browser
    setPending(Boolean(window.sessionStorage.getItem(PENDING_INVITATION_KEY)));
  }, []);
  if (!pending) return null;
  return (
    <p data-testid="pending-invitation">
      Tienes una invitación abierta.{' '}
      <a href="/cuenta/invitacion" className="font-bold underline">Revisarla</a>
    </p>
  );
}
