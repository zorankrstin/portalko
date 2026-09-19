import { X, Image as ImageIcon, Link as LinkIcon, MapPin, Smile, Loader2, CheckCircle, Crown, Shield, UserCheck, User as UserIcon, AlertTriangle, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createPostInFirestore, createAdInFirestore, createEventInFirestore } from '../services/firestoreService';
import { LoginModal } from './LoginModal';

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

  const isGuestOrUnauth = !currentUser || currentUser.role === 'guest';
  const canPost = !isGuestOrUnauth && ['superadmin', 'admin', 'verified', 'registered'].includes(currentUser?.role || '');
  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const authorName = currentUser ? currentUser.name : 'Gost';
  const authorAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7C3AED&color=fff`;
  const authorRole = currentUser?.role || 'guest';
  const authorId = currentUser?.id || 'guest_user';

  const handleSubmit = async () => {
    if (!canPost) {
      setErrorMsg('Za objavljanje morate biti prijavljeni z vlogo: Registriran uporabnik, Preverjen uporabnik ali Skrbnik.');
      return;
    }

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
    // Real posting enabled: registered users, verified users, admin and superadmin publish live
    const initialStatus = 'published';
    const initialAdStatus = 'active';

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
          status: initialStatus,
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
          status: initialAdStatus,
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
          status: initialStatus,
          isPromoted: false,
        });
      }

      setSuccessMsg('Vaša objava je bila uspešno objavljena in je takoj vidna vsem obiskovalcem!');
      onPostCreated?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error creating post in Firestore:', err);
      setErrorMsg('Prišlo je do napake pri shranjevanju. Preverite povezavo ali pravice.');
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
            className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-[1em] h-[1em] text-2xl" />
          </button>
        </div>

        {/* Warning banner for guests / unauthenticated users */}
        {!canPost && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-on-surface">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300">Prijava je obvezna za objavo vsebin</p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Objavljanje je omogočeno članom skupnosti: <strong>registrirani</strong>, <strong>preverjeni</strong> uporabniki ter <strong>skrbniki</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Prijava / Registracija</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
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
              <div className="font-label-caps text-[11px] flex items-center gap-1.5 mt-0.5">
                {authorRole === 'superadmin' ? (
                  <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                    <Crown className="w-3 h-3" /> Glavni skrbnik • Samodejna takojšnja objava
                  </span>
                ) : authorRole === 'admin' ? (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded font-bold">
                    <Shield className="w-3 h-3" /> Skrbnik • Samodejna takojšnja objava
                  </span>
                ) : authorRole === 'verified' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                    <UserCheck className="w-3 h-3" /> Preverjen uporabnik • Samodejna takojšnja objava
                  </span>
                ) : authorRole === 'registered' ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                    <UserIcon className="w-3 h-3" /> Registriran uporabnik • Samodejna takojšnja objava
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-outline px-2 py-0.5 rounded bg-surface-container">
                    Gost (potrebna prijava za objavo)
                  </span>
                )}
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
              disabled={isSubmitting || !canPost}
              className={`px-6 py-2.5 rounded-xl font-label-md text-sm font-semibold shadow-md transition-all flex items-center gap-2 ${
                canPost 
                  ? 'bg-primary hover:bg-primary-container text-on-primary cursor-pointer' 
                  : 'bg-surface-container-high text-outline cursor-not-allowed opacity-60'
              } disabled:opacity-50`}
              title={!canPost ? 'Prijavite se za objavljanje' : 'Oddaj objavo'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Shranjevanje...</span>
                </>
              ) : (
                <span>Objavi zdaj</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        initialMode="login" 
      />
    </div>
  );
}
