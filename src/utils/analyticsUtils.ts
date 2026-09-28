/**
 * Google Analytics (gtag.js) Utility for Portalko
 * Measurement ID: G-DYZSLZ29C4
 * 
 * Guarantees Google Analytics code is present at the beginning of <head>
 * across every page, feed, and post in both SSR and client-side SPA navigation.
 */

export const GA_MEASUREMENT_ID = 'G-DYZSLZ29C4';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    __gaNavigationTrackerInitialized?: boolean;
  }
}

/**
 * Ensures the Google Analytics script tags are at the very beginning of the <head> tag.
 * Reorders them to the very top if any other element precedes them.
 */
export function ensureGoogleAnalyticsTag(): void {
  if (typeof document === 'undefined') return;

  // Initialize dataLayer and gtag function if missing
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  }

  // Find existing gtag external script
  let externalScript = document.querySelector<HTMLScriptElement>(
    `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
  );

  // Find existing inline script containing the gtag initialization
  let inlineScript = document.getElementById('ga-gtag-inline') as HTMLScriptElement | null;
  if (!inlineScript) {
    const scripts = Array.from(document.head.querySelectorAll('script'));
    inlineScript = scripts.find(s => s.textContent?.includes(`gtag('config', '${GA_MEASUREMENT_ID}')`)) || null;
  }

  if (!externalScript) {
    externalScript = document.createElement('script');
    externalScript.async = true;
    externalScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  }

  if (!inlineScript) {
    inlineScript = document.createElement('script');
    inlineScript.id = 'ga-gtag-inline';
    inlineScript.textContent = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_MEASUREMENT_ID}');
`;
  }

  // Ensure both are placed right at the beginning of <head>
  // Order: 1. externalScript, 2. inlineScript
  if (document.head.firstChild !== externalScript) {
    if (document.head.firstChild) {
      document.head.insertBefore(externalScript, document.head.firstChild);
    } else {
      document.head.appendChild(externalScript);
    }
  }

  if (externalScript.nextSibling !== inlineScript) {
    if (externalScript.nextSibling) {
      document.head.insertBefore(inlineScript, externalScript.nextSibling);
    } else {
      document.head.appendChild(inlineScript);
    }
  }
}

/**
 * Tracks a page view for Google Analytics across every feed, post, and page.
 * Sends updated page_path, page_title, and page_location to GA4.
 */
export function trackPageView(title?: string, path?: string, location?: string): void {
  if (typeof window === 'undefined') return;

  ensureGoogleAnalyticsTag();

  const currentPath = path || (window.location.pathname + window.location.search + window.location.hash);
  const currentTitle = title || document.title || 'Portalko';
  const currentLocation = location || window.location.href;

  if (typeof window.gtag === 'function') {
    // 1. Update config with the new virtual page
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: currentTitle,
      page_path: currentPath,
      page_location: currentLocation,
    });

    // 2. Explicitly dispatch a page_view event for GA4
    window.gtag('event', 'page_view', {
      page_title: currentTitle,
      page_path: currentPath,
      page_location: currentLocation,
    });
  }
}

/**
 * Sends custom events to Google Analytics (e.g. new post created, search, filter changed)
 */
export function trackEvent(eventName: string, eventParams: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;
  ensureGoogleAnalyticsTag();
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

/**
 * Initializes global navigation tracking for Single Page Application routing.
 * Automatically catches pushState, replaceState, popstate, and hashchange so no
 * feed switch, post navigation, or subcategory filtering is missed by Google Analytics.
 */
export function initAnalyticsNavigationTracker(): void {
  if (typeof window === 'undefined' || window.__gaNavigationTrackerInitialized) return;
  window.__gaNavigationTrackerInitialized = true;

  ensureGoogleAnalyticsTag();

  const handleNavChange = () => {
    // Small timeout to allow React to update document.title and URL if in transit
    setTimeout(() => {
      ensureGoogleAnalyticsTag();
      trackPageView(
        document.title,
        window.location.pathname + window.location.search + window.location.hash,
        window.location.href
      );
    }, 50);
  };

  // Monkey-patch history.pushState
  const originalPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    const res = originalPushState.apply(this, args);
    handleNavChange();
    return res;
  };

  // Monkey-patch history.replaceState
  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const res = originalReplaceState.apply(this, args);
    handleNavChange();
    return res;
  };

  window.addEventListener('popstate', handleNavChange);
  window.addEventListener('hashchange', handleNavChange);
}
