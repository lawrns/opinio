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
  /recibi[oó] (una )?invitaci[oó]n/i,
  /No tienes que armar mensajes/i,
  /se invita al 100/i,
  /Invitaciones enviadas/i,
  /enviada exitosamente/i,
  /al enviar la invitaci[oó]n/i,
  // No automatic order import exists yet (/merchant/integrations says so).
  /monitorea (todas )?las ventas/i,
];

const SURFACES: [string, string][] = [
  ['blog post (body, FAQ and source claims)', read('content', 'blog', 'como-pedir-resenas-por-whatsapp-mexico.md')],
  ['/resenas-y-reputacion FAQ (and its JSON-LD)', RESENAS_FAQ.map((f) => f.a).join('\n')],
  ['/resenas-y-reputacion pillars', read('src', 'app', 'resenas-y-reputacion', 'page.tsx')],
  ['trust post (body, FAQ and source claims)', read('content', 'blog', 'demostrar-confiabilidad-negocio-mas-alla-estrellas.md')],
  ['home: connected pipeline', read('src', 'components', 'home', 'ConnectedPipeline.tsx')],
  ['home: proof grid', read('src', 'components', 'home', 'ProofBentoGrid.tsx')],
  ['merchant dashboard', read('src', 'app', 'merchant', 'page.tsx')],
  ['POST /api/v1/invitations messages', read('src', 'app', 'api', 'v1', 'invitations', 'route.ts')],
  ['llms.txt', read('public', 'llms.txt')],
  ['llms-full.txt', read('public', 'llms-full.txt')],
];

describe('invitation copy matches the code (OPINIO-COPY-001)', () => {
  it.each(SURFACES)('%s never says Opinio sends or delivers the invitation', (_label, text) => {
    for (const claim of SENDING_CLAIMS) expect(text).not.toMatch(claim);
  });

  it('the WhatsApp answer says registering is not sending or delivery', () => {
    const whatsapp = RESENAS_FAQ.find((f) => f.q === '¿Cómo pido reseñas por WhatsApp a mis clientes en México?');
    expect(whatsapp?.a).toMatch(/no la envía ni confirma su entrega/);
  });

  // QA-057 (Chief's rewrite): llms.txt / llms-full.txt are what AI crawlers
  // read. They must describe what live opinio.mx serves (verified with curl:
  // these routes return 200, only /merchant is 503), never the old offline notice.
  const PUBLIC_ROUTES: [string, string][] = [
    ['/directorio', 'directorio'],
    ['/b/{slug}', 'b/[slug]'],
    ['/verificar', 'verificar'],
    ['/escribir-opinion/{slug}', 'escribir-opinion/[slug]'],
    ['/caso/nuevo', 'caso/nuevo'],
    ['/caso/{id}', 'caso/[id]'],
    ['/blog', 'blog'],
    ['/resenas-y-reputacion', 'resenas-y-reputacion'],
  ];
  it.each([
    ['llms.txt', read('public', 'llms.txt')],
    ['llms-full.txt', read('public', 'llms-full.txt')],
  ])('%s describes the live site and never the offline notice', (_label, text) => {
    for (const stale of [/fuera de línea/i, /\b410\b/, /\bGone\b/i, /única página pública/i, /una sola URL/i, /solo portada/i, /no se reciben opiniones/i, /deshabilitad/i]) {
      expect(text).not.toMatch(stale);
    }
    expect(text).toMatch(/Opinio México \(opinio\.mx\) está (\*\*)?en línea/);
    expect(text).toMatch(/panel de comercios .*está temporalmente no disponible mientras se habilita el acceso seguro/);
    expect(text).toMatch(/Opinio no envía invitaciones automáticamente/);
    expect(text).toMatch(/comparte el enlace del formulario público/);
    for (const [route, dir] of PUBLIC_ROUTES) {
      expect(text, route).toContain(`https://opinio.mx${route}`);
      // Every route it names exists in the app.
      expect(fs.existsSync(path.join(process.cwd(), 'src', 'app', ...dir.split('/'))), dir).toBe(true);
    }
    expect(text).toContain('https://opinio.mx/sitemap.xml');
  });

  it('the invitation code calls no messaging provider', () => {
    for (const file of [read('src', 'lib', 'merchant-actions.ts'), read('src', 'app', 'api', 'v1', 'invitations', 'route.ts')]) {
      expect(file).not.toMatch(/nodemailer|twilio|sendgrid|resend|graph\.facebook|wa\.me|fetch\(/i);
    }
  });
});
