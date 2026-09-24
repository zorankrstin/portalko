import { 
  X, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Unlink,
  MapPin, 
  Smile, 
  Loader2, 
  CheckCircle, 
  Crown, 
  Shield, 
  UserCheck, 
  User as UserIcon, 
  AlertTriangle, 
  LogIn,
  Layers,
  Tag,
  Globe,
  Upload,
  Calendar,
  Clock,
  Ticket,
  Percent,
  TrendingDown,
  ExternalLink,
  Share2,
  Star,
  UploadCloud,
  Trash2
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createPostInFirestore, createAdInFirestore, createEventInFirestore } from '../services/firestoreService';
import { LoginModal } from './LoginModal';
import { useCategories } from '../hooks/useCategories';
import { CategorySection, SLOVENIA_REGIONS } from '../services/categoryService';
import { compressImageFileToDataUrl } from '../utils/imageUtils';

type PostType = 'post' | 'ad' | 'deal' | 'event';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: PostType;
  onPostCreated?: () => void;
}

export function ComposeModal({ isOpen, onClose, initialType = 'post', onPostCreated }: ComposeModalProps) {
  const { currentUser } = useAuth();
  const editorRef = useRef<any>(null);
  const [postType, setPostType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [dealLink, setDealLink] = useState('');
  const [discount, setDiscount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [location, setLocation] = useState('');
  const [tagsString, setTagsString] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [compressingProgress, setCompressingProgress] = useState('');
  const [urlImageInput, setUrlImageInput] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isCompressing, setIsCompressing] = useState(false);
  const [embedCode, setEmbedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Map post type to taxonomy section
  const sectionMap: Record<PostType, CategorySection> = useMemo(() => ({
    post: 'blog',
    ad: 'ads',
    deal: 'deals',
    event: 'events',
  }), []);

  const currentSection = sectionMap[postType];
  const { categories } = useCategories(currentSection);

  // Multi-image handlers
  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    const total = files.length;
    const newUrls: string[] = [];
    try {
      for (let i = 0; i < total; i++) {
        setCompressingProgress(`Optimiziram sliko ${i + 1} od ${total}...`);
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFileToDataUrl(file, 1200);
        newUrls.push(dataUrl);
      }
      setImages(prev => {
        const merged = [...prev, ...newUrls];
        if (!imageUrl && merged[0]) {
          setImageUrl(merged[0]);
        }
        return merged;
      });
    } catch (err: any) {
      console.error('Error processing images:', err);
      setErrorMsg('Napaka pri obdelavi slik: ' + (err.message || ''));
    } finally {
      setIsCompressing(false);
      setCompressingProgress('');
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = urlImageInput.trim();
    if (!trimmed) return;
    let finalUrl = trimmed;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      finalUrl = `https://${trimmed}`;
    }
    setImages(prev => {
      const merged = [...prev, finalUrl];
      if (!imageUrl) setImageUrl(finalUrl);
      return merged;
    });
    setUrlImageInput('');
  };

  const handleRemoveImage = (idxToRemove: number) => {
    setImages(prev => {
      const updated = prev.filter((_, idx) => idx !== idxToRemove);
      if (imageUrl === prev[idxToRemove]) {
        setImageUrl(updated[0] || '');
      }
      return updated;
    });
  };

  const handleSetPrimaryImage = (idxToPrimary: number) => {
    setImages(prev => {
      if (idxToPrimary <= 0 || idxToPrimary >= prev.length) return prev;
      const target = prev[idxToPrimary];
      const remaining = prev.filter((_, idx) => idx !== idxToPrimary);
      const reordered = [target, ...remaining];
      setImageUrl(target);
      return reordered;
    });
  };

  // Initialize or reset selections when modal opens or postType changes
  useEffect(() => {
    if (isOpen) {
      setPostType(initialType);
      setTitle('');
      setContent('');
      setPrice('');
      setOldPrice('');
      setNewPrice('');
      setExpirationDate('');
      setDealLink('');
      setDiscount('');
      setPromoCode('');
      setEventDate('');
      setEventTime('');
      setTicketUrl('');
      setLocation('');
      setTagsString('');
      setSelectedRegion('all');
      setImageUrl('');
      setImages([]);
      setUrlImageInput('');
      setEmbedCode('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialType]);

  const handlePriceChange = (type: 'old' | 'new', val: string) => {
    if (type === 'old') {
      setOldPrice(val);
      calcDiscount(val, newPrice);
    } else {
      setNewPrice(val);
      calcDiscount(oldPrice, val);
    }
  };

  const calcDiscount = (oldVal: string, newVal: string) => {
    const parseNum = (str: string) => {
      const cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.');
      return parseFloat(cleaned);
    };
    const o = parseNum(oldVal);
    const n = parseNum(newVal);
    if (!isNaN(o) && !isNaN(n) && o > 0 && n > 0 && o > n) {
      const pct = Math.round(((o - n) / o) * 100);
      setDiscount(`-${pct}%`);
    }
  };

  // When categories change or postType changes, ensure category selection is valid
  useEffect(() => {
    if (categories.length > 0) {
      if (!selectedCategoryId || !categories.some(c => c.id === selectedCategoryId)) {
        setSelectedCategoryId(categories[0].id);
        const firstSub = categories[0].subcategories?.[0]?.id || '';
        setSelectedSubcategoryId(firstSub);
      }
    }
  }, [categories, selectedCategoryId]);

  // Selected category object
  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId) || categories[0] || null;
  }, [categories, selectedCategoryId]);

  // Handle category change
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
      setSelectedSubcategoryId(cat.subcategories[0].id);
    } else {
      setSelectedSubcategoryId('');
    }
  };

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

    const initialStatus = 'published';
    const initialAdStatus = 'active';

    const chosenCat = activeCategory;
    const chosenSub = chosenCat?.subcategories?.find(s => s.id === selectedSubcategoryId);
    const chosenRegionObj = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);

    const categorySlug = chosenCat?.id || 'splosno';
    const categoryName = chosenCat?.name || 'Splošno';
    const subcategorySlug = chosenSub?.id || '';
    const subcategoryName = chosenSub?.name || '';
    const regionName = chosenRegionObj?.name || (selectedRegion === 'all' ? 'Vsa Slovenija' : selectedRegion);
    const finalLocation = location.trim() || (chosenRegionObj ? chosenRegionObj.cities[0] : 'Slovenija');

    const primaryImg = images[0] || imageUrl || undefined;
    const allImgs = images.length > 0 ? images : (imageUrl ? [imageUrl] : undefined);

    try {
      if (postType === 'post' || postType === 'deal') {
        await createPostInFirestore({
          title: title.trim(),
          content: content.trim() || title.trim(),
          category: postType === 'deal' ? 'deal' : categorySlug,
          categoryName: postType === 'deal' ? 'Ugodnosti' : categoryName,
          subcategory: subcategorySlug || undefined,
          subcategoryName: subcategoryName || undefined,
          region: regionName,
          location: finalLocation,
          authorId,
          authorName,
          authorRole,
          authorAvatar,
          imageUrl: primaryImg,
          images: allImgs,
          imageUrls: allImgs,
          embedCode: embedCode || undefined,
          price: postType === 'deal' ? (newPrice.trim() || discount.trim() || undefined) : undefined,
          oldPrice: postType === 'deal' ? (oldPrice.trim() || undefined) : undefined,
          newPrice: postType === 'deal' ? (newPrice.trim() || undefined) : undefined,
          expirationDate: postType === 'deal' ? (expirationDate.trim() || undefined) : undefined,
          discount: postType === 'deal' ? (discount.trim() || undefined) : undefined,
          promoCode: postType === 'deal' ? (promoCode.trim() || undefined) : undefined,
          dealLink: postType === 'deal' ? (dealLink.trim() || undefined) : undefined,
          status: initialStatus,
          likesCount: 0,
          commentsCount: 0,
          tags: tagsString.split(',').map(t => t.trim()).filter(Boolean).length > 0 ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        });
      } else if (postType === 'ad') {
        await createAdInFirestore({
          title: title.trim(),
          description: content.trim() || title.trim(),
          category: categorySlug,
          categoryName,
          subcategory: subcategorySlug || undefined,
          subcategoryName: subcategoryName || undefined,
          price: price.trim() || 'Po dogovoru',
          location: finalLocation,
          region: regionName,
          authorId,
          authorName,
          authorRole,
          imageUrl: primaryImg,
          images: allImgs,
          embedCode: embedCode || undefined,
          status: initialAdStatus,
          tags: tagsString.split(',').map(t => t.trim()).filter(Boolean).length > 0 ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        });
      } else if (postType === 'event') {
        await createEventInFirestore({
          title: title.trim(),
          description: content.trim() || title.trim(),
          location: finalLocation,
          region: regionName,
          eventDate: eventDate || new Date().toISOString().split('T')[0],
          eventTime: eventTime.trim() || undefined,
          ticketUrl: ticketUrl.trim() || undefined,
          price: price.trim() || 'Vstop prost',
          category: categorySlug,
          categoryName,
          subcategory: subcategorySlug || undefined,
          subcategoryName: subcategoryName || undefined,
          authorId,
          authorName,
          authorRole,
          imageUrl: primaryImg,
          images: allImgs,
          embedCode: embedCode || undefined,
          status: initialStatus,
          isPromoted: false,
          tags: tagsString.split(',').map(t => t.trim()).filter(Boolean).length > 0 ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : undefined,
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
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary">Kategorizirano</span>
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
                    <Crown className="w-3 h-3" /> Glavni skrbnik
                  </span>
                ) : authorRole === 'admin' ? (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded font-bold">
                    <Shield className="w-3 h-3" /> Skrbnik
                  </span>
                ) : authorRole === 'verified' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                    <UserCheck className="w-3 h-3" /> Preverjen uporabnik
                  </span>
                ) : authorRole === 'registered' ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                    <UserIcon className="w-3 h-3" /> Registriran uporabnik
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-outline px-2 py-0.5 rounded bg-surface-container">
                    Gost
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section / Post Type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-xs text-outline uppercase tracking-wider">Vrsta objave</label>
            <select 
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              className="bg-surface-container-low text-on-surface font-label-md text-sm px-3 py-2.5 rounded-lg border border-transparent focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ad">🛍️ Mali oglas (Mali oglasi)</option>
              <option value="event">📅 Dogodek (Dogodki & Prireditve)</option>
              <option value="post">📝 Blog / Članek (Blog & Članki)</option>
              <option value="deal">🏷️ Ugodnost / Popust (Ugodnosti & Kuponi)</option>
            </select>
          </div>

          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Naslov objave..."
              className="w-full bg-surface-container-low px-4 py-2.5 rounded-xl font-headline-sm text-base text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
            />
          </div>

          {/* DYNAMIC CATEGORY & SUBCATEGORY ROW */}
          <div className="p-3 bg-surface-container-low/70 rounded-xl border border-surface-container flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category Select */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Kategorija *</span>
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs font-semibold text-on-surface border border-surface-container focus:outline-none focus:border-primary cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon || '📁'} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Select */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>Podkategorija</span>
                </label>
                <select
                  value={selectedSubcategoryId}
                  onChange={e => setSelectedSubcategoryId(e.target.value)}
                  disabled={!activeCategory || !activeCategory.subcategories || activeCategory.subcategories.length === 0}
                  className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs font-semibold text-on-surface border border-surface-container focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                >
                  {(!activeCategory?.subcategories || activeCategory.subcategories.length === 0) ? (
                    <option value="">(Brez podkategorij)</option>
                  ) : (
                    activeCategory.subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* LOCALIZATION & REGION ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-surface-container/60">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span>Regija (Slovenija)</span>
                </label>
                <select
                  value={selectedRegion}
                  onChange={e => {
                    setSelectedRegion(e.target.value);
                    const reg = SLOVENIA_REGIONS.find(r => r.id === e.target.value);
                    if (reg && !location) {
                      setLocation(reg.cities[0]);
                    }
                  }}
                  className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs font-semibold text-on-surface border border-surface-container focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Vsa Slovenija</option>
                  {SLOVENIA_REGIONS.map(reg => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Kraj / Točna lokacija</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="npr. Ljubljana, Maribor, Koper..."
                  className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Type-specific inputs */}
          {postType === 'ad' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-outline">Cena predmeta / nepremičnine</label>
              <input 
                type="text" 
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Cena (npr. 150 € ali Po dogovoru)"
                className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              />
            </div>
          )}

          {postType === 'deal' && (
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-surface-container-low/60 border border-surface-container">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-secondary" />
                  <span>Podrobnosti ugodnosti in popusta</span>
                </span>
                <span className="text-[10px] text-outline font-medium">Ugodnosti & Popusti</span>
              </div>

              {/* Old price & New price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <span className="line-through text-outline">Stara cena</span>
                    <span>Stara cena (redna cena)</span>
                  </label>
                  <input 
                    type="text" 
                    value={oldPrice}
                    onChange={e => handlePriceChange('old', e.target.value)}
                    placeholder="npr. 99,99 €"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">Redna cena pred ugodnostjo</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-secondary" />
                    <span>Nova cena (znižana cena)</span>
                  </label>
                  <input 
                    type="text" 
                    value={newPrice}
                    onChange={e => handlePriceChange('new', e.target.value)}
                    placeholder="npr. 69,99 € (neobvezno)"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs font-bold text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">Akcijska cena za kupca</span>
                </div>
              </div>

              {/* Expiration date & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Datum poteka ugodnosti (Expiration date)</span>
                  </label>
                  <input 
                    type="date" 
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">
                    {expirationDate ? `Veljavno do: ${new Date(expirationDate).toLocaleDateString('sl-SI')}` : 'Izberite datum, do kdaj velja ugodnost (neobvezno)'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span>Višina popusta (% ali opis)</span>
                  </label>
                  <input 
                    type="text" 
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="npr. -30% ali 1+1 GRATIS"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">Izračuna se samodejno ali vnesite po meri</span>
                </div>
              </div>

              {/* Promo code & Deal link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-surface-container/60">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-outline" />
                    <span>Koda kupona (če obstaja)</span>
                  </label>
                  <input 
                    type="text" 
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="npr. POMLAD30"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-mono text-xs font-bold text-primary uppercase focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-outline" />
                    <span>Povezava do ugodnosti / trgovine</span>
                  </label>
                  <input 
                    type="url" 
                    value={dealLink}
                    onChange={e => setDealLink(e.target.value)}
                    placeholder="https://trgovina.si/akcija"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                </div>
              </div>
            </div>
          )}

          {postType === 'event' && (
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-surface-container-low/60 border border-surface-container">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Datum dogodka</span>
                  </label>
                  <input 
                    type="date" 
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Čas dogodka (24-urni format)</span>
                  </label>
                  <input 
                    type="time" 
                    step="60"
                    value={eventTime}
                    onChange={e => setEventTime(e.target.value)}
                    placeholder="20:00"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">Npr. 19:30 ali 20:00</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-secondary" />
                    <span>Vstopnina / Cena</span>
                  </label>
                  <input 
                    type="text" 
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="npr. Brezplačno ali 15 €"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-amber-500" />
                    <span>Povezava za nakup vstopnic (opcijsko)</span>
                  </label>
                  <input 
                    type="url" 
                    value={ticketUrl}
                    onChange={e => setTicketUrl(e.target.value)}
                    placeholder="https://mojekarte.si/... ali eventim.si"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">Spletna stran za prodajo vstopnic</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <RichTextEditor ref={editorRef} placeholder="Podrobnejši opis objave..." onChange={setContent} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-outline">Oznake (Tagi) - ločene z vejico</label>
            <input 
              type="text" 
              value={tagsString}
              onChange={e => setTagsString(e.target.value)}
              placeholder="npr. avto, prodaja, ugodno"
              className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
            />
          </div>

          <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low/70 border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <label className="text-xs font-semibold text-on-surface">Fotografije objave (ena ali več)</label>
                {images.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                    {images.length} {images.length === 1 ? 'slika' : 'slik'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    imageInputMode === 'upload' 
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Naloži z naprave
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    imageInputMode === 'url' 
                      ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Spletna povezava
                </button>
              </div>
            </div>

            {imageInputMode === 'upload' ? (
              <div className="flex flex-col gap-2">
                <label className="border-2 border-dashed border-surface-container-high hover:border-primary/60 rounded-xl p-3 text-center cursor-pointer transition-colors bg-surface-container-lowest/50 hover:bg-surface-container-lowest flex flex-col items-center justify-center gap-1 group">
                  <UploadCloud className="w-6 h-6 text-primary group-hover:scale-110 transition-transform mb-0.5" />
                  <span className="text-xs font-semibold text-on-surface">
                    Kliknite za izbiro ene ali več fotografij
                  </span>
                  <span className="text-[10px] text-outline">
                    Podprte oblike: JPG, PNG, WEBP. Samodejno stiskanje in optimizacija.
                  </span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleMultiFileUpload}
                    className="hidden" 
                  />
                </label>
                {isCompressing && (
                  <div className="flex items-center gap-2 text-xs text-primary font-medium p-2 bg-primary/10 rounded-lg animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{compressingProgress || 'Pripravljam in optimiziram fotografije...'}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="url" 
                  value={urlImageInput}
                  onChange={e => setUrlImageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  placeholder="https://... prilepite spletni naslov fotografije"
                  className="flex-1 bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container" 
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-bold text-on-surface transition-colors cursor-pointer"
                >
                  Dodaj sliko
                </button>
              </div>
            )}

            {/* Predogled galerije naloženih fotografij */}
            {images.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-surface-container/60">
                <div className="flex items-center justify-between text-[11px] text-outline">
                  <span>Zvezdica označi glavno naslovno sliko:</span>
                  <span className="font-semibold text-on-surface-variant">Naloženo: {images.length}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`relative rounded-xl overflow-hidden aspect-video border group ${
                        idx === 0 ? 'border-primary ring-2 ring-primary/40 shadow-xs' : 'border-surface-container'
                      }`}
                    >
                      <img src={img} alt={`Predogled ${idx + 1}`} className="h-full w-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Glavna</span>
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="p-1 rounded-md bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-primary text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                            title="Nastavi kot glavno sliko"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1 rounded-md bg-error/90 hover:bg-error text-white text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                          title="Odstrani to sliko"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-outline flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-secondary" />
                <span>Vdelana vsebina z družbenih omrežij ali video (neobvezno)</span>
              </span>
              <span className="text-[10px] bg-secondary/10 text-secondary font-medium px-1.5 py-0.5 rounded">YouTube, X, Instagram ali &lt;iframe&gt;</span>
            </label>
            <textarea 
              value={embedCode}
              onChange={e => setEmbedCode(e.target.value)}
              placeholder="Prilepite povezavo ali vdelano kodo (npr. YouTube, Facebook, X, Instagram)..."
              className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between border-t border-surface-container-low pt-4">
            <div className="flex items-center gap-1.5">
              <button 
                type="button" 
                onClick={() => editorRef.current?.openLinkDialog ? editorRef.current.openLinkDialog() : editorRef.current?.setLink()}
                className="px-2.5 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 font-bold text-xs border border-primary/20 cursor-pointer" 
                title="Dodaj spletno povezavo (URL link)"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Povezava</span>
              </button>
              <button 
                type="button" 
                onClick={() => editorRef.current?.openEmbedDialog()}
                className="px-2.5 py-1.5 rounded-lg text-secondary hover:bg-secondary/10 transition-colors flex items-center gap-1.5 font-bold text-xs border border-secondary/25 cursor-pointer" 
                title="Vdelaj objavo z družbenih omrežij (YouTube, X, Instagram, Facebook, TikTok) ali video"
              >
                <Share2 className="w-3.5 h-3.5 text-secondary" />
                <span className="hidden sm:inline">Vdelaj objavo</span>
              </button>
              <button 
                type="button" 
                onClick={() => editorRef.current?.addImage()} 
                className="p-1.5 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" 
                title="Dodaj sliko v opis"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={() => editorRef.current?.unsetLink()}
                className="p-1.5 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer" 
                title="Odstrani povezavo"
              >
                <Unlink className="w-4 h-4" />
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
