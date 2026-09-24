import { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Edit2, 
  Shield, 
  Bell, 
  Settings, 
  FileText, 
  UserCog, 
  Mail, 
  Key, 
  Bookmark, 
  LogIn, 
  UserPlus, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Crown, 
  UserCheck,
  LogOut,
  Share2,
  Sliders,
  Plus,
  ExternalLink,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  Ban,
  ArrowLeft
} from 'lucide-react';
import { AuthorProfileTarget, PostDetailTarget, ViewMode } from '../types';
import { PublicAuthorProfile } from './profile/PublicAuthorProfile';
import { SavedPostsTab } from './SavedPostsTab';
import { BlogPost } from './posts/BlogPost';
import { AdPost } from './posts/AdPost';
import { EventPost } from './posts/EventPost';
import { EditPostModal, EditablePostItem } from './posts/EditPostModal';
import { ComposeModal } from './ComposeModal';
import { 
  subscribeToPosts, 
  subscribeToAds, 
  subscribeToEvents, 
  FirestorePost, 
  FirestoreAd, 
  FirestoreEvent,
  deletePostInFirestore,
  deleteAdInFirestore,
  deleteEventInFirestore 
} from '../services/firestoreService';
import { 
  useAuth, 
  DEFAULT_PROFILE_MENU, 
  DEFAULT_SOCIAL_LINKS, 
  ProfileMenuItem, 
  SocialLink 
} from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';
import { SocialLinksDisplay, getPlatformIcon, getPlatformLabel } from './profile/SocialLinksDisplay';
import { SocialLinksEditorModal } from './profile/SocialLinksEditorModal';
import { ProfileMenuEditorModal, getMenuTabIcon } from './profile/ProfileMenuEditorModal';
import { CustomTabContent } from './profile/CustomTabContent';

export interface UserProfileProps {
  onViewChange: (view: ViewMode) => void;
  targetAuthor?: AuthorProfileTarget | null;
  onClearTargetAuthor?: () => void;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function UserProfile({ 
  onViewChange, 
  targetAuthor, 
  onClearTargetAuthor, 
  onNavigatePost 
}: UserProfileProps) {
  const { currentUser, logout, updateUser, changePassword, requestVerification, cancelVerificationRequest } = useAuth();
  const [activeTabId, setActiveTabId] = useState<string>('posts');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Verification request modal state
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationNoteInput, setVerificationNoteInput] = useState('');
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState('');

  // Modals for social links and profile menu
  const [isSocialEditorOpen, setIsSocialEditorOpen] = useState(false);
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);

  // Edit profile state
  const [nameInput, setNameInput] = useState(currentUser?.name || '');
  const [usernameInput, setUsernameInput] = useState(
    currentUser?.username || `@${currentUser?.name?.toLowerCase().replace(/\s+/g, '_') || 'uporabnik'}`
  );
  const [bioInput, setBioInput] = useState(
    currentUser?.bio || 'Navdušenec nad tehnologijo, športom in dobro kavo. Redni obiskovalec dogodkov v Ljubljani in okolici. Vedno za dobro debato.'
  );
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

  // Update inputs if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setNameInput(currentUser.name || '');
      setUsernameInput(currentUser.username || `@${currentUser.name?.toLowerCase().replace(/\s+/g, '_') || 'uporabnik'}`);
      if (currentUser.bio) setBioInput(currentUser.bio);
    }
  }, [currentUser]);

  // User real posts state
  const [userFirestorePosts, setUserFirestorePosts] = useState<FirestorePost[]>([]);
  const [userFirestoreAds, setUserFirestoreAds] = useState<FirestoreAd[]>([]);
  const [userFirestoreEvents, setUserFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [editingPostItem, setEditingPostItem] = useState<EditablePostItem | null>(null);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  useEffect(() => {
    const unsubP = subscribeToPosts((posts) => {
      setUserFirestorePosts(posts);
    });
    const unsubA = subscribeToAds((ads) => {
      setUserFirestoreAds(ads);
    });
    const unsubE = subscribeToEvents((events) => {
      setUserFirestoreEvents(events);
    });
    return () => {
      unsubP();
      unsubA();
      unsubE();
    };
  }, []);

  const myItems = useMemo<EditablePostItem[]>(() => {
    if (!currentUser) return [];
    const list: EditablePostItem[] = [];
    const isCurrentUserAdmin = currentUser.role === 'superadmin' || currentUser.role === 'admin';

    userFirestorePosts.forEach(p => {
      const isMockOrSystemDeal = p.id.startsWith('deal-') || p.id.startsWith('hero-bento-');
      const isMockBlog = p.id.startsWith('blog-') || p.id.startsWith('p-');
      const isPartnerAuthor = p.authorId?.startsWith('partner-') || p.authorId?.startsWith('author-');
      
      let isMine = false;
      if (p.authorId === currentUser.id) {
        // If currentUser is admin/superadmin, do not claim mock deals/blogs/partner items or items with different authors
        if (isCurrentUserAdmin && (isMockOrSystemDeal || isMockBlog || isPartnerAuthor || (p.authorName && p.authorName !== currentUser.name && p.authorName !== 'Superadmin'))) {
          isMine = false;
        } else {
          isMine = true;
        }
      } else if (!isCurrentUserAdmin && currentUser.name && p.authorName === currentUser.name) {
        isMine = true;
      }

      if (isMine) {
        const isDeal = p.category === 'deal' || 
                       p.category === 'ugodnosti' || 
                       p.category?.startsWith('deal') || 
                       p.categoryName === 'Ugodnosti' || 
                       p.categoryName === 'Ugodnost' ||
                       p.id.startsWith('deal-') || 
                       p.id.startsWith('hero-bento-') || 
                       !!p.price;
        list.push({
          id: p.id,
          type: isDeal ? 'deal' : 'post',
          title: p.title,
          content: p.content,
          category: isDeal ? (p.category && p.category !== 'blog' && p.category !== 'post' ? p.category : 'deal') : p.category,
          categoryName: isDeal ? (p.categoryName || 'Ugodnosti') : p.categoryName,
          authorName: p.authorName,
          authorId: p.authorId,
          authorRole: p.authorRole,
          authorAvatar: p.authorAvatar,
          status: p.status || 'published',
          imageUrl: p.imageUrl,
          price: p.price,
          location: p.location,
          rejectionReason: p.rejectionReason,
        });
      }
    });

    userFirestoreAds.forEach(a => {
      const isMockAd = a.id.startsWith('ad-');
      const isAuthorAd = a.authorId?.startsWith('author-');
      let isMine = false;
      if (a.authorId === currentUser.id) {
        if (isCurrentUserAdmin && (isMockAd || isAuthorAd || (a.authorName && a.authorName !== currentUser.name && a.authorName !== 'Superadmin'))) {
          isMine = false;
        } else {
          isMine = true;
        }
      } else if (!isCurrentUserAdmin && currentUser.name && a.authorName === currentUser.name) {
        isMine = true;
      }

      if (isMine) {
        list.push({
          id: a.id,
          type: 'ad',
          title: a.title,
          content: a.description,
          category: a.category,
          categoryName: a.categoryName,
          authorName: a.authorName,
          authorId: a.authorId,
          authorRole: a.authorRole,
          authorAvatar: a.authorAvatar,
          status: (a.status === 'sold' || a.status === 'closed') ? 'archived' : (a.status as 'active' | 'pending' | 'rejected' | 'archived'),
          imageUrl: a.imageUrl,
          price: a.price,
          location: a.location,
          rejectionReason: a.rejectionReason,
        });
      }
    });

    userFirestoreEvents.forEach(e => {
      const isMockEvent = e.id.startsWith('event-');
      const isOrganizerEvent = e.authorId?.startsWith('organizer-');
      let isMine = false;
      if (e.authorId === currentUser.id) {
        if (isCurrentUserAdmin && (isMockEvent || isOrganizerEvent || (e.authorName && e.authorName !== currentUser.name && e.authorName !== 'Superadmin'))) {
          isMine = false;
        } else {
          isMine = true;
        }
      } else if (!isCurrentUserAdmin && currentUser.name && e.authorName === currentUser.name) {
        isMine = true;
      }

      if (isMine) {
        list.push({
          id: e.id,
          type: 'event',
          title: e.title,
          content: e.description,
          category: e.category,
          categoryName: e.categoryName,
          authorName: e.authorName,
          authorId: e.authorId,
          authorRole: e.authorRole,
          authorAvatar: e.authorAvatar,
          status: e.status || 'published',
          imageUrl: e.imageUrl,
          price: e.price,
          location: e.location,
          eventDate: e.eventDate || e.date,
          eventTime: e.eventTime,
          ticketUrl: e.ticketUrl,
          rejectionReason: e.rejectionReason,
        });
      }
    });

    return list;
  }, [userFirestorePosts, userFirestoreAds, userFirestoreEvents, currentUser]);

  const handleDeleteMyItem = async (item: EditablePostItem) => {
    if (!window.confirm(`Ali res želite izbrisati objavo "${item.title}"?`)) return;
    try {
      if (item.type === 'ad') {
        await deleteAdInFirestore(item.id);
      } else if (item.type === 'event') {
        await deleteEventInFirestore(item.id);
      } else {
        await deletePostInFirestore(item.id);
      }
    } catch (err) {
      console.error('Napaka pri brisanju objave:', err);
    }
  };

  // Check if viewing another specific author
  const isViewingOtherAuthor = Boolean(
    targetAuthor &&
    targetAuthor.name &&
    (!currentUser || (
      (targetAuthor.id && currentUser.id !== targetAuthor.id) ||
      (!targetAuthor.id && currentUser.name?.toLowerCase().trim() !== targetAuthor.name.toLowerCase().trim())
    ))
  );

  if (isViewingOtherAuthor && targetAuthor) {
    return (
      <PublicAuthorProfile
        targetAuthor={targetAuthor}
        onBack={onClearTargetAuthor ? onClearTargetAuthor : () => onViewChange('main')}
        onNavigatePost={onNavigatePost}
        onViewChange={onViewChange}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col gap-space-md">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container/50 text-center flex flex-col items-center gap-4">
          <img src="https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg" alt="Portalko.net" className="w-16 h-16 rounded-2xl object-contain shadow-xs border border-surface-container/60" />
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
      </div>
    );
  }

  const handleSaveProfile = () => {
    if (nameInput.trim()) {
      updateUser(currentUser.id, { 
        name: nameInput.trim(),
        username: usernameInput.trim(),
        bio: bioInput.trim(),
      });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2500);
    }
  };

  const handleRequestVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    requestVerification(currentUser.id, verificationNoteInput);
    setVerificationSuccessMsg('Zahtevek za verifikacijo računa je bil uspešno poslan skrbnikom!');
    setTimeout(() => {
      setIsVerificationModalOpen(false);
      setVerificationSuccessMsg('');
      setVerificationNoteInput('');
    }, 1200);
  };

  const handleCancelVerificationRequest = () => {
    if (!currentUser) return;
    cancelVerificationRequest(currentUser.id);
  };

  // User profile menu and social links
  const userSocialLinks = currentUser.socialLinks || DEFAULT_SOCIAL_LINKS;
  const userProfileMenu = (currentUser.profileMenu && currentUser.profileMenu.length > 0)
    ? currentUser.profileMenu
    : DEFAULT_PROFILE_MENU;

  const sortedMenuTabs = [...userProfileMenu].sort((a, b) => a.order - b.order);
  const visibleTabs = sortedMenuTabs.filter(t => t.visible !== false);

  const currentTab = sortedMenuTabs.find(
    t => t.id === activeTabId || (t.type === 'builtIn' && t.builtInTab === activeTabId)
  ) || sortedMenuTabs[0];

  const handleSaveSocialLinks = (newLinks: SocialLink[]) => {
    updateUser(currentUser.id, { socialLinks: newLinks });
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
  };

  const handleSaveProfileMenu = (newMenu: ProfileMenuItem[]) => {
    updateUser(currentUser.id, { profileMenu: newMenu });
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 2500);
  };

  const handleQuickDeleteSocialLink = (id: string) => {
    const updated = userSocialLinks.filter(l => l.id !== id);
    handleSaveSocialLinks(updated);
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
    <div className="flex flex-col gap-space-md">
      {/* Profile Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 relative overflow-hidden flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative shrink-0">
          <img 
            alt={currentUser.name} 
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-md ring-4 ring-surface-container-lowest" 
            src={currentUser.avatar} 
          />
          <input 
            type="file" 
            id={`avatar-upload-${currentUser.id}`} 
            className="hidden" 
            accept="image/*"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const newAvatarUrl = reader.result as string;
                  updateUser(currentUser.id, { avatar: newAvatarUrl });
                  e.target.value = ''; // Reset input
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label 
            htmlFor={`avatar-upload-${currentUser.id}`}
            className="absolute bottom-1 right-1 p-2 bg-surface-container-highest hover:bg-surface-container text-on-surface rounded-full shadow-sm transition-colors border border-surface-container/50 cursor-pointer"
          >
            <Camera className="w-[1em] h-[1em] text-sm" />
          </label>
        </div>

        <div className="flex-1 min-w-0 z-10">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
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
              <span className="text-xs font-medium text-outline">
                {usernameInput}
              </span>
            </div>
            <p className="font-body-md text-on-surface-variant max-w-2xl text-xs sm:text-sm">
              {bioInput}
            </p>

            {/* Social Media Links Display in Header */}
            <SocialLinksDisplay 
              socialLinks={userSocialLinks} 
              canEdit={true} 
              onEditClick={() => setIsSocialEditorOpen(true)} 
            />
          </div>
          
          <div className="flex items-center gap-6 mt-4">
            <div className="flex flex-col">
              <span className="font-headline-sm text-lg font-bold text-on-surface">{myItems.length}</span>
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
            onClick={() => {
              const settingsTab = sortedMenuTabs.find(t => t.builtInTab === 'settings');
              setActiveTabId(settingsTab ? settingsTab.id : 'settings');
            }}
            className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md font-semibold transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-[1em] h-[1em] text-sm text-primary" />
            <span>Uredi profil</span>
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

      {/* Verification Request Banner for Registered Users */}
      {currentUser.role === 'registered' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-secondary/10 via-surface-container-low to-surface-container-low border border-secondary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-secondary/15 text-secondary shrink-0 mt-0.5 sm:mt-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                  Verifikacija računa (Preverjeni uporabnik)
                </h3>
                {currentUser.verificationRequested ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Čaka na pregled skrbnika
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-outline">
                    Registrirani član
                  </span>
                )}
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 max-w-2xl">
                {currentUser.verificationRequested
                  ? `Vaš zahtevek za preverjenega uporabnika je bil poslan ${currentUser.verificationRequestedAt ? new Date(currentUser.verificationRequestedAt).toLocaleDateString('sl-SI') : ''} in je v obravnavi. Po potrditvi prejmete značko Preverjen.`
                  : 'Pridobite uradno značko preverjenega uporabnika, večje zaupanje skupnosti ter možnost objavljanja ugodnosti, popustov in kuponov.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {currentUser.verificationRequested ? (
              <button
                type="button"
                onClick={handleCancelVerificationRequest}
                className="px-3.5 py-1.5 text-xs text-outline hover:text-error hover:bg-error/10 rounded-xl transition-colors font-medium"
              >
                Prekliči zahtevek
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Zahtevaj verifikacijo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Customizable Profile Menu Tabs */}
      <div className="flex items-center justify-between border-b border-surface-container px-2 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1 min-w-max">
          {visibleTabs.map((tab) => {
            const isActive = currentTab?.id === tab.id || (tab.type === 'builtIn' && currentTab?.builtInTab === tab.builtInTab);

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.type === 'externalLink' && tab.url) {
                    window.open(tab.url, '_blank', 'noopener,noreferrer');
                  } else {
                    setActiveTabId(tab.id);
                  }
                }}
                className={`px-4 py-3 font-label-md text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50 rounded-t-lg'
                }`}
                title={tab.label}
              >
                {getMenuTabIcon(tab.icon, "w-4 h-4")}
                <span>{tab.label}</span>
                {tab.type === 'externalLink' && (
                  <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuEditorOpen(true)}
          className="shrink-0 px-3 py-1.5 my-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-outline hover:text-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 border border-surface-container/60 shadow-2xs"
          title="Prilagodi profilni meni in zavihke"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prilagodi meni</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* Built-in Posts */}
        {currentTab?.type === 'builtIn' && currentTab.builtInTab === 'posts' && (
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="font-headline-sm text-lg font-bold text-on-surface">Moje objave</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Pregled vseh vaših objavljenih in čakajočih vsebin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposeModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova objava</span>
              </button>
            </div>

            {myItems.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 border border-surface-container/50">
                <FileText className="w-10 h-10 text-outline/40" />
                <div>
                  <h3 className="font-bold text-on-surface text-base">Še nimate oddanih objav</h3>
                  <p className="text-on-surface-variant text-xs mt-1 max-w-sm">
                    Delite novico, ustvarite mali oglas, objavite dogodek ali ugodnost za skupnost Portalko.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposeModalOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ustvari prvo objavo</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container/60 shadow-2xs flex flex-col sm:flex-row gap-4 justify-between"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-surface-container"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                            {item.type === 'ad' ? 'Mali oglas' : item.type === 'event' ? 'Dogodek' : item.type === 'deal' ? 'Ugodnost' : 'Članek / Novica'}
                          </span>
                          {item.category && (
                            <span className="text-[10px] text-outline">
                              • {item.category}
                            </span>
                          )}
                          {/* Status Badge */}
                          {item.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              <Clock className="w-2.5 h-2.5" />
                              Čaka na odobritev
                            </span>
                          )}
                          {(item.status === 'published' || item.status === 'active') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                              <CheckCircle className="w-2.5 h-2.5" />
                              Objavljeno
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/15 text-error border border-error/30">
                              <Ban className="w-2.5 h-2.5" />
                              Zavrnjeno
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-on-surface text-sm sm:text-base line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">
                          {item.content}
                        </p>

                        {item.status === 'rejected' && item.rejectionReason && (
                          <div className="mt-2 text-[11px] text-error bg-error/10 border border-error/20 rounded-lg p-2">
                            <span className="font-semibold">Razlog za zavrnitev:</span> {item.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0 border-t sm:border-t-0 border-surface-container pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPostItem(item);
                          setIsEditPostModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Uredi vsebino"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                        <span>Uredi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMyItem(item)}
                        className="px-3 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Izbriši objavo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Izbriši</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Built-in Saved */}
        {currentTab?.type === 'builtIn' && currentTab.builtInTab === 'saved' && (
          <SavedPostsTab />
        )}

        {/* Custom or External Link Tab */}
        {(currentTab?.type === 'custom' || currentTab?.type === 'externalLink') && (
          <CustomTabContent 
            item={currentTab} 
            canEdit={true} 
            onEditItem={() => setIsMenuEditorOpen(true)} 
          />
        )}

        {/* Built-in Settings */}
        {currentTab?.type === 'builtIn' && currentTab.builtInTab === 'settings' && (
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2 p-3 rounded-xl bg-surface-container-low/50 border border-surface-container">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-on-surface-variant font-bold">Vloga v sistemu:</span>
                  <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {currentUser.role}
                  </span>
                  {currentUser.role === 'registered' && (
                    currentUser.verificationRequested ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold ml-1">
                        <Clock className="w-3.5 h-3.5" />
                        Zahtevek za verifikacijo v pregledu
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsVerificationModalOpen(true)}
                        className="text-xs text-secondary hover:underline font-bold flex items-center gap-1 ml-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Zahtevaj preverjanje računa
                      </button>
                    )
                  )}
                  {currentUser.role === 'verified' && (
                    <span className="text-xs text-secondary flex items-center gap-1 font-bold ml-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Preverjen račun
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => { logout(); onViewChange('main'); }} 
                  className="px-3.5 py-1.5 rounded-xl bg-error/10 hover:bg-error/20 text-error font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors border border-error/20 self-start sm:self-auto"
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

            {/* Družbena omrežja in povezave */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
                <div className="flex items-center gap-2">
                  <Share2 className="w-[1em] h-[1em] text-primary text-lg" />
                  <div>
                    <h3 className="font-headline-sm text-base font-bold text-on-surface">Družbena omrežja in povezave</h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Povezave do vaših profilov (Instagram, LinkedIn, X, spletna stran...), vidne na vašem profilu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSocialEditorOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-label-md text-xs font-bold transition-colors flex items-center gap-1.5 border border-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upravljaj povezave</span>
                </button>
              </div>

              {userSocialLinks.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-surface-container bg-surface-container-low/30 text-center flex flex-col items-center gap-2">
                  <p className="text-xs text-on-surface-variant">Nimate še dodanih družbenih omrežij ali povezav.</p>
                  <button
                    type="button"
                    onClick={() => setIsSocialEditorOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors"
                  >
                    Dodaj prvo povezavo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userSocialLinks.map((link) => {
                    const formattedUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                    return (
                      <div 
                        key={link.id} 
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container hover:border-surface-container-highest transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-surface-container-highest text-primary shrink-0">
                            {getPlatformIcon(link.platform, "w-4 h-4")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate">
                              {link.label || getPlatformLabel(link.platform)}
                            </p>
                            <p className="text-[11px] text-outline truncate">{formattedUrl}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={formattedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                            title="Odpri povezavo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleQuickDeleteSocialLink(link.id)}
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors"
                            title="Odstrani"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Profilni meni & Navigacija */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
                <div className="flex items-center gap-2">
                  <Sliders className="w-[1em] h-[1em] text-primary text-lg" />
                  <div>
                    <h3 className="font-headline-sm text-base font-bold text-on-surface">Profilni meni & Navigacija</h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Prilagodite zavihke na svojem profilu, dodajte nove strani ali spremenite vrstni red
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuEditorOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-label-md text-xs font-bold transition-colors flex items-center gap-1.5 border border-primary/20"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Prilagodi profilni meni</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {sortedMenuTabs.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      item.visible
                        ? 'border-surface-container bg-surface-container-low/60'
                        : 'border-surface-container/50 bg-surface-container-low/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-surface-container-highest text-primary">
                        {getMenuTabIcon(item.icon, "w-4 h-4")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-on-surface">{item.label}</p>
                          {item.type === 'builtIn' ? (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-surface-container text-outline">
                              Sistemski
                            </span>
                          ) : item.type === 'externalLink' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-secondary/10 text-secondary">
                              Povezava
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                              Po meri
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-outline">
                          {item.visible ? 'Viden v profilnem meniju' : 'Skrit iz profilnega menija'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMenuEditorOpen(true)}
                      className="px-2.5 py-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container text-xs font-medium transition-colors"
                    >
                      Uredi
                    </button>
                  </div>
                ))}
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

      {/* Social Links Editor Modal */}
      <SocialLinksEditorModal
        isOpen={isSocialEditorOpen}
        onClose={() => setIsSocialEditorOpen(false)}
        socialLinks={userSocialLinks}
        onSave={handleSaveSocialLinks}
      />

      {/* Profile Menu Editor Modal */}
      <ProfileMenuEditorModal
        isOpen={isMenuEditorOpen}
        onClose={() => setIsMenuEditorOpen(false)}
        menuItems={userProfileMenu}
        onSave={handleSaveProfileMenu}
      />

      {/* Edit Post Modal for user's own posts */}
      <EditPostModal
        isOpen={isEditPostModalOpen}
        onClose={() => {
          setIsEditPostModalOpen(false);
          setEditingPostItem(null);
        }}
        item={editingPostItem}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        initialType="post"
      />

      {/* Verification Request Modal */}
      {isVerificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="w-full max-w-md bg-surface-container-lowest border border-surface-container rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-secondary/15 text-secondary">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">
                    Zahteva za preverjanje računa
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Status: Preverjeni uporabnik (Verified)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                ✕
              </button>
            </div>

            {verificationSuccessMsg ? (
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{verificationSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleRequestVerificationSubmit} className="flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant leading-relaxed flex flex-col gap-1.5">
                  <p className="font-semibold text-on-surface">Prednosti preverjenega uporabnika:</p>
                  <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
                    <li>Značka preverjenosti ob vašem imenu</li>
                    <li>Objavljanje posebnih ugodnosti, popustov in kuponov</li>
                    <li>Večje zaupanje kupcev in bralcev</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-xs font-semibold text-on-surface">
                    Razlog ali opis dejavnosti (neobvezno)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Npr. podjetje, spletna stran, dejavnost ali zakaj želite status preverjenega uporabnika..."
                    value={verificationNoteInput}
                    onChange={(e) => setVerificationNoteInput(e.target.value)}
                    className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface focus:border-primary outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-low">
                  <button
                    type="button"
                    onClick={() => setIsVerificationModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    Prekliči
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Pošlji zahtevek</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode={authModalMode} />
    </div>
  );
}
