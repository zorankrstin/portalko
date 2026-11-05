import { useState, useEffect, useRef } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { RightSidebarAds } from './components/RightSidebarAds';
import { RightSidebarEvents } from './components/RightSidebarEvents';
import { RightSidebarDeals } from './components/RightSidebarDeals';
import { RightSidebarBlog } from './components/RightSidebarBlog';
import { RightSidebarNews } from './components/RightSidebarNews';
import { MainFeed } from './components/MainFeed';
import { MaliOglasiFeed } from './components/MaliOglasiFeed';
import { DogodkiFeed } from './components/DogodkiFeed';
import { NewsFeed } from './components/NewsFeed';
import { BlogFeed } from './components/BlogFeed';
import { DealsFeed } from './components/DealsFeed';
import { UserProfile } from './components/UserProfile';
import { RlsModal } from './components/RlsModal';
import { BottomNav } from './components/BottomNav';
import { AdminDashboard } from './components/AdminDashboard';
import { SavedView } from './components/SavedView';
import { BackToTopButton } from './components/BackToTopButton';
import { PostDetailPage } from './components/PostDetailPage';
import { Breadcrumbs } from './components/Breadcrumbs';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { PromotionBannerZone } from './components/common/PromotionBannerZone';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import type { ViewMode, PostDetailTarget, PostDetailType, AuthorProfileTarget } from './types';
import { useAuth } from './contexts/AuthContext';
import { scrollToPageTop, scrollToSidebarsTop } from './utils/scrollUtils';
import { parseSearchQuery, SearchCategory } from './utils/searchUtils';
import { updatePageSeo } from './utils/seoUtils';
import { usePageSeo, DEFAULT_PAGE_SEO } from './services/seoSettingsService';
import { initAnalyticsNavigationTracker } from './utils/analyticsUtils';
import { parseUrlPath, buildPostUrl, slugify, SECTION_TO_SLUG, VIEW_HASH_MAP } from './utils/urlUtils';

export { VIEW_HASH_MAP };

export default function App() {
  const { currentUser, confirmEmailWithToken, users } = useAuth();
  const { seoMap } = usePageSeo();
  const role = currentUser?.role || 'guest';
  const [currentView, setCurrentView] = useState<ViewMode>('main');
  const [selectedPostTarget, setSelectedPostTarget] = useState<PostDetailTarget | null>(null);
  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState<AuthorProfileTarget | null>(null);
  const [previousView, setPreviousView] = useState<ViewMode>('main');
  const [postDetailTitle, setPostDetailTitle] = useState<string>('');
  const [postDetailMeta, setPostDetailMeta] = useState<{
    categoryName?: string;
    subcategoryName?: string;
    cleanUrl?: string;
  }>({});
  const [isRlsModalOpen, setIsRlsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationBanner, setVerificationBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [resetPasswordState, setResetPasswordState] = useState<{
    isOpen: boolean;
    token: string;
    email: string;
  }>({
    isOpen: false,
    token: '',
    email: '',
  });

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Check for email verification parameter on load (?verify-email=..., ?token=..., /verify-email/:token, etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('verify-email') || urlParams.get('confirm-token') || urlParams.get('token') || urlParams.get('verificationToken') || urlParams.get('verify');
    let emailParam = urlParams.get('email');

    // Handle spa_route fallback parameter from static host 404.html
    const spaRoute = urlParams.get('spa_route');
    if (spaRoute) {
      try {
        const decodedSpa = decodeURIComponent(spaRoute);
        const spaUrl = new URL(decodedSpa, window.location.origin);
        if (!token) {
          token = spaUrl.searchParams.get('verify-email') || spaUrl.searchParams.get('confirm-token') || spaUrl.searchParams.get('token') || spaUrl.searchParams.get('verificationToken') || spaUrl.searchParams.get('verify');
        }
        if (!emailParam) {
          emailParam = spaUrl.searchParams.get('email');
        }
      } catch (e) {
        // ignore
      }
    }

    // Handle clean path-based tokens e.g. /verify-email/:token or /potrdi-racun/:token
    if (!token) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (['verify-email', 'potrdi-racun', 'potrditev-racuna', 'confirm-email'].includes(parts[0]?.toLowerCase()) && parts[1]) {
        token = decodeURIComponent(parts[1]);
      }
    }

    // Handle hash-based tokens e.g. #verify-email=... or #token=...
    if (!token && window.location.hash) {
      const hashClean = window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashClean.includes('?') ? hashClean.split('?')[1] : hashClean);
      token = hashParams.get('verify-email') || hashParams.get('confirm-token') || hashParams.get('token');
      if (!emailParam) emailParam = hashParams.get('email');
    }

    if (token) {
      confirmEmailWithToken(token, emailParam || undefined).then((res) => {
        if (res.success) {
          setVerificationBanner({
            type: 'success',
            message: `🎉 Vaš e-poštni naslov je bil uspešno potrjen! Vaš račun (${res.user?.name}) je zdaj aktiviran in prijavljeni ste.`,
          });
        } else {
          setVerificationBanner({
            type: 'error',
            message: res.error || 'Povezava za potrditev e-pošte ni veljavna ali pa je že potekla.',
          });
        }

        // Clean up verification query params from the browser URL without full refresh
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('verify-email');
        newUrl.searchParams.delete('confirm-token');
        newUrl.searchParams.delete('token');
        newUrl.searchParams.delete('verificationToken');
        newUrl.searchParams.delete('verify');
        newUrl.searchParams.delete('email');
        newUrl.searchParams.delete('spa_route');
        const cleanPath = newUrl.pathname.replace(/\/+(verify-email|potrdi-racun|potrditev-racuna|confirm-email)(\/.*)?$/i, '/') + (newUrl.searchParams.toString() ? `?${newUrl.searchParams.toString()}` : '') + newUrl.hash;
        window.history.replaceState(null, '', cleanPath || '/');
      });
    }
  }, [confirmEmailWithToken]);

  // Check for password reset parameter on load (?reset-password=..., ?resetToken=..., etc.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    let resetToken = urlParams.get('reset-password') || urlParams.get('resetToken') || urlParams.get('reset_token') || urlParams.get('reset');
    let emailParam = urlParams.get('email') || '';

    // Handle spa_route fallback parameter from static host 404.html
    const spaRoute = urlParams.get('spa_route');
    if (spaRoute) {
      try {
        const decodedSpa = decodeURIComponent(spaRoute);
        const spaUrl = new URL(decodedSpa, window.location.origin);
        if (!resetToken) {
          resetToken = spaUrl.searchParams.get('reset-password') || spaUrl.searchParams.get('resetToken') || spaUrl.searchParams.get('reset_token') || spaUrl.searchParams.get('reset');
        }
        if (!emailParam) {
          emailParam = spaUrl.searchParams.get('email') || '';
        }
      } catch (e) {
        // ignore
      }
    }

    // Handle hash-based reset tokens e.g. #reset-password=...
    if (!resetToken && window.location.hash) {
      const hashClean = window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashClean.includes('?') ? hashClean.split('?')[1] : hashClean);
      resetToken = hashParams.get('reset-password') || hashParams.get('resetToken') || hashParams.get('reset_token') || hashParams.get('reset');
      if (!emailParam) emailParam = hashParams.get('email') || '';
    }

    if (resetToken) {
      setResetPasswordState({
        isOpen: true,
        token: resetToken,
        email: emailParam,
      });

      // Clean up url parameters without full page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('reset-password');
      newUrl.searchParams.delete('resetToken');
      newUrl.searchParams.delete('reset_token');
      newUrl.searchParams.delete('reset');
      newUrl.searchParams.delete('email');
      newUrl.searchParams.delete('spa_route');
      const cleanPath = newUrl.pathname + (newUrl.searchParams.toString() ? `?${newUrl.searchParams.toString()}` : '') + newUrl.hash;
      window.history.replaceState(null, '', cleanPath || '/');
    }
  }, []);

  // Disable browser automatic scroll restoration to ensure reliable top-scroll and init analytics tracker
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    initAnalyticsNavigationTracker();
  }, []);

  // Handle URL deep-linking (supporting clean /category/subcategory/title paths as well as legacy hash URLs)
  useEffect(() => {
    const handleRouteChange = () => {
      // Auto-migrate legacy /#ugodnosti or /ugodnosti to /#akcije or /akcije
      if (window.location.hash.toLowerCase() === '#ugodnosti') {
        window.history.replaceState(null, '', '#akcije');
      } else if (window.location.pathname.toLowerCase() === '/ugodnosti') {
        window.history.replaceState(null, '', '/akcije');
      }

      const parsed = parseUrlPath(window.location.pathname, window.location.hash, window.location.search);

      if (parsed.isPostDetail && parsed.target) {
        setSelectedAuthorProfile(null);
        setSelectedPostTarget(parsed.target);
        setCurrentView('post-detail');
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }

      if (parsed.author) {
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(parsed.author);
        setCurrentView('profile');
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }

      setSelectedPostTarget(null);
      setSelectedAuthorProfile(null);
      setPostDetailMeta({});
      setPostDetailTitle('');
      setCurrentView(parsed.view);
      scrollToPageTop();
      scrollToSidebarsTop();
    };

    // Check initial URL immediately on mount
    handleRouteChange();

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // Dynamic SEO & Title updates for views using custom admin settings or defaults
  useEffect(() => {
    if (currentView === 'profile') {
      const name = selectedAuthorProfile?.name || currentUser?.name || 'Uporabnik';
      const authorUrl = selectedAuthorProfile ? `${window.location.origin}/avtor/${slugify(name)}` : `${window.location.origin}/profil`;
      updatePageSeo({
        title: `Profil uporabnika: ${name} | Portalko`,
        description: `Oglejte si profil, objave, male oglase, dogodke in aktivnosti uporabnika ${name} na slovenskem portalu Portalko.`,
        url: authorUrl,
        canonicalUrl: authorUrl,
        type: 'profile',
      });
      return;
    }

    if (currentView === 'post-detail') {
      // PostDetailPage manages its own rich SEO metadata (title, excerpt, JSON-LD, image)
      return;
    }

    if (currentView === 'admin') {
      updatePageSeo({
        title: 'Nadzorna plošča – Administracija portala | Portalko',
        description: 'Administrativno upravljanje vsebin, uporabnikov in nastavitev portala Portalko.',
        url: `${window.location.origin}/admin`,
        canonicalUrl: `${window.location.origin}/admin`,
        type: 'website',
      });
      return;
    }

    // Lookup dynamic admin configuration or fallback to defaults
    const pageConfig = seoMap[currentView] || DEFAULT_PAGE_SEO[currentView];
    if (pageConfig) {
      const pageUrl = `${window.location.origin}${pageConfig.path === '/' ? '' : pageConfig.path}`;
      updatePageSeo({
        title: pageConfig.metaTitle,
        description: pageConfig.metaDescription,
        url: pageUrl,
        canonicalUrl: pageConfig.canonicalUrl || pageUrl,
        image: pageConfig.ogImage || '/favicon.png',
        type: 'website',
      });
    }
  }, [currentView, selectedAuthorProfile, currentUser, seoMap]);

  // Global click handler for internal links across the portal
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // If click was already handled or prevented by an inner component, do nothing
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a');
      if (anchor) {
        // Skip intercept if user held modifier key (Ctrl, Cmd, Shift, Alt, middle-click)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
          return;
        }

        const href = anchor.getAttribute('href') || '';
        
        // Skip external or special protocol links
        if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return;
        }
        if ((href.startsWith('http://') || href.startsWith('https://')) && !href.startsWith(window.location.origin)) {
          return;
        }

        // Check if this is an internal app route
        let path = href;
        if (href.startsWith('http')) {
          try {
            const urlObj = new URL(href);
            path = urlObj.pathname + urlObj.hash;
          } catch {
            return;
          }
        }

        const pathPart = path.split('#')[0] || '/';
        const hashPart = path.includes('#') ? '#' + path.split('#')[1] : '';

        // Parse path and hash
        const parsed = parseUrlPath(pathPart, hashPart);
        if (parsed.isPostDetail && parsed.target) {
          e.preventDefault();
          handleNavigatePost(parsed.target);
          return;
        }

        // Check legacy author hash or clean author path (/avtor/:name)
        const authorMatch = hashPart.match(/^#author-(.+)$/);
        if (authorMatch || parsed.author) {
          e.preventDefault();
          const decodedSlugOrName = authorMatch 
            ? decodeURIComponent(authorMatch[1]).replace(/_/g, ' ').trim() 
            : (parsed.author ? parsed.author.name.trim() : '');

          const explicitDataName = anchor.getAttribute('data-author-name') || target.getAttribute('data-author-name') || '';
          const dataId = anchor.getAttribute('data-author-id') || target.getAttribute('data-author-id') || undefined;
          const imgElem = target instanceof HTMLImageElement ? target : anchor.querySelector('img');
          const dataAvatar = anchor.getAttribute('data-author-avatar') || target.getAttribute('data-author-avatar') || imgElem?.getAttribute('src') || undefined;
          const dataRole = anchor.getAttribute('data-author-role') || target.getAttribute('data-author-role') || undefined;

          // Lookup canonical author from known users in auth context
          const currentUsers = usersRef.current || [];
          const matchedUser = currentUsers.find(u => 
            (dataId && u.id === dataId) ||
            (explicitDataName && (u.name.trim().toLowerCase() === explicitDataName.trim().toLowerCase() || slugify(u.name) === slugify(explicitDataName))) ||
            (decodedSlugOrName && (u.id === decodedSlugOrName || slugify(u.name) === slugify(decodedSlugOrName) || u.name.trim().toLowerCase() === decodedSlugOrName.toLowerCase()))
          );

          let finalAuthorName = '';
          if (matchedUser) {
            finalAuthorName = matchedUser.name;
          } else if (explicitDataName && explicitDataName.trim().toLowerCase() !== 'profil' && explicitDataName.trim().toLowerCase() !== 'profile' && explicitDataName.trim().toLowerCase() !== 'ogled profila') {
            finalAuthorName = explicitDataName.trim();
          } else if (decodedSlugOrName && decodedSlugOrName.toLowerCase() !== 'profil' && decodedSlugOrName.toLowerCase() !== 'profile') {
            finalAuthorName = decodedSlugOrName;
          } else {
            const rawText = anchor.textContent?.trim() || '';
            if (rawText && rawText.toLowerCase() !== 'profil' && rawText.toLowerCase() !== 'profile' && rawText.toLowerCase() !== 'ogled profila' && rawText.toLowerCase() !== 'ogled') {
              finalAuthorName = rawText;
            } else if (explicitDataName && explicitDataName.trim().toLowerCase() !== 'profil' && explicitDataName.trim().toLowerCase() !== 'profile') {
              finalAuthorName = explicitDataName.trim();
            } else if (decodedSlugOrName && decodedSlugOrName.toLowerCase() !== 'profil' && decodedSlugOrName.toLowerCase() !== 'profile') {
              finalAuthorName = decodedSlugOrName;
            }
          }

          if (!finalAuthorName || finalAuthorName.toLowerCase() === 'profil' || finalAuthorName.toLowerCase() === 'profile') {
            // Never navigate to /avtor/profil; cleanly open user's profile view
            handleViewChange('profile');
            return;
          }

          // Capture originating post target if clicked within a post card
          let fromPostTarget: PostDetailTarget | undefined;
          const postCardElem = target.closest('article, [data-post-id]');
          const postId = anchor.getAttribute('data-post-id') || target.getAttribute('data-post-id') || postCardElem?.getAttribute('data-post-id');
          const postType = (anchor.getAttribute('data-post-type') || target.getAttribute('data-post-type') || postCardElem?.getAttribute('data-post-type')) as PostDetailType | null;
          if (postId && postType) {
            fromPostTarget = {
              type: postType,
              id: postId,
              initialData: {
                title: anchor.getAttribute('data-post-title') || postCardElem?.getAttribute('data-post-title') || undefined,
                image: anchor.getAttribute('data-post-image') || postCardElem?.getAttribute('data-post-image') || undefined,
                category: anchor.getAttribute('data-post-category') || postCardElem?.getAttribute('data-post-category') || undefined,
                price: anchor.getAttribute('data-post-price') || postCardElem?.getAttribute('data-post-price') || undefined,
                location: anchor.getAttribute('data-post-location') || postCardElem?.getAttribute('data-post-location') || undefined,
              }
            };
          }

          handleAuthorClick({ 
            name: finalAuthorName,
            id: matchedUser?.id || dataId || undefined,
            avatar: matchedUser?.avatar || dataAvatar,
            role: matchedUser?.role || dataRole,
            fromPostTarget,
          });
          return;
        }
        if (pathPart !== window.location.pathname || (hashPart && hashPart !== window.location.hash)) {
          if (parsed.view) {
            e.preventDefault();
            handleViewChange(parsed.view);
            return;
          }
        }
      }

      // Check if user clicked on any post element or post card
      const postCard = target.closest('article, [data-post-card]');
      if (postCard) {
        const isActionBtn = target.closest('button, input, textarea, select, .no-scroll-trigger');
        if (!isActionBtn) {
          scrollToSidebarsTop();
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, false);
    return () => document.removeEventListener('click', handleDocumentClick, false);
  }, [currentView, previousView]);

  // Ensure scroll is at top whenever single post page is active or target changes
  useEffect(() => {
    if (currentView === 'post-detail' && selectedPostTarget) {
      scrollToPageTop();
      scrollToSidebarsTop();
    }
  }, [currentView, selectedPostTarget]);

  const handleNavigatePost = (target: PostDetailTarget) => {
    if (currentView !== 'post-detail') {
      setPreviousView(currentView);
    }
    setPostDetailTitle('');
    setPostDetailMeta({});
    setSelectedPostTarget(target);
    setCurrentView('post-detail');

    const cleanPath = buildPostUrl({
      type: target.type,
      id: target.id,
      title: target.initialData?.title,
      category: target.initialData?.category,
      categoryName: target.initialData?.categoryName,
      subcategory: target.initialData?.subcategory,
      subcategoryName: target.initialData?.subcategoryName,
    });
    if (window.location.pathname !== cleanPath || window.location.hash) {
      window.history.pushState({ type: target.type, id: target.id }, '', cleanPath);
    }
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleAuthorClick = (author: AuthorProfileTarget) => {
    if (!author || !author.name || author.name.trim().toLowerCase() === 'profil' || author.name.trim().toLowerCase() === 'profile') {
      handleViewChange('profile');
      return;
    }
    setSelectedAuthorProfile(author);
    if (currentView !== 'profile') {
      setPreviousView(currentView);
    }
    setCurrentView('profile');
    const authorSlug = slugify(author.name) || author.id || 'uporabnik';
    const cleanUrl = `/avtor/${authorSlug}`;
    if (window.location.pathname !== cleanUrl || window.location.hash) {
      window.history.pushState({ author: author.name }, '', cleanUrl);
    }
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleBackFromPost = () => {
    const isDeal = selectedPostTarget?.type === 'deal' || 
                   selectedPostTarget?.initialData?.type === 'deal' ||
                   selectedPostTarget?.initialData?.category === 'deal' ||
                   selectedPostTarget?.initialData?.category === 'ugodnosti' ||
                   selectedPostTarget?.initialData?.category === 'akcije' ||
                   selectedPostTarget?.id === 'ldy5f0a2hzqtibpfau6g';
    const targetView = isDeal ? 'deals' :
                       selectedPostTarget?.type === 'event' ? 'events' :
                       selectedPostTarget?.type === 'ad' ? 'ads' :
                       (selectedPostTarget?.type === 'blog' || selectedPostTarget?.type === 'post') ? 'blog' : previousView || 'main';
    setSelectedPostTarget(null);
    setPostDetailTitle('');
    setPostDetailMeta({});
    const cleanUrl = targetView === 'main' ? '/' : `/${SECTION_TO_SLUG[targetView] || targetView}`;
    if (window.location.pathname !== cleanUrl || window.location.hash) {
      window.history.pushState(null, '', cleanUrl);
    }
    handleViewChange(targetView);
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleBreadcrumbsBack = () => {
    if (currentView === 'post-detail') {
      handleBackFromPost();
    } else if (currentView === 'profile') {
      if (selectedAuthorProfile?.fromPostTarget) {
        const returnTarget = selectedAuthorProfile.fromPostTarget;
        setSelectedAuthorProfile(null);
        handleNavigatePost(returnTarget);
      } else {
        setSelectedAuthorProfile(null);
        handleViewChange(previousView && previousView !== 'profile' ? previousView : 'main');
      }
    } else {
      handleViewChange(previousView && previousView !== currentView ? previousView : 'main');
    }
  };

  const handleViewChange = (view: ViewMode) => {
    if (view !== 'profile') {
      setSelectedAuthorProfile(null);
    }
    if (view !== 'post-detail') {
      setPostDetailTitle('');
      setPostDetailMeta({});
    }
    if (view === 'profile') {
      setSelectedPostTarget(null);
      const cleanUrl = '/profil';
      if (window.location.pathname !== cleanUrl || window.location.hash) {
        window.history.pushState(null, '', cleanUrl);
      }
    } else if (view !== 'post-detail') {
      setSelectedPostTarget(null);
      const cleanUrl = view === 'main' ? '/' : `/${SECTION_TO_SLUG[view] || view}`;
      if (window.location.pathname !== cleanUrl || window.location.hash) {
        window.history.pushState(null, '', cleanUrl);
      }
    }
    if (currentView !== view && currentView !== 'post-detail') {
      setPreviousView(currentView);
    }
    setCurrentView(view);
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleHomeClick = () => {
    setSearchQuery('');
    setSelectedAuthorProfile(null);
    setSelectedPostTarget(null);
    setPostDetailTitle('');
    setPostDetailMeta({});
    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.pushState(null, '', '/');
    }
    handleViewChange('main');
  };

  // Active navigation view for left sidebar and bottom nav highlighting
  const activeNavView: ViewMode = currentView === 'post-detail' && selectedPostTarget
    ? (selectedPostTarget.type === 'deal' ? 'deals' :
       selectedPostTarget.type === 'event' ? 'events' :
       selectedPostTarget.type === 'ad' ? 'ads' :
       (selectedPostTarget.type === 'blog' || selectedPostTarget.type === 'post') ? 'blog' : previousView || 'main')
    : currentView;

  // Handle search changes with automatic execution from single post pages
  const handleSearchChange = (newQuery: string) => {
    setSearchQuery(newQuery);
    const { category, text } = parseSearchQuery(newQuery);

    // If on a single post page and a search query or category is selected
    if (currentView === 'post-detail') {
      const currentPostCategory: SearchCategory = 
        selectedPostTarget?.type === 'deal' ? 'deals' :
        selectedPostTarget?.type === 'event' ? 'events' :
        selectedPostTarget?.type === 'ad' ? 'ads' :
        (selectedPostTarget?.type === 'blog' || selectedPostTarget?.type === 'post') ? 'blog' : 'all';

      // Execute search immediately if text is entered or category is switched
      if (text.trim().length > 0 || (category !== 'all' && category !== currentPostCategory)) {
        const targetCategoryView: ViewMode = category !== 'all'
          ? (category as ViewMode)
          : (activeNavView !== 'post-detail' ? activeNavView : 'main');

        setSelectedPostTarget(null);
        window.location.hash = '';
        setCurrentView(targetCategoryView);
        scrollToPageTop();
        scrollToSidebarsTop();
      }
    }
  };

  // Handle explicit search submission (e.g. Enter key or Search button click)
  const handleSearchSubmit = (submittedQuery: string) => {
    setSearchQuery(submittedQuery);
    const { category } = parseSearchQuery(submittedQuery);

    if (currentView === 'post-detail') {
      const targetCategoryView: ViewMode = category !== 'all'
        ? (category as ViewMode)
        : (activeNavView !== 'post-detail' ? activeNavView : 'main');

      setSelectedPostTarget(null);
      window.location.hash = '';
      setCurrentView(targetCategoryView);
      scrollToPageTop();
      scrollToSidebarsTop();
    }
  };

  return (
    <div className="pb-20 lg:pb-0 min-h-screen w-full max-w-full overflow-x-clip">
      <Header 
        onProfileClick={() => {
          setSelectedAuthorProfile(null);
          handleViewChange('profile');
        }}
        onSavedClick={() => handleViewChange('saved')}
        onHomeClick={handleHomeClick}
        onAdminClick={() => handleViewChange('admin')}
        onNavigatePost={handleNavigatePost}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        activeView={activeNavView}
      />

      {verificationBanner && (
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-margin-desktop pt-3">
          <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md border animate-in fade-in duration-200 ${
            verificationBanner.type === 'success'
              ? 'bg-secondary/15 border-secondary/30 text-on-surface'
              : 'bg-error/15 border-error/30 text-error'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                verificationBanner.type === 'success' ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'
              }`}>
                {verificationBanner.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <p className="font-body-md text-sm font-medium">
                {verificationBanner.message}
              </p>
            </div>
            <button
              onClick={() => setVerificationBanner(null)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-on-surface-variant transition-colors"
              title="Zapri"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl 2xl:max-w-[1400px] w-full mx-auto px-4 lg:px-6 xl:px-margin-desktop py-space-md" id="main-content-container">
        <div 
          className={`grid grid-cols-1 ${
            currentView === 'admin' 
              ? 'lg:grid-cols-[176px_minmax(0,1fr)] xl:grid-cols-[188px_minmax(0,1fr)]' 
              : 'lg:grid-cols-[176px_minmax(0,1fr)_336px] xl:grid-cols-[188px_minmax(0,1fr)_340px]'
          } gap-space-lg items-start`}
        >
          <LeftSidebar currentView={activeNavView} onViewChange={handleViewChange} />

          {/* Main central content with unified Breadcrumbs */}
          <main 
            id="main-content-area"
            className="flex flex-col gap-space-md min-w-0 w-full"
          >
            <Breadcrumbs 
              currentView={currentView}
              previousView={previousView}
              selectedPostTarget={selectedPostTarget}
              postTitle={postDetailTitle}
              categoryName={postDetailMeta.categoryName}
              subcategoryName={postDetailMeta.subcategoryName}
              postUrl={postDetailMeta.cleanUrl}
              selectedAuthorProfile={selectedAuthorProfile}
              searchQuery={searchQuery}
              onViewChange={handleViewChange}
              onHomeClick={handleHomeClick}
              onBack={handleBreadcrumbsBack}
              onClearSearch={() => handleSearchChange('')}
            />

            {/* Promocijska pasica v glavnem vsebniku */}
            {currentView !== 'admin' && (
              <PromotionBannerZone position="main_container" />
            )}

            {currentView === 'post-detail' && selectedPostTarget && (
              <PostDetailPage 
                target={selectedPostTarget}
                onBack={handleBackFromPost}
                onNavigatePost={handleNavigatePost}
                onViewChange={handleViewChange}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                onAuthorClick={handleAuthorClick}
                onTitleLoaded={(title, meta) => {
                  setPostDetailTitle(title);
                  if (meta) {
                    setPostDetailMeta(meta);
                  }
                }}
              />
            )}
            {currentView === 'main' && (
              <MainFeed 
                searchQuery={searchQuery} 
                onViewChange={handleViewChange} 
                onNavigatePost={handleNavigatePost}
                onAuthorClick={handleAuthorClick}
              />
            )}
            {currentView === 'news' && (
              <NewsFeed onViewChange={handleViewChange} searchQuery={searchQuery} />
            )}
            {currentView === 'blog' && (
              <BlogFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
            )}
            {currentView === 'ads' && (
              <MaliOglasiFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
            )}
            {currentView === 'events' && (
              <DogodkiFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
                onAuthorClick={handleAuthorClick}
              />
            )}
            {currentView === 'deals' && (
              <DealsFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
            )}
            {currentView === 'profile' && (
              <UserProfile 
                onViewChange={handleViewChange}
                targetAuthor={selectedAuthorProfile}
                onClearTargetAuthor={() => {
                  setSelectedAuthorProfile(null);
                  if (selectedPostTarget) {
                    handleNavigatePost(selectedPostTarget);
                  } else {
                    handleViewChange(previousView || 'main');
                  }
                  scrollToPageTop();
                  scrollToSidebarsTop();
                }}
                onNavigatePost={handleNavigatePost}
              />
            )}
            {currentView === 'admin' && (
              <AdminDashboard 
                onAuthorClick={handleAuthorClick}
                onViewChange={handleViewChange}
                onNavigatePost={handleNavigatePost}
              />
            )}
            {currentView === 'saved' && (
              <SavedView searchQuery={searchQuery} />
            )}
          </main>

          {/* Right sidebar column (hidden in admin view) */}
          {currentView !== 'admin' && (
            <>
              {currentView === 'post-detail' && selectedPostTarget ? (
                <>
                  {(selectedPostTarget.type === 'deal' ||
                    selectedPostTarget.initialData?.type === 'deal' ||
                    selectedPostTarget.initialData?.category === 'deal' ||
                    selectedPostTarget.initialData?.category === 'ugodnosti' ||
                    selectedPostTarget.initialData?.category === 'akcije' ||
                    selectedPostTarget.id?.startsWith('deal-') ||
                    selectedPostTarget.id === 'ldy5f0a2hzqtibpfau6g') ? (
                    <RightSidebarDeals onNavigatePost={handleNavigatePost} />
                  ) : (selectedPostTarget.type === 'event' ||
                       selectedPostTarget.initialData?.type === 'event' ||
                       selectedPostTarget.initialData?.category === 'event' ||
                       selectedPostTarget.initialData?.category === 'dogodki' ||
                       selectedPostTarget.id?.startsWith('event-')) ? (
                    <RightSidebarEvents onNavigatePost={handleNavigatePost} />
                  ) : (selectedPostTarget.type === 'ad' ||
                       selectedPostTarget.initialData?.type === 'ad' ||
                       selectedPostTarget.initialData?.category === 'ad' ||
                       selectedPostTarget.initialData?.category === 'oglasi' ||
                       selectedPostTarget.id?.startsWith('ad-')) ? (
                    <RightSidebarAds onNavigatePost={handleNavigatePost} />
                  ) : (selectedPostTarget.type === 'news' ||
                       selectedPostTarget.initialData?.type === 'news' ||
                       selectedPostTarget.initialData?.category === 'news' ||
                       selectedPostTarget.initialData?.category === 'novice' ||
                       selectedPostTarget.id?.startsWith('news-')) ? (
                    <RightSidebarNews onNavigatePost={handleNavigatePost} />
                  ) : (
                    <RightSidebarBlog onNavigatePost={handleNavigatePost} />
                  )}
                </>
              ) : currentView === 'blog' ? (
                <RightSidebarBlog onNavigatePost={handleNavigatePost} />
              ) : currentView === 'ads' ? (
                <RightSidebarAds onNavigatePost={handleNavigatePost} />
              ) : currentView === 'events' ? (
                <RightSidebarEvents onNavigatePost={handleNavigatePost} />
              ) : currentView === 'deals' ? (
                <RightSidebarDeals onNavigatePost={handleNavigatePost} />
              ) : currentView === 'news' ? (
                <RightSidebarNews onNavigatePost={handleNavigatePost} />
              ) : (
                <RightSidebar onNavigatePost={handleNavigatePost} />
              )}
            </>
          )}
        </div>
      </div>
      
      <BottomNav currentView={activeNavView} onViewChange={handleViewChange} />
      <BackToTopButton />
      <CookieConsentBanner />
      <RlsModal isOpen={isRlsModalOpen} onClose={() => setIsRlsModalOpen(false)} />
      {resetPasswordState.isOpen && (
        <ResetPasswordModal
          isOpen={resetPasswordState.isOpen}
          token={resetPasswordState.token}
          email={resetPasswordState.email}
          onClose={() => setResetPasswordState({ isOpen: false, token: '', email: '' })}
          onSuccess={() => {
            setResetPasswordState({ isOpen: false, token: '', email: '' });
            setVerificationBanner({
              type: 'success',
              message: '🎉 Vaše geslo je bilo uspešno posodobljeno! Zdaj se lahko prijavite z novim geslom.',
            });
          }}
        />
      )}
    </div>
  );
}
