import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit,
  increment,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, Role } from '../contexts/AuthContext';
import { SavedItemData } from '../contexts/BookmarkContext';
import { INITIAL_DEALS, HERO_BENTO_DEALS } from '../data/mockDealsData';
import { INITIAL_BLOG_POSTS, INITIAL_ADS, INITIAL_EVENTS } from '../data/mockFeedData';
import { PromotionConfig, PromotionTargetSection, PromotionBadgeType, EventScheduleSlot } from '../types';
import { slugify } from '../utils/urlUtils';
import { isDummyAvatar } from '../utils/avatarUtils';
import { isLikelyBot } from '../utils/botUtils';
import { estimatePayloadUtf8Bytes } from '../utils/imageUtils';
import {
  UploadedAttachment,
  uploadDataUrlIfPresent,
  replaceDataUrlsInHtmlWithStorage,
} from './storageService';

export type PostAttachment = UploadedAttachment;

/**
 * Maximum logical payload size supported by Portalko (at least 4,000,000 bytes / 4.5 MB).
 * Cloud Firestore enforces a hard 1,048,576 byte (1 MiB) per-document server limit;
 * payloads larger than FIRESTORE_SAFE_DOC_BYTES are automatically deduplicated and sharded
 * into subcollection chunks (`/{collection}/{id}/chunks/chunk_{i}`) on write and rehydrated on read.
 */
export const MAX_ALLOWED_POST_BYTES = 4_500_000;
const FIRESTORE_SAFE_DOC_BYTES = 680_000;
const CHUNK_MAX_UTF8_BYTES = 520_000;

/**
 * Sanitizes an object before calling Firestore updateDoc:
 * - Converts `rejectionReason: undefined` (or any other field where undefined signifies removal) into `deleteField()`
 * - Recursively cleans nested objects and arrays so Firestore updateDoc never throws "Unsupported field value: undefined"
 */
export function sanitizeUpdateData(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || (value === null && (key === 'embedCode' || key === 'embedOrientation'))) {
      if (
        key === 'rejectionReason' ||
        key === 'promotion' ||
        key === 'promotedUntil' ||
        key === 'promotionBadgeType' ||
        key === 'embedCode' ||
        key === 'embedOrientation'
      ) {
        result[key] = deleteField();
      }
      // Omit all other undefined fields so Firestore doesn't reject them
      continue;
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      if (Array.isArray(value)) {
        result[key] = value.map(item => 
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? cleanDataForFirestore(item)
            : item
        ).filter(item => item !== undefined);
      } else {
        // Nested object (e.g. promotion: { targetCategory: undefined, targetSubcategory: undefined })
        result[key] = cleanDataForFirestore(value);
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Strips out keys with undefined values before setDoc or as nested object sanitizer.
 * Recursively cleans nested objects and arrays.
 */
export function cleanDataForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      if (Array.isArray(value)) {
        cleaned[key] = value.map(item =>
          item !== null && typeof item === 'object' && !(item instanceof Date)
            ? cleanDataForFirestore(item)
            : item
        ).filter(item => item !== undefined);
      } else {
        cleaned[key] = cleanDataForFirestore(value);
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const hydratedDocCache = new Map<string, {
  updatedAt?: string;
  chunkCount?: number;
  overflow: Record<string, any>;
}>();

function splitStringByUtf8Bytes(input: string, maxBytes: number): string[] {
  if (!input) return [];
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  if (!encoder) {
    const chunks: string[] = [];
    for (let i = 0; i < input.length; i += Math.floor(maxBytes / 2)) {
      chunks.push(input.slice(i, i + Math.floor(maxBytes / 2)));
    }
    return chunks;
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < input.length) {
    // Fast path for ASCII-heavy strings like base64
    let end = Math.min(input.length, start + maxBytes);
    // Avoid splitting inside a UTF-16 surrogate pair
    if (end < input.length) {
      const code = input.charCodeAt(end - 1);
      if (code >= 0xD800 && code <= 0xDBFF) {
        end--;
      }
    }
    let slice = input.slice(start, end);
    while (encoder.encode(slice).length > maxBytes && end > start + 1) {
      const ratio = maxBytes / Math.max(encoder.encode(slice).length, 1);
      end = Math.max(start + 1, start + Math.floor((end - start) * ratio * 0.95));
      if (end < input.length) {
        const code = input.charCodeAt(end - 1);
        if (code >= 0xD800 && code <= 0xDBFF) {
          end--;
        }
      }
      slice = input.slice(start, end);
    }
    chunks.push(slice);
    start = end;
  }
  return chunks;
}

export function normalizeMediaFields<T extends Record<string, any>>(item: T): T {
  if (!item || typeof item !== 'object') return item;
  const normalized: any = { ...item };
  if (Array.isArray(normalized.images) && normalized.images.length > 0) {
    if (!normalized.imageUrl) {
      normalized.imageUrl = normalized.images[0];
    }
    if (!Array.isArray(normalized.imageUrls) || normalized.imageUrls.length === 0) {
      normalized.imageUrls = normalized.images;
    }
  } else if (Array.isArray(normalized.imageUrls) && normalized.imageUrls.length > 0) {
    normalized.images = normalized.imageUrls;
    if (!normalized.imageUrl) {
      normalized.imageUrl = normalized.imageUrls[0];
    }
  } else if (normalized.imageUrl) {
    normalized.images = [normalized.imageUrl];
    normalized.imageUrls = [normalized.imageUrl];
  }
  return normalized;
}

function deduplicateMediaPayload(payload: Record<string, any>): Record<string, any> {
  const deduped: Record<string, any> = { ...payload };
  if (Array.isArray(deduped.images) && Array.isArray(deduped.imageUrls)) {
    const sameLength = deduped.images.length === deduped.imageUrls.length;
    const sameItems = sameLength && deduped.images.every((v: any, idx: number) => v === deduped.imageUrls[idx]);
    if (sameItems) {
      delete deduped.imageUrls;
    }
  }
  // If imageUrl duplicates images[0] and the document is large, omit duplicate imageUrl
  if (
    deduped.imageUrl &&
    Array.isArray(deduped.images) &&
    deduped.images.length > 0 &&
    deduped.imageUrl === deduped.images[0] &&
    estimatePayloadUtf8Bytes(deduped) > FIRESTORE_SAFE_DOC_BYTES
  ) {
    delete deduped.imageUrl;
  }
  return deduped;
}

/**
 * Ensures any remaining Base64 `data:` strings (images, inline HTML <img>, large avatars)
 * inside a payload are uploaded to Firebase Storage and replaced with compact HTTPS download URLs
 * BEFORE saving the document to Firestore.
 */
async function ensureMediaInFirebaseStorage(
  payload: Record<string, any>,
  collectionName: 'posts' | 'ads' | 'events',
  docId?: string
): Promise<Record<string, any>> {
  const result: Record<string, any> = { ...payload };
  const folder = docId ? `${collectionName}/${docId}` : collectionName;
  const authorId = String(result.authorId || 'user');
  const uploadedCache = new Map<string, string>();

  const uploadUniqueDataUrl = async (val: string, subFolder: string): Promise<string> => {
    if (!val || typeof val !== 'string' || !val.startsWith('data:')) return val;
    const cached = uploadedCache.get(val);
    if (cached) return cached;
    try {
      const url = await uploadDataUrlIfPresent(val, subFolder, authorId);
      const finalUrl = url || val;
      uploadedCache.set(val, finalUrl);
      return finalUrl;
    } catch (err) {
      if (isStorageUploadError(err)) {
        return val;
      }
      throw err;
    }
  };

  if (typeof result.imageUrl === 'string' && result.imageUrl.startsWith('data:')) {
    result.imageUrl = await uploadUniqueDataUrl(result.imageUrl, folder);
  }

  if (Array.isArray(result.images) && result.images.length > 0) {
    const resolvedImages: string[] = [];
    for (const img of result.images) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        resolvedImages.push(await uploadUniqueDataUrl(img, folder));
      } else if (typeof img === 'string' && img.trim()) {
        resolvedImages.push(img);
      }
    }
    result.images = resolvedImages;
    if (!result.imageUrl && resolvedImages[0]) {
      result.imageUrl = resolvedImages[0];
    }
  }

  if (Array.isArray(result.imageUrls) && result.imageUrls.length > 0) {
    const resolvedUrls: string[] = [];
    for (const img of result.imageUrls) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        resolvedUrls.push(await uploadUniqueDataUrl(img, folder));
      } else if (typeof img === 'string' && img.trim()) {
        resolvedUrls.push(img);
      }
    }
    result.imageUrls = resolvedUrls;
  }

  if (typeof result.authorAvatar === 'string' && result.authorAvatar.startsWith('data:') && result.authorAvatar.length > 25_000) {
    result.authorAvatar = await uploadUniqueDataUrl(result.authorAvatar, `avatars/${authorId}`);
  }

  if (typeof result.content === 'string' && result.content.includes('data:')) {
    try {
      result.content = await replaceDataUrlsInHtmlWithStorage(result.content, folder, authorId);
    } catch (err) {
      if (!isStorageUploadError(err)) throw err;
    }
  }

  if (typeof result.description === 'string' && result.description.includes('data:')) {
    try {
      result.description = await replaceDataUrlsInHtmlWithStorage(result.description, folder, authorId);
    } catch (err) {
      if (!isStorageUploadError(err)) throw err;
    }
  }

  return result;
}

function isStorageUploadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Firebase Storage') ||
    msg.includes('storage/') ||
    msg.includes('An unknown error occurred') ||
    msg.includes('Datoteka presega') ||
    msg.includes('presega 2,5 MB') ||
    msg.includes('Izbrana datoteka ni veljavna')
  );
}

function prepareChunkedPayload(rawPayload: Record<string, any>): {
  mainDoc: Record<string, any>;
  chunks: string[];
  overflow: Record<string, any>;
  totalBytes: number;
} {
  const cleaned = cleanDataForFirestore(rawPayload);
  const deduped = deduplicateMediaPayload(cleaned);
  const totalBytes = estimatePayloadUtf8Bytes(deduped);

  if (totalBytes > MAX_ALLOWED_POST_BYTES) {
    throw new Error(
      `Objava presega največjo dovoljeno velikost (${MAX_ALLOWED_POST_BYTES.toLocaleString('sl-SI')} bajtov). Trenutna velikost: ${totalBytes.toLocaleString('sl-SI')} bajtov. Prosimo, zmanjšajte število ali velikost slik.`
    );
  }

  if (totalBytes <= FIRESTORE_SAFE_DOC_BYTES) {
    return {
      mainDoc: deduped,
      chunks: [],
      overflow: {},
      totalBytes,
    };
  }

  // Shard heavy media / content fields into chunks subcollection while keeping metadata light
  const overflow: Record<string, any> = {};
  const lightDoc: Record<string, any> = { ...deduped };

  const moveFieldIfLarge = (field: string, thresholdBytes: number, keepExcerpt = false) => {
    const val = lightDoc[field];
    if (val === undefined) return;
    const fieldBytes = estimatePayloadUtf8Bytes(val);
    if (fieldBytes > thresholdBytes) {
      overflow[field] = val;
      if (keepExcerpt && typeof val === 'string') {
        lightDoc[field] = val.slice(0, 1200);
      } else {
        delete lightDoc[field];
      }
    }
  };

  moveFieldIfLarge('images', 25_000);
  moveFieldIfLarge('imageUrls', 25_000);
  moveFieldIfLarge('imageUrl', 25_000);
  moveFieldIfLarge('attachments', 25_000);
  moveFieldIfLarge('authorAvatar', 25_000);
  moveFieldIfLarge('embedCode', 25_000);
  moveFieldIfLarge('content', 40_000, true);
  moveFieldIfLarge('description', 40_000, true);

  // Final safety pass: move any remaining field > 20KB until mainDoc is safely below FIRESTORE_SAFE_DOC_BYTES
  if (estimatePayloadUtf8Bytes(lightDoc) > FIRESTORE_SAFE_DOC_BYTES) {
    for (const key of Object.keys(lightDoc)) {
      if (['id', 'title', 'category', 'authorId', 'authorName', 'status', 'createdAt', 'updatedAt'].includes(key)) {
        continue;
      }
      if (estimatePayloadUtf8Bytes(lightDoc[key]) > 20_000) {
        overflow[key] = lightDoc[key];
        delete lightDoc[key];
      }
      if (estimatePayloadUtf8Bytes(lightDoc) <= FIRESTORE_SAFE_DOC_BYTES) break;
    }
  }

  const overflowJson = JSON.stringify(overflow);
  const chunks = splitStringByUtf8Bytes(overflowJson, CHUNK_MAX_UTF8_BYTES);

  lightDoc.hasChunkedContent = true;
  lightDoc.chunkCount = chunks.length;
  lightDoc.totalPayloadBytes = totalBytes;

  return {
    mainDoc: lightDoc,
    chunks,
    overflow,
    totalBytes,
  };
}

async function writeChunksSubcollection(
  collectionName: 'posts' | 'ads' | 'events',
  docId: string,
  chunks: string[],
  previousChunkCount: number = 0
): Promise<void> {
  if (chunks.length > 0) {
    const now = new Date().toISOString();
    await Promise.all(
      chunks.map((chunkStr, idx) =>
        setDoc(doc(db, collectionName, docId, 'chunks', `chunk_${idx}`), {
          index: idx,
          data: chunkStr,
          updatedAt: now,
        })
      )
    );
  }

  // Delete any excess stale chunks from previous larger revisions
  if (previousChunkCount > chunks.length) {
    const cleanupPromises: Promise<void>[] = [];
    for (let i = chunks.length; i < previousChunkCount; i++) {
      cleanupPromises.push(
        deleteDoc(doc(db, collectionName, docId, 'chunks', `chunk_${i}`)).catch(() => {})
      );
    }
    await Promise.all(cleanupPromises);
  }
}

async function deleteChunksSubcollection(
  collectionName: 'posts' | 'ads' | 'events',
  docId: string
): Promise<void> {
  hydratedDocCache.delete(`${collectionName}/${docId}`);
  try {
    const snap = await getDocs(collection(db, collectionName, docId, 'chunks'));
    if (!snap.empty) {
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => {})));
    }
  } catch {
    // Ignore cleanup errors if no chunks exist
  }
}

function mergeCachedChunksSync<T extends Record<string, any>>(
  collectionName: 'posts' | 'ads' | 'events',
  item: T
): { hydrated: T; needsAsyncFetch: boolean } {
  if (!item || !item.hasChunkedContent) {
    return { hydrated: normalizeMediaFields(item), needsAsyncFetch: false };
  }
  const cacheKey = `${collectionName}/${item.id}`;
  const cached = hydratedDocCache.get(cacheKey);
  if (
    cached &&
    (!item.updatedAt || cached.updatedAt === item.updatedAt) &&
    (!item.chunkCount || cached.chunkCount === item.chunkCount)
  ) {
    return {
      hydrated: normalizeMediaFields({ ...item, ...cached.overflow }),
      needsAsyncFetch: false,
    };
  }
  return { hydrated: normalizeMediaFields(item), needsAsyncFetch: true };
}

async function hydrateDocumentWithChunks<T extends Record<string, any>>(
  collectionName: 'posts' | 'ads' | 'events',
  item: T
): Promise<T> {
  if (!item || !item.hasChunkedContent) {
    return normalizeMediaFields(item);
  }
  const { hydrated, needsAsyncFetch } = mergeCachedChunksSync(collectionName, item);
  if (!needsAsyncFetch) {
    return hydrated;
  }

  try {
    const chunksSnap = await getDocs(collection(db, collectionName, item.id, 'chunks'));
    if (chunksSnap.empty) {
      return hydrated;
    }
    const ordered = chunksSnap.docs
      .map(d => d.data() as { index?: number; data?: string })
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const fullJson = ordered.map(c => c.data || '').join('');
    if (!fullJson) return hydrated;

    const overflow = JSON.parse(fullJson) as Record<string, any>;
    hydratedDocCache.set(`${collectionName}/${item.id}`, {
      updatedAt: item.updatedAt,
      chunkCount: item.chunkCount || ordered.length,
      overflow,
    });
    return normalizeMediaFields({ ...item, ...overflow });
  } catch (err) {
    console.warn(`[Firestore:${collectionName}] Failed to hydrate chunks for ${item.id}:`, err);
    return hydrated;
  }
}

function safeSaveArrayToLocalStorage(storageKey: string, items: any[]): void {
  try {
    const serialized = JSON.stringify(items);
    if (serialized.length <= 1_800_000) {
      localStorage.setItem(storageKey, serialized);
      return;
    }
    // Strip large base64 data URLs from localStorage fallback so browser quota is never exceeded
    const lightItems = items.slice(0, 60).map(item => {
      const copy: any = { ...item };
      if (typeof copy.imageUrl === 'string' && copy.imageUrl.length > 50_000) {
        delete copy.imageUrl;
      }
      if (Array.isArray(copy.images)) {
        copy.images = copy.images.filter((u: any) => typeof u === 'string' && u.length <= 50_000);
        if (copy.images.length === 0) delete copy.images;
      }
      if (Array.isArray(copy.imageUrls)) {
        delete copy.imageUrls;
      }
      if (typeof copy.authorAvatar === 'string' && copy.authorAvatar.length > 30_000) {
        delete copy.authorAvatar;
      }
      if (Array.isArray(copy.attachments)) {
        copy.attachments = copy.attachments.filter((a: any) => typeof a?.url === 'string' && a.url.length <= 50_000);
        if (copy.attachments.length === 0) delete copy.attachments;
      }
      if (typeof copy.content === 'string' && copy.content.length > 80_000) {
        copy.content = copy.content.slice(0, 1200);
      }
      return copy;
    });
    localStorage.setItem(storageKey, JSON.stringify(lightItems));
  } catch {
    // Ignore storage quota error
  }
}

/**
 * Deduplicates Firestore real-time onSnapshot listeners across multiple mounted components.
 * Only ONE real-time connection to Firestore is opened per collection, preventing quota exhaustion.
 */
function createSharedSubscription<T>(
  fetcher: (callback: (data: T) => void) => () => void,
  initialFallback?: () => T
): (callback: (data: T) => void) => () => void {
  const subscribers = new Set<(data: T) => void>();
  let currentData: T | null = null;
  let unsubscribeFirestore: (() => void) | null = null;
  let teardownTimeout: any = null;

  return (callback: (data: T) => void): (() => void) => {
    // If visitor is an automated bot/crawler, serve cached/initial data without opening persistent Firestore streams
    if (isLikelyBot()) {
      if (currentData !== null) {
        callback(currentData);
      } else if (initialFallback) {
        try {
          const fb = initialFallback();
          if (fb) callback(fb);
        } catch {}
      }
      return () => {};
    }

    subscribers.add(callback);

    if (teardownTimeout) {
      clearTimeout(teardownTimeout);
      teardownTimeout = null;
    }

    if (currentData !== null) {
      callback(currentData);
    } else if (initialFallback) {
      try {
        const fb = initialFallback();
        if (fb) callback(fb);
      } catch {}
    }

    if (!unsubscribeFirestore) {
      unsubscribeFirestore = fetcher((data: T) => {
        currentData = data;
        subscribers.forEach(cb => {
          try { cb(data); } catch (e) { console.warn(e); }
        });
      });
    }

    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0 && unsubscribeFirestore) {
        teardownTimeout = setTimeout(() => {
          if (subscribers.size === 0 && unsubscribeFirestore) {
            unsubscribeFirestore();
            unsubscribeFirestore = null;
            teardownTimeout = null;
          }
        }, 30000);
      }
    };
  };
}

export interface FirestorePost {
  id: string;
  type?: 'post' | 'blog' | 'deal' | 'news' | string;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  make?: string;
  thirdLevelCategory?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  imageUrl?: string;
  embedCode?: string;
  embedOrientation?: 'horizontal' | 'vertical' | 'auto';
  images?: string[];
  imageUrls?: string[];
  attachments?: PostAttachment[];
  price?: string;
  oldPrice?: string;
  newPrice?: string;
  startDate?: string;
  expirationDate?: string;
  discount?: string;
  promoCode?: string;
  dealLink?: string;
  eventDate?: string;
  eventTime?: string;
  eventDates?: string[];
  eventTimes?: string[];
  eventSchedule?: EventScheduleSlot[];
  ticketUrl?: string;
  location?: string;
  region?: string;
  tags?: string[];
  status?: 'published' | 'osnutek' | 'pending' | 'rejected' | 'archived';
  rejectionReason?: string;
  likesCount?: number;
  likedBy?: string[];
  commentsCount?: number;
  viewsCount?: number;
  // Chunking metadata for >1MB payloads (up to 4.5MB)
  hasChunkedContent?: boolean;
  chunkCount?: number;
  totalPayloadBytes?: number;
  // Promotion / Featured Post fields
  isPromoted?: boolean;
  promotion?: PromotionConfig;
  promotedUntil?: string;
  promotionBadgeType?: PromotionBadgeType;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreAd {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  make?: string;
  thirdLevelCategory?: string;
  price: string;
  location: string;
  region?: string;
  phone?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  imageUrl?: string;
  embedCode?: string;
  embedOrientation?: 'horizontal' | 'vertical' | 'auto';
  images?: string[];
  imageUrls?: string[];
  attachments?: PostAttachment[];
  tags?: string[];
  status: 'active' | 'sold' | 'closed' | 'pending' | 'rejected';
  rejectionReason?: string;
  likesCount?: number;
  likedBy?: string[];
  viewsCount?: number;
  // Chunking metadata for >1MB payloads (up to 4.5MB)
  hasChunkedContent?: boolean;
  chunkCount?: number;
  totalPayloadBytes?: number;
  // Promotion / Featured Post fields
  isPromoted?: boolean;
  promotion?: PromotionConfig;
  promotedUntil?: string;
  promotionBadgeType?: PromotionBadgeType;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreEvent {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  location: string;
  region?: string;
  eventDate?: string;
  eventTime?: string;
  eventDates?: string[];
  eventTimes?: string[];
  eventSchedule?: EventScheduleSlot[];
  ticketUrl?: string;
  date?: string;
  price?: string;
  category: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  make?: string;
  thirdLevelCategory?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  imageUrl?: string;
  embedCode?: string;
  embedOrientation?: 'horizontal' | 'vertical' | 'auto';
  images?: string[];
  imageUrls?: string[];
  attachments?: PostAttachment[];
  tags?: string[];
  interestedCount?: number;
  likesCount?: number;
  likedBy?: string[];
  viewsCount?: number;
  // Chunking metadata for >1MB payloads (up to 4.5MB)
  hasChunkedContent?: boolean;
  chunkCount?: number;
  totalPayloadBytes?: number;
  isPromoted?: boolean;
  promotion?: PromotionConfig;
  promotedUntil?: string;
  promotionBadgeType?: PromotionBadgeType;
  status?: 'published' | 'pending' | 'rejected';
  rejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ---------------- USER OPERATIONS ----------------

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    const existing = await getDoc(userRef);
    if (!existing.exists()) {
      await setDoc(userRef, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified !== undefined ? user.emailVerified : false,
        verificationToken: user.verificationToken || null,
        verificationSentAt: user.verificationSentAt || null,
        avatar: user.avatar || '',
        bio: user.bio || '',
        username: user.username || '',
        socialLinks: user.socialLinks || [],
        profileMenu: user.profileMenu || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const updatePayload: Record<string, any> = {
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        bio: user.bio !== undefined ? user.bio : (existing.data().bio || ''),
        username: user.username !== undefined ? user.username : (existing.data().username || ''),
        socialLinks: user.socialLinks !== undefined ? user.socialLinks : (existing.data().socialLinks || []),
        profileMenu: user.profileMenu !== undefined ? user.profileMenu : (existing.data().profileMenu || []),
        updatedAt: new Date().toISOString(),
      };
      if (user.status !== undefined) updatePayload.status = user.status;
      if (user.role !== undefined) updatePayload.role = user.role;
      if (user.emailVerified !== undefined) updatePayload.emailVerified = user.emailVerified;
      if (user.verificationToken !== undefined) updatePayload.verificationToken = user.verificationToken;
      if (user.verificationSentAt !== undefined) updatePayload.verificationSentAt = user.verificationSentAt;
      await updateDoc(userRef, updatePayload);
    }
  } catch (error) {
    console.warn(`[Firestore syncUserProfile] Could not sync user ${user.id} to Firestore:`, error);
  }
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: data.id || userId,
        name: data.name,
        email: data.email,
        role: (data.role || 'registered') as Role,
        status: (data.status || 'active') as 'active' | 'banned',
        avatar: data.avatar,
        bio: data.bio,
        username: data.username,
        socialLinks: data.socialLinks,
        profileMenu: data.profileMenu,
        verificationRequested: data.verificationRequested,
        verificationRequestedAt: data.verificationRequestedAt,
        verificationNote: data.verificationNote,
        emailVerified: data.emailVerified !== undefined ? data.emailVerified : true,
        verificationToken: data.verificationToken || undefined,
        verificationSentAt: data.verificationSentAt || undefined,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Searches Firestore for a user matching a verification token or email.
 * Critical for verifying accounts across different browsers, devices, or incognito sessions.
 */
export async function findUserForVerification(token: string, email?: string): Promise<User | null> {
  const cleanToken = token.trim();
  const path = 'users';

  try {
    // 1. First query by verificationToken
    if (cleanToken) {
      const qToken = query(collection(db, path), where('verificationToken', '==', cleanToken), limit(1));
      const snap = await getDocs(qToken);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          id: data.id || d.id,
          name: data.name || '',
          email: data.email || '',
          role: (data.role || 'registered') as Role,
          status: (data.status || 'active') as 'active' | 'banned',
          avatar: data.avatar,
          bio: data.bio,
          username: data.username,
          password: data.password,
          socialLinks: data.socialLinks,
          profileMenu: data.profileMenu,
          emailVerified: data.emailVerified,
          verificationToken: data.verificationToken,
          verificationSentAt: data.verificationSentAt,
        };
      }
    }

    // 2. Query by email if provided
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const qEmail = query(collection(db, path), where('email', '==', cleanEmail), limit(1));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const d = snapEmail.docs[0];
        const data = d.data();
        return {
          id: data.id || d.id,
          name: data.name || '',
          email: data.email || '',
          role: (data.role || 'registered') as Role,
          status: (data.status || 'active') as 'active' | 'banned',
          avatar: data.avatar,
          bio: data.bio,
          username: data.username,
          password: data.password,
          socialLinks: data.socialLinks,
          profileMenu: data.profileMenu,
          emailVerified: data.emailVerified,
          verificationToken: data.verificationToken,
          verificationSentAt: data.verificationSentAt,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn(`[Firestore findUserForVerification] Query failed for token/email:`, error);
    return null;
  }
}

/**
 * Searches Firestore for a user matching a password reset token or email.
 */
export async function findUserForPasswordReset(token: string, email?: string): Promise<User | null> {
  const cleanToken = token.trim();
  const path = 'users';

  try {
    if (cleanToken) {
      const qToken = query(collection(db, path), where('passwordResetToken', '==', cleanToken), limit(1));
      const snap = await getDocs(qToken);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          role: (data.role || 'registered') as Role,
          status: (data.status || 'active') as 'active' | 'banned',
          avatar: data.avatar,
          bio: data.bio,
          username: data.username,
          password: data.password,
          socialLinks: data.socialLinks,
          profileMenu: data.profileMenu,
          emailVerified: data.emailVerified !== undefined ? data.emailVerified : true,
          passwordResetToken: data.passwordResetToken,
          passwordResetSentAt: data.passwordResetSentAt,
          createdAt: data.createdAt,
        };
      }
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const qEmail = query(collection(db, path), where('email', '==', cleanEmail), limit(1));
      const snap = await getDocs(qEmail);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          role: (data.role || 'registered') as Role,
          status: (data.status || 'active') as 'active' | 'banned',
          avatar: data.avatar,
          bio: data.bio,
          username: data.username,
          password: data.password,
          socialLinks: data.socialLinks,
          profileMenu: data.profileMenu,
          emailVerified: data.emailVerified !== undefined ? data.emailVerified : true,
          passwordResetToken: data.passwordResetToken,
          passwordResetSentAt: data.passwordResetSentAt,
          createdAt: data.createdAt,
        };
      }
    }

    return null;
  } catch (error) {
    console.warn(`[Firestore findUserForPasswordReset] Query failed:`, error);
    return null;
  }
}

/**
 * Marks user's email as verified in Firestore across both user document ID and email queries.
 */
export async function verifyUserEmailInFirestore(userId: string, email?: string): Promise<void> {
  const path = userId ? `users/${userId}` : 'users';
  const confirmationPayload = {
    emailVerified: true,
    verificationToken: null,
    verificationConfirmedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    // 1. Direct update or merge by document ID
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, confirmationPayload, { merge: true }).catch(() => {});
    }

    // 2. Also search and update all matching documents for this email in Firestore
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(qEmail).catch(() => null);
      if (snap && !snap.empty) {
        for (const d of snap.docs) {
          await setDoc(d.ref, confirmationPayload, { merge: true }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.warn(`[Firestore verifyUserEmailInFirestore] Note while confirming user ${userId} / ${email}:`, error);
  }
}

const DELETED_USER_IDS_KEY = 'portal_deleted_user_ids';
const DELETED_USER_EMAILS_KEY = 'portal_deleted_user_emails';

// Seed list of known dummy / removed accounts so they never resurrect anywhere
const SEED_DELETED_IDS = new Set<string>(['u2', 'u3', 'u4']);
const SEED_DELETED_EMAILS = new Set<string>([
  'luka.n@example.com',
  'luka.novak.portal@gmail.com',
  'maja.z@example.com',
  'janez.h@example.com',
]);

export function isDummyUserEmail(email?: string | null, id?: string | null): boolean {
  const e = (email || '').toLowerCase().trim();
  const i = (id || '').trim();
  if (SEED_DELETED_IDS.has(i) || (e && SEED_DELETED_EMAILS.has(e))) return true;
  return (
    e.startsWith('luka.n@') ||
    e.startsWith('luka.novak.portal@') ||
    e.startsWith('maja.z@') ||
    e.startsWith('janez.h@')
  );
}

export function getDeletedUserIds(): Set<string> {
  const result = new Set<string>(SEED_DELETED_IDS);
  try {
    const raw = localStorage.getItem(DELETED_USER_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(item => { if (typeof item === 'string' && item.trim()) result.add(item.trim()); });
      }
    }
  } catch {}
  return result;
}

export function getDeletedUserEmails(): Set<string> {
  const result = new Set<string>(SEED_DELETED_EMAILS);
  try {
    const raw = localStorage.getItem(DELETED_USER_EMAILS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(item => { if (typeof item === 'string' && item.trim()) result.add(item.toLowerCase().trim()); });
      }
    }
  } catch {}
  return result;
}

export function recordUserAsDeletedLocally(userId: string, email?: string): void {
  const ids = getDeletedUserIds();
  const emails = getDeletedUserEmails();
  if (userId) ids.add(userId.trim());
  if (email && email.trim()) emails.add(email.toLowerCase().trim());

  try {
    localStorage.setItem(DELETED_USER_IDS_KEY, JSON.stringify(Array.from(ids)));
    localStorage.setItem(DELETED_USER_EMAILS_KEY, JSON.stringify(Array.from(emails)));
  } catch {}
}

export function isUserDeletedSync(userId?: string | null, email?: string | null): boolean {
  if (isDummyUserEmail(email, userId)) return true;
  const ids = getDeletedUserIds();
  const emails = getDeletedUserEmails();
  if (userId && ids.has(userId.trim())) return true;
  if (email) {
    const clean = email.toLowerCase().trim();
    if (emails.has(clean)) return true;
  }
  return false;
}

export async function syncDeletedUsersFromFirestore(): Promise<void> {
  try {
    const ref = doc(db, 'settings', 'deleted_users');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const ids: string[] = Array.isArray(data.ids) ? data.ids : [];
      const emails: string[] = Array.isArray(data.emails) ? data.emails : [];
      const localIds = getDeletedUserIds();
      const localEmails = getDeletedUserEmails();
      ids.forEach(id => { if (typeof id === 'string' && id.trim()) localIds.add(id.trim()); });
      emails.forEach(e => { if (typeof e === 'string' && e.trim()) localEmails.add(e.toLowerCase().trim()); });
      localStorage.setItem(DELETED_USER_IDS_KEY, JSON.stringify(Array.from(localIds)));
      localStorage.setItem(DELETED_USER_EMAILS_KEY, JSON.stringify(Array.from(localEmails)));
    }
  } catch {}
}

export async function deleteUserFromFirestore(userId: string, email?: string): Promise<void> {
  const path = `users/${userId}`;
  const cleanEmail = (email || '').toLowerCase().trim();

  // Record tombstone locally immediately
  recordUserAsDeletedLocally(userId, cleanEmail);

  try {
    // 1. Delete document by path
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef).catch(() => {});

    // 2. Delete any documents where 'email' matches
    if (cleanEmail) {
      try {
        const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const emailSnap = await getDocs(qEmail);
        for (const d of emailSnap.docs) {
          await deleteDoc(d.ref).catch(() => {});
        }
      } catch {}
    }

    // 3. Delete any documents where 'id' field matches
    try {
      const qId = query(collection(db, 'users'), where('id', '==', userId));
      const idSnap = await getDocs(qId);
      for (const d of idSnap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    } catch {}

    // 4. Persist tombstone into settings/deleted_users
    try {
      const tombstoneRef = doc(db, 'settings', 'deleted_users');
      const payload: Record<string, any> = {
        ids: arrayUnion(userId),
        updatedAt: new Date().toISOString(),
      };
      if (cleanEmail) {
        payload.emails = arrayUnion(cleanEmail);
      }
      await setDoc(tombstoneRef, payload, { merge: true });
    } catch {}
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUsersList(): Promise<User[]> {
  const path = 'users';
  try {
    await syncDeletedUsersFromFirestore().catch(() => {});
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    const users: User[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      const email = (data.email || '').toLowerCase().trim();
      const docId = d.id;
      const effectiveId = data.id || docId;

      if (isDummyUserEmail(email, effectiveId) || isUserDeletedSync(effectiveId, email) || isUserDeletedSync(docId, email)) {
        // Automatically cleanup dummy and deleted users from Firestore
        deleteDoc(d.ref).catch(() => {});
        continue;
      }

      users.push({
        id: effectiveId,
        name: data.name || '',
        email: data.email || '',
        role: (data.role || 'registered') as Role,
        status: (data.status || 'active') as 'active' | 'banned',
        avatar: data.avatar,
        bio: data.bio,
        username: data.username,
        socialLinks: data.socialLinks,
        profileMenu: data.profileMenu,
        verificationRequested: data.verificationRequested,
        verificationRequestedAt: data.verificationRequestedAt,
        verificationNote: data.verificationNote,
        emailVerified: data.emailVerified !== undefined ? data.emailVerified : true,
        verificationToken: data.verificationToken || undefined,
        verificationSentAt: data.verificationSentAt || undefined,
        createdAt: data.createdAt || undefined,
        passwordResetToken: data.passwordResetToken || undefined,
        passwordResetSentAt: data.passwordResetSentAt || undefined,
      });
    }
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

const getCachedUsers = (): User[] => {
  try {
    const raw = localStorage.getItem('cached_firestore_users');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
};

function rawSubscribeToUsers(onUsers: (users: User[]) => void): () => void {
  const path = 'users';
  try {
    syncDeletedUsersFromFirestore().catch(() => {});
    const q = query(collection(db, path), limit(100));
    return onSnapshot(q, (snapshot) => {
      const users: User[] = [];
      snapshot.docs.forEach(d => {
        const data = d.data();
        const email = (data.email || '').toLowerCase().trim();
        const docId = d.id;
        const effectiveId = data.id || docId;

        if (isDummyUserEmail(email, effectiveId) || isUserDeletedSync(effectiveId, email) || isUserDeletedSync(docId, email)) {
          // Automatically cleanup dummy and deleted users from database
          deleteDoc(d.ref).catch(() => {});
          return;
        }

        users.push({
          id: effectiveId,
          name: data.name || '',
          email: data.email || '',
          role: (data.role || 'registered') as Role,
          status: (data.status || 'active') as 'active' | 'banned',
          avatar: data.avatar,
          bio: data.bio,
          username: data.username,
          password: data.password,
          socialLinks: data.socialLinks,
          profileMenu: data.profileMenu,
          verificationRequested: data.verificationRequested,
          verificationRequestedAt: data.verificationRequestedAt,
          verificationNote: data.verificationNote,
          emailVerified: data.emailVerified !== undefined ? data.emailVerified : true,
          verificationToken: data.verificationToken || undefined,
          verificationSentAt: data.verificationSentAt || undefined,
          createdAt: data.createdAt || undefined,
          passwordResetToken: data.passwordResetToken || undefined,
          passwordResetSentAt: data.passwordResetSentAt || undefined,
        });
      });
      try {
        localStorage.setItem('cached_firestore_users', JSON.stringify(users));
      } catch {}
      onUsers(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      const cached = getCachedUsers();
      if (cached.length > 0) {
        onUsers(cached);
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    const cached = getCachedUsers();
    if (cached.length > 0) {
      onUsers(cached);
    }
    return () => {};
  }
}

export const subscribeToUsers = createSharedSubscription(rawSubscribeToUsers, getCachedUsers);

export async function updateUserInFirestore(userId: string, data: Partial<User>, fallbackUser?: User): Promise<void> {
  const path = `users/${userId}`;
  const cleanEmail = (data.email || fallbackUser?.email || '').toLowerCase().trim();

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef).catch(() => null);

    const updatePayload: Record<string, any> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.emailVerified === true) {
      updatePayload.emailVerified = true;
      updatePayload.verificationToken = null;
      updatePayload.verificationConfirmedAt = data.verificationConfirmedAt || new Date().toISOString();
    }

    if (data.avatar !== undefined) {
      updatePayload.avatar = (data.avatar && !isDummyAvatar(data.avatar)) ? data.avatar : '';
    }

    if (!snap || !snap.exists()) {
      const base: Partial<User> = fallbackUser || {};
      const fullDoc = {
        id: userId,
        name: data.name || base.name || 'Uporabnik',
        email: data.email || base.email || (cleanEmail ? cleanEmail : `${userId}@portalko.net`),
        role: data.role || base.role || 'registered',
        status: data.status || base.status || 'active',
        avatar: (data.avatar && !isDummyAvatar(data.avatar)) ? data.avatar : ((base.avatar && !isDummyAvatar(base.avatar)) ? base.avatar : ''),
        bio: data.bio !== undefined ? data.bio : (base.bio || ''),
        username: data.username !== undefined ? data.username : (base.username || `@${userId}`),
        socialLinks: data.socialLinks !== undefined ? data.socialLinks : (base.socialLinks || []),
        profileMenu: data.profileMenu !== undefined ? data.profileMenu : (base.profileMenu || []),
        verificationRequested: data.verificationRequested !== undefined ? data.verificationRequested : (base.verificationRequested || false),
        verificationRequestedAt: data.verificationRequestedAt !== undefined ? data.verificationRequestedAt : (base.verificationRequestedAt || ''),
        verificationNote: data.verificationNote !== undefined ? data.verificationNote : (base.verificationNote || ''),
        emailVerified: data.emailVerified !== undefined ? data.emailVerified : (base.emailVerified !== undefined ? base.emailVerified : false),
        verificationToken: data.emailVerified === true ? null : (data.verificationToken !== undefined ? data.verificationToken : (base.verificationToken || '')),
        verificationSentAt: data.verificationSentAt !== undefined ? data.verificationSentAt : (base.verificationSentAt || ''),
        verificationConfirmedAt: data.verificationConfirmedAt !== undefined ? data.verificationConfirmedAt : (base.verificationConfirmedAt || ''),
        createdAt: base.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userRef, cleanDataForFirestore(fullDoc), { merge: true });
    } else {
      await setDoc(userRef, sanitizeUpdateData(updatePayload), { merge: true });
    }

    // Also update any other Firestore document matching the same email to prevent stale overwrites
    if (cleanEmail) {
      const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snapEmail = await getDocs(qEmail).catch(() => null);
      if (snapEmail && !snapEmail.empty) {
        for (const d of snapEmail.docs) {
          if (d.id !== userId) {
            await setDoc(d.ref, sanitizeUpdateData(updatePayload), { merge: true }).catch(() => {});
          }
        }
      }
    }

    if (data.avatar !== undefined) {
      syncUserAvatarToAuthorContent(userId, data.avatar, fallbackUser?.name || data.name).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Propagates updated user avatar across the user's events, posts and ads in Firestore
 */
export async function syncUserAvatarToAuthorContent(userId: string, newAvatar: string, authorName?: string): Promise<void> {
  if (!userId) return;
  const cleanAvatar = (newAvatar && !isDummyAvatar(newAvatar)) ? newAvatar : '';

  try {
    // 1. Update events authored by this specific user ID
    const eventsSnap = await getDocs(collection(db, 'events'));
    const eventPromises: Promise<any>[] = [];
    eventsSnap.forEach((d) => {
      const ev = d.data();
      const matchesUser = ev.authorId === userId;
      if (matchesUser && ev.authorAvatar !== cleanAvatar) {
        eventPromises.push(updateDoc(d.ref, { authorAvatar: cleanAvatar, updatedAt: new Date().toISOString() }).catch(() => {}));
      }
    });
    await Promise.all(eventPromises);

    // 2. Update posts authored by this specific user ID
    const postsSnap = await getDocs(collection(db, 'posts'));
    const postPromises: Promise<any>[] = [];
    postsSnap.forEach((d) => {
      const p = d.data();
      const matchesUser = p.authorId === userId;
      if (matchesUser && p.authorAvatar !== cleanAvatar) {
        postPromises.push(updateDoc(d.ref, { authorAvatar: cleanAvatar, updatedAt: new Date().toISOString() }).catch(() => {}));
      }
    });
    await Promise.all(postPromises);

    // 3. Update ads authored by this specific user ID
    const adsSnap = await getDocs(collection(db, 'ads'));
    const adPromises: Promise<any>[] = [];
    adsSnap.forEach((d) => {
      const a = d.data();
      const matchesUser = a.authorId === userId;
      if (matchesUser && a.authorAvatar !== cleanAvatar) {
        adPromises.push(updateDoc(d.ref, { authorAvatar: cleanAvatar, updatedAt: new Date().toISOString() }).catch(() => {}));
      }
    });
    await Promise.all(adPromises);
  } catch (err) {
    console.warn('[syncUserAvatarToAuthorContent] Failed to propagate avatar:', err);
  }
}

// ---------------- POSTS OPERATIONS ----------------

export const KNOWN_ADMIN_IDS = new Set(['admin', 'u1', 'superadmin', 'AABsRoeGCgaddFMh9S2cZqN9CaG3']);
export const KNOWN_ADMIN_NAMES = new Set(['superadmin', 'uredništvo', 'administrator', 'admin']);

export function isUserAdminIdentity(id?: string, name?: string, role?: string): boolean {
  if (id && (KNOWN_ADMIN_IDS.has(id) || (auth.currentUser && id === auth.currentUser.uid))) return true;
  if (name && KNOWN_ADMIN_NAMES.has(name.trim().toLowerCase())) return true;
  if (role === 'superadmin' || role === 'admin') return true;
  return false;
}

const getCachedPosts = (): FirestorePost[] => {
  try {
    const raw = localStorage.getItem('cached_firestore_posts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Build initial fallback posts from mock data
  const allMockDeals = [...INITIAL_DEALS, ...HERO_BENTO_DEALS];
  const fallbackDeals: FirestorePost[] = allMockDeals.map(d => ({
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    content: d.description,
    category: 'deal',
    categoryName: d.categoryName || 'Ugodnosti',
    authorId: `partner-${d.partner.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    authorName: d.partner,
    authorRole: d.partnerRole || 'Preverjen trgovec',
    authorAvatar: d.partnerAvatar || '',
    price: d.newPrice || d.discount,
    oldPrice: d.oldPrice,
    newPrice: d.newPrice,
    discount: d.discount,
    promoCode: d.code,
    status: 'published',
    imageUrl: d.image,
    images: d.images,
    region: d.region,
    location: d.location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  const fallbackBlogs: FirestorePost[] = INITIAL_BLOG_POSTS.map(b => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    content: b.description,
    category: 'blog',
    categoryName: 'Blog',
    authorId: b.authorId || `author-${b.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    authorName: b.author,
    authorRole: b.authorRole || 'Avtor',
    authorAvatar: b.authorAvatar || '',
    status: 'published',
    imageUrl: b.image,
    location: b.location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return [...fallbackDeals, ...fallbackBlogs];
};

function rawSubscribeToPosts(onPosts: (posts: FirestorePost[]) => void): () => void {
  const path = 'posts';
  let hydrationEpoch = 0;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
      const epoch = ++hydrationEpoch;
      const allMockDeals = [...INITIAL_DEALS, ...HERO_BENTO_DEALS];
      const rawPosts: FirestorePost[] = snapshot.docs.map(d => {
        const item = {
          id: d.id,
          ...(d.data() as Omit<FirestorePost, 'id'>),
        };
        const mockDeal = allMockDeals.find(x => x.id === item.id);
        const baseBlogId = item.id.replace(/-p\d+$/, '');
        const mockBlog = INITIAL_BLOG_POSTS.find(x => x.id === item.id || x.id === baseBlogId);

        // Sanitize mock deals if they were edited: ensure they stay in Ugodnosti and keep partner as author
        if (mockDeal) {
          if (item.category === 'blog' || item.category === 'post' || !item.category) {
            item.category = mockDeal.category || 'deal';
            item.categoryName = mockDeal.categoryName || 'Ugodnosti';
          }
          if (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName) {
            item.authorName = mockDeal.partner;
            item.authorRole = mockDeal.partnerRole || 'Preverjen trgovec';
            item.authorAvatar = mockDeal.partnerAvatar || '';
            item.authorId = `partner-${mockDeal.partner.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          }
        } else if (mockBlog) {
          if (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName) {
            item.authorName = mockBlog.author;
            item.authorRole = 'Avtor';
            item.authorAvatar = mockBlog.authorAvatar || '';
            item.authorId = `author-${mockBlog.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          }
        }
        return item;
      });

      let anyNeedsAsync = false;
      const syncPosts = rawPosts.map(p => {
        const { hydrated, needsAsyncFetch } = mergeCachedChunksSync('posts', p);
        if (needsAsyncFetch) anyNeedsAsync = true;
        return hydrated;
      });

      safeSaveArrayToLocalStorage('cached_firestore_posts', syncPosts);
      onPosts(syncPosts);

      if (anyNeedsAsync) {
        Promise.all(rawPosts.map(p => hydrateDocumentWithChunks('posts', p)))
          .then(hydratedPosts => {
            if (epoch !== hydrationEpoch) return;
            safeSaveArrayToLocalStorage('cached_firestore_posts', hydratedPosts);
            onPosts(hydratedPosts);
          })
          .catch(() => {});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      onPosts(getCachedPosts());
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    onPosts(getCachedPosts());
    return () => {};
  }
}

export const subscribeToPosts = createSharedSubscription(rawSubscribeToPosts, getCachedPosts);

export async function createPostInFirestore(post: Omit<FirestorePost, 'id'> & { id?: string }): Promise<string> {
  const path = 'posts';
  console.group('🔥 [Firestore createPostInFirestore] Starting post creation');
  let postRefId = '';
  try {
    const postRef = doc(collection(db, path));
    postRefId = postRef.id;
    const now = new Date().toISOString();
    const newPost: FirestorePost = {
      ...post,
      id: postRef.id,
      status: post.status || 'published',
      createdAt: now,
      updatedAt: now,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
    };

    const storageResolvedPost = await ensureMediaInFirebaseStorage(newPost, 'posts', postRef.id);
    const prepared = prepareChunkedPayload(storageResolvedPost);
    console.log(
      `📦 [Firestore:createPost] Payload prepared for collection "posts" (ID: ${postRef.id}, total: ${prepared.totalBytes.toLocaleString('sl-SI')} B, chunks: ${prepared.chunks.length}):`,
      prepared.mainDoc
    );
    console.log('🔍 [Firestore:createPost] Verifying post metadata: status="' + prepared.mainDoc.status + '", authorRole="' + prepared.mainDoc.authorRole + '", category="' + prepared.mainDoc.category + '"');

    if (prepared.chunks.length > 0) {
      // Cache overflow before writing parent doc so local listener hydrates instantaneously
      hydratedDocCache.set(`posts/${postRef.id}`, {
        updatedAt: now,
        chunkCount: prepared.chunks.length,
        overflow: prepared.overflow,
      });
      await writeChunksSubcollection('posts', postRef.id, prepared.chunks, 0);
    }

    await setDoc(postRef, prepared.mainDoc);
    console.log('✅ [Firestore:createPost] Document successfully persisted in Firestore with ID:', postRef.id, 'status:', prepared.mainDoc.status);

    const fullHydratedPost = normalizeMediaFields(cleanDataForFirestore(storageResolvedPost)) as FirestorePost;

    // Optimistically update local cache so the newly created post is instantly visible
    try {
      const cached = getCachedPosts();
      const updated = [fullHydratedPost, ...cached.filter(p => p.id !== newPost.id)];
      safeSaveArrayToLocalStorage('cached_firestore_posts', updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('portal_posts_updated', { detail: fullHydratedPost }));
      }
    } catch (cacheErr) {
      console.warn('Note: Could not update local posts cache:', cacheErr);
    }

    console.groupEnd();
    return postRef.id;
  } catch (error) {
    console.error('❌ [Firestore:createPost] Error caught while writing post document:', error);
    console.groupEnd();
    if (isStorageUploadError(error) || (error instanceof Error && error.message.includes('največjo dovoljeno velikost'))) {
      throw error;
    }
    // Clean up orphaned chunks if main doc write failed
    if (postRefId) {
      deleteChunksSubcollection('posts', postRefId).catch(() => {});
    }
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updatePostInFirestore(postId: string, data: Partial<FirestorePost>): Promise<void> {
  const path = `posts/${postId}`;
  try {
    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);

    const allMockDeals = [...INITIAL_DEALS, ...HERO_BENTO_DEALS];
    const mockDeal = allMockDeals.find(d => d.id === postId);
    const baseBlogId = postId.replace(/-p\d+$/, '');
    const mockBlog = INITIAL_BLOG_POSTS.find(b => b.id === postId || b.id === baseBlogId);

    const isDeal = Boolean(mockDeal) || 
                   postId.startsWith('deal-') || 
                   postId.startsWith('hero-bento-') || 
                   data.category === 'deal' || 
                   data.category === 'ugodnosti' || 
                   data.category?.startsWith('deal') || 
                   data.categoryName === 'Ugodnosti' || 
                   data.categoryName === 'Ugodnost' ||
                   Boolean(data.price && data.category !== 'ad' && data.category !== 'event');

    if (!snap.exists()) {
      // Determine authentic original author (NEVER default to the editing admin/superadmin!)
      const originalAuthorName = (data.authorName && data.authorName !== auth.currentUser?.displayName && data.authorName !== 'Superadmin')
        ? data.authorName
        : mockDeal?.partner || mockBlog?.author || data.authorName || 'Uporabnik';

      const originalAuthorId = (data.authorId && data.authorId !== auth.currentUser?.uid && data.authorId !== 'admin')
        ? data.authorId
        : mockDeal
          ? `partner-${mockDeal.partner.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
          : mockBlog
            ? `author-${mockBlog.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
            : (originalAuthorName ? `author-${originalAuthorName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : `original-author-${postId}`);

      const originalAuthorRole = (data.authorRole && data.authorRole !== 'superadmin' && data.authorRole !== 'admin')
        ? data.authorRole
        : mockDeal?.partnerRole || (mockBlog ? 'Avtor' : 'Član skupnosti');

      const originalAuthorAvatar = data.authorAvatar || mockDeal?.partnerAvatar || (mockBlog as any)?.authorAvatar || '';

      const finalCategory = isDeal
        ? (data.category && data.category !== 'blog' && data.category !== 'post' && data.category !== 'splosno' ? data.category : (mockDeal?.category || 'deal'))
        : (data.category && data.category !== 'splosno' ? data.category : ((mockBlog as any)?.category || data.category || 'splosno'));

      const finalCategoryName = isDeal
        ? (data.categoryName || mockDeal?.categoryName || 'Ugodnosti')
        : (data.categoryName || (mockBlog as any)?.categoryName || 'Blog');

      const now = new Date().toISOString();
      const rawNewPost: Record<string, any> = {
        ...data,
        id: postId,
        title: data.title || mockDeal?.title || mockBlog?.title || 'Objava',
        content: data.content || mockDeal?.description || mockBlog?.description || '',
        category: finalCategory,
        categoryName: finalCategoryName,
        status: data.status || 'published',
        imageUrl: data.imageUrl || mockDeal?.image || mockBlog?.image || '',
        price: data.price || (mockDeal ? (mockDeal.discount || (mockDeal as any).price) : '') || '',
        oldPrice: data.oldPrice || (mockDeal as any)?.oldPrice || '',
        newPrice: data.newPrice || (mockDeal as any)?.newPrice || '',
        startDate: data.startDate || '',
        expirationDate: data.expirationDate || (mockDeal as any)?.expirationDate || '',
        discount: data.discount || (mockDeal ? mockDeal.discount : '') || '',
        promoCode: data.promoCode || (mockDeal ? mockDeal.code : '') || '',
        dealLink: data.dealLink || (mockDeal ? mockDeal.link : '') || '',
        location: data.location || (mockDeal ? mockDeal.region : '') || '',
        likesCount: data.likesCount || (mockDeal?.votes) || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: now,
        updatedAt: now,
        authorId: originalAuthorId,
        authorName: originalAuthorName,
        authorRole: originalAuthorRole,
        authorAvatar: originalAuthorAvatar,
      };

      const storageReadyNewPost = await ensureMediaInFirebaseStorage(rawNewPost, 'posts', postId);
      const prepared = prepareChunkedPayload(storageReadyNewPost);
      if (prepared.chunks.length > 0) {
        hydratedDocCache.set(`posts/${postId}`, {
          updatedAt: now,
          chunkCount: prepared.chunks.length,
          overflow: prepared.overflow,
        });
        await writeChunksSubcollection('posts', postId, prepared.chunks, 0);
      }

      await setDoc(postRef, prepared.mainDoc);
    } else {
      const rawExisting = { id: snap.id, ...(snap.data() as Omit<FirestorePost, 'id'>) };
      const prevChunkCount = rawExisting.hasChunkedContent ? (rawExisting.chunkCount || 0) : 0;
      const existing = rawExisting.hasChunkedContent
        ? await hydrateDocumentWithChunks('posts', rawExisting)
        : rawExisting;

      const safeData: Record<string, any> = { ...data };

      // STRICT REQUIREMENT: Original author MUST remain the same after post has been edited by superadmin or admin
      delete safeData.authorId;
      delete safeData.authorName;
      delete safeData.authorRole;
      delete safeData.authorAvatar;
      delete safeData.createdAt;

      // STRICT REQUIREMENT: The edited post must always stay in same original category
      const existingIsDeal = existing.category === 'deal' || 
                             existing.category === 'ugodnosti' || 
                             existing.category?.startsWith('deal') || 
                             existing.categoryName === 'Ugodnosti' || 
                             existing.categoryName === 'Ugodnost' ||
                             isDeal;

      if (existingIsDeal) {
        // If it was in Ugodnosti, prevent it from ever being changed to 'blog' or 'post'
        if (!safeData.category || safeData.category === 'blog' || safeData.category === 'post' || safeData.category === 'splosno') {
          safeData.category = existing.category && existing.category !== 'blog' && existing.category !== 'post' ? existing.category : 'deal';
        }
        safeData.categoryName = existing.categoryName && existing.categoryName !== 'Blog' ? existing.categoryName : 'Ugodnosti';
      } else if (existing.category) {
        // If update provided a fallback or empty category, stay in existing category
        if (!safeData.category || (safeData.category === 'blog' && existing.category !== 'blog')) {
          safeData.category = existing.category;
        }
        if (existing.categoryName && !safeData.categoryName) {
          safeData.categoryName = existing.categoryName;
        }
      }

      // Auto-heal if existing doc in Firestore had author previously overwritten to admin/superadmin
      const currentAuthorIsAdmin = isUserAdminIdentity(existing.authorId, existing.authorName, existing.authorRole);
      if (mockDeal && (currentAuthorIsAdmin || existing.category === 'blog' || existing.category === 'post')) {
        safeData.authorName = mockDeal.partner;
        safeData.authorRole = mockDeal.partnerRole || 'Preverjen trgovec';
        safeData.authorAvatar = mockDeal.partnerAvatar || '';
        safeData.authorId = `partner-${mockDeal.partner.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        safeData.category = mockDeal.category || 'deal';
        safeData.categoryName = mockDeal.categoryName || 'Ugodnosti';
      } else if (mockBlog && currentAuthorIsAdmin) {
        safeData.authorName = mockBlog.author;
        safeData.authorRole = 'Avtor';
        safeData.authorAvatar = mockBlog.authorAvatar || '';
        safeData.authorId = `author-${mockBlog.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }

      const now = new Date().toISOString();
      const storageReadySafeData = await ensureMediaInFirebaseStorage(safeData, 'posts', postId);
      const mergedDoc: Record<string, any> = {
        ...existing,
        ...storageReadySafeData,
        id: postId,
        updatedAt: now,
      };
      // Remove chunk metadata so prepareChunkedPayload recomputes cleanly
      delete mergedDoc.hasChunkedContent;
      delete mergedDoc.chunkCount;
      delete mergedDoc.totalPayloadBytes;

      // Sync primary imageUrl changes into images array when images isn't explicitly supplied
      if (storageReadySafeData.imageUrl !== undefined && storageReadySafeData.images === undefined) {
        const existingImgs = Array.isArray(existing.images) ? [...existing.images] : [];
        if (storageReadySafeData.imageUrl) {
          mergedDoc.images = [storageReadySafeData.imageUrl, ...existingImgs.slice(1)].filter(Boolean);
        } else {
          mergedDoc.images = existingImgs.slice(1).filter(Boolean);
        }
        delete mergedDoc.imageUrls;
      }

      // Respect explicit undefined/null removals (e.g., rejectionReason, embedCode)
      const removableKeys = ['rejectionReason', 'promotion', 'promotedUntil', 'promotionBadgeType', 'embedCode', 'embedOrientation'];
      for (const k of removableKeys) {
        if (k in storageReadySafeData && (storageReadySafeData[k] === undefined || storageReadySafeData[k] === null)) {
          delete mergedDoc[k];
        }
      }

      const finalMergedDoc = await ensureMediaInFirebaseStorage(mergedDoc, 'posts', postId);
      const prepared = prepareChunkedPayload(finalMergedDoc);

      if (prepared.chunks.length > 0 || prevChunkCount > 0) {
        if (prepared.chunks.length > 0) {
          hydratedDocCache.set(`posts/${postId}`, {
            updatedAt: now,
            chunkCount: prepared.chunks.length,
            overflow: prepared.overflow,
          });
        } else {
          hydratedDocCache.delete(`posts/${postId}`);
        }
        await writeChunksSubcollection('posts', postId, prepared.chunks, prevChunkCount);
        await setDoc(postRef, prepared.mainDoc);
      } else {
        await updateDoc(postRef, sanitizeUpdateData({
          ...storageReadySafeData,
          ...(finalMergedDoc.images !== undefined ? { images: finalMergedDoc.images } : {}),
          updatedAt: now,
        }));
      }
    }
  } catch (error) {
    if (isStorageUploadError(error) || (error instanceof Error && error.message.includes('največjo dovoljeno velikost'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePostInFirestore(postId: string): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await deleteChunksSubcollection('posts', postId);
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleItemLikeInFirestore(
  targetType: 'post' | 'ad' | 'event' | 'blog' | 'news' | 'deal',
  targetId: string,
  userId: string,
  increment: boolean
): Promise<{ likesCount?: number; liked: boolean }> {
  // 1. Update user's personal likes subcollection in Firestore
  if (userId) {
    try {
      const userLikeRef = doc(db, 'users', userId, 'likes', targetId);
      if (increment) {
        await setDoc(userLikeRef, {
          id: targetId,
          userId,
          targetId,
          targetType,
          createdAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(userLikeRef);
      }
    } catch (error) {
      console.warn('Could not persist like in user subcollection:', error);
    }
  }

  // 2. Determine target collection in Firestore
  let colName = 'posts';
  if (targetType === 'ad') colName = 'ads';
  else if (targetType === 'event') colName = 'events';

  let itemRef = doc(db, colName, targetId);
  let snap = await getDoc(itemRef);

  // If not found in guessed collection, try fallback collections
  if (!snap.exists()) {
    const fallbackCols = ['posts', 'ads', 'events'].filter(c => c !== colName);
    for (const fc of fallbackCols) {
      const altRef = doc(db, fc, targetId);
      const altSnap = await getDoc(altRef);
      if (altSnap.exists()) {
        itemRef = altRef;
        snap = altSnap;
        colName = fc;
        break;
      }
    }
  }

  let finalCount: number | undefined;
  if (snap.exists()) {
    try {
      const data = snap.data();
      const current = data?.likesCount || 0;
      const likedBy = Array.isArray(data?.likedBy) ? [...data.likedBy] : [];
      let updatedLikedBy: string[];
      if (increment) {
        updatedLikedBy = likedBy.includes(userId) ? likedBy : [...likedBy, userId];
        finalCount = Math.max(updatedLikedBy.length, current + 1);
      } else {
        updatedLikedBy = likedBy.filter(uid => uid !== userId);
        finalCount = Math.max(0, current - 1);
      }
      await updateDoc(itemRef, {
        likesCount: finalCount,
        likedBy: updatedLikedBy,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${colName}/${targetId}`);
    }
  }

  return { likesCount: finalCount, liked: increment };
}

export function subscribeToUserLikes(userId: string, onLikes: (likedIds: string[]) => void): () => void {
  const path = `users/${userId}/likes`;
  try {
    const q = query(collection(db, 'users', userId, 'likes'));
    return onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map(d => d.id);
      onLikes(ids);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export function subscribeToUserReactions(userId: string, onReactions: (reactions: Record<string, 'like' | 'love' | 'dislike'>) => void): () => void {
  const path = `users/${userId}/reactions`;
  try {
    const q = query(collection(db, 'users', userId, 'reactions'));
    return onSnapshot(q, (snapshot) => {
      const reactions: Record<string, 'like' | 'love' | 'dislike'> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data && data.reactionType) {
          reactions[doc.id] = data.reactionType as 'like' | 'love' | 'dislike';
        }
      });
      onReactions(reactions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export async function toggleItemReactionInFirestore(
  targetType: 'post' | 'ad' | 'event' | 'blog' | 'news' | 'deal',
  targetId: string,
  userId: string,
  newReaction: 'like' | 'love' | 'dislike' | null,
  previousReaction: 'like' | 'love' | 'dislike' | null
): Promise<{ likesCount: number; lovesCount: number; dislikesCount: number }> {
  // 1. Update user's personal reactions subcollection
  if (userId) {
    try {
      const userReactionRef = doc(db, 'users', userId, 'reactions', targetId);
      if (newReaction) {
        await setDoc(userReactionRef, {
          id: targetId,
          userId,
          targetId,
          targetType,
          reactionType: newReaction,
          createdAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(userReactionRef);
      }

      // Also maintain backward compatibility with 'likes' subcollection
      const userLikeRef = doc(db, 'users', userId, 'likes', targetId);
      if (newReaction === 'like') {
        await setDoc(userLikeRef, {
          id: targetId,
          userId,
          targetId,
          targetType,
          createdAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(userLikeRef);
      }
    } catch (error) {
      console.warn('Could not persist reaction in user subcollection:', error);
    }
  }

  // 2. Determine target collection
  let colName = 'posts';
  if (targetType === 'ad') colName = 'ads';
  else if (targetType === 'event') colName = 'events';

  let itemRef = doc(db, colName, targetId);
  let snap = await getDoc(itemRef);

  if (!snap.exists()) {
    const fallbackCols = ['posts', 'ads', 'events'].filter(c => c !== colName);
    for (const fc of fallbackCols) {
      const altRef = doc(db, fc, targetId);
      const altSnap = await getDoc(altRef);
      if (altSnap.exists()) {
        itemRef = altRef;
        snap = altSnap;
        colName = fc;
        break;
      }
    }
  }

  let finalLikes = 0;
  let finalLoves = 0;
  let finalDislikes = 0;

  if (snap.exists()) {
    try {
      const data = snap.data();
      let likesCount = data?.likesCount || 0;
      let lovesCount = data?.lovesCount || 0;
      let dislikesCount = data?.dislikesCount || 0;

      let likedBy = Array.isArray(data?.likedBy) ? [...data.likedBy] : [];
      let lovedBy = Array.isArray(data?.lovedBy) ? [...data.lovedBy] : [];
      let dislikedBy = Array.isArray(data?.dislikedBy) ? [...data.dislikedBy] : [];

      // Remove from previous reaction if existed
      if (previousReaction === 'like') {
        likedBy = likedBy.filter(uid => uid !== userId);
        likesCount = Math.max(0, likesCount - 1);
      } else if (previousReaction === 'love') {
        lovedBy = lovedBy.filter(uid => uid !== userId);
        lovesCount = Math.max(0, lovesCount - 1);
      } else if (previousReaction === 'dislike') {
        dislikedBy = dislikedBy.filter(uid => uid !== userId);
        dislikesCount = Math.max(0, dislikesCount - 1);
      }

      // Add to new reaction if specified
      if (newReaction === 'like') {
        if (!likedBy.includes(userId)) likedBy.push(userId);
        likesCount = Math.max(likedBy.length, likesCount + 1);
      } else if (newReaction === 'love') {
        if (!lovedBy.includes(userId)) lovedBy.push(userId);
        lovesCount = Math.max(lovedBy.length, lovesCount + 1);
      } else if (newReaction === 'dislike') {
        if (!dislikedBy.includes(userId)) dislikedBy.push(userId);
        dislikesCount = Math.max(dislikedBy.length, dislikesCount + 1);
      }

      finalLikes = likesCount;
      finalLoves = lovesCount;
      finalDislikes = dislikesCount;

      await updateDoc(itemRef, {
        likesCount: finalLikes,
        lovesCount: finalLoves,
        dislikesCount: finalDislikes,
        likedBy,
        lovedBy,
        dislikedBy,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${colName}/${targetId}`);
    }
  }

  return { likesCount: finalLikes, lovesCount: finalLoves, dislikesCount: finalDislikes };
}

export async function togglePostLikeInFirestore(postId: string, increment: boolean, userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (uid) {
    await toggleItemLikeInFirestore('post', postId, uid, increment);
    return;
  }
  const path = `posts/${postId}`;
  try {
    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const current = snap.data()?.likesCount || 0;
      await updateDoc(postRef, {
        likesCount: increment ? current + 1 : Math.max(0, current - 1),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------- ADS (MALI OGLASI) OPERATIONS ----------------

export const getCachedAds = (): FirestoreAd[] => {
  try {
    const raw = localStorage.getItem('cached_firestore_ads');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Fallback to mock ads
  return INITIAL_ADS.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    category: a.category || 'ostalo',
    categoryName: a.categoryName || 'Mali oglasi',
    price: a.price,
    location: a.location,
    authorId: a.authorId || `author-${a.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    authorName: a.author,
    authorRole: a.authorRole || 'Uporabnik',
    authorAvatar: (a.authorAvatar && !isDummyAvatar(a.authorAvatar)) ? a.authorAvatar : undefined,
    imageUrl: a.image,
    images: a.images,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

function rawSubscribeToAds(onAds: (ads: FirestoreAd[]) => void): () => void {
  const path = 'ads';
  let hydrationEpoch = 0;

  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const epoch = ++hydrationEpoch;
      const rawAds: FirestoreAd[] = snapshot.docs.map(d => {
        const item = {
          id: d.id,
          ...(d.data() as Omit<FirestoreAd, 'id'>),
        };
        const mockAd = INITIAL_ADS.find(x => x.id === item.id);
        if (mockAd && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
          item.authorName = mockAd.author;
          item.authorRole = 'Uporabnik';
          item.authorAvatar = ((mockAd as any).authorAvatar && !isDummyAvatar((mockAd as any).authorAvatar)) ? (mockAd as any).authorAvatar : undefined;
          item.authorId = `author-${mockAd.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
        return item;
      });

      let anyNeedsAsync = false;
      const syncAds = rawAds.map(a => {
        const { hydrated, needsAsyncFetch } = mergeCachedChunksSync('ads', a);
        if (needsAsyncFetch) anyNeedsAsync = true;
        return hydrated;
      });

      safeSaveArrayToLocalStorage('cached_firestore_ads', syncAds);
      onAds(syncAds);

      if (anyNeedsAsync) {
        Promise.all(rawAds.map(a => hydrateDocumentWithChunks('ads', a)))
          .then(hydratedAds => {
            if (epoch !== hydrationEpoch) return;
            safeSaveArrayToLocalStorage('cached_firestore_ads', hydratedAds);
            onAds(hydratedAds);
          })
          .catch(() => {});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      onAds(getCachedAds());
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    onAds(getCachedAds());
    return () => {};
  }
}

export const subscribeToAds = createSharedSubscription(rawSubscribeToAds, getCachedAds);

export async function createAdInFirestore(ad: Omit<FirestoreAd, 'id'> & { id?: string }): Promise<string> {
  const path = 'ads';
  let adRefId = '';
  try {
    const adRef = doc(collection(db, path));
    adRefId = adRef.id;
    const now = new Date().toISOString();
    const newAd: FirestoreAd = {
      ...ad,
      id: adRef.id,
      status: ad.status || 'active',
      createdAt: now,
      updatedAt: now,
    };
    const storageReadyAd = await ensureMediaInFirebaseStorage(newAd, 'ads', adRef.id);
    const prepared = prepareChunkedPayload(storageReadyAd);
    if (prepared.chunks.length > 0) {
      hydratedDocCache.set(`ads/${adRef.id}`, {
        updatedAt: now,
        chunkCount: prepared.chunks.length,
        overflow: prepared.overflow,
      });
      await writeChunksSubcollection('ads', adRef.id, prepared.chunks, 0);
    }
    await setDoc(adRef, prepared.mainDoc);
    return adRef.id;
  } catch (error) {
    if (isStorageUploadError(error) || (error instanceof Error && error.message.includes('največjo dovoljeno velikost'))) {
      throw error;
    }
    if (adRefId) {
      deleteChunksSubcollection('ads', adRefId).catch(() => {});
    }
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updateAdInFirestore(adId: string, data: Partial<FirestoreAd>): Promise<void> {
  const path = `ads/${adId}`;
  try {
    const adRef = doc(db, 'ads', adId);
    const snap = await getDoc(adRef);
    const mockAd = INITIAL_ADS.find(a => a.id === adId);

    if (!snap.exists()) {
      const isAuthorAdmin = isUserAdminIdentity(data.authorId, data.authorName, data.authorRole);
      const originalAuthorName = mockAd 
        ? mockAd.author 
        : (data.authorName && !isAuthorAdmin ? data.authorName : 'Uporabnik');

      const originalAuthorId = mockAd
        ? `author-${mockAd.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : (data.authorId && !isAuthorAdmin ? data.authorId : `author-${originalAuthorName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);

      const originalAuthorRole = (mockAd as any)?.authorRole || (data.authorRole && !isAuthorAdmin ? data.authorRole : 'Uporabnik');
      const originalAuthorAvatar = ((mockAd as any)?.authorAvatar && !isDummyAvatar((mockAd as any).authorAvatar))
        ? (mockAd as any).authorAvatar
        : (data.authorAvatar && !isDummyAvatar(data.authorAvatar) ? data.authorAvatar : undefined);
      const finalCategory = data.category && data.category !== 'splosno' ? data.category : (mockAd?.category || data.category || 'ostalo');

      const now = new Date().toISOString();
      const rawPayload: Record<string, any> = {
        ...data,
        id: adId,
        title: data.title || mockAd?.title || 'Mali oglas',
        description: data.description || mockAd?.description || '',
        category: finalCategory,
        price: data.price || mockAd?.price || 'Po dogovoru',
        location: data.location || mockAd?.location || 'Slovenija',
        phone: data.phone || '',
        imageUrl: data.imageUrl || mockAd?.image || '',
        status: data.status || 'active',
        createdAt: now,
        updatedAt: now,
        authorId: originalAuthorId,
        authorName: originalAuthorName,
        authorRole: originalAuthorRole,
        authorAvatar: originalAuthorAvatar,
      };

      const storageReadyAd = await ensureMediaInFirebaseStorage(rawPayload, 'ads', adId);
      const prepared = prepareChunkedPayload(storageReadyAd);
      if (prepared.chunks.length > 0) {
        hydratedDocCache.set(`ads/${adId}`, {
          updatedAt: now,
          chunkCount: prepared.chunks.length,
          overflow: prepared.overflow,
        });
        await writeChunksSubcollection('ads', adId, prepared.chunks, 0);
      }

      await setDoc(adRef, prepared.mainDoc);
    } else {
      const rawExisting = { id: snap.id, ...(snap.data() as Omit<FirestoreAd, 'id'>) };
      const prevChunkCount = rawExisting.hasChunkedContent ? (rawExisting.chunkCount || 0) : 0;
      const existing = rawExisting.hasChunkedContent
        ? await hydrateDocumentWithChunks('ads', rawExisting)
        : rawExisting;

      const safeData: Record<string, any> = { ...data };

      // Strictly preserve original author & category
      delete safeData.authorId;
      delete safeData.authorName;
      delete safeData.authorRole;
      delete safeData.authorAvatar;
      delete safeData.createdAt;

      if (existing.category && (!safeData.category || safeData.category === 'ostalo' || safeData.category === 'splosno')) {
        safeData.category = existing.category;
      }

      // Auto-heal if existing ad in Firestore was previously corrupted to admin/superadmin
      const currentAuthorIsAdmin = isUserAdminIdentity(existing.authorId, existing.authorName, existing.authorRole);
      if (mockAd && currentAuthorIsAdmin) {
        safeData.authorName = mockAd.author;
        safeData.authorRole = 'Uporabnik';
        safeData.authorAvatar = ((mockAd as any).authorAvatar && !isDummyAvatar((mockAd as any).authorAvatar)) ? (mockAd as any).authorAvatar : undefined;
        safeData.authorId = `author-${mockAd.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }

      const now = new Date().toISOString();
      const storageReadySafeData = await ensureMediaInFirebaseStorage(safeData, 'ads', adId);
      const mergedDoc: Record<string, any> = {
        ...existing,
        ...storageReadySafeData,
        id: adId,
        updatedAt: now,
      };
      delete mergedDoc.hasChunkedContent;
      delete mergedDoc.chunkCount;
      delete mergedDoc.totalPayloadBytes;

      if (storageReadySafeData.imageUrl !== undefined && storageReadySafeData.images === undefined) {
        const existingImgs = Array.isArray(existing.images) ? [...existing.images] : [];
        if (storageReadySafeData.imageUrl) {
          mergedDoc.images = [storageReadySafeData.imageUrl, ...existingImgs.slice(1)].filter(Boolean);
        } else {
          mergedDoc.images = existingImgs.slice(1).filter(Boolean);
        }
        delete mergedDoc.imageUrls;
      }

      const removableKeys = ['rejectionReason', 'promotion', 'promotedUntil', 'promotionBadgeType', 'embedCode', 'embedOrientation'];
      for (const k of removableKeys) {
        if (k in storageReadySafeData && (storageReadySafeData[k] === undefined || storageReadySafeData[k] === null)) {
          delete mergedDoc[k];
        }
      }

      const finalMergedAd = await ensureMediaInFirebaseStorage(mergedDoc, 'ads', adId);
      const prepared = prepareChunkedPayload(finalMergedAd);
      if (prepared.chunks.length > 0 || prevChunkCount > 0) {
        if (prepared.chunks.length > 0) {
          hydratedDocCache.set(`ads/${adId}`, {
            updatedAt: now,
            chunkCount: prepared.chunks.length,
            overflow: prepared.overflow,
          });
        } else {
          hydratedDocCache.delete(`ads/${adId}`);
        }
        await writeChunksSubcollection('ads', adId, prepared.chunks, prevChunkCount);
        await setDoc(adRef, prepared.mainDoc);
      } else {
        await updateDoc(adRef, sanitizeUpdateData({
          ...storageReadySafeData,
          ...(finalMergedAd.images !== undefined ? { images: finalMergedAd.images } : {}),
          updatedAt: now,
        }));
      }
    }
  } catch (error) {
    if (isStorageUploadError(error) || (error instanceof Error && error.message.includes('največjo dovoljeno velikost'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAdInFirestore(adId: string): Promise<void> {
  const path = `ads/${adId}`;
  try {
    await deleteChunksSubcollection('ads', adId);
    await deleteDoc(doc(db, 'ads', adId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------- EVENTS (DOGODKI) OPERATIONS ----------------

export const getCachedEvents = (): FirestoreEvent[] => {
  try {
    const raw = localStorage.getItem('cached_firestore_events');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Fallback to mock events
  return INITIAL_EVENTS.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category || 'kultura',
    categoryName: e.categoryName || 'Kultura',
    location: e.location,
    region: e.city || 'Slovenija',
    eventDate: e.date,
    authorId: e.authorId || e.organizerId || `organizer-${e.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    authorName: e.organizer,
    authorRole: e.authorRole || 'Organizator',
    authorAvatar: (e.authorAvatar && !isDummyAvatar(e.authorAvatar)) ? e.authorAvatar : undefined,
    imageUrl: e.image,
    images: e.image ? [e.image] : undefined,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

function rawSubscribeToEvents(onEvents: (events: FirestoreEvent[]) => void): () => void {
  const path = 'events';
  let hydrationEpoch = 0;

  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
      const epoch = ++hydrationEpoch;
      const rawEvents: FirestoreEvent[] = snapshot.docs.map(d => {
        const item = {
          id: d.id,
          ...(d.data() as Omit<FirestoreEvent, 'id'>),
        };
        const mockEvent = INITIAL_EVENTS.find(x => x.id === item.id);
        if (mockEvent && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
          item.authorName = mockEvent.organizer;
          item.authorRole = 'Organizator';
          item.authorAvatar = ((mockEvent as any).organizerAvatar && !isDummyAvatar((mockEvent as any).organizerAvatar)) ? (mockEvent as any).organizerAvatar : undefined;
          item.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
        return item;
      });

      let anyNeedsAsync = false;
      const syncEvents = rawEvents.map(e => {
        const { hydrated, needsAsyncFetch } = mergeCachedChunksSync('events', e);
        if (needsAsyncFetch) anyNeedsAsync = true;
        return hydrated;
      });

      safeSaveArrayToLocalStorage('cached_firestore_events', syncEvents);
      onEvents(syncEvents);

      if (anyNeedsAsync) {
        Promise.all(rawEvents.map(e => hydrateDocumentWithChunks('events', e)))
          .then(hydratedEvents => {
            if (epoch !== hydrationEpoch) return;
            safeSaveArrayToLocalStorage('cached_firestore_events', hydratedEvents);
            onEvents(hydratedEvents);
          })
          .catch(() => {});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      onEvents(getCachedEvents());
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    onEvents(getCachedEvents());
    return () => {};
  }
}

export const subscribeToEvents = createSharedSubscription(rawSubscribeToEvents, getCachedEvents);

export async function getEventById(eventId: string): Promise<FirestoreEvent | null> {
  if (!eventId) return null;
  const cleanId = eventId.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
  try {
    let snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists() && cleanId !== eventId) {
      snap = await getDoc(doc(db, 'events', cleanId));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'events', `event-${cleanId}`));
    }
    if (snap.exists()) {
      const data = snap.data();
      if (data && (data.title || data.description)) {
        const item = {
          id: snap.id,
          ...(data as Omit<FirestoreEvent, 'id'>),
        };
        const mockEvent = INITIAL_EVENTS.find(x => x.id === item.id);
        if (mockEvent && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
          item.authorName = mockEvent.organizer;
          item.authorRole = 'Organizator';
          item.authorAvatar = ((mockEvent as any).organizerAvatar && !isDummyAvatar((mockEvent as any).organizerAvatar)) ? (mockEvent as any).organizerAvatar : undefined;
          item.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
        return await hydrateDocumentWithChunks('events', item);
      }
    }
    // Case-insensitive fallback search and title slug search
    const q = query(collection(db, 'events'), limit(300));
    const allSnaps = await getDocs(q);
    const targetSlug = slugify(eventId);
    const cleanSlug = slugify(cleanId);
    const match = allSnaps.docs.find(d => {
      const data = d.data();
      if (!data || (!data.title && !data.description)) return false;
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      if (d.id.toLowerCase() === eventId.toLowerCase() || docClean === cleanId) return true;
      const itemTitleSlug = slugify(data.title || '');
      if (itemTitleSlug) {
        if (itemTitleSlug === targetSlug || itemTitleSlug === cleanSlug || itemTitleSlug === eventId.toLowerCase()) return true;
        if (targetSlug && (targetSlug.startsWith(itemTitleSlug) || itemTitleSlug.startsWith(targetSlug))) return true;
        if (targetSlug && itemTitleSlug && (targetSlug.includes(itemTitleSlug) || itemTitleSlug.includes(targetSlug))) return true;
      }
      return false;
    });
    if (match) {
      const item = {
        id: match.id,
        ...(match.data() as Omit<FirestoreEvent, 'id'>),
      };
      const mockEvent = INITIAL_EVENTS.find(x => x.id === item.id);
      if (mockEvent && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
        item.authorName = mockEvent.organizer;
        item.authorRole = 'Organizator';
        item.authorAvatar = ((mockEvent as any).organizerAvatar && !isDummyAvatar((mockEvent as any).organizerAvatar)) ? (mockEvent as any).organizerAvatar : undefined;
        item.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }
      return await hydrateDocumentWithChunks('events', item);
    }
    // Cache fallback
    try {
      const raw = localStorage.getItem('cached_firestore_events');
      if (raw) {
        const cached: FirestoreEvent[] = JSON.parse(raw);
        const found = cached.find(e => {
          const docClean = e.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
          return e.id.toLowerCase() === eventId.toLowerCase() || docClean === cleanId || slugify(e.title || '') === targetSlug;
        });
        if (found) return normalizeMediaFields(found);
      }
    } catch {}
    return null;
  } catch (error) {
    console.warn(`Could not get event ${eventId}:`, error);
    try {
      const raw = localStorage.getItem('cached_firestore_events');
      if (raw) {
        const cached: FirestoreEvent[] = JSON.parse(raw);
        const targetSlug = slugify(eventId);
        const cleanSlug = slugify(cleanId);
        const found = cached.find(e => {
          const docClean = e.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
          return e.id.toLowerCase() === eventId.toLowerCase() || docClean === cleanId || slugify(e.title || '') === targetSlug || slugify(e.title || '') === cleanSlug;
        });
        if (found) return normalizeMediaFields(found);
      }
    } catch {}
    return null;
  }
}

export async function getPostById(postId: string): Promise<FirestorePost | null> {
  if (!postId) return null;
  const cleanId = postId.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
  const targetSlug = slugify(postId);
  const cleanSlug = slugify(cleanId);
  try {
    let snap = await getDoc(doc(db, 'posts', postId));
    if (!snap.exists() && cleanId !== postId) {
      snap = await getDoc(doc(db, 'posts', cleanId));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'posts', `post-${cleanId}`));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'posts', `deal-${cleanId}`));
    }
    if (snap.exists()) {
      const data = snap.data();
      if (data && (data.title || data.content || data.description)) {
        return await hydrateDocumentWithChunks('posts', {
          id: snap.id,
          ...(data as Omit<FirestorePost, 'id'>),
        });
      }
    }
    const q = query(collection(db, 'posts'), limit(300));
    const allSnaps = await getDocs(q);
    const match = allSnaps.docs.find(d => {
      const data = d.data();
      if (!data || (!data.title && !data.content && !data.description)) return false;
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      if (d.id.toLowerCase() === postId.toLowerCase() || docClean === cleanId) return true;
      const itemTitleSlug = slugify(data.title || '');
      if (itemTitleSlug) {
        if (itemTitleSlug === targetSlug || itemTitleSlug === cleanSlug || itemTitleSlug === postId.toLowerCase()) return true;
        if (targetSlug && (targetSlug.startsWith(itemTitleSlug) || itemTitleSlug.startsWith(targetSlug))) return true;
        if (targetSlug && itemTitleSlug && (targetSlug.includes(itemTitleSlug) || itemTitleSlug.includes(targetSlug))) return true;
      }
      return false;
    });
    if (match) {
      return await hydrateDocumentWithChunks('posts', {
        id: match.id,
        ...(match.data() as Omit<FirestorePost, 'id'>),
      });
    }
    // Local cache fallback
    try {
      const raw = localStorage.getItem('cached_firestore_posts');
      if (raw) {
        const cached: FirestorePost[] = JSON.parse(raw);
        const found = cached.find(p => {
          const docClean = p.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
          return p.id.toLowerCase() === postId.toLowerCase() || docClean === cleanId || slugify(p.title || '') === targetSlug || slugify(p.title || '') === cleanSlug;
        });
        if (found) return normalizeMediaFields(found);
      }
    } catch {}
    return null;
  } catch (error) {
    console.warn(`Could not get post ${postId}:`, error);
    try {
      const raw = localStorage.getItem('cached_firestore_posts');
      if (raw) {
        const cached: FirestorePost[] = JSON.parse(raw);
        const found = cached.find(p => {
          const docClean = p.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
          return p.id.toLowerCase() === postId.toLowerCase() || docClean === cleanId || slugify(p.title || '') === targetSlug || slugify(p.title || '') === cleanSlug;
        });
        if (found) return normalizeMediaFields(found);
      }
    } catch {}
    return null;
  }
}

export async function getAdById(adId: string): Promise<FirestoreAd | null> {
  if (!adId) return null;
  const cleanId = adId.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
  const targetSlug = slugify(adId);
  const cleanSlug = slugify(cleanId);
  try {
    let snap = await getDoc(doc(db, 'ads', adId));
    if (!snap.exists() && cleanId !== adId) {
      snap = await getDoc(doc(db, 'ads', cleanId));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'ads', `ad-${cleanId}`));
    }
    if (snap.exists()) {
      const data = snap.data();
      if (data && (data.title || data.description)) {
        return await hydrateDocumentWithChunks('ads', {
          id: snap.id,
          ...(data as Omit<FirestoreAd, 'id'>),
        });
      }
    }
    const q = query(collection(db, 'ads'), limit(100));
    const allSnaps = await getDocs(q);
    const match = allSnaps.docs.find(d => {
      const data = d.data();
      if (!data || (!data.title && !data.description)) return false;
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      if (d.id.toLowerCase() === adId.toLowerCase() || docClean === cleanId) return true;
      const itemTitleSlug = slugify(data.title || '');
      if (itemTitleSlug) {
        if (itemTitleSlug === targetSlug || itemTitleSlug === cleanSlug || itemTitleSlug === adId.toLowerCase()) return true;
        if (targetSlug && (targetSlug.startsWith(itemTitleSlug) || itemTitleSlug.startsWith(targetSlug))) return true;
      }
      return false;
    });
    if (match) {
      return await hydrateDocumentWithChunks('ads', {
        id: match.id,
        ...(match.data() as Omit<FirestoreAd, 'id'>),
      });
    }
    // Local cache fallback
    try {
      const raw = localStorage.getItem('cached_firestore_ads');
      if (raw) {
        const cached: FirestoreAd[] = JSON.parse(raw);
        const found = cached.find(a => {
          const docClean = a.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
          return a.id.toLowerCase() === adId.toLowerCase() || docClean === cleanId || slugify(a.title || '') === targetSlug || slugify(a.title || '') === cleanSlug;
        });
        if (found) return normalizeMediaFields(found);
      }
    } catch {}
    return null;
  } catch (error) {
    console.warn(`Could not get ad ${adId}:`, error);
    try {
      const raw = localStorage.getItem('cached_firestore_ads');
      if (raw) {
        const cached: FirestoreAd[] = JSON.parse(raw);
        const found = cached.find(a => {
          const docClean = a.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
          return a.id.toLowerCase() === adId.toLowerCase() || docClean === cleanId || slugify(a.title || '') === targetSlug || slugify(a.title || '') === cleanSlug;
        });
        if (found) return normalizeMediaFields(found);
      }
    } catch {}
    return null;
  }
}

export async function fetchDocumentById(
  id: string,
  preferredType?: 'event' | 'deal' | 'ad' | 'blog' | 'post' | 'news' | string
): Promise<{ type: 'event' | 'deal' | 'ad' | 'blog'; data: any } | null> {
  if (!id) return null;

  const checkEvent = async () => {
    const ev = await getEventById(id);
    if (ev && (ev.title || ev.description)) return { type: 'event' as const, data: ev };
    return null;
  };

  const checkPost = async () => {
    const post = await getPostById(id);
    if (post && (post.title || post.content || (post as any).description)) {
      const catLower = (post.category || '').toLowerCase();
      const catNameLower = (post.categoryName || '').toLowerCase();
      const isEvent = catLower === 'event' || 
                      catLower === 'dogodki' || 
                      catLower.startsWith('event') || 
                      catNameLower.includes('dogod') || 
                      post.type === 'event' || 
                      preferredType === 'event';
      if (isEvent) {
        return { type: 'event' as const, data: post };
      }
      const isDeal = catLower === 'deal' || 
                     catLower === 'ugodnosti' || 
                     catLower.startsWith('deal') || 
                     catNameLower.includes('ugodnost') || 
                     catNameLower.includes('akcij') || 
                     catNameLower.includes('popust') || 
                     catNameLower.includes('trgovin') || 
                     catNameLower.includes('tehnik') || 
                     catNameLower.includes('moda') || 
                     catNameLower.includes('wellness') || 
                     catNameLower.includes('storitv') || 
                     post.type === 'deal' || 
                     Boolean(post.discount) || 
                     Boolean(post.promoCode) || 
                     Boolean(post.dealLink) || 
                     post.id.startsWith('deal-') || 
                     post.id.startsWith('hero-bento-') || 
                     preferredType === 'deal';
      return { type: (isDeal ? 'deal' : 'blog') as ('deal' | 'blog'), data: post };
    }
    return null;
  };

  const checkAd = async () => {
    const ad = await getAdById(id);
    if (ad && (ad.title || ad.description)) return { type: 'ad' as const, data: ad };
    return null;
  };

  if (preferredType === 'event') {
    return (await checkEvent()) || (await checkPost()) || (await checkAd());
  } else if (preferredType === 'ad') {
    return (await checkAd()) || (await checkPost()) || (await checkEvent());
  } else if (preferredType === 'deal') {
    return (await checkPost()) || (await checkEvent()) || (await checkAd());
  } else if (preferredType === 'blog' || preferredType === 'post') {
    return (await checkPost()) || (await checkEvent()) || (await checkAd());
  } else {
    return (await checkPost()) || (await checkEvent()) || (await checkAd());
  }
}

export async function createEventInFirestore(event: Omit<FirestoreEvent, 'id'> & { id?: string }): Promise<string> {
  const path = 'events';
  let eventRefId = '';
  try {
    const eventRef = doc(collection(db, path));
    eventRefId = eventRef.id;
    const now = new Date().toISOString();
    const newEvent: FirestoreEvent = {
      ...event,
      id: eventRef.id,
      createdAt: now,
      updatedAt: now,
      isPromoted: event.isPromoted || false,
    };
    const storageReadyEvent = await ensureMediaInFirebaseStorage(newEvent, 'events', eventRef.id);
    const prepared = prepareChunkedPayload(storageReadyEvent);
    if (prepared.chunks.length > 0) {
      hydratedDocCache.set(`events/${eventRef.id}`, {
        updatedAt: now,
        chunkCount: prepared.chunks.length,
        overflow: prepared.overflow,
      });
      await writeChunksSubcollection('events', eventRef.id, prepared.chunks, 0);
    }
    await setDoc(eventRef, prepared.mainDoc);
    return eventRef.id;
  } catch (error) {
    if (isStorageUploadError(error) || (error instanceof Error && error.message.includes('največjo dovoljeno velikost'))) {
      throw error;
    }
    if (eventRefId) {
      deleteChunksSubcollection('events', eventRefId).catch(() => {});
    }
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
  }
}

export async function updateEventInFirestore(eventId: string, data: Partial<FirestoreEvent>): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const eventRef = doc(db, 'events', eventId);
    const snap = await getDoc(eventRef);
    const mockEvent = INITIAL_EVENTS.find(e => e.id === eventId);

    if (!snap.exists()) {
      const isAuthorAdmin = isUserAdminIdentity(data.authorId, data.authorName, data.authorRole);
      const originalAuthorName = mockEvent 
        ? mockEvent.organizer 
        : (data.authorName && !isAuthorAdmin ? data.authorName : 'Organizator');

      const originalAuthorId = mockEvent
        ? `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : (data.authorId && !isAuthorAdmin ? data.authorId : `organizer-${originalAuthorName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);

      const originalAuthorRole = 'Organizator';
      const originalAuthorAvatar = ((mockEvent as any)?.organizerAvatar && !isDummyAvatar((mockEvent as any).organizerAvatar))
        ? (mockEvent as any).organizerAvatar
        : (data.authorAvatar && !isDummyAvatar(data.authorAvatar) ? data.authorAvatar : undefined);
      const finalCategory = data.category && data.category !== 'splosno' ? data.category : (mockEvent?.category || data.category || 'dogodki');

      const now = new Date().toISOString();
      const rawPayload: Record<string, any> = {
        ...data,
        id: eventId,
        title: data.title || mockEvent?.title || 'Dogodek',
        description: data.description || mockEvent?.description || '',
        category: finalCategory,
        eventDate: data.eventDate || mockEvent?.date || now.split('T')[0],
        location: data.location || mockEvent?.location || 'Ljubljana',
        price: data.price || mockEvent?.price || 'Vstop prost',
        imageUrl: data.imageUrl || mockEvent?.image || '',
        status: data.status || 'published',
        isPromoted: data.isPromoted || false,
        createdAt: now,
        updatedAt: now,
        authorId: originalAuthorId,
        authorName: originalAuthorName,
        authorRole: originalAuthorRole,
        authorAvatar: originalAuthorAvatar,
      };

      const storageReadyEvent = await ensureMediaInFirebaseStorage(rawPayload, 'events', eventId);
      const prepared = prepareChunkedPayload(storageReadyEvent);
      if (prepared.chunks.length > 0) {
        hydratedDocCache.set(`events/${eventId}`, {
          updatedAt: now,
          chunkCount: prepared.chunks.length,
          overflow: prepared.overflow,
        });
        await writeChunksSubcollection('events', eventId, prepared.chunks, 0);
      }

      await setDoc(eventRef, prepared.mainDoc);
    } else {
      const rawExisting = { id: snap.id, ...(snap.data() as Omit<FirestoreEvent, 'id'>) };
      const prevChunkCount = rawExisting.hasChunkedContent ? (rawExisting.chunkCount || 0) : 0;
      const existing = rawExisting.hasChunkedContent
        ? await hydrateDocumentWithChunks('events', rawExisting)
        : rawExisting;

      const safeData: Record<string, any> = { ...data };

      // Strictly preserve original author & category
      delete safeData.authorId;
      delete safeData.authorName;
      delete safeData.authorRole;
      delete safeData.authorAvatar;
      delete safeData.createdAt;

      if (existing.category && (!safeData.category || safeData.category === 'dogodki' || safeData.category === 'splosno')) {
        safeData.category = existing.category;
      }

      // Auto-heal if existing event in Firestore was previously corrupted to admin/superadmin
      const currentAuthorIsAdmin = isUserAdminIdentity(existing.authorId, existing.authorName, existing.authorRole);
      if (mockEvent && currentAuthorIsAdmin) {
        safeData.authorName = mockEvent.organizer;
        safeData.authorRole = 'Organizator';
        safeData.authorAvatar = ((mockEvent as any).organizerAvatar && !isDummyAvatar((mockEvent as any).organizerAvatar)) ? (mockEvent as any).organizerAvatar : undefined;
        safeData.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }

      const now = new Date().toISOString();
      const storageReadySafeData = await ensureMediaInFirebaseStorage(safeData, 'events', eventId);
      const mergedDoc: Record<string, any> = {
        ...existing,
        ...storageReadySafeData,
        id: eventId,
        updatedAt: now,
      };
      delete mergedDoc.hasChunkedContent;
      delete mergedDoc.chunkCount;
      delete mergedDoc.totalPayloadBytes;

      if (storageReadySafeData.imageUrl !== undefined && storageReadySafeData.images === undefined) {
        const existingImgs = Array.isArray(existing.images) ? [...existing.images] : [];
        if (storageReadySafeData.imageUrl) {
          mergedDoc.images = [storageReadySafeData.imageUrl, ...existingImgs.slice(1)].filter(Boolean);
        } else {
          mergedDoc.images = existingImgs.slice(1).filter(Boolean);
        }
        delete mergedDoc.imageUrls;
      }

      const removableKeys = ['rejectionReason', 'promotion', 'promotedUntil', 'promotionBadgeType', 'embedCode', 'embedOrientation'];
      for (const k of removableKeys) {
        if (k in storageReadySafeData && (storageReadySafeData[k] === undefined || storageReadySafeData[k] === null)) {
          delete mergedDoc[k];
        }
      }

      const finalMergedEvent = await ensureMediaInFirebaseStorage(mergedDoc, 'events', eventId);
      const prepared = prepareChunkedPayload(finalMergedEvent);
      if (prepared.chunks.length > 0 || prevChunkCount > 0) {
        if (prepared.chunks.length > 0) {
          hydratedDocCache.set(`events/${eventId}`, {
            updatedAt: now,
            chunkCount: prepared.chunks.length,
            overflow: prepared.overflow,
          });
        } else {
          hydratedDocCache.delete(`events/${eventId}`);
        }
        await writeChunksSubcollection('events', eventId, prepared.chunks, prevChunkCount);
        await setDoc(eventRef, prepared.mainDoc);
      } else {
        await updateDoc(eventRef, sanitizeUpdateData({
          ...storageReadySafeData,
          ...(finalMergedEvent.images !== undefined ? { images: finalMergedEvent.images } : {}),
          updatedAt: now,
        }));
      }
    }
  } catch (error) {
    if (isStorageUploadError(error) || (error instanceof Error && error.message.includes('največjo dovoljeno velikost'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventInFirestore(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await deleteChunksSubcollection('events', eventId);
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------- APPROVAL WORKFLOW HELPERS ----------------

export type ApprovalContentType = 'post' | 'ad' | 'event' | 'deal';

export async function approveItemInFirestore(id: string, type: ApprovalContentType): Promise<void> {
  if (type === 'ad') {
    await updateAdInFirestore(id, { status: 'active', rejectionReason: undefined });
  } else if (type === 'event') {
    await updateEventInFirestore(id, { status: 'published', rejectionReason: undefined });
  } else {
    await updatePostInFirestore(id, { status: 'published', rejectionReason: undefined });
  }
}

export async function rejectItemInFirestore(id: string, type: ApprovalContentType, reason?: string): Promise<void> {
  if (type === 'ad') {
    await updateAdInFirestore(id, { status: 'rejected', rejectionReason: reason || 'Zavrnjeno s strani skrbnika' });
  } else if (type === 'event') {
    await updateEventInFirestore(id, { status: 'rejected', rejectionReason: reason || 'Zavrnjeno s strani skrbnika' });
  } else {
    await updatePostInFirestore(id, { status: 'rejected', rejectionReason: reason || 'Zavrnjeno s strani skrbnika' });
  }
}

// ---------------- PROMOTION & FEATURED OPERATIONS ----------------

export async function setItemPromotionInFirestore(
  id: string,
  type: ApprovalContentType,
  promo: PromotionConfig
): Promise<void> {
  const cleanedPromo = cleanDataForFirestore(promo) as PromotionConfig;
  const updateData = {
    isPromoted: cleanedPromo.isPromoted,
    promotion: cleanedPromo,
    promotedUntil: cleanedPromo.promotedUntil,
    promotionBadgeType: cleanedPromo.badgeType,
  };

  if (type === 'ad') {
    await updateAdInFirestore(id, updateData);
  } else if (type === 'event') {
    await updateEventInFirestore(id, updateData);
  } else {
    await updatePostInFirestore(id, updateData);
  }
}

export async function removeItemPromotionInFirestore(
  id: string,
  type: ApprovalContentType
): Promise<void> {
  const updateData = {
    isPromoted: false,
    promotion: undefined,
    promotedUntil: undefined,
    promotionBadgeType: undefined,
  };

  if (type === 'ad') {
    await updateAdInFirestore(id, updateData);
  } else if (type === 'event') {
    await updateEventInFirestore(id, updateData);
  } else {
    await updatePostInFirestore(id, updateData);
  }
}

// ---------------- BOOKMARKS OPERATIONS ----------------

export interface FirestoreBookmark {
  id: string;
  userId: string;
  targetId: string;
  targetType: string;
  targetTitle?: string;
  targetCategory?: string;
  data?: any;
  createdAt?: any;
}

export function subscribeToBookmarks(userId: string, onBookmarks: (bookmarks: FirestoreBookmark[]) => void): () => void {
  if (!userId) return () => {};
  // Only connect Firestore subscription if user is authenticated in Firebase Auth
  // and matches the target userId or is superadmin
  if (!auth.currentUser || (auth.currentUser.uid !== userId && auth.currentUser.email !== 'zoran.krstin@gmail.com')) {
    return () => {};
  }
  const path = `users/${userId}/bookmarks`;
  try {
    return onSnapshot(collection(db, 'users', userId, 'bookmarks'), (snapshot) => {
      const bookmarks: FirestoreBookmark[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreBookmark, 'id'>)
      }));
      onBookmarks(bookmarks);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export async function saveBookmarkInFirestore(userId: string, item: SavedItemData): Promise<void> {
  if (!auth.currentUser || (auth.currentUser.uid !== userId && auth.currentUser.email !== 'zoran.krstin@gmail.com')) {
    return;
  }
  const path = `users/${userId}/bookmarks/${item.id}`;
  try {
    const ref = doc(db, 'users', userId, 'bookmarks', item.id);
    await setDoc(ref, {
      id: item.id,
      userId,
      targetId: item.id,
      targetType: item.type || item.category || 'post',
      targetTitle: item.title,
      targetCategory: item.category || 'all',
      data: item,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeBookmarkInFirestore(userId: string, itemId: string): Promise<void> {
  if (!auth.currentUser || (auth.currentUser.uid !== userId && auth.currentUser.email !== 'zoran.krstin@gmail.com')) {
    return;
  }
  const path = `users/${userId}/bookmarks/${itemId}`;
  try {
    const ref = doc(db, 'users', userId, 'bookmarks', itemId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// COMMENTS SERVICE
// -------------------------------------------------------------

export interface FirestoreComment {
  id: string;
  targetId: string;
  targetType: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  voters?: Record<string, 'up' | 'down'>;
}

/**
 * Subscribes to real-time comments for a specific post, ad, event or deal.
 */
export function subscribeToPostComments(
  targetId: string,
  onComments: (comments: FirestoreComment[]) => void
): () => void {
  if (!targetId) {
    onComments([]);
    return () => {};
  }
  const path = 'comments';
  try {
    const q = query(
      collection(db, path),
      where('targetId', '==', targetId)
    );
    return onSnapshot(q, (snapshot) => {
      const comments: FirestoreComment[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<FirestoreComment, 'id'>)
      }));
      // Sort chronologically ascending by default
      comments.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime() || 0;
        const timeB = new Date(b.createdAt).getTime() || 0;
        return timeA - timeB;
      });
      onComments(comments);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Adds a new comment to Firestore with real-time sync.
 */
export async function addCommentToFirestore(
  commentData: {
    targetId: string;
    targetType: string;
    authorId?: string;
    authorName: string;
    authorAvatar?: string;
    authorRole?: string;
    content: string;
  }
): Promise<string> {
  const path = 'comments';
  try {
    const commentRef = doc(collection(db, path));
    const now = new Date().toISOString();
    const newComment: FirestoreComment = {
      id: commentRef.id,
      targetId: commentData.targetId,
      targetType: commentData.targetType,
      authorId: commentData.authorId || auth.currentUser?.uid || '',
      authorName: commentData.authorName || 'Gost Portalko',
      authorAvatar: commentData.authorAvatar || '',
      authorRole: commentData.authorRole || 'Gost',
      content: commentData.content.trim(),
      createdAt: now,
      updatedAt: now,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      voters: {},
    };
    await setDoc(commentRef, cleanDataForFirestore(newComment));

    // Optimistically update comment count on post document if applicable
    try {
      if (commentData.targetType === 'post' || commentData.targetType === 'blog' || commentData.targetType === 'deal') {
        const postRef = doc(db, 'posts', commentData.targetId);
        await updateDoc(postRef, { commentsCount: increment(1) });
      } else if (commentData.targetType === 'ad') {
        const adRef = doc(db, 'ads', commentData.targetId);
        await updateDoc(adRef, { commentsCount: increment(1) });
      } else if (commentData.targetType === 'event') {
        const eventRef = doc(db, 'events', commentData.targetId);
        await updateDoc(eventRef, { commentsCount: increment(1) });
      }
    } catch {
      // ignore counter update error if target is mock item
    }

    return commentRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

/**
 * Votes on an individual comment (up-vote or down-vote).
 * If user already voted this type, toggles it off.
 * If user voted opposite type, switches it.
 */
export async function voteCommentInFirestore(
  commentId: string,
  userId: string,
  voteType: 'up' | 'down'
): Promise<{ upvotes: number; downvotes: number; score: number; userVote: 'up' | 'down' | null }> {
  const path = `comments/${commentId}`;
  try {
    const commentRef = doc(db, 'comments', commentId);
    const snap = await getDoc(commentRef);
    if (!snap.exists()) {
      return { upvotes: 0, downvotes: 0, score: 0, userVote: null };
    }
    const data = snap.data();
    const voters: Record<string, 'up' | 'down'> = { ...(data.voters || {}) };
    const currentVote = voters[userId] || null;

    let nextUserVote: 'up' | 'down' | null = null;
    if (currentVote === voteType) {
      delete voters[userId];
      nextUserVote = null;
    } else {
      voters[userId] = voteType;
      nextUserVote = voteType;
    }

    let upvotes = 0;
    let downvotes = 0;
    Object.values(voters).forEach((v) => {
      if (v === 'up') upvotes++;
      else if (v === 'down') downvotes++;
    });
    const score = upvotes - downvotes;

    await updateDoc(commentRef, {
      voters,
      upvotes,
      downvotes,
      score,
      updatedAt: new Date().toISOString()
    });

    return { upvotes, downvotes, score, userVote: nextUserVote };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Deletes a comment from Firestore.
 */
export async function deleteCommentFromFirestore(
  commentId: string,
  targetId?: string,
  targetType?: string
): Promise<void> {
  const path = `comments/${commentId}`;
  try {
    const commentRef = doc(db, 'comments', commentId);
    await deleteDoc(commentRef);

    if (targetId && targetType) {
      try {
        if (targetType === 'post' || targetType === 'blog' || targetType === 'deal') {
          const postRef = doc(db, 'posts', targetId);
          await updateDoc(postRef, { commentsCount: increment(-1) });
        } else if (targetType === 'ad') {
          const adRef = doc(db, 'ads', targetId);
          await updateDoc(adRef, { commentsCount: increment(-1) });
        } else if (targetType === 'event') {
          const eventRef = doc(db, 'events', targetId);
          await updateDoc(eventRef, { commentsCount: increment(-1) });
        }
      } catch {
        // ignore counter decrement error
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Atomically increments views count for a post, ad, or event in Firestore.
 * If document does not exist yet (mock items or newly registered IDs), it initializes it.
 */
export async function recordItemViewInFirestore(
  targetType: string,
  targetId: string
): Promise<number | null> {
  if (!targetId) return null;
  const cleanType = targetType.toLowerCase();
  const collectionName = (cleanType === 'ad') ? 'ads' : (cleanType === 'event') ? 'events' : 'posts';
  const path = `${collectionName}/${targetId}`;

  try {
    const docRef = doc(db, collectionName, targetId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data && (data.title || data.content || data.description)) {
        await updateDoc(docRef, { viewsCount: increment(1) });
        return (data.viewsCount || 0) + 1;
      }
    }

    // If not found by direct doc ID, it might be a slug or clean ID: find real document
    const cleanId = targetId.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
    const targetSlug = slugify(targetId);
    const cleanSlug = slugify(cleanId);
    const q = query(collection(db, collectionName), limit(50));
    const allSnaps = await getDocs(q);

    const match = allSnaps.docs.find(d => {
      const data = d.data();
      if (!data || (!data.title && !data.description && !data.content)) return false;
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      if (d.id.toLowerCase() === targetId.toLowerCase() || docClean === cleanId) return true;
      const itemTitleSlug = slugify(data.title || '');
      return itemTitleSlug === targetSlug || itemTitleSlug === cleanSlug || (targetSlug && targetSlug.startsWith(itemTitleSlug));
    });

    if (match) {
      const realDocRef = doc(db, collectionName, match.id);
      await updateDoc(realDocRef, { viewsCount: increment(1) });
      return (match.data().viewsCount || 0) + 1;
    }

    // For transient/mock posts or non-persisted items: return 1 without creating empty stub docs
    return 1;
  } catch (error) {
    console.warn(`Could not record view for ${path}:`, error);
    return null;
  }
}

/**
 * Subscribes to live viewsCount changes for a single post/ad/event document.
 */
export function subscribeToItemViews(
  targetType: string,
  targetId: string,
  onUpdate: (viewsCount: number) => void
): () => void {
  const cleanType = targetType.toLowerCase();
  const collectionName = (cleanType === 'ad') ? 'ads' : (cleanType === 'event') ? 'events' : 'posts';
  const path = `${collectionName}/${targetId}`;

  try {
    const docRef = doc(db, collectionName, targetId);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.viewsCount === 'number') {
          onUpdate(data.viewsCount);
        }
      }
    }, () => {
      // Graceful fallback on permission error or offline state
    });
  } catch {
    return () => {};
  }
}

// -------------------------------------------------------------
// AUTHOR FOLLOW / SUBSCRIBE SERVICE
// -------------------------------------------------------------

export interface AuthorFollowRecord {
  id: string;
  followerId: string;
  followerName?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

const FOLLOWING_CACHE_PREFIX = 'portalko_following_v1_';
const FOLLOWER_COUNTS_CACHE_KEY = 'portalko_author_follower_counts_v1';

export function normalizeAuthorFollowKey(authorId?: string, authorName?: string): string {
  const cleanId = (authorId || '').trim();
  if (/^[a-zA-Z0-9_-]{1,128}$/.test(cleanId)) {
    return cleanId;
  }
  const slug = slugify(authorName || 'avtor').replace(/[^a-zA-Z0-9_-]/g, '-');
  const fallback = `author-${slug || 'avtor'}`;
  return fallback.slice(0, 120);
}

function sanitizeFollowDocId(id: string): string {
  const cleaned = (id || 'user').trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || 'user';
}

function getCachedFollowingList(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${FOLLOWING_CACHE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveCachedFollowingList(userId: string, authorKeys: string[]) {
  try {
    localStorage.setItem(`${FOLLOWING_CACHE_PREFIX}${userId}`, JSON.stringify(authorKeys));
  } catch {
    // ignore
  }
}

function getCachedFollowerCount(authorKey: string): number {
  try {
    const raw = localStorage.getItem(FOLLOWER_COUNTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed[authorKey] === 'number') {
        return parsed[authorKey];
      }
    }
  } catch {
    // ignore
  }
  return 0;
}

function saveCachedFollowerCount(authorKey: string, count: number) {
  try {
    const raw = localStorage.getItem(FOLLOWER_COUNTS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[authorKey] = Math.max(0, count);
    localStorage.setItem(FOLLOWER_COUNTS_CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function subscribeToUserFollowing(
  userId: string,
  onFollowing: (authorKeys: string[], records: AuthorFollowRecord[]) => void
): () => void {
  if (!userId) {
    onFollowing([], []);
    return () => {};
  }

  const safeFollowerId = sanitizeFollowDocId(userId);
  const cachedKeys = getCachedFollowingList(safeFollowerId);
  if (cachedKeys.length > 0) {
    onFollowing(cachedKeys, []);
  }

  const path = `users/${safeFollowerId}/following`;
  try {
    return onSnapshot(
      collection(db, 'users', safeFollowerId, 'following'),
      (snapshot) => {
        const records: AuthorFollowRecord[] = snapshot.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<AuthorFollowRecord, 'id'>),
        }));
        const keys = records.map(r => r.authorId || r.id);
        saveCachedFollowingList(safeFollowerId, keys);
        onFollowing(keys, records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        onFollowing(getCachedFollowingList(safeFollowerId), []);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    onFollowing(getCachedFollowingList(safeFollowerId), []);
    return () => {};
  }
}

export function subscribeToAuthorFollowerCount(
  authorKey: string,
  onCount: (count: number) => void
): () => void {
  if (!authorKey) {
    onCount(0);
    return () => {};
  }

  const safeAuthorKey = normalizeAuthorFollowKey(authorKey);
  onCount(getCachedFollowerCount(safeAuthorKey));

  const path = `author_followers/${safeAuthorKey}/followers`;
  try {
    return onSnapshot(
      collection(db, 'author_followers', safeAuthorKey, 'followers'),
      (snapshot) => {
        const count = snapshot.size;
        saveCachedFollowerCount(safeAuthorKey, count);
        onCount(count);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export async function toggleFollowAuthorInFirestore(params: {
  followerId: string;
  followerName?: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  follow: boolean;
}): Promise<{ following: boolean; authorKey: string }> {
  const safeFollowerId = sanitizeFollowDocId(params.followerId);
  const authorKey = normalizeAuthorFollowKey(params.authorId, params.authorName);

  const userFollowingPath = `users/${safeFollowerId}/following/${authorKey}`;
  const authorFollowerPath = `author_followers/${authorKey}/followers/${safeFollowerId}`;

  const userFollowingRef = doc(db, 'users', safeFollowerId, 'following', authorKey);
  const authorFollowerRef = doc(db, 'author_followers', authorKey, 'followers', safeFollowerId);

  if (params.follow) {
    const cleanAvatar =
      params.authorAvatar && params.authorAvatar.length <= 500000
        ? params.authorAvatar
        : undefined;

    const basePayload: Record<string, any> = {
      id: authorKey,
      followerId: safeFollowerId,
      followerName: (params.followerName || 'Bralec').trim().slice(0, 100),
      authorId: authorKey,
      authorName: (params.authorName || 'Avtor').trim().slice(0, 100) || 'Avtor',
      createdAt: new Date().toISOString(),
    };
    if (cleanAvatar) {
      basePayload.authorAvatar = cleanAvatar;
    }

    const followerSidePayload: Record<string, any> = {
      ...basePayload,
      id: safeFollowerId,
    };

    try {
      await setDoc(userFollowingRef, cleanDataForFirestore(basePayload));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userFollowingPath);
    }

    try {
      await setDoc(authorFollowerRef, cleanDataForFirestore(followerSidePayload));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, authorFollowerPath);
    }

    const prevKeys = getCachedFollowingList(safeFollowerId);
    if (!prevKeys.includes(authorKey)) {
      saveCachedFollowingList(safeFollowerId, [...prevKeys, authorKey]);
    }
    saveCachedFollowerCount(authorKey, getCachedFollowerCount(authorKey) + 1);
    return { following: true, authorKey };
  } else {
    try {
      await deleteDoc(userFollowingRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, userFollowingPath);
    }

    try {
      await deleteDoc(authorFollowerRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, authorFollowerPath);
    }

    const prevKeys = getCachedFollowingList(safeFollowerId);
    saveCachedFollowingList(
      safeFollowerId,
      prevKeys.filter(k => k !== authorKey)
    );
    saveCachedFollowerCount(authorKey, Math.max(0, getCachedFollowerCount(authorKey) - 1));
    return { following: false, authorKey };
  }
}

