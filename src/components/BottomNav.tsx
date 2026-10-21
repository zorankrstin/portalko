import { Home, ShoppingBag, CalendarDays, User, Bookmark, Percent } from 'lucide-react';
import type { ViewMode } from '../types';

interface BottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  return (
    <nav 
      aria-label="Mobilna navigacija"
      className="lg:hidden fixed bottom-0 left-0 right-0 w-full max-w-full bg-white/95 backdrop-blur-md border-t border-surface-container/60 shadow-lg z-50 overflow-x-hidden touch-manipulation"
    >
      <div className="w-full max-w-lg mx-auto flex items-center justify-between px-0.5 sm:px-2 pt-1 pb-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <a 
          href="#domov"
          onClick={(e) => { e.preventDefault(); onViewChange('main'); }}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
            currentView === 'main' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
          title="Domov"
        >
          <Home className={`w-5 h-5 shrink-0 ${currentView === 'main' ? 'fill-primary/20 stroke-[2.2]' : ''}`} />
          <span className="text-[9px] xs:text-[10px] font-label-caps font-semibold leading-tight truncate max-w-full mt-0.5 text-center">
            Domov
          </span>
        </a>
        <a 
          href="#akcije"
          onClick={(e) => { e.preventDefault(); onViewChange('deals'); }}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
            currentView === 'deals' ? 'text-secondary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
          title="Akcije"
        >
          <Percent className={`w-5 h-5 shrink-0 ${currentView === 'deals' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[9px] xs:text-[10px] font-label-caps font-semibold leading-tight truncate max-w-full mt-0.5 text-center">
            Akcije
          </span>
        </a>
        <a 
          href="#mali-oglasi"
          onClick={(e) => { e.preventDefault(); onViewChange('ads'); }}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
            currentView === 'ads' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
          title="Mali oglasi"
        >
          <ShoppingBag className={`w-5 h-5 shrink-0 ${currentView === 'ads' ? 'fill-primary/20 stroke-[2.2]' : ''}`} />
          <span className="text-[9px] xs:text-[10px] font-label-caps font-semibold leading-tight truncate max-w-full mt-0.5 text-center">
            Oglasi
          </span>
        </a>
        <a 
          href="#dogodki"
          onClick={(e) => { e.preventDefault(); onViewChange('events'); }}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
            currentView === 'events' ? 'text-tertiary-container font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
          title="Dogodki"
        >
          <CalendarDays className={`w-5 h-5 shrink-0 ${currentView === 'events' ? 'fill-tertiary-container/20 stroke-[2.2]' : ''}`} />
          <span className="text-[9px] xs:text-[10px] font-label-caps font-semibold leading-tight truncate max-w-full mt-0.5 text-center">
            Dogodki
          </span>
        </a>
        <a 
          href="#shranjeno"
          onClick={(e) => { e.preventDefault(); onViewChange('saved'); }}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
            currentView === 'saved' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
          title="Shranjeno"
        >
          <Bookmark className={`w-5 h-5 shrink-0 ${currentView === 'saved' ? 'fill-primary/20 stroke-[2.2]' : ''}`} />
          <span className="text-[9px] xs:text-[10px] font-label-caps font-semibold leading-tight truncate max-w-full mt-0.5 text-center">
            Shranjeno
          </span>
        </a>
        <a 
          href="#profil"
          onClick={(e) => { e.preventDefault(); onViewChange('profile'); }}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
            currentView === 'profile' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
          title="Profil"
        >
          <User className={`w-5 h-5 shrink-0 ${currentView === 'profile' ? 'fill-primary/20 stroke-[2.2]' : ''}`} />
          <span className="text-[9px] xs:text-[10px] font-label-caps font-semibold leading-tight truncate max-w-full mt-0.5 text-center">
            Profil
          </span>
        </a>
      </div>
    </nav>
  );
}

