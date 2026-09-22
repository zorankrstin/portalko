import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { RightSidebarAds } from './components/RightSidebarAds';
import { RightSidebarEvents } from './components/RightSidebarEvents';
import { RightSidebarDeals } from './components/RightSidebarDeals';
import { RightSidebarBlog } from './components/RightSidebarBlog';
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

export const VIEW_HASH_MAP: Record<ViewMode, string> = {
  main: 'domov',
  news: 'novice',
  ads: 'mali-oglasi',
  deals: 'ugodnosti',
  events: 'dogodki',
  blog: 'blog',
  saved: 'shranjeno',
  admin: 'admin',
  profile: 'profil',
  'post-detail': '',
};

export default function App() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'guest';
  const [currentView, setCurrentView] = useState<ViewMode>('main');
  const [selectedPostTarget, setSelectedPostTarget] = useState<PostDetailTarget | null>(null);
  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState<AuthorProfileTarget | null>(null);
  const [previousView, setPreviousView] = useState<ViewMode>('main');
  const [postDetailTitle, setPostDetailTitle] = useState<string>('');
  const [isRlsModalOpen, setIsRlsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Disable browser automatic scroll restoration to ensure reliable top-scroll
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Handle URL hash deep-linking (e.g. #domov, #novice, #mali-oglasi, #ugodnosti, #dogodki, #blog, #shranjeno, #admin, #deal-xyz, #event-xyz, #ad-xyz, #post-xyz)
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!rawHash || rawHash === 'domov') {
        if (currentView !== 'main') {
          setCurrentView('main');
          setSelectedPostTarget(null);
          setSelectedAuthorProfile(null);
          scrollToPageTop();
          scrollToSidebarsTop();
        }
        return;
      }

      const lowerHash = rawHash.toLowerCase();

      // Check standard view routes
      if (lowerHash === 'novice' || lowerHash === 'news') {
        setCurrentView('news');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'mali-oglasi' || lowerHash === 'oglasi' || lowerHash === 'ads') {
        setCurrentView('ads');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'ugodnosti' || lowerHash === 'popusti' || lowerHash === 'deals') {
        setCurrentView('deals');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'dogodki' || lowerHash === 'events') {
        setCurrentView('events');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'blog' || lowerHash === 'clanki') {
        setCurrentView('blog');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'shranjeno' || lowerHash === 'zaznamki' || lowerHash === 'saved') {
        setCurrentView('saved');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'admin' || lowerHash === 'nadzorna-plosca') {
        setCurrentView('admin');
        setSelectedPostTarget(null);
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }
      if (lowerHash === 'profil' || lowerHash === 'profile') {
        setCurrentView('profile');
        setSelectedPostTarget(null);
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }

      const authorMatch = rawHash.match(/^author-(.+)$/);
      if (authorMatch) {
        const decodedName = decodeURIComponent(authorMatch[1]).replace(/_/g, ' ');
        setSelectedAuthorProfile({ name: decodedName });
        setCurrentView('profile');
        scrollToPageTop();
        scrollToSidebarsTop();
        return;
      }

      const match = rawHash.match(/^(deal|event|ad|post|blog)-(.+)$/);
      if (match) {
        let type = match[1] as PostDetailType;
        if (type === 'post') type = 'blog';
        const id = match[2];
        setSelectedPostTarget({ type, id });
        setCurrentView('post-detail');
        scrollToPageTop();
        scrollToSidebarsTop();
      }
    };

    // Check initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView, previousView]);

  // Dynamic SEO & Title updates for views
  useEffect(() => {
    if (currentView === 'main') {
      updatePageSeo({
        title: 'Portalko – Slovenski portal za novice, male oglase in dogodke',
        description: 'Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.',
        url: `${window.location.origin}${window.location.pathname}#domov`,
        canonicalUrl: `${window.location.origin}${window.location.pathname}`,
        type: 'website',
      });
    } else if (currentView === 'news') {
      updatePageSeo({
        title: 'Aktualne novice v Sloveniji – RSS viri v živo | Portalko',
        description: 'Zadnje novice iz osrednjih slovenskih medijev in RSS virov v živo. Preverite dogajanja v Sloveniji in po svetu.',
        url: `${window.location.origin}${window.location.pathname}#novice`,
        type: 'website',
      });
    } else if (currentView === 'ads') {
      updatePageSeo({
        title: 'Mali oglasi Slovenija – Brezplačni spletni oglasi | Portalko',
        description: 'Brezplačni mali oglasi v Sloveniji. Rabljena in nova vozila, nepremičnine, elektronika, dom in storitve po slovenskih regijah.',
        url: `${window.location.origin}${window.location.pathname}#mali-oglasi`,
        type: 'website',
      });
    } else if (currentView === 'events') {
      updatePageSeo({
        title: 'Dogodki in prireditve v Sloveniji – Koledar dogodkov | Portalko',
        description: 'Koledar prireditev, koncertov, festivalov, športnih in kulturnih dogodkov po celotni Sloveniji.',
        url: `${window.location.origin}${window.location.pathname}#dogodki`,
        type: 'website',
      });
    } else if (currentView === 'deals') {
      updatePageSeo({
        title: 'Ugodnosti, popusti in kuponi v Sloveniji | Portalko',
        description: 'Preverjene ugodnosti, promocijske kode, akcije in popusti v slovenskih trgovinah ter na spletu.',
        url: `${window.location.origin}${window.location.pathname}#ugodnosti`,
        type: 'website',
      });
    } else if (currentView === 'blog') {
      updatePageSeo({
        title: 'Blog & Zgodbe slovenske skupnosti | Portalko',
        description: 'Avtorske zgodbe, potopisi, lokalni vodiči in razmišljanja članov slovenske spletne skupnosti Portalko.',
        url: `${window.location.origin}${window.location.pathname}#blog`,
        type: 'website',
      });
    } else if (currentView === 'saved') {
      updatePageSeo({
        title: 'Shranjene objave in zaznamki | Portalko',
        description: 'Vaše shranjene novice, mali oglasi, dogodki in ugodnosti na enem mestu za hiter dostop.',
        url: `${window.location.origin}${window.location.pathname}#shranjeno`,
        type: 'website',
      });
    } else if (currentView === 'admin') {
      updatePageSeo({
        title: 'Nadzorna plošča – Administracija portala | Portalko',
        description: 'Administrativno upravljanje vsebin, uporabnikov in nastavitev portala Portalko.',
        url: `${window.location.origin}${window.location.pathname}#admin`,
        type: 'website',
      });
    } else if (currentView === 'profile') {
      const name = selectedAuthorProfile?.name || currentUser?.name || 'Uporabnik';
      updatePageSeo({
        title: `Profil uporabnika: ${name} | Portalko`,
        description: `Oglejte si profil, objave in aktivnosti uporabnika ${name} na portalu Portalko.`,
        url: `${window.location.origin}${window.location.pathname}#profil`,
        type: 'profile',
      });
    }
  }, [currentView, selectedAuthorProfile, currentUser]);

  // Global capture-phase click handler for any single post link across the portal
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        const authorMatch = href.match(/^#author-(.+)$/);
        if (authorMatch) {
          e.preventDefault();
          const decodedName = decodeURIComponent(authorMatch[1]).replace(/_/g, ' ');
          handleAuthorClick({ name: decodedName });
          return;
        }
        const match = href.match(/^#(deal|event|ad|post|blog)-(.+)$/);
        if (match) {
          e.preventDefault();
          let type = match[1] as PostDetailType;
          if (type === 'post') type = 'blog';
          const id = match[2];
          handleNavigatePost({ type, id });
          scrollToSidebarsTop();
          return;
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
    setSelectedPostTarget(target);
    setCurrentView('post-detail');
    window.location.hash = `${target.type}-${target.id}`;
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleAuthorClick = (author: AuthorProfileTarget) => {
    setSelectedAuthorProfile(author);
    if (currentView !== 'profile') {
      setPreviousView(currentView);
    }
    setCurrentView('profile');
    window.location.hash = `author-${encodeURIComponent(author.name.replace(/\s+/g, '_'))}`;
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleBackFromPost = () => {
    window.location.hash = '';
    const targetView = selectedPostTarget?.type === 'deal' ? 'deals' :
                       selectedPostTarget?.type === 'event' ? 'events' :
                       selectedPostTarget?.type === 'ad' ? 'ads' :
                       (selectedPostTarget?.type === 'blog' || selectedPostTarget?.type === 'post') ? 'blog' : previousView || 'main';
    setSelectedPostTarget(null);
    setPostDetailTitle('');
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
        setSelectedPostTarget(returnTarget);
        setCurrentView('post-detail');
        window.location.hash = `${returnTarget.type}-${returnTarget.id}`;
        setSelectedAuthorProfile(null);
        scrollToPageTop();
        scrollToSidebarsTop();
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
    }
    if (view !== 'post-detail' && view !== 'profile') {
      setSelectedPostTarget(null);
      setPreviousView(view);
      const targetHash = VIEW_HASH_MAP[view] || '';
      if (window.location.hash.replace(/^#\/?/, '') !== targetHash) {
        window.location.hash = targetHash;
      }
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
    window.location.hash = 'domov';
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
      
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-margin-desktop py-space-md" id="main-content-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <LeftSidebar currentView={activeNavView} onViewChange={handleViewChange} />

          {/* Main central content with unified Breadcrumbs */}
          <main 
            id="main-content-area"
            className={`${currentView === 'admin' ? 'lg:col-span-9' : 'lg:col-span-6'} flex flex-col gap-space-md min-w-0 w-full`}
          >
            <Breadcrumbs 
              currentView={currentView}
              previousView={previousView}
              selectedPostTarget={selectedPostTarget}
              postTitle={postDetailTitle}
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
                onTitleLoaded={setPostDetailTitle}
              />
            )}
            {currentView === 'main' && (
              <MainFeed searchQuery={searchQuery} onViewChange={handleViewChange} />
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
                    setCurrentView('post-detail');
                    window.location.hash = `${selectedPostTarget.type}-${selectedPostTarget.id}`;
                  } else {
                    window.location.hash = '';
                    setCurrentView(previousView || 'main');
                  }
                  scrollToPageTop();
                  scrollToSidebarsTop();
                }}
                onNavigatePost={handleNavigatePost}
              />
            )}
            {currentView === 'admin' && (
              <AdminDashboard />
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
              ) : (
                <RightSidebar />
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
