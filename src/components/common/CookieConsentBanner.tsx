import React, { useState, useEffect } from 'react';
import { 
  Cookie, 
  ShieldCheck, 
  Settings, 
  X, 
  Check, 
  SlidersHorizontal, 
  BarChart3, 
  Megaphone, 
  Lock,
  ExternalLink 
} from 'lucide-react';
import {
  getStoredCookieConsent,
  saveCookieConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  applyConsentToServices,
  OPEN_COOKIE_SETTINGS_EVENT,
  CookiePreferences
} from '../../services/cookieConsentService';

export function CookieConsentBanner() {
  const [hasAnswered, setHasAnswered] = useState<boolean>(true); // start true to prevent flicker on SSR/mount
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Preference state inside modal
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(true);
  const [marketingEnabled, setMarketingEnabled] = useState<boolean>(true);

  useEffect(() => {
    const stored = getStoredCookieConsent();
    if (!stored) {
      setHasAnswered(false);
    } else {
      setHasAnswered(true);
      setAnalyticsEnabled(stored.analytics);
      setMarketingEnabled(stored.marketing);
      // Ensure services match stored consent
      applyConsentToServices(stored);
    }

    // Listen to external request to open cookie preferences (e.g. from footer link)
    const handleOpenSettings = () => {
      const current = getStoredCookieConsent();
      if (current) {
        setAnalyticsEnabled(current.analytics);
        setMarketingEnabled(current.marketing);
      }
      setIsModalOpen(true);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenSettings);
    };
  }, []);

  // Keyboard shortcut: close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setAnalyticsEnabled(true);
    setMarketingEnabled(true);
    setHasAnswered(true);
    setIsModalOpen(false);
  };

  const handleRejectNonEssential = () => {
    rejectNonEssentialCookies();
    setAnalyticsEnabled(false);
    setMarketingEnabled(false);
    setHasAnswered(true);
    setIsModalOpen(false);
  };

  const handleSavePreferences = () => {
    saveCookieConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled
    });
    setHasAnswered(true);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* 1. Floating Bottom Banner (Shown only if user hasn't made a choice yet) */}
      {!hasAnswered && !isModalOpen && (
        <aside
          role="dialog"
          aria-live="polite"
          aria-label="Obvestilo o piškotkih"
          className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-6 md:left-auto md:right-6 md:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-surface-container-lowest/95 backdrop-blur-md border border-surface-container-high/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-on-surface">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface leading-snug">
                    Spoštujemo vašo zasebnost
                  </h3>
                  <p className="text-xs text-outline">Nastavitve piškotkov na Portalko.net</p>
                </div>
              </div>
            </div>

            {/* Explanation text */}
            <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Na spletnem mestu Portalko uporabljamo piškotke in sorodne tehnologije za nemoteno delovanje portala, analitiko obiska ter prikazovanje ustreznih ponudb in oglasov. Z izbiro »Sprejmi vse« soglašate z uporabo vseh piškotkov.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-primary hover:text-primary-hover hover:underline font-label-md text-xs sm:text-sm font-semibold flex items-center gap-1.5 py-1 px-1 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Prilagodi izbiro</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container border border-surface-container hover:border-surface-container-high transition-colors cursor-pointer"
                >
                  Samo nujni
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-primary bg-primary hover:bg-primary/90 shadow-xs transition-colors cursor-pointer"
                >
                  Sprejmi vse
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Detailed Cookie Settings Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
        >
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-surface-container/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="cookie-settings-title" className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                    Nastavitve piškotkov
                  </h2>
                  <p className="text-xs text-outline">Prilagodite svoje soglasje za piškotke</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                aria-label="Zapri nastavitve piškotkov"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content / Cookie Categories */}
            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-on-surface">
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Spoštujemo vašo pravico do zasebnosti. Tukaj lahko izberete, katere vrste piškotkov dovolite med brskanjem po portalu Portalko. Vašo izbiro lahko kadarkoli spremenite.
              </p>

              {/* Category 1: Strictly Necessary */}
              <div className="border border-surface-container/80 rounded-2xl p-4 bg-surface-container-lowest">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-title-sm text-sm font-bold text-on-surface">
                        Nujno potrebni piškotki
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Vedno aktivni
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 pt-1">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Zahtevano
                    </span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mt-2.5 leading-relaxed">
                  Ti piškotki so bistveni za pravilno delovanje portala, kot so varna prijava, ohranjanje seje, preprečevanje zlorab in shranjevanje vaših zaznamkov ter nastavitev zasebnosti. Teh piškotkov ni mogoče izklopiti.
                </p>
              </div>

              {/* Category 2: Analytics Cookies */}
              <div className="border border-surface-container/80 rounded-2xl p-4 bg-surface-container-lowest">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-title-sm text-sm font-bold text-on-surface">
                        Analitični piškotki
                      </h4>
                      <p className="text-[11px] text-outline">Statistika obiska in delovanja portala</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-on-surface-variant mt-2.5 leading-relaxed">
                  Omogočajo nam anonimno štetje obiskov in virov prometa (prek orodja Google Analytics 4), s čimer lahko merimo in izboljšujemo delovanje portala ter vam ponujamo bolj relevantne novice in vsebine.
                </p>
              </div>

              {/* Category 3: Marketing & Advertising Cookies */}
              <div className="border border-surface-container/80 rounded-2xl p-4 bg-surface-container-lowest">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-title-sm text-sm font-bold text-on-surface">
                        Trženjski in oglaševalski piškotki
                      </h4>
                      <p className="text-[11px] text-outline">Prilagojene promocije in oglasi</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={marketingEnabled}
                      onChange={(e) => setMarketingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <p className="text-xs text-on-surface-variant mt-2.5 leading-relaxed">
                  Uporabljajo se za prikazovanje promocijskih pasic, ugodnosti in oglasov, prilagojenih vašim zanimanjem, ter za preprečevanje prepogostega prikazovanja istih oglasov.
                </p>
              </div>

              {/* Legal Notice info */}
              <div className="flex items-center justify-between text-xs text-outline pt-1">
                <span>V skladu z zakonodajo ZEKom-2 in uredbo GDPR.</span>
                <span className="font-medium text-primary">Portalko.net</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-surface-container-low/70 border-t border-surface-container flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Zavrni nenujne
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Shrani mojo izbiro
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
                >
                  Sprejmi vse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
