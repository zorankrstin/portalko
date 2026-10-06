import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Crown, Shield, UserCheck, CheckCircle2, 
  MapPin, Calendar, Tag, Store, BookOpen, Share2, 
  Clock, ExternalLink, Sparkles, MessageSquare, AlertCircle,
  Eye, ThumbsUp, Users
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
import { slugify } from '../../utils/urlUtils';
import { getPlainTextSnippet } from '../../utils/textUtils';
import { UserAvatar } from '../common/UserAvatar';
import { isDummyAvatar, isUserUploadedAvatar, isCustomUploadedAvatar, resolveUserUploadedAvatar } from '../../utils/avatarUtils';
import { resolveEventDisplayDate } from '../../utils/dateUtils';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { isUserVerified } from '../../utils/userVerificationUtils';

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
  likesCount?: number;
  lovesCount?: number;
  viewsCount?: number;
  interestedCount?: number | string;
}

export function PublicAuthorProfile({ targetAuthor, onBack, onNavigatePost, onViewChange }: PublicAuthorProfileProps) {
  const { users, currentUser } = useAuth();
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
    const authorSlug = slugify(targetAuthor.name);
    const cleanAuthorSlug = authorSlug.replace(/-/g, '');

    // 1. If active currentUser matches target author, use currentUser (contains the freshest uploaded avatar)
    if (currentUser) {
      if (targetAuthor.id && currentUser.id === targetAuthor.id) return currentUser;
      if (currentUser.name) {
        const cLower = currentUser.name.trim().toLowerCase();
        if (cLower === authorNameLower || slugify(currentUser.name) === authorSlug || slugify(currentUser.name).replace(/-/g, '') === cleanAuthorSlug) {
          return currentUser;
        }
      }
      if (currentUser.username) {
        const cUserClean = currentUser.username.replace('@', '').trim().toLowerCase();
        if (cUserClean === authorNameLower || slugify(cUserClean) === authorSlug) {
          return currentUser;
        }
      }
    }

    // 2. Collect all matching user records and prioritize user with custom uploaded avatar
    const matches = users.filter(u => 
      (targetAuthor.id && u.id === targetAuthor.id) ||
      (u.name && u.name.trim().toLowerCase() === authorNameLower) ||
      (u.name && slugify(u.name) === authorSlug) ||
      (u.name && slugify(u.name).replace(/-/g, '') === cleanAuthorSlug) ||
      (u.username && slugify(u.username.replace('@', '')) === authorSlug) ||
      (authorNameLower.includes('portalko') && u.name.toLowerCase().includes('portalko'))
    );

    if (matches.length > 0) {
      matches.sort((a, b) => {
        // If active logged-in currentUser is among matches, prioritize their account first
        if (currentUser) {
          if (a.id === currentUser.id && b.id !== currentUser.id) return -1;
          if (b.id === currentUser.id && a.id !== currentUser.id) return 1;
        }
        const aScore = isCustomUploadedAvatar(a.avatar) ? 3 : (a.avatar && isUserUploadedAvatar(a.avatar) ? 2 : (a.avatar ? 1 : 0));
        const bScore = isCustomUploadedAvatar(b.avatar) ? 3 : (b.avatar && isUserUploadedAvatar(b.avatar) ? 2 : (b.avatar ? 1 : 0));
        if (bScore !== aScore) return bScore - aScore;
        const aLen = a.avatar ? a.avatar.length : 0;
        const bLen = b.avatar ? b.avatar.length : 0;
        return bLen - aLen;
      });
      return matches[0];
    }

    return null;
  }, [users, currentUser, targetAuthor]);

  // Helper to determine if an avatar URL is just a generic letters/dicebear fallback
  const isGenericAvatar = (url?: string | null) => {
    if (!url) return true;
    return url.includes('dicebear.com') || url.includes('ui-avatars.com');
  };

  // Common matcher for this author across names, slugs, ids and usernames
  const targetNameRaw = targetAuthor.name ? targetAuthor.name.trim() : '';
  const targetNameLower = targetNameRaw.toLowerCase();
  const targetSlug = slugify(targetNameRaw);
  const cleanTargetSlug = targetSlug.replace(/-/g, '');
  const effectiveTargetId = targetAuthor.id || matchedUser?.id;

  const isMatchingAuthor = (itemAuthorName?: string | null, itemAuthorId?: string | null) => {
    if (effectiveTargetId && itemAuthorId && itemAuthorId === effectiveTargetId) return true;
    if (matchedUser?.id && itemAuthorId && itemAuthorId === matchedUser.id) return true;
    if (!itemAuthorName && !itemAuthorId) return false;

    if (itemAuthorName) {
      const itemLower = itemAuthorName.trim().toLowerCase();
      const itemSlug = slugify(itemAuthorName);
      if (targetNameLower && itemLower === targetNameLower) return true;
      if (targetSlug && itemSlug === targetSlug) return true;
      if (targetNameLower && itemLower.replace(/[-_.]/g, ' ') === targetNameLower.replace(/[-_.]/g, ' ')) return true;
      if (itemSlug.replace(/-/g, '') === cleanTargetSlug) return true;
      if (matchedUser?.name && (itemLower === matchedUser.name.toLowerCase().trim() || itemSlug === slugify(matchedUser.name))) return true;
      if (targetNameLower.includes('portalko') && itemLower.includes('portalko')) return true;
      if ((targetNameLower.includes('špas') || targetNameLower.includes('spas')) && (itemLower.includes('špas') || itemLower.includes('spas'))) return true;
    }

    if (itemAuthorId && targetSlug) {
      if (slugify(itemAuthorId) === targetSlug) return true;
      const cleanAuthorId = itemAuthorId.replace(/^(author|partner|user|organizer)-/, '');
      if (slugify(cleanAuthorId) === targetSlug || slugify(cleanAuthorId).replace(/-/g, '') === cleanTargetSlug) return true;
    }

    return false;
  };

  // Find real author metadata (avatar, proper capitalized name, role) from matching posts
  const realAuthorMetadata = useMemo(() => {
    // Check events
    for (const e of firestoreEvents) {
      const evAuthorName = e.authorName || (e as any).organizer;
      const evAuthorId = e.authorId || (e as any).organizerId;
      if (isMatchingAuthor(evAuthorName, evAuthorId)) {
        const authorUser = users.find(u => (e.authorId && u.id === e.authorId) || (u.name && isMatchingAuthor(u.name, u.id)));
        const avatar = resolveUserUploadedAvatar(e.authorAvatar, e.authorId, evAuthorName, users, currentUser);

        return {
          name: evAuthorName,
          avatar,
          role: e.authorRole || authorUser?.role || 'Organizator',
          id: evAuthorId,
        };
      }
    }

    // Check posts
    for (const p of firestorePosts) {
      if (isMatchingAuthor(p.authorName, p.authorId)) {
        const authorUser = users.find(u => u.id === p.authorId || (u.name && isMatchingAuthor(u.name, u.id)));
        const avatar = resolveUserUploadedAvatar(p.authorAvatar, p.authorId, p.authorName, users, currentUser);
        return {
          name: p.authorName,
          avatar,
          role: p.authorRole || authorUser?.role,
          id: p.authorId,
        };
      }
    }
    // Check ads
    for (const a of firestoreAds) {
      if (isMatchingAuthor(a.authorName, a.authorId)) {
        const authorUser = users.find(u => u.id === a.authorId || (u.name && isMatchingAuthor(u.name, u.id)));
        const avatar = resolveUserUploadedAvatar(a.authorAvatar, a.authorId, a.authorName, users, currentUser);
        return {
          name: a.authorName,
          avatar,
          role: a.authorRole || authorUser?.role,
          id: a.authorId,
        };
      }
    }
    // Check mock deals
    for (const d of [...HERO_BENTO_DEALS, ...INITIAL_DEALS]) {
      if (isMatchingAuthor(d.partner, d.partnerId)) {
        return {
          name: d.partner,
          avatar: d.partnerAvatar,
          role: d.partnerRole || 'Partner',
          id: d.partnerId,
        };
      }
    }
    // Check mock blogs
    for (const b of INITIAL_BLOG_POSTS) {
      if (isMatchingAuthor(b.author, b.authorId)) {
        return {
          name: b.author,
          avatar: b.authorAvatar,
          role: b.authorRole || 'Avtor',
          id: b.authorId,
        };
      }
    }
    // Check mock ads
    for (const ad of INITIAL_ADS) {
      if (isMatchingAuthor(ad.author, ad.authorId)) {
        return {
          name: ad.author,
          avatar: ad.authorAvatar,
          role: 'Prodajalec',
          id: ad.authorId,
        };
      }
    }
    // Check mock events
    for (const ev of INITIAL_EVENTS) {
      if (isMatchingAuthor(ev.organizer, ev.organizerId)) {
        return {
          name: ev.organizer,
          avatar: ev.authorAvatar,
          role: 'Organizator',
          id: ev.organizerId,
        };
      }
    }

    return null;
  }, [firestorePosts, firestoreAds, firestoreEvents, targetAuthor, matchedUser, users, currentUser]);

  // Aggregate author's items
  const authorItems = useMemo<AuthorItemCardData[]>(() => {
    const itemsMap = new Map<string, AuthorItemCardData>();

    // 1. Firestore Posts / Deals
    firestorePosts.forEach(p => {
      if (isMatchingAuthor(p.authorName, p.authorId)) {
        const itemType = (p.category === 'deal' || p.category === 'ugodnosti' || p.categoryName === 'Ugodnosti' || p.categoryName === 'Ugodnost') ? 'deal' : 'post';
        itemsMap.set(`${itemType}-${p.id}`, {
          id: p.id,
          type: itemType,
          title: p.title,
          description: p.content,
          category: p.categoryName || p.category,
          imageUrl: p.imageUrl,
          price: p.price,
          location: p.location,
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('sl-SI') : undefined,
          likesCount: p.likesCount || 0,
          lovesCount: (p as any).lovesCount || 0,
          viewsCount: p.viewsCount || 0,
        });
      }
    });

    // 2. Firestore Ads
    firestoreAds.forEach(a => {
      if (isMatchingAuthor(a.authorName, a.authorId)) {
        itemsMap.set(`ad-${a.id}`, {
          id: a.id,
          type: 'ad',
          title: a.title,
          description: a.description,
          category: a.categoryName || a.category,
          imageUrl: a.imageUrl,
          price: a.price,
          location: a.location,
          date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('sl-SI') : undefined,
          likesCount: a.likesCount || 0,
          lovesCount: (a as any).lovesCount || 0,
          viewsCount: a.viewsCount || 0,
        });
      }
    });

    // 3. Firestore Events
    firestoreEvents.forEach(e => {
      const evAuthorName = e.authorName || (e as any).organizer;
      const evAuthorId = e.authorId || (e as any).organizerId;
      if (isMatchingAuthor(evAuthorName, evAuthorId)) {
        const resolvedDate = resolveEventDisplayDate(e);
        itemsMap.set(`event-${e.id}`, {
          id: e.id,
          type: 'event',
          title: e.title,
          description: e.description,
          category: e.categoryName || e.category,
          imageUrl: e.imageUrl,
          price: e.price,
          location: resolvedDate.location || e.location,
          date: resolvedDate.dateInfo.fullDate || e.eventDate || (e.createdAt ? new Date(e.createdAt).toLocaleDateString('sl-SI') : undefined),
          likesCount: e.likesCount || 0,
          lovesCount: (e as any).lovesCount || 0,
          viewsCount: e.viewsCount || 0,
          interestedCount: e.interestedCount,
        });
      }
    });

    // 4. Mock Blogs
    INITIAL_BLOG_POSTS.forEach(b => {
      if (isMatchingAuthor(b.author, b.authorId)) {
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
          likesCount: parseInt(b.likesCount) || 0,
          viewsCount: parseInt(b.viewsCount) || 0,
        });
      }
    });

    // 5. Mock Ads
    INITIAL_ADS.forEach(ad => {
      if (isMatchingAuthor(ad.author, ad.authorId)) {
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
          likesCount: parseInt(String((ad as any).likesCount || 0)) || 0,
          viewsCount: ad.views || 0,
        });
      }
    });

    // 6. Mock Events
    INITIAL_EVENTS.forEach(ev => {
      if (isMatchingAuthor(ev.organizer, ev.organizerId)) {
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
          likesCount: parseInt(String((ev as any).likesCount || 0)) || 0,
          interestedCount: ev.interestedCount,
        });
      }
    });

    // 7. Mock Deals
    [...HERO_BENTO_DEALS, ...INITIAL_DEALS].forEach(d => {
      if (isMatchingAuthor(d.partner, d.partnerId)) {
        itemsMap.set(`deal-${d.id}`, {
          id: d.id,
          type: 'deal',
          title: d.title,
          description: d.description,
          category: d.categoryName || d.category,
          imageUrl: d.image,
          price: d.discount || d.newPrice,
          location: d.region,
          date: d.date,
          viewsCount: (d as any).views || 0,
          likesCount: d.votes || (d as any).likesCount || 0,
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
        likesCount: (t.initialData as any)?.likesCount || 0,
      });
    }

    return Array.from(itemsMap.values());
  }, [firestorePosts, firestoreAds, firestoreEvents, targetAuthor, matchedUser]);

  // Consolidated author profile details
  const authorProfile = useMemo(() => {
    const rawName = targetAuthor.name || 'Avtor';
    const name = matchedUser?.name || realAuthorMetadata?.name || (
      rawName.includes(' ') 
        ? rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : rawName.charAt(0).toUpperCase() + rawName.slice(1)
    );

    // Pick best real avatar, strictly prioritizing user-uploaded profile photos over dummy images
    const avatar = resolveUserUploadedAvatar(
      targetAuthor.avatar || realAuthorMetadata?.avatar || matchedUser?.avatar,
      effectiveTargetId,
      name,
      users,
      currentUser
    );

    const role = matchedUser?.role || (
      targetAuthor.role?.toLowerCase().includes('superadmin') ? 'superadmin' :
      targetAuthor.role?.toLowerCase().includes('admin') ? 'admin' :
      targetAuthor.role?.toLowerCase().includes('partner') ? 'partner' :
      realAuthorMetadata?.role?.toLowerCase().includes('partner') ? 'partner' :
      targetAuthor.role?.toLowerCase().includes('preverjen') ? 'verified' : 'registered'
    );
    const roleTitle = targetAuthor.role || realAuthorMetadata?.role || (
      role === 'superadmin' ? 'Superadmin Portalko' :
      role === 'admin' ? 'Administrator' :
      role === 'partner' ? 'Partner Portalko' :
      role === 'verified' ? 'Preverjen uporabnik' : 'Član skupnosti'
    );
    const username = matchedUser?.username || `@${slugify(name).replace(/-/g, '_')}`;
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
  }, [matchedUser, targetAuthor, realAuthorMetadata, authorItems]);

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

  // Categorized counts & engagement totals
  const isAuthorVerified = isUserVerified({
    role: authorProfile.role,
    name: authorProfile.name,
    userId: effectiveTargetId,
    users,
  });

  const postsCount = authorItems.filter(i => i.type === 'post').length;
  const adsCount = authorItems.filter(i => i.type === 'ad').length;
  const eventsCount = authorItems.filter(i => i.type === 'event').length;
  const dealsCount = authorItems.filter(i => i.type === 'deal').length;
  const totalViews = useMemo(() => {
    return authorItems.reduce((acc, item) => acc + (item.viewsCount || 0), 0);
  }, [authorItems]);
  const totalLikes = useMemo(() => {
    return authorItems.reduce((acc, item) => acc + (item.likesCount || 0) + (item.lovesCount || 0), 0);
  }, [authorItems]);

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
              <UserAvatar
                src={authorProfile.avatar}
                name={authorProfile.name}
                userId={effectiveTargetId}
                role={authorProfile.role}
                size="2xl"
                className="w-24 h-24 sm:w-28 sm:h-28 shadow-md ring-4 ring-surface-container-lowest border border-surface-container/50 bg-surface-container-low"
              />
            </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline-lg text-2xl sm:text-3xl font-black text-on-surface flex items-center gap-2">
                  <span>{authorProfile.name}</span>
                  {isAuthorVerified && (
                    <VerifiedBadge size="md" title="Preverjen račun (Verified)" />
                  )}
                </h1>
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
            <span className="font-headline-sm text-xl font-black text-sky-600 dark:text-sky-400">
              {eventsCount > 0 ? eventsCount : adsCount > 0 ? adsCount : (postsCount + dealsCount)}
            </span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">
              {eventsCount > 0 ? 'Dogodkov' : adsCount > 0 ? 'Malih oglasov' : 'Člankov'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container/50 flex flex-col items-center text-center">
            <span className="font-headline-sm text-xl font-black text-emerald-600 dark:text-emerald-400">{totalViews}</span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">Ogledov objav</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container/50 flex flex-col items-center text-center">
            <span className="font-headline-sm text-xl font-black text-amber-600 dark:text-amber-400">{totalLikes}</span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider mt-0.5">Všečkov skupaj</span>
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
                      {getPlainTextSnippet(item.title)}
                    </h3>

                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                      {getPlainTextSnippet(item.description)}
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
                      {typeof item.viewsCount === 'number' && (
                        <span className="flex items-center gap-1 text-on-surface-variant font-medium" title="Število ogledov objave">
                          <Eye className="w-3 h-3 text-secondary" />
                          <span>{item.viewsCount} {item.viewsCount === 1 ? 'ogled' : item.viewsCount === 2 ? 'ogleda' : 'ogledov'}</span>
                        </span>
                      )}
                      {typeof item.likesCount === 'number' && (
                        <span className="flex items-center gap-1 text-on-surface-variant font-medium" title="Število všečkov objave">
                          <ThumbsUp className="w-3 h-3 text-primary" />
                          <span>{item.likesCount + (item.lovesCount || 0)}</span>
                        </span>
                      )}
                      {item.type === 'event' && item.interestedCount !== undefined && item.interestedCount !== null && (
                        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium" title="Zainteresirani obiskovalci">
                          <Users className="w-3 h-3" />
                          <span>{item.interestedCount} zainteresiranih</span>
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
