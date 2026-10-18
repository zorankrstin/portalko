export interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export const COOKIE_CONSENT_KEY = 'portalko_cookie_consent_v1';
export const OPEN_COOKIE_SETTINGS_EVENT = 'portalko:open-cookie-settings';
export const COOKIE_CONSENT_CHANGED_EVENT = 'portalko:cookie-consent-changed';

const GA_MEASUREMENT_ID = 'G-DYZSLZ29C4';

/**
 * Reads stored cookie preferences from localStorage.
 */
export function getStoredCookieConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.necessary === true) {
      return {
        necessary: true,
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        timestamp: parsed.timestamp || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Napaka pri branju soglasja za piškotke:', err);
  }
  return null;
}

/**
 * Checks whether the user has already made a consent choice.
 */
export function hasUserAnsweredConsent(): boolean {
  return getStoredCookieConsent() !== null;
}

/**
 * Applies the cookie preferences to global scripts, Google Analytics, and ad services.
 */
export function applyConsentToServices(prefs: CookiePreferences): void {
  if (typeof window === 'undefined') return;

  // Google Analytics Consent Mode / Disabling
  const gaDisableKey = `ga-disable-${GA_MEASUREMENT_ID}`;
  if (!prefs.analytics) {
    (window as any)[gaDisableKey] = true;
  } else {
    (window as any)[gaDisableKey] = false;
  }

  // Update gtag consent state if gtag exists
  if (typeof (window as any).gtag === 'function') {
    try {
      (window as any).gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        ad_user_data: prefs.marketing ? 'granted' : 'denied',
        ad_personalization: prefs.marketing ? 'granted' : 'denied'
      });
    } catch {
      // Benign fallback
    }
  }

  // Dispatch custom event so React components can react in real time
  try {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: prefs }));
  } catch {}
}

/**
 * Saves specific cookie preferences to localStorage and updates services.
 */
export function saveCookieConsent(prefs: { analytics: boolean; marketing: boolean }): CookiePreferences {
  const fullPrefs: CookiePreferences = {
    necessary: true,
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullPrefs));
    } catch (err) {
      console.warn('Napaka pri shranjevanju soglasja za piškotke:', err);
    }
    applyConsentToServices(fullPrefs);
  }

  return fullPrefs;
}

/**
 * User accepts all cookies (necessary, analytics, marketing).
 */
export function acceptAllCookies(): CookiePreferences {
  return saveCookieConsent({
    analytics: true,
    marketing: true
  });
}

/**
 * User accepts only strictly necessary cookies, rejecting analytics and marketing.
 */
export function rejectNonEssentialCookies(): CookiePreferences {
  return saveCookieConsent({
    analytics: false,
    marketing: false
  });
}

/**
 * Dispatches an event to open the Cookie Settings modal from any link or button.
 */
export function openCookieSettingsModal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
