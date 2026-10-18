import { createTransport } from 'nodemailer';

/** The link opens a first-party page with the token only in the fragment, which never reaches the server. */
export function caseAccessUrl(origin: string, token: string): string {
  return `${new URL(origin).origin}/caso/acceso#token=${encodeURIComponent(token)}`;
}

/** Neutral access message: no business, complaint, remedy or contact details. */
export function caseAccessEmail(link: string) {
  return {
    subject: 'Tu enlace para ver tu caso en Opinio',
    text: `Usa este enlace para ver tu caso en Opinio:\n${link}\n\nVence en 15 minutos y solo funciona una vez. Si vence, puedes pedir otro desde Opinio. Si no abriste un caso, ignora este correo.\n`,
    html: `<p>Usa este enlace para ver tu caso en Opinio:</p><p><a href="${link}">Ver mi caso</a></p><p>Vence en 15 minutos y solo funciona una vez. Si vence, puedes pedir otro desde Opinio. Si no abriste un caso, ignora este correo.</p>`,
  };
}

/**
 * Hands the link to the configured transport. Returns whether the transport
 * accepted it (not whether it reached an inbox); false, sending nothing, when
 * no mail server or public origin is configured.
 */
export async function sendCaseAccessLink(to: string, token: string): Promise<boolean> {
  const server = process.env.AUTH_EMAIL_SERVER;
  const origin = process.env.AUTH_URL;
  if (!server || !origin) return false;
  try {
    await createTransport(server).sendMail({ to, from: process.env.AUTH_EMAIL_FROM, ...caseAccessEmail(caseAccessUrl(origin, token)) });
    return true;
  } catch {
    console.error('[case-access] access link email failed');
    return false;
  }
}
