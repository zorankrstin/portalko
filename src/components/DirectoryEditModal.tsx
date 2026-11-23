import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Clock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Star,
  Tag,
  X,
} from 'lucide-react';
import {
  DirectoryCategory,
  DirectoryEntry,
  updateDirectoryEntry,
} from '../services/directoryService';
import { RichTextEditor } from './RichTextEditor';
import { DirectorySeoGeoFields, DirectorySeoGeoState } from './DirectorySeoGeoFields';
import { getPlainTextSnippet } from '../utils/textUtils';

interface DirectoryEditModalProps {
  entry: DirectoryEntry | null;
  categories: DirectoryCategory[];
  isAdmin?: boolean;
  onClose: () => void;
  onSaved?: (entryName: string) => void;
}

export function DirectoryEditModal({
  entry,
  categories,
  isAdmin = true,
  onClose,
  onSaved,
}: DirectoryEditModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [richContent, setRichContent] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [seoGeo, setSeoGeo] = useState<DirectorySeoGeoState>({
    seoTitle: '',
    metaDescription: '',
    focusKeyword: '',
    geoAreaServed: '',
    priceRange: '',
    foundingYear: '',
    faqItems: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setName(entry.name || '');
    setUrl(entry.url || '');
    setCategoryId(entry.categoryId || categories[0]?.id || '');
    setLocation(entry.location || 'Slovenija');
    setDescription(entry.description || '');
    setRichContent(
      entry.richContent ||
        (entry.description ? `<p>${entry.description}</p>` : '')
    );
    setAddress(entry.address || '');
    setPhone(entry.phone || '');
    setEmail(entry.email || '');
    setWorkingHours(entry.workingHours || '');
    setTagsInput((entry.tags || []).join(', '));
    setIsVerified(Boolean(entry.isVerified));
    setIsFeatured(Boolean(entry.isFeatured));
    setSeoGeo({
      seoTitle: entry.seoTitle || '',
      metaDescription: entry.metaDescription || '',
      focusKeyword: entry.focusKeyword || '',
      geoAreaServed: entry.geoAreaServed || '',
      priceRange: entry.priceRange || '',
      foundingYear: entry.foundingYear || '',
      faqItems: Array.isArray(entry.faqItems) ? entry.faqItems : [],
    });
    setErrorMsg(null);
  }, [entry, categories]);

  if (!entry) return null;

  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name || entry.categoryName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainFromRich = getPlainTextSnippet(richContent);
    const effectiveSummary = description.trim() || plainFromRich;

    if (!name.trim() || !url.trim() || !effectiveSummary) {
      setErrorMsg('Naziv, spletni naslov in vsebina oz. kratek opis so obvezni.');
      return;
    }

    const cat = categories.find((c) => c.id === categoryId) || categories[0];
    if (!cat) {
      setErrorMsg('Izberite veljavno kategorijo.');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.replace(/^#/, '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await updateDirectoryEntry(entry.id, {
        name,
        url,
        description: effectiveSummary,
        richContent,
        categoryId: cat.id,
        categoryName: cat.name,
        location,
        address,
        phone,
        email,
        workingHours,
        tags: parsedTags,
        seoTitle: seoGeo.seoTitle,
        metaDescription: seoGeo.metaDescription,
        focusKeyword: seoGeo.focusKeyword,
        geoAreaServed: seoGeo.geoAreaServed,
        priceRange: seoGeo.priceRange,
        foundingYear: seoGeo.foundingYear,
        faqItems: seoGeo.faqItems,
        ...(isAdmin ? { isVerified, isFeatured } : {}),
      });
      onSaved?.(name.trim());
      onClose();
    } catch (err: any) {
      console.error('Failed to update directory entry:', err);
      setErrorMsg(err?.message || 'Shranjevanje sprememb ni uspelo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container-low shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-on-surface">
              Uredi vnos v imeniku: {entry.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low cursor-pointer"
            aria-label="Zapri"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex flex-col gap-4">
          {errorMsg && (
            <div className="rounded-xl bg-error/10 border border-error/25 px-3 py-2 text-xs font-semibold text-error">
              {errorMsg}
            </div>
          )}

          {/* Core Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Naziv podjetja / spletne strani *
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Spletni naslov (URL) *
              </label>
              <input
                type="text"
                required
                maxLength={500}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">Kategorija *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">Kraj / Regija</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="npr. Ljubljana, Maribor, Slovenija"
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Rich Text Editor (H1, H2, H3, links, images, embeds) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-on-surface">
                Podrobna predstavitev strani (Rich Text: H1, H2, H3, seznami, povezave, slike) *
              </label>
              <span className="text-[11px] text-outline">
                Uporabite H1/H2/H3 za boljšo SEO in GEO strukturo
              </span>
            </div>
            <RichTextEditor
              key={entry.id}
              initialContent={
                entry.richContent || (entry.description ? `<p>${entry.description}</p>` : '')
              }
              onChange={setRichContent}
              placeholder="Vnesite podrobno predstavitev podjetja, storitev, prednosti in ključnih informacij z uporabo naslovov H1, H2, H3..."
              minHeight="min-h-[200px]"
            />
          </div>

          {/* Short Excerpt for Cards & Feed */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-on-surface">
                Kratek povzetek za prikaz v seznamu imenika
              </label>
              <span className="text-[10px] text-outline tabular-nums">
                {description.trim().length}/950
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={950}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Če pustite prazno, se bo povzetek samodejno ustvaril iz zgornjega besedila."
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Contact Details Section */}
          <div className="rounded-xl p-3.5 bg-surface-container-low/60 border border-surface-container/70 flex flex-col gap-3">
            <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>Kontaktni podatki podjetja</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Ulica in hišna številka / Naslov</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="npr. Dunajska cesta 123, 1000 Ljubljana"
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>Telefonska številka</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="npr. +386 1 234 56 78"
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>Kontaktni e-poštni naslov</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="npr. info@podjetje.si"
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Delovni čas</span>
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="npr. Pon–Pet: 8:00–17:00"
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-primary" />
              <span>Oznake (ločene z vejico)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="npr. elektronika, spletna-trgovina, dostava"
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* SEO & GEO Settings */}
          <DirectorySeoGeoFields
            value={seoGeo}
            onChange={setSeoGeo}
            entryName={name}
            entryDomainOrUrl={url}
            entryCategoryName={selectedCategoryName}
            entryLocation={location}
            richContent={richContent}
            shortDescription={description}
            defaultExpanded={Boolean(
              entry.seoTitle ||
                entry.metaDescription ||
                entry.focusKeyword ||
                entry.geoAreaServed ||
                entry.priceRange ||
                entry.foundingYear ||
                (entry.faqItems && entry.faqItems.length > 0)
            )}
          />

          {/* Verification & Featured toggles (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-4 flex-wrap pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="rounded border-surface-container accent-primary"
                />
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <span>Uradno preverjeno</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-surface-container accent-primary"
                />
                <Star className="w-4 h-4 text-amber-500" />
                <span>Izpostavljeno (Izbor uredništva)</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-low">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Shranjujem...' : 'Shrani spremembe'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
