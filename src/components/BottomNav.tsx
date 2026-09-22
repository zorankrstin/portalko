import { Home, ShoppingBag, CalendarDays, User, Bookmark, Percent } from 'lucide-react';
import type { ViewMode } from '../types';

interface BottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-container/50 flex items-center justify-around pb-safe pt-2 px-1 z-50">
      <a 
        href="#domov"
        onClick={(e) => { e.preventDefault(); onViewChange('main'); }}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[3.2rem] transition-colors ${currentView === 'main' ? 'text-primary' : 'text-on-surface-variant'}`}
      >
        <Home className={`w-5 h-5 ${currentView === 'main' ? 'fill-primary/20' : ''}`} />
        <span className="text-[10px] font-label-caps font-semibold">Domov</span>
      </a>
      <a 
        href="#ugodnosti"
        onClick={(e) => { e.preventDefault(); onViewChange('deals'); }}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[3.2rem] transition-colors ${currentView === 'deals' ? 'text-secondary' : 'text-on-surface-variant'}`}
      >
        <Percent className={`w-5 h-5 ${currentView === 'deals' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[10px] font-label-caps font-semibold">Popusti</span>
      </a>
      <a 
        href="#mali-oglasi"
        onClick={(e) => { e.preventDefault(); onViewChange('ads'); }}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[3.2rem] transition-colors ${currentView === 'ads' ? 'text-primary' : 'text-on-surface-variant'}`}
      >
        <ShoppingBag className={`w-5 h-5 ${currentView === 'ads' ? 'fill-primary/20' : ''}`} />
        <span className="text-[10px] font-label-caps font-semibold">Oglasi</span>
      </a>
      <a 
        href="#dogodki"
        onClick={(e) => { e.preventDefault(); onViewChange('events'); }}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[3.2rem] transition-colors ${currentView === 'events' ? 'text-tertiary-container' : 'text-on-surface-variant'}`}
      >
        <CalendarDays className={`w-5 h-5 ${currentView === 'events' ? 'fill-tertiary-container/20' : ''}`} />
        <span className="text-[10px] font-label-caps font-semibold">Dogodki</span>
      </a>
      <a 
        href="#shranjeno"
        onClick={(e) => { e.preventDefault(); onViewChange('saved'); }}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[3.2rem] transition-colors ${currentView === 'saved' ? 'text-primary' : 'text-on-surface-variant'}`}
      >
        <Bookmark className={`w-5 h-5 ${currentView === 'saved' ? 'fill-primary/20' : ''}`} />
        <span className="text-[10px] font-label-caps font-semibold">Shranjeno</span>
      </a>
      <a 
        href="#profil"
        onClick={(e) => { e.preventDefault(); onViewChange('profile'); }}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl min-w-[3.2rem] transition-colors ${currentView === 'profile' ? 'text-primary' : 'text-on-surface-variant'}`}
      >
        <User className={`w-5 h-5 ${currentView === 'profile' ? 'fill-primary/20' : ''}`} />
        <span className="text-[10px] font-label-caps font-semibold">Profil</span>
      </a>
    </div>
  );
}

