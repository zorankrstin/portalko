/**
 * Entry-Level Security Route Guard for Portalko
 * 
 * Verifies incoming paths and User-Agent headers to reject attempts to access known
 * malicious scanner targets (.env, wp-admin, etc.) or requests originating from
 * automated bots, scrapers, and suspicious non-human clients before they reach
 * any component logic, context providers, or database listeners.
 */

const MALICIOUS_PATH_PATTERNS: (string | RegExp)[] = [
  // 1. Environment & secret credentials
  /\.env(\.|$|\/)/i,
  /\/admin\/\.env/i,
  /\/backend\/\.env/i,
  /\/config\/\.env/i,

  // 2. Vite RSC / sourcemap extraction probes
  /__vite_rsc_findsourcemapurl/i,
  /\.map$/i,

  // 3. WordPress / CMS vulnerability scans (Portalko is React SPA, not WordPress)
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/wp-content/i,
  /\/wp-includes/i,
  /\/wp-json/i,
  /\/xmlrpc\.php/i,

  // 4. Version control repositories
  /\/\.git(\/|$)/i,
  /\/\.svn(\/|$)/i,
  /\/\.hg(\/|$)/i,

  // 5. Script execution probes (PHP, ASP, CGI, JSP)
  /\.php(\/|$|\?)/i,
  /\.aspx?(\/|$|\?)/i,
  /\.jsp(\/|$|\?)/i,
  /\.cgi(\/|$|\?)/i,

  // 6. Database and admin panels
  /phpmyadmin/i,
  /\/pma(\/|$)/i,
  /\/adminer/i,
  /\/mysql(\/|$)/i,

  // 7. Database dumps, backups, configuration files & logs
  /\.sql$/i,
  /\.bak$/i,
  /\.config$/i,
  /\.conf$/i,
  /\.ini$/i,
  /\.ya?ml$/i,
  /\.log$/i,

  // 8. Framework & router vulnerability probes
  /\/boaform/i,
  /\/cgi-bin/i,
  /\/actuator/i,
  /\/solr/i,
  /\/telescope/i,
  /\/vendor\//i,
  /\/autodiscover/i,
];

/**
 * Known bot, crawler, scanner, and headless automation User-Agent patterns.
 */
const SUSPICIOUS_BOT_UA_PATTERNS: (string | RegExp)[] = [
  // 1. Security vulnerability scanners & exploit engines
  /sqlmap/i,
  /nikto/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
  /acunetix/i,
  /nessus/i,
  /masscan/i,
  /zgrab/i,
  /nmap/i,
  /nuclei/i,
  /projectdiscovery/i,
  /shodan/i,
  /censys/i,
  /burpcollaborator/i,
  /openvas/i,

  // 2. Automated HTTP clients & scripting libraries (rarely legit human browsers)
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /httpx/i,
  /go-http-client/i,
  /libwww-perl/i,
  /okhttp/i,
  /apache-httpclient/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /postmanruntime/i,
  /insomnia\//i,
  /restsharp/i,
  /guzzlehttp/i,
  /java\/\d/i,
  /node-fetch/i,
  /axios\//i,

  // 3. Headless automation & test browsers
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /nightmare/i,
  /cypress/i,
  /webdriver/i,

  // 4. Aggressive AI scrapers & commercial data harvesters
  /gptbot/i,
  /chatgpt-user/i,
  /ccbot/i,
  /anthropic-ai/i,
  /claude-web/i,
  /claudebot/i,
  /bytespider/i,
  /petalbot/i,
  /amazonbot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /megaindex/i,
  /blexbot/i,
  /seekport/i,
  /dataforseo/i,
  /zoominfobot/i,

  // 5. Generic bot / spider tokens
  /bot\//i,
  /bot[\s;,\)]/i,
  /spider[\s;,\)]/i,
  /crawler[\s;,\)]/i,
  /crawling/i,
];

/**
 * Checks whether a given path or URL matches known malicious or scanner patterns.
 */
export function isMaliciousSecurityPath(pathname?: string, queryOrUrl?: string): boolean {
  const target = `${pathname || ''} ${queryOrUrl || ''}`.toLowerCase();
  if (!target.trim()) return false;

  for (const pattern of MALICIOUS_PATH_PATTERNS) {
    if (typeof pattern === 'string') {
      if (target.includes(pattern.toLowerCase())) {
        return true;
      }
    } else if (pattern.test(target)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a given User-Agent string matches known bot signatures,
 * automated scrapers, exploit tools, or suspicious non-human patterns.
 */
export function isSuspiciousBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== 'string') {
    // Missing User-Agent is inherently suspicious in HTTP requests
    return true;
  }

  const cleanUa = userAgent.trim();
  // Excessively short or placeholder UA strings
  if (cleanUa.length < 5 || cleanUa.toLowerCase() === 'user' || cleanUa.toLowerCase() === 'test') {
    return true;
  }

  for (const pattern of SUSPICIOUS_BOT_UA_PATTERNS) {
    if (typeof pattern === 'string') {
      if (cleanUa.toLowerCase().includes(pattern.toLowerCase())) {
        return true;
      }
    } else if (pattern.test(cleanUa)) {
      return true;
    }
  }

  return false;
}

/**
 * In-browser client detection: Checks User-Agent plus automation flags
 * (navigator.webdriver, legacy phantom/selenium globals).
 */
export function isCurrentClientSuspiciousOrBot(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  try {
    // 1. Explicit automated browser flag
    if (navigator.webdriver) {
      return true;
    }

    // 2. Headless/automation globals
    const win = window as any;
    if (win._phantom || win.__nightmare || win.callPhantom || win.__selenium_unwrapped) {
      return true;
    }

    // 3. Browser User-Agent header inspection
    const ua = navigator.userAgent;
    if (isSuspiciousBotUserAgent(ua)) {
      return true;
    }
  } catch {
    // Fallback to safe non-blocked state on detection errors
  }

  return false;
}

/**
 * Checks whether the current browser window location is on a blocked malicious path.
 */
export function isCurrentLocationMalicious(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const { pathname, search, hash } = window.location;
    return isMaliciousSecurityPath(pathname, `${search} ${hash}`);
  } catch {
    return false;
  }
}

export interface JsChallengeResult {
  passed: boolean;
  score: number;
  reason?: string;
  token?: string;
}

export const JS_CHALLENGE_STORAGE_KEY = 'ptk_js_challenge_passed_v1';
export const JS_CHALLENGE_COOKIE_NAME = 'ptk_js_passed';

/**
 * Lightweight in-browser JS Challenge.
 * Verifies that the requester supports standard browser execution (DOM layout calculation,
 * 2D canvas context, mathematical execution, event metrics) while detecting headless
 * automation flags (navigator.webdriver, headless globals, 0x0 screen).
 */
export function runBrowserJsChallenge(): JsChallengeResult {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { passed: false, score: 0, reason: 'Non-browser execution environment' };
  }

  // 1. Fast path: Challenge already solved and cached in current session
  try {
    const cached = sessionStorage.getItem(JS_CHALLENGE_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.passed && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
        return { passed: true, score: 100, token: parsed.token };
      }
    }
  } catch {}

  // 2. Headless automation & non-human checks
  try {
    if (navigator.webdriver) {
      return { passed: false, score: 0, reason: 'Automated browser detected (navigator.webdriver active)' };
    }

    const win = window as any;
    if (win._phantom || win.__nightmare || win.callPhantom || win.__selenium_unwrapped) {
      return { passed: false, score: 0, reason: 'Headless automation hooks detected' };
    }

    if (isSuspiciousBotUserAgent(navigator.userAgent)) {
      return { passed: false, score: 0, reason: 'Suspicious bot User-Agent signature' };
    }

    if (typeof screen !== 'undefined' && (screen.width === 0 || screen.height === 0)) {
      return { passed: false, score: 10, reason: 'Zero screen geometry' };
    }
  } catch {
    return { passed: false, score: 0, reason: 'Automation detection error' };
  }

  // 3. Execution capability challenge: DOM layout & Canvas verification
  try {
    // 3a. Mathematical evaluation check
    const mathCheck = Math.sin(Math.PI / 4) * Math.cos(Math.PI / 4);
    if (Math.abs(mathCheck - 0.5) > 1e-10) {
      return { passed: false, score: 20, reason: 'Math engine anomaly' };
    }

    // 3b. DOM layout & metric calculation check
    const testEl = document.createElement('div');
    testEl.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:120px;height:60px;visibility:hidden;';
    testEl.textContent = 'portalko-challenge';
    (document.body || document.documentElement).appendChild(testEl);
    const rect = testEl.getBoundingClientRect();
    const hasValidMetrics = rect.width >= 100 && rect.height >= 40;
    (document.body || document.documentElement).removeChild(testEl);

    if (!hasValidMetrics) {
      return { passed: false, score: 30, reason: 'DOM layout calculation failed' };
    }

    // 3c. 2D Canvas rendering capability
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { passed: false, score: 40, reason: 'Canvas 2D context unavailable' };
    }
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, 16, 16);
    const imgData = ctx.getImageData(0, 0, 1, 1).data;
    if (imgData[0] === 0 && imgData[1] === 0 && imgData[2] === 0 && imgData[3] === 0) {
      return { passed: false, score: 50, reason: 'Canvas rasterization failed' };
    }

    // 4. Generate verified session proof token
    const timestamp = Date.now();
    const rawProof = `${timestamp}:ptk:${Math.round(mathCheck * 1000)}:${rect.width}`;
    const token = typeof btoa === 'function' ? btoa(rawProof) : rawProof;

    // Cache to sessionStorage & cookie for same-origin requests
    try {
      sessionStorage.setItem(JS_CHALLENGE_STORAGE_KEY, JSON.stringify({ passed: true, timestamp, token }));
      document.cookie = `${JS_CHALLENGE_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax`;
    } catch {}

    return { passed: true, score: 100, token };
  } catch (err: any) {
    return { passed: false, score: 10, reason: `Challenge execution error: ${err?.message || 'unknown'}` };
  }
}

/**
 * Unified verification function for incoming HTTP requests (Express & Serverless).
 */
export function verifyIncomingRequestSecurity(
  targetPath?: string,
  urlOrQuery?: string,
  userAgent?: string | null,
  cookieHeader?: string | null,
  requireJsProof = false
): { allowed: boolean; status?: number; reason?: string } {
  // 1. Check path for scanner probes & secret credentials
  if (isMaliciousSecurityPath(targetPath, urlOrQuery)) {
    return {
      allowed: false,
      status: 404,
      reason: 'Malicious path probe detected',
    };
  }

  // 2. Check User-Agent header for bot signatures or non-human patterns
  if (isSuspiciousBotUserAgent(userAgent)) {
    return {
      allowed: false,
      status: 403,
      reason: 'Suspicious bot User-Agent signature detected',
    };
  }

  // 3. For protected endpoints: check if JS challenge cookie proof is present
  if (requireJsProof) {
    const hasJsCookie = cookieHeader && cookieHeader.includes(`${JS_CHALLENGE_COOKIE_NAME}=`);
    if (!hasJsCookie) {
      return {
        allowed: false,
        status: 403,
        reason: 'Missing browser JS-challenge execution proof (raw HTTP client)',
      };
    }
  }

  return { allowed: true };
}
