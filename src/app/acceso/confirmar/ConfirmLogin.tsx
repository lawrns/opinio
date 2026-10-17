'use client';

import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/auth/AuthShell';

/** Only these Auth.js callback parameters are passed on; the return path must be on this site. */
function callbackParams(fragment: string): [string, string][] | null {
  const params = new URLSearchParams(fragment);
  const token = params.get('token');
  const email = params.get('email');
  const next = params.get('callbackUrl');
  if (!token || !email) return null;
  const out: [string, string][] = [['token', token], ['email', email]];
  if (next && next.startsWith('/') && !next.startsWith('//')) out.push(['callbackUrl', next]);
  return out;
}

/**
 * Reads the login parameters from the URL fragment, removes them from the
 * address bar at once, and sends them to the server only when the person
 * presses the button. Mail scanners that open the link consume nothing.
 */
export function ConfirmLogin() {
  const [fields, setFields] = useState<[string, string][] | null | undefined>(undefined);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fragment only exists in the browser
    setFields(callbackParams(fragment));
  }, []);

  if (fields === undefined) return <p>Preparando tu acceso…</p>;
  if (fields === null) {
    return (
      <p>
        El enlace está incompleto. <a href="/acceso" className="font-bold underline">Pide uno nuevo</a>.
      </p>
    );
  }
  // A plain GET form: the browser navigates only on a deliberate submit.
  return (
    <form method="get" action="/api/auth/callback/nodemailer">
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={buttonClass}>Entrar a Opinio</button>
    </form>
  );
}
