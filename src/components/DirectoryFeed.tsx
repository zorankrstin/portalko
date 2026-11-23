import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Globe,
  Search,
  Plus,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  X,
  FolderTree,
  Trash2,
  Send,
  Info,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  BadgeCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  QrCode,
  Pencil,
  LayoutGrid,
  List,
} from 'lucide-react';
import { DirectoryQrModal } from './DirectoryQrModal';
import { DirectoryDetailPage } from './DirectoryDetailPage';
import { DirectoryEditModal } from './DirectoryEditModal';
import { useAuth } from '../contexts/AuthContext';
import { scrollToPageTop } from '../utils/scrollUtils';
import { parseSearchQuery } from '../utils/searchUtils';
import { getFeedCardAnimationClass } from '../utils/animationUtils';
import {
  DirectoryCategory,
  DirectoryEntry,
  subscribeToDirectoryCategories,
  subscribeToDirectoryEntries,
  createDirectoryEntry,
  deleteDirectoryEntry,
  canPublishDirectoryEntry,
  canManageDirectory,
  requestAiDirectorySuggestions,
  getDirectoryEntrySlug,
} from '../services/directoryService';

interface DirectoryFeedProps {
  onOpenAdminDirectory?: () => void;
  searchQuery?: string;
}

type DirectorySortMode = 'az' | 'za' | 'newest';

export function DirectoryFeed({ onOpenAdminDirectory, searchQuery: externalSearchQuery = '' }: DirectoryFeedProps) {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'guest';
  const canPublish = canPublishDirectoryEntry(role);
  const isAdminUser = canManageDirectory(role);

  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<DirectorySortMode>('az');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState(() => parseSearchQuery(externalSearchQuery).inputText);

  useEffect(() => {
    const parsed = parseSearchQuery(externalSearchQuery);
    setSearchQuery(parsed.inputText);
    if (parsed.category === 'directory' && parsed.directoryCategory) {
      setSelectedCategoryId(parsed.directoryCategory);
      setActiveDetailSlug(null);
    } else if (parsed.category === 'directory' && parsed.text.length > 0) {
      setActiveDetailSlug(null);
    } else if (parsed.category === 'directory' && externalSearchQuery.trim() === 'kategorija:imenik') {
      setSelectedCategoryId('all');
    }
  }, [externalSearchQuery]);

  // Modal state for adding or suggesting an entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrEntry, setQrEntry] = useState<DirectoryEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);
  const [activeDetailSlug, setActiveDetailSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('imenik');
  });
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formLocation, setFormLocation] = useState('Slovenija');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestionNote, setAiSuggestionNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubCats = subscribeToDirectoryCategories((cats) => {
      setCategories(cats);
      setFormCategoryId((prev) => prev || cats[0]?.id || '');
    });
    const unsubEntries = subscribeToDirectoryEntries(setEntries);
    return () => {
      unsubCats();
      unsubEntries();
    };
  }, []);

  const featuredCarouselRef = useRef<HTMLDivElement>(null);

  const publishedEntries = useMemo(
    () => entries.filter((e) => e.status === 'published'),
    [entries]
  );

  const activeDetailEntry = useMemo(() => {
    if (!activeDetailSlug) return null;
    return (
      publishedEntries.find(
        (e) => getDirectoryEntrySlug(e) === activeDetailSlug || e.id === activeDetailSlug
      ) || null
    );
  }, [publishedEntries, activeDetailSlug]);

  const relatedEntriesForDetail = useMemo(() => {
    if (!activeDetailEntry) return [];
    return publishedEntries
      .filter(
        (e) => e.id !== activeDetailEntry.id && e.categoryId === activeDetailEntry.categoryId
      )
      .slice(0, 4);
  }, [publishedEntries, activeDetailEntry]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const slug = new URLSearchParams(window.location.search).get('imenik');
      setActiveDetailSlug(slug);
      scrollToPageTop();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (activeDetailEntry?.id) {
      scrollToPageTop();
    }
  }, [activeDetailEntry?.id]);

  const handleOpenDetail = (entry: DirectoryEntry) => {
    const slug = getDirectoryEntrySlug(entry);
    setActiveDetailSlug(slug);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/imenik';
      url.searchParams.set('imenik', slug);
      window.history.pushState({}, '', url.toString());
    }
    scrollToPageTop();
  };

  const handleCloseDetail = () => {
    setActiveDetailSlug(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/imenik';
      url.searchParams.delete('imenik');
      window.history.pushState({}, '', url.toString());
    }
    scrollToPageTop();
  };

  const featuredEntries = useMemo(() => {
    const explicit = publishedEntries.filter((e) => e.isFeatured);
    if (explicit.length > 0) return explicit.slice(0, 8);
    return publishedEntries.filter((e) => e.isVerified).slice(0, 6);
  }, [publishedEntries]);

  const scrollFeaturedCarousel = (direction: 'left' | 'right') => {
    if (!featuredCarouselRef.current) return;
    featuredCarouselRef.current.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  const pendingSuggestionsCount = useMemo(
    () => entries.filter((e) => e.status === 'pending').length,
    [entries]
  );

  const myPendingSuggestions = useMemo(() => {
    if (!currentUser?.id) return [];
    return entries.filter((e) => e.status === 'pending' && e.authorId === currentUser.id);
  }, [entries, currentUser?.id]);

  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    for (const e of publishedEntries) {
      if (e.location && e.location.trim()) {
        locs.add(e.location.trim());
      }
    }
    return Array.from(locs).sort((a, b) => a.localeCompare(b, 'sl'));
  }, [publishedEntries]);

  const filteredEntries = useMemo(() => {
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = publishedEntries.filter((entry) => {
      if (selectedCategoryId !== 'all' && entry.categoryId !== selectedCategoryId) {
        return false;
      }
      if (selectedLocation !== 'all' && (entry.location || '').trim() !== selectedLocation) {
        return false;
      }
      if (verifiedOnly && !entry.isVerified) {
        return false;
      }
      if (terms.length === 0) return true;
      const searchable = [
        entry.name,
        entry.domain,
        entry.description,
        entry.categoryName,
        entry.location || '',
        entry.address || '',
        entry.phone || '',
        entry.email || '',
        ...(entry.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'az') return a.name.localeCompare(b.name, 'sl');
      if (sortMode === 'za') return b.name.localeCompare(a.name, 'sl');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [publishedEntries, selectedCategoryId, selectedLocation, verifiedOnly, searchQuery, sortMode]);

  const categoryCounts = useMemo(() => {
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const e of publishedEntries) {
      if (selectedLocation !== 'all' && (e.location || '').trim() !== selectedLocation) {
        continue;
      }
      if (terms.length > 0) {
        const searchable = [
          e.name,
          e.domain,
          e.description,
          e.categoryName,
          e.location || '',
          e.address || '',
          e.phone || '',
          e.email || '',
          ...(e.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!terms.every((term) => searchable.includes(term))) {
          continue;
        }
      }
      counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
    }
    return counts;
  }, [publishedEntries, searchQuery, selectedLocation]);

  const totalMatchingAcrossCategories = useMemo(
    () => Object.values(categoryCounts).reduce((sum, n) => sum + n, 0),
    [categoryCounts]
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategoryId !== 'all' ||
    selectedLocation !== 'all' ||
    verifiedOnly;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSelectedLocation('all');
    setVerifiedOnly(false);
  };

  const handleOpenModal = () => {
    setFeedbackMsg(null);
    if (!formCategoryId && categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
    setIsModalOpen(true);
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim() || !formDescription.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Prosimo, izpolnite naziv, spletni naslov in opis.' });
      return;
    }
    const chosenCat = categories.find((c) => c.id === formCategoryId) || categories[0];
    if (!chosenCat) {
      setFeedbackMsg({ type: 'error', text: 'Izberite veljavno kategorijo imenika.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      await createDirectoryEntry({
        name: formName,
        url: formUrl,
        description: formDescription,
        categoryId: chosenCat.id,
        categoryName: chosenCat.name,
        location: formLocation,
        tags: formTags,
        authorId: currentUser?.id || `guest-${Date.now()}`,
        authorName: currentUser?.name || 'Obiskovalec',
        authorRole: role,
      });

      setFormName('');
      setFormUrl('');
      setFormDescription('');
      setFormTags([]);
      setAiSuggestionNote(null);
      setFormLocation('Slovenija');
      setIsModalOpen(false);

      setFeedbackMsg({
        type: 'success',
        text: canPublish
          ? 'Vnos je bil uspešno objavljen v slovenskem spletnem imeniku.'
          : 'Hvala! Vaš predlog je bil poslan v pregled administratorjem.',
      });
    } catch (err) {
      console.error('Failed to submit directory entry:', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Pri shranjevanju vnosa je prišlo do napake. Poskusite znova.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entry: DirectoryEntry) => {
    if (!isAdminUser) return;
    try {
      await deleteDirectoryEntry(entry.id);
    } catch (err) {
      console.error('Failed to delete directory entry:', err);
    }
  };

  if (activeDetailEntry) {
    return (
      <>
        <DirectoryDetailPage
          key={activeDetailEntry.id}
          entry={activeDetailEntry}
          relatedEntries={relatedEntriesForDetail}
          canEdit={isAdminUser}
          onBack={handleCloseDetail}
          onSelectEntry={handleOpenDetail}
          onOpenQr={(entry) => setQrEntry(entry)}
          onEdit={(entry) => setEditingEntry(entry)}
        />
        <DirectoryQrModal entry={qrEntry} onClose={() => setQrEntry(null)} />
        <DirectoryEditModal
          entry={editingEntry}
          categories={categories}
          onClose={() => setEditingEntry(null)}
          onSaved={(name) =>
            setFeedbackMsg({
              type: 'success',
              text: `Vnos »${name}« je bil uspešno posodobljen.`,
            })
          }
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header Banner */}
      <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container/60 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-headline-md text-xl font-black text-on-surface tracking-tight">
                  Slovenski spletni imenik
                </h1>
                <p className="text-xs text-on-surface-variant">
                  Preverjen izbor priljubljenih slovenskih blagovnih znamk, podjetij in spletnih storitev
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isAdminUser && onOpenAdminDirectory && (
              <button
                type="button"
                onClick={onOpenAdminDirectory}
                className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-surface-container transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FolderTree className="w-3.5 h-3.5 text-primary" />
                <span>Upravljaj imenik</span>
                {pendingSuggestionsCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-error text-on-error text-[10px] font-bold tabular-nums">
                    {pendingSuggestionsCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {canPublish ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Dodaj v imenik</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Predlagaj vnos</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Role permission hint */}
        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant bg-surface-container-low/70 rounded-xl px-3 py-2 border border-surface-container/50">
          {canPublish ? (
            <>
              <ShieldCheck className="w-4 h-4 text-secondary shrink-0" />
              <span>
                Kot <strong className="text-on-surface">{role === 'superadmin' ? 'superadministrator' : role === 'admin' ? 'administrator' : 'preverjen uporabnik'}</strong> lahko nove spletne strani objavljate neposredno v imenik.
              </span>
            </>
          ) : (
            <>
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                Neposredno objavljanje v imenik je omogočeno preverjenim uporabnikom in administratorjem. Lahko pa kadar koli oddate <strong className="text-on-surface">predlog za vnos</strong> v pregled.
              </span>
            </>
          )}
        </div>

        {feedbackMsg && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border flex items-center justify-between gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-secondary/10 border-secondary/25 text-secondary'
                : 'bg-error/10 border-error/25 text-error'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
              aria-label="Zapri obvestilo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search + Category Selector inside Search Bar + Location/Sort Controls */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-surface-container-low rounded-xl border border-surface-container focus-within:border-primary focus-within:bg-surface-container-lowest transition-colors">
              <div className="relative flex items-center border-r border-surface-container pl-2.5 pr-1 max-w-[175px] shrink-0">
                <FolderTree className="w-3.5 h-3.5 text-primary shrink-0 mr-1" />
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  aria-label="Išči po kategoriji Imenika"
                  className="appearance-none bg-transparent py-2.5 pr-5 pl-0.5 text-xs font-bold text-on-surface cursor-pointer focus:outline-none truncate max-w-full"
                >
                  <option value="all">Vse kategorije</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2 pointer-events-none" />
              </div>
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Išči blagovno znamko, podjetje, kategorijo ali kraj..."
                  aria-label="Išči v spletnem imeniku"
                  className="w-full pl-9 pr-9 py-2.5 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Počisti iskanje"
                    title="Počisti iskanje"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {availableLocations.length > 1 && (
                <div className="relative flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-outline absolute left-2.5 pointer-events-none" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    aria-label="Filtriraj po kraju"
                    className="pl-7 pr-7 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">Vsi kraji</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="relative flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 text-outline absolute left-2.5 pointer-events-none" />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as DirectorySortMode)}
                  aria-label="Razvrsti vnose"
                  className="pl-7 pr-6 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="az">A–Ž</option>
                  <option value="za">Ž–A</option>
                  <option value="newest">Najnovejše</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setVerifiedOnly((prev) => !prev)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  verifiedOnly
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:text-on-surface'
                }`}
                title="Prikaži samo uradno preverjena podjetja"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Preverjeni</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer border ${
                selectedCategoryId === 'all'
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:text-on-surface'
              }`}
            >
              Vse kategorije ({totalMatchingAcrossCategories})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer border ${
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:text-on-surface'
                }`}
              >
                {cat.name} ({categoryCounts[cat.id] || 0})
              </button>
            ))}
          </div>

          {/* Active Filter Status Bar + List/Grid View Toggle */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-outline pt-1 border-t border-surface-container-low flex-wrap">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 tabular-nums">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary/70" />
                <span>
                  Prikazanih <strong className="text-on-surface">{filteredEntries.length}</strong> od{' '}
                  <strong className="text-on-surface">{publishedEntries.length}</strong> vnosov
                </span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Počisti filtre</span>
                </button>
              )}
            </div>

            <div
              className="inline-flex items-center p-0.5 rounded-lg bg-surface-container-low border border-surface-container"
              role="group"
              aria-label="Način prikaza imenika"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Prikaz seznama"
              >
                <List className="w-3.5 h-3.5" />
                <span>Seznam</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Mrežni prikaz"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Mreža</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Entries Horizontal Carousel */}
      {featuredEntries.length > 0 && (
        <section className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container/60 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-on-surface truncate">
                  Izpostavljeni vnosi
                </h2>
                <p className="text-[11px] text-on-surface-variant truncate">
                  Izbor uredništva in najbolj obiskane slovenske blagovne znamke
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => scrollFeaturedCarousel('left')}
                className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container transition-colors cursor-pointer"
                aria-label="Pomakni izpostavljene levo"
                title="Prejšnji"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollFeaturedCarousel('right')}
                className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container transition-colors cursor-pointer"
                aria-label="Pomakni izpostavljene desno"
                title="Naslednji"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={featuredCarouselRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scroll-smooth"
          >
            {featuredEntries.map((entry, idx) => (
              <div
                key={entry.id}
                className={`min-w-[260px] max-w-[280px] shrink-0 snap-start flex ${getFeedCardAnimationClass(idx)}`}
              >
                <article
                  className="w-full rounded-xl p-3.5 bg-surface-container-low/65 border border-amber-500/20 hover:border-primary/40 transition-all flex flex-col justify-between gap-2.5 group"
                >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-lowest border border-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={
                            entry.logoUrl ||
                            `https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.domain)}&sz=64`
                          }
                          alt={entry.name}
                          className="w-5 h-5 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(entry)}
                            className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate text-left cursor-pointer hover:underline"
                          >
                            {entry.name}
                          </button>
                          {entry.isVerified && (
                            <BadgeCheck
                              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                              aria-label="Preverjeno podjetje"
                            />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-primary truncate block">
                          {entry.domain}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[9px] font-bold shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>Izbor</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">
                    {entry.description}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container">
                  <span className="text-[10px] font-semibold text-outline truncate">
                    {entry.categoryName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQrEntry(entry)}
                      className="p-1.5 rounded-lg bg-surface-container-lowest hover:bg-primary/10 text-on-surface-variant hover:text-primary border border-surface-container transition-colors cursor-pointer"
                      title={`Prikaži QR kodo za ${entry.name}`}
                      aria-label={`Prikaži QR kodo za ${entry.name}`}
                    >
                      <QrCode className="w-3 h-3" />
                    </button>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary text-[10px] font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Obišči</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </article>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* User's own pending suggestions notice */}
      {myPendingSuggestions.length > 0 && (
        <section className="bg-amber-500/8 border border-amber-500/25 rounded-2xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Vaši predlogi v čakanju na odobritev ({myPendingSuggestions.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {myPendingSuggestions.map((s) => (
              <span
                key={s.id}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-amber-500/25 text-on-surface"
              >
                {s.name} ({s.domain})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Directory Entries (List View or Grid View) */}
      {filteredEntries.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-surface-container/60 flex flex-col items-center gap-2">
          <Globe className="w-8 h-8 text-outline/60" />
          <p className="text-sm font-bold text-on-surface">Ni najdenih vnosov v imeniku</p>
          <p className="text-xs text-on-surface-variant max-w-sm">
            Poskusite z drugim iskalnim pojmom ali izberite drugo kategorijo.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-2.5">
          {filteredEntries.map((entry, idx) => (
            <div key={entry.id} className={getFeedCardAnimationClass(idx)}>
              <article
                className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-surface-container/60 hover:border-primary/35 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                  <img
                    src={
                      entry.logoUrl ||
                      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.domain)}&sz=64`
                    }
                    alt={entry.name}
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(entry)}
                      className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors text-left cursor-pointer hover:underline truncate"
                    >
                      {entry.name}
                    </button>
                    {entry.isVerified && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-bold shrink-0"
                        title="Uradno preverjeno in potrjeno podjetje s strani uredništva"
                      >
                        <BadgeCheck className="w-3 h-3 shrink-0" />
                        <span>Preverjeno</span>
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15">
                      {entry.categoryName}
                    </span>
                    {entry.ratingCount && entry.ratingCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[10px] font-bold tabular-nums">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span>{(entry.ratingAverage || 0).toFixed(1)}</span>
                        <span className="opacity-75">({entry.ratingCount})</span>
                      </span>
                    ) : null}
                    {entry.location && (
                      <span className="text-[10px] text-outline inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{entry.location}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-1">
                    {entry.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>{entry.domain}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-surface-container"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(entry)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Podrobnosti
                </button>
                <button
                  type="button"
                  onClick={() => setQrEntry(entry)}
                  className="px-2 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title={`Prikaži QR kodo za ${entry.name}`}
                  aria-label={`Prikaži QR kodo za ${entry.name}`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR</span>
                </button>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary text-[11px] font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                >
                  <span>Obišči</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                {isAdminUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingEntry(entry)}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title={`Uredi vnos ${entry.name}`}
                      aria-label={`Uredi vnos ${entry.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry)}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title={`Izbriši vnos ${entry.name}`}
                      aria-label={`Izbriši vnos ${entry.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </article>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredEntries.map((entry, idx) => (
            <div key={entry.id} className={getFeedCardAnimationClass(idx)}>
              <article
                className="h-full bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container/60 hover:border-primary/35 transition-all flex flex-col justify-between gap-3 group"
              >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={
                          entry.logoUrl ||
                          `https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.domain)}&sz=64`
                        }
                        alt={entry.name}
                        className="w-6 h-6 object-contain"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(entry)}
                          className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate text-left cursor-pointer hover:underline"
                        >
                          {entry.name}
                        </button>
                        {entry.isVerified && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-bold shrink-0"
                            title="Uradno preverjeno in potrjeno podjetje s strani uredništva"
                          >
                            <BadgeCheck className="w-3 h-3 shrink-0" />
                            <span>Preverjeno</span>
                          </span>
                        )}
                      </div>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 truncate max-w-full"
                      >
                        <span className="truncate">{entry.domain}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>

                  {isAdminUser && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingEntry(entry)}
                        className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title={`Uredi vnos ${entry.name}`}
                        aria-label={`Uredi vnos ${entry.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry)}
                        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title={`Izbriši vnos ${entry.name}`}
                        aria-label={`Izbriši vnos ${entry.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">
                  {entry.description}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {entry.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-surface-container"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-surface-container-low">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15 truncate max-w-[160px]">
                    {entry.categoryName}
                  </span>
                  {entry.ratingCount && entry.ratingCount > 0 ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[10px] font-bold tabular-nums">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      <span>{(entry.ratingAverage || 0).toFixed(1)}</span>
                      <span className="opacity-75">({entry.ratingCount})</span>
                    </span>
                  ) : null}
                  {entry.location && (
                    <span className="text-[10px] text-outline flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{entry.location}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(entry)}
                    className="px-2 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Podrobnosti
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrEntry(entry)}
                    className="px-2 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    title={`Prikaži QR kodo za ${entry.name}`}
                    aria-label={`Prikaži QR kodo za ${entry.name}`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </button>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-bold transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Obišči</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </article>
            </div>
          ))}
        </div>
      )}

      {/* Add / Suggest Entry Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl w-full max-w-lg p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-on-surface">
                  {canPublish ? 'Dodaj stran v slovenski imenik' : 'Predlagaj vnos v imenik'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low cursor-pointer"
                aria-label="Zapri"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!canPublish && (
              <div className="rounded-xl bg-primary/8 border border-primary/20 px-3 py-2 text-xs text-on-surface-variant leading-relaxed">
                Vaš predlog bo posredovan administratorjem portala. Po potrditvi bo spletna stran javno prikazana v imeniku.
              </div>
            )}

            <form onSubmit={handleSubmitEntry} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">Naziv blagovne znamke ali podjetja *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="npr. Gorenje, Akrapovič, RTV Slovenija..."
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface">Spletni naslov (URL) *</label>
                  <input
                    type="text"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://www.primer.si"
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface">Kategorija *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">Kraj / Regija</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="npr. Ljubljana, Maribor, Slovenija"
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-on-surface">Kratek opis spletne strani *</label>
                  <button
                    type="button"
                    disabled={isAiSuggesting || (!formDescription.trim() && !formName.trim())}
                    onClick={async () => {
                      setIsAiSuggesting(true);
                      setAiSuggestionNote(null);
                      try {
                        const res = await requestAiDirectorySuggestions({
                          name: formName,
                          url: formUrl,
                          description: formDescription,
                          categories,
                        });
                        setFormCategoryId(res.suggestedCategoryId);
                        setFormTags(res.suggestedTags);
                        setAiSuggestionNote(
                          `AI predlog: kategorija »${res.suggestedCategoryName}«${res.reason ? ` — ${res.reason}` : ''}`
                        );
                      } catch (err: any) {
                        setAiSuggestionNote(err?.message || 'AI predlog trenutno ni na voljo.');
                      } finally {
                        setIsAiSuggesting(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAiSuggesting ? 'AI analizira...' : 'AI predlagaj kategorijo in oznake'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Opišite ponudbo, storitve ali vsebino spletne strani..."
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
                />
                {aiSuggestionNote && (
                  <p className="text-[11px] text-primary font-medium mt-0.5">{aiSuggestionNote}</p>
                )}
                {formTags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {formTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => setFormTags((prev) => prev.filter((t) => t !== tag))}
                          className="hover:text-error cursor-pointer"
                          aria-label={`Odstrani oznako ${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold cursor-pointer"
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Shranjujem...'
                    : canPublish
                    ? 'Objavi v imenik'
                    : 'Oddaj predlog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* QR Code Contact Modal */}
      <DirectoryQrModal entry={qrEntry} onClose={() => setQrEntry(null)} />

      {/* Admin Edit Modal */}
      <DirectoryEditModal
        entry={editingEntry}
        categories={categories}
        onClose={() => setEditingEntry(null)}
        onSaved={(name) =>
          setFeedbackMsg({
            type: 'success',
            text: `Vnos »${name}« je bil uspešno posodobljen.`,
          })
        }
      />
    </div>
  );
}
