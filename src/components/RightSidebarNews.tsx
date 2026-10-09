import { useState, useEffect } from 'react';
import { Rss, Globe, RefreshCw, ExternalLink, Newspaper, Radio, Flame, Sparkles } from 'lucide-react';
import { Weather } from './Weather';
import { AdSense } from './ads/AdSense';
import { fetchRealRssNews, RealNewsItem } from '../services/rssService';
import { formatSlovenianDate } from '../utils/dateUtils';
import type { PostDetailTarget } from '../types';

export interface RightSidebarNewsProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarNews({ onNavigatePost }: RightSidebarNewsProps = {}) {
  const [latestNews, setLatestNews] = useState<RealNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    const loadSidebarNews = async () => {
      try {
        setNewsLoading(true);
        const news = await fetchRealRssNews();
        setLatestNews(news.slice(0, 5));
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

  const newsSources = [
    { name: 'RTV Slovenija', url: 'https://www.rtvslo.si', tag: 'rtvslo' },
    { name: '24ur.com', url: 'https://www.24ur.com', tag: '24ur' },
    { name: 'Siol.net', url: 'https://siol.net', tag: 'siol' },
    { name: 'Delo', url: 'https://www.delo.si', tag: 'delo' },
    { name: 'Dnevnik', url: 'https://www.dnevnik.si', tag: 'dnevnik' },
    { name: 'Večer', url: 'https://vecer.com', tag: 'vecer' }
  ];

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6 overscroll-contain"
    >
      <AdSense />
      
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
            latestNews.map((item, idx) => (
              <a 
                key={`news-${item.id}-${idx}`} 
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

      {/* VODILNI MEDIJSKI VIRI */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-secondary" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Vodilni mediji</h3>
          </div>
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Slovenija</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {newsSources.map(source => (
            <a
              key={source.tag}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface hover:text-primary transition-colors text-xs font-semibold flex items-center justify-between group border border-surface-container/60"
            >
              <span className="truncate">{source.name}</span>
              <ExternalLink className="w-3 h-3 text-outline group-hover:text-primary shrink-0 opacity-75" />
            </a>
          ))}
        </div>
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
