import { Globe } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget';
import { AdSense } from './ads/AdSense';
import { PromotionBannerZone } from './common/PromotionBannerZone';
import type { PostDetailTarget } from '../types';

export interface RightSidebarProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebar({ onNavigatePost }: RightSidebarProps = {}) {
  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex w-full lg:w-[336px] xl:w-[340px] flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6 overscroll-contain"
    >
      {/* VREME WIDGET - Top prominent utility */}
      <WeatherWidget />

      {/* Promocijska pasica */}
      <PromotionBannerZone position="right_sidebar" />
      
      {/* Oglasni prostor */}
      <AdSense />
      
      {/* IMENIK PRILJUBLJENIH POVEZAV */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Globe className="w-[1em] h-[1em] text-primary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Koristne spletne povezave</h3>
          </div>
          <a className="font-label-caps text-label-caps text-primary hover:underline" href="#">Vse ↗</a>
        </div>
        
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">E-Uprava & Javne storitve</span>
            <div className="grid grid-cols-3 gap-1.5">
              <a className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://e-uprava.gov.si" target="_blank" rel="noopener noreferrer">e-Uprava</a>
              <a className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://zvem.ezdrav.si" target="_blank" rel="noopener noreferrer">zVEM</a>
              <a className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://edavki.durs.si" target="_blank" rel="noopener noreferrer">e-Davki</a>
            </div>
          </div>
          
          <div className="flex flex-col gap-1 pt-1">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Promet & Vreme</span>
            <div className="grid grid-cols-3 gap-1.5">
              <a className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://www.promet.si" target="_blank" rel="noopener noreferrer">Promet.si</a>
              <a className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://meteo.arso.gov.si" target="_blank" rel="noopener noreferrer">ARSO vreme</a>
              <a className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://potniski.sz.si" target="_blank" rel="noopener noreferrer">SŽ Vozni red</a>
            </div>
          </div>
          
          <div className="flex flex-col gap-1 pt-1">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Medijski viri</span>
            <div className="flex items-center gap-1.5">
              <a className="flex-1 p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors" href="https://www.delo.si" target="_blank" rel="noopener noreferrer">Delo.si</a>
              <a className="flex-1 p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors" href="https://www.dnevnik.si" target="_blank" rel="noopener noreferrer">Dnevnik</a>
              <a className="flex-1 p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors" href="https://www.vecer.com" target="_blank" rel="noopener noreferrer">Večer</a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Kratka statistika skupnosti */}
      <div className="bg-surface-container-low rounded-2xl p-space-md flex items-center justify-around text-center border border-surface-container">
        <div>
          <span className="font-headline-sm text-base font-bold text-primary block">14.820</span>
          <span className="font-label-caps text-[10px] text-outline uppercase">Članov</span>
        </div>
        <div className="w-px h-8 bg-surface-container-high"></div>
        <div>
          <span className="font-headline-sm text-base font-bold text-secondary block">1.240</span>
          <span className="font-label-caps text-[10px] text-outline uppercase">Oglasov</span>
        </div>
        <div className="w-px h-8 bg-surface-container-high"></div>
        <div>
          <span className="font-headline-sm text-base font-bold text-tertiary-container block">186</span>
          <span className="font-label-caps text-[10px] text-outline uppercase">Popustov</span>
        </div>
      </div>
    </aside>
  );
}
