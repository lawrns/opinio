import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyticsPageLocation, analyticsReferrer, isPublicAnalyticsPath, stripLandingTracking } from './analytics';

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

describe('QA-042: landing tracking params leave the URL before gtag.js loads', () => {
  const calls: Array<[unknown, string]> = [];
  const win = (pathname: string, search: string, hash = '') =>
    ({
      location: { pathname, search, hash },
      history: { state: { __NA: true }, replaceState: (state: unknown, _t: string, url: string) => void calls.push([state, url]) },
    }) as unknown as Pick<Window, 'location' | 'history'>;

  it('drops utm, click IDs and personal-looking params from a landing; hands the router a null state so it adopts the clean URL', () => {
    expect(stripLandingTracking(win('/', '?utm_source=qa_test&utm_medium=qa&email=x&name=QaProbe&gclid=abc'))).toBe(true);
    expect(calls.pop()).toEqual([null, '/']);
  });

  it('keeps the search and filter keys /verificar reads, so reload and sharing still work', () => {
    expect(stripLandingTracking(win('/verificar', '?q=luuna&categoria=Muebles&sort=rating&utm_source=x&email=x', '#resultados'))).toBe(true);
    expect(calls.pop()).toEqual([null, '/verificar?q=luuna&categoria=Muebles&sort=rating#resultados']);
    expect(stripLandingTracking(win('/verificar', '?q=luuna&accion=opinar'))).toBe(false);
  });

  it('keeps pagination on /directorio and the prefilled business on /caso/nuevo', () => {
    expect(stripLandingTracking(win('/directorio', '?page=8&fbclid=abc'))).toBe(true);
    expect(calls.pop()).toEqual([null, '/directorio?page=8']);
    expect(stripLandingTracking(win('/caso/nuevo', '?b=luuna&name=QaProbe'))).toBe(true);
    expect(calls.pop()).toEqual([null, '/caso/nuevo?b=luuna']);
  });

  it('leaves clean URLs and non-analytics routes alone', () => {
    expect(stripLandingTracking(win('/b/luuna', ''))).toBe(false);
    expect(stripLandingTracking(win('/merchant', '?business=luuna&email=x'))).toBe(false);
    expect(stripLandingTracking(win('/widget/card/tok', '?theme=dark&utm_source=x'))).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('runs after the landing touch is recorded and before gtag.js is mounted', () => {
    const source = readFileSync(new URL('../components/Analytics.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/onReady=\{\(\) => \{\s*recordConversionLanding\(\);\s*stripLandingTracking\(\);\s*setReady\(true\);\s*\}\}/);
    expect(source).toMatch(/\{ready && \(\s*<Script\s+id="opinio-google-analytics"/);
  });
});
