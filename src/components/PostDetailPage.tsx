import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Share2, Copy, Check, ExternalLink, Calendar, MapPin, 
  ThumbsUp, Tag, ShieldCheck, User, Clock, MessageSquare, 
  Phone, Send, Heart, AlertTriangle, Sparkles, CheckCircle2, 
  CalendarPlus, Bookmark, Eye, ChevronRight, ChevronLeft, Store, ArrowRight,
  Edit3, Trash2, Search, X, BookOpen, Maximize2, Images, Ticket
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { PostDetailTarget, ViewMode, AuthorProfileTarget, PostDetailType } from '../types';
import { BookmarkButton } from './BookmarkButton';
import { ShareMenu } from './ShareMenu';
import { ReportButton } from './ReportButton';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { INITIAL_DEALS, HERO_BENTO_DEALS, DealItem } from '../data/mockDealsData';
import { INITIAL_EVENTS, INITIAL_ADS, INITIAL_BLOG_POSTS, MockEventItem, MockAdItem, MockBlogItem } from '../data/mockFeedData';
import { 
  subscribeToPosts, 
  subscribeToEvents, 
  subscribeToAds, 
  fetchDocumentById,
  FirestorePost, 
  FirestoreEvent, 
  FirestoreAd,
  deletePostInFirestore,
  deleteAdInFirestore,
  deleteEventInFirestore
} from '../services/firestoreService';
import { EditPostModal, EditablePostItem } from './posts/EditPostModal';
import { scrollToPageTop, scrollToSidebarsTop } from '../utils/scrollUtils';
import { parseEventDateInfo } from '../utils/dateUtils';
import { getCleanHtml } from '../utils/textUtils';
import { parseSocialEmbed } from '../utils/embedUtils';
import { getActiveFallbackImage } from '../services/portalSettingsService';
import { buildSearchQuery, SearchCategory } from '../utils/searchUtils';
import { updatePageSeo } from '../utils/seoUtils';
import { buildPostUrl, slugify } from '../utils/urlUtils';
import { SocialShareWidget } from './SocialShareWidget';
import { DEFAULT_CATEGORIES } from '../services/categoryService';

// Mapping of mock blog post IDs to their actual categories
const MOCK_BLOG_CATEGORY_MAP: Record<string, { id: string; name: string }> = {
  'blog-1': { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' },
  'blog-2': { id: 'blog-dom-vrt', name: 'Dom & Vrt' },
  'blog-3': { id: 'blog-zdravje-sport', name: 'Zdravje & Šport' },
  'blog-4': { id: 'blog-kulinarika-recepti', name: 'Kulinarika & Recepti' },
  'blog-5': { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' },
  'blog-6': { id: 'blog-dom-vrt', name: 'Dom & Vrt' },
  'blog-7': { id: 'blog-finance-podjetnistvo', name: 'Finance & Posel' },
  'blog-8': { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' },
  'blog-9': { id: 'blog-zdravje-sport', name: 'Zdravje & Šport' },
  'blog-10': { id: 'blog-dom-vrt', name: 'Dom & Vrt' },
  'blog-11': { id: 'blog-kulinarika-recepti', name: 'Kulinarika & Recepti' },
  'blog-12': { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' },
  'blog-13': { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' },
  'blog-14': { id: 'blog-tehnologija-inovacije', name: 'Tehnologija & Inovacije' },
  'blog-15': { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' },
  'blog-16': { id: 'blog-finance-podjetnistvo', name: 'Finance & Posel' },
  'blog-17': { id: 'blog-dom-vrt', name: 'Dom & Vrt' },
  'blog-18': { id: 'blog-zdravje-sport', name: 'Zdravje & Šport' },
  'blog-19': { id: 'blog-dom-vrt', name: 'Dom & Vrt' },
  'blog-20': { id: 'blog-kulinarika-recepti', name: 'Kulinarika & Recepti' },
};

export function resolveBlogCategory(post: {
  id?: string;
  category?: string;
  categoryName?: string;
  tags?: string[];
  title?: string;
  description?: string;
}): { id: string; name: string } {
  // 1. Explicit valid categoryName
  if (post.categoryName && !['Blog & Članki', 'blog', 'post', 'Splošno'].includes(post.categoryName)) {
    return { id: post.category || 'blog-general', name: post.categoryName };
  }
  // 2. Explicit valid category id
  if (post.category && !['blog', 'post', 'general', 'splosno'].includes(post.category)) {
    const found = DEFAULT_CATEGORIES.find(c => c.id === post.category || c.name.toLowerCase() === post.category?.toLowerCase());
    if (found) return { id: found.id, name: found.name };
  }

  // 3. Known mock mapping
  const cleanId = post.id ? post.id.replace(/-p\d+$/, '') : '';
  if (cleanId && MOCK_BLOG_CATEGORY_MAP[cleanId]) {
    return MOCK_BLOG_CATEGORY_MAP[cleanId];
  }

  // 4. Inferred by tags and content keywords
  const tags = (post.tags || []).join(' ').toLowerCase();
  const text = `${post.title || ''} ${post.description || ''}`.toLowerCase();
  const combined = `${tags} ${text}`;

  if (combined.match(/turizem|izlet|soča|morje|biseri|hribi|planin|potep|bovec|istra|pokljuka|kopanje|parenzana/)) {
    return { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' };
  }
  if (combined.match(/kulinarik|recept|kruh|drož|vina|kava|barista|hrana|kosil|peka|gibanic|bograč/)) {
    return { id: 'blog-kulinarika-recepti', name: 'Kulinarika & Recepti' };
  }
  if (combined.match(/dom|vrt|ogrevan|toplotn|mizar|les|rastlin|balkon|zelišč|gradnj|izolacij|pohištv|minimaliz/)) {
    return { id: 'blog-dom-vrt', name: 'Dom & Vrt' };
  }
  if (combined.match(/šport|kolesar|plezan|ferat|tek|maraton|trening|zdravj|adrenalin/)) {
    return { id: 'blog-zdravje-sport', name: 'Zdravje & Šport' };
  }
  if (combined.match(/tehnologij|aplikacij|programir|pametn|iot|gadget|ai|varnost|računal/)) {
    return { id: 'blog-tehnologija-inovacije', name: 'Tehnologija & Inovacije' };
  }
  if (combined.match(/financ|posel|podjet|trgovin|varčevan|etf|investic|denar|dobiček|ecommerce/)) {
    return { id: 'blog-finance-podjetnistvo', name: 'Finance & Posel' };
  }

  return { id: 'blog-turizem-izleti', name: 'Turizem & Izleti' };
}

interface PostDetailPageProps {
  target: PostDetailTarget;
  onBack: () => void;
  onNavigatePost: (target: PostDetailTarget) => void;
  onViewChange: (view: ViewMode) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onAuthorClick?: (author: AuthorProfileTarget) => void;
  onTitleLoaded?: (title: string, meta?: { categoryName?: string; subcategoryName?: string; cleanUrl?: string }) => void;
}

interface PostComment {
  id: string;
  author: string;
  authorAvatar?: string;
  authorRole?: string;
  date: string;
  content: string;
}

export function PostDetailPage({ 
  target, 
  onBack, 
  onNavigatePost, 
  onViewChange, 
  searchQuery, 
  onSearchChange,
  onAuthorClick,
  onTitleLoaded
}: PostDetailPageProps) {
  const { currentUser } = useAuth();
  const { addNotification } = useNotifications();

  // In-page search state
  const [inPageSearchText, setInPageSearchText] = useState('');

  const targetCategory: SearchCategory = 
    target.type === 'deal' ? 'deals' :
    target.type === 'event' ? 'events' :
    target.type === 'ad' ? 'ads' : 'blog';

  const targetViewMode: ViewMode = 
    target.type === 'deal' ? 'deals' :
    target.type === 'event' ? 'events' :
    target.type === 'ad' ? 'ads' : 'blog';

  const handleExecuteSearch = (queryText: string, category: SearchCategory = targetCategory) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    const fullQuery = buildSearchQuery(category, trimmed);
    onSearchChange?.(fullQuery);
    const destinationView: ViewMode = category !== 'all' ? (category as ViewMode) : targetViewMode;
    onViewChange(destinationView);
    scrollToPageTop();
    scrollToSidebarsTop();
  };

  const handleTagClick = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim();
    handleExecuteSearch(cleanTag, targetCategory);
  };

  const quickKeywords = target.type === 'ad'
    ? ['Avtomobili', 'Nepremičnine', 'Elektronika', 'Šport', 'Dom in vrt']
    : target.type === 'event'
    ? ['Koncerti', 'Festival', 'Ljubljana', 'Maribor', 'Kultura']
    : target.type === 'deal'
    ? ['Kuponi', 'Popusti', 'Brezplačna dostava', 'Trgovine']
    : ['Turizem', 'Kulinarika', 'Gradnja', 'Finance', 'Slovenija'];

  // Live Firestore subscriptions
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);

  // Direct item fetch state for fast deep-linking & guaranteed ID lookup
  const [directItem, setDirectItem] = useState<{ type: PostDetailType; data: any } | null>(null);
  const [isDirectLoading, setIsDirectLoading] = useState<boolean>(!target.initialData);

  useEffect(() => {
    let isCancelled = false;
    if (target.initialData) {
      setIsDirectLoading(false);
      setDirectItem(null);
      return;
    }

    setIsDirectLoading(true);
    setDirectItem(null);

    async function loadItem() {
      try {
        const res = await fetchDocumentById(target.id, target.type);
        if (!isCancelled && res) {
          setDirectItem(res as { type: PostDetailType; data: any });
        }
      } catch (err) {
        console.warn('Error fetching item directly:', err);
      } finally {
        if (!isCancelled) {
          setIsDirectLoading(false);
        }
      }
    }

    loadItem();

    return () => {
      isCancelled = true;
    };
  }, [target.id, target.type, target.initialData]);

  // Local interactive states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [isRsvpActive, setIsRsvpActive] = useState(false);
  const [rsvpCount, setRsvpCount] = useState<number>(0);
  const [votes, setVotes] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [blogLikes, setBlogLikes] = useState<number>(0);
  const [hasBlogLiked, setHasBlogLiked] = useState(false);

  // Carousel & Lightbox state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Edit / Delete post modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubPosts = subscribeToPosts(setFirestorePosts);
    const unsubEvents = subscribeToEvents(setFirestoreEvents);
    const unsubAds = subscribeToAds(setFirestoreAds);
    return () => {
      unsubPosts();
      unsubEvents();
      unsubAds();
    };
  }, []);

  // Ensure page and both sidebars scroll to top when opening or switching posts
  useEffect(() => {
    scrollToPageTop();
    scrollToSidebarsTop();
  }, [target.type, target.id]);

  // Resolve item data
  const itemData = useMemo(() => {
    const { type, id, initialData } = target;

    if (initialData) return initialData;

    // Helper to format event object
    const formatEventData = (fs: FirestoreEvent) => {
      const dateInfo = parseEventDateInfo(fs.eventDate || fs.date, fs.eventTime);
      return {
        id: fs.id,
        type: 'event' as const,
        title: fs.title,
        description: fs.description,
        location: fs.location,
        date: dateInfo.fullDate,
        eventDate: fs.eventDate,
        eventTime: fs.eventTime,
        ticketUrl: fs.ticketUrl,
        month: dateInfo.month,
        day: dateInfo.day,
        price: fs.price || 'Vstop prost',
        organizer: fs.authorName,
        authorName: fs.authorName,
        authorId: fs.authorId,
        status: fs.status,
        categoryName: fs.categoryName || fs.category || 'Dogodek v živo',
        image: fs.imageUrl || (getActiveFallbackImage(true) || ''),
        images: fs.images || fs.imageUrls || (fs.imageUrl ? [fs.imageUrl] : (getActiveFallbackImage(true) ? [getActiveFallbackImage(true)!] : [])),
        interestedCount: fs.interestedCount || 42,
      };
    };

    // Helper to format deal object
    const formatDealData = (fs: FirestorePost) => {
      return {
        id: fs.id,
        type: 'deal' as const,
        title: fs.title,
        description: fs.content,
        discount: fs.discount || fs.price || 'Ugodnost',
        oldPrice: fs.oldPrice,
        newPrice: fs.newPrice,
        expirationDate: fs.expirationDate,
        partner: fs.authorName,
        authorName: fs.authorName,
        authorId: fs.authorId,
        status: fs.status,
        partnerRole: fs.authorRole,
        partnerAvatar: fs.authorAvatar,
        date: fs.expirationDate ? `Velja do ${fs.expirationDate}` : (fs.createdAt ? new Date(fs.createdAt).toLocaleDateString('sl-SI') : 'Danes'),
        image: fs.imageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&auto=format&fit=crop&q=80',
        images: fs.images || fs.imageUrls || (fs.imageUrl ? [fs.imageUrl] : undefined),
        category: fs.category || 'deal',
        categoryName: fs.categoryName || 'Ugodnosti & Popusti',
        region: fs.location || 'Vsa Slovenija',
        votes: fs.likesCount || 12,
        code: fs.promoCode,
        link: fs.dealLink || 'https://www.portalko.net',
      };
    };

    // Helper to format ad object
    const formatAdData = (fs: FirestoreAd) => {
      return {
        id: fs.id,
        type: 'ad' as const,
        title: fs.title,
        description: fs.description,
        price: fs.price,
        location: fs.location,
        date: fs.createdAt ? new Date(fs.createdAt).toLocaleDateString('sl-SI') : 'Danes',
        author: fs.authorName,
        authorName: fs.authorName,
        authorId: fs.authorId,
        status: fs.status,
        categoryName: fs.category || 'Mali oglas',
        image: fs.imageUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1000&auto=format&fit=crop&q=80',
        images: fs.images || fs.imageUrls || (fs.imageUrl ? [fs.imageUrl] : undefined),
        authorInitials: (fs.authorName || 'O').slice(0, 2).toUpperCase(),
      };
    };

    // Helper to format blog object
    const formatBlogData = (fs: FirestorePost) => {
      const isActuallyDeal = fs.category === 'deal' || 
                             fs.category === 'ugodnosti' || 
                             fs.category?.startsWith('deal') || 
                             fs.categoryName === 'Ugodnosti' || 
                             fs.categoryName === 'Ugodnost' ||
                             fs.id.startsWith('deal-') ||
                             fs.id.startsWith('hero-bento-');

      if (isActuallyDeal) {
        return formatDealData(fs);
      }

      const resolvedCat = resolveBlogCategory({
        id: fs.id,
        category: fs.category,
        categoryName: fs.categoryName,
        title: fs.title,
        description: fs.content,
        tags: fs.category ? [fs.category] : undefined,
      });
      return {
        id: fs.id,
        type: 'blog' as const,
        title: fs.title,
        description: fs.content,
        content: fs.content,
        author: fs.authorName,
        authorName: fs.authorName,
        authorId: fs.authorId,
        status: fs.status,
        authorRole: fs.authorRole || 'Član skupnosti',
        authorAvatar: fs.authorAvatar,
        date: fs.createdAt ? new Date(fs.createdAt).toLocaleDateString('sl-SI') : 'Ravno objavljeno',
        image: fs.imageUrl,
        images: fs.images || fs.imageUrls || (fs.imageUrl ? [fs.imageUrl] : undefined),
        categoryName: resolvedCat.name,
        categoryId: resolvedCat.id,
        location: fs.location || 'Slovenija',
        readTime: '4 min branja',
        photoCount: fs.imageUrl ? '1 fotografija' : undefined,
        likesCount: fs.likesCount || 0,
        commentsCount: fs.commentsCount || 0,
        viewsCount: '1.240',
        tags: ['blog', 'portal', 'slovenija', fs.category || 'zgodbe'],
      };
    };

    const idMatches = (docId?: string, searchId?: string) => {
      if (!docId || !searchId) return false;
      const d = docId.toLowerCase().trim();
      const s = searchId.toLowerCase().trim();
      if (d === s) return true;
      const cleanD = d.replace(/^(event|ad|deal|blog|post)-/, '');
      const cleanS = s.replace(/^(event|ad|deal|blog|post)-/, '');
      return cleanD === cleanS;
    };

    const itemMatches = (item: any, searchId?: string, searchSlug?: string) => {
      if (!item) return false;
      if (searchId && idMatches(item.id, searchId)) return true;

      const targetSlug = searchSlug || (searchId ? slugify(searchId) : '');
      if (!targetSlug) return false;

      // Check if targetSlug has embedded ID (e.g. title-slug--blog-1 or title-slug-blog-1)
      if (targetSlug.includes('--')) {
        const idPart = targetSlug.split('--')[1];
        if (idMatches(item.id, idPart)) return true;
      }
      if (targetSlug.endsWith(`-${item.id}`)) return true;

      const itemTitleSlug = slugify(item.title || '');
      if (itemTitleSlug) {
        if (itemTitleSlug === targetSlug) return true;
        if (targetSlug.startsWith(itemTitleSlug) || itemTitleSlug.startsWith(targetSlug)) return true;
      }
      return false;
    };

    // 1. Check directItem from guaranteed fetch
    if (directItem) {
      if (directItem.type === 'event') return formatEventData(directItem.data);
      if (directItem.type === 'deal') return formatDealData(directItem.data);
      if (directItem.type === 'ad') return formatAdData(directItem.data);
      if (directItem.type === 'blog') return formatBlogData(directItem.data);
    }

    const titleSlug = target.titleSlug;

    if (type === 'deal') {
      // Look in Firestore posts
      const fs = firestorePosts.find(p => itemMatches(p, id, titleSlug));
      if (fs) return formatDealData(fs);

      // Cross-collection fallback
      const fsEvt = firestoreEvents.find(e => itemMatches(e, id, titleSlug));
      if (fsEvt) return formatEventData(fsEvt);

      // Look in Mock Deals
      const allDeals = [...INITIAL_DEALS, ...HERO_BENTO_DEALS];
      const d = allDeals.find(x => itemMatches(x, id, titleSlug));
      if (!d) return null;
      return {
        ...d,
        type: 'deal',
        oldPrice: d.oldPrice,
        newPrice: d.newPrice,
        expirationDate: d.expirationDate,
        category: d.category || 'deal',
        categoryName: d.categoryName || 'Ugodnosti',
        images: d.images || (d.image ? [d.image] : undefined),
      };
    }

    if (type === 'event') {
      // Look in Firestore events
      const fs = firestoreEvents.find(e => itemMatches(e, id, titleSlug));
      if (fs) return formatEventData(fs);

      // Cross-collection fallback: check posts
      const fsPost = firestorePosts.find(p => itemMatches(p, id, titleSlug));
      if (fsPost) return formatBlogData(fsPost);

      // Cross-collection fallback: check ads
      const fsAd = firestoreAds.find(a => itemMatches(a, id, titleSlug));
      if (fsAd) return formatAdData(fsAd);

      // Look in Mock Events
      const e = INITIAL_EVENTS.find(x => itemMatches(x, id, titleSlug));
      if (!e) return null;
      return {
        ...e,
        type: 'event',
        images: e.images || (e.image ? [e.image] : undefined),
      };
    }

    if (type === 'ad') {
      // Look in Firestore ads
      const fs = firestoreAds.find(a => itemMatches(a, id, titleSlug));
      if (fs) return formatAdData(fs);

      // Cross-collection fallback: check events
      const fsEvt = firestoreEvents.find(e => itemMatches(e, id, titleSlug));
      if (fsEvt) return formatEventData(fsEvt);

      // Cross-collection fallback: check posts
      const fsPost = firestorePosts.find(p => itemMatches(p, id, titleSlug));
      if (fsPost) return formatBlogData(fsPost);

      // Look in Mock Ads
      const a = INITIAL_ADS.find(x => itemMatches(x, id, titleSlug));
      if (!a) return null;
      return {
        ...a,
        type: 'ad',
        images: a.images || (a.image ? [a.image] : undefined),
      };
    }

    if (type === 'blog' || type === 'post') {
      // Look in Firestore posts
      const fs = firestorePosts.find(p => itemMatches(p, id, titleSlug));
      if (fs) return formatBlogData(fs);

      // Cross-collection fallback: check events
      const fsEvt = firestoreEvents.find(e => itemMatches(e, id, titleSlug));
      if (fsEvt) return formatEventData(fsEvt);

      // Cross-collection fallback: check ads
      const fsAd = firestoreAds.find(a => itemMatches(a, id, titleSlug));
      if (fsAd) return formatAdData(fsAd);

      // Look in Mock Blog Posts
      const baseId = id ? id.replace(/-p\d+$/, '') : '';
      const b = INITIAL_BLOG_POSTS.find(x => itemMatches(x, id, titleSlug) || idMatches(x.id, id) || (baseId && idMatches(x.id, baseId)));
      if (!b) return null;
      const resolvedCat = resolveBlogCategory(b);
      return {
        ...b,
        type: 'blog',
        images: b.images || (b.image ? [b.image] : undefined),
        categoryName: resolvedCat.name,
        categoryId: resolvedCat.id,
      };
    }

    return null;
  }, [target, firestorePosts, firestoreEvents, firestoreAds, directItem]);

  // Calculate resolved post images list for carousel/gallery
  const postImages = useMemo(() => {
    if (!itemData) return [];
    const list: string[] = [];

    const addItems = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === 'string' && v.trim().length > 0) list.push(v.trim());
        }
      } else if (typeof val === 'string' && val.trim().length > 0) {
        const trimmed = val.trim();
        // Base64 data URLs contain commas in their header (data:image/jpeg;base64,...) and must NOT be split!
        if (trimmed.startsWith('data:image/')) {
          list.push(trimmed);
        } else if (trimmed.includes(',') || trimmed.includes('\n')) {
          const parts = trimmed.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
          list.push(...parts);
        } else {
          list.push(trimmed);
        }
      }
    };

    addItems(itemData.images);
    addItems(itemData.imageUrls);
    addItems(itemData.gallery);
    addItems(itemData.image);
    addItems(itemData.imageUrl);

    const unique: string[] = [];
    for (const url of list) {
      if (!unique.includes(url)) unique.push(url);
    }
    if (unique.length === 0) {
      const fallback = getActiveFallbackImage(true, target.type as any);
      if (fallback) unique.push(fallback);
    }
    return unique;
  }, [itemData, target.type]);

  // Reset active image on post change
  useEffect(() => {
    setActiveImageIndex(0);
    setIsLightboxOpen(false);
  }, [target.id, target.type]);

  // Carousel navigation handlers
  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (postImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % postImages.length);
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (postImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length);
  };

  const handleSelectImage = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex(idx);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % postImages.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, postImages.length]);

  // Sync state when itemData changes
  useEffect(() => {
    if (!itemData) return;
    setVotes(itemData.votes || itemData.votesCount || 24);
    setHasVoted(false);
    setShowPhone(false);

    const initialRsvp = typeof itemData.interestedCount === 'number' 
      ? itemData.interestedCount 
      : parseInt(String(itemData.interestedCount)) || 35;
    setRsvpCount(initialRsvp);
    setIsRsvpActive(false);

    const initialBlogLikes = typeof itemData.likesCount === 'number'
      ? itemData.likesCount
      : parseInt(String(itemData.likesCount)) || 42;
    setBlogLikes(initialBlogLikes);
    setHasBlogLiked(false);

    // Load persisted real user comments for this post if any
    try {
      const storageKey = `portalko_comments_${target.type}_${target.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = Array.isArray(parsed)
          ? parsed.filter((c: any) => c && c.id !== 'c1' && c.id !== 'c2' && c.author !== 'Matej B.' && c.author !== 'Ana Novak')
          : [];
        setComments(filtered);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    }

    if (itemData) {
      const typeLabel = target.type === 'ad' ? 'Mali oglas' :
                        target.type === 'event' ? 'Dogodek' :
                        target.type === 'deal' ? 'Ugodnost' : 'Blog & Zgodba';

      const postAuthorName = itemData.author || itemData.authorName || itemData.partner || itemData.organizer || 'Avtor';
      
      // Clean SEO URL structure: /category/subcategory/title
      const cleanPath = buildPostUrl({
        type: target.type,
        id: itemData.id || target.id,
        title: itemData.title,
        category: itemData.category,
        categoryName: itemData.categoryName,
        subcategory: itemData.subcategory,
        subcategoryName: itemData.subcategoryName,
      });

      const fullUrl = `${window.location.origin}${cleanPath}`;

      // Update URL cleanly without hash
      if (window.location.pathname !== cleanPath || window.location.hash) {
        window.history.replaceState({ type: target.type, id: itemData.id || target.id }, '', cleanPath);
      }
      scrollToPageTop();

      onTitleLoaded?.(itemData.title, {
        categoryName: itemData.categoryName || itemData.category,
        subcategoryName: itemData.subcategoryName || itemData.subcategory,
        cleanUrl: cleanPath,
      });

      let jsonLd: Record<string, any> | undefined;
      const cleanDesc = (itemData.description || itemData.content || itemData.title).replace(/\s+/g, ' ').trim();

      if (target.type === 'event') {
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Event',
          '@id': fullUrl,
          url: fullUrl,
          name: itemData.title,
          description: cleanDesc,
          image: itemData.image ? [itemData.image] : [],
          startDate: itemData.eventDate || itemData.date,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: {
            '@type': 'Place',
            name: itemData.location || 'Slovenija',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'SI',
              addressLocality: itemData.location || 'Slovenija',
            },
          },
          offers: {
            '@type': 'Offer',
            price: itemData.price ? itemData.price.replace(/[^0-9.,]/g, '') || '0' : '0',
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
          },
          organizer: {
            '@type': 'Organization',
            name: itemData.organizer || postAuthorName || 'Portalko Dogodki',
          },
        };
      } else if (target.type === 'deal') {
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Offer',
          '@id': fullUrl,
          url: fullUrl,
          name: itemData.title,
          description: cleanDesc,
          image: itemData.image,
          price: itemData.price ? itemData.price.replace(/[^0-9.,]/g, '') || '0' : '0',
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: itemData.partner || 'Portalko Partner',
          },
        };
      } else if (target.type === 'ad') {
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          '@id': fullUrl,
          url: fullUrl,
          name: itemData.title,
          description: cleanDesc,
          image: itemData.image ? [itemData.image] : [],
          offers: {
            '@type': 'Offer',
            price: itemData.price ? itemData.price.replace(/[^0-9.,]/g, '') || '0' : '0',
            priceCurrency: 'EUR',
            itemCondition: 'https://schema.org/UsedCondition',
            availability: 'https://schema.org/InStock',
          },
        };
      } else {
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': fullUrl,
          mainEntityOfPage: fullUrl,
          url: fullUrl,
          headline: itemData.title,
          description: cleanDesc,
          image: itemData.image ? [itemData.image] : [],
          inLanguage: 'sl-SI',
          author: {
            '@type': 'Person',
            name: postAuthorName || 'Avtor Portalko',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Portalko',
            logo: {
              '@type': 'ImageObject',
              url: `${window.location.origin}/favicon.png`,
            },
          },
        };
      }

      updatePageSeo({
        title: `${itemData.title} – ${itemData.categoryName || typeLabel} | Portalko`,
        description: cleanDesc.slice(0, 160),
        image: itemData.image,
        location: itemData.location || itemData.region,
        url: fullUrl,
        canonicalUrl: fullUrl,
        type: target.type === 'event' ? 'event' : target.type === 'deal' || target.type === 'ad' ? 'product' : 'article',
        jsonLd,
      });
    } else {
      scrollToPageTop();
    }
  }, [itemData, target]);

  // Handle post upvote
  const handleVote = () => {
    if (!hasVoted) {
      setVotes(v => v + 1);
      setHasVoted(true);
    }
  };

  // Handle RSVP
  const handleRsvp = () => {
    const nextState = !isRsvpActive;
    setIsRsvpActive(nextState);
    setRsvpCount(c => nextState ? c + 1 : c - 1);
  };

  // Handle blog like
  const handleLikeBlog = () => {
    if (!hasBlogLiked) {
      setBlogLikes(l => l + 1);
      setHasBlogLiked(true);
    }
  };

  // Handle copy code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  // Handle copy permalink
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Handle new comment submission
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);

    const authorName = currentUser?.name || 'Gost Portalko';
    const authorAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=7C3AED&color=fff`;
    const authorRole = currentUser?.role === 'superadmin' ? 'Superadmin' :
                       currentUser?.role === 'admin' ? 'Administrator' :
                       currentUser?.role === 'verified' ? 'Preverjen uporabnik' :
                       currentUser?.role === 'registered' ? 'Registriran uporabnik' : 'Gost';

    const newComment: PostComment = {
      id: `comment-${Date.now()}`,
      author: authorName,
      authorAvatar,
      authorRole,
      date: 'ravnokar',
      content: newCommentText.trim(),
    };

    setComments(prev => {
      const updated = [...prev, newComment];
      try {
        const storageKey = `portalko_comments_${target.type}_${target.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setNewCommentText('');
    setIsSubmittingComment(false);
  };

  // Handle comment deletion (for author or admin/superadmin)
  const handleDeleteComment = (commentId: string) => {
    setComments(prev => {
      const updated = prev.filter(c => c.id !== commentId);
      try {
        const storageKey = `portalko_comments_${target.type}_${target.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Determine 3 related articles from the same category as the currently viewed blog post
  const relatedArticles = useMemo(() => {
    if (target.type !== 'blog' && target.type !== 'post') return [];
    if (!itemData) return [];

    const currentId = itemData.id;
    const currentBaseId = currentId.replace(/-p\d+$/, '');
    const currentCat = resolveBlogCategory(itemData);
    const currentTags = (itemData.tags || []).map((t: string) => String(t).toLowerCase());

    interface CandidateArticle {
      id: string;
      title: string;
      description?: string;
      author?: string;
      authorAvatar?: string;
      image?: string;
      readTime?: string;
      date?: string;
      categoryName: string;
      categoryId: string;
      score: number;
    }

    const candidates: CandidateArticle[] = [];

    // 1. From Firestore posts
    firestorePosts
      .filter(p => p.category !== 'deal' && p.status !== 'archived')
      .forEach(p => {
        if (p.id === currentId || p.id === target.id) return;
        const cat = resolveBlogCategory({
          id: p.id,
          category: p.category,
          categoryName: p.categoryName,
          title: p.title,
          description: p.content
        });
        let score = 0;
        if (cat.id === currentCat.id || cat.name.toLowerCase() === currentCat.name.toLowerCase()) {
          score += 25;
        }
        candidates.push({
          id: p.id,
          title: p.title,
          description: p.content,
          author: p.authorName,
          authorAvatar: p.authorAvatar,
          image: p.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
          readTime: '4 min branja',
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('sl-SI') : 'Nedavno',
          categoryName: cat.name,
          categoryId: cat.id,
          score
        });
      });

    // 2. From Mock Blog Posts
    INITIAL_BLOG_POSTS.forEach(b => {
      if (b.id === currentId || b.id === currentBaseId || b.id === target.id) return;
      if (candidates.some(c => c.id === b.id)) return;

      const cat = resolveBlogCategory(b);
      let score = 0;
      if (cat.id === currentCat.id || cat.name.toLowerCase() === currentCat.name.toLowerCase()) {
        score += 25;
      }
      if (b.tags && currentTags.length > 0) {
        const sharedTags = b.tags.filter(t => currentTags.includes(String(t).toLowerCase()));
        score += sharedTags.length * 4;
      }

      candidates.push({
        id: b.id,
        title: b.title,
        description: b.description,
        author: b.author,
        authorAvatar: b.authorAvatar,
        image: b.image,
        readTime: b.readTime || '5 min branja',
        date: b.date,
        categoryName: cat.name,
        categoryId: cat.id,
        score
      });
    });

    // Strictly prioritize posts from the exact same category
    const sameCategoryCandidates = candidates.filter(
      c => c.categoryId === currentCat.id || c.categoryName.toLowerCase() === currentCat.name.toLowerCase()
    );

    sameCategoryCandidates.sort((a, b) => b.score - a.score);

    if (sameCategoryCandidates.length >= 3) {
      return sameCategoryCandidates.slice(0, 3);
    }

    // If fewer than 3 exact matches, take all of them and backfill with top scored remaining candidates
    const selected = [...sameCategoryCandidates];
    const remaining = candidates
      .filter(c => !selected.some(s => s.id === c.id))
      .sort((a, b) => b.score - a.score);

    for (const item of remaining) {
      if (selected.length >= 3) break;
      selected.push(item);
    }

    return selected.slice(0, 3);
  }, [target.type, target.id, itemData, firestorePosts]);

  // Related 3 ads from same category
  const relatedAds = useMemo(() => {
    if (target.type !== 'ad' || !itemData) return [];
    const seenIds = new Set<string>();
    const allAds: any[] = [];

    firestoreAds.forEach(a => {
      if (a.id && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAds.push({
          id: a.id,
          title: a.title,
          price: a.price,
          location: a.location,
          image: a.imageUrl,
          category: a.category || 'splosno',
          categoryName: a.categoryName || a.category || 'Mali oglas'
        });
      }
    });

    INITIAL_ADS.forEach(a => {
      if (a.id && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAds.push(a);
      }
    });

    const currentId = itemData.id;
    const currentCat = itemData.category || itemData.categoryName;

    const filtered = allAds.filter(a => a.id !== currentId);
    const sameCat = filtered.filter(a => 
      (currentCat && (a.category === currentCat || a.categoryName === currentCat))
    );

    if (sameCat.length >= 3) return sameCat.slice(0, 3);
    const others = filtered.filter(a => !sameCat.some(s => s.id === a.id));
    return [...sameCat, ...others].slice(0, 3);
  }, [target.type, itemData, firestoreAds]);

  // Related 3 events from same category
  const relatedEvents = useMemo(() => {
    if (target.type !== 'event' || !itemData) return [];
    const seenIds = new Set<string>();
    const allEvents: any[] = [];

    firestoreEvents.forEach(e => {
      if (e.id && !seenIds.has(e.id)) {
        seenIds.add(e.id);
        allEvents.push({
          id: e.id,
          title: e.title,
          location: e.location,
          city: e.location,
          month: 'DOG',
          day: '★',
          image: e.imageUrl,
          category: e.category || 'splosno',
          categoryName: e.categoryName || e.category || 'Dogodek'
        });
      }
    });

    INITIAL_EVENTS.forEach(e => {
      if (e.id && !seenIds.has(e.id)) {
        seenIds.add(e.id);
        allEvents.push(e);
      }
    });

    const currentId = itemData.id;
    const currentCat = itemData.category || itemData.categoryName;

    const filtered = allEvents.filter(e => e.id !== currentId);
    const sameCat = filtered.filter(e => 
      (currentCat && (e.category === currentCat || e.categoryName === currentCat))
    );

    if (sameCat.length >= 3) return sameCat.slice(0, 3);
    const others = filtered.filter(a => !sameCat.some(s => s.id === a.id));
    return [...sameCat, ...others].slice(0, 3);
  }, [target.type, itemData, firestoreEvents]);

  // Related 3 deals
  const relatedDeals = useMemo(() => {
    if (target.type !== 'deal' || !itemData) return [];
    const seenIds = new Set<string>();
    const allDeals: any[] = [];
    [...INITIAL_DEALS, ...HERO_BENTO_DEALS].forEach(d => {
      if (d.id && !seenIds.has(d.id)) {
        seenIds.add(d.id);
        allDeals.push(d);
      }
    });
    const currentId = itemData.id;
    return allDeals.filter(d => d.id !== currentId).slice(0, 3);
  }, [target.type, itemData]);

  if (isDirectLoading && !itemData) {
    return (
      <main className="lg:col-span-6 flex flex-col items-center justify-center p-16 bg-surface-container-lowest rounded-2xl border border-surface-container/60 shadow-xs min-h-[420px] text-center">
        <div className="w-12 h-12 rounded-full border-3 border-primary/20 border-t-primary animate-spin mb-4" />
        <h2 className="text-base font-bold text-on-surface mb-1">Nalaganje objave...</h2>
        <p className="text-xs text-outline">Pripravljamo podrobnosti objave in fotografije.</p>
      </main>
    );
  }

  if (!itemData) {
    return (
      <main className="lg:col-span-6 flex flex-col items-center justify-center p-12 bg-surface-container-lowest rounded-2xl border border-surface-container text-center">
        <h2 className="text-xl font-bold text-on-surface mb-2">Objava ni bila najdena</h2>
        <p className="text-sm text-outline mb-6">Morda je bila objava odstranjena ali pa povezava ni pravilna.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:bg-primary-container transition-colors cursor-pointer"
        >
          Nazaj na pregled
        </button>
      </main>
    );
  }

  // Determine back navigation label
  const backLabel = target.type === 'deal' 
    ? 'Nazaj na Ugodnosti' 
    : target.type === 'event' 
    ? 'Nazaj na Dogodke' 
    : target.type === 'ad'
    ? 'Nazaj na Male oglase'
    : (target.type === 'blog' || target.type === 'post')
    ? 'Nazaj na Blog & Članki'
    : 'Nazaj';

  const feedCategoryName = target.type === 'deal'
    ? 'Ugodnosti & Popusti'
    : target.type === 'event'
    ? 'Dogodki & Koncerti'
    : target.type === 'ad'
    ? 'Mali oglasi'
    : 'Blog & Članki';

  // Bookmark payload
  const bookmarkData = {
    id: itemData.id,
    type: (target.type === 'blog' || target.type === 'post') ? 'blog' : target.type,
    category: target.type === 'deal' ? 'deals' : target.type === 'event' ? 'events' : target.type === 'ad' ? 'ads' : 'blog',
    title: itemData.title,
    description: itemData.description || itemData.content,
    price: itemData.price || itemData.discount,
    discount: itemData.discount,
    location: itemData.location || itemData.region,
    date: itemData.date || itemData.eventDate,
    image: itemData.image || itemData.imageUrl,
    author: itemData.author || itemData.partner || itemData.organizer,
    readTime: itemData.readTime,
    photoCount: itemData.photoCount,
  };

  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isAuthor = Boolean(currentUser?.id && itemData.authorId && currentUser.id === itemData.authorId);
  const canManage = isAdminOrSuper || isAuthor;

  const handleDeletePost = async () => {
    if (!window.confirm(`Ali ste prepričani, da želite izbrisati objavo "${itemData.title}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      if (target.type === 'ad') {
        await deleteAdInFirestore(itemData.id);
      } else if (target.type === 'event') {
        await deleteEventInFirestore(itemData.id);
      } else {
        await deletePostInFirestore(itemData.id);
      }
      onBack();
    } catch (e) {
      console.error('Napaka pri brisanju objave:', e);
      alert('Prišlo je do napake pri brisanju.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isDealItem = target.type === 'deal' || 
                     itemData.type === 'deal' || 
                     itemData.category === 'deal' || 
                     itemData.category === 'ugodnosti' || 
                     itemData.category?.startsWith('deal') ||
                     itemData.categoryName === 'Ugodnosti' || 
                     itemData.categoryName === 'Ugodnosti & Popusti' || 
                     itemData.id?.startsWith('deal-') || 
                     itemData.id?.startsWith('hero-bento-');

  const resolvedCategory = target.type === 'ad' 
    ? (itemData.category || 'ad') 
    : target.type === 'event' 
      ? (itemData.category || 'event') 
      : isDealItem 
        ? (itemData.category && itemData.category !== 'blog' && itemData.category !== 'post' ? itemData.category : 'deal') 
        : (itemData.category || itemData.categoryId || 'blog');

  const resolvedType = target.type === 'ad' 
    ? 'ad' 
    : target.type === 'event' 
      ? 'event' 
      : isDealItem 
        ? 'deal' 
        : 'post';

  const editableItem: EditablePostItem = {
    id: itemData.id,
    title: itemData.title,
    content: itemData.description || itemData.content || '',
    category: resolvedCategory,
    categoryName: isDealItem ? (itemData.categoryName || 'Ugodnosti') : itemData.categoryName,
    type: resolvedType,
    status: (itemData.status || 'published') as any,
    imageUrl: itemData.image,
    price: itemData.price || itemData.discount,
    oldPrice: itemData.oldPrice,
    newPrice: itemData.newPrice,
    expirationDate: itemData.expirationDate,
    discount: itemData.discount,
    promoCode: itemData.code,
    dealLink: itemData.link,
    location: itemData.location || itemData.region,
    eventDate: itemData.eventDate || itemData.date,
    eventTime: itemData.eventTime,
    ticketUrl: itemData.ticketUrl,
    authorName: itemData.author || itemData.authorName || itemData.partner || itemData.organizer || 'Avtor',
    authorId: itemData.authorId,
    authorRole: itemData.partnerRole || itemData.authorRole,
    authorAvatar: itemData.partnerAvatar || itemData.authorAvatar,
  };

  const authorDisplayName = itemData.author || itemData.authorName || itemData.partner || itemData.organizer || 'Avtor';
  const authorAvatar = itemData.partnerAvatar || itemData.authorAvatar;
  const authorRole = itemData.partnerRole || itemData.authorRole;
  const authorId = itemData.authorId;

  const handleAuthorClick = () => {
    if (onAuthorClick) {
      onAuthorClick({
        id: authorId,
        name: authorDisplayName,
        avatar: authorAvatar,
        role: authorRole,
        fromPostTarget: target
      });
    } else {
      onViewChange('profile');
    }
  };

  return (
    <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
      {/* In-page Category Search Bar (hidden for single blog posts) */}
      {target.type !== 'blog' && target.type !== 'post' && (
        <div className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 border border-surface-container/60 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Iskanje v kategoriji {feedCategoryName}</span>
            </span>
            <button
              type="button"
              onClick={() => onViewChange(targetViewMode)}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Prikaži vse v kategoriji →
            </button>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteSearch(inPageSearchText);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center bg-surface-container-low rounded-xl border border-surface-container hover:border-primary/40 focus-within:border-primary focus-within:bg-surface-container-lowest transition-all">
              <Search className="w-4 h-4 text-outline ml-3 shrink-0" />
              <input
                type="text"
                value={inPageSearchText}
                onChange={(e) => setInPageSearchText(e.target.value)}
                placeholder={
                  target.type === 'ad' ? 'Išči med malimi oglasi (znamka, model, cena, kraj)...' :
                  target.type === 'deal' ? 'Išči med ugodnostmi in popusti...' :
                  target.type === 'event' ? 'Išči med dogodki, koncerti in prireditvami...' :
                  'Išči med blog članki, vodiči in zgodbami...'
                }
                className="w-full bg-transparent pl-2.5 pr-8 py-2.5 font-body-sm text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none"
              />
              {inPageSearchText && (
                <button
                  type="button"
                  onClick={() => setInPageSearchText('')}
                  className="absolute right-2.5 text-outline hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container-high"
                  aria-label="Počisti vnos"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-xs sm:text-sm hover:bg-primary-container transition-colors shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Išči</span>
            </button>
          </form>

          {/* Quick search keywords */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-[11px] text-outline shrink-0">Predlogi:</span>
            {quickKeywords.map((kw, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleExecuteSearch(kw)}
                className="px-2 py-0.5 rounded-md bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface-variant text-[11px] font-medium transition-colors cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Single Post Presentation Card */}
      <article className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container/60 shadow-sm flex flex-col">
        {/* Post Hero Photo / Carousel Banner */}
        {postImages.length > 0 && (
          <div className="relative flex flex-col bg-surface-container overflow-hidden">
            {/* Main Carousel Hero Image Box */}
            <div className="w-full h-72 sm:h-96 md:h-[420px] bg-black/90 relative overflow-hidden group select-none flex items-center justify-center">
              <img
                key={postImages[activeImageIndex] || activeImageIndex}
                src={postImages[activeImageIndex]}
                alt={`${itemData.title} – fotografija ${activeImageIndex + 1}`}
                onClick={() => setIsLightboxOpen(true)}
                onError={(e) => {
                  const fallback = getActiveFallbackImage(false);
                  if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                    (e.target as HTMLImageElement).src = fallback;
                  } else {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }
                }}
                className="w-full h-full object-cover cursor-zoom-in group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

              {/* Badges on Hero (Top Left) */}
              <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
                <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white font-label-caps text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-white/10">
                  {target.type === 'deal' && <Tag className="w-3.5 h-3.5 text-amber-400" />}
                  {target.type === 'event' && <Calendar className="w-3.5 h-3.5 text-sky-400" />}
                  {target.type === 'ad' && <Store className="w-3.5 h-3.5 text-emerald-400" />}
                  {(target.type === 'blog' || target.type === 'post') && <BookOpen className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{itemData.categoryName || feedCategoryName}</span>
                </span>

                {target.type === 'deal' && (itemData.discount || itemData.price) && (
                  <span className="px-3 py-1 rounded-lg bg-primary text-on-primary font-headline-sm text-sm font-black tracking-tight shadow-md">
                    {itemData.discount || itemData.price}
                  </span>
                )}

                {target.type === 'event' && itemData.price && (
                  <span className="px-3.5 py-1 rounded-lg bg-primary text-on-primary font-headline-sm text-sm font-extrabold shadow-md">
                    {itemData.price}
                  </span>
                )}

                {target.type === 'ad' && itemData.price && (
                  <span className="px-3.5 py-1 rounded-lg bg-emerald-600 text-white font-headline-sm text-sm font-extrabold shadow-md">
                    {itemData.price}
                  </span>
                )}

                {(target.type === 'blog' || target.type === 'post') && itemData.readTime && (
                  <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white font-label-md text-xs font-semibold shadow-sm flex items-center gap-1 border border-white/10">
                    <Clock className="w-3 h-3 text-amber-300" />
                    <span>{itemData.readTime}</span>
                  </span>
                )}
              </div>

              {/* Controls on Top Right: Event Date Block + Carousel Counter + Fullscreen Lightbox Button */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
                {target.type === 'event' && (
                  <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-2.5 text-center min-w-[58px] shadow-lg border border-black/10">
                    <div className="text-xs font-black text-primary uppercase font-label-caps tracking-wider">
                      {itemData.month || 'DOG'}
                    </div>
                    <div className="text-2xl font-black text-on-surface leading-none mt-1">
                      {itemData.day || '★'}
                    </div>
                  </div>
                )}

                {postImages.length > 1 && (
                  <span className="px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white font-label-caps text-xs font-bold shadow-md flex items-center gap-1.5 border border-white/15">
                    <Images className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeImageIndex + 1} / {postImages.length}</span>
                  </span>
                )}

                <button
                  type="button"
                  id="btn-post-carousel-expand"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="p-2 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md text-white shadow-md border border-white/15 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Celozaslonski ogled fotografije"
                  aria-label="Celozaslonski ogled fotografije"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Carousel Previous & Next Arrows (when multiple images) */}
              {postImages.length > 1 && (
                <>
                  <button
                    type="button"
                    id="btn-post-carousel-prev"
                    onClick={handlePrevImage}
                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md shadow-lg border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    aria-label="Prejšnja slika"
                    title="Prejšnja slika"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <button
                    type="button"
                    id="btn-post-carousel-next"
                    onClick={handleNextImage}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md shadow-lg border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    aria-label="Naslednja slika"
                    title="Naslednja slika"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </>
              )}

              {/* Carousel Indicator Dots */}
              {postImages.length > 1 && (
                <div className="absolute bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
                  {postImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => handleSelectImage(idx, e)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === activeImageIndex 
                          ? 'w-6 bg-primary shadow-xs' 
                          : 'w-2 bg-white/50 hover:bg-white/90'
                      }`}
                      aria-label={`Slika ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Bottom Title on Hero */}
              <div className="absolute bottom-4 left-4 right-4 text-white z-10 pointer-events-auto">
                <h1 className="font-headline-lg text-xl sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-md">
                  {itemData.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/85 mt-2 drop-shadow">
                  {/* Clickable author name in hero header */}
                  <button
                    type="button"
                    id="btn-post-detail-hero-author"
                    onClick={handleAuthorClick}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group/author py-0.5"
                    title={`Ogled profila avtorja: ${authorDisplayName}`}
                  >
                    <User className="w-3.5 h-3.5 text-primary group-hover/author:scale-110 transition-transform" />
                    <span className="font-semibold underline decoration-white/40 group-hover/author:decoration-primary underline-offset-2">{authorDisplayName}</span>
                  </button>
                  <span>•</span>
                  {(itemData.location || itemData.region) && (
                    <>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>{itemData.location || itemData.region}</span>
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{itemData.date || itemData.eventDate || 'Objavljeno danes'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Thumbnail strip underneath the hero when multiple images exist */}
            {postImages.length > 1 && (
              <div className="px-4 py-2.5 bg-surface-container-low border-b border-surface-container/70 flex items-center gap-2 overflow-x-auto scrollbar-thin">
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium shrink-0 mr-1.5">
                  <Images className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Galerija ({postImages.length}):</span>
                </div>
                <div className="flex items-center gap-2">
                  {postImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        idx === activeImageIndex
                          ? 'border-primary ring-2 ring-primary/30 shadow-sm scale-102'
                          : 'border-transparent opacity-65 hover:opacity-100 hover:border-surface-container-high'
                      }`}
                      title={`Prikaži sliko ${idx + 1}`}
                      aria-label={`Prikaži sliko ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${itemData.title} – miniatura ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {idx === activeImageIndex && (
                        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Kopiraj povezavo, Shrani, Deli (positioned below featured photo) */}
        <div className="px-4 py-3 sm:px-6 bg-surface-container-lowest border-b border-surface-container/60 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Kopiraj povezavo */}
            <button
              id="btn-post-copy-link"
              onClick={handleCopyLink}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2 cursor-pointer border border-surface-container/60 shadow-2xs"
              title="Kopiraj neposredno povezavo do te objave"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-secondary" />
                  <span className="text-secondary font-bold">Povezava kopirana!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-outline" />
                  <span>Kopiraj povezavo</span>
                </>
              )}
            </button>

            {/* Shrani */}
            <BookmarkButton
              id={itemData.id}
              data={bookmarkData}
              showLabel={true}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer border border-surface-container/60 shadow-2xs"
            />

            {/* Deli */}
            <ShareMenu
              id={itemData.id}
              type={target.type}
              title={itemData.title}
              description={itemData.description || itemData.content}
              showLabel={true}
              dropDirection="down"
              buttonClassName="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2 cursor-pointer border border-surface-container/60 shadow-2xs"
            />

            {/* Hitro deljenje na omrežjih */}
            <button
              type="button"
              id="btn-scroll-to-share"
              onClick={() => {
                const el = document.getElementById('social-share-widget');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-primary/25 shadow-2xs"
              title="Deli na Facebook, X, Viber, WhatsApp in e-pošto s predpripravljeno vsebino"
            >
              <Share2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Družbena omrežja</span>
            </button>

            {/* Prijavi */}
            <ReportButton
              targetId={itemData.id}
              targetType={target.type === 'ad' ? 'ad' : target.type === 'event' ? 'event' : target.type === 'deal' ? 'deal' : 'post'}
              targetTitle={itemData.title}
              targetAuthor={itemData.author}
              showLabel={true}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-surface-container-low hover:bg-surface-container hover:text-error text-xs sm:text-sm font-semibold text-outline transition-colors flex items-center gap-2 cursor-pointer border border-surface-container/60 shadow-2xs"
            />
          </div>

          {/* Admin & Author actions: Uredi in Izbriši */}
          {canManage && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-surface-container-high hover:bg-surface-container text-xs sm:text-sm font-semibold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer border border-surface-container/60 shadow-2xs"
                title="Uredi objavo"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" />
                <span>Uredi</span>
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="p-2 rounded-xl text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer border border-surface-container/60"
                title="Izbriši objavo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Post Content Body */}
        <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
          {/* Non-image fallback title */}
          {postImages.length === 0 && (
            <div className="border-b border-surface-container-low pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-label-caps text-xs font-bold uppercase">
                  {itemData.categoryName || feedCategoryName}
                </span>
                {itemData.price && (
                  <span className="px-2.5 py-0.5 rounded-md bg-secondary/10 text-secondary font-bold text-xs">
                    {itemData.price}
                  </span>
                )}
              </div>
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-black text-on-surface">
                {itemData.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-outline mt-2">
                <button
                  type="button"
                  id="btn-post-detail-fallback-author"
                  onClick={handleAuthorClick}
                  className="flex items-center gap-1 text-on-surface font-semibold hover:text-primary hover:underline transition-colors cursor-pointer"
                  title={`Ogled profila avtorja: ${authorDisplayName}`}
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>{authorDisplayName}</span>
                </button>
                <span>•</span>
                <span>{itemData.date || itemData.eventDate || 'Objavljeno danes'}</span>
              </div>
            </div>
          )}

          {/* Author / Seller / Partner Block */}
          <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {itemData.partnerAvatar || itemData.authorAvatar ? (
                <button
                  type="button"
                  id="btn-post-detail-author-avatar"
                  onClick={handleAuthorClick}
                  className="cursor-pointer group/avatar shrink-0 focus:outline-none"
                  title={`Ogled profila avtorja: ${authorDisplayName}`}
                >
                  <img
                    src={itemData.partnerAvatar || itemData.authorAvatar}
                    alt={authorDisplayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 group-hover/avatar:ring-primary shadow-xs transition-all"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-post-detail-author-initials"
                  onClick={handleAuthorClick}
                  className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-base shadow-xs hover:bg-primary/25 transition-colors cursor-pointer shrink-0 focus:outline-none"
                  title={`Ogled profila avtorja: ${authorDisplayName}`}
                >
                  {itemData.authorInitials || (authorDisplayName || 'U')[0]}
                </button>
              )}
              <div>
                <div className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-post-detail-author-name"
                    onClick={handleAuthorClick}
                    className="text-left font-bold text-on-surface hover:text-primary hover:underline transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none"
                    title={`Ogled profila avtorja: ${authorDisplayName}`}
                  >
                    <span>{authorDisplayName}</span>
                  </button>
                  <span title="Preverjen status" className="inline-flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-outline mt-0.5">
                  <span>{authorRole || itemData.partnerRole || 'Preverjen član skupnosti'}</span>
                  <span>•</span>
                  <span>Lokacija: {itemData.region || itemData.location || 'Slovenija'}</span>
                </div>
              </div>
            </div>

            {/* Quick Author / Partner Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-post-detail-view-author-profile"
                onClick={handleAuthorClick}
                className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer border border-surface-container"
                title={`Odpri javni profil avtorja: ${authorDisplayName}`}
              >
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Profil avtorja</span>
              </button>
              {target.type === 'ad' && (
                <button
                  onClick={() => setShowPhone(!showPhone)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>{showPhone ? '+386 41 982 431' : 'Prikaži telefon'}</span>
                </button>
              )}

              {target.type === 'deal' && (
                <button
                  onClick={handleVote}
                  disabled={hasVoted}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    hasVoted 
                      ? 'bg-secondary/15 text-secondary border border-secondary/30' 
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                  title="Glasuj za to ugodnost"
                >
                  <ThumbsUp className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
                  <span>{votes} {votes === 1 ? 'glas' : 'glasov'}</span>
                </button>
              )}

              {target.type === 'event' && (
                <>
                  {itemData.ticketUrl && (
                    <a
                      href={itemData.ticketUrl.startsWith('http') ? itemData.ticketUrl : `https://${itemData.ticketUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-label-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md"
                      title="Odpri zunanjo povezavo za nakup vstopnic"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Kupi vstopnice</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  )}
                  <button
                    onClick={handleRsvp}
                    className={`px-4 py-2 rounded-xl font-label-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                      isRsvpActive 
                        ? 'bg-secondary text-white' 
                        : 'bg-primary hover:bg-primary-container text-on-primary'
                    }`}
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>{isRsvpActive ? 'Prijavljen (Bom tam)' : 'Zanima me'}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
                      {rsvpCount}
                    </span>
                  </button>
                </>
              )}

              {(target.type === 'blog' || target.type === 'post') && (
                <button
                  onClick={handleLikeBlog}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    hasBlogLiked 
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  }`}
                  title="Všečkaj ta blog članek"
                >
                  <Heart className={`w-4 h-4 ${hasBlogLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{blogLikes} {blogLikes === 1 ? 'všeček' : 'všečkov'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Type-Specific Interactive Panel */}
          {(target.type === 'blog' || target.type === 'post') && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-outline uppercase font-semibold">Čas branja</div>
                  <div className="text-sm font-bold text-on-surface">{itemData.readTime || '5 min branja'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-outline uppercase font-semibold">Ogledov</div>
                  <div className="text-sm font-bold text-on-surface">{itemData.viewsCount || '1.450'}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-outline uppercase font-semibold">Všečkov</div>
                  <div className="text-sm font-bold text-on-surface">{blogLikes}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-outline uppercase font-semibold">Glavna tema</div>
                  <div className="text-sm font-bold text-on-surface truncate capitalize">{itemData.tags?.[0] || 'Zgodbe'}</div>
                </div>
              </div>
            </div>
          )}
          {target.type === 'deal' && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container-low to-secondary/10 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="font-label-caps text-xs text-primary uppercase font-extrabold tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ekskluzivna ponudba za člane Portalka
                </span>
                
                {/* Pricing row */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  {itemData.newPrice && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs uppercase font-bold text-outline">Akcija:</span>
                      <span className="font-headline-lg text-2xl sm:text-3xl font-black text-secondary">
                        {itemData.newPrice}
                      </span>
                    </div>
                  )}
                  {itemData.oldPrice && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-outline">Redna:</span>
                      <span className="text-sm line-through text-outline font-semibold">
                        {itemData.oldPrice}
                      </span>
                    </div>
                  )}
                  {itemData.discount && (
                    <span className="px-2.5 py-1 rounded-lg bg-secondary/15 text-secondary font-bold text-xs border border-secondary/25">
                      {itemData.discount}
                    </span>
                  )}
                </div>

                <p className="text-xs text-outline flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-error" />
                  <span>
                    {itemData.expirationDate 
                      ? `Veljavno do: ${itemData.expirationDate.includes('-') ? new Date(itemData.expirationDate).toLocaleDateString('sl-SI') : itemData.expirationDate}` 
                      : (itemData.date || 'Veljavno do preklica ali odprodaje zalog.')}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {itemData.code ? (
                  <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-xl border border-primary/30 shadow-xs">
                    <span className="text-xs text-outline uppercase font-bold">Koda:</span>
                    <span className="font-mono font-bold text-sm text-primary select-all px-2 py-0.5 rounded bg-primary/10">
                      {itemData.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(itemData.code)}
                      className="p-1.5 rounded-lg text-outline hover:text-primary transition-colors cursor-pointer"
                      title="Kopiraj kodo za popust"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copiedCode && <span className="text-xs font-bold text-secondary">Kopirano!</span>}
                  </div>
                ) : (
                  <span className="text-xs font-medium text-outline italic">Koda ni potrebna (neposredna akcija)</span>
                )}

                <a
                  href={itemData.link || 'https://www.google.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold inline-flex items-center gap-2 transition-all shadow-sm"
                >
                  <span>Uveljavi ugodnost</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {target.type === 'event' && (
            <div className="flex flex-col gap-3">
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${itemData.eventTime ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-outline uppercase font-semibold">Datum</div>
                    <div className="text-sm font-bold text-on-surface">{itemData.date || itemData.eventDate || 'Kmalu'}</div>
                  </div>
                </div>

                {itemData.eventTime && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-outline uppercase font-semibold">Čas dogodka (24h)</div>
                      <div className="text-sm font-bold text-on-surface">{itemData.eventTime}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-outline uppercase font-semibold">Lokacija</div>
                    <div className="text-sm font-bold text-on-surface truncate max-w-[160px]">{itemData.location || 'Ljubljana'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-tertiary-container/30 text-tertiary flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-outline uppercase font-semibold">Vstopnina / Cena</div>
                    <div className="text-sm font-bold text-primary">{itemData.price || 'Vstop prost'}</div>
                  </div>
                </div>
              </div>

              {itemData.ticketUrl && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">Vstopnice so na voljo na spletu</div>
                      <div className="text-[11px] text-on-surface-variant truncate max-w-sm">{itemData.ticketUrl}</div>
                    </div>
                  </div>
                  <a
                    href={itemData.ticketUrl.startsWith('http') ? itemData.ticketUrl : `https://${itemData.ticketUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-label-md text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>Nakup vstopnic</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {target.type === 'ad' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Nasvet za varen nakup:</strong>
                <p className="mt-0.5 text-on-surface-variant">
                  Pred nakupom priporočamo osebni ogled in preizkus artikla. Nikoli ne nakazujte celotnega zneska vnaprej neznanim osebam brez potrdila ali varnih plačilnih metod.
                </p>
              </div>
            </div>
          )}

          {/* Detailed Description */}
          <div className="flex flex-col gap-3">
            <h2 className="font-headline-md text-lg font-bold text-on-surface">
              Podrobnosti objave
            </h2>
            <div 
              className="font-body-lg text-sm md:text-base text-on-surface-variant leading-relaxed tiptap"
              dangerouslySetInnerHTML={{ __html: getCleanHtml(itemData.description || itemData.content || 'Ni dodatnega opisa za to objavo.') }}
            />
          </div>

          {/* Embedded Social Media or Video if present */}
          {itemData.embedCode && (
            <div className="flex flex-col gap-2.5 pt-4 border-t border-surface-container-low">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
                <span>Vdelana vsebina / Družbena omrežja</span>
              </h3>
              <div 
                className="tiptap rounded-xl overflow-hidden"
                dangerouslySetInnerHTML={{ __html: getCleanHtml(parseSocialEmbed(itemData.embedCode)?.embedHtml || itemData.embedCode) }}
              />
            </div>
          )}

          {/* Tags & Metadata */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-surface-container-low text-xs">
            <span className="text-outline font-semibold">Oznake:</span>
            <button
              type="button"
              onClick={() => handleTagClick(target.type)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface-variant font-medium transition-colors cursor-pointer"
              title={`Išči vsebine z oznako #${target.type}`}
            >
              #{target.type}
            </button>
            <button
              type="button"
              onClick={() => handleTagClick(itemData.categoryName || feedCategoryName)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface-variant font-medium transition-colors cursor-pointer"
              title={`Išči vsebine v kategoriji ${itemData.categoryName || feedCategoryName}`}
            >
              #{itemData.categoryName || feedCategoryName}
            </button>
            {(itemData.location || itemData.region) && (
              <button
                type="button"
                onClick={() => handleTagClick(itemData.location || itemData.region)}
                className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface-variant font-medium transition-colors cursor-pointer"
                title={`Išči objave v kraju ${itemData.location || itemData.region}`}
              >
                #{itemData.location || itemData.region}
              </button>
            )}
            {itemData.tags && Array.isArray(itemData.tags) && itemData.tags.map((tag: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary font-medium transition-colors cursor-pointer flex items-center gap-1"
                title={`Išči objave z oznako #${tag.replace(/^#/, '')}`}
              >
                <Search className="w-2.5 h-2.5 opacity-70" />
                <span>#{tag.replace(/^#/, '')}</span>
              </button>
            ))}
          </div>
        </div>
      </article>

      {/* Social Media Sharing Widget with pre-filled content */}
      <SocialShareWidget
        url={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : ''}
        title={itemData.title}
        description={itemData.description || itemData.content}
        type={target.type}
        category={itemData.categoryName || feedCategoryName}
        author={authorDisplayName}
        date={itemData.date || itemData.eventDate}
        price={itemData.price}
        location={itemData.location || itemData.region}
        discount={itemData.discount}
      />

      {/* Discussion & Comments Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 border border-surface-container/60 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface">
              Vprašanja in komentarji ({comments.length})
            </h3>
          </div>
          <span className="text-xs text-outline">Vsak nov komentar obvesti sodelujoče</span>
        </div>

        {/* Submit Comment Form */}
        <form onSubmit={handleSubmitComment} className="flex flex-col gap-2.5 bg-surface-container-low/50 p-3.5 rounded-xl border border-surface-container">
          <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span>Zapišite vprašanje ali mnenje o tej objavi</span>
          </label>
          <div className="relative">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Napišite komentar ali vprašajte avtorja..."
              rows={3}
              className="w-full p-3 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-primary focus:outline-none text-sm text-on-surface font-body-sm resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-outline">
              Prijavljeni kot: <strong>{currentUser ? currentUser.name : 'Gost'}</strong>
            </span>
            <button
              type="submit"
              disabled={isSubmittingComment || !newCommentText.trim()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Objavi komentar</span>
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="flex flex-col divide-y divide-surface-container-low">
          {comments.length === 0 ? (
            <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline">
                <MessageSquare className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-medium text-on-surface">Ni še komentarjev</p>
              <p className="text-xs text-outline max-w-sm">
                Bodite prvi, ki boste postavili vprašanje avtorju ali delili svoje mnenje.
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const canDelete = Boolean(currentUser && (
                currentUser.role === 'admin' || 
                currentUser.role === 'superadmin' || 
                currentUser.name === comment.author
              ));

              return (
                <div key={comment.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
                  <img
                    src={comment.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author)}`}
                    alt={comment.author}
                    className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-black/5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onAuthorClick) {
                              onAuthorClick({
                                name: comment.author,
                                avatar: comment.authorAvatar,
                                role: comment.authorRole,
                                fromPostTarget: target
                              });
                            } else {
                              onViewChange('profile');
                            }
                          }}
                          className="font-bold text-xs sm:text-sm text-on-surface hover:text-primary hover:underline text-left cursor-pointer transition-colors"
                          title={`Ogled profila avtorja: ${comment.author}`}
                        >
                          {comment.author}
                        </button>
                        {comment.authorRole && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-outline font-semibold">
                            {comment.authorRole}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-outline">{comment.date}</span>
                        <ReportButton
                          targetId={comment.id}
                          targetType="comment"
                          targetTitle={`Komentar (${comment.author}): "${comment.content.substring(0, 40)}..."`}
                          targetAuthor={comment.author}
                          size="sm"
                          className="p-1 rounded text-outline hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                        />
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            title="Izbriši komentar"
                            className="p-1 rounded text-outline hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Suggested & Related Posts */}
      {(target.type === 'blog' || target.type === 'post') ? (
        /* Dedicated Related Articles Section for Blog Posts (suggests 3 other posts from the same category) */
        <section 
          id="related-articles-section"
          className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 border border-surface-container/60 shadow-sm flex flex-col gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-low pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface flex flex-wrap items-center gap-2">
                  <span>Sorodni članki</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {itemData.categoryName || resolveBlogCategory(itemData).name}
                  </span>
                </h3>
                <p className="text-xs text-on-surface-variant">
                  3 priporočeni članki iz iste kategorije za nadaljnje branje
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const catName = itemData.categoryName || resolveBlogCategory(itemData).name;
                onSearchChange?.(buildSearchQuery('blog', catName));
                onViewChange('blog');
                scrollToPageTop();
              }}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              title={`Prikaži vse članke v kategoriji ${itemData.categoryName || resolveBlogCategory(itemData).name}`}
            >
              <span>Vsi članki v kategoriji</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {relatedArticles.map((article, idx) => (
              <div
                key={`rel-art-${article.id}-${idx}`}
                id={`related-article-${article.id}`}
                onClick={() => {
                  scrollToPageTop();
                  onNavigatePost({ type: 'blog', id: article.id });
                }}
                className="group flex flex-col bg-surface-container-low/50 hover:bg-surface-container-low rounded-2xl border border-surface-container/70 hover:border-primary/40 transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md cursor-pointer"
              >
                {/* Thumbnail container */}
                <div className="relative aspect-16/10 w-full overflow-hidden bg-surface-container">
                  {article.image ? (
                    <img 
                      src={article.image} 
                      alt={article.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-outline">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}
                  
                  {/* Category Pill */}
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-surface-container-lowest/90 backdrop-blur-xs text-[11px] font-bold text-primary shadow-2xs border border-surface-container/40">
                    {article.categoryName}
                  </span>

                  {/* Read Time Pill */}
                  {article.readTime && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{article.readTime}</span>
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col gap-2">
                  <h4 className="font-bold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                    {article.title}
                  </h4>
                  {article.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  )}

                  <div className="mt-auto pt-2 border-t border-surface-container/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-on-surface-variant truncate max-w-[60%]">
                      {article.authorAvatar ? (
                        <img 
                          src={article.authorAvatar} 
                          alt={article.author || 'Avtor'} 
                          className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-black/5" 
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-outline shrink-0" />
                      )}
                      <span className="truncate text-[11px] font-medium">{article.author || 'Portalko avtor'}</span>
                    </div>
                    <span className="font-bold text-primary text-xs flex items-center gap-1 group-hover:underline">
                      <span>Preberi</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* Related section for Deals, Events, and Ads */
        <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 border border-surface-container/60 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-base font-bold text-on-surface">
              {target.type === 'deal'
                ? 'Podobne ugodnosti & ponudbe'
                : target.type === 'event'
                ? `Podobni dogodki v kategoriji ${itemData.categoryName || feedCategoryName}`
                : `Podobni oglasi v kategoriji ${itemData.categoryName || feedCategoryName}`}
            </h3>
            <button
              onClick={() => onViewChange(target.type === 'deal' ? 'deals' : target.type === 'event' ? 'events' : 'ads')}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Poglej vse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {target.type === 'deal' && relatedDeals.map((deal, idx) => (
              <div
                key={`rel-deal-${deal.id}-${idx}`}
                onClick={() => {
                  scrollToPageTop();
                  onNavigatePost({ type: 'deal', id: deal.id });
                }}
                className="p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low border border-surface-container hover:border-primary/40 transition-all cursor-pointer flex flex-col gap-2 group"
              >
                {deal.image && (
                  <div className="h-28 w-full rounded-lg overflow-hidden bg-surface-container relative">
                    <img src={deal.image} alt={deal.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-primary text-on-primary text-[10px] font-bold">
                      {deal.discount}
                    </span>
                  </div>
                )}
                <h4 className="font-bold text-xs text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                  {deal.title}
                </h4>
                <div className="mt-auto flex items-center justify-between text-[11px] text-outline">
                  <span>{deal.partner}</span>
                  <span className="font-bold text-primary">Odpri objavo →</span>
                </div>
              </div>
            ))}

            {target.type === 'event' && relatedEvents.map((evt, idx) => (
              <div
                key={`rel-evt-${evt.id}-${idx}`}
                onClick={() => {
                  scrollToPageTop();
                  onNavigatePost({ type: 'event', id: evt.id });
                }}
                className="p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low border border-surface-container hover:border-primary/40 transition-all cursor-pointer flex flex-col gap-2 group"
              >
                {evt.image && (
                  <div className="h-28 w-full rounded-lg overflow-hidden bg-surface-container relative">
                    <img src={evt.image} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold">
                      {evt.month} {evt.day}
                    </span>
                  </div>
                )}
                <h4 className="font-bold text-xs text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                  {evt.title}
                </h4>
                <div className="mt-auto flex items-center justify-between text-[11px] text-outline">
                  <span>{evt.city || evt.location}</span>
                  <span className="font-bold text-primary">Odpri objavo →</span>
                </div>
              </div>
            ))}

            {target.type === 'ad' && relatedAds.map((ad, idx) => (
              <div
                key={`rel-ad-${ad.id}-${idx}`}
                onClick={() => {
                  scrollToPageTop();
                  onNavigatePost({ type: 'ad', id: ad.id });
                }}
                className="p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low border border-surface-container hover:border-primary/40 transition-all cursor-pointer flex flex-col gap-2 group"
              >
                {ad.image && (
                  <div className="h-28 w-full rounded-lg overflow-hidden bg-surface-container relative">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                      {ad.price}
                    </span>
                  </div>
                )}
                <h4 className="font-bold text-xs text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                  {ad.title}
                </h4>
                <div className="mt-auto flex items-center justify-between text-[11px] text-outline">
                  <span>{ad.location}</span>
                  <span className="font-bold text-primary">Odpri oglas →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen Photo Gallery Lightbox */}
      {isLightboxOpen && postImages.length > 0 && (
        <div 
          id="post-carousel-lightbox"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header Bar */}
          <div 
            className="w-full max-w-6xl mx-auto flex items-center justify-between text-white z-10 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 truncate max-w-[80%]">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-xs font-bold font-label-caps border border-white/15 shadow-xs">
                {activeImageIndex + 1} / {postImages.length}
              </span>
              <h3 className="text-sm sm:text-base font-semibold truncate text-white/90">
                {itemData.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-post-lightbox-close"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/15"
                title="Zapri galerijo (Esc)"
                aria-label="Zapri galerijo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Image Display & Navigation Arrows */}
          <div 
            className="relative w-full max-w-6xl mx-auto flex-1 flex items-center justify-center my-2 sm:my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {postImages.length > 1 && (
              <button
                type="button"
                id="btn-post-lightbox-prev"
                onClick={handlePrevImage}
                className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Prejšnja fotografija"
                title="Prejšnja fotografija (Puščica levo)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={postImages[activeImageIndex]}
              alt={`${itemData.title} – fotografija ${activeImageIndex + 1}`}
              className="max-h-[72vh] sm:max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {postImages.length > 1 && (
              <button
                type="button"
                id="btn-post-lightbox-next"
                onClick={handleNextImage}
                className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Naslednja fotografija"
                title="Naslednja fotografija (Puščica desno)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Thumbnail Filmstrip */}
          {postImages.length > 1 && (
            <div 
              className="w-full max-w-4xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              {postImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-10 sm:w-18 sm:h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    idx === activeImageIndex 
                      ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-md' 
                      : 'border-white/20 opacity-50 hover:opacity-90'
                  }`}
                  aria-label={`Prikaži sliko ${idx + 1}`}
                >
                  <img 
                    src={imgUrl} 
                    alt={`Miniatura ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin / Author Edit Modal */}
      {isEditModalOpen && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          item={editableItem}
          onSaved={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
