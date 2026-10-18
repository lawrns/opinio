import { describe, expect, it } from 'vitest';
import { isPublicAnalyticsPath } from '@/lib/analytics';
import { caseAccessEmail, caseAccessUrl } from './case-email';

describe('buyer case access email', () => {
  it('puts the token only in the fragment of a first-party page without analytics', () => {
    const url = new URL(caseAccessUrl('https://opinio.mx/x?y=1', 'SENTINEL_TOKEN'));
    expect(url.origin).toBe('https://opinio.mx');
    expect(url.pathname).toBe('/caso/acceso');
    expect(url.search).toBe('');
    expect(new URLSearchParams(url.hash.slice(1)).get('token')).toBe('SENTINEL_TOKEN');
    expect(isPublicAnalyticsPath(url.pathname)).toBe(false);
  });

  it('is neutral: no business, complaint, remedy or contact details', () => {
    const { subject, text, html } = caseAccessEmail('https://opinio.mx/caso/acceso#token=T');
    for (const part of [subject, text, html]) expect(part).not.toMatch(/reembolso|retraso|queja|comercio|tienda|teléfono|@/i);
    expect(text).toContain('15 minutos');
  });
});
