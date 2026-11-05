import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Globe, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  HelpCircle, 
  Eye, 
  Share2, 
  Layers, 
  FileText, 
  Calendar, 
  ShoppingBag, 
  Percent, 
  BookOpen, 
  Bookmark, 
  Info,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { 
  usePageSeo, 
  PageSeoConfig, 
  DEFAULT_PAGE_SEO, 
  PageSeoMap 
} from '../../services/seoSettingsService';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminActivity } from '../../services/activityLogService';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface SeoManagerProps {
  currentUserId?: string;
}

export const SeoManager: React.FC<SeoManagerProps> = ({ currentUserId }) => {
  const { currentUser } = useAuth();
  const { seoMap, loading, saveSeo, resetSeo } = usePageSeo();

  const isAuthorized = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const pageKeys = Object.keys(DEFAULT_PAGE_SEO);
  const [selectedPageId, setSelectedPageId] = useState<string>('main');

  // Working state for active form
  const [formState, setFormState] = useState<PageSeoConfig>(DEFAULT_PAGE_SEO.main);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sync form state when selected page or seoMap changes
  useEffect(() => {
    if (seoMap && selectedPageId) {
      const pageConfig = seoMap[selectedPageId] || DEFAULT_PAGE_SEO[selectedPageId] || DEFAULT_PAGE_SEO.main;
      setFormState({ ...pageConfig });
      setFeedback(null);
    }
  }, [selectedPageId, seoMap]);

  const handleChange = (field: keyof PageSeoConfig, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setFeedback({
        type: 'error',
        message: 'Za urejanje SEO nastavitev morate imeti vlogo superadmin ali admin.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      await saveSeo(selectedPageId, formState, currentUser?.email || currentUser?.name);

      logAdminActivity({
        adminId: currentUser?.id || currentUserId || 'admin',
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || '',
        adminRole: currentUser?.role || 'admin',
        actionType: 'settings_update',
        category: 'settings',
        targetId: `seo-${selectedPageId}`,
        targetTitle: `SEO: ${formState.pageName}`,
        details: `Posodobljene SEO nastavitve za stran »${formState.pageName}« (H1, H2, Meta Title in Opis).`,
        metadata: {
          pageId: selectedPageId,
          h1: formState.h1,
          metaTitle: formState.metaTitle,
        }
      }).catch(() => {});

      setFeedback({
        type: 'success',
        message: `SEO nastavitve za stran »${formState.pageName}« so bile uspešno shranjene in uveljavljene.`,
      });
      setTimeout(() => setFeedback(null), 4500);
    } catch (err: any) {
      console.error('Napaka pri shranjevanju SEO nastavitev:', err);
      setFeedback({
        type: 'error',
        message: 'Prišlo je do napake pri shranjevanju SEO nastavitev. Poskusite znova.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!isAuthorized) return;
    setIsSaving(true);
    try {
      await resetSeo(selectedPageId, currentUser?.email || currentUser?.name);
      const def = DEFAULT_PAGE_SEO[selectedPageId];
      if (def) {
        setFormState({ ...def });
      }
      setFeedback({
        type: 'success',
        message: `Stran »${formState.pageName}« je bila ponastavljena na privzete SEO vrednosti.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Napaka pri ponastavitvi.',
      });
    } finally {
      setIsSaving(false);
      setConfirmResetOpen(false);
    }
  };

  const getPageIcon = (id: string) => {
    switch (id) {
      case 'main': return <Globe className="w-4 h-4 text-primary" />;
      case 'news': return <FileText className="w-4 h-4 text-primary" />;
      case 'ads': return <ShoppingBag className="w-4 h-4 text-primary" />;
      case 'events': return <Calendar className="w-4 h-4 text-tertiary-container" />;
      case 'deals': return <Percent className="w-4 h-4 text-secondary" />;
      case 'blog': return <BookOpen className="w-4 h-4 text-primary" />;
      case 'saved': return <Bookmark className="w-4 h-4 text-primary" />;
      default: return <Info className="w-4 h-4 text-outline" />;
    }
  };

  const titleLength = (formState.metaTitle || '').length;
  const descLength = (formState.metaDescription || '').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-outline gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Nalagam SEO nastavitve portala...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-surface-container/60 relative overflow-hidden">
        <div className="flex flex-col gap-1 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
              SEO & Meta oznake strani
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary">
              Superadmin & Admin
            </span>
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Upravljajte unikatne naslove <strong className="text-on-surface">&lt;h1&gt;</strong>, podnaslove <strong className="text-on-surface">&lt;h2&gt;</strong>, 
            meta naslove (<code className="text-xs bg-surface-container px-1 py-0.5 rounded">&lt;title&gt;</code>) in meta opise (<code className="text-xs bg-surface-container px-1 py-0.5 rounded">&lt;meta description&gt;</code>) za vsako posamezno stran portala.
          </p>
        </div>

        {/* Live Site Preview Quick Link */}
        <div className="flex items-center gap-2 relative z-10">
          <a
            href={formState.path || '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors border border-surface-container"
            title="Odpri trenutno izbrano stran v novem zavihku"
          >
            <span>Odpri stran</span>
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20' 
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-error" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Page Selection Bar */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-outline px-1">
          Izberite stran za urejanje:
        </label>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {pageKeys.map((key) => {
            const pageInfo = DEFAULT_PAGE_SEO[key];
            const isSelected = selectedPageId === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPageId(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant border-surface-container/60'
                }`}
              >
                {getPageIcon(key)}
                <span>{pageInfo.pageName}</span>
                <span className="text-[10px] opacity-75 font-mono">{pageInfo.path}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Fields (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col gap-5 bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-xs">
          <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-on-surface text-base">
                Urejanje SEO za: <span className="text-primary">{formState.pageName}</span>
              </span>
              <span className="text-xs font-mono text-outline bg-surface-container px-2 py-0.5 rounded">
                {formState.path}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={isSaving}
              className="text-xs text-outline hover:text-error flex items-center gap-1 transition-colors cursor-pointer"
              title="Povrni privzete vrednosti za to stran"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Privzeto</span>
            </button>
          </div>

          {/* 1. H1 Tag */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-h1" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>Glavni naslov strani (H1)</span>
                <span className="text-[11px] font-normal text-outline">| &lt;h1&gt; v glavi strani</span>
              </label>
              <span className="text-[11px] text-outline font-mono">{(formState.h1 || '').length} znakov</span>
            </div>
            <input
              id="seo-h1"
              type="text"
              value={formState.h1 || ''}
              onChange={(e) => handleChange('h1', e.target.value)}
              placeholder="Vnesite glavni H1 naslov..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none text-on-surface text-sm"
              required
            />
            <p className="text-[11px] text-on-surface-variant">
              Glavni naslov, ki se prikaže na vrhu strani za obiskovalce in določa osrednjo temo za spletne iskalnike.
            </p>
          </div>

          {/* 2. H2 Tag */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-h2" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>Podnaslov strani (H2)</span>
                <span className="text-[11px] font-normal text-outline">| &lt;h2&gt; pod H1</span>
              </label>
              <span className="text-[11px] text-outline font-mono">{(formState.h2 || '').length} znakov</span>
            </div>
            <textarea
              id="seo-h2"
              rows={2}
              value={formState.h2 || ''}
              onChange={(e) => handleChange('h2', e.target.value)}
              placeholder="Vnesite vsebinski H2 podnaslov..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none text-on-surface text-sm resize-none"
              required
            />
            <p className="text-[11px] text-on-surface-variant">
              Opisni podnaslov, ki razširja kontekst kategorije ali strani za iskalnike in bralce.
            </p>
          </div>

          {/* 3. Meta Title */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-title" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>Meta naslov (Title Tag)</span>
                <span className="text-[11px] font-normal text-outline">| V zavihku in Googlu</span>
              </label>
              <span className={`text-[11px] font-mono ${
                titleLength >= 45 && titleLength <= 65 ? 'text-emerald-600 font-bold' : titleLength > 65 ? 'text-amber-600' : 'text-outline'
              }`}>
                {titleLength} / 60 znakov (priporočeno 50-60)
              </span>
            </div>
            <input
              id="seo-title"
              type="text"
              value={formState.metaTitle || ''}
              onChange={(e) => handleChange('metaTitle', e.target.value)}
              placeholder="Naslov strani | Portalko"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none text-on-surface text-sm"
              required
            />
          </div>

          {/* 4. Meta Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="seo-desc" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>Meta opis (Meta Description)</span>
                <span className="text-[11px] font-normal text-outline">| Izvleček za iskalnike</span>
              </label>
              <span className={`text-[11px] font-mono ${
                descLength >= 120 && descLength <= 160 ? 'text-emerald-600 font-bold' : descLength > 160 ? 'text-error' : 'text-amber-600'
              }`}>
                {descLength} / 160 znakov (priporočeno 120-160)
              </span>
            </div>
            <textarea
              id="seo-desc"
              rows={3}
              value={formState.metaDescription || ''}
              onChange={(e) => handleChange('metaDescription', e.target.value)}
              placeholder="Privlačen opis vsebine strani med 120 in 160 znaki..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none text-on-surface text-sm resize-none"
              required
            />
            {/* Length Indicator Bar */}
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-0.5">
              <div 
                className={`h-full transition-all duration-300 ${
                  descLength >= 120 && descLength <= 160
                    ? 'bg-emerald-500'
                    : descLength > 160
                    ? 'bg-error'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (descLength / 160) * 100)}%` }}
              />
            </div>
          </div>

          {/* 5. Keywords (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="seo-keywords" className="text-xs font-bold text-on-surface">
              Ključne besede (Keywords)
            </label>
            <input
              id="seo-keywords"
              type="text"
              value={formState.metaKeywords || ''}
              onChange={(e) => handleChange('metaKeywords', e.target.value)}
              placeholder="novice, oglasi, dogodki, Slovenija..."
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none text-on-surface text-sm"
            />
          </div>

          {/* 6. Social Share Image (OG Image) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="seo-image" className="text-xs font-bold text-on-surface">
              Slika za družbena omrežja (OG Image URL)
            </label>
            <input
              id="seo-image"
              type="text"
              value={formState.ogImage || ''}
              onChange={(e) => handleChange('ogImage', e.target.value)}
              placeholder="/favicon.png ali https://..."
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none text-on-surface text-sm font-mono text-xs"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-between border-t border-surface-container-low">
            <span className="text-xs text-outline">
              Spremembe začnejo veljati takoj za vse obiskovalce.
            </span>
            <button
              type="submit"
              disabled={isSaving || !isAuthorized}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Shranjujem...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Shrani SEO za {formState.pageName}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Live Previews (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* 1. Google SERP Preview Card */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container-low pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                <span>Google predogled zadetka</span>
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                V živo
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-container-low/70 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  P
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xs font-medium text-on-surface">Portalko.net</span>
                  <span className="text-[11px] text-outline font-mono">
                    https://portalko.net{formState.path === '/' ? '' : formState.path}
                  </span>
                </div>
              </div>

              <h4 className="text-blue-600 dark:text-blue-400 font-medium text-base hover:underline cursor-pointer line-clamp-1 leading-snug">
                {formState.metaTitle || 'Portalko – Slovenski portal za novice, male oglase in dogodke'}
              </h4>

              <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {formState.metaDescription || 'Portalko je osrednji slovenski spletni portal za novice, male oglase in dogodke.'}
              </p>
            </div>
          </div>

          {/* 2. On-Page Headings Hierarchy Preview */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container-low pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Hierarhija naslovov na strani</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container/40 flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-primary text-on-primary font-mono shrink-0">
                  H1
                </span>
                <span className="font-bold text-sm text-on-surface leading-tight">
                  {formState.h1 || 'Privzeti H1 naslov'}
                </span>
              </div>

              <div className="flex items-start gap-2 pl-3 border-l-2 border-primary/30">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-secondary text-on-secondary font-mono shrink-0">
                  H2
                </span>
                <span className="text-xs text-on-surface-variant leading-snug">
                  {formState.h2 || 'Privzeti H2 podnaslov'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Social Share Card Preview */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container-low pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-primary" />
                <span>Predogled deljenja (Facebook / X)</span>
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-surface-container-low bg-surface flex flex-col">
              <div className="h-28 bg-surface-container-high relative flex items-center justify-center overflow-hidden">
                {formState.ogImage ? (
                  <img 
                    src={formState.ogImage} 
                    alt={formState.pageName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/favicon.png';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-outline">
                    <Globe className="w-6 h-6" />
                    <span className="text-[10px]">portalko.net</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                  PORTALKO.NET
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <span className="font-bold text-xs text-on-surface line-clamp-1">
                  {formState.metaTitle || 'Portalko'}
                </span>
                <span className="text-[11px] text-on-surface-variant line-clamp-2">
                  {formState.metaDescription || 'Portalko portal'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal for Resetting */}
      <ConfirmationModal
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title={`Ponastavi SEO za ${formState.pageName}?`}
        message={`Ali ste prepričani, da želite povrniti prvotne tovarniške vrednosti H1, H2, Title in Description za stran ${formState.pageName}?`}
        confirmLabel="Ponastavi na privzeto"
        cancelLabel="Prekliči"
        variant="warning"
        isLoading={isSaving}
      />
    </div>
  );
};
