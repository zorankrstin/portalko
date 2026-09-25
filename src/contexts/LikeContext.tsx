import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { subscribeToUserLikes, toggleItemLikeInFirestore } from '../services/firestoreService';
import type { PostDetailType } from '../types';

export type LikeTargetType = PostDetailType | 'news' | 'ad' | 'event' | 'blog' | 'deal' | 'post';

interface LikeContextType {
  likedIds: string[];
  isLiked: (id: string) => boolean;
  getLikesCount: (id: string, initialCount?: number | string) => number;
  toggleLike: (
    id: string,
    options?: {
      targetType?: LikeTargetType;
      initialCount?: number | string;
      title?: string;
    }
  ) => Promise<{ success: boolean; liked: boolean; newCount: number }>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

const STORAGE_LIKES_PREFIX = 'portal_user_likes_';
const STORAGE_COUNTS_KEY = 'portal_custom_likes_counts';

export function LikeProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || auth.currentUser?.uid || null;

  // Track liked IDs for current user
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    if (!currentUserId) return [];
    try {
      const stored = localStorage.getItem(`${STORAGE_LIKES_PREFIX}${currentUserId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Track counts override (live delta/updates)
  const [countsOverride, setCountsOverride] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_COUNTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Reload local liked IDs when user changes
  useEffect(() => {
    if (!currentUserId) {
      setLikedIds([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`${STORAGE_LIKES_PREFIX}${currentUserId}`);
      if (stored) {
        setLikedIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error reading likes from storage', e);
    }
  }, [currentUserId]);

  // Sync with Firestore real-time for authenticated user
  useEffect(() => {
    let unsubscribeFirestoreLikes: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubscribeFirestoreLikes) {
        unsubscribeFirestoreLikes();
        unsubscribeFirestoreLikes = null;
      }

      if (fbUser) {
        unsubscribeFirestoreLikes = subscribeToUserLikes(fbUser.uid, (firestoreLikedIds) => {
          if (firestoreLikedIds) {
            setLikedIds(prev => Array.from(new Set([...prev, ...firestoreLikedIds])));
          }
        });
      }
    });

    return () => {
      if (unsubscribeFirestoreLikes) unsubscribeFirestoreLikes();
      unsubscribeAuth();
    };
  }, []);

  // Persist likedIds to localStorage
  useEffect(() => {
    if (currentUserId) {
      try {
        localStorage.setItem(`${STORAGE_LIKES_PREFIX}${currentUserId}`, JSON.stringify(likedIds));
      } catch (e) {
        console.error('Error persisting likes', e);
      }
    }
  }, [likedIds, currentUserId]);

  // Persist countsOverride to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COUNTS_KEY, JSON.stringify(countsOverride));
    } catch (e) {
      console.error('Error persisting counts override', e);
    }
  }, [countsOverride]);

  const isLiked = (id: string): boolean => {
    if (!currentUserId) return false;
    return likedIds.includes(id);
  };

  const parseCount = (cnt?: number | string): number => {
    if (typeof cnt === 'number') return cnt;
    if (typeof cnt === 'string') {
      const match = cnt.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  };

  const getLikesCount = (id: string, initialCount?: number | string): number => {
    if (countsOverride[id] !== undefined) {
      return countsOverride[id];
    }
    return parseCount(initialCount);
  };

  const toggleLike = async (
    id: string,
    options?: {
      targetType?: LikeTargetType;
      initialCount?: number | string;
      title?: string;
    }
  ): Promise<{ success: boolean; liked: boolean; newCount: number }> => {
    const rawInitial = parseCount(options?.initialCount);
    const currentCount = countsOverride[id] !== undefined ? countsOverride[id] : rawInitial;

    // Check if user is logged in
    const activeUid = currentUserId;
    if (!activeUid) {
      // User is not authenticated -> prompt to login
      window.dispatchEvent(
        new CustomEvent('open_auth_modal', {
          detail: {
            mode: 'login',
            message: 'Za všečkanje objav se morate prijaviti.',
          },
        })
      );
      return { success: false, liked: false, newCount: currentCount };
    }

    const currentlyLiked = likedIds.includes(id);
    const nextLiked = !currentlyLiked;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    // 1. Optimistic state updates
    setLikedIds(prev => (nextLiked ? [...prev, id] : prev.filter(i => i !== id)));
    setCountsOverride(prev => ({
      ...prev,
      [id]: nextCount,
    }));

    // 2. Persist to Firestore
    try {
      const targetType = (options?.targetType || 'post') as any;
      await toggleItemLikeInFirestore(targetType, id, activeUid, nextLiked);
    } catch (err) {
      console.error('Error persisting like to Firestore:', err);
    }

    return { success: true, liked: nextLiked, newCount: nextCount };
  };

  return (
    <LikeContext.Provider value={{ likedIds, isLiked, getLikesCount, toggleLike }}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikeContext);
  if (!context) throw new Error('useLikes must be used within LikeProvider');
  return context;
}
