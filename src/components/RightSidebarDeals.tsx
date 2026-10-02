import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  BookOpen, ExternalLink, Bell, Percent 
} from 'lucide-react';
import { CATALOGUES_DATA } from '../data/mockDealsData';
import { PostDetailTarget } from '../types';
import { scrollToPageTop } from '../utils/scrollUtils';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';

interface RightSidebarDealsProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarDeals({ onNavigatePost }: RightSidebarDealsProps = {}) {
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [userDeals, setUserDeals] = useState<FirestorePost[]>([]);

  useEffect(() => {
    const unsub = subscribeToPosts((allPosts) => {
      const deals = allPosts.filter(p => {
        if (p.status === 'rejected') return false;
        return p.category === 'deal' || p.category === 'ugodnosti' || p.id.startsWith('deal-') || p.categoryName === 'Ugodnosti';
      });
      setUserDeals(deals);
    });
    return () => unsub();
  }, []);

  const handleOpenDeal = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({ type: 'deal', id });
    } else {
      window.location.hash = `deal-${id}`;
    }
    scrollToPageTop();
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setEmailInput('');
    }
  };

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6"
    >
      
      {/* 0. VROČE UGODNOSTI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Vroče ugodnosti</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase font-bold">
            Aktualno
          </span>
        </div>
        <div className="space-y-2.5">
          {userDeals.length === 0 ? (
            <p className="text-xs text-outline py-2 text-center">Trenutno ni objavljenih ugodnosti.</p>
          ) : (
            userDeals.slice(0, 3).map(deal => (
              <a
                key={deal.id}
                href={`#deal-${deal.id}`}
                onClick={(e) => handleOpenDeal(deal.id, e)}
                className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center gap-3 group border border-surface-container/50 cursor-pointer"
                title={`Odpri ugodnost: ${deal.title}`}
              >
                {deal.imageUrl && (
                  <img 
                    src={deal.imageUrl} 
                    alt={deal.title} 
                    className="w-12 h-12 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform" 
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-label-caps text-[10px] text-primary font-bold">{deal.authorName || 'Ugodnost'}</span>
                    <span className="font-mono text-[11px] font-bold text-secondary">{deal.discount || deal.price}</span>
                  </div>
                  <h4 className="font-label-md text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                    {deal.title}
                  </h4>
                </div>
              </a>
            ))
          )}
        </div>
      </div>

      {/* 2. AKTUALNI KATALOGI IN LETAKI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Katalogi slovenskih trgovin</span>
          </h3>
          <span className="font-label-caps text-[10px] text-outline uppercase font-semibold">
            Letaki
          </span>
        </div>
        
        <div className="space-y-2">
          {CATALOGUES_DATA.map(cat => (
            <a 
              key={cat.id}
              href={cat.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between gap-3 group border border-surface-container/50"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${cat.logoBg}`}>
                  {cat.initial}
                </div>
                <div className="min-w-0">
                  <div className="font-label-md text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                    {cat.title}
                  </div>
                  <div className="font-label-sm text-[11px] text-outline truncate">
                    {cat.validity} • {cat.pages}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-outline group-hover:text-primary transition-colors shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* 3. NEWSLETTER / ALERTI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container-lowest to-secondary/10 border border-primary/20 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h4 className="font-headline-sm text-sm font-bold text-on-surface">Opozorila na popuste</h4>
        </div>
        <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
          Ne zamudite vikend akcij in omejenih kuponov za slovenske trgovine.
        </p>

        {subscribed ? (
          <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Prijava uspešna! Hvala za zaupanje.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-2">
            <input 
              type="email" 
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="vas@email.si"
              className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest font-body-sm text-xs text-on-surface border border-surface-container focus:outline-none focus:border-primary"
            />
            <button 
              type="submit"
              className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold hover:bg-primary-container transition-colors shadow-xs cursor-pointer"
            >
              Naroči se na brezplačna obvestila
            </button>
          </form>
        )}
      </div>

    </aside>
  );
}
