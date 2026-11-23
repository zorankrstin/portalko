import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { DirectoryFaqItem } from '../services/directoryService';
import { getPlainTextSnippet } from '../utils/textUtils';

export interface DirectorySeoGeoState {
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  geoAreaServed: string;
  priceRange: string;
  foundingYear: string;
  faqItems: DirectoryFaqItem[];
}

interface DirectorySeoGeoFieldsProps {
  value: DirectorySeoGeoState;
  onChange: (next: DirectorySeoGeoState) => void;
  entryName: string;
  entryDomainOrUrl: string;
  entryCategoryName: string;
  entryLocation: string;
  richContent: string;
  shortDescription: string;
  defaultExpanded?: boolean;
}

export function DirectorySeoGeoFields({
  value,
  onChange,
  entryName,
  entryDomainOrUrl,
  entryCategoryName,
  entryLocation,
  richContent,
  shortDescription,
  defaultExpanded = false,
}: DirectorySeoGeoFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const fallbackTitle = entryName.trim()
    ? `${entryName.trim()} (${entryLocation.trim() || 'Slovenija'}) – ${entryCategoryName || 'Imenik'} | Imenik Portalko`
    : 'Naziv podjetja (Slovenija) | Imenik Portalko';

  const plainFromRich = getPlainTextSnippet(richContent);
  const rawFallbackDesc = shortDescription.trim() || plainFromRich;
  const fallbackDesc =
    rawFallbackDesc.length > 158
      ? `${rawFallbackDesc.slice(0, 155).trim()}...`
      : rawFallbackDesc || 'Podrobna predstavitev, kontaktni podatki, ocene uporabnikov in povezava na uradno spletno stran.';

  const previewTitle = value.seoTitle.trim() || fallbackTitle;
  const previewDesc = value.metaDescription.trim() || fallbackDesc;
  const metaLen = value.metaDescription.trim().length;
  const titleLen = value.seoTitle.trim().length;

  const configuredCount = [
    value.seoTitle.trim(),
    value.metaDescription.trim(),
    value.focusKeyword.trim(),
    value.geoAreaServed.trim(),
    value.priceRange.trim(),
    value.foundingYear.trim(),
    value.faqItems.some((f) => f.q.trim() && f.a.trim()) ? 'faq' : '',
  ].filter(Boolean).length;

  const handleAutoFill = () => {
    const sourceText = plainFromRich || shortDescription.trim();
    const generatedMeta =
      sourceText.length > 158 ? `${sourceText.slice(0, 155).trim()}...` : sourceText;
    onChange({
      ...value,
      seoTitle: value.seoTitle.trim() || fallbackTitle.slice(0, 68),
      metaDescription: value.metaDescription.trim() || generatedMeta,
      geoAreaServed:
        value.geoAreaServed.trim() ||
        `${entryLocation.trim() || 'Slovenija'}, Slovenija`,
    });
    setIsExpanded(true);
  };

  const handleAddFaq = () => {
    if (value.faqItems.length >= 8) return;
    onChange({
      ...value,
      faqItems: [...value.faqItems, { q: '', a: '' }],
    });
  };

  const handleUpdateFaq = (index: number, field: 'q' | 'a', text: string) => {
    const next = value.faqItems.map((item, idx) =>
      idx === index ? { ...item, [field]: text } : item
    );
    onChange({ ...value, faqItems: next });
  };

  const handleRemoveFaq = (index: number) => {
    onChange({
      ...value,
      faqItems: value.faqItems.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="rounded-xl border border-surface-container bg-surface-container-low/50 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-surface-container-low/80 border-b border-surface-container/60">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
        >
          <Search className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-on-surface">
                SEO &amp; GEO nastavitve
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Meta • Schema • AI GEO
              </span>
              {configuredCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  {configuredCount} nastavljeno
                </span>
              )}
            </div>
            <p className="text-[11px] text-outline truncate">
              Meta opis, SEO naslov, ključna beseda, GEO pokritost in FAQ vprašanja za iskalnike ter AI
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-outline shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-outline shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={handleAutoFill}
          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
          title="Samodejno pripravi SEO naslov, meta opis in GEO območje iz besedila"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">Izpolni iz vsebine</span>
        </button>
      </div>

      {isExpanded && (
        <div className="p-3.5 flex flex-col gap-3.5">
          {/* Live Google SERP Preview */}
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container/70 flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Predogled prikaza v iskalniku (SERP)
            </span>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate flex items-center gap-1">
              <Globe className="w-3 h-3 shrink-0" />
              <span>
                portalko.si/imenik
                {entryDomainOrUrl ? ` › ${entryDomainOrUrl.replace(/^https?:\/\//i, '').split('/')[0]}` : ''}
              </span>
            </div>
            <div className="text-sm font-bold text-primary leading-snug line-clamp-1">
              {previewTitle}
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
              {previewDesc}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface">
                  SEO naslov (Meta Title)
                </label>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    titleLen > 65 ? 'text-amber-600' : 'text-outline'
                  }`}
                >
                  {titleLen}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={160}
                value={value.seoTitle}
                onChange={(e) => onChange({ ...value, seoTitle: e.target.value })}
                placeholder={fallbackTitle.slice(0, 65)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Fokusna ključna beseda / fraza
              </label>
              <input
                type="text"
                maxLength={120}
                value={value.focusKeyword}
                onChange={(e) => onChange({ ...value, focusKeyword: e.target.value })}
                placeholder="npr. spletna trgovina z elektroniko Ljubljana"
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Meta Description */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface">
                Meta opis (Meta Description)
              </label>
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  metaLen >= 100 && metaLen <= 160
                    ? 'text-emerald-600'
                    : metaLen > 160
                    ? 'text-amber-600'
                    : 'text-outline'
                }`}
              >
                {metaLen}/160 znakov
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={320}
              value={value.metaDescription}
              onChange={(e) => onChange({ ...value, metaDescription: e.target.value })}
              placeholder="Jedrnat opis za Google in AI povzetke (priporočeno 120–158 znakov)..."
              className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* GEO Local & Entity Optimization */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-surface-container/60">
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="text-xs font-bold text-on-surface">
                GEO območje storitev
              </label>
              <input
                type="text"
                maxLength={200}
                value={value.geoAreaServed}
                onChange={(e) => onChange({ ...value, geoAreaServed: e.target.value })}
                placeholder="npr. Osrednja Slovenija, EU"
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Cenovni razred (Schema)
              </label>
              <select
                value={value.priceRange}
                onChange={(e) => onChange({ ...value, priceRange: e.target.value })}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Ni določeno</option>
                <option value="€">€ (Ugodno)</option>
                <option value="€€">€€ (Srednji razred)</option>
                <option value="€€€">€€€ (Višji razred)</option>
                <option value="€€€€">€€€€ (Premium)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Leto ustanovitve
              </label>
              <input
                type="text"
                maxLength={20}
                value={value.foundingYear}
                onChange={(e) => onChange({ ...value, foundingYear: e.target.value })}
                placeholder="npr. 2005"
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Custom GEO FAQs */}
          <div className="flex flex-col gap-2 pt-2 border-t border-surface-container/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-on-surface">
                  Pogosta vprašanja po meri (GEO FAQ Schema)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddFaq}
                disabled={value.faqItems.length >= 8}
                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Dodaj vprašanje</span>
              </button>
            </div>

            {value.faqItems.length === 0 ? (
              <p className="text-[11px] text-outline">
                Če ne dodate lastnih vprašanj, se bodo za AI iskalnike samodejno uporabila osnovna GEO vprašanja o podjetju.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {value.faqItems.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={220}
                        value={faq.q}
                        onChange={(e) => handleUpdateFaq(idx, 'q', e.target.value)}
                        placeholder={`Vprašanje ${idx + 1} (npr. Ali ponujate dostavo na dom?)`}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFaq(idx)}
                        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 cursor-pointer"
                        aria-label={`Odstrani vprašanje ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={1200}
                      value={faq.a}
                      onChange={(e) => handleUpdateFaq(idx, 'a', e.target.value)}
                      placeholder="Jasen, direkten odgovor za uporabnike in AI iskalnike..."
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
