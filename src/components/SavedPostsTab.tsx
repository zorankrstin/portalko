import { useState, useEffect, useMemo, useRef } from 'react';
import { useBookmarks, SavedItemData } from '../contexts/BookmarkContext';
import { useAuth, User } from '../contexts/AuthContext';
import {
  subscribeToPosts,
  subscribeToAds,
  subscribeToEvents,
  getEventById,
  getAdById,
  getPostById,
  fetchUserProfile,
  FirestorePost,
  FirestoreAd,
  FirestoreEvent,
} from '../services/firestoreService';
import { BlogPost } from './posts/BlogPost';
import { AdPost } from './posts/AdPost';
import { DealPost } from './posts/DealPost';
import { EventPost } from './posts/EventPost';
import { NewsPost } from './posts/NewsPost';
import { RssPost } from './posts/RssPost';
import { Bookmark, ShoppingBag, Newspaper, Calendar, FileText, Percent, Inbox } from 'lucide-react';
import { matchesSearchAndCategory } from '../utils/searchUtils';
import { usePageSeo } from '../services/seoSettingsService';
import { getFeedCardAnimationClass } from '../utils/animationUtils';
import { resolveEventDisplayDate, formatSlovenianDate } from '../utils/dateUtils';
import { resolveUserUploadedAvatar } from '../utils/avatarUtils';
import { slugify } from '../utils/urlUtils';
import type { PostDetailTarget } from '../types';

const DEMO_ITEM_IDS = new Set([
  'blog',
  'ad',
  'event',
  'deal',
  'rss',
  'news',
  'oglas-inline-12310',
  'oglas-inline-15138',
  'oglas-inline-19314',
  'oglas-inline-miza',
  'oglas-inline-vozicek',
  'dogodek-inline-15866',
  'dogodek-inline-tek',
  'dogodek-inline-drama',
  'dogodek-inline-cokolada',
  'dogodek-inline-derbi',
]);

function normalizeLookupId(rawId: string): string {
  return String(rawId || '')
    .toLowerCase()
    .trim()
    .replace(/^(event|oglas|dogodek|ad|deal|blog|post)-/, '');
}

function isDealFirestorePost(p: FirestorePost): boolean {
  const catLower = (p.category || '').toLowerCase();
  const catNameLower = (p.categoryName || '').toLowerCase();
  return (
    catLower === 'deal' ||
    catLower === 'ugodnosti' ||
    catLower.startsWith('deal') ||
    catNameLower.includes('ugodnost') ||
    catNameLower.includes('akcij') ||
    catNameLower.includes('popust') ||
    (p as any).type === 'deal' ||
    Boolean(p.discount) ||
    Boolean(p.promoCode) ||
    Boolean(p.dealLink) ||
    Boolean(p.price && p.category !== 'ad' && p.category !== 'event') ||
    p.id.startsWith('deal-') ||
    p.id.startsWith('hero-bento-')
  );
}

const DUMMY_AUTHOR_PLACEHOLDERS = new Set([
  'mestna knjižnica kranj',
  'marko k.',
  'gregor h.',
  'organizator',
  'avtor',
  'uporabnik',
  'partner',
  'portalko partner',
  'neznan avtor',
]);

function isDummyPlaceholderAuthor(name?: string): boolean {
  if (!name) return false;
  return DUMMY_AUTHOR_PLACEHOLDERS.has(name.trim().toLowerCase());
}

interface SavedPostsTabProps {
  searchQuery?: string;
  users?: User[];
  resolvedAuthorsById?: Record<string, User>;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onAuthorClick?: (author: { name: string; id?: string; avatar?: string; role?: string; fromPostTarget?: PostDetailTarget }) => void;
}

export function SavedPostsTab({
  searchQuery = '',
  users: providedUsers,
  resolvedAuthorsById: providedAuthorsById,
  onNavigatePost,
  onAuthorClick,
}: SavedPostsTabProps) {
  const { savedIds, savedItems, getItemData, updateSavedItemMetadata } = useBookmarks();
  const { users: authUsers, currentUser } = useAuth();
  const { currentSeo } = usePageSeo('saved');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [fetchedMissingEvents, setFetchedMissingEvents] = useState<Record<string, FirestoreEvent>>({});
  const [fetchedMissingAds, setFetchedMissingAds] = useState<Record<string, FirestoreAd>>({});
  const [fetchedMissingPosts, setFetchedMissingPosts] = useState<Record<string, FirestorePost>>({});
  const [extraAuthorsById, setExtraAuthorsById] = useState<Record<string, User>>({});
  const isMountedRef = useRef(true);
  const attemptedDocFetchIdsRef = useRef<Set<string>>(new Set());
  const attemptedAuthorFetchIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubPosts = subscribeToPosts(setFirestorePosts);
    const unsubAds = subscribeToAds(setFirestoreAds);
    const unsubEvents = subscribeToEvents(setFirestoreEvents);
    return () => {
      unsubPosts();
      unsubAds();
      unsubEvents();
    };
  }, []);

  const mergedUsers = useMemo(() => {
    const map = new Map<string, User>();
    const addUser = (u?: User | null) => {
      if (!u || !u.id) return;
      const existing = map.get(u.id);
      if (existing) {
        const mergedAltIds = Array.from(
          new Set([
            ...(existing.alternateIds || []),
            ...(u.alternateIds || []),
            existing.id,
            existing.googleId,
            u.id,
            u.googleId,
          ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0))
        );
        map.set(u.id, { ...existing, ...u, name: u.name || existing.name, alternateIds: mergedAltIds });
      } else {
        map.set(u.id, u);
      }
    };
    authUsers.forEach(addUser);
    providedUsers?.forEach(addUser);
    if (providedAuthorsById) Object.values(providedAuthorsById).forEach(addUser);
    Object.values(extraAuthorsById).forEach(addUser);
    addUser(currentUser);
    return Array.from(map.values());
  }, [authUsers, providedUsers, providedAuthorsById, extraAuthorsById, currentUser]);

  const usersByIdMap = useMemo(() => {
    const map = new Map<string, User>();
    mergedUsers.forEach((u) => {
      if (u.id) map.set(u.id, u);
      if (u.googleId) map.set(u.googleId, u);
      if (u.alternateIds) {
        u.alternateIds.forEach((altId) => {
          if (altId) map.set(altId, u);
        });
      }
    });
    if (providedAuthorsById) {
      Object.entries(providedAuthorsById).forEach(([k, u]) => {
        if (u) map.set(k, u);
      });
    }
    Object.entries(extraAuthorsById).forEach(([k, u]) => {
      if (u) map.set(k, u);
    });
    return map;
  }, [mergedUsers, providedAuthorsById, extraAuthorsById]);

  const allEvents = useMemo(() => {
    const byId = new Map<string, FirestoreEvent>();
    firestoreEvents.forEach((ev) => byId.set(ev.id, ev));
    Object.values(fetchedMissingEvents).forEach((ev) => {
      if (!byId.has(ev.id)) byId.set(ev.id, ev);
    });
    return Array.from(byId.values());
  }, [firestoreEvents, fetchedMissingEvents]);

  const allAds = useMemo(() => {
    const byId = new Map<string, FirestoreAd>();
    firestoreAds.forEach((ad) => byId.set(ad.id, ad));
    Object.values(fetchedMissingAds).forEach((ad) => {
      if (!byId.has(ad.id)) byId.set(ad.id, ad);
    });
    return Array.from(byId.values());
  }, [firestoreAds, fetchedMissingAds]);

  const allPosts = useMemo(() => {
    const byId = new Map<string, FirestorePost>();
    firestorePosts.forEach((p) => byId.set(p.id, p));
    Object.values(fetchedMissingPosts).forEach((p) => {
      if (!byId.has(p.id)) byId.set(p.id, p);
    });
    return Array.from(byId.values());
  }, [firestorePosts, fetchedMissingPosts]);

  // Index live Firestore records by both raw ID and prefix-stripped ID for instant re-hydration
  const liveLookups = useMemo(() => {
    const eventsMap = new Map<string, FirestoreEvent>();
    allEvents.forEach((ev) => {
      eventsMap.set(ev.id, ev);
      eventsMap.set(normalizeLookupId(ev.id), ev);
    });

    const adsMap = new Map<string, FirestoreAd>();
    allAds.forEach((ad) => {
      adsMap.set(ad.id, ad);
      adsMap.set(normalizeLookupId(ad.id), ad);
    });

    const postsMap = new Map<string, FirestorePost>();
    allPosts.forEach((p) => {
      postsMap.set(p.id, p);
      postsMap.set(normalizeLookupId(p.id), p);
    });

    return { eventsMap, adsMap, postsMap };
  }, [allEvents, allAds, allPosts]);

  // Fetch any saved items that aren't present in the capped live subscription snapshots
  useEffect(() => {
    const missingIds = Array.from(new Set(savedIds)).filter((id) => {
      if (DEMO_ITEM_IDS.has(id) || id.startsWith('rss')) return false;
      if (attemptedDocFetchIdsRef.current.has(id)) return false;
      const normId = normalizeLookupId(id);
      const exists =
        liveLookups.eventsMap.has(id) ||
        liveLookups.eventsMap.has(normId) ||
        liveLookups.adsMap.has(id) ||
        liveLookups.adsMap.has(normId) ||
        liveLookups.postsMap.has(id) ||
        liveLookups.postsMap.has(normId);
      return !exists;
    });

    if (missingIds.length === 0) return;
    missingIds.forEach((id) => attemptedDocFetchIdsRef.current.add(id));

    Promise.all(
      missingIds.map(async (id) => {
        const base = getItemData(id) || savedItems[id];
        const cat = (base?.category || base?.type || '').toString().toLowerCase();
        if (cat.includes('event') || cat.includes('dogod') || id.startsWith('dogodek') || id.startsWith('event')) {
          const ev = await getEventById(id).catch(() => null);
          if (ev) return { kind: 'event' as const, item: ev };
        }
        if (cat.includes('ad') || cat.includes('oglas') || id.startsWith('oglas') || id.startsWith('ad')) {
          const ad = await getAdById(id).catch(() => null);
          if (ad) return { kind: 'ad' as const, item: ad };
        }
        const post = await getPostById(id).catch(() => null);
        if (post) return { kind: 'post' as const, item: post };
        const adFallback = await getAdById(id).catch(() => null);
        if (adFallback) return { kind: 'ad' as const, item: adFallback };
        const evFallback = await getEventById(id).catch(() => null);
        if (evFallback) return { kind: 'event' as const, item: evFallback };
        return null;
      })
    ).then((results) => {
      if (!isMountedRef.current) return;
      const newEvents: Record<string, FirestoreEvent> = {};
      const newAds: Record<string, FirestoreAd> = {};
      const newPosts: Record<string, FirestorePost> = {};
      results.forEach((res) => {
        if (!res) return;
        if (res.kind === 'event') newEvents[res.item.id] = res.item;
        if (res.kind === 'ad') newAds[res.item.id] = res.item;
        if (res.kind === 'post') newPosts[res.item.id] = res.item;
      });
      if (Object.keys(newEvents).length > 0) setFetchedMissingEvents((prev) => ({ ...prev, ...newEvents }));
      if (Object.keys(newAds).length > 0) setFetchedMissingAds((prev) => ({ ...prev, ...newAds }));
      if (Object.keys(newPosts).length > 0) setFetchedMissingPosts((prev) => ({ ...prev, ...newPosts }));
    });
  }, [savedIds, savedItems, getItemData, liveLookups]);

  // Collect all saved items, re-hydrating from live Firestore records and registered user profiles
  const allSavedItems: SavedItemData[] = useMemo(() => {
    const uniqueSavedIds = Array.from(new Set(savedIds));

    return uniqueSavedIds.map((id) => {
      const baseData: SavedItemData =
        getItemData(id) ||
        savedItems[id] || {
          id,
          category: id.startsWith('rss')
            ? 'news'
            : id.startsWith('oglas') || id.startsWith('ad')
            ? 'ads'
            : id.startsWith('dogodek') || id.startsWith('event')
            ? 'events'
            : id.startsWith('deal')
            ? 'deals'
            : 'blog',
          title: `Objava #${id}`,
        };

      const normId = normalizeLookupId(id);
      const itemCat = (baseData.category || baseData.type || '').toString().toLowerCase();

      // Match live Firestore document across events / ads / posts
      const matchedEvent =
        liveLookups.eventsMap.get(id) ||
        liveLookups.eventsMap.get(normId) ||
        (!DEMO_ITEM_IDS.has(id) && (itemCat.includes('event') || itemCat.includes('dogod')) && baseData.title
          ? allEvents.find((ev) => slugify(ev.title) === slugify(baseData.title))
          : undefined);

      const matchedAd =
        liveLookups.adsMap.get(id) ||
        liveLookups.adsMap.get(normId) ||
        (!DEMO_ITEM_IDS.has(id) && (itemCat.includes('ad') || itemCat.includes('oglas')) && baseData.title
          ? allAds.find((ad) => slugify(ad.title) === slugify(baseData.title))
          : undefined);

      const matchedPost =
        liveLookups.postsMap.get(id) ||
        liveLookups.postsMap.get(normId) ||
        (!DEMO_ITEM_IDS.has(id) && baseData.title
          ? allPosts.find((p) => slugify(p.title) === slugify(baseData.title))
          : undefined);

      let hydrated: SavedItemData = { ...baseData, id };

      if (matchedEvent) {
        const resolvedDate = resolveEventDisplayDate(matchedEvent);
        const liveAuthorName =
          matchedEvent.authorName?.trim() ||
          (matchedEvent as any).organizer?.trim() ||
          '';
        hydrated = {
          ...hydrated,
          type: 'event',
          category: 'events',
          title: matchedEvent.title || hydrated.title,
          description: matchedEvent.description || hydrated.description,
          categoryName: matchedEvent.categoryName || matchedEvent.category || hydrated.categoryName || 'Dogodek',
          subcategory: matchedEvent.subcategory || hydrated.subcategory,
          subcategoryName: matchedEvent.subcategoryName || hydrated.subcategoryName,
          location: resolvedDate.location || matchedEvent.location || matchedEvent.region || hydrated.location,
          region: matchedEvent.region || hydrated.region,
          date: resolvedDate.dateInfo.fullDate || hydrated.date,
          eventDate: resolvedDate.dateYmd || matchedEvent.eventDate || hydrated.eventDate,
          eventTime: resolvedDate.eventTime || matchedEvent.eventTime || hydrated.eventTime,
          eventDates: matchedEvent.eventDates || hydrated.eventDates,
          eventSchedule: matchedEvent.eventSchedule || hydrated.eventSchedule,
          month: resolvedDate.dateInfo.month || hydrated.month,
          day: resolvedDate.dateInfo.day || hydrated.day,
          price: matchedEvent.price || hydrated.price || 'Vstop prost',
          ticketUrl: matchedEvent.ticketUrl || hydrated.ticketUrl,
          image: matchedEvent.imageUrl || (matchedEvent.images && matchedEvent.images[0]) || hydrated.image,
          images: matchedEvent.images || (matchedEvent as any).imageUrls || hydrated.images,
          tags: matchedEvent.tags || hydrated.tags,
          likesCount: matchedEvent.likesCount ?? hydrated.likesCount,
          interestedCount: matchedEvent.interestedCount ?? hydrated.interestedCount,
          embedCode: (matchedEvent as any).embedCode ?? hydrated.embedCode,
          externalUrl: (matchedEvent as any).externalUrl ?? hydrated.externalUrl,
          isExternalEmbed: (matchedEvent as any).isExternalEmbed ?? hydrated.isExternalEmbed,
          authorId: matchedEvent.authorId || hydrated.authorId,
          authorName: liveAuthorName || hydrated.authorName,
          author: liveAuthorName || hydrated.author,
          organizer: liveAuthorName || hydrated.organizer,
          authorAvatar: matchedEvent.authorAvatar || hydrated.authorAvatar,
          authorRole: matchedEvent.authorRole || hydrated.authorRole,
        };
      } else if (matchedAd) {
        const liveAuthorName = matchedAd.authorName?.trim() || '';
        hydrated = {
          ...hydrated,
          type: 'ad',
          category: 'ads',
          title: matchedAd.title || hydrated.title,
          subtitle: matchedAd.subtitle || hydrated.subtitle,
          description: matchedAd.description || hydrated.description,
          price: matchedAd.price || hydrated.price,
          location: matchedAd.location || matchedAd.region || hydrated.location,
          categoryName: matchedAd.categoryName || matchedAd.category || hydrated.categoryName || 'Mali oglas',
          subcategory: matchedAd.subcategory || hydrated.subcategory,
          subcategoryName: matchedAd.subcategoryName || hydrated.subcategoryName,
          date: formatSlovenianDate(matchedAd.createdAt) || hydrated.date,
          image: matchedAd.imageUrl || ((matchedAd as any).images && (matchedAd as any).images[0]) || hydrated.image,
          images: (matchedAd as any).images || matchedAd.imageUrls || hydrated.images,
          tags: matchedAd.tags || hydrated.tags,
          likesCount: matchedAd.likesCount ?? hydrated.likesCount,
          embedCode: matchedAd.embedCode ?? hydrated.embedCode,
          externalUrl: matchedAd.externalUrl ?? hydrated.externalUrl,
          isExternalEmbed: matchedAd.isExternalEmbed ?? hydrated.isExternalEmbed,
          sourceName: matchedAd.sourceName ?? hydrated.sourceName,
          sourceDomain: matchedAd.sourceDomain ?? hydrated.sourceDomain,
          sourceFavicon: matchedAd.sourceFavicon ?? hydrated.sourceFavicon,
          authorId: matchedAd.authorId || hydrated.authorId,
          authorName: liveAuthorName || hydrated.authorName,
          author: liveAuthorName || hydrated.author,
          authorAvatar: matchedAd.authorAvatar || hydrated.authorAvatar,
          authorRole: matchedAd.authorRole || hydrated.authorRole,
        };
      } else if (matchedPost) {
        const liveAuthorName = matchedPost.authorName?.trim() || '';
        if (matchedPost.category === 'ad') {
          hydrated = {
            ...hydrated,
            type: 'ad',
            category: 'ads',
            title: matchedPost.title || hydrated.title,
            description: matchedPost.content || hydrated.description,
            price: matchedPost.price || hydrated.price,
            location: matchedPost.location || hydrated.location,
            image: matchedPost.imageUrl || (matchedPost.images && matchedPost.images[0]) || hydrated.image,
            images: matchedPost.images || matchedPost.imageUrls || hydrated.images,
            tags: matchedPost.tags || hydrated.tags,
            authorId: matchedPost.authorId || hydrated.authorId,
            authorName: liveAuthorName || hydrated.authorName,
            author: liveAuthorName || hydrated.author,
            authorAvatar: matchedPost.authorAvatar || hydrated.authorAvatar,
            authorRole: matchedPost.authorRole || hydrated.authorRole,
          };
        } else if (matchedPost.category === 'event') {
          const resolvedDate = resolveEventDisplayDate(matchedPost);
          hydrated = {
            ...hydrated,
            type: 'event',
            category: 'events',
            title: matchedPost.title || hydrated.title,
            description: matchedPost.content || hydrated.description,
            location: resolvedDate.location || matchedPost.location || hydrated.location,
            date: resolvedDate.dateInfo.fullDate || hydrated.date,
            eventDate: resolvedDate.dateYmd || matchedPost.eventDate || hydrated.eventDate,
            eventTime: resolvedDate.eventTime || matchedPost.eventTime || hydrated.eventTime,
            eventDates: matchedPost.eventDates || hydrated.eventDates,
            eventSchedule: matchedPost.eventSchedule || hydrated.eventSchedule,
            month: resolvedDate.dateInfo.month || hydrated.month,
            day: resolvedDate.dateInfo.day || hydrated.day,
            price: matchedPost.price || hydrated.price,
            ticketUrl: matchedPost.ticketUrl || hydrated.ticketUrl,
            image: matchedPost.imageUrl || (matchedPost.images && matchedPost.images[0]) || hydrated.image,
            images: matchedPost.images || matchedPost.imageUrls || hydrated.images,
            tags: matchedPost.tags || hydrated.tags,
            authorId: matchedPost.authorId || hydrated.authorId,
            authorName: liveAuthorName || hydrated.authorName,
            author: liveAuthorName || hydrated.author,
            organizer: liveAuthorName || hydrated.organizer,
            authorAvatar: matchedPost.authorAvatar || hydrated.authorAvatar,
            authorRole: matchedPost.authorRole || hydrated.authorRole,
          };
        } else if (isDealFirestorePost(matchedPost)) {
          hydrated = {
            ...hydrated,
            type: 'deal',
            category: 'deals',
            title: matchedPost.title || hydrated.title,
            subtitle: matchedPost.subtitle || hydrated.subtitle,
            description: matchedPost.content || hydrated.description,
            discount: matchedPost.discount || matchedPost.price || hydrated.discount,
            oldPrice: matchedPost.oldPrice || hydrated.oldPrice,
            newPrice: matchedPost.newPrice || hydrated.newPrice,
            startDate: matchedPost.startDate || hydrated.startDate,
            expirationDate: matchedPost.expirationDate || hydrated.expirationDate,
            code: matchedPost.promoCode || hydrated.code,
            link: matchedPost.dealLink || hydrated.link,
            region: matchedPost.location || hydrated.region,
            categoryName: matchedPost.categoryName || hydrated.categoryName || 'Ugodnosti',
            image: matchedPost.imageUrl || (matchedPost.images && matchedPost.images[0]) || hydrated.image,
            images: matchedPost.images || matchedPost.imageUrls || hydrated.images,
            tags: matchedPost.tags || hydrated.tags,
            authorId: matchedPost.authorId || hydrated.authorId,
            authorName: liveAuthorName || hydrated.authorName,
            author: liveAuthorName || hydrated.author,
            partner: liveAuthorName || hydrated.partner,
            authorAvatar: matchedPost.authorAvatar || hydrated.authorAvatar,
            authorRole: matchedPost.authorRole || hydrated.authorRole,
          };
        } else {
          hydrated = {
            ...hydrated,
            type: 'blog',
            category: 'blog',
            title: matchedPost.title || hydrated.title,
            subtitle: matchedPost.subtitle || hydrated.subtitle,
            description: matchedPost.content || hydrated.description,
            categoryName: matchedPost.categoryName || hydrated.categoryName,
            subcategory: matchedPost.subcategory || hydrated.subcategory,
            subcategoryName: matchedPost.subcategoryName || hydrated.subcategoryName,
            location: matchedPost.location || hydrated.location,
            date: formatSlovenianDate(matchedPost.createdAt) || hydrated.date,
            image: matchedPost.imageUrl || (matchedPost.images && matchedPost.images[0]) || hydrated.image,
            images: matchedPost.images || matchedPost.imageUrls || hydrated.images,
            tags: matchedPost.tags || hydrated.tags,
            likesCount: matchedPost.likesCount ?? hydrated.likesCount,
            embedCode: matchedPost.embedCode ?? hydrated.embedCode,
            externalUrl: matchedPost.externalUrl ?? hydrated.externalUrl,
            isExternalEmbed: matchedPost.isExternalEmbed ?? hydrated.isExternalEmbed,
            authorId: matchedPost.authorId || hydrated.authorId,
            authorName: liveAuthorName || hydrated.authorName,
            author: liveAuthorName || hydrated.author,
            authorAvatar: matchedPost.authorAvatar || hydrated.authorAvatar,
            authorRole: matchedPost.authorRole || hydrated.authorRole,
          };
        }
      }

      // Discard stale/dummy fallback authors on non-demo items so real user mapping takes over cleanly
      const sanitizeAuthorString = (val?: string) =>
        !DEMO_ITEM_IDS.has(id) && isDummyPlaceholderAuthor(val) ? undefined : val;

      hydrated.authorName = sanitizeAuthorString(hydrated.authorName);
      hydrated.author = sanitizeAuthorString(hydrated.author);
      hydrated.organizer = sanitizeAuthorString(hydrated.organizer);
      hydrated.partner = sanitizeAuthorString(hydrated.partner);

      // Strictly map post authorId to the global user list first
      const authorIdKey = hydrated.authorId ? String(hydrated.authorId).trim() : '';
      const matchedUserById = authorIdKey
        ? usersByIdMap.get(authorIdKey) ||
          mergedUsers.find(
            (u) =>
              u.id === authorIdKey ||
              u.googleId === authorIdKey ||
              (u.alternateIds && u.alternateIds.includes(authorIdKey))
          )
        : undefined;

      const rawAuthorText =
        hydrated.authorName ||
        hydrated.author ||
        hydrated.organizer ||
        hydrated.partner ||
        '';

      const matchedUserByName =
        !matchedUserById && rawAuthorText
          ? mergedUsers.find(
              (u) =>
                u.name &&
                (u.name.trim().toLowerCase() === rawAuthorText.trim().toLowerCase() ||
                  slugify(u.name) === slugify(rawAuthorText))
            )
          : undefined;

      const matchedUser = matchedUserById || matchedUserByName;

      // Global user profile name always takes precedence over any stored or fallback author text
      const resolvedAuthorName =
        matchedUser?.name?.trim() ||
        rawAuthorText.trim() ||
        undefined;

      const resolvedAuthorId = matchedUser?.id || hydrated.authorId;
      const resolvedAuthorRole = matchedUser?.role || hydrated.authorRole;
      const resolvedAuthorAvatar =
        resolveUserUploadedAvatar(
          matchedUser?.avatar || hydrated.authorAvatar,
          resolvedAuthorId,
          resolvedAuthorName,
          mergedUsers,
          currentUser
        ) || matchedUser?.avatar || hydrated.authorAvatar;

      if (resolvedAuthorName) {
        hydrated.authorName = resolvedAuthorName;
        hydrated.author = resolvedAuthorName;
        if (hydrated.category === 'events' || hydrated.type === 'event') {
          hydrated.organizer = resolvedAuthorName;
        }
        if (hydrated.category === 'deals' || hydrated.type === 'deal') {
          hydrated.partner = resolvedAuthorName;
        }
      }
      if (resolvedAuthorId) hydrated.authorId = resolvedAuthorId;
      if (resolvedAuthorRole) hydrated.authorRole = resolvedAuthorRole;
      if (resolvedAuthorAvatar) hydrated.authorAvatar = resolvedAuthorAvatar;

      return hydrated;
    });
  }, [savedIds, savedItems, getItemData, liveLookups, allEvents, allAds, allPosts, mergedUsers, usersByIdMap, currentUser]);

  // Self-heal any stale/legacy bookmark author metadata cached in localStorage once Firestore author resolves
  useEffect(() => {
    allSavedItems.forEach((item) => {
      if (DEMO_ITEM_IDS.has(item.id) || item.id.startsWith('rss')) return;
      const stored = savedItems[item.id];
      if (!stored) return;
      const needsHeal =
        (item.authorId && item.authorId !== stored.authorId) ||
        (item.authorName && !isDummyPlaceholderAuthor(item.authorName) && item.authorName !== stored.authorName) ||
        (item.author && !isDummyPlaceholderAuthor(item.author) && item.author !== stored.author) ||
        (item.organizer && !isDummyPlaceholderAuthor(item.organizer) && item.organizer !== stored.organizer);

      if (needsHeal) {
        updateSavedItemMetadata(item.id, {
          authorId: item.authorId,
          authorName: item.authorName,
          author: item.author,
          organizer: item.organizer,
          partner: item.partner,
          authorAvatar: item.authorAvatar,
          authorRole: item.authorRole,
        });
      }
    });
  }, [allSavedItems, savedItems, updateSavedItemMetadata]);

  // Fetch any missing author profiles referenced by hydrated saved items (not yet in global users list)
  useEffect(() => {
    const missingAuthorIds = new Set<string>();
    allSavedItems.forEach((item) => {
      const aid = item.authorId ? String(item.authorId).trim() : '';
      if (
        aid &&
        !aid.startsWith('author-') &&
        !aid.startsWith('partner-') &&
        !aid.startsWith('organizer-') &&
        !usersByIdMap.has(aid) &&
        !attemptedAuthorFetchIdsRef.current.has(aid)
      ) {
        missingAuthorIds.add(aid);
      }
    });

    if (missingAuthorIds.size === 0) return;
    missingAuthorIds.forEach((aid) => attemptedAuthorFetchIdsRef.current.add(aid));

    Promise.all(
      Array.from(missingAuthorIds).map(async (aid) => {
        const profile = await fetchUserProfile(aid).catch(() => null);
        return { aid, profile };
      })
    ).then((results) => {
      if (!isMountedRef.current) return;
      const additions: Record<string, User> = {};
      results.forEach(({ aid, profile }) => {
        if (profile) {
          additions[aid] = profile;
          if (profile.id) additions[profile.id] = profile;
          if (profile.googleId) additions[profile.googleId] = profile;
          if (profile.alternateIds) {
            profile.alternateIds.forEach((altId) => {
              if (altId) additions[altId] = profile;
            });
          }
        }
      });
      if (Object.keys(additions).length > 0) {
        setExtraAuthorsById((prev) => ({ ...prev, ...additions }));
      }
    });
  }, [allSavedItems, usersByIdMap]);

  // Calculate category counts
  const countCategory = (cat: string) => {
    return allSavedItems.filter(item => {
      const itemCat = item.category || 'blog';
      if (cat === 'all') return true;
      if (cat === 'news') return itemCat === 'news' || item.type === 'news';
      if (cat === 'ads') return itemCat === 'ads' || item.type === 'ad';
      if (cat === 'events') return itemCat === 'events' || item.type === 'event';
      if (cat === 'blog') return itemCat === 'blog' || item.type === 'blog';
      if (cat === 'deals') return itemCat === 'deals' || item.type === 'deal';
      return false;
    }).length;
  };

  const newsCount = countCategory('news');
  const adsCount = countCategory('ads');
  const eventsCount = countCategory('events');
  const blogCount = countCategory('blog');
  const dealsCount = countCategory('deals');

  // Filter items by search query and category
  const filteredItems = allSavedItems.filter(item => {
    const itemCat = (item.category || item.type || 'blog').toString().toLowerCase();

    // 1. Tab filter check
    if (selectedCategoryTab !== 'all') {
      const matchesTab = 
        (selectedCategoryTab === 'news' && (itemCat.includes('news') || itemCat.includes('novic'))) ||
        (selectedCategoryTab === 'ads' && (itemCat.includes('ad') || itemCat.includes('oglas'))) ||
        (selectedCategoryTab === 'events' && (itemCat.includes('event') || itemCat.includes('dogod'))) ||
        (selectedCategoryTab === 'blog' && (itemCat.includes('blog') || itemCat.includes('post'))) ||
        (selectedCategoryTab === 'deals' && (itemCat.includes('deal') || itemCat.includes('popust')));
      if (!matchesTab) return false;
    }

    // 2. Search query check
    const fullText = [
      item.title,
      item.description,
      item.authorName,
      item.author,
      item.organizer,
      item.partner,
      item.sourceName,
      item.location,
      item.price,
      item.date,
    ].filter(Boolean).join(' ');

    return matchesSearchAndCategory(fullText, itemCat, searchQuery);
  });

  if (savedIds.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm border border-surface-container/50 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-surface-container-low text-outline rounded-full flex items-center justify-center">
          <Bookmark className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-sm text-xl font-bold text-on-surface">Shranjene objave</h1>
          <h2 className="font-body-md text-on-surface-variant max-w-sm mt-1">
            Nimate še shranjenih zaznamkov. Kliknite na ikono zaznamka ob poljubni objavi, novici, malem oglasu ali dogodku, da si jo shranite za kasnejši ogled.
          </h2>
        </div>
      </div>
    );
  }

  const renderSavedItem = (item: SavedItemData, idx: number = 0) => {
    const id = item.id;
    const itemKey = `saved-${id}-${idx}`;
    const itemCat = (item.category || item.type || '').toString().toLowerCase();
    const resolvedAuthor = item.authorName || item.author || item.organizer || item.partner;

    // News (RSS or NewsPost)
    if (itemCat.includes('news') || itemCat.includes('novic') || id.startsWith('rss')) {
      if (item.sourceName || item.pubDate || item.link || id.startsWith('rss')) {
        return <RssPost key={itemKey} id={id} {...item} />;
      }
      return <NewsPost key={itemKey} id={id} {...item} />;
    }

    // Mali Oglasi (AdPost)
    if (itemCat.includes('ad') || itemCat.includes('oglas') || id.startsWith('oglas') || id.startsWith('ad') || id.startsWith('inline-ad')) {
      return (
        <AdPost
          key={itemKey}
          id={id}
          {...item}
          author={resolvedAuthor}
          authorName={resolvedAuthor}
          onNavigatePost={onNavigatePost}
        />
      );
    }

    // Dogodki (EventPost)
    if (itemCat.includes('event') || itemCat.includes('dogod') || id.startsWith('dogodek') || id.startsWith('event')) {
      return (
        <EventPost
          key={itemKey}
          id={id}
          {...item}
          organizer={item.organizer || resolvedAuthor}
          author={resolvedAuthor}
          authorName={item.authorName || resolvedAuthor}
          onNavigatePost={onNavigatePost}
          onAuthorClick={onAuthorClick}
        />
      );
    }

    // Ugodnosti / Popusti (DealPost)
    if (itemCat.includes('deal') || itemCat.includes('popust') || id.startsWith('deal')) {
      return (
        <DealPost
          key={itemKey}
          id={id}
          {...item}
          author={resolvedAuthor}
          authorName={resolvedAuthor}
          partner={item.partner || resolvedAuthor}
          onNavigatePost={onNavigatePost}
        />
      );
    }

    // Blog & Default
    return (
      <BlogPost
        key={itemKey}
        id={id}
        {...item}
        author={resolvedAuthor}
        authorName={resolvedAuthor}
        onNavigatePost={onNavigatePost}
      />
    );
  };

  return (
    <div className="flex flex-col gap-space-md">
      {/* Title & total count */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h1 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            <span>{currentSeo?.h1 || 'Shranjene objave'} ({savedIds.length})</span>
          </h1>
          <h2 className="font-body-sm text-xs text-outline mt-0.5">
            {currentSeo?.h2 || 'Vse vaše zaznamovane novice, mali oglasi, dogodki in blog zapisi na enem mestu'}
          </h2>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-surface-container-low">
        <button
          onClick={() => setSelectedCategoryTab('all')}
          className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            selectedCategoryTab === 'all'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span>Vse</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            selectedCategoryTab === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
          }`}>
            {savedIds.length}
          </span>
        </button>

        {adsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('ads')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'ads'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mali oglasi</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'ads' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {adsCount}
            </span>
          </button>
        )}

        {newsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('news')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'news'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Novice</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'news' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {newsCount}
            </span>
          </button>
        )}

        {eventsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('events')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'events'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Dogodki</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'events' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {eventsCount}
            </span>
          </button>
        )}

        {blogCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('blog')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'blog'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Blog</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'blog' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {blogCount}
            </span>
          </button>
        )}

        {dealsCount > 0 && (
          <button
            onClick={() => setSelectedCategoryTab('deals')}
            className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategoryTab === 'deals'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Popusti</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategoryTab === 'deals' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-outline'
            }`}>
              {dealsCount}
            </span>
          </button>
        )}
      </div>

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-surface-container-low/40 rounded-2xl border border-dashed border-surface-container">
          <Inbox className="w-10 h-10 text-outline" />
          <p className="font-body-md text-on-surface-variant">
            Ni najdenih shranjenih objav za izbrane filtre.
          </p>
          {(selectedCategoryTab !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategoryTab('all');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-md text-xs font-semibold text-on-surface transition-colors"
            >
              Prikaži vse shranjene objave
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-space-md">
          {filteredItems.map((item, idx) => (
            <div key={`saved-wrap-${item.id}-${idx}`} className={getFeedCardAnimationClass(idx)}>
              {renderSavedItem(item, idx)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
