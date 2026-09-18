import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Ticker } from './components/Ticker';
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
import type { ViewMode, PostDetailTarget, PostDetailType } from './types';
import { useAuth } from './contexts/AuthContext';
import { scrollToPageTop } from './utils/scrollUtils';

export default function App() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'guest';
  const [currentView, setCurrentView] = useState<ViewMode>('main');
  const [selectedPostTarget, setSelectedPostTarget] = useState<PostDetailTarget | null>(null);
  const [previousView, setPreviousView] = useState<ViewMode>('main');
  const [isRlsModalOpen, setIsRlsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Disable browser automatic scroll restoration to ensure reliable top-scroll
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Handle URL hash deep-linking (e.g. #deal-xyz, #event-xyz, #ad-xyz, #post-xyz)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        if (currentView === 'post-detail') {
          setCurrentView(previousView || 'main');
          setSelectedPostTarget(null);
        }
        return;
      }

      const match = hash.match(/^(deal|event|ad|post|blog)-(.+)$/);
      if (match) {
        let type = match[1] as PostDetailType;
        if (type === 'post') type = 'blog';
        const id = match[2];
        setSelectedPostTarget({ type, id });
        setCurrentView('post-detail');
        scrollToPageTop();
      }
    };

    // Check initial hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView, previousView]);

  // Global capture-phase click handler for any single post link across the portal
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      const match = href.match(/^#(deal|event|ad|post|blog)-(.+)$/);
      if (match) {
        e.preventDefault();
        let type = match[1] as PostDetailType;
        if (type === 'post') type = 'blog';
        const id = match[2];
        handleNavigatePost({ type, id });
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [currentView, previousView]);

  // Ensure scroll is at top whenever single post page is active or target changes
  useEffect(() => {
    if (currentView === 'post-detail' && selectedPostTarget) {
      scrollToPageTop();
    }
  }, [currentView, selectedPostTarget]);

  const handleNavigatePost = (target: PostDetailTarget) => {
    if (currentView !== 'post-detail') {
      setPreviousView(currentView);
    }
    setSelectedPostTarget(target);
    setCurrentView('post-detail');
    window.location.hash = `${target.type}-${target.id}`;
    scrollToPageTop();
  };

  const handleBackFromPost = () => {
    window.location.hash = '';
    const targetView = selectedPostTarget?.type === 'deal' ? 'deals' :
                       selectedPostTarget?.type === 'event' ? 'events' :
                       selectedPostTarget?.type === 'ad' ? 'ads' :
                       (selectedPostTarget?.type === 'blog' || selectedPostTarget?.type === 'post') ? 'blog' : previousView || 'main';
    setSelectedPostTarget(null);
    handleViewChange(targetView);
    scrollToPageTop();
  };

  const handleViewChange = (view: ViewMode) => {
    if (view !== 'post-detail') {
      window.location.hash = '';
      setSelectedPostTarget(null);
      setPreviousView(view);
    }
    setCurrentView(view);
    scrollToPageTop();
  };

  const handleHomeClick = () => {
    setSearchQuery('');
    handleViewChange('main');
  };

  // Active navigation view for left sidebar and bottom nav highlighting
  const activeNavView: ViewMode = currentView === 'post-detail' && selectedPostTarget
    ? (selectedPostTarget.type === 'deal' ? 'deals' :
       selectedPostTarget.type === 'event' ? 'events' :
       selectedPostTarget.type === 'ad' ? 'ads' :
       (selectedPostTarget.type === 'blog' || selectedPostTarget.type === 'post') ? 'blog' : previousView || 'main')
    : currentView;

  return (
    <div className="pb-20 lg:pb-0">
      <Header 
        onProfileClick={() => handleViewChange('profile')}
        onSavedClick={() => handleViewChange('saved')}
        onHomeClick={handleHomeClick}
        onAdminClick={() => handleViewChange('admin')}
        onNavigatePost={handleNavigatePost}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <Ticker onOpenRls={() => setIsRlsModalOpen(true)} />
      
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-margin-desktop py-space-md" id="main-content-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <LeftSidebar currentView={activeNavView} onViewChange={handleViewChange} />
          {currentView === 'post-detail' && selectedPostTarget && (
            <>
              <PostDetailPage 
                target={selectedPostTarget}
                onBack={handleBackFromPost}
                onNavigatePost={handleNavigatePost}
                onViewChange={handleViewChange}
              />
              {selectedPostTarget.type === 'deal' && <RightSidebarDeals onNavigatePost={handleNavigatePost} />}
              {selectedPostTarget.type === 'event' && <RightSidebarEvents onNavigatePost={handleNavigatePost} />}
              {selectedPostTarget.type === 'ad' && <RightSidebarAds onNavigatePost={handleNavigatePost} />}
              {(selectedPostTarget.type === 'blog' || selectedPostTarget.type === 'post') && (
                <RightSidebarBlog onNavigatePost={handleNavigatePost} />
              )}
            </>
          )}
          {currentView === 'main' && (
            <>
              <MainFeed searchQuery={searchQuery} onViewChange={handleViewChange} />
              <RightSidebar />
            </>
          )}
          {currentView === 'news' && (
            <>
              <NewsFeed onViewChange={handleViewChange} searchQuery={searchQuery} />
              <RightSidebar />
            </>
          )}
          {currentView === 'blog' && (
            <>
              <BlogFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
              <RightSidebarBlog onNavigatePost={handleNavigatePost} />
            </>
          )}
          {currentView === 'ads' && (
            <>
              <MaliOglasiFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
              <RightSidebarAds onNavigatePost={handleNavigatePost} />
            </>
          )}
          {currentView === 'events' && (
            <>
              <DogodkiFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
              <RightSidebarEvents onNavigatePost={handleNavigatePost} />
            </>
          )}
          {currentView === 'deals' && (
            <>
              <DealsFeed 
                onViewChange={handleViewChange} 
                searchQuery={searchQuery} 
                onNavigatePost={handleNavigatePost} 
              />
              <RightSidebarDeals onNavigatePost={handleNavigatePost} />
            </>
          )}
          {currentView === 'profile' && (
            <>
              <UserProfile onViewChange={handleViewChange} />
              <RightSidebar />
            </>
          )}
          {currentView === 'admin' && (
            <AdminDashboard />
          )}
          {currentView === 'saved' && (
            <>
              <SavedView searchQuery={searchQuery} />
              <RightSidebar />
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
