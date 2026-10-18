import { createTransport } from 'nodemailer';

/**
 * The emailed link opens a first-party confirmation page with the Auth.js
 * callback parameters in the URL fragment. Fragments never reach the server,
 * so a mail scanner that fetches the link cannot consume it. The token only
 * leaves the browser when the person presses the button on that page.
 */
export function confirmationUrl(callbackUrl: string): string {
  const url = new URL(callbackUrl);
  return `${url.origin}/acceso/confirmar#${url.searchParams.toString()}`;
}

/** Neutral login message: no business, case or account details. */
export function loginEmail(link: string) {
  return {
    subject: 'Tu enlace para entrar a Opinio',
    text: `Usa este enlace para entrar a Opinio:\n${link}\n\nVence en 15 minutos y solo funciona una vez. Si no lo pediste, ignora este correo.\n`,
    html: `<p>Usa este enlace para entrar a Opinio:</p><p><a href="${link}">Entrar a Opinio</a></p><p>Vence en 15 minutos y solo funciona una vez. Si no lo pediste, ignora este correo.</p>`,
  };
}

/** Auth.js `sendVerificationRequest` for the Nodemailer provider. */
export async function sendLoginEmail(params: {
  identifier: string;
  url: string;
  provider: { server?: unknown; from?: string };
}): Promise<void> {
  const transport = createTransport(params.provider.server as Parameters<typeof createTransport>[0]);
  await transport.sendMail({
    to: params.identifier,
    from: params.provider.from,
    ...loginEmail(confirmationUrl(params.url)),
  });
}
