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
import type { ViewMode, PostDetailTarget, PostDetailType, AuthorProfileTarget } from './types';
import { useAuth } from './contexts/AuthContext';
import { scrollToPageTop, scrollToSidebarsTop } from './utils/scrollUtils';
import { parseSearchQuery, SearchCategory } from './utils/searchUtils';
import { updatePageSeo } from './utils/seoUtils';
import { initAnalyticsNavigationTracker } from './utils/analyticsUtils';
import { parseUrlPath, buildPostUrl, slugify, SECTION_TO_SLUG, VIEW_HASH_MAP } from './utils/urlUtils';

export { VIEW_HASH_MAP };

export default function App() {
  const { currentUser, confirmEmailWithToken, users } = useAuth();
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

      const parsed = parseUrlPath(window.location.pathname, window.location.hash);

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

  // Dynamic SEO & Title updates for views
  useEffect(() => {
    if (currentView === 'main') {
      updatePageSeo({
        title: 'Portalko – Slovenski portal za novice, male oglase in dogodke',
        description: 'Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.',
        url: `${window.location.origin}/`,
        canonicalUrl: `${window.location.origin}/`,
        type: 'website',
      });
    } else if (currentView === 'news') {
      updatePageSeo({
        title: 'Aktualne novice v Sloveniji – RSS viri v živo | Portalko',
        description: 'Zadnje novice iz osrednjih slovenskih medijev in RSS virov v živo. Preverite dogajanja v Sloveniji in po svetu.',
        url: `${window.location.origin}/novice`,
        canonicalUrl: `${window.location.origin}/novice`,
        type: 'website',
      });
    } else if (currentView === 'ads') {
      updatePageSeo({
        title: 'Mali oglasi Slovenija – Brezplačni spletni oglasi | Portalko',
        description: 'Brezplačni mali oglasi v Sloveniji. Rabljena in nova vozila, nepremičnine, elektronika, dom in storitve po slovenskih regijah.',
        url: `${window.location.origin}/mali-oglasi`,
        canonicalUrl: `${window.location.origin}/mali-oglasi`,
        type: 'website',
      });
    } else if (currentView === 'events') {
      updatePageSeo({
        title: 'Dogodki in prireditve v Sloveniji – Koledar dogodkov | Portalko',
        description: 'Koledar prireditev, koncertov, festivalov, športnih in kulturnih dogodkov po celotni Sloveniji.',
        url: `${window.location.origin}/dogodki`,
        canonicalUrl: `${window.location.origin}/dogodki`,
        type: 'website',
      });
    } else if (currentView === 'deals') {
      updatePageSeo({
        title: 'Akcije, popusti in ugodnosti v Sloveniji | Portalko',
        description: 'Preverjene akcije, promocijske kode, ugodnosti in popusti v slovenskih trgovinah ter na spletu.',
        url: `${window.location.origin}/akcije`,
        canonicalUrl: `${window.location.origin}/akcije`,
        type: 'website',
      });
    } else if (currentView === 'blog') {
      updatePageSeo({
        title: 'Blog & Zgodbe slovenske skupnosti | Portalko',
        description: 'Avtorske zgodbe, potopisi, lokalni vodiči in razmišljanja članov slovenske spletne skupnosti Portalko.',
        url: `${window.location.origin}/blog`,
        canonicalUrl: `${window.location.origin}/blog`,
        type: 'website',
      });
    } else if (currentView === 'saved') {
      updatePageSeo({
        title: 'Shranjene objave in zaznamki | Portalko',
        description: 'Vaše shranjene novice, mali oglasi, dogodki in ugodnosti na enem mestu za hiter dostop.',
        url: `${window.location.origin}/shranjeno`,
        canonicalUrl: `${window.location.origin}/shranjeno`,
        type: 'website',
      });
    } else if (currentView === 'admin') {
      updatePageSeo({
        title: 'Nadzorna plošča – Administracija portala | Portalko',
        description: 'Administrativno upravljanje vsebin, uporabnikov in nastavitev portala Portalko.',
        url: `${window.location.origin}/admin`,
        canonicalUrl: `${window.location.origin}/admin`,
        type: 'website',
      });
    } else if (currentView === 'profile') {
      const name = selectedAuthorProfile?.name || currentUser?.name || 'Uporabnik';
      const authorUrl = selectedAuthorProfile ? `${window.location.origin}/avtor/${slugify(name)}` : `${window.location.origin}/profil`;
      updatePageSeo({
        title: `Profil uporabnika: ${name} | Portalko`,
        description: `Oglejte si profil, objave in aktivnosti uporabnika ${name} na portalu Portalko.`,
        url: authorUrl,
        canonicalUrl: authorUrl,
        type: 'profile',
      });
    } else if (currentView === 'post-detail') {
      const title = postDetailTitle || selectedPostTarget?.initialData?.title;
      const cleanTitle = title ? `${title} | Portalko` : 'Objava | Portalko';
      const cleanUrl = postDetailMeta.cleanUrl || (typeof window !== 'undefined' ? window.location.href : 'https://portalko.net');
      updatePageSeo({
        title: cleanTitle,
        description: `Oglejte si podrobnosti objave na portalu Portalko.`,
        url: cleanUrl,
        canonicalUrl: cleanUrl,
        type: selectedPostTarget?.type === 'event' ? 'event' : (selectedPostTarget?.type === 'ad' || selectedPostTarget?.type === 'deal') ? 'product' : 'article',
      });
    }
  }, [currentView, selectedAuthorProfile, currentUser, postDetailTitle, selectedPostTarget, postDetailMeta]);

  // Global capture-phase click handler for any internal links across the portal
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
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

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
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
    const targetView = selectedPostTarget?.type === 'deal' ? 'deals' :
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
    <div className="pb-20 lg:pb-0">
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
      
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-margin-desktop py-space-md" id="main-content-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <LeftSidebar currentView={activeNavView} onViewChange={handleViewChange} />

          {/* Main central content with unified Breadcrumbs */}
          <main 
            id="main-content-area"
            className={`${currentView === 'admin' ? 'lg:col-span-10' : 'lg:col-span-7'} flex flex-col gap-space-md min-w-0 w-full`}
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
                  {selectedPostTarget.type === 'deal' && <RightSidebarDeals onNavigatePost={handleNavigatePost} />}
                  {selectedPostTarget.type === 'event' && <RightSidebarEvents onNavigatePost={handleNavigatePost} />}
                  {selectedPostTarget.type === 'ad' && <RightSidebarAds onNavigatePost={handleNavigatePost} />}
                  {selectedPostTarget.type === 'news' && <RightSidebarNews onNavigatePost={handleNavigatePost} />}
                  {(selectedPostTarget.type === 'blog' || selectedPostTarget.type === 'post') && (
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
      <RlsModal isOpen={isRlsModalOpen} onClose={() => setIsRlsModalOpen(false)} />
    </div>
  );
}
