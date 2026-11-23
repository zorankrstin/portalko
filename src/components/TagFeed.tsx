import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Hash,
  BookOpen,
  Store,
  CalendarDays,
  Percent,
  ArrowLeft,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  Loader2,
  Layers,
} from 'lucide-react';
import {
  subscribeToPosts,
  subscribeToAds,
  subscribeToEvents,
  FirestorePost,
  FirestoreAd,
  FirestoreEvent,
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { FirestorePostCard } from './posts/FirestorePostCard';
import { AdPost } from './posts/AdPost';
import { EventPost } from './posts/EventPost';
import { DealPost } from './posts/DealPost';
import { isItemActivelyPromoted } from '../services/promotionService';
import { resolveEventDisplayDate, resolveItemEntryTimestamp, formatSlovenianDate } from '../utils/dateUtils';
import { resolveUserUploadedAvatar } from '../utils/avatarUtils';
import { getPlainTextSnippet } from '../utils/textUtils';
import { buildTagUrl, slugify } from '../utils/urlUtils';
import { doesPostMatchTag, parseTags, resolveTagDisplayName } from '../utils/tagUtils';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { getFeedCardAnimationClass } from '../utils/animationUtils';
import type { ViewMode, PostDetailTarget, AuthorProfileTarget } from '../types';

export type TagCategoryFilter = 'all' | 'blog' | 'ads' | 'events' | 'deals';

type TaggedFeedEntry =
  | { kind: 'blog'; id: string; timestamp: number; popularity: number; tags: string[]; data: FirestorePost }
  | { kind: 'deals'; id: string; timestamp: number; popularity: number; tags: string[]; data: FirestorePost }
  | { kind: 'ads'; id: string; timestamp: number; popularity: number; tags: string[]; data: FirestoreAd }
  | { kind: 'events'; id: string; timestamp: number; popularity: number; tags: string[]; data: FirestoreEvent };

export interface TagFeedProps {
  tag: string;
  onTagClick: (tag: string) => void;
  onViewChange: (view: ViewMode) => void;
  onNavigatePost: (target: PostDetailTarget) => void;
  onAuthorClick?: (author: AuthorProfileTarget) => void;
  searchQuery?: string;
}

const PAGE_SIZE = 10;

function isDealFirestorePost(p: FirestorePost): boolean {
  const catLower = (p.category || '').toLowerCase();
  const catNameLower = (p.categoryName || '').toLowerCase();
  return Boolean(
    catLower === 'deal' ||
      catLower === 'ugodnosti' ||
      catLower === 'akcije' ||
      catLower.startsWith('deal') ||
      catNameLower.includes('ugodnost') ||
      catNameLower.includes('akcij') ||
      p.id.startsWith('deal-') ||
      p.id.startsWith('hero-bento-') ||
      (p.price && p.category !== 'ad' && p.category !== 'event')
  );
}

export function TagFeed({
  tag,
  onTagClick,
  onViewChange,
  onNavigatePost,
  onAuthorClick,
  searchQuery = '',
}: TagFeedProps) {
  const { currentUser, users } = useAuth();
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);

  const [postsLoaded, setPostsLoaded] = useState(false);
  const [adsLoaded, setAdsLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<TagCategoryFilter>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'popular'>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setCategoryFilter('all');
    setPage(1);
  }, [tag]);

  useEffect(() => {
    const unsubPosts = subscribeToPosts((posts) => {
      setFirestorePosts(posts);
      setPostsLoaded(true);
    });
    const unsubAds = subscribeToAds((ads) => {
      setFirestoreAds(ads);
      setAdsLoaded(true);
    });
    const unsubEvents = subscribeToEvents((events) => {
      setFirestoreEvents(events);
      setEventsLoaded(true);
    });

    return () => {
      unsubPosts();
      unsubAds();
      unsubEvents();
    };
  }, []);

  const isLoadingInitial = !postsLoaded || !adsLoaded || !eventsLoaded;
  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  // Aggregate all matching posts across all 4 categories (Blog, Mali oglasi, Dogodki, Akcije)
  const allMatchingEntries = useMemo<TaggedFeedEntry[]>(() => {
    if (!tag.trim()) return [];
    const results: TaggedFeedEntry[] = [];

    // 1. Blog & Akcije (deals) from posts collection
    firestorePosts.forEach((fp) => {
      if (fp.status === 'osnutek') return;
      if (fp.status === 'rejected' || fp.status === 'archived' || fp.status === 'pending') {
        const isAuthor =
          currentUser?.id === fp.authorId || (currentUser?.name && currentUser.name === fp.authorName);
        if (!isAdminOrSuper && !isAuthor) return;
      }

      const tags = parseTags(fp.tags);
      if (!doesPostMatchTag(tags, tag)) return;

      const isDeal = isDealFirestorePost(fp);
      const kind: 'deals' | 'blog' = isDeal ? 'deals' : 'blog';
      const textToMatch = `${getPlainTextSnippet(fp.title)} ${getPlainTextSnippet(fp.content)} ${fp.categoryName || ''} ${tags.join(' ')} ${fp.location || ''}`;
      if (searchQuery && !matchesSearchAndCategory(textToMatch, isDeal ? 'deals' : 'blog', searchQuery)) {
        return;
      }

      results.push({
        kind,
        id: fp.id,
        timestamp: resolveItemEntryTimestamp(fp),
        popularity: (fp.likesCount || 0) + (fp.commentsCount || 0) * 2 + (fp.viewsCount || 0) * 0.1,
        tags,
        data: fp,
      });
    });

    // 2. Mali oglasi from ads collection
    firestoreAds.forEach((fa) => {
      if (fa.status === 'rejected' || fa.status === 'sold' || fa.status === 'closed' || fa.status === 'pending') {
        const isAuthor =
          currentUser?.id === fa.authorId || (currentUser?.name && currentUser.name === fa.authorName);
        if (!isAdminOrSuper && !isAuthor) return;
      }

      const tags = parseTags(fa.tags);
      if (!doesPostMatchTag(tags, tag)) return;

      const textToMatch = `${getPlainTextSnippet(fa.title)} ${getPlainTextSnippet(fa.description)} ${fa.categoryName || ''} ${tags.join(' ')} ${fa.location || ''}`;
      if (searchQuery && !matchesSearchAndCategory(textToMatch, 'ads', searchQuery)) {
        return;
      }

      results.push({
        kind: 'ads',
        id: fa.id,
        timestamp: resolveItemEntryTimestamp(fa),
        popularity: (fa.likesCount || 0) + (fa.viewsCount || 0) * 0.1,
        tags,
        data: fa,
      });
    });

    // 3. Dogodki from events collection
    firestoreEvents.forEach((fe) => {
      if (fe.status === 'rejected' || fe.status === 'pending') {
        const isAuthor =
          currentUser?.id === fe.authorId || (currentUser?.name && currentUser.name === fe.authorName);
        if (!isAdminOrSuper && !isAuthor) return;
      }

      const tags = parseTags(fe.tags);
      if (!doesPostMatchTag(tags, tag)) return;

      const textToMatch = `${getPlainTextSnippet(fe.title)} ${getPlainTextSnippet(fe.description)} ${fe.categoryName || ''} ${tags.join(' ')} ${fe.location || ''}`;
      if (searchQuery && !matchesSearchAndCategory(textToMatch, 'events', searchQuery)) {
        return;
      }

      results.push({
        kind: 'events',
        id: fe.id,
        timestamp: resolveItemEntryTimestamp(fe),
        popularity: (fe.likesCount || 0) + (fe.interestedCount || 0) + (fe.viewsCount || 0) * 0.1,
        tags,
        data: fe,
      });
    });

    return results;
  }, [tag, firestorePosts, firestoreAds, firestoreEvents, currentUser, isAdminOrSuper, searchQuery]);

  // Resolve display label preserving original Slovenian diacritics/casing
  const displayTag = useMemo(() => {
    return resolveTagDisplayName(
      tag,
      allMatchingEntries.map((entry) => entry.tags)
    );
  }, [tag, allMatchingEntries]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts = {
      all: allMatchingEntries.length,
      ads: 0,
      events: 0,
      blog: 0,
      deals: 0,
    };
    allMatchingEntries.forEach((item) => {
      counts[item.kind] += 1;
    });
    return counts;
  }, [allMatchingEntries]);

  // Related co-occurring tags across matched items
  const relatedTags = useMemo(() => {
    const freq = new Map<string, { label: string; count: number }>();
    const activeSlug = slugify(tag);
    const activeLower = tag.replace(/^#+/, '').trim().toLowerCase();

    allMatchingEntries.forEach((entry) => {
      entry.tags.forEach((t) => {
        const tLower = t.toLowerCase();
        const tSlug = slugify(t);
        if (tLower === activeLower || (activeSlug && tSlug === activeSlug)) {
          return;
        }
        const key = tSlug || tLower;
        const existing = freq.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          freq.set(key, { label: t, count: 1 });
        }
      });
    });

    return Array.from(freq.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'sl'))
      .slice(0, 12);
  }, [allMatchingEntries, tag]);

  // Filtered and sorted entries
  const filteredEntries = useMemo(() => {
    const subset =
      categoryFilter === 'all'
        ? allMatchingEntries
        : allMatchingEntries.filter((entry) => entry.kind === categoryFilter);

    return [...subset].sort((a, b) => {
      if (sortOption === 'popular') {
        return b.popularity - a.popularity || b.timestamp - a.timestamp;
      }
      return b.timestamp - a.timestamp;
    });
  }, [allMatchingEntries, categoryFilter, sortOption]);

  const visibleEntries = filteredEntries.slice(0, page * PAGE_SIZE);
  const hasMore = visibleEntries.length < filteredEntries.length;

  const filterTabs: Array<{
    id: TagCategoryFilter;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'all', label: 'Vse kategorije', count: categoryCounts.all, icon: Layers },
    { id: 'ads', label: 'Mali oglasi', count: categoryCounts.ads, icon: Store },
    { id: 'events', label: 'Dogodki', count: categoryCounts.events, icon: CalendarDays },
    { id: 'blog', label: 'Blog', count: categoryCounts.blog, icon: BookOpen },
    { id: 'deals', label: 'Akcije', count: categoryCounts.deals, icon: Percent },
  ];

  const CATEGORY_BADGE_MAP: Record<Exclude<TagCategoryFilter, 'all'>, { label: string; badgeClass: string }> = {
    ads: {
      label: 'Mali oglas',
      badgeClass: 'bg-primary/10 text-primary border-primary/20',
    },
    events: {
      label: 'Dogodek',
      badgeClass: 'bg-secondary/10 text-secondary border-secondary/20',
    },
    blog: {
      label: 'Blog',
      badgeClass: 'bg-tertiary/10 text-tertiary border-tertiary/20',
    },
    deals: {
      label: 'Akcija & Popust',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
    },
  };

  return (
    <div className="flex flex-col gap-space-md w-full">
      {/* Tag Feed Header Card */}
      <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border border-surface-container/60 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/12 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Oznaka
                </span>
                <span className="text-xs text-outline font-medium">
                  {allMatchingEntries.length}{' '}
                  {allMatchingEntries.length === 1
                    ? 'označena objava'
                    : allMatchingEntries.length === 2
                      ? 'označeni objavi'
                      : allMatchingEntries.length === 3 || allMatchingEntries.length === 4
                        ? 'označene objave'
                        : 'označenih objav'}
                </span>
              </div>
              <h1 className="font-headline-md text-xl sm:text-2xl font-black text-on-surface mt-1 break-words">
                #{displayTag || tag}
              </h1>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Vse objave iz kategorij Mali oglasi, Dogodki, Blog in Akcije, označene z oznako #{displayTag || tag}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onViewChange('main')}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold flex items-center gap-1.5 border border-surface-container/80 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-outline" />
            <span>Vse objave</span>
          </button>
        </div>

        {/* Category Filter Tabs & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-surface-container-low">
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(tab.id);
                    setPage(1);
                  }}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-low/70 hover:bg-surface-container text-on-surface-variant border-surface-container/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-outline'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-outline" />
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as 'newest' | 'popular');
                setPage(1);
              }}
              className="bg-surface-container-low text-on-surface text-xs font-semibold px-3 py-1.5 rounded-xl border border-surface-container focus:outline-none focus:border-primary cursor-pointer"
              aria-label="Razvrsti objave"
            >
              <option value="newest">Najnovejše najprej</option>
              <option value="popular">Najbolj priljubljene</option>
            </select>
          </div>
        </div>

        {/* Related Tags */}
        {relatedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-surface-container-low text-xs">
            <span className="text-outline font-semibold flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Sorodne oznake:</span>
            </span>
            {relatedTags.map((rel) => (
              <a
                key={rel.label}
                href={buildTagUrl(rel.label)}
                onClick={(e) => {
                  e.preventDefault();
                  onTagClick(rel.label);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary border border-surface-container/80 hover:border-primary/25 font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                title={`Prikaži objave z oznako #${rel.label}`}
              >
                <span>#{rel.label}</span>
                <span className="text-[10px] text-outline">({rel.count})</span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Feed Content */}
      {isLoadingInitial && allMatchingEntries.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-10 text-center border border-surface-container/60 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-on-surface-variant">
            Nalagam objave z oznako #{displayTag || tag}...
          </p>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-surface-container/60 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-headline-sm text-base font-bold text-on-surface">
              {categoryFilter === 'all'
                ? `Ni najdenih objav z oznako #${displayTag || tag}`
                : 'V tej kategoriji ni objav za to oznako'}
            </h2>
            <p className="text-xs text-outline mt-1 max-w-md mx-auto">
              {categoryFilter === 'all'
                ? 'Ta oznaka trenutno še nima objavljenih prispevkov ali pa so bili odstranjeni.'
                : 'Izberite "Vse kategorije" za ogled vseh objav s to oznako.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            {categoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold cursor-pointer hover:bg-primary-container transition-colors"
              >
                Prikaži vse kategorije ({categoryCounts.all})
              </button>
            )}
            <button
              type="button"
              onClick={() => onViewChange('main')}
              className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold border border-surface-container cursor-pointer transition-colors"
            >
              Nazaj na vse objave
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {visibleEntries.map((entry, idx) => {
            const catMeta = CATEGORY_BADGE_MAP[entry.kind];

            if (entry.kind === 'blog') {
              return (
                <div key={`tag-blog-${entry.id}-${idx}`} className={`relative ${getFeedCardAnimationClass(idx, PAGE_SIZE)}`}>
                  <FirestorePostCard
                    post={entry.data}
                    onNavigatePost={onNavigatePost}
                    onTagClick={onTagClick}
                  />
                </div>
              );
            }

            if (entry.kind === 'deals') {
              const p = entry.data;
              const isPromoted = Boolean(
                p.promotion
                  ? isItemActivelyPromoted(p.promotion, 'deals')
                  : p.isPromoted && (!p.promotedUntil || new Date(p.promotedUntil).getTime() > Date.now())
              );
              const promoBadge = p.promotionBadgeType || p.promotion?.badgeType || 'PROMO';
              return (
                <div key={`tag-deal-${entry.id}-${idx}`} className={`relative ${getFeedCardAnimationClass(idx, PAGE_SIZE)}`}>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catMeta.badgeClass}`}
                    >
                      <Percent className="w-3 h-3" />
                      <span>{catMeta.label}</span>
                    </span>
                  </div>
                  <DealPost
                    id={p.id}
                    title={p.title}
                    subtitle={p.subtitle}
                    discount={p.discount || p.price || 'Ugodnost'}
                    oldPrice={p.oldPrice}
                    newPrice={p.newPrice}
                    startDate={p.startDate}
                    expirationDate={p.expirationDate}
                    author={p.authorName}
                    authorId={p.authorId}
                    authorRole={p.authorRole || 'Partner'}
                    authorAvatar={p.authorAvatar}
                    date={p.expirationDate ? `Velja do ${p.expirationDate}` : formatSlovenianDate(p.createdAt) || 'Aktualno'}
                    description={p.content}
                    image={p.imageUrl}
                    images={p.images || p.imageUrls}
                    code={p.promoCode}
                    link={p.dealLink}
                    categoryName={p.categoryName || 'Akcije & Popusti'}
                    category={p.category || 'akcije'}
                    subcategory={p.subcategory}
                    subcategoryName={p.subcategoryName}
                    region={p.location || p.region || 'Vsa Slovenija'}
                    verifiedText="Preverjeno"
                    tags={entry.tags}
                    votesCount={p.likesCount ?? 0}
                    isPromoted={isPromoted}
                    promotionBadgeType={promoBadge}
                    onNavigatePost={onNavigatePost}
                    onTagClick={onTagClick}
                  />
                </div>
              );
            }

            if (entry.kind === 'ads') {
              const ad = entry.data;
              const isPromoted = Boolean(
                ad.promotion
                  ? isItemActivelyPromoted(ad.promotion, 'oglasi')
                  : ad.isPromoted && (!ad.promotedUntil || new Date(ad.promotedUntil).getTime() > Date.now())
              );
              return (
                <div key={`tag-ad-${entry.id}-${idx}`} className={`relative ${getFeedCardAnimationClass(idx, PAGE_SIZE)}`}>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catMeta.badgeClass}`}
                    >
                      <Store className="w-3 h-3" />
                      <span>{catMeta.label}</span>
                    </span>
                  </div>
                  <AdPost
                    id={ad.id}
                    title={ad.title}
                    subtitle={ad.subtitle}
                    price={ad.price || 'Po dogovoru'}
                    author={ad.authorName}
                    authorId={ad.authorId}
                    authorAvatar={ad.authorAvatar}
                    authorRole={ad.authorRole}
                    authorInitials={(ad.authorName || 'O').slice(0, 2).toUpperCase()}
                    location={ad.location || ad.region || 'Slovenija'}
                    date={formatSlovenianDate(ad.createdAt) || 'Ravno objavljeno'}
                    description={ad.description}
                    categoryName={ad.categoryName || ad.category || 'Mali oglas'}
                    category={ad.category || 'oglasi'}
                    subcategory={ad.subcategory}
                    subcategoryName={ad.subcategoryName}
                    image={ad.imageUrl}
                    images={ad.images || ad.imageUrls}
                    likesCount={ad.likesCount || 0}
                    tags={entry.tags}
                    isPromoted={isPromoted}
                    promotionBadgeType={ad.promotionBadgeType || ad.promotion?.badgeType}
                    onNavigatePost={onNavigatePost}
                    onTagClick={onTagClick}
                  />
                </div>
              );
            }

            // Events
            const ev = entry.data;
            const isPromoted = Boolean(
              ev.promotion
                ? isItemActivelyPromoted(ev.promotion, 'dogodki')
                : ev.isPromoted && (!ev.promotedUntil || new Date(ev.promotedUntil).getTime() > Date.now())
            );
            const resolvedDate = resolveEventDisplayDate(ev);
            const eventAuthorName = ev.authorName || (ev as any).organizer || 'Organizator';
            const authorUser = users.find(
              (u) =>
                (ev.authorId && u.id === ev.authorId) ||
                (u.name && u.name.trim().toLowerCase() === eventAuthorName.trim().toLowerCase()) ||
                (u.name && slugify(u.name) === slugify(eventAuthorName))
            );
            const resolvedAvatar = resolveUserUploadedAvatar(
              ev.authorAvatar,
              ev.authorId,
              eventAuthorName,
              users,
              currentUser
            );

            return (
              <div key={`tag-event-${entry.id}-${idx}`} className={`relative ${getFeedCardAnimationClass(idx, PAGE_SIZE)}`}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catMeta.badgeClass}`}
                  >
                    <CalendarDays className="w-3 h-3" />
                    <span>{catMeta.label}</span>
                  </span>
                </div>
                <EventPost
                  id={ev.id}
                  title={ev.title}
                  subtitle={ev.subtitle}
                  organizer={eventAuthorName}
                  authorName={eventAuthorName}
                  authorId={ev.authorId}
                  authorAvatar={resolvedAvatar}
                  authorRole={ev.authorRole || authorUser?.role}
                  onAuthorClick={onAuthorClick}
                  categoryName={ev.categoryName || ev.category || 'Dogodek'}
                  category={ev.category || 'dogodki'}
                  subcategory={ev.subcategory}
                  subcategoryName={ev.subcategoryName}
                  location={resolvedDate.location || ev.location || ev.region || 'Slovenija'}
                  region={ev.region}
                  date={resolvedDate.dateInfo.fullDate}
                  eventTime={resolvedDate.eventTime || ev.eventTime}
                  eventDates={ev.eventDates}
                  eventSchedule={ev.eventSchedule}
                  month={resolvedDate.dateInfo.month}
                  day={resolvedDate.dateInfo.day}
                  price={ev.price || 'Vstop prost'}
                  ticketUrl={ev.ticketUrl}
                  description={ev.description}
                  image={ev.imageUrl}
                  images={ev.images || ev.imageUrls}
                  interestedCount={ev.interestedCount}
                  likesCount={ev.likesCount || 0}
                  tags={entry.tags}
                  isPromoted={isPromoted}
                  promotionBadgeType={ev.promotionBadgeType || ev.promotion?.badgeType}
                  onNavigatePost={onNavigatePost}
                  onTagClick={onTagClick}
                />
              </div>
            );
          })}

          {hasMore && (
            <div className="flex flex-col items-center justify-center gap-2 pt-2 pb-6">
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                className="px-6 py-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container text-on-surface font-label-md text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 text-primary" />
                <span>Naloži še objav</span>
              </button>
              <span className="font-body-sm text-xs text-outline">
                Prikazano {visibleEntries.length} od {filteredEntries.length} objav
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
