import { useState, useEffect } from 'react';
import { Rocket, ShieldCheck, Lock, TrendingUp, Link as LinkIcon, ShoppingBag } from 'lucide-react';
import { PostDetailTarget } from '../types';
import { subscribeToAds, FirestoreAd } from '../services/firestoreService';
import { scrollToPageTop } from '../utils/scrollUtils';

interface RightSidebarAdsProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarAds({ onNavigatePost }: RightSidebarAdsProps = {}) {
  const [ads, setAds] = useState<FirestoreAd[]>([]);

  useEffect(() => {
    const unsub = subscribeToAds((allAds) => {
      const activeAds = allAds.filter(a => a.status !== 'rejected');
      setAds(activeAds.slice(0, 3));
    });
    return () => unsub();
  }, []);

  const handleOpenAd = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({ type: 'ad', id });
    } else {
      window.location.hash = `ad-${id}`;
    }
    scrollToPageTop();
  };

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6"
    >
      
      {/* Priporočeni mali oglasi */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Priporočeni oglasi</h3>
          </div>
          <span className="font-label-caps text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Aktualno</span>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          {ads.length === 0 ? (
            <p className="text-xs text-outline py-3 text-center">Trenutno ni objavljenih malih oglasov.</p>
          ) : (
            ads.map(ad => (
              <a
                key={ad.id}
                href={`#ad-${ad.id}`}
                onClick={(e) => handleOpenAd(ad.id, e)}
                className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent hover:border-surface-container/60"
                title={`Odpri oglas: ${ad.title}`}
              >
                {ad.imageUrl && (
                  <img 
                    src={ad.imageUrl} 
                    alt={ad.title} 
                    className="w-12 h-12 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-headline-sm text-xs font-bold text-primary">{ad.price}</span>
                    <span className="font-label-caps text-[10px] text-outline truncate">{ad.location}</span>
                  </div>
                  <h4 className="font-label-md text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors mt-0.5">
                    {ad.title}
                  </h4>
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* Hitrejša prodaja */}
      <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-space-md shadow-md flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-surface-container-lowest/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-caps text-label-caps uppercase font-bold tracking-wider">
            Hitrejša prodaja
          </span>
          <Rocket className="w-[1em] h-[1em] text-lg text-secondary-fixed" />
        </div>
        <div>
          <h4 className="font-headline-sm text-base font-bold text-white">Izpostavite svoj oglas</h4>
          <p className="font-body-sm text-xs text-on-primary-container/90 mt-1">
            Želite hitrejšo prodajo? Izberite paket TOP Izpostavitev za 3x več ogledov in neposreden stik s kupci.
          </p>
        </div>
        <button className="w-full py-2 px-3 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container-high font-label-md text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1" type="button">
          <span>Izberi promocijo od 2,99 €</span>
          <svg className="w-[1em] h-[1em] text-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>

      {/* Varni spletni nakupi */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-[1em] h-[1em] text-secondary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Varni spletni nakupi</h3>
          </div>
          <span className="font-label-caps text-[10px] bg-secondary-fixed text-on-secondary-fixed px-1.5 py-0.5 rounded font-bold">RLS Zaščita</span>
        </div>
        <div className="flex flex-col gap-2.5 text-xs text-on-surface-variant">
          <div className="flex items-start gap-2">
            <svg className="w-[1em] h-[1em] text-xs text-secondary mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            <p className="leading-tight">Izbirajte prodajalce z značko <strong className="text-on-surface">Preverjen partner</strong>.</p>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-[1em] h-[1em] text-xs text-secondary mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            <p className="leading-tight">Pri večjih zneskih priporočamo osebni prevzem in preizkus predmeta.</p>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-[1em] h-[1em] text-xs text-primary mt-0.5" />
            <p className="leading-tight">Komunikacija in podatki so varni in šifrirani.</p>
          </div>
        </div>
      </div>

      {/* Najbolj iskane znamke */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-[1em] h-[1em] text-primary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Najbolj iskane znamke</h3>
          </div>
          <span className="font-label-caps text-xs text-outline">Avto-moto</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <a className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-xs font-label-md text-on-surface" href="#">
            <span>Volkswagen Golf & Passat</span>
            <span className="font-mono font-bold text-primary">142 oglasov</span>
          </a>
          <a className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-xs font-label-md text-on-surface" href="#">
            <span>Renault Clio & Captur</span>
            <span className="font-mono font-bold text-primary">98 oglasov</span>
          </a>
          <a className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-xs font-label-md text-on-surface" href="#">
            <span>Audi A4 & A6</span>
            <span className="font-mono font-bold text-primary">76 oglasov</span>
          </a>
          <a className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-xs font-label-md text-on-surface" href="#">
            <span>BMW Serija 3 & X3</span>
            <span className="font-mono font-bold text-primary">65 oglasov</span>
          </a>
        </div>
      </div>

      {/* Uporabne povezave */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-[1em] h-[1em] text-primary text-lg" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Uporabne povezave za kupce</h3>
          </div>
          <span className="font-label-caps text-xs text-outline">Portali</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <a className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://www.amzs.si" target="_blank" rel="noopener noreferrer">AMZS Preverba</a>
          <a className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://e-uprava.gov.si" target="_blank" rel="noopener noreferrer">e-Uprava Pogodba</a>
          <a className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://www.posta.si" target="_blank" rel="noopener noreferrer">Pošta Cenik</a>
          <a className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-center font-label-md text-xs font-medium text-on-surface transition-colors truncate" href="https://www.dars.si" target="_blank" rel="noopener noreferrer">DARS Vinjete</a>
        </div>
      </div>

    </aside>
  );
}
