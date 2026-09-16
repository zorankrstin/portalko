import { useState } from 'react';
import { Camera, Edit2, Shield, Bell, Settings, FileText, UserCog, Mail, Key, Bookmark, LogIn, UserPlus, Check, AlertCircle, Eye, EyeOff, Crown, UserCheck } from 'lucide-react';
import { SavedPostsTab } from './SavedPostsTab';
import { BlogPost } from './posts/BlogPost';
import { AdPost } from './posts/AdPost';
import { EventPost } from './posts/EventPost';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { LoginModal } from './LoginModal';
import portalkoLogo from '../assets/images/portalko_logo.png';

export function UserProfile({ onViewChange }: { onViewChange: (view: 'main') => void }) {
  const { currentUser, logout, updateUser, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'settings'>('posts');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Edit profile state
  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [usernameInput, setUsernameInput] = useState(`@${currentUser?.name?.toLowerCase().replace(/\s+/g, '_') || 'uporabnik'}`);
  const [bioInput, setBioInput] = useState('Navdušenec nad tehnologijo, športom in dobro kavo. Redni obiskovalec dogodkov v Ljubljani in okolici. Vedno za dobro debato.');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Password update state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  if (!currentUser) {
    return (
      <main className="lg:col-span-6 flex flex-col gap-space-md">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container/50 text-center flex flex-col items-center gap-4">
          <img src={portalkoLogo} alt="Portalko.net" className="w-16 h-16 rounded-2xl object-contain shadow-xs border border-surface-container/60" />
          <div className="max-w-md">
            <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2">
              Niste prijavljeni v Portalko
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Za ogled vašega profila, shranjenih vsebin ter urejanje osebnih nastavitev se prijavite ali ustvarite nov račun.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => { setAuthModalMode('login'); setIsLoginModalOpen(true); }}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Prijava v račun</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalMode('register'); setIsLoginModalOpen(true); }}
              className="px-5 py-2.5 rounded-xl border border-surface-container hover:bg-surface-container-low text-on-surface font-label-md text-sm font-bold transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Registracija</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('main')}
              className="px-4 py-2.5 text-xs text-outline hover:text-on-surface transition-colors"
            >
              Nazaj na Portalko
            </button>
          </div>
        </div>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={authModalMode} />
      </main>
    );
  }

  const handleSaveProfile = () => {
    if (nameInput.trim()) {
      updateUser(currentUser.id, { name: nameInput.trim() });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2500);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Novi gesli se ne ujemata.');
      return;
    }

    const res = changePassword(currentUser.id, oldPassword, newPassword);
    if (!res.success) {
      setPasswordError(res.error || 'Napaka pri spremembi gesla.');
      return;
    }

    setPasswordSuccess('Geslo je bilo uspešno posodobljeno!');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordSuccess('');
    }, 1500);
  };

  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md">
      {/* Profile Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 relative overflow-hidden flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative shrink-0">
          <img 
            alt={currentUser.name} 
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-md ring-4 ring-surface-container-lowest" 
            src={currentUser.avatar} 
          />
          <button className="absolute bottom-1 right-1 p-2 bg-surface-container-highest hover:bg-surface-container text-on-surface rounded-full shadow-sm transition-colors border border-surface-container/50">
            <Camera className="w-[1em] h-[1em] text-sm" />
          </button>
        </div>

        <div className="flex-1 min-w-0 z-10">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface flex items-center gap-2">
              {currentUser.name}
              {currentUser.role === 'superadmin' ? (
                <span className="bg-purple-600 text-white rounded-full p-1 shadow-sm" title="Superadmin">
                  <Crown className="w-3.5 h-3.5" />
                </span>
              ) : currentUser.role === 'admin' ? (
                <span className="bg-error text-white rounded-full p-1 shadow-sm" title="Administrator">
                  <Shield className="w-3.5 h-3.5" />
                </span>
              ) : currentUser.role === 'verified' ? (
                <span className="bg-secondary text-on-secondary rounded-full p-1 shadow-sm" title="Preverjen">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
              ) : null}
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-2xl text-xs sm:text-sm">
              {bioInput}
            </p>
          </div>
          
          <div className="flex items-center gap-6 mt-4">
            <div className="flex flex-col">
              <span className="font-headline-sm text-lg font-bold text-on-surface">142</span>
              <span className="font-label-md text-xs text-outline uppercase tracking-wider">Objav</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-lg font-bold text-on-surface">1.2k</span>
              <span className="font-label-md text-xs text-outline uppercase tracking-wider">Sledilcev</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-lg font-bold text-on-surface">340</span>
              <span className="font-label-md text-xs text-outline uppercase tracking-wider">Sledi</span>
            </div>
          </div>
        </div>
        
        <div className="shrink-0 self-start sm:self-center z-10 flex sm:flex-col gap-2">
          <button 
            onClick={() => setActiveTab('settings')}
            className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md font-semibold transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-[1em] h-[1em] text-sm text-primary" />
            <span>Uredi</span>
          </button>
          <button 
            onClick={() => { logout(); onViewChange('main'); }}
            className="px-4 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error font-label-md font-bold transition-colors flex items-center gap-2 border border-error/20"
            title="Odjava iz računa"
          >
            <LogOut className="w-4 h-4 text-error" />
            <span>Odjava</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-surface-container px-2">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-3 font-label-md text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'posts' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50 rounded-t-lg'
          }`}
        >
          <FileText className="w-[1em] h-[1em]" />
          Moje objave
        </button>
        
        <button 
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-3 font-label-md text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'saved' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50 rounded-t-lg'
          }`}
        >
          <Bookmark className="w-[1em] h-[1em] text-base" />
          <span>Shranjeno</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 font-label-md text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'settings' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50 rounded-t-lg'
          }`}
        >
          <Settings className="w-[1em] h-[1em]" />
          Nastavitve računa
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'posts' && (
          <div className="flex flex-col gap-space-md">
            <h2 className="font-headline-sm text-lg font-bold text-on-surface px-1">Nedavne objave</h2>
            <BlogPost id="blog-profile" />
            <EventPost id="event-profile" />
            <AdPost id="ad-profile" />
          </div>
        )}

        {activeTab === 'saved' && (
          <SavedPostsTab />
        )}

        {activeTab === 'settings' && (
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-8">
            {profileSaveSuccess && (
              <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/30 text-secondary text-sm flex items-center gap-2 animate-in fade-in duration-200">
                <Check className="w-4 h-4" />
                <span>Spremembe profila so bile uspešno shranjene!</span>
              </div>
            )}

            {/* Osebni podatki */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-container-low">
                <UserCog className="w-[1em] h-[1em] text-primary text-lg" />
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Osebni podatki</h3>
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant font-bold">Vloga v sistemu:</span>
                  <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {currentUser.role}
                  </span>
                </div>
                <button 
                  onClick={() => { logout(); onViewChange('main'); }} 
                  className="px-3.5 py-1.5 rounded-xl bg-error/10 hover:bg-error/20 text-error font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors border border-error/20"
                  title="Odjava iz računa"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Odjava iz računa</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-xs font-semibold text-on-surface">Ime in priimek</label>
                  <input 
                    type="text" 
                    value={nameInput} 
                    onChange={e => setNameInput(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-sm text-on-surface transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-xs font-semibold text-on-surface">Uporabniško ime</label>
                  <input 
                    type="text" 
                    value={usernameInput} 
                    onChange={e => setUsernameInput(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-sm text-on-surface transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-label-md text-xs font-semibold text-on-surface">Kratek opis (Bio)</label>
                  <textarea 
                    rows={3} 
                    value={bioInput} 
                    onChange={e => setBioInput(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none font-body-md text-sm text-on-surface transition-colors resize-none" 
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveProfile}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-semibold transition-colors shadow-sm"
                >
                  Shrani spremembe
                </button>
              </div>
            </section>

            {/* Račun in varnost */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-container-low">
                <Shield className="w-[1em] h-[1em] text-primary text-lg" />
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Račun in varnost</h3>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-container-highest rounded-lg text-on-surface-variant">
                      <Mail className="w-[1em] h-[1em]" />
                    </div>
                    <div>
                      <p className="font-label-md text-sm font-semibold text-on-surface">Elektronski naslov</p>
                      <p className="font-body-sm text-xs text-on-surface-variant">{currentUser.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-secondary font-semibold px-2 py-1 rounded bg-secondary/10 border border-secondary/20">
                    Aktivno & Preverjeno
                  </span>
                </div>

                {/* Google Account Status Card */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-container-highest rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-label-md text-sm font-semibold text-on-surface">Povezava z Google računom</p>
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        {currentUser.authProvider === 'google' 
                          ? `Račun je povezan z Googlom (${currentUser.email})`
                          : 'Prijava z Google je omogočena za ta e-poštni naslov'}
                      </p>
                    </div>
                  </div>
                  {currentUser.authProvider === 'google' ? (
                    <span className="text-xs text-secondary font-semibold px-2 py-1 rounded bg-secondary/10 border border-secondary/20 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Povezano
                    </span>
                  ) : (
                    <span className="text-xs text-outline font-medium px-2 py-1 rounded bg-surface-container">
                      E-pošta
                    </span>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-container-highest rounded-lg text-on-surface-variant">
                        <Key className="w-[1em] h-[1em]" />
                      </div>
                      <div>
                        <p className="font-label-md text-sm font-semibold text-on-surface">Geslo za prijavo</p>
                        <p className="font-body-sm text-xs text-on-surface-variant">
                          {isChangingPassword ? 'Vnesite trenutno in novo geslo' : 'Zaščita vašega računa z varnim geslom'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsChangingPassword(!isChangingPassword);
                        setPasswordError('');
                        setPasswordSuccess('');
                      }}
                      className="px-4 py-1.5 rounded-lg border border-outline text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container-highest transition-colors self-start sm:self-center"
                    >
                      {isChangingPassword ? 'Prekliči' : 'Posodobi geslo'}
                    </button>
                  </div>

                  {isChangingPassword && (
                    <form onSubmit={handlePasswordSubmit} className="mt-3 pt-3 border-t border-surface-container flex flex-col gap-3 animate-in fade-in duration-200">
                      {passwordError && (
                        <div className="p-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="p-2.5 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{passwordSuccess}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-on-surface">Trenutno geslo</label>
                          <div className="relative">
                            <input
                              type={showOldPassword ? 'text' : 'password'}
                              required
                              placeholder="Trenutno geslo"
                              value={oldPassword}
                              onChange={e => setOldPassword(e.target.value)}
                              className="w-full px-3 py-2 pr-9 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOldPassword(!showOldPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                              tabIndex={-1}
                            >
                              {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-on-surface">Novo geslo</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              placeholder="Vsaj 6 znakov"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full px-3 py-2 pr-9 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                              tabIndex={-1}
                            >
                              {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-on-surface">Ponovite novo geslo</label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="Ponovite novo geslo"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setIsChangingPassword(false)}
                          className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface"
                        >
                          Prekliči
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-colors"
                        >
                          Shrani novo geslo
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>

            {/* Obvestila */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface-container-low">
                <Bell className="w-[1em] h-[1em] text-primary text-lg" />
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Obvestila</h3>
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-md text-sm font-semibold text-on-surface">E-poštna obvestila o novih sporočilih</span>
                    <span className="font-body-sm text-xs text-on-surface-variant">Prejmi e-pošto, ko ti nekdo pošlje zasebno sporočilo</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary rounded cursor-pointer" />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-md text-sm font-semibold text-on-surface">Odgovori na komentarje</span>
                    <span className="font-body-sm text-xs text-on-surface-variant">Obvesti me, ko nekdo odgovori na moj komentar</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary rounded cursor-pointer" />
                </label>
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-md text-sm font-semibold text-on-surface">Tedenski pregled dogodkov</span>
                    <span className="font-body-sm text-xs text-on-surface-variant">Prejmi izbor najboljših dogodkov vsak ponedeljek</span>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-primary rounded cursor-pointer" />
                </label>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
