import React, { useState, useEffect, useRef } from 'react';
import { Shield, Crown, UserCheck, Check, AlertCircle, Plus, Info, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth, Role, User } from '../contexts/AuthContext';

interface GoogleAuthButtonProps {
  mode: 'login' | 'register';
  selectedRole?: Role;
  onSuccess: (user: User, isNewUser: boolean) => void;
  onError: (msg: string) => void;
}

export function GoogleAuthButton({ mode, selectedRole = 'registered', onSuccess, onError }: GoogleAuthButtonProps) {
  const { loginOrRegisterWithGoogle, signInWithGoogleFirebase } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [useCustomAccount, setUseCustomAccount] = useState(false);
  const [customRole, setCustomRole] = useState<Role>(selectedRole);
  const [showConfigInfo, setShowConfigInfo] = useState(false);

  // Keep customRole in sync with selectedRole from parent
  useEffect(() => {
    setCustomRole(selectedRole);
  }, [selectedRole]);

  // Google GSI Client setup
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId) return;

    const win = window as any;
    if (win.google?.accounts?.id) {
      try {
        win.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            try {
              // Decode JWT payload
              const payloadBase64 = response.credential.split('.')[1];
              const decodedJson = JSON.parse(atob(payloadBase64));
              const email = decodedJson.email;
              const name = decodedJson.name || decodedJson.given_name || email.split('@')[0];
              const picture = decodedJson.picture;
              const sub = decodedJson.sub;

              const res = loginOrRegisterWithGoogle({
                email,
                name,
                avatar: picture,
                googleId: sub,
                role: customRole,
              });

              if (res.success && res.user) {
                onSuccess(res.user, res.isNewUser);
              } else {
                onError(res.error || 'Napaka pri prijavi z Google računom.');
              }
            } catch (err) {
              console.error('Failed to parse Google credential', err);
              onError('Neveljaven odgovor od Googlove avtentikacije.');
            }
          }
        });
      } catch (e) {
        console.warn('Google GSI init notice', e);
      }
    }
  }, [googleClientId, customRole, loginOrRegisterWithGoogle, onSuccess, onError]);

  const handleTriggerGoogle = async () => {
    try {
      const res = await signInWithGoogleFirebase();
      if (res.success && res.user) {
        onSuccess(res.user, false);
        return;
      }
      if (res.error && !res.error.includes('zaprto')) {
        // Fallback to quick account picker
        setIsPickerOpen(true);
        return;
      }
    } catch {
      setIsPickerOpen(true);
    }
  };

  const handleSelectAccount = (email: string, name: string, avatar?: string) => {
    const res = loginOrRegisterWithGoogle({
      email,
      name,
      avatar,
      role: customRole,
    });

    if (res.success && res.user) {
      setIsPickerOpen(false);
      onSuccess(res.user, res.isNewUser);
    } else {
      onError(res.error || 'Napaka pri prijavi z Google.');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      onError('Vnesite veljaven Google e-poštni naslov.');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    handleSelectAccount(
      customEmail.trim(), 
      name, 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4285F4&color=fff`
    );
  };

  return (
    <>
      <div ref={googleBtnContainerRef} className="w-full">
        <button
          type="button"
          onClick={handleTriggerGoogle}
          className="w-full py-2.5 px-4 rounded-xl border border-surface-container hover:bg-surface-container-low/70 bg-surface-container-lowest text-on-surface font-label-md text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-xs hover:shadow-sm group"
        >
          {/* Official Google G Logo */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-on-surface group-hover:text-primary transition-colors">
            {mode === 'register' ? 'Registracija z Google' : 'Nadaljuj z Google'}
          </span>
        </button>
      </div>

      {/* Google Account Picker & OAuth Dialog */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-sm shadow-2xl border border-surface-container overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-surface-container-low flex flex-col items-center text-center relative">
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="absolute right-3 top-3 p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                ✕
              </button>

              <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Izberite Google račun
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                za vstop v Portalko
              </p>
            </div>

            {/* Role selector for registration */}
            {mode === 'register' && (
              <div className="px-4 pt-3 pb-1 bg-surface-container-low/40 border-b border-surface-container-low">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block mb-1.5">
                  Izberite vlogo ob registraciji:
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setCustomRole('registered')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${customRole === 'registered' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
                  >
                    <span>Registriran</span>
                    {customRole === 'registered' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRole('verified')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${customRole === 'verified' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
                  >
                    <span>Preverjen</span>
                    {customRole === 'verified' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRole('admin')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${customRole === 'admin' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
                  >
                    <span>Administrator</span>
                    {customRole === 'admin' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRole('superadmin')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${customRole === 'superadmin' ? 'bg-purple-700 text-white' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
                  >
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Superadmin
                    </span>
                    {customRole === 'superadmin' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Account List */}
            <div className="p-4 flex flex-col gap-2 max-h-72 overflow-y-auto no-scrollbar">
              {/* Primary User Account: Zoran Krstin */}
              <button
                type="button"
                onClick={() => handleSelectAccount(
                  'zoran.krstin@gmail.com', 
                  'Zoran Krstin', 
                  'https://ui-avatars.com/api/?name=Zoran+Krstin&background=7C3AED&color=fff'
                )}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low border border-surface-container-low hover:border-primary/40 text-left transition-all group"
              >
                <img
                  src="https://ui-avatars.com/api/?name=Zoran+Krstin&background=7C3AED&color=fff"
                  alt="Zoran Krstin"
                  className="w-10 h-10 rounded-full ring-1 ring-surface-container"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
                    Zoran Krstin
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                      Google
                    </span>
                  </span>
                  <span className="text-xs text-outline truncate">zoran.krstin@gmail.com</span>
                </div>
              </button>

              {/* Luka Novak Google option */}
              <button
                type="button"
                onClick={() => handleSelectAccount(
                  'luka.novak.portal@gmail.com', 
                  'Luka Novak', 
                  'https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA'
                )}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low border border-surface-container-low hover:border-primary/40 text-left transition-all group"
              >
                <img
                  src="https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA"
                  alt="Luka Novak"
                  className="w-10 h-10 rounded-full ring-1 ring-surface-container"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
                    Luka Novak
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                      Google
                    </span>
                  </span>
                  <span className="text-xs text-outline truncate">luka.novak.portal@gmail.com</span>
                </div>
              </button>

              {/* Custom Google Account Option */}
              {!useCustomAccount ? (
                <button
                  type="button"
                  onClick={() => setUseCustomAccount(true)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-low border border-dashed border-surface-container hover:border-primary text-left transition-all text-on-surface-variant hover:text-primary"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">Uporabi drug Google račun</span>
                </button>
              ) : (
                <form onSubmit={handleCustomSubmit} className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container flex flex-col gap-2.5 mt-1">
                  <span className="text-xs font-bold text-on-surface">Vnesite Google podatke:</span>
                  <input
                    type="text"
                    required
                    placeholder="Vaše ime in priimek"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <input
                    type="email"
                    required
                    placeholder="vas.email@gmail.com"
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setUseCustomAccount(false)}
                      className="px-2 py-1 text-xs text-outline hover:text-on-surface"
                    >
                      Prekliči
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors"
                    >
                      Potrdi in vstopi
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer / OAuth info link */}
            <div className="p-3 bg-surface-container-low/30 border-t border-surface-container-low text-[11px] text-outline">
              <button
                type="button"
                onClick={() => setShowConfigInfo(!showConfigInfo)}
                className="w-full flex items-center justify-between text-left hover:text-on-surface transition-colors"
              >
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span>Tehnične informacije za Google OAuth Client ID</span>
                </span>
                {showConfigInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showConfigInfo && (
                <div className="mt-2.5 pt-2 border-t border-surface-container-low flex flex-col gap-1.5 leading-relaxed animate-in fade-in duration-150">
                  <p className="text-[10px] text-on-surface-variant">
                    Za uradno povezavo v Google Cloud Console dodajte Authorized JavaScript origin:
                  </p>
                  <code className="text-[9px] p-1.5 rounded bg-surface-container-lowest font-mono break-all text-primary border border-surface-container">
                    https://ais-dev-sdnvm7r5nziqmbyh4lkmod-166640847922.europe-west2.run.app
                  </code>
                  <p className="text-[10px] text-outline mt-1">
                    Nato nastavite spremenljivko <span className="font-mono text-on-surface font-semibold">VITE_GOOGLE_CLIENT_ID</span> v nastavitvah.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
