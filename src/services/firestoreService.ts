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
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, Role } from '../contexts/AuthContext';
import { SavedItemData } from '../contexts/BookmarkContext';
import { INITIAL_DEALS, HERO_BENTO_DEALS } from '../data/mockDealsData';
import { INITIAL_BLOG_POSTS, INITIAL_ADS, INITIAL_EVENTS } from '../data/mockFeedData';
import { PromotionConfig, PromotionTargetSection, PromotionBadgeType, EventScheduleSlot } from '../types';

/**
 * Sanitizes an object before calling Firestore updateDoc:
 * - Converts `rejectionReason: undefined` (or any other field where undefined signifies removal) into `deleteField()`
 * - Recursively cleans nested objects and arrays so Firestore updateDoc never throws "Unsupported field value: undefined"
 */
export function sanitizeUpdateData(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      if (key === 'rejectionReason' || key === 'promotion' || key === 'promotedUntil' || key === 'promotionBadgeType') {
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

export interface FirestorePost {
  id: string;
  title: string;
  content: string;
  category: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  imageUrl?: string;
  embedCode?: string;
  images?: string[];
  imageUrls?: string[];
  price?: string;
  oldPrice?: string;
  newPrice?: string;
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
  status?: 'published' | 'pending' | 'rejected' | 'archived';
  rejectionReason?: string;
  likesCount?: number;
  likedBy?: string[];
  commentsCount?: number;
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
  description: string;
  category: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
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
  images?: string[];
  imageUrls?: string[];
  tags?: string[];
  status: 'active' | 'sold' | 'closed' | 'pending' | 'rejected';
  rejectionReason?: string;
  likesCount?: number;
  likedBy?: string[];
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
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  imageUrl?: string;
  embedCode?: string;
  images?: string[];
  imageUrls?: string[];
  tags?: string[];
  interestedCount?: number;
  likesCount?: number;
  likedBy?: string[];
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
  // Only sync to Firestore when authenticated in Firebase Auth
  if (!auth.currentUser) {
    return;
  }
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
        avatar: user.avatar || '',
        bio: user.bio || '',
        username: user.username || '',
        socialLinks: user.socialLinks || [],
        profileMenu: user.profileMenu || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(userRef, {
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        bio: user.bio !== undefined ? user.bio : (existing.data().bio || ''),
        username: user.username !== undefined ? user.username : (existing.data().username || ''),
        socialLinks: user.socialLinks !== undefined ? user.socialLinks : (existing.data().socialLinks || []),
        profileMenu: user.profileMenu !== undefined ? user.profileMenu : (existing.data().profileMenu || []),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  // Reading users collection requires authentication
  if (!auth.currentUser) {
    return null;
  }
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
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function fetchUsersList(): Promise<User[]> {
  if (!auth.currentUser) {
    return [];
  }
  const path = 'users';
  try {
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
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
        socialLinks: data.socialLinks,
        profileMenu: data.profileMenu,
        verificationRequested: data.verificationRequested,
        verificationRequestedAt: data.verificationRequestedAt,
        verificationNote: data.verificationNote,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToUsers(onUsers: (users: User[]) => void): () => void {
  if (!auth.currentUser) {
    return () => {};
  }
  const path = 'users';
  try {
    const q = query(collection(db, path), limit(100));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => {
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
          socialLinks: data.socialLinks,
          profileMenu: data.profileMenu,
          verificationRequested: data.verificationRequested,
          verificationRequestedAt: data.verificationRequestedAt,
          verificationNote: data.verificationNote,
        };
      });
      onUsers(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export async function updateUserInFirestore(userId: string, data: Partial<User>, fallbackUser?: User): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const base: Partial<User> = fallbackUser || {};
      const fullDoc = {
        id: userId,
        name: data.name || base.name || (userId === 'u2' ? 'Luka Novak' : userId === 'u3' ? 'Maja Zupan' : userId === 'u4' ? 'Janez Horvat' : 'Uporabnik'),
        email: data.email || base.email || `${userId}@portalko.net`,
        role: data.role || base.role || 'registered',
        status: data.status || base.status || 'active',
        avatar: data.avatar !== undefined ? data.avatar : (base.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || base.name || userId)}&background=7C3AED&color=fff`),
        bio: data.bio !== undefined ? data.bio : (base.bio || ''),
        username: data.username !== undefined ? data.username : (base.username || `@${userId}`),
        socialLinks: data.socialLinks !== undefined ? data.socialLinks : (base.socialLinks || []),
        profileMenu: data.profileMenu !== undefined ? data.profileMenu : (base.profileMenu || []),
        verificationRequested: data.verificationRequested !== undefined ? data.verificationRequested : (base.verificationRequested || false),
        verificationRequestedAt: data.verificationRequestedAt !== undefined ? data.verificationRequestedAt : (base.verificationRequestedAt || ''),
        verificationNote: data.verificationNote !== undefined ? data.verificationNote : (base.verificationNote || ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userRef, cleanDataForFirestore(fullDoc));
    } else {
      await updateDoc(userRef, sanitizeUpdateData({
        ...data,
        updatedAt: new Date().toISOString(),
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------- POSTS OPERATIONS ----------------

export const KNOWN_ADMIN_IDS = new Set(['admin', 'u1', 'superadmin', 'AABsRoeGCgaddFMh9S2cZqN9CaG3']);
export const KNOWN_ADMIN_NAMES = new Set(['superadmin', 'zoran krstin', 'uredništvo', 'administrator', 'admin']);

export function isUserAdminIdentity(id?: string, name?: string, role?: string): boolean {
  if (id && (KNOWN_ADMIN_IDS.has(id) || (auth.currentUser && id === auth.currentUser.uid))) return true;
  if (name && KNOWN_ADMIN_NAMES.has(name.trim().toLowerCase())) return true;
  if (role === 'superadmin' || role === 'admin') return true;
  return false;
}

export function subscribeToPosts(onPosts: (posts: FirestorePost[]) => void): () => void {
  const path = 'posts';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
      const allMockDeals = [...INITIAL_DEALS, ...HERO_BENTO_DEALS];
      const posts: FirestorePost[] = snapshot.docs.map(d => {
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
      onPosts(posts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export async function createPostInFirestore(post: Omit<FirestorePost, 'id'> & { id?: string }): Promise<string> {
  const path = 'posts';
  try {
    const postRef = doc(collection(db, path));
    const newPost: FirestorePost = {
      ...post,
      id: postRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
    };
    await setDoc(postRef, cleanDataForFirestore(newPost));
    return postRef.id;
  } catch (error) {
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

      const newPostPayload = cleanDataForFirestore({
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
        expirationDate: data.expirationDate || (mockDeal as any)?.expirationDate || '',
        discount: data.discount || (mockDeal ? mockDeal.discount : '') || '',
        promoCode: data.promoCode || (mockDeal ? mockDeal.code : '') || '',
        dealLink: data.dealLink || (mockDeal ? mockDeal.link : '') || '',
        location: data.location || (mockDeal ? mockDeal.region : '') || '',
        likesCount: data.likesCount || (mockDeal?.votes) || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Strict enforcement: Original author and category cannot be overwritten
      newPostPayload.authorId = originalAuthorId;
      newPostPayload.authorName = originalAuthorName;
      newPostPayload.authorRole = originalAuthorRole;
      newPostPayload.authorAvatar = originalAuthorAvatar;
      newPostPayload.category = finalCategory;
      newPostPayload.categoryName = finalCategoryName;

      await setDoc(postRef, newPostPayload);
    } else {
      const existing = snap.data() as FirestorePost;
      const safeData = { ...data };

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

      await updateDoc(postRef, sanitizeUpdateData({
        ...safeData,
        updatedAt: new Date().toISOString(),
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePostInFirestore(postId: string): Promise<void> {
  const path = `posts/${postId}`;
  try {
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

export function subscribeToAds(onAds: (ads: FirestoreAd[]) => void): () => void {
  const path = 'ads';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const ads: FirestoreAd[] = snapshot.docs.map(d => {
        const item = {
          id: d.id,
          ...(d.data() as Omit<FirestoreAd, 'id'>),
        };
        const mockAd = INITIAL_ADS.find(x => x.id === item.id);
        if (mockAd && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
          item.authorName = mockAd.author;
          item.authorRole = 'Uporabnik';
          item.authorAvatar = (mockAd as any).authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mockAd.author)}`;
          item.authorId = `author-${mockAd.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
        return item;
      });
      onAds(ads);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

export async function createAdInFirestore(ad: Omit<FirestoreAd, 'id'> & { id?: string }): Promise<string> {
  const path = 'ads';
  try {
    const adRef = doc(collection(db, path));
    const newAd: FirestoreAd = {
      ...ad,
      id: adRef.id,
      status: ad.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(adRef, cleanDataForFirestore(newAd));
    return adRef.id;
  } catch (error) {
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
      const originalAuthorAvatar = (mockAd as any)?.authorAvatar || (data.authorAvatar && !isAuthorAdmin ? data.authorAvatar : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(originalAuthorName)}`);
      const finalCategory = data.category && data.category !== 'splosno' ? data.category : (mockAd?.category || data.category || 'ostalo');

      const payload = cleanDataForFirestore({
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      payload.authorId = originalAuthorId;
      payload.authorName = originalAuthorName;
      payload.authorRole = originalAuthorRole;
      payload.authorAvatar = originalAuthorAvatar;
      payload.category = finalCategory;

      await setDoc(adRef, payload);
    } else {
      const existing = snap.data() as FirestoreAd;
      const safeData = { ...data };

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
        safeData.authorAvatar = (mockAd as any).authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mockAd.author)}`;
        safeData.authorId = `author-${mockAd.author.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }

      await updateDoc(adRef, sanitizeUpdateData({
        ...safeData,
        updatedAt: new Date().toISOString(),
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAdInFirestore(adId: string): Promise<void> {
  const path = `ads/${adId}`;
  try {
    await deleteDoc(doc(db, 'ads', adId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------- EVENTS (DOGODKI) OPERATIONS ----------------

export function subscribeToEvents(onEvents: (events: FirestoreEvent[]) => void): () => void {
  const path = 'events';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
      const events: FirestoreEvent[] = snapshot.docs.map(d => {
        const item = {
          id: d.id,
          ...(d.data() as Omit<FirestoreEvent, 'id'>),
        };
        const mockEvent = INITIAL_EVENTS.find(x => x.id === item.id);
        if (mockEvent && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
          item.authorName = mockEvent.organizer;
          item.authorRole = 'Organizator';
          item.authorAvatar = (mockEvent as any).organizerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mockEvent.organizer)}`;
          item.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
        return item;
      });
      onEvents(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

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
      const item = {
        id: snap.id,
        ...(snap.data() as Omit<FirestoreEvent, 'id'>),
      };
      const mockEvent = INITIAL_EVENTS.find(x => x.id === item.id);
      if (mockEvent && (isUserAdminIdentity(item.authorId, item.authorName, item.authorRole) || !item.authorName)) {
        item.authorName = mockEvent.organizer;
        item.authorRole = 'Organizator';
        item.authorAvatar = (mockEvent as any).organizerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mockEvent.organizer)}`;
        item.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }
      return item;
    }
    // Case-insensitive fallback search
    const q = query(collection(db, 'events'), limit(100));
    const allSnaps = await getDocs(q);
    const match = allSnaps.docs.find(d => {
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      return d.id.toLowerCase() === eventId.toLowerCase() || docClean === cleanId;
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
        item.authorAvatar = (mockEvent as any).organizerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mockEvent.organizer)}`;
        item.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }
      return item;
    }
    return null;
  } catch (error) {
    console.warn(`Could not get event ${eventId}:`, error);
    return null;
  }
}

export async function getPostById(postId: string): Promise<FirestorePost | null> {
  if (!postId) return null;
  const cleanId = postId.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
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
      return {
        id: snap.id,
        ...(snap.data() as Omit<FirestorePost, 'id'>),
      };
    }
    const q = query(collection(db, 'posts'), limit(100));
    const allSnaps = await getDocs(q);
    const match = allSnaps.docs.find(d => {
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      return d.id.toLowerCase() === postId.toLowerCase() || docClean === cleanId;
    });
    if (match) {
      return {
        id: match.id,
        ...(match.data() as Omit<FirestorePost, 'id'>),
      };
    }
    return null;
  } catch (error) {
    console.warn(`Could not get post ${postId}:`, error);
    return null;
  }
}

export async function getAdById(adId: string): Promise<FirestoreAd | null> {
  if (!adId) return null;
  const cleanId = adId.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
  try {
    let snap = await getDoc(doc(db, 'ads', adId));
    if (!snap.exists() && cleanId !== adId) {
      snap = await getDoc(doc(db, 'ads', cleanId));
    }
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'ads', `ad-${cleanId}`));
    }
    if (snap.exists()) {
      return {
        id: snap.id,
        ...(snap.data() as Omit<FirestoreAd, 'id'>),
      };
    }
    const q = query(collection(db, 'ads'), limit(100));
    const allSnaps = await getDocs(q);
    const match = allSnaps.docs.find(d => {
      const docClean = d.id.toLowerCase().trim().replace(/^(event|ad|deal|blog|post)-/, '');
      return d.id.toLowerCase() === adId.toLowerCase() || docClean === cleanId;
    });
    if (match) {
      return {
        id: match.id,
        ...(match.data() as Omit<FirestoreAd, 'id'>),
      };
    }
    return null;
  } catch (error) {
    console.warn(`Could not get ad ${adId}:`, error);
    return null;
  }
}

export async function fetchDocumentById(
  id: string,
  preferredType?: 'event' | 'deal' | 'ad' | 'blog' | 'post'
): Promise<{ type: 'event' | 'deal' | 'ad' | 'blog'; data: any } | null> {
  if (!id) return null;

  const checkEvent = async () => {
    const ev = await getEventById(id);
    if (ev) return { type: 'event' as const, data: ev };
    return null;
  };

  const checkPost = async () => {
    const post = await getPostById(id);
    if (post) {
      const isDeal = post.category === 'deal' || 
                     post.category === 'ugodnosti' || 
                     post.category?.startsWith('deal') || 
                     post.categoryName === 'Ugodnosti' || 
                     post.categoryName === 'Ugodnost' ||
                     post.id.startsWith('deal-') ||
                     post.id.startsWith('hero-bento-');
      return { type: (isDeal ? 'deal' : 'blog') as ('deal' | 'blog'), data: post };
    }
    return null;
  };

  const checkAd = async () => {
    const ad = await getAdById(id);
    if (ad) return { type: 'ad' as const, data: ad };
    return null;
  };

  if (preferredType === 'event') {
    return (await checkEvent()) || (await checkPost()) || (await checkAd());
  } else if (preferredType === 'ad') {
    return (await checkAd()) || (await checkPost()) || (await checkEvent());
  } else if (preferredType === 'deal' || preferredType === 'blog' || preferredType === 'post') {
    return (await checkPost()) || (await checkEvent()) || (await checkAd());
  } else {
    return (await checkEvent()) || (await checkPost()) || (await checkAd());
  }
}

export async function createEventInFirestore(event: Omit<FirestoreEvent, 'id'> & { id?: string }): Promise<string> {
  const path = 'events';
  try {
    const eventRef = doc(collection(db, path));
    const newEvent: FirestoreEvent = {
      ...event,
      id: eventRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPromoted: event.isPromoted || false,
    };
    await setDoc(eventRef, cleanDataForFirestore(newEvent));
    return eventRef.id;
  } catch (error) {
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
      const originalAuthorAvatar = (mockEvent as any)?.organizerAvatar || (data.authorAvatar && !isAuthorAdmin ? data.authorAvatar : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(originalAuthorName)}`);
      const finalCategory = data.category && data.category !== 'splosno' ? data.category : (mockEvent?.category || data.category || 'dogodki');

      const payload = cleanDataForFirestore({
        ...data,
        id: eventId,
        title: data.title || mockEvent?.title || 'Dogodek',
        description: data.description || mockEvent?.description || '',
        category: finalCategory,
        eventDate: data.eventDate || mockEvent?.date || new Date().toISOString().split('T')[0],
        location: data.location || mockEvent?.location || 'Ljubljana',
        price: data.price || mockEvent?.price || 'Vstop prost',
        imageUrl: data.imageUrl || mockEvent?.image || '',
        status: data.status || 'published',
        isPromoted: data.isPromoted || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      payload.authorId = originalAuthorId;
      payload.authorName = originalAuthorName;
      payload.authorRole = originalAuthorRole;
      payload.authorAvatar = originalAuthorAvatar;
      payload.category = finalCategory;

      await setDoc(eventRef, payload);
    } else {
      const existing = snap.data() as FirestoreEvent;
      const safeData = { ...data };

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
        safeData.authorAvatar = (mockEvent as any).organizerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mockEvent.organizer)}`;
        safeData.authorId = `organizer-${mockEvent.organizer.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }

      await updateDoc(eventRef, sanitizeUpdateData({
        ...safeData,
        updatedAt: new Date().toISOString(),
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventInFirestore(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
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
