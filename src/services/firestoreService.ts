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

/**
 * Sanitizes an object before calling Firestore updateDoc:
 * - Converts `rejectionReason: undefined` (or any other field where undefined signifies removal) into `deleteField()`
 * - Strips out any remaining `undefined` properties so Firestore updateDoc never throws "Unsupported field value: undefined"
 */
export function sanitizeUpdateData(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      if (key === 'rejectionReason') {
        result[key] = deleteField();
      }
      // Omit all other undefined fields so Firestore doesn't reject them
      continue;
    }
    result[key] = value;
  }
  return result;
}

/**
 * Strips out keys with undefined values before setDoc.
 */
export function cleanDataForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
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
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  imageUrl?: string;
  price?: string;
  location?: string;
  status?: 'published' | 'pending' | 'rejected' | 'archived';
  rejectionReason?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreAd {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  location: string;
  phone?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  imageUrl?: string;
  status: 'active' | 'sold' | 'closed' | 'pending' | 'rejected';
  rejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate?: string;
  date?: string;
  price?: string;
  category: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  imageUrl?: string;
  isPromoted?: boolean;
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

export function subscribeToPosts(onPosts: (posts: FirestorePost[]) => void): () => void {
  const path = 'posts';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const posts: FirestorePost[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<FirestorePost, 'id'>),
      }));
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
    if (!snap.exists()) {
      await setDoc(postRef, cleanDataForFirestore({
        id: postId,
        title: data.title || 'Objava',
        content: data.content || '',
        category: data.category || 'splosno',
        authorId: data.authorId || auth.currentUser?.uid || 'admin',
        authorName: data.authorName || auth.currentUser?.displayName || 'Uredništvo',
        authorRole: data.authorRole || 'superadmin',
        status: data.status || 'published',
        imageUrl: data.imageUrl || '',
        price: data.price || '',
        location: data.location || '',
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      }));
    } else {
      await updateDoc(postRef, sanitizeUpdateData({
        ...data,
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

export async function togglePostLikeInFirestore(postId: string, increment: boolean): Promise<void> {
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
      const ads: FirestoreAd[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreAd, 'id'>),
      }));
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
    if (!snap.exists()) {
      await setDoc(adRef, cleanDataForFirestore({
        id: adId,
        title: data.title || 'Mali oglas',
        description: data.description || '',
        category: data.category || 'razno',
        price: data.price || 'Po dogovoru',
        location: data.location || 'Slovenija',
        phone: data.phone || '',
        authorId: data.authorId || auth.currentUser?.uid || 'admin',
        authorName: data.authorName || auth.currentUser?.displayName || 'Uporabnik',
        authorRole: data.authorRole || 'superadmin',
        imageUrl: data.imageUrl || '',
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      }));
    } else {
      await updateDoc(adRef, sanitizeUpdateData({
        ...data,
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
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const events: FirestoreEvent[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreEvent, 'id'>),
      }));
      onEvents(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
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
    if (!snap.exists()) {
      await setDoc(eventRef, cleanDataForFirestore({
        id: eventId,
        title: data.title || 'Dogodek',
        description: data.description || '',
        category: data.category || 'dogodki',
        eventDate: data.eventDate || new Date().toISOString().split('T')[0],
        location: data.location || 'Ljubljana',
        price: data.price || 'Vstop prost',
        authorId: data.authorId || auth.currentUser?.uid || 'admin',
        authorName: data.authorName || auth.currentUser?.displayName || 'Organizator',
        authorRole: data.authorRole || 'superadmin',
        imageUrl: data.imageUrl || '',
        status: data.status || 'published',
        isPromoted: data.isPromoted || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      }));
    } else {
      await updateDoc(eventRef, sanitizeUpdateData({
        ...data,
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
