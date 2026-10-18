import { describe, expect, it } from 'vitest';
import { isPublicAnalyticsPath } from '@/lib/analytics';
import { confirmationUrl, loginEmail } from './login-email';

const CALLBACK =
  'https://opinio.mx/api/auth/callback/nodemailer?callbackUrl=%2Fcuenta&token=SENTINEL_TOKEN&email=owner%40example.test';

describe('login email', () => {
  it('moves every callback parameter into the fragment of a first-party page', () => {
    const url = new URL(confirmationUrl(CALLBACK));
    expect(url.origin).toBe('https://opinio.mx');
    expect(url.pathname).toBe('/acceso/confirmar');
    expect(url.search).toBe('');
    expect(Object.fromEntries(new URLSearchParams(url.hash.slice(1)))).toEqual({
      callbackUrl: '/cuenta',
      token: 'SENTINEL_TOKEN',
      email: 'owner@example.test',
    });
  });

  it('is neutral apart from the link', () => {
    const { subject, text, html } = loginEmail('https://opinio.mx/acceso/confirmar#x');
    expect(subject).toBe('Tu enlace para entrar a Opinio');
    for (const body of [text, html]) {
      expect(body).toContain('https://opinio.mx/acceso/confirmar#x');
      expect(body).toContain('15 minutos');
    }
  });

  it('keeps analytics off the login, account and approval pages', () => {
    for (const path of ['/acceso', '/acceso/confirmar', '/acceso/revisa-tu-correo', '/cuenta', '/cuenta/negocios/1', '/admin/aprobaciones']) {
      expect(isPublicAnalyticsPath(path), path).toBe(false);
    }
  });
});
