import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Crown, Shield, UserCheck, CheckCircle2, 
  MapPin, Calendar, Tag, Store, BookOpen, Share2, 
  Clock, ExternalLink, Sparkles, MessageSquare, AlertCircle
} from 'lucide-react';
import { AuthorProfileTarget, PostDetailTarget, ViewMode } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { SocialLinksDisplay } from './SocialLinksDisplay';
import { ShareMenu } from '../ShareMenu';
import { ReportButton } from '../ReportButton';
import { 
  subscribeToPosts, 
  subscribeToAds, 
  subscribeToEvents, 
  FirestorePost, 
  FirestoreAd, 
  FirestoreEvent 
} from '../../services/firestoreService';
import { INITIAL_BLOG_POSTS, INITIAL_ADS, INITIAL_EVENTS } from '../../data/mockFeedData';
import { INITIAL_DEALS, HERO_BENTO_DEALS } from '../../data/mockDealsData';
import { updatePageSeo } from '../../utils/seoUtils';

export interface PublicAuthorProfileProps {
  targetAuthor: AuthorProfileTarget;
  onBack: () => void;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onViewChange: (view: ViewMode) => void;
}

export interface AuthorItemCardData {
  id: string;
  type: 'post' | 'ad' | 'event' | 'deal';
  title: string;
  description: string;
  category?: string;
  imageUrl?: string;
  price?: string;
  location?: string;
  date?: string;
  readTime?: string;
}

export function PublicAuthorProfile({ targetAuthor, onBack, onNavigatePost, onViewChange }: PublicAuthorProfileProps) {
  const { users } = useAuth();
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'post' | 'ad' | 'event' | 'deal'>('all');

  // Real-time Firestore items
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);

  useEffect(() => {
    const unsubP = subscribeToPosts(setFirestorePosts);
    const unsubA = subscribeToAds(setFirestoreAds);
    const unsubE = subscribeToEvents(setFirestoreEvents);
    return () => {
      unsubP();
      unsubA();
      unsubE();
    };
  }, []);

  // Match with known user record if available
  const matchedUser = useMemo(() => {
    if (!targetAuthor) return null;
    const authorNameLower = (targetAuthor.name || '').trim().toLowerCase();
    return users.find(u => 
      (targetAuthor.id && u.id === targetAuthor.id) ||
      (u.name && u.name.trim().toLowerCase() === authorNameLower) ||
      (u.username && authorNameLower.includes(u.username.replace('@', '').toLowerCase()))
    ) || null;
  }, [users, targetAuthor]);

  // Consolidated author profile details
  const authorProfile = useMemo(() => {
    const name = matchedUser?.name || targetAuthor.name || 'Avtor';
    const avatar = matchedUser?.avatar || targetAuthor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C3AED&color=fff`;
    const role = matchedUser?.role || (
      targetAuthor.role?.toLowerCase().includes('superadmin') ? 'superadmin' :
      targetAuthor.role?.toLowerCase().includes('admin') ? 'admin' :
      targetAuthor.role?.toLowerCase().includes('preverjen') ? 'verified' : 'registered'
    );
    const roleTitle = targetAuthor.role || (
      role === 'superadmin' ? 'Superadmin Portalko' :
      role === 'admin' ? 'Administrator' :
      role === 'verified' ? 'Preverjen uporabnik' : 'Član skupnosti'
    );
    const username = matchedUser?.username || `@${name.toLowerCase().replace(/\s+/g, '_')}`;
    const bio = matchedUser?.bio || targetAuthor.bio || 'Aktiven član in soustvarjalec vsebin na platformi Portalko.net.';
    const socialLinks = matchedUser?.socialLinks || [];

    return {
      name,
      avatar,
      role,
      roleTitle,
      username,
      bio,
      socialLinks,
    };
  }, [matchedUser, targetAuthor]);

  // Update dynamic SEO & Person Schema.org for author profile
  useEffect(() => {
    if (!authorProfile.name) return;
    const authorUrl = `${window.location.origin}/#author-${encodeURIComponent(authorProfile.name.replace(/\s+/g, '_'))}`;
    updatePageSeo({
      title: `${authorProfile.name} – Profil avtorja | Portalko.net`,
      description: `Oglejte si profil avtorja ${authorProfile.name} (${authorProfile.username}), objavljene članke, male oglase, dogodke in ugodnosti na slovenskem portalu Portalko.net.`,
      canonicalUrl: authorUrl,
      image: authorProfile.avatar,
      type: 'profile',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: `${authorProfile.name} – Profil avtorja`,
        url: authorUrl,
        mainEntity: {
          '@type': 'Person',
          name: authorProfile.name,
          alternateName: authorProfile.username,
          description: authorProfile.bio,
          image: authorProfile.avatar,
          jobTitle: authorProfile.roleTitle,
        },
      },
    });
  }, [authorProfile]);

  // Aggregate author's items
  const authorItems = useMemo<AuthorItemCardData[]>(() => {
    const targetNameLower = (targetAuthor.name || '').trim().toLowerCase();
    const targetId = targetAuthor.id;
    const isTargetAdmin = targetAuthor.role === 'superadmin' || 
                          targetAuthor.role === 'admin' || 
                          targetNameLower === 'superadmin' || 
                          targetNameLower === 'zoran krstin' || 
                          targetId === 'admin' || 
                          targetId === 'AABsRoeGCgaddFMh9S2cZqN9CaG3';
    const itemsMap = new Map<string, AuthorItemCardData>();

    // 1. Firestore Posts / Deals
    firestorePosts.forEach(p => {
      const isMockOrSystemDeal = p.id.startsWith('deal-') || p.id.startsWith('hero-bento-');
      const isPartnerAuthor = p.authorId?.startsWith('partner-') || p.authorId?.startsWith('author-');
      if (isTargetAdmin && (isMockOrSystemDeal || isPartnerAuthor || (p.authorName && p.authorName.trim().toLowerCase() !== targetNameLower && p.authorName !== 'Superadmin'))) {
        return;
      }

      const matchId = Boolean(targetId && p.authorId === targetId);
      const matchName = Boolean(p.authorName && p.authorName.trim().toLowerCase() === targetNameLower);
      if (matchId || matchName) {
        const itemType = p.category === 'deal' ? 'deal' : 'post';
        itemsMap.set(`${itemType}-${p.id}`, {
          id: p.id,
          type: itemType,
          title: p.title,
          description: p.content,
          category: p.category,
          imageUrl: p.imageUrl,
          price: p.price,
          location: p.location,
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('sl-SI') : undefined,
        });
      }
    });

    // 2. Firestore Ads
    firestoreAds.forEach(a => {
      const isMockAd = a.id.startsWith('ad-');
      const isAuthorAd = a.authorId?.startsWith('author-');
      if (isTargetAdmin && (isMockAd || isAuthorAd || (a.authorName && a.authorName.trim().toLowerCase() !== targetNameLower && a.authorName !== 'Superadmin'))) {
        return;
      }

      const matchId = Boolean(targetId && a.authorId === targetId);
      const matchName = Boolean(a.authorName && a.authorName.trim().toLowerCase() === targetNameLower);
      if (matchId || matchName) {
        itemsMap.set(`ad-${a.id}`, {
          id: a.id,
          type: 'ad',
          title: a.title,
          description: a.description,
          category: a.category,
          imageUrl: a.imageUrl,
          price: a.price,
          location: a.location,
          date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('sl-SI') : undefined,
        });
      }
    });

    // 3. Firestore Events
    firestoreEvents.forEach(e => {
      const isMockEvent = e.id.startsWith('event-');
      const isOrganizerEvent = e.authorId?.startsWith('organizer-');
      if (isTargetAdmin && (isMockEvent || isOrganizerEvent || (e.authorName && e.authorName.trim().toLowerCase() !== targetNameLower && e.authorName !== 'Superadmin'))) {
        return;
      }

      const matchId = Boolean(targetId && e.authorId === targetId);
      const matchName = Boolean(e.authorName && e.authorName.trim().toLowerCase() === targetNameLower);
      if (matchId || matchName) {
        itemsMap.set(`event-${e.id}`, {
          id: e.id,
          type: 'event',
          title: e.title,
          description: e.description,
          category: e.category,
          imageUrl: e.imageUrl,
          price: e.price,
          location: e.location,
          date: e.eventDate || (e.createdAt ? new Date(e.createdAt).toLocaleDateString('sl-SI') : undefined),
        });
      }
    });

    // 4. Mock Blogs
    INITIAL_BLOG_POSTS.forEach(b => {
      if (b.author && b.author.trim().toLowerCase() === targetNameLower) {
        itemsMap.set(`post-${b.id}`, {
          id: b.id,
          type: 'post',
          title: b.title,
          description: b.description || '',
          category: b.tags?.[0] || 'Zgodba',
          imageUrl: b.image,
          location: b.location,
          date: b.date,
          readTime: b.readTime,
        });
      }
    });

    // 5. Mock Ads
    INITIAL_ADS.forEach(ad => {
      if (ad.author && ad.author.trim().toLowerCase() === targetNameLower) {
        itemsMap.set(`ad-${ad.id}`, {
          id: ad.id,
          type: 'ad',
          title: ad.title,
          description: ad.description,
          category: ad.category,
          imageUrl: ad.image,
          price: ad.price,
          location: ad.location,
          date: ad.date,
        });
      }
    });

    // 6. Mock Events
    INITIAL_EVENTS.forEach(ev => {
      if (ev.organizer && ev.organizer.trim().toLowerCase() === targetNameLower) {
        itemsMap.set(`event-${ev.id}`, {
          id: ev.id,
          type: 'event',
          title: ev.title,
          description: ev.description,
          category: ev.category,
          imageUrl: ev.image,
          price: ev.price,
          location: ev.location,
          date: ev.date,
        });
      }
    });

    // 7. Mock Deals
    [...HERO_BENTO_DEALS, ...INITIAL_DEALS].forEach(d => {
      if (d.partner && d.partner.trim().toLowerCase() === targetNameLower) {
        itemsMap.set(`deal-${d.id}`, {
          id: d.id,
          type: 'deal',
          title: d.title,
          description: d.description,
          category: d.categoryName || d.category,
          imageUrl: d.image,
          price: d.discount,
          location: d.region,
          date: d.date,
        });
      }
    });

    // 8. If navigated from a specific post target and it's not yet in map, add it
    if (targetAuthor.fromPostTarget && !itemsMap.has(`${targetAuthor.fromPostTarget.type}-${targetAuthor.fromPostTarget.id}`)) {
      const t = targetAuthor.fromPostTarget;
      itemsMap.set(`${t.type}-${t.id}`, {
        id: t.id,
        type: t.type === 'ad' ? 'ad' : t.type === 'event' ? 'event' : t.type === 'deal' ? 'deal' : 'post',
        title: t.initialData?.title || 'Objava avtorja',
        description: t.initialData?.description || t.initialData?.content || '',
        category: t.initialData?.category,
        imageUrl: t.initialData?.image || t.initialData?.imageUrl,
        price: t.initialData?.price || t.initialData?.discount,
        location: t.initialData?.location || t.initialData?.region,
      });
    }

    return Array.from(itemsMap.values());
  }, [firestorePosts, firestoreAds, firestoreEvents, targetAuthor]);

  // Categorized counts
  const postsCount = authorItems.filter(i => i.type === 'post').length;
  const adsCount = authorItems.filter(i => i.type === 'ad').length;
  const eventsCount = authorItems.filter(i => i.type === 'event').length;
  const dealsCount = authorItems.filter(i => i.type === 'deal').length;

  const filteredItems = useMemo(() => {
    if (activeTypeFilter === 'all') return authorItems;
    return authorItems.filter(i => i.type === activeTypeFilter);
  }, [authorItems, activeTypeFilter]);

  const handleCardClick = (item: AuthorItemCardData) => {
    if (onNavigatePost) {
      onNavigatePost({
        type: item.type === 'ad' ? 'ad' : item.type === 'event' ? 'event' : item.type === 'deal' ? 'deal' : 'blog',
        id: item.id,
      });
    } else {
      onViewChange(
        item.type === 'ad' ? 'ads' :
        item.type === 'event' ? 'events' :
        item.type === 'deal' ? 'deals' : 'blog'
      );
    }
  };

  return (
    <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
      {/* Author Profile Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-6 shadow-sm border border-surface-container/50 relative overflow-hidden flex flex-col gap-6">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-start justify-between relative z-10">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center flex-1 min-w-0">
            <div className="relative shrink-0">
            <img 
              alt={authorProfile.name} 
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-md ring-4 ring-surface-container-lowest border border-surface-container/50" 
              src={authorProfile.avatar} 
            />
            {authorProfile.role === 'superadmin' ? (
              <span className="absolute bottom-1 right-1 bg-purple-600 text-white rounded-full p-1.5 shadow-md" title="Superadmin">
                <Crown className="w-4 h-4" />
              </span>
            ) : authorProfile.role === 'admin' ? (
              <span className="absolute bottom-1 right-1 bg-error text-white rounded-full p-1.5 shadow-md" title="Administrator">
                <Shield className="w-4 h-4" />
              </span>
            ) : authorProfile.role === 'verified' ? (
              <span className="absolute bottom-1 right-1 bg-secondary text-on-secondary rounded-full p-1.5 shadow-md" title="Preverjen član">
                <UserCheck className="w-4 h-4" />
              </span>
            ) : (
              <span className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1.5 shadow-md" title="Član skupnosti">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline-lg text-2xl sm:text-3xl font-black text-on-surface">
                  {authorProfile.name}
                </h1>
                <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {authorProfile.roleTitle}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-outline font-medium">
                <span>{authorProfile.username}</span>
                <span>•</span>
                <span>Član Portalko skupnosti</span>
              </div>

              <p className="font-body-md text-on-surface-variant text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {authorProfile.bio}
              </p>

              {/* Social links */}
              {authorProfile.socialLinks.length > 0 && (
                <div className="mt-1">
                  <SocialLinksDisplay 
                    socialLinks={authorProfile.socialLinks} 
                    canEdit={false} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons (Share & Report) */}
        <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
            <ShareMenu
              title={`Profil avtorja ${authorProfile.name} na Portalko.net`}
              url={window.location.href}
              showLabel={false}
              className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-surface-container/60 shadow-2xs"
            />
            <ReportButton
              targetId={targetAuthor.id || targetAuthor.name}
              targetType="post"
              targetTitle={`Profil uporabnika: ${authorProfile.name}`}
              targetAuthor={authorProfile.name}
              showLabel={false}
              className="p-2 rounded-xl bg-surface-container-low hover:bg-error/10 text-outline hover:text-error transition-colors cursor-pointer border border-surface-container/60 shadow-2xs"
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-surface-container/60 relative z-10">
          <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container/50 flex flex-col items-center text-center">
            <span className="font-headline-sm text-xl font-black text-on-surface">{authorItems.length}</span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">Vseh objav</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container/50 flex flex-col items-center text-center">
            <span className="font-headline-sm text-xl font-black text-emerald-600 dark:text-emerald-400">{adsCount}</span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">Malih oglasov</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container/50 flex flex-col items-center text-center">
            <span className="font-headline-sm text-xl font-black text-sky-600 dark:text-sky-400">{eventsCount}</span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">Dogodkov</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container/50 flex flex-col items-center text-center">
            <span className="font-headline-sm text-xl font-black text-amber-600 dark:text-amber-400">{dealsCount + postsCount}</span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">Člankov & Popustov</span>
          </div>
        </div>
      </div>

      {/* Author Published Content Section */}
      <div className="flex flex-col gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-surface-container pb-2 px-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-colors cursor-pointer ${
                activeTypeFilter === 'all'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Vse objave ({authorItems.length})
            </button>
            {adsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTypeFilter('ad')}
                className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTypeFilter === 'ad'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Mali oglasi ({adsCount})</span>
              </button>
            )}
            {eventsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTypeFilter('event')}
                className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTypeFilter === 'event'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Dogodki ({eventsCount})</span>
              </button>
            )}
            {dealsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTypeFilter('deal')}
                className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTypeFilter === 'deal'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Ugodnosti ({dealsCount})</span>
              </button>
            )}
            {postsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTypeFilter('post')}
                className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTypeFilter === 'post'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Članki ({postsCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Content List / Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 border border-surface-container/50">
            <BookOpen className="w-10 h-10 text-outline/40" />
            <div>
              <h3 className="font-bold text-on-surface text-base">Ni najdenih objav v tej kategoriji</h3>
              <p className="text-on-surface-variant text-xs mt-1 max-w-sm">
                Avtor {authorProfile.name} v izbrani kategoriji nima objavljenih vsebin.
              </p>
            </div>
            {activeTypeFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveTypeFilter('all')}
                className="mt-2 px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-bold text-xs transition-colors cursor-pointer"
              >
                Prikaži vse objave
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredItems.map((item) => (
              <article
                key={`${item.type}-${item.id}`}
                onClick={() => handleCardClick(item)}
                className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container/60 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 justify-between group"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 border border-surface-container group-hover:scale-102 transition-transform"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0 border border-surface-container">
                      {item.type === 'ad' && <Store className="w-8 h-8 text-emerald-500" />}
                      {item.type === 'event' && <Calendar className="w-8 h-8 text-sky-500" />}
                      {item.type === 'deal' && <Tag className="w-8 h-8 text-amber-500" />}
                      {item.type === 'post' && <BookOpen className="w-8 h-8 text-purple-500" />}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        item.type === 'ad' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                        item.type === 'event' ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400' :
                        item.type === 'deal' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                        'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                      }`}>
                        {item.type === 'ad' ? 'Mali oglas' :
                         item.type === 'event' ? 'Dogodek' :
                         item.type === 'deal' ? 'Ugodnost' : 'Članek'}
                      </span>

                      {item.category && (
                        <span className="text-[11px] text-outline">
                          • {item.category}
                        </span>
                      )}

                      {item.price && (
                        <span className="text-xs font-bold text-secondary ml-auto sm:ml-0">
                          {item.price}
                        </span>
                      )}
                    </div>

                    <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-outline mt-2.5">
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>{item.location}</span>
                        </span>
                      )}
                      {item.date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          <span>{item.date}</span>
                        </span>
                      )}
                      {item.readTime && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-primary" />
                          <span>{item.readTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                    Odpri objavo →
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
