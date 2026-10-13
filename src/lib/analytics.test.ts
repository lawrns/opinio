import { describe, it, expect } from 'vitest';
import { analyticsPageLocation, analyticsReferrer, isPublicAnalyticsPath } from './analytics';

describe('Google Analytics privacy boundaries', () => {
  it('removes query parameters and fragments from public page locations', () => {
    expect(analyticsPageLocation('https://opinio.mx/verificar?q=person@example.com&token=secret#private'))
      .toBe('https://opinio.mx/verificar');
  });

  it.each([
    '/caso/private-case-id',
    '/caso/nuevo-private-case-id',
    '/merchant',
    '/merchant/inbox',
    '/widget/badge/private-token',
    '/api/v1/cases/private-case-id',
    '/b/store/private-details',
  ])('excludes the private or unsupported path %s', (pathname) => {
    expect(analyticsPageLocation(`https://opinio.mx${pathname}?email=person@example.com`)).toBeNull();
  });

  it('distinguishes the public case-entry form from individual case records', () => {
    expect(isPublicAnalyticsPath('/caso/nuevo')).toBe(true);
    expect(isPublicAnalyticsPath('/caso/')).toBe(false);
    expect(isPublicAnalyticsPath('/caso/nuevo/private-id')).toBe(false);
  });

  it('retains merchant discovery paths without treating a route prefix as a page', () => {
    expect(isPublicAnalyticsPath('/b/luuna')).toBe(true);
    expect(isPublicAnalyticsPath('/escribir-opinion/luuna')).toBe(true);
    expect(isPublicAnalyticsPath('/b')).toBe(false);
    expect(isPublicAnalyticsPath('/escribir-opinion/luuna/private')).toBe(false);
  });

  it('does not disclose private referrer paths or their query parameters', () => {
    expect(analyticsReferrer('https://opinio.mx/caso/private-id?token=secret#message'))
      .toBe('https://opinio.mx/');
    expect(analyticsReferrer('')).toBe('');
  });
});
