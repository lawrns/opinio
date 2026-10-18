'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Reads the access token from the URL fragment, removes it from the address
 * bar at once, keeps it only in memory, and posts it only when the buyer
 * presses the button. Opening or previewing the link consumes nothing.
 */
export function ConfirmCaseAccess() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const fromFragment = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fragment only exists in the browser
    setToken(fromFragment);
  }, []);

  if (token === undefined) return <p>Preparando tu acceso…</p>;
  if (token === null) {
    return (
      <p>
        Este enlace está incompleto. <Link href="/caso/acceso/reenviar" className="font-bold underline">Pide uno nuevo</Link>.
      </p>
    );
  }
  return (
    <form method="post" action="/caso/acceso/entrar">
      <input type="hidden" name="token" value={token} />
      <button type="submit" className="op-button w-full">Ver mi caso</button>
    </form>
  );
}
