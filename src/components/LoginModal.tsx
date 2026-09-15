import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LogIn, UserPlus, Shield, Check, AlertCircle, Crown, UserCheck, User, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import { useAuth, Role } from '../contexts/AuthContext';
import { GoogleAuthButton } from './GoogleAuthButton';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function LoginModal({ isOpen, onClose, initialMode = 'login' }: LoginModalProps) {
  const { users, loginWithCredentials, loginById, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<Role>('registered');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync mode with initialMode prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
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

    const res = loginWithCredentials(loginEmail, loginPassword);
    if (!res.success) {
      setErrorMsg(res.error || 'Neuspešna prijava. Preverite vnesene podatke.');
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

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = register({
      name: regName,
      email: regEmail,
      password: regPassword,
      role: regRole,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Prišlo je do napake pri registraciji.');
      return;
    }

    setSuccessMsg(`Račun za ${res.user?.name} (${res.user?.role}) uspešno ustvarjen! Prijavljeni ste.`);
    setTimeout(() => {
      onClose();
      // Reset form
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegRole('registered');
      setSuccessMsg('');
    }, 800);
  };

  const handleFillDemo = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMsg('');
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
            <img src="/portalko_logo.jpg" alt="Portalko" className="w-8 h-8 rounded-lg object-contain shadow-2xs" />
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
            <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
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

              {/* Real Email & Password Login Form */}
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-xs font-semibold text-on-surface">
                    E-poštni naslov
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="npr. zoran.krstin@gmail.com"
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

              {/* Quick test accounts / Demo accounts */}
              <div className="mt-1 pt-3 border-t border-surface-container-low">
                <button
                  type="button"
                  onClick={() => setShowQuickLogin(!showQuickLogin)}
                  className="w-full flex items-center justify-between text-xs text-on-surface-variant hover:text-primary font-semibold py-1.5 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    <span>Hitra prijava z obstoječimi računi (demo)</span>
                  </span>
                  <span className="text-[11px] text-outline font-normal">
                    {showQuickLogin ? 'Skrij' : 'Pokaži'}
                  </span>
                </button>

                {showQuickLogin && (
                  <div className="mt-2.5 flex flex-col gap-2 animate-in fade-in duration-200">
                    <p className="text-[11px] text-outline mb-0.5">
                      Kliknite račun za samodejno izpolnitev ali takojšnjo prijavo (geslo: <code className="bg-surface-container px-1 py-0.5 rounded text-on-surface font-mono">admin123</code> ali <code className="bg-surface-container px-1 py-0.5 rounded text-on-surface font-mono">geslo123</code>):
                    </p>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
                      {users.map(u => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-left transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-on-surface truncate flex items-center gap-1">
                                {u.name}
                                {u.role === 'superadmin' && <Crown className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                              </span>
                              <span className="text-[10px] text-outline truncate">{u.email} • {u.role}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleFillDemo(u.email, u.password || (u.role === 'superadmin' ? 'admin123' : 'geslo123'))}
                              className="px-2 py-1 text-[10px] rounded font-semibold bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border border-surface-container transition-colors"
                              title="Izpolni podatke v obrazec"
                            >
                              Izpolni
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = loginById(u.id);
                                if (res.success) {
                                  setSuccessMsg(`Prijavljeni kot ${u.name}`);
                                  setTimeout(() => onClose(), 400);
                                } else {
                                  setErrorMsg(res.error || 'Napaka');
                                }
                              }}
                              className="px-2 py-1 text-[10px] rounded font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
                              title="Takojšnja prijava"
                            >
                              Prijava
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 text-center">
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Še nimate računa?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
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
                  selectedRole={regRole}
                  onSuccess={(user, isNewUser) => {
                    if (isNewUser) {
                      setSuccessMsg(`Google račun uspešno registriran kot ${user.name} (${user.role})! Prijavljeni ste.`);
                    } else {
                      setSuccessMsg(`Prijavljeni z obstoječim Google računom kot ${user.name} (${user.role})!`);
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

              {/* Role selection section */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-xs font-semibold text-on-surface">
                    Vloga / raven dostopa
                  </label>
                  <span className="text-[11px] text-outline">
                    Izberite pravice za vaš račun
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Superadmin Card */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      regRole === 'superadmin'
                        ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 ring-1 ring-purple-500'
                        : 'border-surface-container bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="superadmin"
                      checked={regRole === 'superadmin'}
                      onChange={() => setRegRole('superadmin')}
                      className="mt-1 accent-purple-600"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-xs text-purple-700 dark:text-purple-300">
                          Superadmin (Glavni administrator)
                        </span>
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 bg-purple-600 text-white rounded-full">
                          Polne pravice
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        Popoln dostop do nadzorne plošče administratorja, upravljanje vlog, moderiranje portala in konfiguracija.
                      </p>
                    </div>
                  </label>

                  {/* Standard Registered User */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      regRole === 'registered'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-surface-container bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="registered"
                      checked={regRole === 'registered'}
                      onChange={() => setRegRole('registered')}
                      className="mt-1 accent-primary"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-bold text-xs text-on-surface">
                          Registrirani uporabnik
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        Objava malih oglasov, blog člankov in dogodkov na portalu.
                      </p>
                    </div>
                  </label>

                  {/* Verified User */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      regRole === 'verified'
                        ? 'border-secondary bg-secondary/5 ring-1 ring-secondary'
                        : 'border-surface-container bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="verified"
                      checked={regRole === 'verified'}
                      onChange={() => setRegRole('verified')}
                      className="mt-1 accent-secondary"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-secondary" />
                        <span className="font-bold text-xs text-on-surface">
                          Preverjeni uporabnik
                        </span>
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 bg-secondary/15 text-secondary rounded-md">
                          Preverjen
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        Vse standardne pravice + možnost dodajanja ugodnosti, kuponov in popustov.
                      </p>
                    </div>
                  </label>

                  {/* Admin */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      regRole === 'admin'
                        ? 'border-error bg-error/5 ring-1 ring-error'
                        : 'border-surface-container bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={regRole === 'admin'}
                      onChange={() => setRegRole('admin')}
                      className="mt-1 accent-error"
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-error" />
                        <span className="font-bold text-xs text-on-surface">
                          Sistemski Administrator
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                        Nadzor nad objavami, RSS viri in moderiranje vsebin.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full mt-2 py-3 rounded-xl text-white font-label-md text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  regRole === 'superadmin'
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                    : 'bg-primary hover:bg-primary-container shadow-primary/20'
                }`}
              >
                {regRole === 'superadmin' ? (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Registriraj se kot Superadmin</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Ustvari račun in se prijavi</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Že imate račun?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
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
