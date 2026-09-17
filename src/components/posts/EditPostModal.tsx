import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Save, Check, Ban, Eye, Image as ImageIcon, Sparkles } from 'lucide-react';
import { 
  FirestorePost, 
  FirestoreAd, 
  FirestoreEvent, 
  updatePostInFirestore, 
  updateAdInFirestore, 
  updateEventInFirestore 
} from '../../services/firestoreService';

export type EditableItemType = 'post' | 'ad' | 'event' | 'deal';

export interface EditablePostItem {
  id: string;
  type: EditableItemType;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorRole?: string;
  status: 'published' | 'active' | 'pending' | 'rejected' | 'archived';
  imageUrl?: string;
  price?: string;
  location?: string;
  eventDate?: string;
  rejectionReason?: string;
}

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EditablePostItem | null;
  onSaved?: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ isOpen, onClose, item, onSaved }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'published' | 'active' | 'pending' | 'rejected'>('published');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setTitle(item.title || '');
      setContent(item.content || '');
      setCategory(item.category || '');
      const normalizedStatus = item.status === 'active' ? 'published' : (item.status || 'published');
      setStatus(normalizedStatus as any);
      setImageUrl(item.imageUrl || '');
      setPrice(item.price || '');
      setLocation(item.location || '');
      setEventDate(item.eventDate || '');
      setRejectionReason(item.rejectionReason || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSave = async (overrideStatus?: 'published' | 'pending' | 'rejected') => {
    if (!title.trim()) {
      setErrorMsg('Naslov objave ne sme biti prazen.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetStatus = overrideStatus || status;

    try {
      if (item.type === 'ad') {
        const adStatus = targetStatus === 'published' ? 'active' : targetStatus;
        await updateAdInFirestore(item.id, {
          title: title.trim(),
          description: content.trim(),
          category: category.trim(),
          price: price.trim() || 'Po dogovoru',
          location: location.trim() || 'Slovenija',
          imageUrl: imageUrl.trim() || undefined,
          status: adStatus as any,
          rejectionReason: targetStatus === 'rejected' ? (rejectionReason.trim() || 'Zavrnjeno s strani skrbnika') : undefined,
        });
      } else if (item.type === 'event') {
        await updateEventInFirestore(item.id, {
          title: title.trim(),
          description: content.trim(),
          category: category.trim(),
          price: price.trim() || undefined,
          location: location.trim() || 'Ljubljana',
          eventDate: eventDate.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          status: targetStatus as any,
          rejectionReason: targetStatus === 'rejected' ? (rejectionReason.trim() || 'Zavrnjeno s strani skrbnika') : undefined,
        });
      } else {
        // Post or Deal
        await updatePostInFirestore(item.id, {
          title: title.trim(),
          content: content.trim(),
          category: category.trim(),
          price: price.trim() || undefined,
          location: location.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          status: targetStatus as any,
          rejectionReason: targetStatus === 'rejected' ? (rejectionReason.trim() || 'Zavrnjeno s strani skrbnika') : undefined,
        });
      }

      setSuccessMsg('Spremembe so bile uspešno shranjene!');
      onSaved?.();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error updating post in Firestore:', err);
      setErrorMsg(err?.message || 'Napaka pri shranjevanju v bazo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: EditableItemType) => {
    switch (type) {
      case 'ad': return 'Mali oglas';
      case 'deal': return 'Ugodnost';
      case 'event': return 'Dogodek';
      case 'post':
      default: return 'Članek / Objava';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full shadow-2xl p-space-lg flex flex-col gap-4 max-h-[92vh] overflow-y-auto border border-surface-container/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Urejanje objave</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold">
                  {getTypeLabel(item.type)}
                </span>
              </h2>
              <p className="text-xs text-outline">
                Avtor: <strong className="text-on-surface">{item.authorName}</strong> {item.authorRole && `(${item.authorRole})`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form fields */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Status selection */}
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container/60 flex flex-col gap-2">
            <label className="font-label-caps uppercase font-bold text-on-surface">Status objave & Odobritev</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'published' || status === 'active'
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container hover:bg-surface-container'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Odobreno (Objavi)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'pending'
                    ? 'bg-[#D28E3D] text-white shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container hover:bg-surface-container'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>V čakanju</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === 'rejected'
                    ? 'bg-error text-on-error shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container hover:bg-surface-container'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Zavrni</span>
              </button>
            </div>

            {status === 'rejected' && (
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[11px] text-error font-medium">Razlog za zavrnitev (viden avtorju):</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Npr. vsebina krši pravila skupnosti ali manjka opis"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-error/30 text-xs text-on-surface outline-none focus:border-error"
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps uppercase font-semibold text-outline">Naslov objave</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container font-body-sm text-sm text-on-surface outline-none focus:border-primary"
              placeholder="Naslov..."
              required
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps uppercase font-semibold text-outline">Kategorija</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                placeholder="Npr. Tehnika, Šport, Nepremičnine..."
              />
            </div>

            {/* Price or Event Date */}
            {item.type === 'event' ? (
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps uppercase font-semibold text-outline">Datum dogodka</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="font-label-caps uppercase font-semibold text-outline">Cena ali popust</label>
                <input
                  type="text"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Npr. 250 € ali -20%"
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps uppercase font-semibold text-outline">Lokacija (opcijsko)</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Npr. Ljubljana, Maribor, Celje..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
            />
          </div>

          {/* Image URL */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps uppercase font-semibold text-outline">Povezava do slike (URL)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
            {imageUrl && (
              <div className="mt-1 relative w-full h-32 rounded-xl overflow-hidden bg-surface-container border border-surface-container">
                <img src={imageUrl} alt="Predogled" className="w-full h-full object-cover" onError={() => {}} />
              </div>
            )}
          </div>

          {/* Content / Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps uppercase font-semibold text-outline">Vsebina / Opis</label>
            <textarea
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full p-3 rounded-xl bg-surface-container-lowest border border-surface-container font-body-sm text-sm text-on-surface outline-none focus:border-primary resize-y"
              placeholder="Vnesite celotno besedilo objave..."
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-container-low mt-2">
          <div className="flex items-center gap-2">
            {status === 'pending' && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave('published')}
                  className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Odobri in objavi</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave('rejected')}
                  className="px-3 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>Zavrni</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave()}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Shranjevanje...' : 'Shrani spremembe'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
