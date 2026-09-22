import { CalendarDays, Bookmark, Megaphone, MapPin, Search, Calendar, Map, Check, ChevronDown, PlusCircle, Star, Music, Bike, Theater, PartyPopper, Flame, Building, Users, Clock, Navigation } from 'lucide-react';
import { PostDetailTarget } from '../types';
import { scrollToPageTop } from '../utils/scrollUtils';

interface RightSidebarEventsProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarEvents({ onNavigatePost }: RightSidebarEventsProps) {
  const handleOpenEvent = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({ type: 'event', id });
    } else {
      window.location.hash = `event-${id}`;
    }
    scrollToPageTop();
  };

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6"
    >
      {/* 1. Mini Koledar prireditev */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Calendar className="w-[1em] h-[1em] text-primary text-xl" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Koledar prireditev</h3>
          </div>
          <span className="font-label-caps text-label-caps text-primary font-bold">Marec 2025</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-label-caps text-[10px] text-outline pt-1">
          <span>P</span><span>T</span><span>S</span><span>Č</span><span>P</span><span className="text-primary font-bold">S</span><span className="text-primary font-bold">N</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-label-md text-xs">
          <span className="p-1 text-outline-variant">24</span><span className="p-1 text-outline-variant">25</span><span className="p-1 text-outline-variant">26</span><span className="p-1 text-outline-variant">27</span><span className="p-1 text-outline-variant">28</span>
          <span className="p-1 rounded-lg bg-surface-container-low">1</span><span className="p-1 rounded-lg bg-surface-container-low">2</span><span className="p-1 rounded-lg bg-surface-container-low">3</span><span className="p-1 rounded-lg bg-surface-container-low">4</span><span className="p-1 rounded-lg bg-surface-container-low">5</span><span className="p-1 rounded-lg bg-surface-container-low">6</span><span className="p-1 rounded-lg bg-surface-container-low">7</span><span className="p-1 rounded-lg bg-surface-container-low">8</span><span className="p-1 rounded-lg bg-surface-container-low">9</span><span className="p-1 rounded-lg bg-surface-container-low">10</span><span className="p-1 rounded-lg bg-surface-container-low">11</span><span className="p-1 rounded-lg bg-surface-container-low">12</span><span className="p-1 rounded-lg bg-surface-container-low">13</span><span className="p-1 rounded-lg bg-surface-container-low">14</span><span className="p-1 rounded-lg bg-surface-container-low">15</span><span className="p-1 rounded-lg bg-surface-container-low">16</span><span className="p-1 rounded-lg bg-surface-container-low">17</span><span className="p-1 rounded-lg bg-surface-container-low">18</span><span className="p-1 rounded-lg bg-surface-container-low">19</span><span className="p-1 rounded-lg bg-surface-container-low">20</span><span className="p-1 rounded-lg bg-surface-container-low">21</span><span className="p-1 rounded-lg bg-surface-container-low">22</span><span className="p-1 rounded-lg bg-surface-container-low">23</span><span className="p-1 rounded-lg bg-surface-container-low">24</span><span className="p-1 rounded-lg bg-surface-container-low">25</span><span className="p-1 rounded-lg bg-surface-container-low">26</span>
          <span className="p-1 rounded-lg bg-primary text-on-primary font-bold shadow-sm">27</span>
          <span className="p-1 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-bold">28</span>
          <span className="p-1 rounded-lg bg-primary-fixed text-on-primary-fixed font-bold">29</span>
          <span className="p-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-bold">30</span>
        </div>
        <div className="pt-1 flex items-center justify-between text-[10px] text-outline">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Danes (27.)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span> Vikend dogodki</span>
        </div>
      </div>

      {/* 2. Prihajajoči top dogodki v vaši bližini */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Navigation className="w-[1em] h-[1em] text-secondary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Top v vaši bližini</h3>
          </div>
          <span className="font-label-caps text-label-caps text-outline">Ljubljana</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <a 
            className="group flex flex-col gap-1 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer" 
            href="#event-event-1"
            onClick={(e) => handleOpenEvent('event-1', e)}
            title="Odpri dogodek: Cankarjev teden"
          >
            <div className="flex items-center justify-between text-[11px] text-outline">
              <span className="font-bold text-primary">Petek • 19:30</span>
              <Bookmark className="w-[1em] h-[1em] text-sm group-hover:text-primary" />
            </div>
            <p className="font-label-md text-xs text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
              Cankarjev teden: Otvoritveni koncert Simfoničnega orkestra RTV Slovenija
            </p>
          </a>
          <a 
            className="group flex flex-col gap-1 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer" 
            href="#event-event-3"
            onClick={(e) => handleOpenEvent('event-3', e)}
            title="Odpri dogodek: Odprta kuhna"
          >
            <div className="flex items-center justify-between text-[11px] text-outline">
              <span className="font-bold text-secondary">Petek • 10:00</span>
              <Bookmark className="w-[1em] h-[1em] text-sm group-hover:text-primary" />
            </div>
            <p className="font-label-md text-xs text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
              Odprta kuhna Ljubljana - Otvoritev sezone 2025 na Pogačarjevem trgu
            </p>
          </a>
          <a 
            className="group flex flex-col gap-1 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer" 
            href="#event-event-2"
            onClick={(e) => handleOpenEvent('event-2', e)}
            title="Odpri dogodek: Siddharta"
          >
            <div className="flex items-center justify-between text-[11px] text-outline">
              <span className="font-bold text-tertiary-container">Sobota • 20:00</span>
              <Bookmark className="w-[1em] h-[1em] text-sm group-hover:text-primary" />
            </div>
            <p className="font-label-md text-xs text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
              Siddharta - Ekskluzivni akustični koncert 'Izštekani' v Kinu Šiška
            </p>
          </a>
        </div>
      </div>

      {/* 3. Promocijski okvir za organizatorje */}
      <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-space-md shadow-md flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-surface-container-lowest/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-caps text-label-caps uppercase font-bold tracking-wider">Za organizatorje</span>
          <svg className="w-[1em] h-[1em] text-lg text-primary-fixed" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20h2" /><path d="M16 20h-4" /><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /><path d="M12 2v1" /><path d="M12 7v1" /><path d="M12 12v1" /><path d="M19 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M9 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>
        </div>
        <div>
          <h4 className="font-headline-sm text-base font-bold text-white">Organizirate dogodek ali koncert?</h4>
          <p className="font-body-sm text-xs text-on-primary-container/90 mt-1 leading-relaxed">Brezplačno vpišite vašo prireditev v koledar Portalko ali izberite paket Izpostavljenosti za dosego več kot 80.000 obiskovalcev.</p>
        </div>
        <button className="w-full py-2.5 px-3 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container-high font-label-md text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5" type="button">
          <span>Oddaj prireditev</span>
          <svg className="w-[1em] h-[1em] text-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>

      {/* 4. Prizorišča v Sloveniji */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Building className="w-[1em] h-[1em] text-primary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Priljubljena prizorišča</h3>
          </div>
          <a className="font-label-caps text-label-caps text-primary hover:underline" href="#">Vsa ↗</a>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-colors">Arena Stožice</button>
          <button className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-colors">Cankarjev dom</button>
          <button className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-colors">Križanke</button>
          <button className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-md text-xs transition-colors">Španski borci</button>
          <button className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-colors">Ljudski vrt MB</button>
          <button className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs transition-colors">SNG Drama</button>
        </div>
      </div>

      {/* 5. Vikend vremenska napoved */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Vikend vreme na prostem</span>
          <svg className="w-[1em] h-[1em] text-sm text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded-xl bg-surface-container-low flex flex-col gap-0.5">
            <span className="font-label-caps text-[10px] text-outline uppercase">Sobota</span>
            <span className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1">
              <svg className="w-[1em] h-[1em] text-sm text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              18°C
            </span>
            <span className="text-[11px] text-secondary font-medium">Sončno & toplo</span>
          </div>
          <div className="p-2 rounded-xl bg-surface-container-low flex flex-col gap-0.5">
            <span className="font-label-caps text-[10px] text-outline uppercase">Nedelja</span>
            <span className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1">
              <svg className="w-[1em] h-[1em] text-sm text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" /><path d="M8 15a4 4 0 1 1 7.6-1.8 3 3 0 0 1 1.4 5.8" /></svg>
              16°C
            </span>
            <span className="text-[11px] text-outline font-medium">Delno oblačno</span>
          </div>
        </div>
      </div>

      {/* 6. Statistika dogodkov na portalu */}
      <div className="bg-surface-container-low rounded-2xl p-space-md flex items-center justify-around text-center border border-surface-container">
        <div>
          <span className="font-headline-sm text-base font-bold text-primary block">342</span>
          <span className="font-label-caps text-[10px] text-outline uppercase">Dogodkov</span>
        </div>
        <div className="w-px h-8 bg-surface-container-high"></div>
        <div>
          <span className="font-headline-sm text-base font-bold text-secondary block">18.400</span>
          <span className="font-label-caps text-[10px] text-outline uppercase">Obiskov</span>
        </div>
        <div className="w-px h-8 bg-surface-container-high"></div>
        <div>
          <span className="font-headline-sm text-base font-bold text-primary block">98%</span>
          <span className="font-label-caps text-[10px] text-outline uppercase">Preverjeno</span>
        </div>
      </div>
    </aside>
  );
}
