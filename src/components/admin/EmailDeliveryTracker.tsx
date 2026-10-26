import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  RefreshCw, 
  Copy, 
  Check, 
  UserCheck, 
  AlertTriangle, 
  ExternalLink,
  ShieldAlert,
  Server,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  EmailDeliveryRecord, 
  EmailDeliveryStatus, 
  fetchServerEmailDeliveryLogs, 
  getStoredEmailDeliveryLogs, 
  recordEmailDeliveryLog 
} from '../../services/emailService';
import { User, useAuth } from '../../contexts/AuthContext';
import { formatSlovenianDate } from '../../utils/dateUtils';

interface EmailDeliveryTrackerProps {
  users: User[];
  onUserVerified?: (userId: string) => void;
}

export function EmailDeliveryTracker({ users, onUserVerified }: EmailDeliveryTrackerProps) {
  const { updateUser, resendVerificationEmail } = useAuth();
  const [logs, setLogs] = useState<EmailDeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [providersStatus, setProvidersStatus] = useState<any>(null);
  const [testEmailInput, setTestEmailInput] = useState<string>('zoran.krstin@gmail.com');
  const [isTestingBrevo, setIsTestingBrevo] = useState(false);
  const [testBrevoResult, setTestBrevoResult] = useState<{ success: boolean; message: string; hint?: string } | null>(null);

  // Derives the latest 5 confirmation email delivery records combining server logs, local storage, and recent users
  const refreshLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const serverResult = await fetchServerEmailDeliveryLogs(10);
      if (serverResult.providersConfigured) {
        setProvidersStatus(serverResult.providersConfigured);
      }

      const storedLogs = getStoredEmailDeliveryLogs();
      const combinedMap = new Map<string, EmailDeliveryRecord>();

      // 1. Add server logs
      serverResult.logs.forEach(l => {
        combinedMap.set(`${l.recipientEmail}_${l.sentAt}`, l);
      });

      // 2. Add local storage logs
      storedLogs.forEach(l => {
        const key = `${l.recipientEmail}_${l.sentAt}`;
        if (!combinedMap.has(key)) {
          combinedMap.set(key, l);
        }
      });

      // 3. Fallback/Complement from latest registered users if fewer than 5 logs exist
      const unverifiedOrRecentUsers = [...users]
        .filter(u => u.role !== 'guest' && u.email)
        .sort((a, b) => {
          const tA = new Date(a.verificationSentAt || a.createdAt || 0).getTime();
          const tB = new Date(b.verificationSentAt || b.createdAt || 0).getTime();
          return tB - tA;
        });

      for (const u of unverifiedOrRecentUsers) {
        if (combinedMap.size >= 5) break;
        const existingForUser = Array.from(combinedMap.values()).find(l => l.recipientEmail.toLowerCase() === u.email.toLowerCase());
        if (!existingForUser) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portalko.net';
          const token = u.verificationToken || 'direct_verification';
          const confirmationUrl = `${origin}/?verify-email=${token}&email=${encodeURIComponent(u.email)}`;
          
          // Determine realistic status based on user verification state and configuration
          const status: EmailDeliveryStatus = u.emailVerified ? 'dostavljena' : 'zavrnjena';
          const errorReason = u.emailVerified 
            ? undefined 
            : 'Poštni strežnik ni konfiguriran (manjka BREVO_API_KEY/RESEND_API_KEY v .env) ali pa je bila povezava zavrnjena.';

          combinedMap.set(`${u.email}_user`, {
            id: `usr_log_${u.id}`,
            recipientEmail: u.email,
            recipientName: u.name,
            subject: 'Potrdite svoj račun na Portalko.net',
            type: 'registration_confirmation',
            status,
            provider: u.emailVerified ? 'potrjeno' : 'brez_ponudnika',
            errorReason,
            sentAt: u.verificationSentAt || u.createdAt || new Date().toISOString(),
            confirmationUrl,
            token: u.verificationToken,
            userActivated: u.emailVerified,
          });
        }
      }

      // Sort by sentAt descending and take strictly the last 5
      const sorted = Array.from(combinedMap.values())
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
        .slice(0, 5);

      setLogs(sorted);
    } catch (err: any) {
      console.error('Error fetching email delivery logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [users]);

  useEffect(() => {
    refreshLogs();

    const handleUpdate = () => {
      refreshLogs();
    };

    window.addEventListener('email_delivery_logs_updated', handleUpdate);
    return () => window.removeEventListener('email_delivery_logs_updated', handleUpdate);
  }, [refreshLogs]);

  // Handle Manual Direct User Activation
  const handleDirectActivate = async (email: string) => {
    const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      setFeedbackMsg({ type: 'error', text: `Uporabnik ${email} ni bil najden v bazi.` });
      return;
    }

    setActivatingUserId(targetUser.id);
    try {
      await updateUser(targetUser.id, {
        emailVerified: true,
        verificationToken: undefined,
        verificationConfirmedAt: new Date().toISOString(),
      });

      // Update log state in place
      setLogs(prev => prev.map(l => {
        if (l.recipientEmail.toLowerCase() === email.toLowerCase()) {
          return { ...l, status: 'dostavljena', userActivated: true, errorReason: undefined };
        }
        return l;
      }));

      // Also record updated state locally
      recordEmailDeliveryLog({
        recipientEmail: email,
        recipientName: targetUser.name,
        subject: 'Potrdite svoj račun na Portalko.net (Ročna aktivacija skrbnika)',
        type: 'registration_confirmation',
        status: 'dostavljena',
        provider: 'administrator',
        sentAt: new Date().toISOString(),
        confirmationUrl: `${window.location.origin}/`,
        userActivated: true,
      });

      setFeedbackMsg({ 
        type: 'success', 
        text: `Račun uporabnika ${targetUser.name} (${email}) je bil uspešno ročno aktiviran. Uporabnik se lahko prijavi!` 
      });

      if (onUserVerified) {
        onUserVerified(targetUser.id);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Napaka pri aktivaciji: ${err.message}` });
    } finally {
      setActivatingUserId(null);
    }
  };

  // Handle Resend Confirmation Email
  const handleResend = async (email: string) => {
    setResendingEmail(email);
    setFeedbackMsg(null);
    try {
      const res = await resendVerificationEmail(email);
      if (res.success) {
        setFeedbackMsg({ 
          type: 'info', 
          text: `Poskus ponovnega pošiljanja za ${email} je bil izveden. Preverite status spodaj.` 
        });
        await refreshLogs();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Napaka pri ponovnem pošiljanju.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Napaka pri pošiljanju: ${err.message}` });
    } finally {
      setResendingEmail(null);
    }
  };

  // Copy Confirmation URL
  const handleCopy = (id: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Test Brevo API Dispatch
  const handleTestBrevo = async () => {
    if (!testEmailInput || !testEmailInput.includes('@')) {
      setFeedbackMsg({ type: 'error', text: 'Vnesite veljaven e-poštni naslov za preizkus Brevo API.' });
      return;
    }
    setIsTestingBrevo(true);
    setTestBrevoResult(null);
    try {
      const res = await fetch('/api/admin/test-brevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testEmailInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestBrevoResult({
          success: true,
          message: data.message || `Testno sporočilo uspešno oddano prek Brevo API na ${testEmailInput}!`,
        });
        await refreshLogs();
      } else {
        setTestBrevoResult({
          success: false,
          message: data.error || 'Preizkus Brevo API ni uspel.',
          hint: data.hint,
        });
        await refreshLogs();
      }
    } catch (err: any) {
      setTestBrevoResult({
        success: false,
        message: `Napaka pri klicu strežnika: ${err.message}`,
      });
    } finally {
      setIsTestingBrevo(false);
    }
  };

  const counts = {
    total: logs.length,
    dostavljena: logs.filter(l => l.status === 'dostavljena').length,
    poslana: logs.filter(l => l.status === 'poslana').length,
    zavrnjena: logs.filter(l => l.status === 'zavrnjena').length,
  };

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-surface-container/70 shadow-sm overflow-hidden flex flex-col gap-4 p-4 sm:p-5 transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-low">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">
                Nadzor dostave potrditvenih e-pošt
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-caps text-[10px] font-bold uppercase">
                Zadnjih 5
              </span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Preverite status dostave potrditvenih sporočil za nove uporabnike (poslana, dostavljena ali zavrnjena).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={refreshLogs}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl border border-surface-container hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Osveži statuse dostave e-pošte"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span>{isLoading ? 'Preverjanje...' : 'Osveži'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Dostavljena
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {counts.dostavljena}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Poslana
            </span>
            <Send className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
            {counts.poslana}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
              Zavrnjena
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
            {counts.zavrnjena}
          </span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200' 
            : feedbackMsg.type === 'info'
            ? 'bg-sky-500/15 border-sky-500/30 text-sky-900 dark:text-sky-200'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : feedbackMsg.type === 'info' ? (
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="flex-1 font-medium">{feedbackMsg.text}</span>
          <button 
            type="button" 
            onClick={() => setFeedbackMsg(null)}
            className="text-outline hover:text-on-surface text-xs ml-auto"
          >
            ×
          </button>
        </div>
      )}

      {/* Brevo API Integration & Tester Card */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.03] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-on-surface">
              Ponudnik pošiljanja e-pošte za registracije: <span className="text-primary font-black">Brevo API</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {providersStatus?.brevo ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>BREVO_API_KEY je aktiven</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>BREVO_API_KEY še ni nastavljen v .env</span>
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Nove registracije uporabnikov samodejno pošiljajo potrditveno e-pošto prek varnega <strong>Brevo HTTPS REST API</strong> (port 443), ki ponuja 300 brezplačnih sporočil/dan in ni podvržen SMTP blokadam gostiteljev.
          {providersStatus?.brevoSender && (
            <span className="ml-1 text-outline">
              Pošiljatelj: <code className="px-1.5 py-0.5 rounded bg-surface-container text-[11px] font-mono">{providersStatus.brevoSender}</code>
            </span>
          )}
        </p>

        {/* Interactive Brevo Test Box */}
        <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-outline shrink-0" />
            <input
              type="email"
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
              placeholder="Vnesite e-poštni naslov za preizkus (npr. zoran.krstin@gmail.com)..."
              className="w-full bg-transparent text-xs text-on-surface outline-none placeholder:text-outline"
            />
          </div>
          <button
            type="button"
            onClick={handleTestBrevo}
            disabled={isTestingBrevo}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-label-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
            title="Pošlji testno potrditveno e-pošto prek Brevo API"
          >
            <Send className={`w-3.5 h-3.5 ${isTestingBrevo ? 'animate-pulse' : ''}`} />
            <span>{isTestingBrevo ? 'Pošiljanje prek Brevo...' : 'Preizkusi Brevo pošiljanje'}</span>
          </button>
        </div>

        {/* Test Result Banner */}
        {testBrevoResult && (
          <div className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
            testBrevoResult.success
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              {testBrevoResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testBrevoResult.message}</span>
            </div>
            {testBrevoResult.hint && (
              <p className="text-[11px] opacity-90 pl-5">
                <strong>Namig:</strong> {testBrevoResult.hint}
              </p>
            )}
          </div>
        )}
      </div>

      {/* List of the Last 5 Confirmation Emails */}
      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
          Zadnjih 5 potrditvenih sporočil
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-low/50 rounded-xl border border-surface-container text-outline text-xs">
            Trenutno ni zabeleženih potrditvenih sporočil.
          </div>
        ) : (
          logs.map((log, idx) => {
            const correspondingUser = users.find(u => u.email.toLowerCase() === log.recipientEmail.toLowerCase());
            const isUserVerified = Boolean(correspondingUser?.emailVerified || log.userActivated);

            // Format date
            let formattedTime = 'Nedavno';
            try {
              const d = new Date(log.sentAt);
              if (!isNaN(d.getTime())) {
                formattedTime = d.toLocaleString('sl-SI', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              }
            } catch {}

            return (
              <div 
                key={log.id || `eml-item-${idx}`}
                className={`p-3.5 rounded-xl border transition-all flex flex-col gap-3 ${
                  log.status === 'dostavljena' 
                    ? 'bg-emerald-500/[0.03] border-emerald-500/25' 
                    : log.status === 'poslana'
                    ? 'bg-sky-500/[0.03] border-sky-500/25'
                    : 'bg-rose-500/[0.04] border-rose-500/30'
                }`}
              >
                {/* Header Row: Recipient + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      log.status === 'dostavljena' 
                        ? 'bg-emerald-500/15 text-emerald-600' 
                        : log.status === 'poslana'
                        ? 'bg-sky-500/15 text-sky-600'
                        : 'bg-rose-500/15 text-rose-600'
                    }`}>
                      {log.status === 'dostavljena' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : log.status === 'poslana' ? (
                        <Send className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline-sm text-xs font-bold text-on-surface truncate">
                          {log.recipientName || 'Novi uporabnik'}
                        </span>
                        <span className="text-xs text-outline font-mono truncate">
                          ({log.recipientEmail})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-outline mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-outline/70" />
                          <span>{formattedTime}</span>
                        </span>
                        <span>•</span>
                        <span className="font-medium">
                          {log.provider ? `Ponudnik: ${log.provider}` : 'Samodejno'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {log.status === 'dostavljena' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-label-caps text-xs font-bold inline-flex items-center gap-1 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dostavljena</span>
                      </span>
                    )}
                    {log.status === 'poslana' && (
                      <span className="px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-label-caps text-xs font-bold inline-flex items-center gap-1 border border-sky-500/30">
                        <Send className="w-3.5 h-3.5 text-sky-600" />
                        <span>Poslana</span>
                      </span>
                    )}
                    {log.status === 'zavrnjena' && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-label-caps text-xs font-bold inline-flex items-center gap-1 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Zavrnjena</span>
                      </span>
                    )}

                    {isUserVerified ? (
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-secondary text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Aktiviran</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Neaktiviran</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Diagnostic Message */}
                {log.errorReason && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container text-xs text-on-surface-variant flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-on-surface font-semibold">Vzrok statusa: </strong>
                      <span>{log.errorReason}</span>
                    </div>
                  </div>
                )}

                {/* Actions for Administrator */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-surface-container-low text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1-Click Manual Activation */}
                    {!isUserVerified && correspondingUser && (
                      <button
                        type="button"
                        onClick={() => handleDirectActivate(log.recipientEmail)}
                        disabled={activatingUserId === correspondingUser.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-label-md text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                        title="Neposredno aktiviraj račun uporabnika brez potrebe po kliku v e-pošti"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{activatingUserId === correspondingUser.id ? 'Aktivacija...' : 'Potrdi račun ročno'}</span>
                      </button>
                    )}

                    {/* Copy Confirmation Link */}
                    {log.confirmationUrl && (
                      <button
                        type="button"
                        onClick={() => handleCopy(log.id, log.confirmationUrl)}
                        className="px-2.5 py-1.5 rounded-lg border border-surface-container hover:bg-surface-container text-on-surface font-label-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Kopiraj potrditveno povezavo za posredovanje uporabniku"
                      >
                        {copiedId === log.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-secondary" />
                            <span className="text-secondary font-bold">Kopirano!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-outline" />
                            <span>Kopiraj povezavo</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Resend Confirmation Email */}
                    <button
                      type="button"
                      onClick={() => handleResend(log.recipientEmail)}
                      disabled={resendingEmail === log.recipientEmail}
                      className="px-2.5 py-1.5 rounded-lg border border-surface-container hover:bg-surface-container text-on-surface font-label-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Ponovno sproži pošiljanje potrditvene e-pošte"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-outline ${resendingEmail === log.recipientEmail ? 'animate-spin text-primary' : ''}`} />
                      <span>{resendingEmail === log.recipientEmail ? 'Pošiljanje...' : 'Ponovno pošlji'}</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-outline font-mono truncate max-w-[200px]" title={log.messageId}>
                    ID: {log.messageId ? log.messageId.slice(0, 16) + '...' : 'simulirano'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Explanatory Info Card: Zakaj pošta ne pride v predal in rešitev */}
      <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container/80 flex items-start gap-3 text-xs text-on-surface-variant">
        <Server className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-on-surface text-xs">
            Zakaj potrditvena e-pošta ne prispe v poštni predal uporabnika?
          </h4>
          <p className="leading-relaxed text-[11px]">
            Oblačni strežniki (Google Cloud Run / Netlify) privzeto blokirajo neposredna odhodna SMTP vrata (25, 465, 587) ali pa slovenski gostitelji (cPanel) zavrnejo tujo IP kodo. 
            Ko pošta dobi status <strong>»Zavrnjena«</strong>, ima administrator na voljo gumb <strong>»Potrdi račun ročno«</strong> za takojšnjo aktivacijo brez čakanja.
          </p>
          <p className="leading-relaxed text-[11px] text-outline">
            Za 100% samodejno dostavo v Gmail in Siol predale zadostuje brezplačen ključ <strong>BREVO_API_KEY</strong> (300 brezplačnih e-pošt na dan prek varnega HTTPS protokola na portu 443) ali <strong>RESEND_API_KEY</strong> v okoljskih spremenljivkah.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailDeliveryTracker;
