import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, Role } from '../contexts/AuthContext';
import { SavedItemData } from '../contexts/BookmarkContext';

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
  status: 'active' | 'sold' | 'closed';
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(userRef, {
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
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

export async function updateUserInFirestore(userId: string, data: Partial<User>): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
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
    await setDoc(postRef, newPost);
    return postRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
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
    await setDoc(adRef, newAd);
    return adRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
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
    await setDoc(eventRef, newEvent);
    return eventRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return '';
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
