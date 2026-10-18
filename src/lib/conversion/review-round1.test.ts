/**
 * Reviewer round 1 on #44 (CONVERSION-001 Opinio): blocked storage, the
 * hydration-time journey wipe, event page context, CTA coverage and the
 * readout's explicit unavailable rows.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }));

import { isPublicAnalyticsPath } from '../analytics';
import { STAGE_COVERAGE } from './coverage';
import { ALL_CTA_IDS } from './cta';

const read = (path: string) => readFileSync(path, 'utf8');

describe('blocked site storage never breaks a page or a review submit', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function blockedStorageWindow() {
    const win = {
      crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
      gtag: vi.fn(),
      location: { pathname: '/escribir-opinion/comercio-demo', origin: 'https://opinio.mx' },
    };
    Object.defineProperty(win, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    vi.stubGlobal('window', win);
    return win;
  }

  it('windowEnv, conversionContext, step tracking and journey clearing do not throw', async () => {
    blockedStorageWindow();
    const client = await import('./client');
    expect(() => client.trackStepStarted('consumer_review', 'review_form_experience')).not.toThrow();
    expect(() => client.conversionContext()).not.toThrow();
    expect(client.conversionContext()).toEqual({ consent: 'denied' });
    await expect(client.clearConversionJourney()).resolves.toBeUndefined();
    await expect(client.retryPendingWithdrawal()).resolves.toBeUndefined();
  });
});

describe('a full page load never wipes or withdraws the journey', () => {
  it('only an explicit "denied" clears it; the hydration-time "pending" does not', () => {
    const source = read('src/components/Analytics.tsx');
    expect(source).toMatch(/if \(consent === 'denied'\) \{\s*void clearConversionJourney\(\);/);
    expect(source).not.toMatch(/if \(consent !== 'granted'\) \{\s*void clearConversionJourney\(\);/);
  });
});

describe('conversion events carry template page context, not the document', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('page_location is the reviewed template and page_title the page ID (no business name or slug)', async () => {
    const gtag = vi.fn();
    const store = new Map([['opinio.analytics-consent', 'granted']]);
    vi.stubGlobal('window', {
      gtag,
      crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000002' },
      location: { pathname: '/b/zapateria-maria-lopez', origin: 'https://opinio.mx' },
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    });
    const { trackCta } = await import('./client');
    trackCta('passport_write_review');
    expect(gtag).toHaveBeenCalledTimes(1);
    const [command, name, params] = gtag.mock.calls[0];
    expect([command, name]).toEqual(['event', 'conversion_cta_click']);
    expect(params).toMatchObject({ page_location: 'https://opinio.mx/b/business', page_title: 'passport', page_referrer: 'https://opinio.mx/' });
    expect(JSON.stringify(params)).not.toMatch(/maria|lopez|zapateria/);
  });

  it('blog page views only accept slug-shaped paths', () => {
    expect(isPublicAnalyticsPath('/blog/resenas-whatsapp')).toBe(true);
    expect(isPublicAnalyticsPath('/blog/maria@example.com')).toBe(false);
    expect(isPublicAnalyticsPath('/blog/Juan%20Perez')).toBe(false);
  });
});

describe('competing-journey CTAs are all tagged', () => {
  it('mobile "Escribir opinión" and the directory passport cards carry reviewed CTA IDs', () => {
    expect(ALL_CTA_IDS).toContain('directory_open_passport');
    const nav = read('src/components/Navbar.tsx');
    expect(nav).toMatch(/href: '\/verificar\?accion=opinar', label: 'Escribir opinión', cta: 'nav_write_review'/);
    expect(nav).toMatch(/data-cta=\{cta\}/);
    expect(read('src/app/directorio/page.tsx')).toMatch(/href=\{`\/b\/\$\{encodeURIComponent\(b\.slug\)\}`\}\s*data-cta="directory_open_passport"/);
  });
});

describe('the readout never shows an unsupported metric as zero', () => {
  it('denominators, failures and abandonment are listed with how (or whether) they are measured', () => {
    const rows = Object.fromEntries(STAGE_COVERAGE.map((r) => [r.stage, r]));
    expect(rows['step_denominators']).toMatchObject({ status: 'intent_only' });
    expect(rows['step_failed']).toMatchObject({ status: 'unavailable' });
    expect(rows['review_abandonment']).toMatchObject({ status: 'unavailable' });
    const readout = read('scripts/conversion-readout.ts');
    expect(readout).toMatch(/bun run scripts\/conversion-readout\.ts/);
    expect(readout).toMatch(/\.\.\.coverageByStatus\(\)/);
    expect(readout).toMatch(/e\.source/); // live vs reconciled split (seeded/imported reviews only appear as reconciled)
    expect(read('scripts/conversion-maintenance.ts')).toMatch(/bun run scripts\/conversion-maintenance\.ts/);
  });
});
