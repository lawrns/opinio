'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsPageLocation, analyticsReferrer, isPublicAnalyticsPath, stripLandingTracking } from '@/lib/analytics';
import { bindCtaTracking, clearConversionJourney, flushBufferedConversionEvents, recordConversionLanding, retryPendingWithdrawal } from '@/lib/conversion/client';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

type Consent = 'pending' | 'granted' | 'denied';
const CONSENT_KEY = 'opinio.analytics-consent';
const CONSENT_EVENT = 'opinio-analytics-consent';
const DENIED_CONSENT = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};
const GRANTED_CONSENT = { ...DENIED_CONSENT, analytics_storage: 'granted' };
let sessionConsent: Consent | null = null;

function consentSnapshot(): Consent {
  if (sessionConsent) return sessionConsent;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'pending';
  } catch {
    return 'denied';
  }
}

function subscribeToConsent(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CONSENT_KEY && event.key !== null) return;
    sessionConsent = null;
    onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}

export function Analytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeToConsent, consentSnapshot, () => 'pending');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  const lastPage = useRef<string | null>(null);
  const publicPage = isPublicAnalyticsPath(pathname);

  useEffect(() => {
    window[`ga-disable-${measurementId}`] = consent !== 'granted' || !publicPage;
    if (consent !== 'granted') {
      lastPage.current = null;
      return;
    }
    if (!ready || !window.gtag) return;
    const pageLocation = analyticsPageLocation(window.location.href);
    if (!pageLocation && !initialized.current) return;

    window.gtag('consent', 'update', GRANTED_CONSENT);
    const context = {
      page_location: pageLocation ?? window.location.origin + '/',
      page_referrer: analyticsReferrer(document.referrer),
      page_title: pageLocation ? document.title : 'Opinio.mx',
    };
    window.gtag('set', context);
    if (!initialized.current) {
      window.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_domain: window.location.hostname,
      });
      initialized.current = true;
    }
    // Keyed on the real path: two blog articles share the template location
    // and are still two page views.
    const pagePath = pageLocation ? window.location.pathname : null;
    if (pagePath && lastPage.current !== pagePath) {
      window.gtag('event', 'page_view', context);
    }
    lastPage.current = pagePath;
    // CONVERSION-001: allowlisted landing touch (once per load), consented
    // only; then any step started before GA4 was configured.
    recordConversionLanding();
    flushBufferedConversionEvents();
  }, [consent, measurementId, pathname, publicPage, ready]);

  // A withdrawal the server has not confirmed yet is retried on every load,
  // whatever the consent is now (after a withdrawal it is denied).
  useEffect(() => {
    void retryPendingWithdrawal();
  }, []);

  // CONVERSION-001 CTA intent, consented only. Only an explicit "denied"
  // clears (and withdraws) the journey: hydration renders with the server
  // snapshot "pending" before the stored choice, so clearing on "pending"
  // wiped the first touch on every full load.
  useEffect(() => {
    if (consent === 'denied') {
      void clearConversionJourney();
      return;
    }
    if (consent !== 'granted') return;
    return bindCtaTracking();
  }, [consent]);

  function chooseConsent(choice: 'granted' | 'denied') {
    window[`ga-disable-${measurementId}`] = choice !== 'granted';
    window.gtag?.('consent', 'update', choice === 'granted' ? GRANTED_CONSENT : DENIED_CONSENT);
    sessionConsent = choice;
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
      setSessionOnly(false);
    } catch {
      setSessionOnly(true);
    }
    if (choice === 'denied') {
      for (const name of ['_ga', `_ga_${measurementId.slice(2)}`]) {
        const expired = `${name}=; Max-Age=0; Path=/`;
        document.cookie = expired;
        document.cookie = `${expired}; Domain=${window.location.hostname}`;
      }
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setPreferencesOpen(false);
  }

  if (!publicPage) return null;

  return (
    <>
      {consent === 'granted' && (
        <>
          {/* Keep Google's documented arguments-object command queue. The
              landing touch is recorded from the URL as loaded, then its
              tracking params leave the URL (QA-042), and only then is gtag.js
              mounted. */}
          <Script
            id="opinio-ga-bootstrap"
            strategy="afterInteractive"
            onReady={() => {
              recordConversionLanding();
              stripLandingTracking();
              setReady(true);
            }}
          >
            {`window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
window.gtag('js', new Date());`}
          </Script>
          {ready && (
            <Script
              id="opinio-google-analytics"
              src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
              strategy="afterInteractive"
            />
          )}
        </>
      )}
      {consent === 'pending' || preferencesOpen ? (
        <aside aria-label="Preferencias de analítica" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-op-border bg-op-sheet p-5 shadow-elevated sm:inset-x-6">
          <h2 className="text-base font-semibold text-op-ink">Analítica opcional</h2>
          <p className="mt-2 text-sm leading-relaxed text-op-secondary">
            Con tu permiso, usamos cookies de Google Analytics para entender las visitas y mejorar Opinio.
            No enviamos los datos de tus formularios ni las URLs de tus expedientes.
            Puedes cambiar tu decisión en Preferencias de analítica.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="op-button" onClick={() => chooseConsent('denied')}>Rechazar analítica</button>
            <button type="button" className="op-button" onClick={() => chooseConsent('granted')}>Aceptar analítica</button>
            {preferencesOpen && <button type="button" className="op-link" onClick={() => setPreferencesOpen(false)}>Cerrar</button>}
          </div>
        </aside>
      ) : (
        <div className="fixed bottom-3 left-3 z-40 max-w-xs rounded-xl border border-op-border bg-op-sheet px-3 shadow-flat">
          <button type="button" className="op-link text-xs" onClick={() => setPreferencesOpen(true)}>Preferencias de analítica</button>
          {sessionOnly && <p role="status" className="pb-2 text-xs text-op-muted">Tu navegador solo permite guardar esta decisión durante esta visita.</p>}
        </div>
      )}
    </>
  );
}
