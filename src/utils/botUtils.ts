/**
 * Utility to identify automated web scrapers, vulnerability scanners, and bots.
 * Used to avoid opening expensive Firestore real-time listeners and to keep analytics clean.
 */

const KNOWN_BOT_SIGNATURES = [
  'bot',
  'spider',
  'crawler',
  'crawling',
  'headlesschrome',
  'lighthouse',
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'semrush',
  'ahrefs',
  'mj12bot',
  'dotbot',
  'petalbot',
  'bytespider',
  'mediapartners-google',
  'feedfetcher-google',
  'slurp',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'applebot',
  'duckduckbot',
  'phantomjs',
  'selenium',
  'puppeteer',
  'playwright',
  'screaming frog',
  'uptimerobot',
  'archive.org_bot',
  'gptbot',
  'chatgpt',
  'ccbot',
  'anthropic-ai',
  'claudebot',
];

export function isLikelyBot(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  try {
    // 1. Standard automated browser indicator
    if (navigator.webdriver) {
      return true;
    }

    // 2. Legacy headless automation properties
    const win = window as any;
    if (win._phantom || win.__nightmare || win.callPhantom || win.__selenium_unwrapped) {
      return true;
    }

    // 3. User-Agent inspection
    const ua = (navigator.userAgent || '').toLowerCase();
    for (const sig of KNOWN_BOT_SIGNATURES) {
      if (ua.includes(sig)) {
        return true;
      }
    }
  } catch {
    // Fall back to treating as normal user on errors
  }

  return false;
}
