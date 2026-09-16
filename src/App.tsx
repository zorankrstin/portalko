import { useState } from 'react';
import { Header } from './components/Header';
import { Ticker } from './components/Ticker';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { RightSidebarAds } from './components/RightSidebarAds';
import { RightSidebarEvents } from './components/RightSidebarEvents';
import { RightSidebarDeals } from './components/RightSidebarDeals';
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
import type { ViewMode } from './types';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'guest';
  const [currentView, setCurrentView] = useState<ViewMode>('main');
  const [isRlsModalOpen, setIsRlsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    // Smoothly scroll window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeClick = () => {
    setSearchQuery('');
    handleViewChange('main');
  };

  return (
    <div className="pb-20 lg:pb-0">
      <Header 
        onProfileClick={() => handleViewChange('profile')}
        onSavedClick={() => handleViewChange('saved')}
        onHomeClick={handleHomeClick}
        onAdminClick={() => handleViewChange('admin')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <Ticker onOpenRls={() => setIsRlsModalOpen(true)} />
      
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-margin-desktop py-space-md" id="main-content-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <LeftSidebar currentView={currentView} onViewChange={handleViewChange} />
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
              <BlogFeed onViewChange={handleViewChange} searchQuery={searchQuery} />
              <RightSidebar />
            </>
          )}
          {currentView === 'ads' && (
            <>
              <MaliOglasiFeed onViewChange={handleViewChange} searchQuery={searchQuery} />
              <RightSidebarAds />
            </>
          )}
          {currentView === 'events' && (
            <>
              <DogodkiFeed onViewChange={handleViewChange} searchQuery={searchQuery} />
              <RightSidebarEvents />
            </>
          )}
          {currentView === 'deals' && (
            <>
              <DealsFeed onViewChange={handleViewChange} searchQuery={searchQuery} />
              <RightSidebarDeals />
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
      
      <BottomNav currentView={currentView} onViewChange={handleViewChange} />
      <BackToTopButton />
      <RlsModal isOpen={isRlsModalOpen} onClose={() => setIsRlsModalOpen(false)} />
    </div>
  );
}
