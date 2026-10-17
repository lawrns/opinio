/**
 * OPINIO-COPY-001: public copy must match what registering an invitation does.
 * Both invitation paths (triggerInvitationAction and POST /api/v1/invitations)
 * only insert a row and update coverage counters; no WhatsApp or email
 * provider is called. The merchant panel says so: "Registrar una invitación
 * no confirma su entrega por WhatsApp o correo." Registering is not sending,
 * sending is not delivery, and coverage counts registered invitations.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RESENAS_FAQ } from './resenas-reputacion';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

/** Wording that presents an invitation as sent by Opinio or as received. */
const SENDING_CLAIMS = [
  /sale por (\*\*)?WhatsApp/i,
  /manda el formulario/i,
  /recibi[oó] invitaci[oó]n/i,
  /No tienes que armar mensajes/i,
];

const SURFACES: [string, string][] = [
  ['blog post (body, FAQ and source claims)', read('content', 'blog', 'como-pedir-resenas-por-whatsapp-mexico.md')],
  ['/resenas-y-reputacion FAQ (and its JSON-LD)', RESENAS_FAQ.map((f) => f.a).join('\n')],
  ['/resenas-y-reputacion pillars', read('src', 'app', 'resenas-y-reputacion', 'page.tsx')],
];

describe('invitation copy matches the code (OPINIO-COPY-001)', () => {
  it.each(SURFACES)('%s never says Opinio sends or delivers the invitation', (_label, text) => {
    for (const claim of SENDING_CLAIMS) expect(text).not.toMatch(claim);
  });

  it('the WhatsApp answer says registering is not sending or delivery', () => {
    const whatsapp = RESENAS_FAQ.find((f) => f.q === '¿Cómo pido reseñas por WhatsApp a mis clientes en México?');
    expect(whatsapp?.a).toMatch(/no la envía ni confirma su entrega/);
  });

  it('the invitation code calls no messaging provider', () => {
    for (const file of [read('src', 'lib', 'merchant-actions.ts'), read('src', 'app', 'api', 'v1', 'invitations', 'route.ts')]) {
      expect(file).not.toMatch(/nodemailer|twilio|sendgrid|resend|graph\.facebook|wa\.me|fetch\(/i);
    }
  });
});
