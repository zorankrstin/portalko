import { Search, MapPin, ChevronDown, Bookmark, X, Filter, LogOut, User as UserIcon, Shield, Settings, Crown, UserCheck } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';
import { useState, useRef, useEffect } from 'react';
import { parseSearchQuery, buildSearchQuery, SearchCategory } from '../utils/searchUtils';

export function Header({
  onProfileClick,
  onSavedClick,
  onHomeClick,
  onAdminClick,
  searchQuery,
  onSearchChange
}: {
  onProfileClick?: () => void;
  onSavedClick?: () => void;
  onHomeClick?: () => void;
  onAdminClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { currentUser, logout } = useAuth();
  const { savedIds } = useBookmarks();
  const savedCount = savedIds.length;

  const { category, text } = parseSearchQuery(searchQuery || '');

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return {
          bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200',
          label: 'Superadmin',
          icon: <Crown className="w-3 h-3 text-purple-600" />
        };
      case 'admin':
        return {
          bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200',
          label: 'Admin',
          icon: <Shield className="w-3 h-3 text-red-600" />
        };
      case 'verified':
        return {
          bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200',
          label: 'Preverjen',
          icon: <UserCheck className="w-3 h-3 text-amber-600" />
        };
      default:
        return {
          bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200',
          label: 'Uporabnik',
          icon: <UserIcon className="w-3 h-3 text-blue-600" />
        };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-surface-container shadow-sm">
      <div className="h-16 w-full px-margin-desktop flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group" onClick={onHomeClick} title="Portalko - Domov">
          <img 
            alt="Portalko Logotip" 
            className="h-9.5 w-auto max-h-10 object-contain rounded-lg shadow-2xs group-hover:scale-105 transition-transform" 
            src="/portalko_logo.jpg" 
          />
          <span className="font-headline-sm text-xl font-black tracking-tight text-primary flex items-center">
            Portal<span className="text-secondary">ko</span>
            <span className="ml-1.5 text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">SI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-space-md">
          <div className="relative w-full flex items-center bg-surface-container-low rounded-lg border border-transparent focus-within:border-outline-variant focus-within:bg-surface-container-lowest transition-all">
            {/* Category filter selector */}
            <div className="relative flex items-center border-r border-surface-container pr-1 pl-2.5">
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as SearchCategory;
                  onSearchChange?.(buildSearchQuery(newCat, text));
                }}
                className="appearance-none bg-transparent py-2 pr-6 pl-1 font-label-md text-xs font-semibold text-on-surface cursor-pointer focus:outline-none hover:text-primary transition-colors"
                aria-label="Filtriraj iskanje po kategoriji"
              >
                <option value="all">Vse kategorije</option>
                <option value="ads">Mali oglasi</option>
                <option value="news">Novice</option>
                <option value="events">Dogodki</option>
                <option value="blog">Blog</option>
              </select>
              <ChevronDown className="w-3 h-3 text-outline absolute right-2 pointer-events-none" />
            </div>

            {/* Search input field */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-outline ml-3 shrink-0" />
              <input 
                value={text}
                onChange={(e) => {
                  onSearchChange?.(buildSearchQuery(category, e.target.value));
                }}
                className="w-full bg-transparent pl-2.5 pr-8 py-2 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none" 
                placeholder={
                  category === 'ads' ? 'Išči po malih oglasih...' :
                  category === 'news' ? 'Išči po novicah in virih...' :
                  category === 'events' ? 'Išči po dogodkih...' :
                  category === 'blog' ? 'Išči po blog zapisih...' :
                  'Išči po objavah, novicah, oglasih, dogodkih...'
                }
                type="text" 
              />
              {(text || category !== 'all') && (
                <button 
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors p-0.5 rounded-full hover:bg-surface-container-high"
                  aria-label="Počisti iskanje"
                  title="Počisti iskanje in filter kategorije"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-sm sm:gap-space-md flex-shrink-0">
          <button className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface transition-colors font-label-md text-label-md text-on-surface-variant" type="button">
            <MapPin className="w-[1em] h-[1em] text-base text-primary" />
            <span>Vsa Slovenija / Ljubljana</span>
            <ChevronDown className="w-[1em] h-[1em] text-xs" />
          </button>
          <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase">
            <svg className="w-[1em] h-[1em] text-sm text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
            <span>Preverjen</span>
          </div>
          <button 
            onClick={onSavedClick}
            className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            type="button"
            title="Shranjeno"
          >
            <Bookmark className="w-[1em] h-[1em] text-xl" />
            {savedCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-primary rounded-full border-2 border-white">
                {savedCount > 9 ? '9+' : savedCount}
              </span>
            )}
          </button>
          <NotificationCenter />

          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                aria-expanded={isUserMenuOpen}
                title={`Profil: ${currentUser.name}`}
              >
                <img 
                  alt={currentUser.name} 
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 shadow-xs" 
                  src={currentUser.avatar} 
                />
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-outline font-medium">
                    {roleInfo.label}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-outline transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User info card */}
                  <div className="px-4 py-3 border-b border-surface-container-low">
                    <p className="text-xs text-outline">Prijavljeni kot:</p>
                    <p className="font-bold text-sm text-on-surface truncate">{currentUser.name}</p>
                    <p className="text-xs text-on-surface-variant truncate mb-2">{currentUser.email}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.bg}`}>
                      {roleInfo.icon}
                      <span>{roleInfo.label}</span>
                    </span>
                  </div>

                  {/* Menu actions */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onProfileClick?.();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-primary" />
                      <span>Moj profil</span>
                    </button>

                    {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onAdminClick?.();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Nadzorna plošča ({currentUser.role === 'superadmin' ? 'Superadmin' : 'Admin'})</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSavedClick?.();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                    >
                      <Bookmark className="w-4 h-4 text-secondary" />
                      <span>Shranjene objave ({savedCount})</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setAuthModalMode('login');
                        setIsLoginModalOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-outline" />
                      <span>Zamenjaj račun</span>
                    </button>
                  </div>

                  <div className="border-t border-surface-container-low pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-error hover:bg-error/10 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-error" />
                      <span>Odjava iz računa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <button 
                onClick={() => { setAuthModalMode('login'); setIsLoginModalOpen(true); }} 
                className="px-3 py-1.5 rounded-xl border border-surface-container hover:bg-surface-container-low text-on-surface font-label-md text-xs sm:text-sm font-semibold transition-colors"
              >
                Prijava
              </button>
              <button 
                onClick={() => { setAuthModalMode('register'); setIsLoginModalOpen(true); }} 
                className="px-3.5 py-1.5 bg-primary text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-bold shadow hover:bg-primary-container transition-colors"
              >
                Registracija
              </button>
            </div>
          )}
        </div>
      </div>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={authModalMode} />
    </header>
  );
}
