import { describe, expect, it } from 'vitest';
import { isPublicAnalyticsPath } from '@/lib/analytics';
import { staffInvitationEmail, staffInvitationUrl } from './staff-email';

describe('staff invitation email', () => {
  it('puts the token only in the fragment of a first-party page', () => {
    const url = new URL(staffInvitationUrl('https://opinio.mx/anything?x=1', 'SENTINEL_TOKEN'));
    expect(url.origin).toBe('https://opinio.mx');
    expect(url.pathname).toBe('/cuenta/invitacion');
    expect(url.search).toBe('');
    expect(new URLSearchParams(url.hash.slice(1)).get('token')).toBe('SENTINEL_TOKEN');
    expect(isPublicAnalyticsPath(url.pathname)).toBe(false);
  });

  it('is neutral: no business, case or account details', () => {
    const { subject, text, html } = staffInvitationEmail('https://opinio.mx/cuenta/invitacion#token=T');
    for (const part of [subject, text, html]) {
      expect(part).not.toMatch(/caso|reseña|queja|propietario|RFC/i);
    }
    expect(text).toContain('24 horas');
    expect(text).toContain('una vez');
  });
});
