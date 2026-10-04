import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LogIn, UserPlus, Shield, Check, AlertCircle, UserCheck, User, Eye, EyeOff, Sparkles, Mail, Send, RefreshCw, ExternalLink, ArrowLeft, Copy } from 'lucide-react';
import { useAuth, Role } from '../contexts/AuthContext';
import { GoogleAuthButton } from './GoogleAuthButton';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function LoginModal({ isOpen, onClose, initialMode = 'login' }: LoginModalProps) {
  const { loginWithCredentials, register, resendVerificationEmail, confirmEmailWithToken, users } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [unverifiedLoginEmail, setUnverifiedLoginEmail] = useState('');

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Verification pending state
  const [verificationPending, setVerificationPending] = useState<{
    email: string;
    name: string;
    confirmationUrl?: string;
    emailSent?: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync mode with initialMode prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setVerificationPending(null);
      setUnverifiedLoginEmail('');
      setResendFeedback('');
    }
  }, [isOpen, initialMode]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setUnverifiedLoginEmail('');

    const res = loginWithCredentials(loginEmail, loginPassword);
    if (!res.success) {
      setErrorMsg(res.error || 'Neuspešna prijava. Preverite vnesene podatke.');
      if (res.requiresVerification) {
        setUnverifiedLoginEmail(loginEmail.trim());
      }
      return;
    }

    setSuccessMsg(`Uspešno prijavljeni kot ${res.user?.name} (${res.user?.role})!`);
    setTimeout(() => {
      onClose();
      setLoginEmail('');
      setLoginPassword('');
      setSuccessMsg('');
    }, 600);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: 'registered',
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Prišlo je do napake pri registraciji.');
        if (res.requiresVerification && res.user) {
          setUnverifiedLoginEmail(res.user.email);
        }
        setIsSubmitting(false);
        return;
      }

      if (res.requiresVerification) {
        setVerificationPending({
          email: regEmail,
          name: regName,
          confirmationUrl: res.confirmationUrl,
          emailSent: res.emailSent,
        });
        setRegPassword('');
      } else {
        setSuccessMsg(`Račun za ${res.user?.name} uspešno ustvarjen! Prijavljeni ste.`);
        setTimeout(() => {
          onClose();
          setRegName('');
          setRegEmail('');
          setRegPassword('');
          setSuccessMsg('');
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Prišlo je do napake pri registraciji.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async (targetEmail: string) => {
    setIsResending(true);
    setResendFeedback('');
    setErrorMsg('');

    try {
      const res = await resendVerificationEmail(targetEmail);
      if (res.success) {
        setResendFeedback('Potrditveno sporočilo iz noreply@portalko.net je bilo ponovno poslano!');
        if (res.confirmationUrl && verificationPending) {
          setVerificationPending(prev => prev ? { ...prev, confirmationUrl: res.confirmationUrl } : prev);
        }
      } else {
        setErrorMsg(res.error || 'Napaka pri ponovnem pošiljanju potrditvene e-pošte.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Napaka pri pošiljanju potrditvene e-pošte.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDirectConfirmSimulation = async (confirmationUrl?: string) => {
    if (!confirmationUrl) return;
    try {
      const url = new URL(confirmationUrl);
      const token = url.searchParams.get('verify-email');
      const email = url.searchParams.get('email') || verificationPending?.email;
      if (token) {
        const res = await confirmEmailWithToken(token, email);
        if (res.success) {
          setSuccessMsg(`E-pošta uspešno potrjena! Dobrodošli, ${res.user?.name}!`);
          setTimeout(() => {
            onClose();
            setVerificationPending(null);
            setSuccessMsg('');
          }, 800);
        } else {
          setErrorMsg(res.error || 'Potrditev ni uspela.');
        }
      }
    } catch (e: any) {
      setErrorMsg('Napaka pri odpiranju potrditvene povezave.');
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" 
      onClick={onClose}
    >
      <div 
        className="my-auto w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] border border-surface-container/70 overflow-hidden animate-in fade-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Fixed at top */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-surface-container-low bg-surface-container-lowest">
          <div className="flex items-center gap-2.5">
            <img src="https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg" alt="Portalko.net" className="w-8 h-8 rounded-lg object-contain shadow-2xs" />
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-1.5">
                <span className="text-primary font-black">Portalko</span>
                <span className="text-outline font-normal text-xs">•</span>
                <span className="text-xs font-semibold text-on-surface-variant">
                  {mode === 'login' ? 'Prijava v račun' : 'Registracija novega računa'}
                </span>
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
            title="Zapri"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher - Fixed below header */}
        <div className="shrink-0 flex border-b border-surface-container-low bg-surface-container-lowest">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-center font-label-md text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/40'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Prijava</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-center font-label-md text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/40'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registracija</span>
          </button>
        </div>

        {/* Content area - Scrollable with accessible sizing */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex flex-col gap-2.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-error" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
              {unverifiedLoginEmail && (
                <div className="mt-1 pt-2.5 border-t border-error/20 flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => handleResendVerification(unverifiedLoginEmail)}
                    disabled={isResending}
                    className="px-3 py-1.5 rounded-lg bg-error/15 hover:bg-error/25 text-error font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>Ponovno pošlji potrditveno e-pošto</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const targetUser = users.find(u => u.email.toLowerCase() === unverifiedLoginEmail.toLowerCase());
                      if (targetUser && targetUser.verificationToken) {
                        const confirmRes = await confirmEmailWithToken(targetUser.verificationToken, targetUser.email);
                        if (confirmRes.success) {
                          setSuccessMsg(`Račun uspešno potrjen! Dobrodošli, ${confirmRes.user?.name}!`);
                          setErrorMsg('');
                          setUnverifiedLoginEmail('');
                          setTimeout(() => { onClose(); setSuccessMsg(''); }, 800);
                        }
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary-hover"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aktiviraj račun in se prijavi</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {verificationPending ? (
            <div className="flex flex-col items-center text-center py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-sm relative">
                <Mail className="w-8 h-8 text-primary" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/20">
                <Send className="w-3.5 h-3.5" />
                <span>Noreply potrditveno sporočilo poslano</span>
              </div>

              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Preverite vaš e-poštni predal
              </h3>

              <p className="font-body-md text-sm text-on-surface-variant max-w-sm mb-4 leading-relaxed">
                Na naslov <strong className="text-on-surface font-semibold">{verificationPending.email}</strong> smo poslali potrditveno sporočilo iz <strong className="text-primary font-semibold">noreply@portalko.net</strong>. Za dokončanje registracije in aktivacijo računa kliknite na potrditveno povezavo v sporočilu.
              </p>

              {/* Step by step instructions */}
              <div className="w-full text-left bg-surface-container-low rounded-xl p-3.5 border border-surface-container mb-4 text-xs text-on-surface-variant space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Odprite vaš e-poštni predal (preverite tudi mapo z vsiljeno pošto / <em>Spam</em>).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Poiščite sporočilo pošiljatelja <strong>noreply@portalko.net</strong> z zadevo <strong>»Potrdite svoj račun na Portalko.net«</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Kliknite na vijolični gumb <strong>»Potrdi moj račun«</strong> in vaš račun bo aktiviran.</span>
                </div>
              </div>

              {resendFeedback && (
                <div className="w-full mb-3 p-2.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{resendFeedback}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="w-full flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={isResending}
                  onClick={() => handleResendVerification(verificationPending.email)}
                  className="w-full py-2.5 rounded-xl border border-surface-container hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'Pošiljanje novega sporočila...' : 'Ponovno pošlji potrditveno povezavo'}</span>
                </button>

                {verificationPending.confirmationUrl && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-left mt-1 space-y-2">
                    <p className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span>Neposredna aktivacija računa:</span>
                    </p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Če e-poštno sporočilo zamuja ali je bilo zadržano s strani ponudnika pošte, lahko vaš račun takoj aktivirate s klikom na spodnji gumb:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDirectConfirmSimulation(verificationPending.confirmationUrl)}
                        className="flex-1 py-2.5 px-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aktiviraj račun zdaj</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (verificationPending.confirmationUrl) {
                            navigator.clipboard.writeText(verificationPending.confirmationUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2500);
                          }
                        }}
                        className="py-2.5 px-3 rounded-lg border border-surface-container hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Kopiraj povezavo za potrditev"
                      >
                        <Copy className="w-3.5 h-3.5 text-outline" />
                        <span>{copiedLink ? 'Kopirano!' : 'Kopiraj povezavo'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setVerificationPending(null);
                    setMode('login');
                    setLoginEmail(verificationPending.email);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Že potrjeno? Nadaljuj na prijavo</span>
                </button>
              </div>
            </div>
          ) : mode === 'login' ? (
            <div className="flex flex-col gap-4">
              {/* Google Sign-in Option */}
              <div className="flex flex-col gap-2">
                <GoogleAuthButton
                  mode="login"
                  onSuccess={(user, isNewUser) => {
                    setSuccessMsg(`Prijavljeni z Google računom kot ${user.name} (${user.role})!`);
                    setTimeout(() => {
                      onClose();
                      setSuccessMsg('');
                    }, 600);
                  }}
                  onError={msg => setErrorMsg(msg)}
                />
                
                <div className="flex items-center gap-3 my-1">
                  <div className="h-px flex-1 bg-surface-container" />
                  <span className="text-[11px] text-outline font-medium">ali z e-pošto in geslom</span>
                  <div className="h-px flex-1 bg-surface-container" />
                </div>
              </div>

              {/* Prompt to resend verification email if login failed due to unverified email */}
              {unverifiedLoginEmail && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-primary">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>Potrditveno sporočilo ni prispelo?</span>
                  </div>
                  <p className="text-on-surface-variant text-[11px]">
                    Za aktivacijo računa <strong>{unverifiedLoginEmail}</strong> morate klikniti na povezavo v prejeti noreply pošti.
                  </p>
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={() => handleResendVerification(unverifiedLoginEmail)}
                    className="self-start py-1.5 px-3 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Pošiljanje...' : 'Ponovno pošlji potrditveno e-pošto'}</span>
                  </button>
                </div>
              )}

              {/* Real Email & Password Login Form */}
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-xs font-semibold text-on-surface">
                    E-poštni naslov
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Vnesite vaš e-poštni naslov"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-xs font-semibold text-on-surface">
                      Geslo
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="Vnesite vaše geslo"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Prijavi se</span>
                </button>
              </form>

              <div className="pt-2 text-center">
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Še nimate računa?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); setVerificationPending(null); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Registrirajte se tukaj
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Google Registration Option */}
              <div className="flex flex-col gap-2">
                <GoogleAuthButton
                  mode="register"
                  selectedRole="registered"
                  onSuccess={(user, isNewUser) => {
                    if (isNewUser) {
                      setSuccessMsg(`Google račun uspešno registriran kot ${user.name}! Prijavljeni ste.`);
                    } else {
                      setSuccessMsg(`Prijavljeni z obstoječim Google računom kot ${user.name}!`);
                    }
                    setTimeout(() => {
                      onClose();
                      setSuccessMsg('');
                    }, 800);
                  }}
                  onError={msg => setErrorMsg(msg)}
                />
                
                <div className="flex items-center gap-3 my-1">
                  <div className="h-px flex-1 bg-surface-container" />
                  <span className="text-[11px] text-outline font-medium">ali z registracijskim obrazcem</span>
                  <div className="h-px flex-1 bg-surface-container" />
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-xs font-semibold text-on-surface">
                  Ime in priimek <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="npr. Ana Novak"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-xs font-semibold text-on-surface">
                  E-poštni naslov <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="npr. ana.novak@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-xs font-semibold text-on-surface">
                    Geslo <span className="text-error">*</span>
                  </label>
                  <span className="text-[10px] text-outline">Vsaj 6 znakov</span>
                </div>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ustvarite geslo"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                    tabIndex={-1}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pošiljanje potrditvenega sporočila...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Ustvari račun in pošlji potrditev</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Že imate račun?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); setVerificationPending(null); }}
                    className="text-primary font-bold hover:underline"
                  >
                    Prijavite se
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
}
