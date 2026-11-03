import { useState, useEffect, ReactNode } from 'react';
import { 
  isCurrentLocationMalicious, 
  isCurrentClientSuspiciousOrBot, 
  runBrowserJsChallenge 
} from '../utils/securityGuard';

interface SecurityRouteGuardProps {
  children: ReactNode;
}

type BlockReason = 'malicious_path' | 'bot_user_agent' | 'js_challenge_failed' | null;

interface BlockedState {
  isBlocked: boolean;
  reason: BlockReason;
  detail?: string;
}

export function SecurityBlockedView({ reason, detail }: { reason: BlockReason; detail?: string }) {
  const isPath = reason === 'malicious_path';
  const isChallenge = reason === 'js_challenge_failed';
  const isBot = reason === 'bot_user_agent';

  useEffect(() => {
    // Ensure search engines do not index probe/blocked URLs
    document.title = isPath ? '404 - Stran ni bila najdena | Portalko' : '403 - Dostop zavrnjen | Portalko';
    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = 'noindex, nofollow, noarchive';
  }, [isPath]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-10 max-w-md w-full text-center">
        <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5 ${
          isPath ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
        }`}>
          {isPath ? 'Napaka 404' : isChallenge ? 'JS-Preizkus (403)' : 'Varnostna zaščita (403)'}
        </span>
        <div className="text-6xl font-black text-slate-900 leading-none mb-3 tracking-tight">
          {isPath ? '404' : '403'}
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {isPath 
            ? 'Stran ne obstaja' 
            : isChallenge 
              ? 'Zahtevano je izvajanje v standardnem brskalniku' 
              : 'Dostop za avtomatizirane odjemalce je omejen'}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          {isPath
            ? 'Iskani spletni naslov ne obstaja, je bil premaknjen ali pa je bil vnesen napačen URL.'
            : isChallenge
              ? 'Zahtevek je bil zavrnjen z varnostnim JS-challenge mehanizmom, ker odjemalec ne podpira standardnega izvajanja v brskalniku ali pa uporablja orodje za brezglavo avtomatizacijo (curl / headless bot).'
              : 'Zaznan je bil avtomatiziran spletni odjemalec, orodje za strganje ali neobičajen User-Agent podpis.'}
        </p>

        {detail && (
          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-2.5 mb-6 font-mono text-left break-all border border-slate-100">
            Diagnostika: {detail}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isChallenge ? (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-all cursor-pointer"
            >
              Ponovno preveri
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-all"
            >
              Nazaj na vstopno stran
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function evaluateSecurityState(): BlockedState {
  // 1. Path check
  if (isCurrentLocationMalicious()) {
    return { isBlocked: true, reason: 'malicious_path' };
  }

  // 2. User-Agent / Browser bot signature check
  if (isCurrentClientSuspiciousOrBot()) {
    return { isBlocked: true, reason: 'bot_user_agent' };
  }

  // 3. Lightweight JS-challenge verification
  const challenge = runBrowserJsChallenge();
  if (!challenge.passed) {
    return { 
      isBlocked: true, 
      reason: 'js_challenge_failed', 
      detail: challenge.reason 
    };
  }

  return { isBlocked: false, reason: null };
}

/**
 * Route-guard component that verifies incoming requests, User-Agent signatures,
 * and executes a lightweight JS-challenge at the entry level.
 * 
 * Drops raw curl, headless scrapers, and malicious scanner requests immediately
 * before any component logic, context providers, or database listeners are mounted.
 */
export function SecurityRouteGuard({ children }: SecurityRouteGuardProps) {
  const [state, setState] = useState<BlockedState>(() => evaluateSecurityState());

  useEffect(() => {
    const checkSecurity = () => {
      setState(evaluateSecurityState());
    };

    window.addEventListener('popstate', checkSecurity);
    window.addEventListener('hashchange', checkSecurity);

    return () => {
      window.removeEventListener('popstate', checkSecurity);
      window.removeEventListener('hashchange', checkSecurity);
    };
  }, []);

  if (state.isBlocked) {
    return <SecurityBlockedView reason={state.reason} detail={state.detail} />;
  }

  return <>{children}</>;
}
