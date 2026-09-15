import { X, Image as ImageIcon, Link as LinkIcon, MapPin, Smile, Loader2, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createPostInFirestore, createAdInFirestore, createEventInFirestore } from '../services/firestoreService';

type PostType = 'post' | 'ad' | 'deal' | 'event';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: PostType;
  onPostCreated?: () => void;
}

export function ComposeModal({ isOpen, onClose, initialType = 'post', onPostCreated }: ComposeModalProps) {
  const { currentUser } = useAuth();
  const [postType, setPostType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Tehnika');
  const [discount, setDiscount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPostType(initialType);
      setTitle('');
      setContent('');
      setPrice('');
      setCategory(initialType === 'ad' ? 'Avto-moto' : 'Splošno');
      setDiscount('');
      setPromoCode('');
      setEventDate('');
      setLocation('');
      setImageUrl('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialType]);

  if (!isOpen) return null;

  const authorName = currentUser ? currentUser.name : 'Gost';
  const authorAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7C3AED&color=fff`;
  const authorRole = currentUser?.role || 'guest';
  const authorId = currentUser?.id || 'guest_user';

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Prosimo, vnesite naslov objave.');
      return;
    }
    if (!content.trim() && postType === 'post') {
      setErrorMsg('Prosimo, vnesite vsebino objave.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (postType === 'post' || postType === 'deal') {
        await createPostInFirestore({
          title: title.trim(),
          content: content.trim() || title.trim(),
          category: postType === 'deal' ? 'deal' : (category || 'blog'),
          authorId,
          authorName,
          authorRole,
          authorAvatar,
          imageUrl: imageUrl || undefined,
          price: postType === 'deal' ? (discount || undefined) : undefined,
          likesCount: 0,
          commentsCount: 0,
        });
      } else if (postType === 'ad') {
        await createAdInFirestore({
          title: title.trim(),
          description: content.trim() || title.trim(),
          category: category || 'Splošno',
          price: price.trim() || 'Po dogovoru',
          location: location.trim() || 'Slovenija',
          authorId,
          authorName,
          authorRole,
          imageUrl: imageUrl || undefined,
          status: 'active',
        });
      } else if (postType === 'event') {
        await createEventInFirestore({
          title: title.trim(),
          description: content.trim() || title.trim(),
          location: location.trim() || 'Ljubljana',
          eventDate: eventDate || new Date().toISOString().split('T')[0],
          category: category || 'Dogodek',
          authorId,
          authorName,
          authorRole,
          imageUrl: imageUrl || undefined,
          isPromoted: false,
        });
      }

      setSuccessMsg('Objava je bila uspešno shranjena v Firebase!');
      onPostCreated?.();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error creating post in Firestore:', err);
      setErrorMsg('Prišlo je do napake pri shranjevanju. Preverite povezavo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full shadow-2xl p-space-lg flex flex-col gap-space-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
          <h2 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
            <span>Nova objava</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary">Firebase Firestore</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
          >
            <X className="w-[1em] h-[1em] text-2xl" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img 
              alt={`Avatar ${authorName}`} 
              className="w-10 h-10 rounded-full object-cover ring-1 ring-black/5" 
              src={authorAvatar} 
            />
            <div>
              <div className="font-label-md text-sm font-bold text-on-surface">{authorName}</div>
              <div className="font-label-caps text-[10px] text-outline uppercase tracking-wider">
                Objavlja kot: {authorRole === 'superadmin' ? 'Glavni skrbnik' : authorRole === 'admin' ? 'Skrbnik' : authorRole === 'verified' ? 'Preverjen uporabnik' : 'Uporabnik'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-xs text-outline uppercase tracking-wider">Vrsta objave</label>
            <select 
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              className="bg-surface-container-low text-on-surface font-label-md text-sm px-3 py-2.5 rounded-lg border border-transparent focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="post">Blog / Članek</option>
              <option value="ad">Mali oglas</option>
              <option value="deal">Ugodnost / Popust</option>
              <option value="event">Dogodek</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Naslov objave..."
              className="w-full bg-surface-container-low px-4 py-2.5 rounded-xl font-headline-sm text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
            />
          </div>

          {postType === 'ad' && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" 
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Cena (€)"
                className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              />
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors"
              >
                <option value="Avto-moto">Avto-moto</option>
                <option value="Nepremičnine">Nepremičnine</option>
                <option value="Tehnika">Tehnika</option>
                <option value="Dom in vrt">Dom in vrt</option>
                <option value="Šport">Šport</option>
              </select>
            </div>
          )}

          {postType === 'deal' && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" 
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="Višina popusta (npr. 20%)"
                className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              />
              <input 
                type="text" 
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Promocijska koda"
                className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              />
            </div>
          )}

          {postType === 'event' && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="date" 
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              />
              <input 
                type="text" 
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Lokacija dogodka"
                className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <RichTextEditor placeholder="O čem želite pisati?" onChange={setContent} />
          </div>

          <div className="flex flex-col gap-1.5">
            <input 
              type="text" 
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="Povezava do slike (neobvezno)..."
              className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
            />
          </div>

          <div className="flex items-center justify-between border-t border-surface-container-low pt-4">
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => setImageUrl('https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=800')} 
                className="p-2 rounded-lg text-primary hover:bg-surface-container transition-colors" 
                title="Dodaj primer slike"
              >
                <ImageIcon className="w-[1em] h-[1em] text-lg" />
              </button>
              <button type="button" className="p-2 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface transition-colors" title="Dodaj povezavo">
                <LinkIcon className="w-[1em] h-[1em] text-lg" />
              </button>
              <button type="button" className="p-2 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface transition-colors" title="Dodaj lokacijo">
                <MapPin className="w-[1em] h-[1em] text-lg" />
              </button>
              <button type="button" className="p-2 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface transition-colors" title="Dodaj emoji">
                <Smile className="w-[1em] h-[1em] text-lg" />
              </button>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Shranjevanje...</span>
                </>
              ) : (
                <span>Objavi</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
