import { useState, useMemo } from 'react';
import { 
  Zap, Copy, Check, CheckCircle2, Calculator, ShieldCheck, 
  BookOpen, ExternalLink, Bell, Percent, Sparkles 
} from 'lucide-react';
import { TOP_VOUCHER_CODES, CATALOGUES_DATA, INITIAL_DEALS } from '../data/mockDealsData';
import { PostDetailTarget } from '../types';
import { scrollToPageTop } from '../utils/scrollUtils';

interface RightSidebarDealsProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarDeals({ onNavigatePost }: RightSidebarDealsProps = {}) {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [calcCategories, setCalcCategories] = useState({
    food: true,
    tech: true,
    sports: false,
    tourism: true,
  });

  const handleOpenDeal = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({ type: 'deal', id });
    } else {
      window.location.hash = `deal-${id}`;
    }
    scrollToPageTop();
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setEmailInput('');
    }
  };

  const estimatedMonthlySavings = useMemo(() => {
    let total = 0;
    if (calcCategories.food) total += 85;
    if (calcCategories.tech) total += 45;
    if (calcCategories.sports) total += 30;
    if (calcCategories.tourism) total += 60;
    return total;
  }, [calcCategories]);

  return (
    <aside className="hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6">
      
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
          {INITIAL_DEALS.slice(0, 3).map(deal => (
            <a
              key={deal.id}
              href={`#deal-${deal.id}`}
              onClick={(e) => handleOpenDeal(deal.id, e)}
              className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-center gap-3 group border border-surface-container/50 cursor-pointer"
              title={`Odpri ugodnost: ${deal.title}`}
            >
              {deal.image && (
                <img 
                  src={deal.image} 
                  alt={deal.title} 
                  className="w-12 h-12 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform" 
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-label-caps text-[10px] text-primary font-bold">{deal.partner}</span>
                  <span className="font-mono text-[11px] font-bold text-secondary">{deal.discount}</span>
                </div>
                <h4 className="font-label-md text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                  {deal.title}
                </h4>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 1. TOP KODE TEDNA */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Top kode tedna</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-[10px] uppercase font-bold">
            Preverjeno
          </span>
        </div>
        <p className="font-body-sm text-xs text-outline leading-snug">
          Najbolj unovčene kode za popust v zadnjih 48 urah s strani članov:
        </p>

        <div className="space-y-2.5 pt-1">
          {TOP_VOUCHER_CODES.slice(0, 4).map(item => {
            const isCopied = copiedCodeId === item.id;
            return (
              <div 
                key={item.id}
                className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-2 hover:bg-surface-container transition-colors border border-surface-container/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-label-lg text-xs font-bold text-on-surface truncate">{item.store}</div>
                  <div className="font-label-sm text-[11px] text-outline truncate">{item.description}</div>
                </div>
                <button 
                  onClick={() => handleCopy(item.code, item.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-mono text-xs font-bold shadow-xs hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1 shrink-0 cursor-pointer border border-surface-container"
                  type="button"
                  title="Klikni za kopiranje kode"
                >
                  <span>{item.code}</span>
                  {isCopied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. PAMETNI KALKULATOR PRIHRANKOV */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-secondary" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Kalkulator prihrankov</h3>
          </div>
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container text-outline uppercase font-semibold">
            Mesečno
          </span>
        </div>
        <p className="font-body-sm text-xs text-outline leading-tight">
          Izračunajte ocenjeni prihranek z ugodnostmi in kuponi Portal.si:
        </p>

        <div className="space-y-1.5 text-xs pt-1">
          <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70 cursor-pointer hover:bg-surface-container">
            <span className="flex items-center gap-2 text-on-surface">
              <input 
                type="checkbox" 
                checked={calcCategories.food}
                onChange={(e) => setCalcCategories({ ...calcCategories, food: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Prehrana &amp; živila</span>
            </span>
            <span className="text-secondary font-bold font-mono">~85 €</span>
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70 cursor-pointer hover:bg-surface-container">
            <span className="flex items-center gap-2 text-on-surface">
              <input 
                type="checkbox" 
                checked={calcCategories.tech}
                onChange={(e) => setCalcCategories({ ...calcCategories, tech: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Tehnika &amp; računalništvo</span>
            </span>
            <span className="text-secondary font-bold font-mono">~45 €</span>
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70 cursor-pointer hover:bg-surface-container">
            <span className="flex items-center gap-2 text-on-surface">
              <input 
                type="checkbox" 
                checked={calcCategories.tourism}
                onChange={(e) => setCalcCategories({ ...calcCategories, tourism: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Turizem &amp; oddih</span>
            </span>
            <span className="text-secondary font-bold font-mono">~60 €</span>
          </label>
          <label className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/70 cursor-pointer hover:bg-surface-container">
            <span className="flex items-center gap-2 text-on-surface">
              <input 
                type="checkbox" 
                checked={calcCategories.sports}
                onChange={(e) => setCalcCategories({ ...calcCategories, sports: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Šport &amp; rekreacija</span>
            </span>
            <span className="text-secondary font-bold font-mono">~30 €</span>
          </label>
        </div>

        <div className="p-3 rounded-xl bg-secondary-fixed/30 border border-secondary/20 flex items-center justify-between">
          <span className="font-label-md text-xs font-bold text-on-surface">Ocenjen prihranek:</span>
          <span className="font-headline-md text-lg font-black text-secondary font-mono">
            {estimatedMonthlySavings} € / mesec
          </span>
        </div>
      </div>

      {/* 3. AKTUALNI KATALOGI IN LETAKI */}
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

      {/* 4. PREVERJENE UGODNOSTI IN JAMSTVO */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container/60 space-y-2.5">
        <div className="flex items-center gap-2 pb-1 border-b border-surface-container-low">
          <ShieldCheck className="w-4 h-4 text-secondary" />
          <h4 className="font-headline-sm text-sm font-bold text-on-surface">Portal.si jamstvo</h4>
        </div>
        <ul className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
            <span>Vsak dan preverjamo veljavnost promocijskih kod in letakov.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
            <span>Uporabniki z glasovi potrjujejo delovanje v realnem času.</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span>Ekskluzivni popusti le za obiskovalce portala.</span>
          </li>
        </ul>
      </div>

      {/* 5. NEWSLETTER / ALERTI */}
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
