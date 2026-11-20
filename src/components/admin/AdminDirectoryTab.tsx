import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FolderTree,
  Clock,
  Pencil,
  Check,
  X,
  Bell,
  Sparkles,
  BadgeCheck,
  Star,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DirectoryEditModal } from '../DirectoryEditModal';
import {
  DirectoryCategory,
  DirectoryEntry,
  subscribeToDirectoryCategories,
  subscribeToDirectoryEntries,
  createDirectoryCategory,
  updateDirectoryCategory,
  deleteDirectoryCategory,
  updateDirectoryEntryStatus,
  updateDirectoryEntryMetadata,
  updateDirectoryEntryVerified,
  bulkUpdateDirectoryEntriesVerified,
  updateDirectoryEntryFeatured,
  deleteDirectoryEntry,
  createDirectoryEntry,
  bulkUpdateDirectoryEntriesStatus,
  bulkUpdateDirectoryEntriesCategory,
  bulkDeleteDirectoryEntries,
  canNotifyDirectoryAuthor,
  notifyDirectoryEntryAuthor,
  notifyAllReviewedDirectorySuggesters,
  requestAiDirectorySuggestions,
} from '../../services/directoryService';

export function AdminDirectoryTab() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'rejected'>('all');

  // Category creation / editing
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Quick entry creation
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryUrl, setEntryUrl] = useState('');
  const [entryCatId, setEntryCatId] = useState('');
  const [entryLocation, setEntryLocation] = useState('Slovenija');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryVerified, setEntryVerified] = useState(true);

  // Bulk selection & actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [autoNotifyOnDecision, setAutoNotifyOnDecision] = useState(true);
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [notifyCustomNote, setNotifyCustomNote] = useState('');
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [aiProcessingEntryId, setAiProcessingEntryId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);

  useEffect(() => {
    const unsubCats = subscribeToDirectoryCategories((cats) => {
      setCategories(cats);
      setEntryCatId((prev) => prev || cats[0]?.id || '');
      setBulkCategoryId((prev) => prev || cats[0]?.id || '');
    });
    const unsubEntries = subscribeToDirectoryEntries(setEntries);
    return () => {
      unsubCats();
      unsubEntries();
    };
  }, []);

  const pendingCount = useMemo(
    () => entries.filter((e) => e.status === 'pending').length,
    [entries]
  );

  const filteredEntries = useMemo(() => {
    if (statusFilter === 'all') return entries;
    return entries.filter((e) => e.status === statusFilter);
  }, [entries, statusFilter]);

  const allFilteredSelected =
    filteredEntries.length > 0 && filteredEntries.every((e) => selectedIds.includes(e.id));

  const toggleSelectEntry = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredEntries.map((e) => e.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredEntries.map((e) => e.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const unnotifiedReviewedEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          (e.status === 'published' || e.status === 'rejected') &&
          canNotifyDirectoryAuthor(e) &&
          e.notifiedStatus !== e.status
      ),
    [entries]
  );

  const handleSingleStatusDecision = async (
    entry: DirectoryEntry,
    status: 'published' | 'rejected'
  ) => {
    const adminName = currentUser?.name || currentUser?.email || 'Admin';
    await updateDirectoryEntryStatus(entry.id, status, adminName);
    if (autoNotifyOnDecision && canNotifyDirectoryAuthor(entry)) {
      await notifyDirectoryEntryAuthor(entry, status, adminName, notifyCustomNote);
      setBulkFeedback(
        status === 'published'
          ? `Vnos »${entry.name}« je bil odobren, uporabnik ${entry.authorName} pa obveščen.`
          : `Predlog »${entry.name}« je bil zavrnjen, uporabnik ${entry.authorName} pa obveščen.`
      );
    }
  };

  const handleBulkStatus = async (status: 'published' | 'rejected') => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkFeedback(null);
    try {
      const adminName = currentUser?.name || currentUser?.email || 'Admin';
      const targetEntries = entries.filter((e) => selectedIds.includes(e.id));
      await bulkUpdateDirectoryEntriesStatus(selectedIds, status, adminName);

      let notifiedCount = 0;
      if (autoNotifyOnDecision) {
        for (const entry of targetEntries) {
          if (canNotifyDirectoryAuthor(entry)) {
            const sent = await notifyDirectoryEntryAuthor(entry, status, adminName, notifyCustomNote);
            if (sent) notifiedCount += 1;
          }
        }
      }

      const count = selectedIds.length;
      setSelectedIds([]);
      setBulkFeedback(
        status === 'published'
          ? `Uspešno odobrenih ${count} vnosov${notifiedCount > 0 ? ` (obveščenih ${notifiedCount} uporabnikov)` : ''}.`
          : `Uspešno zavrnjenih ${count} vnosov${notifiedCount > 0 ? ` (obveščenih ${notifiedCount} uporabnikov)` : ''}.`
      );
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleNotifyAllReviewed = async () => {
    setIsSendingNotifications(true);
    setBulkFeedback(null);
    try {
      const adminName = currentUser?.name || currentUser?.email || 'Admin';
      const { sentCount } = await notifyAllReviewedDirectorySuggesters(
        entries,
        adminName,
        notifyCustomNote
      );
      setShowNotifyPanel(false);
      setNotifyCustomNote('');
      setBulkFeedback(
        sentCount > 0
          ? `Uspešno poslanih ${sentCount} obvestil uporabnikom o odobritvi ali zavrnitvi predlogov.`
          : 'Vsi uporabniki s pregledanimi predlogi so že bili obveščeni.'
      );
    } finally {
      setIsSendingNotifications(false);
    }
  };

  const handleBulkCategorize = async () => {
    const cat = categories.find((c) => c.id === bulkCategoryId);
    if (selectedIds.length === 0 || !cat) return;
    setIsBulkProcessing(true);
    setBulkFeedback(null);
    try {
      await bulkUpdateDirectoryEntriesCategory(selectedIds, cat.id, cat.name);
      const count = selectedIds.length;
      setSelectedIds([]);
      setBulkFeedback(`Premaknjenih ${count} vnosov v kategorijo »${cat.name}«.`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleToggleVerified = async (entry: DirectoryEntry) => {
    const adminName = currentUser?.name || currentUser?.email || 'Admin';
    const nextVal = !entry.isVerified;
    await updateDirectoryEntryVerified(entry.id, nextVal, adminName);
    setBulkFeedback(
      nextVal
        ? `Vnos »${entry.name}« je zdaj označen kot uradno preverjeno podjetje.`
        : `Vnosu »${entry.name}« je bila odstranjena oznaka preverjenosti.`
    );
  };

  const handleToggleFeatured = async (entry: DirectoryEntry) => {
    const nextVal = !entry.isFeatured;
    await updateDirectoryEntryFeatured(entry.id, nextVal);
    setBulkFeedback(
      nextVal
        ? `Vnos »${entry.name}« je zdaj prikazan v vrtiljaku izpostavljenih vnosov.`
        : `Vnos »${entry.name}« je bil odstranjen iz izpostavljenih vnosov.`
    );
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkFeedback(null);
    try {
      const adminName = currentUser?.name || currentUser?.email || 'Admin';
      const count = selectedIds.length;
      await bulkUpdateDirectoryEntriesVerified(selectedIds, true, adminName);
      setSelectedIds([]);
      setBulkFeedback(`Označenih ${count} vnosov kot uradno preverjenih.`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkFeedback(null);
    try {
      const count = selectedIds.length;
      await bulkDeleteDirectoryEntries(selectedIds);
      setSelectedIds([]);
      setBulkFeedback(`Izbrisanih ${count} vnosov.`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleAiCategorizeEntry = async (entry: DirectoryEntry) => {
    if (categories.length === 0) return;
    setAiProcessingEntryId(entry.id);
    setBulkFeedback(null);
    try {
      const suggestion = await requestAiDirectorySuggestions({
        name: entry.name,
        url: entry.url,
        description: entry.description,
        categories,
      });
      await updateDirectoryEntryMetadata(entry.id, {
        categoryId: suggestion.suggestedCategoryId,
        categoryName: suggestion.suggestedCategoryName,
        tags: suggestion.suggestedTags,
      });
      setBulkFeedback(
        `AI je vnos »${entry.name}« uvrstil v »${suggestion.suggestedCategoryName}« z oznakami: ${suggestion.suggestedTags.map((t) => `#${t}`).join(', ')}.`
      );
    } catch (err: any) {
      setBulkFeedback(err?.message || 'AI kategorizacija ni uspela.');
    } finally {
      setAiProcessingEntryId(null);
    }
  };

  const handleBulkAiCategorize = async () => {
    if (selectedIds.length === 0 || categories.length === 0) return;
    setIsBulkProcessing(true);
    setBulkFeedback(null);
    try {
      const targets = entries.filter((e) => selectedIds.includes(e.id));
      let updatedCount = 0;
      for (const entry of targets) {
        try {
          const suggestion = await requestAiDirectorySuggestions({
            name: entry.name,
            url: entry.url,
            description: entry.description,
            categories,
          });
          await updateDirectoryEntryMetadata(entry.id, {
            categoryId: suggestion.suggestedCategoryId,
            categoryName: suggestion.suggestedCategoryName,
            tags: suggestion.suggestedTags,
          });
          updatedCount += 1;
        } catch {
          // continue with remaining selected entries
        }
      }
      setSelectedIds([]);
      setBulkFeedback(`AI je samodejno kategoriziral in označil ${updatedCount} od ${targets.length} izbranih vnosov.`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSavingCat(true);
    try {
      await createDirectoryCategory({
        name: newCatName,
        description: newCatDesc,
        order: categories.length + 1,
        createdBy: currentUser?.name || currentUser?.email || 'admin',
      });
      setNewCatName('');
      setNewCatDesc('');
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleSaveCategoryRename = async (id: string) => {
    if (!editingCatName.trim()) return;
    await updateDirectoryCategory(id, { name: editingCatName });
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === entryCatId) || categories[0];
    if (!cat || !entryName.trim() || !entryUrl.trim()) return;
    await createDirectoryEntry({
      name: entryName,
      url: entryUrl,
      description: entryDesc || `${entryName} – spletna stran`,
      categoryId: cat.id,
      categoryName: cat.name,
      location: entryLocation,
      isVerified: entryVerified,
      authorId: currentUser?.id || 'admin',
      authorName: currentUser?.name || 'Administrator',
      authorRole: currentUser?.role || 'admin',
    });
    setEntryName('');
    setEntryUrl('');
    setEntryDesc('');
    setEntryVerified(true);
    setShowAddEntry(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1: Directory Categories Management */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container/60 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-on-surface">Kategorije imenika</h3>
              <p className="text-xs text-on-surface-variant">
                Kategorije slovenskega spletnega imenika določajo izključno administratorji in superadministratorji.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-outline tabular-nums">{categories.length} kategorij</span>
        </div>

        <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Ime nove kategorije (npr. Šport in rekreacija)"
            className="sm:col-span-5 px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
            required
          />
          <input
            type="text"
            value={newCatDesc}
            onChange={(e) => setNewCatDesc(e.target.value)}
            placeholder="Kratek opis kategorije (neobvezno)"
            className="sm:col-span-5 px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isSavingCat}
            className="sm:col-span-2 px-3 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dodaj</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low/60 border border-surface-container/60"
            >
              {editingCatId === cat.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-surface-container-lowest border border-primary text-xs text-on-surface focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCategoryRename(cat.id)}
                    className="p-1 rounded-lg text-secondary hover:bg-secondary/10 cursor-pointer"
                    aria-label="Shrani ime kategorije"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCatId(null)}
                    className="p-1 rounded-lg text-outline hover:bg-surface-container cursor-pointer"
                    aria-label="Prekliči urejanje"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-on-surface truncate">{cat.name}</div>
                    {cat.description && (
                      <div className="text-[10px] text-outline truncate">{cat.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                      className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container cursor-pointer"
                      title="Preimenuj kategorijo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDirectoryCategory(cat.id)}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 cursor-pointer"
                      title="Izbriši kategorijo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Directory Entries & User Suggestions */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container/60 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-on-surface">Vnosi in predlogi za Imenik</h3>
              <p className="text-xs text-on-surface-variant">
                Preglejte in odobrite predloge uporabnikov ali dodajte nove slovenske spletne strani.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowNotifyPanel((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-surface-container flex items-center gap-1.5 cursor-pointer"
              title="Pošlji obvestilo uporabnikom, katerih predlogi so bili odobreni ali zavrnjeni"
            >
              <Bell className="w-3.5 h-3.5 text-primary" />
              <span>Obvesti predlagatelje</span>
              {unnotifiedReviewedEntries.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-primary text-on-primary text-[10px] font-bold tabular-nums">
                  {unnotifiedReviewedEntries.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAddEntry((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nov vnos</span>
            </button>
          </div>
        </div>

        {/* Notification settings & batch send panel */}
        {showNotifyPanel && (
          <div className="p-3.5 rounded-xl bg-primary/6 border border-primary/20 flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span>Obveščanje uporabnikov o statusu predlogov v Imeniku</span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoNotifyOnDecision}
                  onChange={(e) => setAutoNotifyOnDecision(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                />
                <span>Samodejno obvesti ob odobritvi / zavrnitvi</span>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={notifyCustomNote}
                onChange={(e) => setNotifyCustomNote(e.target.value)}
                placeholder="Neobvezna opomba uredništva za uporabnike (npr. razlog zavrnitve ali zahvala)..."
                className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={isSendingNotifications || unnotifiedReviewedEntries.length === 0}
                onClick={handleNotifyAllReviewed}
                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {isSendingNotifications
                    ? 'Pošiljam...'
                    : `Pošlji vsem neobveščenim (${unnotifiedReviewedEntries.length})`}
                </span>
              </button>
            </div>
          </div>
        )}

        {showAddEntry && (
          <form
            onSubmit={handleAddEntry}
            className="p-3.5 rounded-xl bg-surface-container-low/70 border border-surface-container grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            <input
              type="text"
              required
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              placeholder="Naziv podjetja / znamke *"
              className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface"
            />
            <input
              type="text"
              required
              value={entryUrl}
              onChange={(e) => setEntryUrl(e.target.value)}
              placeholder="URL (npr. https://www.primer.si) *"
              className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface"
            />
            <select
              value={entryCatId}
              onChange={(e) => setEntryCatId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={entryLocation}
              onChange={(e) => setEntryLocation(e.target.value)}
              placeholder="Kraj (npr. Ljubljana)"
              className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface"
            />
            <input
              type="text"
              value={entryDesc}
              onChange={(e) => setEntryDesc(e.target.value)}
              placeholder="Kratek opis spletne strani"
              className="sm:col-span-2 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface"
            />
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={entryVerified}
                  onChange={(e) => setEntryVerified(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                />
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Označi kot uradno preverjeno podjetje</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEntry(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-outline hover:text-on-surface cursor-pointer"
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                >
                  Objavi takoj
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filter pills + Select All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { id: 'all', label: `Vsi (${entries.length})` },
              { id: 'pending', label: `Predlogi v čakanju (${pendingCount})` },
              { id: 'published', label: `Objavljeni (${entries.filter((e) => e.status === 'published').length})` },
              { id: 'rejected', label: `Zavrnjeni (${entries.filter((e) => e.status === 'rejected').length})` },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredEntries.length > 0 && (
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface-variant cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="w-4 h-4 rounded border-surface-container accent-primary cursor-pointer"
              />
              <span>Izberi vse ({filteredEntries.length})</span>
            </label>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-primary/8 border border-primary/25 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
              <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary tabular-nums">
                {selectedIds.length}
              </span>
              <span>izbranih vnosov</span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[11px] font-semibold text-outline hover:text-on-surface underline cursor-pointer ml-1"
              >
                Počisti izbor
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkStatus('published')}
                className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-bold inline-flex items-center gap-1 hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Odobri izbrane</span>
              </button>

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkStatus('rejected')}
                className="px-2.5 py-1.5 rounded-lg bg-error/12 hover:bg-error text-error hover:text-on-error text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Zavrni izbrane</span>
              </button>

              {categories.length > 0 && (
                <div className="flex items-center gap-1 bg-surface-container-lowest border border-surface-container rounded-lg p-0.5">
                  <select
                    value={bulkCategoryId}
                    onChange={(e) => setBulkCategoryId(e.target.value)}
                    aria-label="Izberi ciljno kategorijo za množični premik"
                    className="px-2 py-1 text-xs text-on-surface bg-transparent focus:outline-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isBulkProcessing}
                    onClick={handleBulkCategorize}
                    className="px-2.5 py-1 rounded-md bg-primary text-on-primary text-xs font-bold hover:bg-primary-container disabled:opacity-50 cursor-pointer"
                  >
                    Kategoriziraj
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkVerify}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/12 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                title="Označi izbrane vnose kot uradno preverjena podjetja"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Preveri izbrane</span>
              </button>

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkAiCategorize}
                className="px-2.5 py-1.5 rounded-lg bg-primary/12 hover:bg-primary text-primary hover:text-on-primary text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                title="AI samodejno določi kategorijo in ključne oznake za izbrane vnose"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI kategoriziraj</span>
              </button>

              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-error/25 text-error hover:bg-error hover:text-on-error text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Izbriši</span>
              </button>
            </div>
          </div>
        )}

        {bulkFeedback && (
          <div className="px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/25 text-secondary text-xs font-semibold flex items-center justify-between gap-2">
            <span>{bulkFeedback}</span>
            <button
              type="button"
              onClick={() => setBulkFeedback(null)}
              className="p-0.5 rounded hover:bg-black/5 cursor-pointer"
              aria-label="Zapri obvestilo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Entries list */}
        <div className="flex flex-col gap-2">
          {filteredEntries.length === 0 ? (
            <p className="text-xs text-outline py-6 text-center">Ni vnosov za izbrani filter.</p>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = selectedIds.includes(entry.id);
              return (
              <div
                key={entry.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-surface-container/60 bg-surface-container-low/40'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectEntry(entry.id)}
                    aria-label={`Izberi vnos ${entry.name}`}
                    className="mt-1 w-4 h-4 rounded border-surface-container accent-primary cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-on-surface">{entry.name}</span>
                    {entry.isVerified && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 inline-flex items-center gap-0.5">
                        <BadgeCheck className="w-3 h-3" />
                        <span>Preverjeno</span>
                      </span>
                    )}
                    {entry.isFeatured && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 inline-flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Izpostavljeno</span>
                      </span>
                    )}
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>{entry.domain}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      {entry.categoryName}
                    </span>
                    {entry.status === 'pending' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Predlog</span>
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-error/10 text-error">
                        Zavrnjeno
                      </span>
                    )}
                    {entry.notifiedStatus === entry.status && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-secondary/10 text-secondary inline-flex items-center gap-1">
                        <Bell className="w-2.5 h-2.5" />
                        <span>Obveščen</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{entry.description}</p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-outline mt-1">
                    Avtor: {entry.authorName} ({entry.authorRole}) • {entry.location || 'Slovenija'}
                  </div>
                </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(entry)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary/10 text-on-surface hover:text-primary text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Uredi vnos in kontaktne podatke"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Uredi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVerified(entry)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      entry.isVerified
                        ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                    title={
                      entry.isVerified
                        ? 'Odstrani oznako uradno preverjenega podjetja'
                        : 'Označi kot uradno preverjeno podjetje'
                    }
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>{entry.isVerified ? 'Preverjeno' : 'Preveri'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(entry)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      entry.isFeatured
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300'
                    }`}
                    title={
                      entry.isFeatured
                        ? 'Odstrani iz vrtiljaka izpostavljenih vnosov'
                        : 'Dodaj v vrtiljak izpostavljenih vnosov'
                    }
                  >
                    <Star className={`w-3.5 h-3.5 ${entry.isFeatured ? 'fill-current' : ''}`} />
                    <span>{entry.isFeatured ? 'Izpostavljeno' : 'Izpostavi'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={aiProcessingEntryId === entry.id}
                    onClick={() => handleAiCategorizeEntry(entry)}
                    className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-on-primary text-xs font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                    title="AI samodejno predlaga in nastavi kategorijo ter ključne oznake"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiProcessingEntryId === entry.id ? 'AI...' : 'AI oznake'}</span>
                  </button>
                  {entry.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handleSingleStatusDecision(entry, 'published')}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary/12 hover:bg-secondary text-secondary hover:text-on-secondary text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Odobri</span>
                    </button>
                  )}
                  {entry.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleSingleStatusDecision(entry, 'rejected')}
                      className="px-2.5 py-1.5 rounded-lg bg-error/10 hover:bg-error text-error hover:text-on-error text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Zavrni</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteDirectoryEntry(entry.id)}
                    className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    title="Izbriši vnos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      <DirectoryEditModal
        entry={editingEntry}
        categories={categories}
        onClose={() => setEditingEntry(null)}
        onSaved={(name) => setBulkFeedback(`Vnos »${name}« je bil uspešno posodobljen.`)}
      />
    </div>
  );
}
