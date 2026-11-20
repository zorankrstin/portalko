import React, { useEffect, useState } from 'react';
import {
  X,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Clock,
  BadgeCheck,
  Star,
  Save,
} from 'lucide-react';
import {
  DirectoryCategory,
  DirectoryEntry,
  updateDirectoryEntry,
} from '../services/directoryService';

interface DirectoryEditModalProps {
  entry: DirectoryEntry | null;
  categories: DirectoryCategory[];
  onClose: () => void;
  onSaved?: (entryName: string) => void;
}

export function DirectoryEditModal({
  entry,
  categories,
  onClose,
  onSaved,
}: DirectoryEditModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setName(entry.name || '');
    setUrl(entry.url || '');
    setCategoryId(entry.categoryId || categories[0]?.id || '');
    setLocation(entry.location || 'Slovenija');
    setDescription(entry.description || '');
    setPhone(entry.phone || '');
    setEmail(entry.email || '');
    setAddress(entry.address || '');
    setWorkingHours(entry.workingHours || '');
    setTagsInput((entry.tags || []).join(', '));
    setIsVerified(Boolean(entry.isVerified));
    setIsFeatured(Boolean(entry.isFeatured));
    setErrorMsg(null);
  }, [entry, categories]);

  if (!entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || !description.trim()) {
      setErrorMsg('Naziv, spletni naslov in opis so obvezna polja.');
      return;
    }
    const chosenCat = categories.find((c) => c.id === categoryId) || {
      id: entry.categoryId,
      name: entry.categoryName,
    };

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.replace(/^#/, '').trim().toLowerCase())
        .filter(Boolean);

      await updateDirectoryEntry(entry.id, {
        name,
        url,
        description,
        categoryId: chosenCat.id,
        categoryName: chosenCat.name,
        location,
        address,
        phone,
        email,
        workingHours,
        tags: parsedTags,
        isVerified,
        isFeatured,
      });

      onSaved?.(name.trim());
      onClose();
    } catch (err) {
      console.error('Failed to update directory entry:', err);
      setErrorMsg('Pri shranjevanju sprememb je prišlo do napake.');
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
        className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-on-surface">
              Uredi vnos v Imeniku
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low cursor-pointer"
            aria-label="Zapri urejanje"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="px-3 py-2 rounded-xl bg-error/10 border border-error/25 text-error text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">Naziv podjetja / znamke *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">Spletni naslov (URL) *</label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="npr. Ljubljana"
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface">Opis spletne strani / podjetja *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Contact Details Section */}
          <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-surface-container flex flex-col gap-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Kontaktni podatki podjetja
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>Telefon</span>
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
                <label className="text-xs font-semibold text-on-surface-variant inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>E-pošta</span>
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
                <label className="text-xs font-semibold text-on-surface-variant inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Ulica in hišna številka</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="npr. Slovenska cesta 1, 1000 Ljubljana"
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Delovni čas</span>
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="npr. Pon–Pet: 8:00–16:00"
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface">
              Ključne oznake (ločene z vejico)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="npr. spletna trgovina, elektronika, dostava"
              className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
              />
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Uradno preverjeno</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
              />
              <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>Izpostavljeno v vrtiljaku</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-low">
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
