import { useState, useEffect } from 'react';
import { Rss, Timer, ArrowRight, Globe, RefreshCw, ExternalLink } from 'lucide-react';
import { Weather } from './Weather';
import { fetchRealRssNews, RealNewsItem } from '../services/rssService';
import { formatSlovenianDate } from '../utils/dateUtils';

export function RightSidebar() {
  const [timeLeft, setTimeLeft] = useState(6 * 3600 + 42 * 60 + 19);
  const [latestNews, setLatestNews] = useState<RealNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSidebarNews = async () => {
      try {
        setNewsLoading(true);
        const news = await fetchRealRssNews();
        setLatestNews(news.slice(0, 4));
      } catch (e) {
        console.error('Failed to load sidebar news', e);
      } finally {
        setNewsLoading(false);
      }
    };

    loadSidebarNews();

    const handleUpdate = () => {
      loadSidebarNews();
    };

    window.addEventListener('rss_feeds_updated', handleUpdate);
    return () => window.removeEventListener('rss_feeds_updated', handleUpdate);
  }, []);

  const h = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
  const m = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6"
    >
      
      {/* VREME WIDGET */}
      <Weather />

      {/* RSS NOVICE WIDGET */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Rss className="w-[1em] h-[1em] text-primary text-xl" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Zadnje novice v živo</h3>
          </div>
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        </div>
        
        <div className="flex flex-col gap-3">
          {newsLoading && latestNews.length === 0 ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-outline">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Nalaganje novic...</span>
            </div>
          ) : latestNews.length === 0 ? (
            <p className="text-xs text-outline py-2 text-center">Trenutno ni svežih RSS novic.</p>
          ) : (
            latestNews.map((item) => (
              <a 
                key={item.id} 
                className="group flex flex-col gap-1 hover:bg-surface-container-low p-2 rounded-xl transition-colors" 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <div className="flex items-center justify-between text-[11px] text-outline">
                  <span className="font-bold text-primary truncate max-w-[120px]">{item.sourceName}</span>
                  <span className="shrink-0">{formatSlovenianDate(item.pubDate)}</span>
                </div>
                <p className="font-label-md text-xs text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
                  {item.title}
                </p>
              </a>
            ))
          )}
        </div>
        
        <div className="pt-2 border-t border-surface-container-low flex items-center justify-between text-[11px] text-outline">
          <div className="flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 text-secondary ${newsLoading ? 'animate-spin' : ''}`} />
            <span>Resnične novice iz uradnih virov</span>
          </div>
        </div>
      </div>
      
      {/* UGODNOST DNEVA */}
      <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-space-md shadow-md flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-surface-container-lowest/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-caps text-label-caps uppercase font-bold tracking-wider">
            Ugodnost dneva
          </span>
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-on-primary-container bg-surface-container-lowest/20 px-2 py-0.5 rounded-md">
            <Timer className="w-[1em] h-[1em] text-xs" />
            <span>{h}:{m}:{s}</span>
          </div>
        </div>
        <div>
          <h4 className="font-headline-sm text-base font-bold text-white">
            Petrol Klub: Dvojne točke ob točenju Q Max goriv ta vikend
          </h4>
          <p className="font-body-sm text-xs text-on-primary-container/90 mt-1">
            Aktivirajte kupon v aplikaciji pred točenjem na vseh bencinskih servisih po Sloveniji.
          </p>
        </div>
        <button className="w-full py-2 px-3 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container-high font-label-md text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1" type="button">
          <span>Aktiviraj ugodnost zdaj</span>
          <ArrowRight className="w-[1em] h-[1em] text-sm" />
        </button>
      </div>
      
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
