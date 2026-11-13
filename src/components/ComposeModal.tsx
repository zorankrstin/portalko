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
  Trash2,
  Plus,
  Copy,
  CalendarDays,
  SlidersHorizontal,
  Sparkles,
  Lock,
  Paperclip,
  FileText
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../contexts/AuthContext';
import { createPostInFirestore, createAdInFirestore, createEventInFirestore, MAX_ALLOWED_POST_BYTES } from '../services/firestoreService';
import {
  UploadedAttachment,
  MAX_STORAGE_FILE_BYTES,
  uploadImageFileToStorage,
  uploadAttachmentFileToStorage,
  replaceDataUrlsInHtmlWithStorage,
} from '../services/storageService';
import { trackEvent } from '../utils/analyticsUtils';
import { LoginModal } from './LoginModal';
import { useCategories } from '../hooks/useCategories';
import { CategorySection, SLOVENIA_REGIONS, getAllSloveniaCities, getTertiaryCategories } from '../services/categoryService';
import { estimatePayloadUtf8Bytes, formatBytesSlovenian } from '../utils/imageUtils';
import { isDummyAvatar } from '../utils/avatarUtils';
import { getTodayYmd } from '../utils/eventFilterUtils';
import { EventScheduleSlot } from '../types';
import { parseSocialEmbed } from '../utils/embedUtils';
import { canUserPostContentType, canUserPostBlogOrDeals, ROLES_BLOG_AND_DEALS, ROLES_CLASSIFIEDS } from '../utils/permissionUtils';
import { isUserVerified } from '../utils/userVerificationUtils';

type PostType = 'post' | 'ad' | 'deal' | 'event';

interface PendingImageItem {
  id: string;
  previewUrl: string;
  file?: File;
  uploadedUrl?: string;
  name: string;
  size: number;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'done';
}

interface PendingAttachmentItem {
  id: string;
  file: File;
  name: string;
  size: number;
  contentType: string;
  uploadedAttachment?: UploadedAttachment;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'done';
}

interface UploadProgressState {
  active: boolean;
  overallPercent: number;
  currentItemPercent: number;
  uploadedCount: number;
  totalCount: number;
  transferredBytes: number;
  totalBytes: number;
  currentFileName: string;
  stageLabel: string;
  phase: 'uploading' | 'saving' | 'done';
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: PostType;
  onPostCreated?: () => void;
}

export function ComposeModal({ isOpen, onClose, initialType = 'post', onPostCreated }: ComposeModalProps) {
  const { currentUser } = useAuth();
  const editorRef = useRef<any>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [postType, setPostType] = useState<PostType>(initialType);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [dealLink, setDealLink] = useState('');
  const [discount, setDiscount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  // Multi-date, multi-hour and multi-location schedule state for events
  const [eventSchedules, setEventSchedules] = useState<{ id: string; date: string; times: string[]; label: string; location?: string }[]>([
    { id: '1', date: '', times: [''], label: '', location: '' }
  ]);
  const [ticketUrl, setTicketUrl] = useState('');
  const [location, setLocation] = useState('');
  const [tagsString, setTagsString] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [selectedTertiaryCategory, setSelectedTertiaryCategory] = useState('');
  const [imageItems, setImageItems] = useState<PendingImageItem[]>([]);
  const [attachmentItems, setAttachmentItems] = useState<PendingAttachmentItem[]>([]);
  const [urlImageInput, setUrlImageInput] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [uploadProgressState, setUploadProgressState] = useState<UploadProgressState | null>(null);
  const [embedCode, setEmbedCode] = useState('');
  const [embedOrientation, setEmbedOrientation] = useState<'auto' | 'vertical' | 'horizontal'>('auto');
  const [showEmbedLivePreview, setShowEmbedLivePreview] = useState(false);

  const parsedEmbedPreview = useMemo(() => {
    if (!embedCode.trim()) return null;
    return parseSocialEmbed(embedCode.trim(), embedOrientation === 'auto' ? undefined : embedOrientation);
  }, [embedCode, embedOrientation]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const totalPendingUploadBytes = useMemo(() => {
    const imgBytes = imageItems.reduce((sum, item) => sum + (item.file ? item.size : 0), 0);
    const fileBytes = attachmentItems.reduce((sum, item) => sum + item.size, 0);
    return imgBytes + fileBytes;
  }, [imageItems, attachmentItems]);

  const estimatedTextBytes = useMemo(() => {
    return estimatePayloadUtf8Bytes({
      title: title.trim(),
      subtitle: subtitle.trim(),
      content: content.trim(),
      embedCode: embedCode.trim() || undefined,
      tagsString,
      location: location.trim() || undefined,
    });
  }, [title, subtitle, content, embedCode, tagsString, location]);

  // Map post type to taxonomy section
  const sectionMap: Record<PostType, CategorySection> = useMemo(() => ({
    post: 'blog',
    ad: 'ads',
    deal: 'deals',
    event: 'events',
  }), []);

  const currentSection = sectionMap[postType];
  const { categories } = useCategories(currentSection);

  // Suggested cities for location field based on selected region or general major towns
  const suggestedCities = useMemo(() => {
    if (selectedRegion !== 'all') {
      const reg = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);
      return reg?.cities || [];
    }
    return ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Koper', 'Novo mesto', 'Velenje', 'Ptuj'];
  }, [selectedRegion]);

  const allSloveniaCities = useMemo(() => {
    return getAllSloveniaCities();
  }, []);

  const revokeAllObjectUrls = () => {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore already revoked URLs
      }
    });
    objectUrlsRef.current.clear();
  };

  // Multi-image handlers (preview via lightweight blob URLs, uploaded to Firebase Storage on submit)
  const handleMultiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nextItems: PendingImageItem[] = [];
    const oversizedNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_STORAGE_FILE_BYTES) {
        oversizedNames.push(file.name);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      nextItems.push({
        id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        previewUrl,
        file,
        name: file.name,
        size: file.size,
      });
    }

    if (oversizedNames.length > 0) {
      setErrorMsg(
        `Naslednje slike presegajo omejitev ${Math.round(MAX_STORAGE_FILE_BYTES / (1024 * 1024))} MB na datoteko: ${oversizedNames.join(', ')}`
      );
    }
    if (nextItems.length > 0) {
      setImageItems(prev => [...prev, ...nextItems]);
    }
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const trimmed = urlImageInput.trim();
    if (!trimmed) return;
    let finalUrl = trimmed;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      finalUrl = `https://${trimmed}`;
    }
    setImageItems(prev => [
      ...prev,
      {
        id: `${Date.now()}_url_${Math.random().toString(36).slice(2, 7)}`,
        previewUrl: finalUrl,
        uploadedUrl: finalUrl.startsWith('data:') ? undefined : finalUrl,
        name: finalUrl,
        size: 0,
      },
    ]);
    setUrlImageInput('');
  };

  const handleRemoveImage = (idxToRemove: number) => {
    setImageItems(prev => {
      const target = prev[idxToRemove];
      if (target?.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // ignore
        }
        objectUrlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== idxToRemove);
    });
  };

  const handleSetPrimaryImage = (idxToPrimary: number) => {
    setImageItems(prev => {
      if (idxToPrimary <= 0 || idxToPrimary >= prev.length) return prev;
      const target = prev[idxToPrimary];
      const remaining = prev.filter((_, idx) => idx !== idxToPrimary);
      return [target, ...remaining];
    });
  };

  // File attachment handlers (PDF, documents, archives, audio/video up to 25 MB each)
  const handleAttachmentFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nextAttachments: PendingAttachmentItem[] = [];
    const oversizedNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_STORAGE_FILE_BYTES) {
        oversizedNames.push(file.name);
        continue;
      }
      nextAttachments.push({
        id: `${Date.now()}_att_${i}_${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
      });
    }

    if (oversizedNames.length > 0) {
      setErrorMsg(
        `Naslednje datoteke presegajo omejitev ${Math.round(MAX_STORAGE_FILE_BYTES / (1024 * 1024))} MB na datoteko: ${oversizedNames.join(', ')}`
      );
    }
    if (nextAttachments.length > 0) {
      setAttachmentItems(prev => [...prev, ...nextAttachments]);
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (idxToRemove: number) => {
    setAttachmentItems(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  useEffect(() => {
    return () => {
      revokeAllObjectUrls();
    };
  }, []);

  // Initialize or reset selections when modal opens or postType changes
  useEffect(() => {
    if (isOpen) {
      revokeAllObjectUrls();
      setPostType(initialType);
      setTitle('');
      setSubtitle('');
      setContent('');
      setPrice('');
      setOldPrice('');
      setNewPrice('');
      setStartDate('');
      setExpirationDate('');
      setDealLink('');
      setDiscount('');
      setPromoCode('');
      setEventDate('');
      setEventTime('');
      setEventSchedules([{ id: '1', date: '', times: [''], label: '' }]);
      setTicketUrl('');
      setLocation('');
      setTagsString('');
      setSelectedRegion('all');
      setSelectedTertiaryCategory('');
      setImageItems([]);
      setAttachmentItems([]);
      setUrlImageInput('');
      setUploadProgressMsg('');
      setUploadProgressState(null);
      setEmbedCode('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(false);
    } else {
      revokeAllObjectUrls();
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

  // Dynamic 3rd level options based on active category & subcategory from admin configuration
  const availableTertiaryOptions = useMemo(() => {
    const sec = activeCategory?.section || (postType === 'deal' ? 'deals' : postType === 'event' ? 'events' : postType === 'ad' ? 'ads' : 'blog');
    return getTertiaryCategories(selectedCategoryId, selectedSubcategoryId, categories, sec);
  }, [selectedCategoryId, selectedSubcategoryId, categories, activeCategory, postType]);

  // Contextual labels & hints for 3rd level filter/input
  const tertiaryConfig = useMemo(() => {
    const catName = (activeCategory?.name || '').toLowerCase();
    const catId = (selectedCategoryId || '').toLowerCase();
    const subId = (selectedSubcategoryId || '').toLowerCase();

    if (postType === 'ad') {
      if (catId.includes('avto') || catName.includes('avto') || subId.includes('vozil') || subId.includes('kolesa') || subId.includes('motor')) {
        return {
          label: '3. stopnja: Znamka / Proizvajalec (npr. Fiat, Volkswagen, BMW, Yamaha...)',
          placeholder: 'Vnesite ali izberite znamko (npr. Fiat)',
          helper: 'Znamka vozila za natančno filtriranje med oglasi v spustnem meniju 3. stopnje.',
        };
      }
      if (catId.includes('nepremicnin') || catName.includes('nepremičnin') || subId.includes('stanovan') || subId.includes('his') || subId.includes('posest')) {
        return {
          label: '3. stopnja: Tip / Velikost nepremičnine (npr. Garsonjera, 2-sobno, Hiša...)',
          placeholder: 'Vnesite ali izberite tip (npr. 2-sobno)',
          helper: 'Tip stanovanja, hiše ali zemljišča za filtriranje v spustnem meniju.',
        };
      }
      if (catId.includes('tehnik') || catName.includes('tehnik') || subId.includes('telefon') || subId.includes('racunal') || subId.includes('tv')) {
        return {
          label: '3. stopnja: Znamka / Proizvajalec (npr. Apple, Samsung, Sony, Bosch...)',
          placeholder: 'Vnesite ali izberite znamko (npr. Apple)',
          helper: 'Znamka ali proizvajalec naprave za hitro iskanje.',
        };
      }
      return {
        label: '3. stopnja: Znamka / Tip / Pod-raven',
        placeholder: 'Vnesite ali izberite podrobnejšo oznako',
        helper: 'Določite specifično znamko ali tip predmeta.',
      };
    }

    if (postType === 'deal') {
      return {
        label: '3. stopnja: Trgovec / Znamka / Ponudnik (npr. Spar, Hofer, Big Bang, About You...)',
        placeholder: 'Vnesite ali izberite trgovino ali znamko (npr. Spar & Interspar)',
        helper: 'Trgovec ali blagovna znamka za filtriranje v spustnem meniju akcij.',
      };
    }

    if (postType === 'event') {
      return {
        label: '3. stopnja: Glasbeni žanr / Tip dogodka (npr. Rock & Metal, Pop, Komedija, Sejem...)',
        placeholder: 'Vnesite ali izberite žanr ali tip (npr. Rock & Metal)',
        helper: 'Zvrst ali tematika dogodka za filtriranje v spustnem meniju prireditev.',
      };
    }

    // Blog posts (postType === 'post')
    if (catId.includes('turiz') || catName.includes('turiz') || subId.includes('izlet') || subId.includes('biser') || subId.includes('hrib')) {
      return {
        label: '3. stopnja: Destinacija / Lokacija izleta (npr. Bled & Bohinj, Dolina Soče, Kranjska Gora...)',
        placeholder: 'Vnesite ali izberite destinacijo (npr. Bled & Bohinj)',
        helper: 'Lokacija ali destinacija izleta za natančno filtriranje v spustnem meniju 3. stopnje bloga.',
      };
    }
    if (catId.includes('kulinari') || catName.includes('kulinarik') || subId.includes('recept') || subId.includes('jed')) {
      return {
        label: '3. stopnja: Tip jedi / Recept (npr. Tradicionalne jedi, Slovenska potica, Hitra kosila...)',
        placeholder: 'Vnesite ali izberite tip jedi ali recept (npr. Slovenska potica)',
        helper: 'Recept ali kulinarična usmeritev za filtriranje med članki.',
      };
    }
    if (catId.includes('tehnolog') || catName.includes('tehnolog') || subId.includes('inteligen') || subId.includes('gadget') || subId.includes('varnost')) {
      return {
        label: '3. stopnja: Tehnologija / AI orodje (npr. ChatGPT & prompti, Apple iPhone, Pametni dom...)',
        placeholder: 'Vnesite ali izberite tehnologijo (npr. Umetna inteligenca (AI))',
        helper: 'Orodje, naprava ali tehnološko področje za filtriranje.',
      };
    }
    if (catId.includes('dom') || catName.includes('dom') || subId.includes('prenov') || subId.includes('diy') || subId.includes('vrt')) {
      return {
        label: '3. stopnja: Tema za dom & vrt (npr. Prenova doma, Sončne elektrarne, Naredi sam DIY...)',
        placeholder: 'Vnesite ali izberite temo doma (npr. Sončne elektrarne)',
        helper: 'Področje urejanja doma ali vrta za filtriranje.',
      };
    }
    if (catId.includes('financ') || catName.includes('financ') || subId.includes('osebn') || subId.includes('investic') || subId.includes('podjet')) {
      return {
        label: '3. stopnja: Finančna tema / Naložbe (npr. Osebne finance, Delniški ETF skladi, Nepremičnine...)',
        placeholder: 'Vnesite ali izberite finančno temo (npr. Delniški ETF skladi)',
        helper: 'Področje financ ali podjetništva za filtriranje.',
      };
    }
    if (catId.includes('zdravj') || catName.includes('zdravj') || subId.includes('slog') || subId.includes('stres') || subId.includes('zelis')) {
      return {
        label: '3. stopnja: Tema zdravja / Počutje (npr. Zdrav življenjski slog, Domača zelišča, Premagovanje stresa...)',
        placeholder: 'Vnesite ali izberite temo zdravja (npr. Domača zelišča)',
        helper: 'Tema zdravja in dobrega počutja za filtriranje.',
      };
    }

    return {
      label: '3. stopnja: Zvrst / Ključna tema / Oznaka',
      placeholder: 'Vnesite ali izberite ključno temo...',
      helper: 'Določite podrobnejšo tematiko za 2. spustni filter.',
    };
  }, [postType, activeCategory, selectedCategoryId, selectedSubcategoryId]);

  // Handle category change
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
      setSelectedSubcategoryId(cat.subcategories[0].id);
    } else {
      setSelectedSubcategoryId('');
    }
    setSelectedTertiaryCategory('');
  };

  // Event multi-date, multi-hour & multi-location schedule helpers
  const handleAddDateSlot = (suggestedDate?: string, prefillTimes?: string[], suggestedLocation?: string) => {
    setEventSchedules(prev => {
      const lastSlot = prev[prev.length - 1];
      let nextDate = suggestedDate || '';
      
      if (!nextDate && lastSlot?.date) {
        try {
          const d = new Date(lastSlot.date);
          d.setDate(d.getDate() + 1);
          nextDate = d.toISOString().split('T')[0];
        } catch {
          nextDate = '';
        }
      }

      const timesToUse = prefillTimes && prefillTimes.length > 0 
        ? [...prefillTimes]
        : (lastSlot && lastSlot.times.filter(Boolean).length > 0 ? [...lastSlot.times] : ['']);

      return [
        ...prev,
        {
          id: String(Date.now()) + Math.random().toString(36).substring(2, 6),
          date: nextDate,
          times: timesToUse.length > 0 ? timesToUse : [''],
          label: '',
          location: suggestedLocation !== undefined ? suggestedLocation : (lastSlot?.location || ''),
        }
      ];
    });
  };

  const handleRemoveDateSlot = (slotId: string) => {
    setEventSchedules(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(s => s.id !== slotId);
    });
  };

  const handleDateChange = (slotId: string, newDate: string) => {
    setEventSchedules(prev => prev.map(s => s.id === slotId ? { ...s, date: newDate } : s));
  };

  const handleSlotLabelChange = (slotId: string, label: string) => {
    setEventSchedules(prev => prev.map(s => s.id === slotId ? { ...s, label } : s));
  };

  const handleSlotLocationChange = (slotId: string, loc: string) => {
    setEventSchedules(prev => prev.map(s => s.id === slotId ? { ...s, location: loc } : s));
  };

  const handleAddTime = (slotId: string) => {
    setEventSchedules(prev => prev.map(s => {
      if (s.id !== slotId) return s;
      return { ...s, times: [...s.times, ''] };
    }));
  };

  const handleRemoveTime = (slotId: string, timeIdx: number) => {
    setEventSchedules(prev => prev.map(s => {
      if (s.id !== slotId) return s;
      const updated = s.times.filter((_, idx) => idx !== timeIdx);
      return { ...s, times: updated.length > 0 ? updated : [''] };
    }));
  };

  const handleTimeChange = (slotId: string, timeIdx: number, val: string) => {
    setEventSchedules(prev => prev.map(s => {
      if (s.id !== slotId) return s;
      const updated = [...s.times];
      updated[timeIdx] = val;
      return { ...s, times: updated };
    }));
  };

  if (!isOpen) return null;

  const isGuestOrUnauth = !currentUser || currentUser.role === 'guest';
  const userRole = currentUser?.role;
  const isVerifiedUser = Boolean(
    isUserVerified(currentUser) ||
    currentUser?.emailVerified === true ||
    (typeof userRole === 'string' && (userRole === 'verified' || (userRole as string).toLowerCase().includes('verif') || (userRole as string) === 'preverjen'))
  );
  const effectiveAuthorRole = (isVerifiedUser && userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'moderator')
    ? 'verified'
    : (userRole || 'guest');

  const canPostCurrentType = canUserPostContentType(effectiveAuthorRole, postType, currentUser);
  const canPostAny = !isGuestOrUnauth && ['superadmin', 'admin', 'moderator', 'verified', 'registered'].includes(effectiveAuthorRole || '');
  const isAdminOrSuper = effectiveAuthorRole === 'superadmin' || effectiveAuthorRole === 'admin';

  const authorName = currentUser ? currentUser.name : 'Gost';
  const authorAvatar = (currentUser?.avatar && !isDummyAvatar(currentUser.avatar)) ? currentUser.avatar : '';
  const authorRole = effectiveAuthorRole;
  const authorId = currentUser?.id || 'guest_user';

  const handleSubmit = async () => {
    if (!canPostCurrentType) {
      if (isGuestOrUnauth) {
        setErrorMsg('Za objavljanje morate biti prijavljeni.');
      } else if (postType === 'post' || postType === 'deal') {
        setErrorMsg('Objavljanje blog člankov in ugodnosti je omogočeno le preverjenim uporabnikom (Verified), moderatorjem ter skrbnikom.');
      } else {
        setErrorMsg('Za objavo v tej kategoriji nimate ustreznih pravic.');
      }
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
    setUploadProgressMsg('');
    setUploadProgressState(null);

    const initialStatus: 'published' = 'published';
    const initialAdStatus = 'active';

    const chosenCat = activeCategory;
    const chosenSub = chosenCat?.subcategories?.find(s => s.id === selectedSubcategoryId);
    const chosenRegionObj = SLOVENIA_REGIONS.find(r => r.id === selectedRegion);

    const categorySlug = chosenCat?.id || 'splosno';
    const categoryName = chosenCat?.name || 'Splošno';
    const subcategorySlug = chosenSub?.id || '';
    const subcategoryName = chosenSub?.name || '';
    const regionName = chosenRegionObj?.name || (selectedRegion === 'all' ? 'Vsa Slovenija' : selectedRegion);
    // Never auto-fallback to a specific city (e.g. cities[0])! Use entered location, or region name, or Slovenija
    const finalLocation = location.trim() || (chosenRegionObj && chosenRegionObj.id !== 'all' ? chosenRegionObj.name : 'Slovenija');

    // For deals/akcije, location is strictly optional (can be an online deal/coupon code or webshop promo)
    const isDeal = postType === 'deal';
    const isDealWithoutLocation = isDeal && (selectedRegion === 'none' || (!location.trim() && selectedRegion === 'all'));
    const dealRegion = selectedRegion === 'none'
      ? 'Splet'
      : (chosenRegionObj?.name || (selectedRegion === 'all' ? 'Vsa Slovenija' : selectedRegion));
    const dealLocation = isDealWithoutLocation
      ? undefined
      : (location.trim() || (chosenRegionObj && chosenRegionObj.id !== 'all' ? chosenRegionObj.name : undefined));

    const userTags = tagsString.split(',').map(t => t.replace(/^#/, '').trim()).filter(Boolean);
    if (selectedTertiaryCategory.trim() && !userTags.some(t => t.toLowerCase() === selectedTertiaryCategory.trim().toLowerCase())) {
      userTags.push(selectedTertiaryCategory.trim());
    }

    const storageFolder = postType === 'ad'
      ? 'ads'
      : postType === 'event'
        ? 'events'
        : postType === 'deal'
          ? 'posts/deals'
          : 'posts';

    try {
      const pendingImgItems = imageItems.filter(item => item.file && !item.uploadedUrl);
      const pendingAttItems = attachmentItems.filter(att => !att.uploadedAttachment);
      const totalUploadCount = pendingImgItems.length + pendingAttItems.length;
      const totalUploadBytes =
        pendingImgItems.reduce((sum, item) => sum + (item.size || 0), 0) +
        pendingAttItems.reduce((sum, att) => sum + (att.size || 0), 0);

      let completedBytes = 0;
      let completedCount = 0;

      const updateOverallProgress = (
        currentItemBytes: number,
        pct: number,
        fileName: string,
        stageLabel: string,
        phase: 'uploading' | 'saving' | 'done' = 'uploading'
      ) => {
        const currentTransferred = Math.round(currentItemBytes * (pct / 100));
        const transferredBytes = Math.min(totalUploadBytes, completedBytes + currentTransferred);
        let overallPercent = 0;
        if (totalUploadBytes > 0) {
          overallPercent = Math.min(100, Math.round((transferredBytes / totalUploadBytes) * 100));
        } else if (totalUploadCount > 0) {
          overallPercent = Math.min(100, Math.round(((completedCount + pct / 100) / totalUploadCount) * 100));
        } else {
          overallPercent = pct;
        }
        setUploadProgressState({
          active: phase !== 'done',
          overallPercent,
          currentItemPercent: pct,
          uploadedCount: Math.min(totalUploadCount, completedCount + (phase === 'uploading' && pct < 100 ? 1 : 0)),
          totalCount: totalUploadCount,
          transferredBytes,
          totalBytes: totalUploadBytes,
          currentFileName: fileName,
          stageLabel,
          phase,
        });
      };

      if (totalUploadCount > 0) {
        updateOverallProgress(0, 0, '', 'Pripravljam prenos v Firebase Storage...', 'uploading');
      }

      // 1. Upload queued images to Firebase Storage (caching uploadedUrl on items to avoid duplicate uploads on retry)
      const uploadedImageUrls: string[] = [];
      const pendingImagesCount = pendingImgItems.length;
      let uploadedImgIdx = 0;

      const updatedImageItems = [...imageItems];
      for (let i = 0; i < updatedImageItems.length; i++) {
        const item = updatedImageItems[i];
        if (item.uploadedUrl) {
          uploadedImageUrls.push(item.uploadedUrl);
          continue;
        }
        if (item.file) {
          uploadedImgIdx++;
          const stageLabel = `Nalagam fotografijo ${uploadedImgIdx} od ${pendingImagesCount}: ${item.name}`;
          setUploadProgressMsg(`Nalagam fotografijo ${uploadedImgIdx} od ${pendingImagesCount} v Firebase Storage...`);
          updatedImageItems[i] = { ...item, uploadStatus: 'uploading', uploadProgress: 0 };
          setImageItems([...updatedImageItems]);
          updateOverallProgress(item.size || 0, 0, item.name, stageLabel, 'uploading');

          const url = await uploadImageFileToStorage(item.file, storageFolder, authorId, (pct) => {
            updatedImageItems[i] = { ...updatedImageItems[i], uploadStatus: 'uploading', uploadProgress: pct };
            setImageItems([...updatedImageItems]);
            updateOverallProgress(item.size || 0, pct, item.name, stageLabel, 'uploading');
          });

          completedBytes += item.size || 0;
          completedCount++;
          updatedImageItems[i] = {
            ...updatedImageItems[i],
            uploadedUrl: url,
            uploadStatus: 'done',
            uploadProgress: 100,
          };
          setImageItems([...updatedImageItems]);
          uploadedImageUrls.push(url);
        } else if (item.previewUrl && !item.previewUrl.startsWith('blob:')) {
          uploadedImageUrls.push(item.previewUrl);
        }
      }

      // 2. Upload queued file attachments to Firebase Storage
      const uploadedAttachments: UploadedAttachment[] = [];
      const pendingFilesCount = pendingAttItems.length;
      let uploadedFileIdx = 0;

      const updatedAttachmentItems = [...attachmentItems];
      for (let i = 0; i < updatedAttachmentItems.length; i++) {
        const att = updatedAttachmentItems[i];
        if (att.uploadedAttachment) {
          uploadedAttachments.push(att.uploadedAttachment);
          continue;
        }
        uploadedFileIdx++;
        const stageLabel = `Nalagam prilogo ${uploadedFileIdx} od ${pendingFilesCount}: ${att.name}`;
        setUploadProgressMsg(`Nalagam priloženo datoteko ${uploadedFileIdx} od ${pendingFilesCount} (${att.name})...`);
        updatedAttachmentItems[i] = { ...att, uploadStatus: 'uploading', uploadProgress: 0 };
        setAttachmentItems([...updatedAttachmentItems]);
        updateOverallProgress(att.size || 0, 0, att.name, stageLabel, 'uploading');

        const uploaded = await uploadAttachmentFileToStorage(att.file, storageFolder, authorId, (pct) => {
          updatedAttachmentItems[i] = { ...updatedAttachmentItems[i], uploadStatus: 'uploading', uploadProgress: pct };
          setAttachmentItems([...updatedAttachmentItems]);
          updateOverallProgress(att.size || 0, pct, att.name, stageLabel, 'uploading');
        });

        completedBytes += att.size || 0;
        completedCount++;
        updatedAttachmentItems[i] = {
          ...updatedAttachmentItems[i],
          uploadedAttachment: uploaded,
          uploadStatus: 'done',
          uploadProgress: 100,
        };
        setAttachmentItems([...updatedAttachmentItems]);
        uploadedAttachments.push(uploaded);
      }

      // 3. Offload any pasted inline data: images inside rich-text content to Firebase Storage
      let cleanContent = content.trim();
      if (cleanContent.includes('data:')) {
        setUploadProgressMsg('Nalagam vdelane slike iz besedila v Firebase Storage...');
        setUploadProgressState((prev) => ({
          active: true,
          overallPercent: prev ? Math.max(prev.overallPercent, 90) : 50,
          currentItemPercent: 0,
          uploadedCount: totalUploadCount,
          totalCount: totalUploadCount,
          transferredBytes: totalUploadBytes,
          totalBytes: totalUploadBytes,
          currentFileName: 'Vdelane slike',
          stageLabel: 'Nalagam vdelane slike iz besedila v Firebase Storage...',
          phase: 'uploading',
        }));
        cleanContent = await replaceDataUrlsInHtmlWithStorage(cleanContent, storageFolder, authorId, (pct) => {
          setUploadProgressState((prev) => ({
            active: true,
            overallPercent: totalUploadCount > 0 ? Math.max(prev?.overallPercent ?? 90, 90 + Math.round(pct * 0.1)) : pct,
            currentItemPercent: pct,
            uploadedCount: totalUploadCount,
            totalCount: totalUploadCount,
            transferredBytes: totalUploadBytes,
            totalBytes: totalUploadBytes,
            currentFileName: 'Vdelane slike',
            stageLabel: `Nalagam vdelane slike iz besedila v Firebase Storage (${pct}%)...`,
            phase: 'uploading',
          }));
        });
      }

      setUploadProgressMsg('Shranjujem objavo v Firestore...');
      setUploadProgressState((prev) => ({
        active: true,
        overallPercent: 100,
        currentItemPercent: 100,
        uploadedCount: totalUploadCount,
        totalCount: totalUploadCount,
        transferredBytes: totalUploadBytes,
        totalBytes: totalUploadBytes,
        currentFileName: prev?.currentFileName || '',
        stageLabel: 'Prenos v Firebase Storage zaključen ✓ Shranjujem objavo v Firestore...',
        phase: 'saving',
      }));

      const primaryImg = uploadedImageUrls[0] || undefined;
      const allImgs = uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined;
      const finalAttachments = uploadedAttachments.length > 0 ? uploadedAttachments : undefined;

      if (postType === 'post' || postType === 'deal') {
        const cleanPostTitle = title.replace(/^\[Ugodnost\]\s*/i, '').trim();
        const postPayload = {
          title: cleanPostTitle,
          subtitle: subtitle.trim() || undefined,
          content: cleanContent || cleanPostTitle,
          category: postType === 'deal' ? 'deal' : categorySlug,
          categoryName: postType === 'deal' 
            ? (categoryName && categoryName !== 'Ugodnosti' && categoryName !== 'Ugodnost' && categoryName !== 'Splošno' ? categoryName : (subcategoryName || '')) 
            : categoryName,
          subcategory: subcategorySlug || undefined,
          subcategoryName: subcategoryName || undefined,
          make: selectedTertiaryCategory.trim() || undefined,
          thirdLevelCategory: selectedTertiaryCategory.trim() || undefined,
          region: isDeal ? dealRegion : regionName,
          location: isDeal ? dealLocation : finalLocation,
          authorId,
          authorName,
          authorRole,
          authorAvatar,
          imageUrl: primaryImg,
          images: allImgs,
          attachments: finalAttachments,
          embedCode: embedCode || undefined,
          embedOrientation: embedCode.trim() ? (embedOrientation === 'auto' ? undefined : embedOrientation) : undefined,
          price: postType === 'deal' ? (newPrice.trim() || discount.trim() || undefined) : undefined,
          oldPrice: postType === 'deal' ? (oldPrice.trim() || undefined) : undefined,
          newPrice: postType === 'deal' ? (newPrice.trim() || undefined) : undefined,
          startDate: postType === 'deal' ? (startDate.trim() || undefined) : undefined,
          expirationDate: postType === 'deal' ? (expirationDate.trim() || undefined) : undefined,
          discount: postType === 'deal' ? (discount.trim() || undefined) : undefined,
          promoCode: postType === 'deal' ? (promoCode.trim() || undefined) : undefined,
          dealLink: postType === 'deal' ? (dealLink.trim() || undefined) : undefined,
          status: initialStatus,
          likesCount: 0,
          commentsCount: 0,
          tags: userTags.length > 0 ? userTags : undefined,
        };

        console.group('📝 [Blog Post Workflow] Submitting Blog/Post with Firebase Storage Media');
        console.log('👤 [Blog Post Workflow] Author Context:', {
          authorId,
          authorName,
          authorRole,
          userRole: currentUser?.role,
          emailVerified: currentUser?.emailVerified,
          isVerifiedAccount: isVerifiedUser,
        });
        console.log('☁️ [Blog Post Workflow] Firebase Storage Media URLs:', {
          imageUrl: postPayload.imageUrl,
          imagesCount: postPayload.images?.length || 0,
          attachmentsCount: postPayload.attachments?.length || 0,
        });
        console.log('📦 [Blog Post Workflow] Verifying Data Structure being sent to Firestore:', postPayload);
        console.log('📏 [Blog Post Workflow] Firestore document payload size:', estimatePayloadUtf8Bytes(postPayload), 'bytes');
        console.log('🔍 [Blog Post Workflow] Verifying "published" status parameter:', postPayload.status);

        const createdId = await createPostInFirestore(postPayload);

        if (!createdId) {
          console.error('❌ [Blog Post Workflow] Silent failure detected: createPostInFirestore did not return a valid document ID.');
          throw new Error('Objave žal ni bilo mogoče shraniti v bazo podatkov. Preverite povezavo ali pravice.');
        }

        console.log('✅ [Blog Post Workflow] Post successfully saved & published with Firestore ID:', createdId);
        console.groupEnd();
      } else if (postType === 'ad') {
        await createAdInFirestore({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: cleanContent || title.trim(),
          category: categorySlug,
          categoryName,
          subcategory: subcategorySlug || undefined,
          subcategoryName: subcategoryName || undefined,
          make: selectedTertiaryCategory.trim() || undefined,
          thirdLevelCategory: selectedTertiaryCategory.trim() || undefined,
          price: price.trim() || 'Po dogovoru',
          location: finalLocation,
          region: regionName,
          authorId,
          authorName,
          authorRole,
          authorAvatar: authorAvatar || undefined,
          imageUrl: primaryImg,
          images: allImgs,
          attachments: finalAttachments,
          embedCode: embedCode || undefined,
          embedOrientation: embedCode.trim() ? (embedOrientation === 'auto' ? undefined : embedOrientation) : undefined,
          status: initialAdStatus,
          tags: userTags.length > 0 ? userTags : undefined,
        });
      } else if (postType === 'event') {
        // Prepare structured multi-date, multi-hour & multi-location schedule
        const cleanSchedules = eventSchedules
          .filter(s => s.date && s.date.trim())
          .map(s => {
            const cleanTimes = s.times.map(t => t.trim()).filter(Boolean);
            return {
              date: s.date.trim(),
              times: cleanTimes,
              time: cleanTimes.join(', '),
              label: s.label?.trim() || undefined,
              location: s.location?.trim() || undefined,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        const todayYmd = getTodayYmd();
        const upcomingSlot = cleanSchedules.find(s => s.date >= todayYmd) || cleanSchedules[0];

        const primaryDate = cleanSchedules.length > 0 
          ? (upcomingSlot ? upcomingSlot.date : cleanSchedules[0].date) 
          : (eventDate || todayYmd);

        const allDates = cleanSchedules.length > 0 
          ? Array.from(new Set(cleanSchedules.map(s => s.date)))
          : [primaryDate];

        const allTimes = cleanSchedules.flatMap(s => s.times || []);
        
        let primaryTime = '';
        if (cleanSchedules.length > 0) {
          primaryTime = (upcomingSlot && upcomingSlot.time) || (upcomingSlot && upcomingSlot.times ? upcomingSlot.times.join(', ') : '') || cleanSchedules[0].time || (cleanSchedules[0].times ? cleanSchedules[0].times.join(', ') : '');
        } else {
          primaryTime = eventTime.trim();
        }

        const slotLocation = upcomingSlot?.location || cleanSchedules.find(s => s.location)?.location;
        const effectiveLocation = finalLocation || slotLocation || 'Slovenija';

        await createEventInFirestore({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: cleanContent || title.trim(),
          location: effectiveLocation,
          region: regionName,
          eventDate: primaryDate,
          eventTime: primaryTime || undefined,
          eventDates: allDates,
          eventTimes: allTimes.length > 0 ? allTimes : (primaryTime ? [primaryTime] : undefined),
          eventSchedule: cleanSchedules.length > 0 ? cleanSchedules : undefined,
          ticketUrl: ticketUrl.trim() || undefined,
          category: categorySlug,
          categoryName,
          subcategory: subcategorySlug || undefined,
          subcategoryName: subcategoryName || undefined,
          thirdLevelCategory: selectedTertiaryCategory.trim() || undefined,
          authorId,
          authorName,
          authorRole,
          authorAvatar: authorAvatar || undefined,
          imageUrl: primaryImg,
          images: allImgs,
          attachments: finalAttachments,
          embedCode: embedCode || undefined,
          embedOrientation: embedCode.trim() ? (embedOrientation === 'auto' ? undefined : embedOrientation) : undefined,
          status: initialStatus,
          isPromoted: false,
          tags: userTags.length > 0 ? userTags : undefined,
        });
      }

      setUploadProgressState((prev) =>
        prev
          ? {
              ...prev,
              active: false,
              overallPercent: 100,
              currentItemPercent: 100,
              transferredBytes: prev.totalBytes,
              stageLabel: 'Objava in vse datoteke so uspešno shranjene ✓',
              phase: 'done',
            }
          : null
      );
      setSuccessMsg('Vaša objava je bila uspešno objavljena in je takoj vidna vsem obiskovalcem!');
      trackEvent('new_post_published', {
        post_type: postType,
        post_title: title.trim(),
        category: categorySlug,
        subcategory: subcategorySlug || '',
      });
      onPostCreated?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('❌ [Blog Post Workflow] Error occurred while creating or publishing post:', err);
      setUploadProgressState(null);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Missing or insufficient permissions')) {
        setErrorMsg('Napaka pravic: Za objavo blog zapisov je potreben status preverjenega uporabnika ali skrbnika.');
      } else if (msg.includes('Quota limit exceeded') || msg.includes('Quota exceeded')) {
        setErrorMsg('Dnevna kvota branj baze podatkov je bila presežena. Vaša objava je shranjena.');
      } else if (msg.includes('exceeds the maximum allowed size') || msg.includes('največjo dovoljeno velikost')) {
        setErrorMsg(
          `Velikost besedilnega dela objave presega dovoljeno mejo (${formatBytesSlovenian(MAX_ALLOWED_POST_BYTES)}). Prosimo, skrajšajte besedilo.`
        );
      } else {
        setErrorMsg(err?.message || 'Prišlo je do napake pri shranjevanju. Preverite povezavo ali pravice.');
      }
    } finally {
      setUploadProgressMsg('');
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
        {isGuestOrUnauth && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-on-surface">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300">Prijava je obvezna za objavo vsebin</p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Objavljanje je omogočeno članom skupnosti: <strong>registrirani</strong> in <strong>preverjeni</strong> uporabniki ter <strong>skrbniki</strong>.
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

        {/* Warning banner for registered users trying to post restricted types (blog / deal) */}
        {!isGuestOrUnauth && !canPostCurrentType && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-on-surface">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  {postType === 'deal' 
                    ? 'Objavljanje ugodnosti zahteva preverjen profil ali skrbniško vlogo' 
                    : 'Objavljanje blog člankov zahteva preverjen profil ali skrbniško vlogo'}
                </p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Objavljanje blogov in akcij je dovoljeno <strong>preverjenim uporabnikom (Verified)</strong>, <strong>moderatorjem</strong> ter <strong>skrbnikom</strong>. Kot registrirani uporabnik lahko objavljate med <strong>Malimi oglasi</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPostType('ad')}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Preklopi na Mali oglas</span>
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
                ) : authorRole === 'moderator' ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                    <Shield className="w-3 h-3" /> Moderator
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
            <div className="flex items-center justify-between">
              <label className="font-label-caps text-xs text-outline uppercase tracking-wider">Vrsta objave</label>
              {!canPostCurrentType && !isGuestOrUnauth && (
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Zahteva status Preverjen uporabnik
                </span>
              )}
            </div>
            <select 
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              className="bg-surface-container-low text-on-surface font-label-md text-sm px-3 py-2.5 rounded-lg border border-transparent focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ad">🛍️ Mali oglas (Mali oglasi) — Vsi člani</option>
              <option value="event">📅 Dogodek (Dogodki & Prireditve) — Vsi člani</option>
              <option value="post" disabled={!canUserPostContentType(userRole, 'post')}>
                📝 Blog / Članek {!canUserPostContentType(userRole, 'post') ? '🔒 (Preverjeni & Skrbniki)' : '— Preverjeni & Skrbniki'}
              </option>
              <option value="deal" disabled={!canUserPostContentType(userRole, 'deal')}>
                🏷️ Ugodnost / Popust {!canUserPostContentType(userRole, 'deal') ? '🔒 (Preverjeni & Skrbniki)' : '— Preverjeni & Skrbniki'}
              </option>
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

          {/* Subtitle component (H2) positioned below the title (optional) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-on-surface-variant">
                Podnaslov (H2)
              </label>
              <span className="text-[10px] text-outline">Izbirno</span>
            </div>
            <input 
              type="text" 
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Podnaslov objave (izbirno)..."
              className="w-full bg-surface-container-low px-4 py-2 rounded-xl font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors" 
            />
          </div>

          {/* 3-LEVEL DYNAMIC CATEGORIZATION BLOCK */}
          <div className="p-3.5 bg-surface-container-low/70 rounded-xl border border-surface-container flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container/60 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-on-surface">
                  3-stopenjska kategorizacija objave
                </span>
              </div>
              <span className="text-[10px] text-outline font-medium">
                Usklajeno s skrbniško strukturo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. stopnja: Category Select */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>1. Glavna kategorija *</span>
                  </span>
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold">Značka</span>
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

              {/* 2. stopnja: Subcategory Select */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span>2. Podkategorija</span>
                  </span>
                  <span className="text-[10px] text-outline">1. spustni filter</span>
                </label>
                <select
                  value={selectedSubcategoryId}
                  onChange={e => {
                    setSelectedSubcategoryId(e.target.value);
                    setSelectedTertiaryCategory('');
                  }}
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

            {/* 3. stopnja: Znamka / Tip / Trgovec / Žanr (Combobox & Quick Select Chips) */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container/60">
              <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{tertiaryConfig.label}</span>
                </span>
                <span className="text-[10px] text-outline">2. spustni filter</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  list="tertiary-options-datalist"
                  value={selectedTertiaryCategory}
                  onChange={e => setSelectedTertiaryCategory(e.target.value)}
                  placeholder={tertiaryConfig.placeholder}
                  className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg text-xs font-medium text-on-surface border border-surface-container focus:outline-none focus:border-primary placeholder:text-outline"
                />
                {selectedTertiaryCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedTertiaryCategory('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5"
                    title="Počisti"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <datalist id="tertiary-options-datalist">
                  {availableTertiaryOptions.map(opt => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>

              {/* Quick-select chips based on admin dashboard configuration */}
              {availableTertiaryOptions.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] text-outline font-medium">
                    Hitra izbira med možnostmi, določenimi v administraciji:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto pr-1">
                    {availableTertiaryOptions.map(opt => {
                      const isSelected = selectedTertiaryCategory.trim().toLowerCase() === opt.trim().toLowerCase();
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedTertiaryCategory(isSelected ? '' : opt)}
                          className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
                              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-surface-container/70'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-outline">{tertiaryConfig.helper}</p>
            </div>

            {/* LOCALIZATION & REGION ROW */}
            <div className="flex flex-col gap-2.5 pt-1 border-t border-surface-container/60">
              {postType === 'deal' && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low/70 border border-surface-container">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-xs font-bold text-on-surface">Vrsta lokacije ugodnosti:</span>
                  </div>
                  <div className="inline-flex rounded-lg p-0.5 bg-surface-container text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRegion('none');
                        setLocation('');
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        selectedRegion === 'none'
                          ? 'bg-secondary text-on-secondary shadow-xs font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      🌐 Spletna ugodnost / Koda (brez lokacije)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRegion === 'none') setSelectedRegion('all');
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        selectedRegion !== 'none'
                          ? 'bg-secondary text-on-secondary shadow-xs font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      📍 Fizična trgovina / Lokacija
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      <span>Regija (Slovenija)</span>
                    </span>
                    {postType === 'deal' && (
                      <span className="text-[10px] text-outline font-normal">neobvezno</span>
                    )}
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={e => {
                      setSelectedRegion(e.target.value);
                    }}
                    className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs font-semibold text-on-surface border border-surface-container focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {postType === 'deal' && (
                      <option value="none">🌐 Spletna ugodnost / Brez fizične lokacije</option>
                    )}
                    <option value="all">
                      {postType === 'deal' ? '📍 Vsa Slovenija (fizične poslovalnice)' : 'Vsa Slovenija'}
                    </option>
                    {SLOVENIA_REGIONS.map(reg => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>
                        {postType === 'event' 
                          ? 'Točen kraj / prizorišče' 
                          : postType === 'ad'
                            ? 'Točen kraj / Mesto'
                            : postType === 'deal'
                              ? 'Kraj / Poslovalnica'
                              : 'Točen kraj'}
                      </span>
                    </span>
                    <span className="text-[10px] text-outline font-normal">neobvezno</span>
                  </label>

                  {postType === 'deal' && selectedRegion === 'none' ? (
                    <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-surface-container/60 text-xs text-outline italic flex items-center justify-between">
                      <span>🌐 Spletna akcija (lokacija ni potrebna)</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRegion('all')}
                        className="text-[10px] text-primary font-bold not-italic hover:underline cursor-pointer"
                      >
                        Dodaj kraj
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        list="slovenia-city-datalist"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder={
                          postType === 'event'
                            ? 'npr. Cankarjev dom, Arena Stožice, Celjski grad...'
                            : postType === 'deal'
                              ? 'npr. Ljubljana BTC, Maribor Europark ali pustite prazno...'
                              : 'npr. Ljubljana, Maribor, Celje, Kranj...'
                        }
                        className="bg-surface-container-lowest px-3 py-2 rounded-lg text-xs text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                      />
                      <datalist id="slovenia-city-datalist">
                        {allSloveniaCities.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>

                      {/* Quick suggestion chips for non-event posts */}
                      {postType !== 'event' && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[10px] text-outline font-medium">Predlagana mesta:</span>
                          {suggestedCities.slice(0, 8).map(city => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => setLocation(city)}
                              className={`text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                                location.trim().toLowerCase() === city.toLowerCase()
                                  ? 'bg-primary text-on-primary font-bold shadow-xs'
                                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <span className="text-[10px] text-outline">
                    {postType === 'deal' && selectedRegion === 'none' ? (
                      'Spletna ugodnost je dostopna vsem in ni omejena z lokacijskimi filtri.'
                    ) : location.trim() ? (
                      `Vpisano mesto / kraj: ${location.trim()}`
                    ) : postType === 'deal' ? (
                      'Lokacija je neobvezna. Če jo pustite prazno, velja za vso Slovenijo / splet.'
                    ) : (
                      `Če pustite prazno, se prikaže izbrana regija (${selectedRegion === 'all' ? 'Vsa Slovenija' : (SLOVENIA_REGIONS.find(r => r.id === selectedRegion)?.name || selectedRegion)})`
                    )}
                  </span>
                </div>
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

              {/* Dates: Datum začetka akcije & Datum poteka akcije */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Datum začetka akcije (Start date)</span>
                  </label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">
                    {startDate ? `Začetek: ${new Date(startDate).toLocaleDateString('sl-SI')}` : 'Izberite datum, od kdaj velja akcija (neobvezno)'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Datum poteka akcije (Expiration date)</span>
                  </label>
                  <input 
                    type="date" 
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                  />
                  <span className="text-[10px] text-outline">
                    {expirationDate ? `Veljavno do: ${new Date(expirationDate).toLocaleDateString('sl-SI')}` : 'Izberite datum, do kdaj velja akcija (neobvezno)'}
                  </span>
                </div>
              </div>

              {/* Discount & Promo Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* Deal link */}
              <div className="flex flex-col gap-1 pt-1 border-t border-surface-container/60">
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
          )}

          {postType === 'event' && (
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-surface-container-low/60 border border-surface-container">
              {/* Header & Explanation */}
              <div className="flex items-center justify-between pb-2 border-b border-surface-container/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span>Termini, ure & lokacije dogodka</span>
                      {eventSchedules.length > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {eventSchedules.length} terminov
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-outline">
                      Vnesite več datumov, različne lokacije/mesta (npr. gledališka predstava v različnih mestih) ali več ur na isti dan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic list of date & time slots */}
              <div className="flex flex-col gap-3">
                {eventSchedules.map((slot, sIdx) => (
                  <div 
                    key={slot.id} 
                    className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container/80 flex flex-col gap-2.5 relative shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-surface-container/40 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <span className="text-xs font-bold text-on-surface">
                          {eventSchedules.length > 1 ? `Termin ${sIdx + 1}` : 'Datum in ura dogodka'}
                        </span>
                        {slot.date && (
                          <span className="text-[11px] font-medium text-outline">
                            ({new Date(slot.date).toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'short' })})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {eventSchedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDateSlot(slot.id)}
                            className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                            title="Odstrani ta datum"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">Odstrani</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Date Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span>Datum *</span>
                        </label>
                        <input 
                          type="date" 
                          value={slot.date}
                          onChange={e => handleDateChange(slot.id, e.target.value)}
                          className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                        />
                      </div>

                      {/* Optional slot note */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-outline flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>Opis termina (neobvezno)</span>
                        </label>
                        <input 
                          type="text" 
                          value={slot.label || ''}
                          onChange={e => handleSlotLabelChange(slot.id, e.target.value)}
                          placeholder="npr. Predpremiera, Dopoldan, Večerni termin..."
                          className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                        />
                      </div>

                      {/* Slot Location Input for different towns/venues */}
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-secondary" />
                            <span>Lokacija / Mesto za ta datum (neobvezno)</span>
                          </label>
                          {location && (
                            <button
                              type="button"
                              onClick={() => handleSlotLocationChange(slot.id, location)}
                              className="text-[10px] text-primary hover:underline cursor-pointer"
                              title="Kopiraj glavno lokacijo dogodka"
                            >
                              Uporabi glavno: {location}
                            </button>
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={slot.location || ''}
                          onChange={e => handleSlotLocationChange(slot.id, e.target.value)}
                          placeholder={location ? `Privzeta lokacija: ${location}` : "npr. Cankarjev dom Ljubljana ali SNG Maribor ali Celje"}
                          className="w-full bg-surface-container-low px-3 py-2 rounded-lg font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-surface-container transition-colors" 
                        />
                      </div>
                    </div>

                    {/* Hours during this same day */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          <span>Ure / Čas na ta dan (24h format):</span>
                          {slot.times.length > 1 && (
                            <span className="text-[10px] text-primary font-bold">({slot.times.length} različne ure)</span>
                          )}
                        </label>

                        <button
                          type="button"
                          onClick={() => handleAddTime(slot.id)}
                          className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Dodaj še eno uro na ta dan</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {slot.times.map((t, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container">
                            <input 
                              type="time" 
                              step="60"
                              value={t}
                              onChange={e => handleTimeChange(slot.id, tIdx, e.target.value)}
                              placeholder="20:00"
                              className="bg-transparent px-2 py-1 font-mono text-xs text-on-surface focus:outline-none w-24" 
                            />
                            {slot.times.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTime(slot.id, tIdx)}
                                className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                title="Odstrani to uro"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddTime(slot.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Dodaj uro</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons to add dates */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddDateSlot()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dodaj nov datum / ponovitev dogodka</span>
                </button>

                {eventSchedules[eventSchedules.length - 1]?.date && (
                  <button
                    type="button"
                    onClick={() => {
                      const last = eventSchedules[eventSchedules.length - 1];
                      try {
                        const d = new Date(last.date);
                        d.setDate(d.getDate() + 1);
                        handleAddDateSlot(d.toISOString().split('T')[0], last.times);
                      } catch {
                        handleAddDateSlot();
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Dodaj naslednji koledarski dan z enakimi urami"
                  >
                    <Copy className="w-3.5 h-3.5 text-outline" />
                    <span>+ Ponovi naslednji dan (+1 dan)</span>
                  </button>
                )}
              </div>

              {/* Ticket URL row */}
              <div className="pt-2 border-t border-surface-container/60">
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

          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-container-low/60 border border-surface-container">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-outline flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>Oznake (Tagi) - ločene z vejico</span>
              </label>
              <span className="text-[10px] text-outline font-medium">npr. avto, prodaja, ugodno</span>
            </div>
            <input 
              type="text" 
              value={tagsString}
              onChange={e => setTagsString(e.target.value)}
              placeholder="npr. slovenija, novica, izlet, kulinarika, ugodno"
              className="w-full bg-surface-container-lowest px-3 py-2 rounded-xl font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-surface-container transition-colors" 
            />
            {/* Live preview badges */}
            {tagsString.split(',').map(t => t.replace(/^#/, '').trim()).filter(Boolean).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-surface-container/40">
                <span className="text-[10px] text-outline font-semibold">Predogled oznak:</span>
                {tagsString.split(',').map(t => t.replace(/^#/, '').trim()).filter(Boolean).map((tag, idx) => (
                  <span
                    key={`compose-tag-pill-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low/70 border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <label className="text-xs font-semibold text-on-surface">Fotografije objave (ena ali več)</label>
                {imageItems.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                    {imageItems.length} {imageItems.length === 1 ? 'slika' : 'slik'}
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
                    Podprte oblike: JPG, PNG, WEBP, GIF (do 25 MB na datoteko). Nalaganje v Firebase Storage ob oddaji.
                  </span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleMultiFileUpload}
                    className="hidden" 
                  />
                </label>
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

            {/* Predogled galerije pripravljenih fotografij */}
            {imageItems.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-surface-container/60">
                <div className="flex items-center justify-between text-[11px] text-outline">
                  <span>Zvezdica označi glavno naslovno sliko:</span>
                  <span className="font-semibold text-on-surface-variant">Izbrano: {imageItems.length}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {imageItems.map((img, idx) => (
                    <div 
                      key={img.id} 
                      className={`relative rounded-xl overflow-hidden aspect-video border group ${
                        idx === 0 ? 'border-primary ring-2 ring-primary/40 shadow-xs' : 'border-surface-container'
                      }`}
                    >
                      <img src={img.previewUrl} alt={`Predogled ${idx + 1}`} className="h-full w-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Glavna</span>
                        </span>
                      )}
                      {img.uploadedUrl && (
                        <span className="absolute bottom-1 left-1 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          Storage ✓
                        </span>
                      )}
                      {img.uploadStatus === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-1.5 gap-1 z-10">
                          <span className="text-[11px] font-mono font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                            {img.uploadProgress ?? 0}%
                          </span>
                          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-150"
                              style={{ width: `${Math.max(5, img.uploadProgress ?? 0)}%` }}
                            />
                          </div>
                        </div>
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

            {/* Priložene datoteke (PDF, dokumenti, arhivi...) */}
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-surface-container/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-xs font-semibold text-on-surface">Priložene datoteke (neobvezno)</span>
                  {attachmentItems.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary font-bold text-[10px]">
                      {attachmentItems.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-outline">PDF, DOCX, XLSX, ZIP, video (do 25 MB)</span>
              </div>

              <label className="border border-dashed border-surface-container-high hover:border-secondary/60 rounded-xl px-3 py-2 text-center cursor-pointer transition-colors bg-surface-container-lowest/60 hover:bg-surface-container-lowest flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                <Upload className="w-4 h-4 text-secondary" />
                <span className="font-medium">Dodaj dokument ali datoteko v Firebase Storage</span>
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentFilesSelected}
                  className="hidden"
                />
              </label>

              {attachmentItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {attachmentItems.map((att, idx) => (
                    <div
                      key={att.id}
                      className="flex flex-col gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <span className="font-medium text-on-surface truncate">{att.name}</span>
                          <span className="text-[10px] text-outline shrink-0">
                            ({formatBytesSlovenian(att.size)})
                          </span>
                          {att.uploadStatus === 'uploading' && (
                            <span className="text-[10px] font-mono text-primary font-bold shrink-0">
                              {att.uploadProgress ?? 0}%
                            </span>
                          )}
                          {att.uploadedAttachment && (
                            <span className="text-[10px] text-emerald-600 font-bold shrink-0">Naloženo ✓</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          disabled={isSubmitting}
                          className="p-1 text-outline hover:text-error rounded transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                          title="Odstrani datoteko"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {att.uploadStatus === 'uploading' && (
                        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary rounded-full transition-all duration-150 ease-out"
                            style={{ width: `${Math.max(4, att.uploadProgress ?? 0)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Firebase Storage real-time upload progress bar & summary */}
            {(totalPendingUploadBytes > 0 || estimatedTextBytes > 10_000 || uploadProgressMsg || uploadProgressState) && (
              <div className="mt-1 px-3 py-2.5 rounded-xl border bg-surface-container-lowest border-surface-container text-on-surface-variant text-[11px] flex flex-col gap-2">
                {uploadProgressState ? (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold flex items-center gap-1.5 min-w-0">
                        {uploadProgressState.phase === 'done' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                        )}
                        <span className={`truncate ${uploadProgressState.phase === 'done' ? 'text-emerald-700 dark:text-emerald-400' : 'text-primary'}`}>
                          {uploadProgressState.stageLabel}
                        </span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        {uploadProgressState.totalBytes > 0 && (
                          <span className="text-outline">
                            {formatBytesSlovenian(uploadProgressState.transferredBytes)} / {formatBytesSlovenian(uploadProgressState.totalBytes)}
                          </span>
                        )}
                        <span className={`font-bold ${uploadProgressState.phase === 'done' ? 'text-emerald-600' : 'text-primary'}`}>
                          {uploadProgressState.overallPercent}%
                        </span>
                      </div>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={uploadProgressState.overallPercent}
                      aria-label="Skupni napredek nalaganja v Firebase Storage"
                      className="w-full h-2 bg-surface-container rounded-full overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-150 ease-out ${
                          uploadProgressState.phase === 'done' ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.max(3, uploadProgressState.overallPercent)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold flex items-center gap-1.5">
                      {uploadProgressMsg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span className="text-primary">{uploadProgressMsg}</span>
                        </>
                      ) : (
                        <span>
                          Za prenos v Firebase Storage: {imageItems.filter(i => i.file).length} slik, {attachmentItems.length} datotek ({formatBytesSlovenian(totalPendingUploadBytes)})
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono opacity-80">
                      Shranjeno v Firebase Storage (brez Base64 v Firestore)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-outline flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-secondary" />
                <span>Vdelana vsebina z družbenih omrežij ali video (neobvezno)</span>
              </span>
              <span className="text-[10px] bg-secondary/10 text-secondary font-medium px-1.5 py-0.5 rounded">YouTube, Shorts, Reels, TikTok ali &lt;iframe&gt;</span>
            </label>
            <textarea 
              value={embedCode}
              onChange={e => setEmbedCode(e.target.value)}
              placeholder="Prilepite povezavo ali kodo (npr. YouTube video/Shorts, Instagram Reel, TikTok, Facebook ali iframe)..."
              className="w-full bg-surface-container-low px-4 py-2 rounded-lg font-body-sm text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors font-mono text-xs" 
              rows={2}
            />

            {/* Live detection indicator & preview */}
            {parsedEmbedPreview && (
              <div className="mt-1 p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[11px] text-primary">
                      ✓ Zaznana platforma: {parsedEmbedPreview.platformName}
                    </span>
                    <div className="inline-flex rounded-lg p-0.5 bg-surface-container border border-surface-container-high text-xs">
                      <button
                        type="button"
                        onClick={() => setEmbedOrientation('vertical')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          parsedEmbedPreview.isVertical
                            ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        title="Navpični prikaz 9:16 (Shorts, Reels, TikTok)"
                      >
                        <span>📱 Navpično (9:16)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmbedOrientation('horizontal')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          !parsedEmbedPreview.isVertical
                            ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        title="Vodoravni prikaz 16:9 (standardni video)"
                      >
                        <span>📺 Vodoravno (16:9)</span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmbedLivePreview(!showEmbedLivePreview)}
                    className="text-xs text-secondary hover:underline font-semibold cursor-pointer shrink-0"
                  >
                    {showEmbedLivePreview ? 'Skrij predogled' : 'Pokaži predogled'}
                  </button>
                </div>

                {showEmbedLivePreview && (
                  <div 
                    className="pt-2 border-t border-surface-container-low max-h-96 overflow-y-auto no-scrollbar rounded-lg"
                    dangerouslySetInnerHTML={{ __html: parsedEmbedPreview.embedHtml }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Sticky real-time Firebase Storage progress indicator above submit actions */}
          {uploadProgressState && (
            <div className="px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/25 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-on-surface flex items-center gap-1.5 min-w-0">
                  {uploadProgressState.phase === 'done' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  )}
                  <span className="truncate">{uploadProgressState.stageLabel}</span>
                </span>
                <span className={`font-mono font-bold shrink-0 ${uploadProgressState.phase === 'done' ? 'text-emerald-600' : 'text-primary'}`}>
                  {uploadProgressState.overallPercent}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgressState.overallPercent}
                aria-label="Napredek nalaganja objave"
                className="w-full h-2 bg-surface-container rounded-full overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-all duration-150 ease-out ${
                    uploadProgressState.phase === 'done' ? 'bg-emerald-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.max(3, uploadProgressState.overallPercent)}%` }}
                />
              </div>
            </div>
          )}

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
              disabled={isSubmitting || !canPostCurrentType}
              className={`px-6 py-2.5 rounded-xl font-label-md text-sm font-semibold shadow-md transition-all flex items-center gap-2 ${
                canPostCurrentType
                  ? 'bg-primary hover:bg-primary-container text-on-primary cursor-pointer' 
                  : 'bg-surface-container-high text-outline cursor-not-allowed opacity-60'
              } disabled:opacity-50`}
              title={
                !canPostCurrentType
                  ? (isGuestOrUnauth ? 'Prijavite se za objavljanje' : 'Za objavo v tej kategoriji potrebujete status Preverjen uporabnik ali Skrbnik')
                  : 'Oddaj objavo'
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {uploadProgressState
                      ? `Nalagam... ${uploadProgressState.overallPercent}%`
                      : (uploadProgressMsg || 'Shranjevanje...')}
                  </span>
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
