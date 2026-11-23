import { Search, ChevronDown, Bookmark, X, Filter, LogOut, User as UserIcon, Shield, Settings, Crown, UserCheck, Bell, FolderTree, Globe } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { LoginModal } from './LoginModal';
import { UserAvatar } from './common/UserAvatar';
import { useState, useRef, useEffect, useMemo } from 'react';
import { parseSearchQuery, buildSearchQuery, SearchCategory } from '../utils/searchUtils';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';
import {
  DirectoryCategory,
  DirectoryEntry,
  subscribeToDirectoryCategories,
  subscribeToDirectoryEntries,
  getDirectoryEntrySlug,
} from '../services/directoryService';
import { PostDetailTarget, ViewMode } from '../types';

export function Header({
  onProfileClick,
  onSavedClick,
  onHomeClick,
  onAdminClick,
  onNavigatePost,
  searchQuery,
  onSearchChange,
  activeView,
  onSearchSubmit,
}: {
  onProfileClick?: () => void;
  onSavedClick?: () => void;
  onHomeClick?: () => void;
  onAdminClick?: () => void;
  onNavigatePost?: (target: PostDetailTarget) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  activeView?: ViewMode;
  onSearchSubmit?: (q: string) => void;
}) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [userCategoryOverride, setUserCategoryOverride] = useState<SearchCategory | null>(null);
  const [userDirectoryCategoryOverride, setUserDirectoryCategoryOverride] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  const [allPosts, setAllPosts] = useState<FirestorePost[]>([]);
  const [directoryCategories, setDirectoryCategories] = useState<DirectoryCategory[]>([]);
  const [directoryEntries, setDirectoryEntries] = useState<DirectoryEntry[]>([]);
  const [suggestions, setSuggestions] = useState<
    Array<
      | { kind: 'post'; label: string }
      | { kind: 'directory-category'; cat: DirectoryCategory; label: string }
      | { kind: 'directory-entry'; entry: DirectoryEntry; label: string }
    >
  >([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const { currentUser, logout } = useAuth();
  const { savedIds } = useBookmarks();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const savedCount = savedIds.length;

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read),
    [notifications]
  );
  const unreadMessagesCount = useMemo(
    () => unreadNotifications.filter(n => n.type === 'comment' || n.type === 'reply').length,
    [unreadNotifications]
  );
  const unreadSystemCount = useMemo(
    () => unreadNotifications.filter(n => n.type === 'system').length,
    [unreadNotifications]
  );
  const hasUnreadAlerts = unreadCount > 0;
  const unreadSummaryTitle = useMemo(() => {
    if (!hasUnreadAlerts) return '';
    if (unreadMessagesCount > 0 && unreadSystemCount > 0) {
      return `Nova sporočila (${unreadMessagesCount}) in sistemska obvestila (${unreadSystemCount})`;
    }
    if (unreadSystemCount > 0) {
      return `Nova sistemska obvestila (${unreadSystemCount})`;
    }
    if (unreadMessagesCount > 0) {
      return `Nova sporočila in odgovori (${unreadMessagesCount})`;
    }
    return `Neprebrana obvestila (${unreadCount})`;
  }, [hasUnreadAlerts, unreadMessagesCount, unreadSystemCount, unreadCount]);

  const parsedSearch = parseSearchQuery(searchQuery || '');
  
  const activeViewCategory: SearchCategory = 
    activeView === 'ads' ? 'ads' :
    activeView === 'deals' ? 'deals' :
    activeView === 'events' ? 'events' :
    activeView === 'blog' ? 'blog' :
    activeView === 'directory' ? 'directory' :
    activeView === 'news' ? 'news' : 'all';

  const category: SearchCategory = parsedSearch.category !== 'all'
    ? parsedSearch.category
    : (userCategoryOverride ?? activeViewCategory);

  const directoryCategoryId =
    parsedSearch.directoryCategory ??
    (category === 'directory' ? userDirectoryCategoryOverride : null) ??
    '';

  const selectValue =
    category === 'directory' && directoryCategoryId
      ? `directory:${directoryCategoryId}`
      : category;

  const text = parsedSearch.text;

  // Close dropdown on click outside & subscribe to posts + directory metadata
  useEffect(() => {
    const unsubPosts = subscribeToPosts(setAllPosts);
    const unsubDirCats = subscribeToDirectoryCategories(setDirectoryCategories);
    const unsubDirEntries = subscribeToDirectoryEntries(setDirectoryEntries);
    return () => {
      unsubPosts();
      unsubDirCats();
      unsubDirEntries();
    };
  }, []);

  // Listen for open_auth_modal event
  useEffect(() => {
    const handleOpenAuth = (e: any) => {
      if (e.detail?.mode) setAuthModalMode(e.detail.mode);
      setIsLoginModalOpen(true);
    };
    window.addEventListener('open_auth_modal', handleOpenAuth);
    return () => window.removeEventListener('open_auth_modal', handleOpenAuth);
  }, []);

  useEffect(() => {
    const q = text.trim().toLowerCase();

    if (category === 'directory') {
      const catMatches = directoryCategories
        .filter((c) => !q || c.name.toLowerCase().includes(q))
        .slice(0, 4)
        .map((cat) => ({
          kind: 'directory-category' as const,
          cat,
          label: cat.name,
        }));

      const entryMatches = q.length >= 1
        ? directoryEntries
            .filter(
              (e) =>
                e.status === 'published' &&
                (!directoryCategoryId || e.categoryId === directoryCategoryId) &&
                (e.name.toLowerCase().includes(q) ||
                  e.domain.toLowerCase().includes(q) ||
                  e.categoryName.toLowerCase().includes(q))
            )
            .slice(0, 5)
            .map((entry) => ({
              kind: 'directory-entry' as const,
              entry,
              label: entry.name,
            }))
        : [];

      setSuggestions([...catMatches, ...entryMatches]);
      return;
    }

    if (q.length < 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const postMatches = allPosts
      .filter(p => p.status !== 'osnutek' && p.status !== 'rejected' && p.status !== 'archived' && p.title.toLowerCase().includes(q))
      .map(p => p.title);

    const uniquePosts = [...new Set(postMatches)].slice(0, 4).map((label) => ({
      kind: 'post' as const,
      label,
    }));

    const matchingDirCats = category === 'all'
      ? directoryCategories
          .filter((c) => c.name.toLowerCase().includes(q))
          .slice(0, 2)
          .map((cat) => ({
            kind: 'directory-category' as const,
            cat,
            label: cat.name,
          }))
      : [];

    const matchingDirEntries = category === 'all'
      ? directoryEntries
          .filter(
            (e) =>
              e.status === 'published' &&
              (e.name.toLowerCase().includes(q) || e.domain.toLowerCase().includes(q))
          )
          .slice(0, 2)
          .map((entry) => ({
            kind: 'directory-entry' as const,
            entry,
            label: entry.name,
          }))
      : [];

    setSuggestions([...matchingDirCats, ...matchingDirEntries, ...uniquePosts].slice(0, 6));
    setIsSuggestionsOpen(true);
  }, [text, allPosts, category, directoryCategoryId, directoryCategories, directoryEntries]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelectChange = (val: string) => {
    if (val.startsWith('directory:')) {
      const subId = val.slice('directory:'.length);
      setUserCategoryOverride('directory');
      setUserDirectoryCategoryOverride(subId);
      onSearchChange?.(buildSearchQuery('directory', text, subId));
    } else {
      const newCat = val as SearchCategory;
      setUserCategoryOverride(newCat);
      setUserDirectoryCategoryOverride(null);
      onSearchChange?.(buildSearchQuery(newCat, text));
    }
  };

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-surface-container shadow-sm w-full max-w-full overflow-x-clip">
      <div className="h-14 sm:h-16 w-full max-w-7xl 2xl:max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 xl:px-margin-desktop flex items-center justify-between gap-1.5 sm:gap-space-md">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onHomeClick?.();
          }}
          className="flex items-center flex-shrink-0 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg py-1 transition-all"
          title="Portalko.net - Domov"
          aria-label="Portalko.net - Domov"
          id="header-brand-logo-link"
        >
          <img 
            alt="Portalko.net" 
            className="h-7 xs:h-8 sm:h-11 md:h-13 w-auto max-h-14 object-contain drop-shadow-2xs group-hover:scale-[1.02] transition-transform duration-200" 
            src="https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg" 
            id="header-brand-logo-img"
          />
          <span className="sr-only">Portalko.net - Domov</span>
        </a>
        <div ref={desktopSearchRef} className="hidden md:flex items-center flex-1 max-w-xl mx-space-md">
          <div className="relative w-full flex items-center bg-surface-container-low rounded-lg border border-transparent focus-within:border-outline-variant focus-within:bg-surface-container-lowest transition-all">
            {/* Category filter selector */}
            <div className="relative flex items-center border-r border-surface-container pr-1 pl-2.5 max-w-[175px]">
              <select
                value={selectValue}
                onChange={(e) => handleCategorySelectChange(e.target.value)}
                className="appearance-none bg-transparent py-2 pr-6 pl-1 font-label-md text-xs font-semibold text-on-surface cursor-pointer focus:outline-none hover:text-primary transition-colors truncate max-w-full"
                aria-label="Filtriraj iskanje po kategoriji"
              >
                <option value="all">Vse kategorije</option>
                <option value="news">Novice</option>
                <option value="ads">Mali oglasi</option>
                <option value="deals">Akcije</option>
                <option value="events">Dogodki</option>
                <option value="blog">Blog</option>
                <option value="directory">Imenik (vse)</option>
                {directoryCategories.length > 0 && (
                  <optgroup label="Imenik – po kategorijah">
                    {directoryCategories.map((cat) => (
                      <option key={cat.id} value={`directory:${cat.id}`}>
                        Imenik: {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3 h-3 text-outline absolute right-2 pointer-events-none" />
            </div>

            {/* Search input field */}
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-outline ml-3 shrink-0" />
              <input 
                id="search-input"
                value={text}
                onChange={(e) => {
                  onSearchChange?.(buildSearchQuery(category, e.target.value, directoryCategoryId || undefined));
                }}
                onFocus={() => setIsSuggestionsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearchSubmit?.(buildSearchQuery(category, text, directoryCategoryId || undefined));
                    setIsSuggestionsOpen(false);
                  }
                }}
                className="w-full bg-transparent pl-2.5 pr-8 py-2 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none" 
                placeholder={
                  category === 'news' ? 'Išči po novicah in virih...' :
                  category === 'ads' ? 'Išči po malih oglasih...' :
                  category === 'deals' ? 'Išči po ugodnostih in popustih...' :
                  category === 'events' ? 'Išči po dogodkih...' :
                  category === 'blog' ? 'Išči po blog zapisih...' :
                  category === 'directory' ? 'Išči po imeniku podjetij in kategorijah...' :
                  'Išči po objavah, novicah, oglasih, ugodnostih, imeniku...'
                }
                type="text" 
              />
              
              {/* Suggestions Dropdown */}
              {isSuggestionsOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest rounded-xl border border-surface-container shadow-lg z-50 py-1.5 overflow-hidden">
                  {suggestions.map((item, index) => {
                    if (item.kind === 'directory-category') {
                      return (
                        <button
                          key={`dir-cat-${item.cat.id}-${index}`}
                          type="button"
                          className="w-full text-left px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          onClick={() => {
                            setUserCategoryOverride('directory');
                            setUserDirectoryCategoryOverride(item.cat.id);
                            const nextQuery = buildSearchQuery('directory', '', item.cat.id);
                            onSearchChange?.(nextQuery);
                            onSearchSubmit?.(nextQuery);
                            setIsSuggestionsOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-2 min-w-0 font-semibold">
                            <FolderTree className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{item.cat.name}</span>
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                            Kategorija Imenika
                          </span>
                        </button>
                      );
                    }
                    if (item.kind === 'directory-entry') {
                      return (
                        <button
                          key={`dir-entry-${item.entry.id}-${index}`}
                          type="button"
                          className="w-full text-left px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          onClick={() => {
                            const slug = getDirectoryEntrySlug(item.entry);
                            if (typeof window !== 'undefined') {
                              const url = new URL(window.location.href);
                              url.pathname = '/imenik';
                              url.searchParams.set('imenik', slug);
                              window.history.pushState({}, '', url.toString());
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }
                            setIsSuggestionsOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-2 min-w-0 font-semibold">
                            <Globe className="w-3.5 h-3.5 text-secondary shrink-0" />
                            <span className="truncate">{item.entry.name}</span>
                          </span>
                          <span className="text-[10px] font-medium text-outline truncate max-w-[140px]">
                            Imenik • {item.entry.categoryName}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={`post-${index}`}
                        type="button"
                        className="w-full text-left px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => {
                          onSearchChange?.(buildSearchQuery(category, item.label, directoryCategoryId || undefined));
                          setIsSuggestionsOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {(text || (parsedSearch.category !== 'all' && parsedSearch.category !== activeViewCategory) || Boolean(directoryCategoryId)) && (
                <button 
                  onClick={() => {
                    setUserCategoryOverride(null);
                    setUserDirectoryCategoryOverride(null);
                    onSearchChange?.('');
                  }}
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
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-space-sm md:gap-space-md flex-shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setIsMobileSearchOpen(prev => !prev)}
            className={`md:hidden p-1.5 sm:p-2 rounded-lg transition-colors ${isMobileSearchOpen ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
            type="button"
            aria-label="Iskanje"
            title="Iskanje"
          >
            <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>

          {/* Header bookmark button - hidden on mobile since it's prominently accessible in the mobile BottomNav */}
          <button 
            onClick={onSavedClick}
            className="hidden sm:flex relative p-1.5 sm:p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            type="button"
            title="Shranjeno"
          >
            <Bookmark className="w-5 h-5" />
            {savedCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-primary rounded-full border-2 border-white">
                {savedCount > 9 ? '9+' : savedCount}
              </span>
            )}
          </button>

          {/* Real-time notifications bell */}
          <div className="relative flex items-center shrink-0" id="header-notifications-container">
            <NotificationCenter onNavigatePost={onNavigatePost} />
          </div>

          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                aria-expanded={isUserMenuOpen}
                aria-label={hasUnreadAlerts ? `Profil: ${currentUser.name} (${unreadSummaryTitle})` : `Profil: ${currentUser.name}`}
                title={hasUnreadAlerts ? `Profil: ${currentUser.name} • ${unreadSummaryTitle}` : `Profil: ${currentUser.name}`}
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    src={currentUser.avatar}
                    name={currentUser.name}
                    userId={currentUser.id}
                    role={currentUser.role}
                    size="sm"
                    className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-primary/20 shadow-xs"
                  />
                  {hasUnreadAlerts && (
                    <span
                      id="header-profile-notification-dot"
                      className="absolute -top-0.5 -right-0.5 flex h-3 w-3 pointer-events-none"
                      aria-hidden="true"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 ring-2 ring-white shadow-xs" />
                    </span>
                  )}
                </div>
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

                  {/* Unread messages & system notifications alert */}
                  {hasUnreadAlerts && (
                    <div className="px-3 py-2 border-b border-surface-container-low bg-red-500/5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            document.getElementById('header-notification-bell')?.click();
                          }}
                          className="flex items-center gap-2 text-left text-xs font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer min-w-0"
                        >
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                          </span>
                          <Bell className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate">
                            {unreadSummaryTitle}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-primary hover:underline shrink-0 cursor-pointer"
                          title="Označi vsa obvestila kot prebrana"
                        >
                          Prebrano
                        </button>
                      </div>
                    </div>
                  )}

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
            <div className="flex items-center gap-1 sm:gap-2 ml-0.5 sm:ml-1 shrink-0">
              <button 
                onClick={() => { setAuthModalMode('login'); setIsLoginModalOpen(true); }} 
                className="px-2 xs:px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-surface-container hover:bg-surface-container-low text-on-surface font-label-md text-xs sm:text-sm font-semibold transition-colors shrink-0"
              >
                Prijava
              </button>
              <button 
                onClick={() => { setAuthModalMode('register'); setIsLoginModalOpen(true); }} 
                className="px-2 xs:px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-primary text-on-primary rounded-lg sm:rounded-xl font-label-md text-xs sm:text-sm font-bold shadow-xs hover:bg-primary-container transition-colors shrink-0 whitespace-nowrap"
              >
                Registracija
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search bar expandable */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-surface-container/60 bg-surface-container-lowest animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center bg-surface-container-low rounded-xl border border-surface-container focus-within:border-primary focus-within:bg-surface-container-lowest transition-all">
            <div className="relative flex items-center border-r border-surface-container pr-1 pl-2.5 max-w-[155px]">
              <select
                value={selectValue}
                onChange={(e) => handleCategorySelectChange(e.target.value)}
                className="appearance-none bg-transparent py-2.5 pr-6 pl-1 font-label-md text-xs font-semibold text-on-surface cursor-pointer focus:outline-none hover:text-primary transition-colors truncate max-w-full"
                aria-label="Filtriraj iskanje po kategoriji"
              >
                <option value="all">Vse</option>
                <option value="news">Novice</option>
                <option value="ads">Mali oglasi</option>
                <option value="deals">Akcije</option>
                <option value="events">Dogodki</option>
                <option value="blog">Blog</option>
                <option value="directory">Imenik (vse)</option>
                {directoryCategories.length > 0 && (
                  <optgroup label="Imenik – kategorije">
                    {directoryCategories.map((cat) => (
                      <option key={cat.id} value={`directory:${cat.id}`}>
                        Imenik: {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3 h-3 text-outline absolute right-2 pointer-events-none" />
            </div>

            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-outline ml-2.5 shrink-0" />
              <input 
                value={text}
                onChange={(e) => {
                  onSearchChange?.(buildSearchQuery(category, e.target.value, directoryCategoryId || undefined));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearchSubmit?.(buildSearchQuery(category, text, directoryCategoryId || undefined));
                    setIsMobileSearchOpen(false);
                  }
                }}
                className="w-full bg-transparent pl-2 pr-8 py-2.5 font-body-sm text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none" 
                placeholder={
                  category === 'news' ? 'Išči novice...' :
                  category === 'ads' ? 'Išči male oglase...' :
                  category === 'deals' ? 'Išči ugodnosti...' :
                  category === 'events' ? 'Išči dogodke...' :
                  category === 'blog' ? 'Išči blog zapise...' :
                  category === 'directory' ? 'Išči po imeniku...' :
                  'Išči po celotnem portalu...'
                }
                type="text" 
                autoFocus
              />
              {(text || Boolean(directoryCategoryId)) && (
                <button 
                  onClick={() => {
                    setUserCategoryOverride(null);
                    setUserDirectoryCategoryOverride(null);
                    onSearchChange?.('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high"
                  aria-label="Počisti iskanje"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={authModalMode} />
    </header>
  );
}
