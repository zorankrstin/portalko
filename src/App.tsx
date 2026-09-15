import { useState } from 'react';
import { Header } from './components/Header';
import { Ticker } from './components/Ticker';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { RightSidebarAds } from './components/RightSidebarAds';
import { RightSidebarEvents } from './components/RightSidebarEvents';
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

  return (
    <div className="pb-20 lg:pb-0">
      <Header 
        onProfileClick={() => setCurrentView('profile')}
        onSavedClick={() => setCurrentView('saved')}
        onHomeClick={() => setCurrentView('main')}
        onAdminClick={() => setCurrentView('admin')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <Ticker onOpenRls={() => setIsRlsModalOpen(true)} />
      
      <div className="max-w-7xl w-full mx-auto px-4 lg:px-margin-desktop py-space-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          <LeftSidebar currentView={currentView} onViewChange={setCurrentView} />
          {currentView === 'main' && (
            <>
              <MainFeed searchQuery={searchQuery} />
              <RightSidebar />
            </>
          )}
          {currentView === 'news' && (
            <>
              <NewsFeed onViewChange={setCurrentView} searchQuery={searchQuery} />
              <RightSidebar />
            </>
          )}
          {currentView === 'blog' && (
            <>
              <BlogFeed onViewChange={setCurrentView} searchQuery={searchQuery} />
              <RightSidebar />
            </>
          )}
          {currentView === 'ads' && (
            <>
              <MaliOglasiFeed onViewChange={setCurrentView} searchQuery={searchQuery} />
              <RightSidebarAds />
            </>
          )}
          {currentView === 'events' && (
            <>
              <DogodkiFeed onViewChange={setCurrentView} searchQuery={searchQuery} />
              <RightSidebarEvents />
            </>
          )}
          {currentView === 'deals' && (
            <DealsFeed onViewChange={setCurrentView} searchQuery={searchQuery} />
          )}
          {currentView === 'profile' && (
            <>
              <UserProfile onViewChange={setCurrentView} />
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
      
      <BottomNav currentView={currentView} onViewChange={setCurrentView} />
      <BackToTopButton />
      <RlsModal isOpen={isRlsModalOpen} onClose={() => setIsRlsModalOpen(false)} />
    </div>
  );
}
