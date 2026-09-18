import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Share2, Copy, Check, ExternalLink, Calendar, MapPin, 
  ThumbsUp, Tag, ShieldCheck, User, Clock, MessageSquare, 
  Phone, Send, Heart, AlertTriangle, Sparkles, CheckCircle2, 
  CalendarPlus, Bookmark, Eye, ChevronRight, Store, ArrowRight
} from 'lucide-react';
import { PostDetailTarget, ViewMode } from '../types';
import { BookmarkButton } from './BookmarkButton';
import { ShareMenu } from './ShareMenu';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { INITIAL_DEALS, HERO_BENTO_DEALS, DealItem } from '../data/mockDealsData';
import { INITIAL_EVENTS, INITIAL_ADS, INITIAL_BLOG_POSTS, MockEventItem, MockAdItem, MockBlogItem } from '../data/mockFeedData';
import { subscribeToPosts, subscribeToEvents, subscribeToAds, FirestorePost, FirestoreEvent, FirestoreAd } from '../services/firestoreService';
import { BookOpen } from 'lucide-react';
import { scrollToPageTop } from '../utils/scrollUtils';

interface PostDetailPageProps {
  target: PostDetailTarget;
  onBack: () => void;
  onNavigatePost: (target: PostDetailTarget) => void;
  onViewChange: (view: ViewMode) => void;
}

interface PostComment {
  id: string;
  author: string;
  authorAvatar?: string;
  authorRole?: string;
  date: string;
  content: string;
}

export function PostDetailPage({ target, onBack, onNavigatePost, onViewChange }: PostDetailPageProps) {
  const { currentUser } = useAuth();
  const { addNotification } = useNotifications();

  // Live Firestore subscriptions
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);

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

  // Comments state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

  // Resolve item data
  const itemData = useMemo(() => {
    const { type, id, initialData } = target;

    if (initialData) return initialData;

    if (type === 'deal') {
      // Look in Firestore
      const fs = firestorePosts.find(p => p.id === id);
      if (fs) {
        return {
          id: fs.id,
          type: 'deal',
          title: fs.title,
          description: fs.content,
          discount: fs.price || 'Ugodnost',
          partner: fs.authorName,
          partnerRole: fs.authorRole,
          partnerAvatar: fs.authorAvatar,
          date: fs.createdAt ? new Date(fs.createdAt).toLocaleDateString('sl-SI') : 'Danes',
          image: fs.imageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&auto=format&fit=crop&q=80',
          categoryName: 'Ugodnosti & Popusti',
          region: 'Vsa Slovenija',
          votes: fs.likesCount || 12,
          link: 'https://www.portalko.net',
        };
      }
      // Look in Mock Deals
      const allDeals = [...INITIAL_DEALS, ...HERO_BENTO_DEALS];
      const d = allDeals.find(x => x.id === id) || allDeals[0];
      return {
        ...d,
        type: 'deal',
      };
    }

    if (type === 'event') {
      const fs = firestoreEvents.find(e => e.id === id);
      if (fs) {
        return {
          id: fs.id,
          type: 'event',
          title: fs.title,
          description: fs.description,
          location: fs.location,
          date: fs.eventDate,
          month: 'DOG',
          day: '★',
          price: 'Vstop prost',
          organizer: fs.authorName,
          categoryName: fs.category || 'Dogodek v živo',
          image: fs.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1000&auto=format&fit=crop&q=80',
          interestedCount: 42,
        };
      }
      const e = INITIAL_EVENTS.find(x => x.id === id) || INITIAL_EVENTS[0];
      return {
        ...e,
        type: 'event',
      };
    }

    if (type === 'ad') {
      const fs = firestoreAds.find(a => a.id === id);
      if (fs) {
        return {
          id: fs.id,
          type: 'ad',
          title: fs.title,
          description: fs.description,
          price: fs.price,
          location: fs.location,
          date: fs.createdAt ? new Date(fs.createdAt).toLocaleDateString('sl-SI') : 'Danes',
          author: fs.authorName,
          categoryName: fs.category || 'Mali oglas',
          image: fs.imageUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1000&auto=format&fit=crop&q=80',
          authorInitials: fs.authorName.slice(0, 2).toUpperCase(),
        };
      }
      const a = INITIAL_ADS.find(x => x.id === id) || INITIAL_ADS[0];
      return {
        ...a,
        type: 'ad',
      };
    }

    if (type === 'blog' || type === 'post') {
      const fs = firestorePosts.find(p => p.id === id);
      if (fs) {
        return {
          id: fs.id,
          type: 'blog',
          title: fs.title,
          description: fs.content,
          content: fs.content,
          author: fs.authorName,
          authorRole: fs.authorRole || 'Član skupnosti',
          authorAvatar: fs.authorAvatar,
          date: fs.createdAt ? new Date(fs.createdAt).toLocaleDateString('sl-SI') : 'Ravno objavljeno',
          image: fs.imageUrl,
          categoryName: fs.category && fs.category !== 'blog' && fs.category !== 'post' ? fs.category : 'Blog & Članki',
          location: fs.location || 'Slovenija',
          readTime: '4 min branja',
          photoCount: fs.imageUrl ? '1 fotografija' : undefined,
          likesCount: fs.likesCount || 0,
          commentsCount: fs.commentsCount || 0,
          viewsCount: '1.240',
          tags: ['blog', 'portal', 'slovenija', fs.category || 'zgodbe'],
        };
      }

      // Look in Mock Blog Posts
      const baseId = id.replace(/-p\d+$/, '');
      const b = INITIAL_BLOG_POSTS.find(x => x.id === id || x.id === baseId) || INITIAL_BLOG_POSTS[0];
      return {
        ...b,
        type: 'blog',
        categoryName: 'Blog & Članki',
      };
    }

    return null;
  }, [target, firestorePosts, firestoreEvents, firestoreAds]);

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

    // Initial mock comments per post
    setComments([
      {
        id: 'c1',
        author: 'Matej B.',
        authorRole: 'Preverjen uporabnik',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        date: 'včeraj ob 16:40',
        content: target.type === 'deal' 
          ? 'Koda preverjeno deluje v spletni trgovini, ravnokar naročil z brezplačno dostavo!' 
          : target.type === 'event'
          ? 'A je na lokaciji na voljo brezplačno parkirišče ali priporočate javni prevoz?'
          : target.type === 'ad'
          ? 'Ali je cena zadnja ali je možen še manjši popust ob hitrem osebnem prevzemu?'
          : 'Hvala za tako podroben in poučen zapis, zelo koristni nasveti iz prve roke!',
      },
      {
        id: 'c2',
        author: 'Ana Novak',
        authorRole: 'Registrirana',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        date: 'danes ob 09:15',
        content: target.type === 'deal'
          ? 'Hvala za delitev te ugodnosti, res odličen prihranek za začetek sezone!'
          : target.type === 'event'
          ? 'Se vidimo tam! Vstopnice so že rezervirane.'
          : target.type === 'ad'
          ? 'Zelo lep ohranjen kos, priporočam prodajalca!'
          : 'Zanimiva perspektiva, zagotovo preizkusim te predloge ob prvi priliki.',
      }
    ]);

    // Update URL hash to support direct link / deep linking
    const expectedHash = `#${target.type}-${target.id}`;
    if (window.location.hash !== expectedHash) {
      window.history.replaceState(null, '', expectedHash);
    }
    scrollToPageTop();
  }, [itemData, target]);

  // Handle post upvote
  const handleVote = () => {
    if (!hasVoted) {
      setVotes(v => v + 1);
      setHasVoted(true);
      addNotification({
        type: 'interaction',
        title: 'Glas zabeležen!',
        description: `Vaš glas za ugodnost "${itemData?.title}" je bil uspešno oddan.`,
        target: { type: 'deal', id: target.id },
      });
    }
  };

  // Handle RSVP
  const handleRsvp = () => {
    const nextState = !isRsvpActive;
    setIsRsvpActive(nextState);
    setRsvpCount(c => nextState ? c + 1 : c - 1);
    if (nextState) {
      addNotification({
        type: 'event',
        title: 'Prijava na dogodek!',
        description: `Zabeležili ste interes za dogodek "${itemData?.title}". Opomnik bo poslan dan pred dogodkom.`,
        target: { type: 'event', id: target.id },
      });
    }
  };

  // Handle blog like
  const handleLikeBlog = () => {
    if (!hasBlogLiked) {
      setBlogLikes(l => l + 1);
      setHasBlogLiked(true);
      addNotification({
        type: 'interaction',
        title: 'Všečkan članek!',
        description: `Všečkali ste blog članek "${itemData?.title}".`,
        target: { type: 'blog', id: target.id },
      });
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

    setComments(prev => [...prev, newComment]);
    setNewCommentText('');
    setIsSubmittingComment(false);

    // Trigger real notification in Header NotificationCenter!
    addNotification({
      type: 'comment',
      title: `Nov komentar na "${itemData?.title?.slice(0, 30)}..."`,
      description: `${authorName}: "${newComment.content.slice(0, 60)}${newComment.content.length > 60 ? '...' : ''}"`,
      authorName,
      authorAvatar,
      target: {
        type: target.type,
        id: target.id,
      },
    });
  };

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

  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md animate-in fade-in duration-200">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 border border-surface-container/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-outline overflow-hidden">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>{backLabel}</span>
          </button>
          <span className="hidden sm:inline opacity-40">/</span>
          <span className="hidden sm:inline font-medium text-on-surface-variant shrink-0">{feedCategoryName}</span>
          <span className="hidden md:inline opacity-40">/</span>
          <span className="hidden md:inline text-on-surface font-semibold truncate max-w-[200px] xl:max-w-xs">{itemData.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Direct Permalink */}
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Kopiraj neposredno povezavo do te strani objave"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-secondary" />
                <span className="text-secondary font-bold">Povezava kopirana!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-outline" />
                <span className="hidden sm:inline">Kopiraj povezavo</span>
              </>
            )}
          </button>

          <BookmarkButton id={itemData.id} data={bookmarkData} />
          <ShareMenu id={itemData.id} title={itemData.title} />
        </div>
      </div>

      {/* Main Single Post Presentation Card */}
      <article className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container/60 shadow-sm flex flex-col">
        {/* Post Hero Photo / Banner */}
        {itemData.image && (
          <div className="w-full h-64 sm:h-80 md:h-96 bg-surface-container relative overflow-hidden group">
            <img
              src={itemData.image}
              alt={itemData.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

            {/* Badges on Hero */}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white font-label-caps text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
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

              {target.type === 'ad' && itemData.price && (
                <span className="px-3.5 py-1 rounded-lg bg-emerald-600 text-white font-headline-sm text-sm font-extrabold shadow-md">
                  {itemData.price}
                </span>
              )}

              {(target.type === 'blog' || target.type === 'post') && itemData.readTime && (
                <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white font-label-md text-xs font-semibold shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{itemData.readTime}</span>
                </span>
              )}
            </div>

            {/* Event Date Block on Image */}
            {target.type === 'event' && (
              <div className="absolute top-4 right-4 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-2.5 text-center min-w-[58px] shadow-lg border border-black/10">
                <div className="text-xs font-black text-primary uppercase font-label-caps tracking-wider">
                  {itemData.month || 'DOG'}
                </div>
                <div className="text-2xl font-black text-on-surface leading-none mt-1">
                  {itemData.day || '★'}
                </div>
              </div>
            )}

            {/* Bottom Title on Hero */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="font-headline-lg text-xl sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-md">
                {itemData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-white/85 mt-2 drop-shadow">
                {(itemData.location || itemData.region) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{itemData.location || itemData.region}</span>
                  </span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{itemData.date || itemData.eventDate || 'Objavljeno danes'}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Post Content Body */}
        <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
          {/* Non-image fallback title */}
          {!itemData.image && (
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
            </div>
          )}

          {/* Author / Seller / Partner Block */}
          <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {itemData.partnerAvatar || itemData.authorAvatar ? (
                <img
                  src={itemData.partnerAvatar || itemData.authorAvatar}
                  alt={itemData.partner || itemData.author || 'Avtor'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-base shadow-xs">
                  {itemData.authorInitials || (itemData.author || itemData.partner || 'U')[0]}
                </div>
              )}
              <div>
                <div className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-1.5">
                  <span>{itemData.partner || itemData.author || itemData.organizer || 'Preverjen uporabnik'}</span>
                  <span title="Preverjen status" className="inline-flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-outline mt-0.5">
                  <span>{itemData.partnerRole || 'Preverjen član skupnosti'}</span>
                  <span>•</span>
                  <span>Lokacija: {itemData.region || itemData.location || 'Slovenija'}</span>
                </div>
              </div>
            </div>

            {/* Quick Author / Partner Action */}
            <div className="flex items-center gap-2">
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
              <div className="flex flex-col gap-1">
                <span className="font-label-caps text-xs text-primary uppercase font-extrabold tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ekskluzivna ponudba za člane Portalka
                </span>
                <div className="font-headline-md text-xl font-bold text-on-surface">
                  Popust: <span className="text-primary font-black">{itemData.discount || '-30%'}</span>
                </div>
                <p className="text-xs text-outline">
                  {itemData.date || 'Veljavno do preklica ali odprodaje zalog.'}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-outline uppercase font-semibold">Datum in ura</div>
                  <div className="text-sm font-bold text-on-surface">{itemData.date || 'Četrtek ob 19:00'}</div>
                </div>
              </div>

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
                  <div className="text-[11px] text-outline uppercase font-semibold">Vstopnina</div>
                  <div className="text-sm font-bold text-on-surface">{itemData.price || 'Vstop prost'}</div>
                </div>
              </div>
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
            <div className="font-body-lg text-sm md:text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
              {itemData.description || 'Ni dodatnega opisa za to objavo.'}
            </div>
          </div>

          {/* Tags & Metadata */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-surface-container-low text-xs">
            <span className="text-outline font-semibold">Oznake:</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-medium">
              #{target.type}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-medium">
              #{itemData.categoryName || feedCategoryName}
            </span>
            {(itemData.location || itemData.region) && (
              <span className="px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant font-medium">
                #{itemData.location || itemData.region}
              </span>
            )}
            {itemData.tags && Array.isArray(itemData.tags) && itemData.tags.map((tag: string, idx: number) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        </div>
      </article>

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
          {comments.map((comment) => (
            <div key={comment.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
              <img
                src={comment.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author)}`}
                alt={comment.author}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-black/5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-on-surface">{comment.author}</span>
                    {comment.authorRole && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-outline font-semibold">
                        {comment.authorRole}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-outline">{comment.date}</span>
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Suggested & Related Posts */}
      <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 border border-surface-container/60 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-base font-bold text-on-surface">
            Podobne objave v kategoriji {itemData.categoryName || feedCategoryName}
          </h3>
          <button
            onClick={() => onViewChange(target.type === 'deal' ? 'deals' : target.type === 'event' ? 'events' : target.type === 'ad' ? 'ads' : 'blog')}
            className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Poglej vse</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {target.type === 'deal' && INITIAL_DEALS.slice(1, 4).map((deal) => (
            <div
              key={deal.id}
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

          {target.type === 'event' && INITIAL_EVENTS.slice(1, 4).map((evt) => (
            <div
              key={evt.id}
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

          {target.type === 'ad' && INITIAL_ADS.slice(1, 4).map((ad) => (
            <div
              key={ad.id}
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

          {(target.type === 'blog' || target.type === 'post') && INITIAL_BLOG_POSTS.slice(1, 4).map((blog) => (
            <div
              key={blog.id}
              onClick={() => {
                scrollToPageTop();
                onNavigatePost({ type: 'blog', id: blog.id });
              }}
              className="p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low border border-surface-container hover:border-primary/40 transition-all cursor-pointer flex flex-col gap-2 group"
            >
              {blog.image && (
                <div className="h-28 w-full rounded-lg overflow-hidden bg-surface-container relative">
                  <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold">
                    {blog.readTime}
                  </span>
                </div>
              )}
              <h4 className="font-bold text-xs text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                {blog.title}
              </h4>
              <div className="mt-auto flex items-center justify-between text-[11px] text-outline">
                <span>{blog.author}</span>
                <span className="font-bold text-primary">Preberi članek →</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
