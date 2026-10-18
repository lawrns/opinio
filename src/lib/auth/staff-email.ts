import { createTransport } from 'nodemailer';

/**
 * The invitation link opens a first-party page with the token in the URL
 * fragment, which never reaches the server; the page posts it only when the
 * invited person, signed in with the invited address, presses the button.
 */
export function staffInvitationUrl(origin: string, token: string): string {
  return `${new URL(origin).origin}/cuenta/invitacion#token=${encodeURIComponent(token)}`;
}

/** Neutral invitation message: no business, case or account details. */
export function staffInvitationEmail(link: string) {
  return {
    subject: 'Te invitaron a colaborar en Opinio',
    text: `Te invitaron a colaborar en un comercio en Opinio.\nEntra a Opinio con este mismo correo y abre este enlace:\n${link}\n\nVence en 24 horas y solo funciona una vez. Si no lo esperabas, ignora este correo.\n`,
    html: `<p>Te invitaron a colaborar en un comercio en Opinio.</p><p>Entra a Opinio con este mismo correo y abre este enlace:</p><p><a href="${link}">Aceptar la invitación</a></p><p>Vence en 24 horas y solo funciona una vez. Si no lo esperabas, ignora este correo.</p>`,
  };
}

/**
 * Sends the invitation through the configured auth mail transport. Returns
 * false, sending nothing, when no mail server or public origin is configured.
 */
export async function sendStaffInvitation(to: string, token: string): Promise<boolean> {
  const server = process.env.AUTH_EMAIL_SERVER;
  const origin = process.env.AUTH_URL;
  if (!server || !origin) return false;
  await createTransport(server).sendMail({
    to,
    from: process.env.AUTH_EMAIL_FROM,
    ...staffInvitationEmail(staffInvitationUrl(origin, token)),
  });
  return true;
}
