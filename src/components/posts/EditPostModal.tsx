import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Save, Check, Ban, Image as ImageIcon, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { 
  FirestorePost, 
  FirestoreAd, 
  FirestoreEvent, 
  updatePostInFirestore, 
  updateAdInFirestore, 
  updateEventInFirestore,
  deletePostInFirestore,
  deleteAdInFirestore,
  deleteEventInFirestore
} from '../../services/firestoreService';
import { PromotionConfig, PromotionBadgeType } from '../../types';
import { PromotedBadge } from '../common/PromotedBadge';

export type EditableItemType = 'post' | 'ad' | 'event' | 'deal';

export interface EditablePostItem {
  id: string;
  type: EditableItemType;
  title: string;
  content: string;
  category: string;
  categoryName?: string;
  authorName: string;
  authorRole?: string;
  authorId?: string;
  authorAvatar?: string;
  status: 'published' | 'active' | 'pending' | 'rejected' | 'archived';
  imageUrl?: string;
  price?: string;
  location?: string;
  eventDate?: string;
  rejectionReason?: string;
  isPromoted?: boolean;
  promotion?: PromotionConfig;
  promotedUntil?: string;
  promotionBadgeType?: PromotionBadgeType;
}

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EditablePostItem | null;
  onSaved?: () => void;
  onOpenPromotion?: (item: EditablePostItem) => void;
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setTitle(item.title || '');
      setContent(item.content || '');
      const isDealItem = item.type === 'deal' || 
                         item.category === 'deal' || 
                         item.category === 'ugodnosti' || 
                         item.category?.startsWith('deal') ||
                         item.categoryName === 'Ugodnosti' || 
                         item.categoryName === 'Ugodnost';
      const initialCat = isDealItem 
        ? (item.category && item.category !== 'blog' && item.category !== 'post' ? item.category : 'deal')
        : (item.category || '');
      setCategory(initialCat);
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

  const handleDelete = async () => {
    if (!item) return;
    if (!window.confirm(`Ali ste prepričani, da želite dokončno izbrisati objavo "${item.title}"?`)) {
      return;
    }
    setIsDeleting(true);
    setErrorMsg('');
    try {
      if (item.type === 'ad') {
        await deleteAdInFirestore(item.id);
      } else if (item.type === 'event') {
        await deleteEventInFirestore(item.id);
      } else {
        await deletePostInFirestore(item.id);
      }
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('Napaka pri brisanju objave:', err);
      setErrorMsg(err?.message || 'Napaka pri brisanju objave.');
    } finally {
      setIsDeleting(false);
    }
  };

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
          category: category.trim() || item.category || 'ostalo',
          categoryName: item.categoryName,
          price: price.trim() || 'Po dogovoru',
          location: location.trim() || 'Slovenija',
          imageUrl: imageUrl.trim() || '',
          status: adStatus as any,
          authorId: item.authorId,
          authorName: item.authorName,
          authorRole: item.authorRole,
          authorAvatar: item.authorAvatar,
          rejectionReason: targetStatus === 'rejected' ? (rejectionReason.trim() || 'Zavrnjeno s strani skrbnika') : undefined,
        });
      } else if (item.type === 'event') {
        await updateEventInFirestore(item.id, {
          title: title.trim(),
          description: content.trim(),
          category: category.trim() || item.category || 'dogodki',
          categoryName: item.categoryName,
          price: price.trim() || '',
          location: location.trim() || 'Ljubljana',
          eventDate: eventDate.trim() || '',
          imageUrl: imageUrl.trim() || '',
          status: targetStatus as any,
          authorId: item.authorId,
          authorName: item.authorName,
          authorRole: item.authorRole,
          authorAvatar: item.authorAvatar,
          rejectionReason: targetStatus === 'rejected' ? (rejectionReason.trim() || 'Zavrnjeno s strani skrbnika') : undefined,
        });
      } else {
        // Post or Deal
        const isDeal = item.type === 'deal' || 
                       item.category === 'deal' || 
                       item.category === 'ugodnosti' || 
                       item.category?.startsWith('deal') || 
                       item.categoryName === 'Ugodnosti' || 
                       item.categoryName === 'Ugodnost' ||
                       Boolean(item.price && !item.eventDate);

        // STRICT REQUIREMENT: The edited post must always stay in same original category
        const cleanedCat = category.trim();
        const preservedCategory = isDeal
          ? (cleanedCat && cleanedCat !== 'blog' && cleanedCat !== 'post' && cleanedCat !== 'splosno' ? cleanedCat : (item.category && item.category !== 'blog' && item.category !== 'post' ? item.category : 'deal'))
          : (cleanedCat && cleanedCat !== 'splosno' ? cleanedCat : (item.category || 'splosno'));

        const preservedCategoryName = isDeal
          ? (item.categoryName && item.categoryName !== 'Blog' ? item.categoryName : 'Ugodnosti')
          : item.categoryName;

        await updatePostInFirestore(item.id, {
          title: title.trim(),
          content: content.trim(),
          category: preservedCategory,
          categoryName: preservedCategoryName,
          price: price.trim() || item.price || '',
          location: location.trim() || item.location || '',
          imageUrl: imageUrl.trim() || item.imageUrl || '',
          status: targetStatus as any,
          authorId: item.authorId,
          authorName: item.authorName,
          authorRole: item.authorRole,
          authorAvatar: item.authorAvatar,
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
          {/* Original author indicator */}
          <div className="px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container/70 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-on-surface">Izvirni avtor:</span>
              <span className="font-bold text-primary">{item.authorName || 'Uporabnik'}</span>
              {item.authorRole && (
                <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                  {item.authorRole}
                </span>
              )}
            </div>
            <span className="text-[10px] text-outline font-medium italic">
              Avtor ostaja nespremenjen
            </span>
          </div>

          {/* Promotion / Featured Status Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-on-surface">Izpostavljenost objave</span>
                  {item.isPromoted ? (
                    <PromotedBadge type={item.promotionBadgeType || item.promotion?.badgeType || 'PROMO'} size="sm" />
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-outline font-medium">
                      Navadna objava
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-outline truncate">
                  {item.isPromoted && item.promotedUntil
                    ? `Aktivno do: ${new Date(item.promotedUntil).toLocaleDateString('sl-SI')}`
                    : 'Izpostavite objavo na vrhu seznama z značko PROMO ali OGLAS.'}
                </p>
              </div>
            </div>
            {onOpenPromotion && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPromotion(item);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs shrink-0 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{item.isPromoted ? 'Uredi promocijo' : 'Nastavi PROMO'}</span>
              </button>
            )}
          </div>

          {/* Status selection */}
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container/60 flex flex-col gap-2">
            <label className="font-label-caps uppercase font-bold text-on-surface">Status objave</label>
            <div className="grid grid-cols-2 gap-2">
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
                <span>Objavljeno (Aktivno)</span>
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
                <span>Zavrnjeno / Umaknjeno</span>
              </button>
            </div>

            {status === 'rejected' && (
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[11px] text-error font-medium">Razlog za umik/zavrnitev (viden avtorju):</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Npr. vsebina krši pravila skupnosti ali je neustrezna"
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
              <div className="flex items-center justify-between">
                <label className="font-label-caps uppercase font-semibold text-outline">Kategorija</label>
                {(item.type === 'deal' || item.category === 'deal' || item.category === 'ugodnosti' || item.categoryName === 'Ugodnosti') && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Ugodnosti
                  </span>
                )}
              </div>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                placeholder={item.type === 'deal' ? "Ugodnosti / Popusti" : "Npr. Tehnika, Šport, Nepremičnine..."}
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
            <button
              type="button"
              disabled={isSubmitting || isDeleting}
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Dokončno izbriši objavo iz baze"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-error" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Izbriši objavo</span>
            </button>
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
