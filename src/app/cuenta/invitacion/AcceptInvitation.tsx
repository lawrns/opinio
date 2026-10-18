'use client';

import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/auth/AuthShell';

/**
 * Reads the invitation token from the URL fragment, removes it from the
 * address bar at once, keeps it only in memory, and posts it only when the
 * signed-in person presses the button. A signed-out visitor is asked to sign
 * in and reopen the emailed link; the token is never stored in the browser.
 */
export function AcceptInvitation({ signedIn }: { signedIn: boolean }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const fromFragment = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fragment only exists in the browser
    setToken(fromFragment);
  }, []);

  if (token === undefined) return <p>Preparando la invitación…</p>;
  if (!signedIn) {
    return (
      <p data-testid="invitation-sign-in">
        Primero <a href="/acceso" className="font-bold underline">entra a Opinio</a> con el correo al que llegó la
        invitación. Después vuelve a abrir el enlace del correo para aceptarla.
      </p>
    );
  }
  if (token === null) {
    return <p>No encontramos una invitación en este enlace. Ábrelo de nuevo desde el correo que recibiste.</p>;
  }
  return (
    <form method="post" action="/cuenta/invitacion/aceptar">
      <input type="hidden" name="token" value={token} />
      <button type="submit" className={buttonClass}>Aceptar la invitación</button>
    </form>
  );
}
