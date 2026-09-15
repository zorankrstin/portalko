import { useState } from 'react';
import { Settings, LayoutList, Store, Percent, Calendar, FileText, Network, PlusCircle, ChevronDown, Tag, CalendarPlus, PiggyBank, Map, Store as AddBusiness, Bookmark } from 'lucide-react';
import type { ViewMode } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LeftSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function LeftSidebar({ currentView, onViewChange }: LeftSidebarProps) {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'guest';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <aside className="hidden lg:block lg:col-span-3 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6">
      <div className="flex flex-col gap-space-md">
      
      {/* Glavna navigacija vira */}
      <nav className="bg-surface-container-lowest rounded-2xl p-2 shadow-sm border border-surface-container/50 flex flex-col gap-1">
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'main' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('main'); }}
          href="#"
        >
          <span className="flex items-center gap-2.5">
            <LayoutList className="w-[1em] h-[1em] text-lg" />
            <span>Vse objave</span>
          </span>
          <span className={`${currentView === 'main' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'} text-xs px-2 py-0.5 rounded-full font-bold`}>V živo</span>
        </a>
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'news' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('news'); }}
          href="#"
        >
          <span className="flex items-center gap-2.5">
            <Network className={`w-[1em] h-[1em] text-lg ${currentView === 'news' ? '' : 'text-primary'}`} />
            <span>Novice RSS</span>
          </span>
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">24/7</span>
        </a>
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'ads' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('ads'); }}
          href="#"
        >
          <span className="flex items-center gap-2.5">
            <Store className={`w-[1em] h-[1em] text-lg ${currentView === 'ads' ? '' : 'text-outline'}`} />
            <span>Mali oglasi</span>
          </span>
          <span className={`${currentView === 'ads' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'} text-xs px-2 py-0.5 rounded-full font-bold`}>1.240</span>
        </a>
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors cursor-pointer ${currentView === 'deals' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('deals'); }}
          href="#ugodnosti"
        >
          <span className="flex items-center gap-2.5">
            <Percent className={`w-[1em] h-[1em] text-lg ${currentView === 'deals' ? '' : 'text-secondary'}`} />
            <span>Ugodnosti &amp; Popusti</span>
          </span>
          <span className={`${currentView === 'deals' ? 'bg-primary-container text-on-primary-container' : 'bg-secondary-fixed text-on-secondary-fixed'} text-xs px-2 py-0.5 rounded-full font-bold`}>Novo</span>
        </a>
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'events' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('events'); }}
          href="#"
        >
          <span className="flex items-center gap-2.5">
            <Calendar className={`w-[1em] h-[1em] text-lg ${currentView === 'events' ? '' : 'text-tertiary-container'}`} />
            <span>Dogodki & Prireditve</span>
          </span>
          <span className={`${currentView === 'events' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'} text-xs px-2 py-0.5 rounded-full font-medium`}>Ta teden</span>
        </a>
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'blog' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('blog'); }}
          href="#"
        >
          <span className="flex items-center gap-2.5">
            <FileText className={`w-[1em] h-[1em] text-lg ${currentView === 'blog' ? '' : 'text-outline'}`} />
            <span>Blog & Članki</span>
          </span>
          <span className="bg-surface-container-high text-on-surface-variant text-xs px-2 py-0.5 rounded-full font-medium">20</span>
        </a>
        <a 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'saved' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
          onClick={(e) => { e.preventDefault(); onViewChange('saved'); }}
          href="#"
        >
          <span className="flex items-center gap-2.5">
            <Bookmark className={`w-[1em] h-[1em] text-lg ${currentView === 'saved' ? '' : 'text-primary'}`} />
            <span>Shranjeno</span>
          </span>
        </a>
        <a className="flex items-center justify-between px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-label-lg text-label-lg transition-colors" href="#">
          <span className="flex items-center gap-2.5">
            <Network className="w-[1em] h-[1em] text-lg text-outline" />
            <span>Spletni imenik</span>
          </span>
          <span className="text-outline text-xs">↗</span>
        </a>
        {(role === 'admin' || role === 'superadmin') && (
          <a 
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors ${currentView === 'admin' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`} 
            onClick={(e) => { e.preventDefault(); onViewChange('admin'); }}
            href="#"
          >
            <span className="flex items-center gap-2.5">
              <Settings className="w-[1em] h-[1em] text-lg text-error" />
              <span className="text-error font-semibold">Admin Panel</span>
            </span>
          </a>
        )}
      </nav>
      
      {/* Akcijski gumb Nova Objava z Dropdown menijem */}
      <div className="relative">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md hover:shadow transition-all" type="button"
        >
          <PlusCircle className="w-[1em] h-[1em] text-xl" />
          <span>Nova objava</span>
          <ChevronDown className="w-[1em] h-[1em] text-base ml-auto" />
        </button>
        
        {isMenuOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest rounded-2xl shadow-xl p-2 z-30 flex flex-col gap-1 border border-surface-container/70">
            <a className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors" href="#ustvari-oglas">
              <div className="flex items-center gap-2.5">
                <Tag className="w-[1em] h-[1em] text-primary text-lg" />
                <span className="font-label-md text-label-md font-semibold">Objavi mali oglas</span>
              </div>
              <span className="font-label-caps text-label-caps text-outline">Reg+</span>
            </a>
            <a className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors" href="#ustvari-blog">
              <div className="flex items-center gap-2.5">
                <FileText className="w-[1em] h-[1em] text-primary text-lg" />
                <span className="font-label-md text-label-md font-semibold">Napiši blog članek</span>
              </div>
              <span className="font-label-caps text-label-caps text-outline">Reg+</span>
            </a>
            <a className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors" href="#ustvari-dogodek">
              <div className="flex items-center gap-2.5">
                <CalendarPlus className="w-[1em] h-[1em] text-primary text-lg" />
                <span className="font-label-md text-label-md font-semibold">Objavi dogodek</span>
              </div>
              <span className="font-label-caps text-label-caps text-outline">Reg+</span>
            </a>
            <a className={`flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-container-low text-on-surface transition-colors ${role === 'registered' || role === 'guest' ? 'opacity-40 pointer-events-none' : ''}`} href="#ustvari-popust">
              <div className="flex items-center gap-2.5">
                <PiggyBank className="w-[1em] h-[1em] text-secondary text-lg" />
                <span className="font-label-md text-label-md font-semibold">Dodaj ugodnost / kupon</span>
              </div>
              <span className="font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed px-1.5 py-0.5 rounded font-bold">Preverjen+</span>
            </a>
          </div>
        )}
        <div className="mt-2">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-secondary-fixed/20 hover:bg-secondary-fixed text-on-secondary-fixed border border-secondary/40 font-label-md text-sm font-semibold transition-all" type="button">
            <AddBusiness className="w-[1em] h-[1em] text-secondary text-lg" />
            <span>Hitro oddaj oglas</span>
          </button>
        </div>
      </div>
      
      {/* Regionalni hitri filter */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Regije Slovenije</span>
          <Map className="w-[1em] h-[1em] text-xs text-outline" />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-xs font-semibold">Vse regije</button>
          <button className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-xs">Osrednjeslovenska</button>
          <button className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-xs">Podravska</button>
          <button className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-xs">Gorenjska</button>
          <button className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-xs">Obalno-kraška</button>
          <button className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-xs">Savinjska</button>
        </div>
      </div>
      
      <div className="px-2 text-outline font-label-md text-xs flex flex-wrap gap-x-2.5 gap-y-1">
        <a className="hover:text-primary transition-colors" href="#">Pogoji uporabe</a>
        <span>•</span>
        <a className="hover:text-primary transition-colors" href="#">Piškotki</a>
        <span>•</span>
        <a className="hover:text-primary transition-colors" href="#">RSS viri</a>
        <span>•</span>
        <a className="hover:text-primary transition-colors" href="#">Skupnost</a>
        <p className="w-full text-outline-variant font-label-caps text-label-caps pt-1">© 2025 Portalko • Vse pravice pridržane</p>
      </div>
      </div>
    </aside>
  );
}
