import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { 
  subscribeToUserLikes, 
  toggleItemLikeInFirestore, 
  subscribeToUserReactions, 
  toggleItemReactionInFirestore 
} from '../services/firestoreService';
import type { PostDetailType } from '../types';

export type LikeTargetType = PostDetailType | 'news' | 'ad' | 'event' | 'blog' | 'deal' | 'post';
export type ReactionType = 'like' | 'love' | 'dislike';

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

  // Rich reactions additions:
  reactions: Record<string, ReactionType | null>;
  getReaction: (id: string) => ReactionType | null;
  getReactionsCounts: (
    id: string, 
    initialCounts?: { likes?: number; loves?: number; dislikes?: number }
  ) => { likes: number; loves: number; dislikes: number };
  toggleReaction: (
    id: string,
    reaction: ReactionType,
    options?: {
      targetType?: LikeTargetType;
      initialCounts?: { likes?: number; loves?: number; dislikes?: number };
      title?: string;
    }
  ) => Promise<{ 
    success: boolean; 
    reaction: ReactionType | null; 
    counts: { likes: number; loves: number; dislikes: number } 
  }>;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

const STORAGE_LIKES_PREFIX = 'portal_user_likes_';
const STORAGE_REACTIONS_PREFIX = 'portal_user_reactions_';
const STORAGE_COUNTS_KEY = 'portal_custom_likes_counts';
const STORAGE_REACTIONS_COUNTS_KEY = 'portal_custom_reactions_counts';

export function LikeProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || auth.currentUser?.uid || null;

  // Track liked IDs for current user (standard likes)
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    if (!currentUserId) return [];
    try {
      const stored = localStorage.getItem(`${STORAGE_LIKES_PREFIX}${currentUserId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Track counts override for standard likes
  const [countsOverride, setCountsOverride] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_COUNTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Track rich reactions for current user
  const [reactions, setReactions] = useState<Record<string, ReactionType | null>>(() => {
    if (!currentUserId) return {};
    try {
      const stored = localStorage.getItem(`${STORAGE_REACTIONS_PREFIX}${currentUserId}`);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Track reactions counts override
  const [reactionsCounts, setReactionsCounts] = useState<Record<string, { likes: number; loves: number; dislikes: number }>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_REACTIONS_COUNTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Reload local likes and reactions when user changes
  useEffect(() => {
    if (!currentUserId) {
      setLikedIds([]);
      setReactions({});
      return;
    }
    try {
      const storedLikes = localStorage.getItem(`${STORAGE_LIKES_PREFIX}${currentUserId}`);
      if (storedLikes) {
        setLikedIds(JSON.parse(storedLikes));
      }
      const storedReactions = localStorage.getItem(`${STORAGE_REACTIONS_PREFIX}${currentUserId}`);
      if (storedReactions) {
        setReactions(JSON.parse(storedReactions));
      }
    } catch (e) {
      console.error('Error reading likes/reactions from storage', e);
    }
  }, [currentUserId]);

  // Sync likes and reactions with Firestore real-time
  useEffect(() => {
    let unsubscribeFirestoreLikes: (() => void) | null = null;
    let unsubscribeFirestoreReactions: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubscribeFirestoreLikes) {
        unsubscribeFirestoreLikes();
        unsubscribeFirestoreLikes = null;
      }
      if (unsubscribeFirestoreReactions) {
        unsubscribeFirestoreReactions();
        unsubscribeFirestoreReactions = null;
      }

      if (fbUser) {
        unsubscribeFirestoreLikes = subscribeToUserLikes(fbUser.uid, (firestoreLikedIds) => {
          if (firestoreLikedIds) {
            setLikedIds(prev => Array.from(new Set([...prev, ...firestoreLikedIds])));
          }
        });

        unsubscribeFirestoreReactions = subscribeToUserReactions(fbUser.uid, (firestoreReactions) => {
          if (firestoreReactions) {
            setReactions(prev => ({ ...prev, ...firestoreReactions }));
          }
        });
      }
    });

    return () => {
      if (unsubscribeFirestoreLikes) unsubscribeFirestoreLikes();
      if (unsubscribeFirestoreReactions) unsubscribeFirestoreReactions();
      unsubscribeAuth();
    };
  }, []);

  // Persist likedIds & reactions to localStorage
  useEffect(() => {
    if (currentUserId) {
      try {
        localStorage.setItem(`${STORAGE_LIKES_PREFIX}${currentUserId}`, JSON.stringify(likedIds));
        localStorage.setItem(`${STORAGE_REACTIONS_PREFIX}${currentUserId}`, JSON.stringify(reactions));
      } catch (e) {
        console.error('Error persisting likes/reactions', e);
      }
    }
  }, [likedIds, reactions, currentUserId]);

  // Persist overrides to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COUNTS_KEY, JSON.stringify(countsOverride));
      localStorage.setItem(STORAGE_REACTIONS_COUNTS_KEY, JSON.stringify(reactionsCounts));
    } catch (e) {
      console.error('Error persisting counts overrides', e);
    }
  }, [countsOverride, reactionsCounts]);

  const isLiked = (id: string): boolean => {
    if (!currentUserId) return false;
    return likedIds.includes(id);
  };

  const getReaction = (id: string): ReactionType | null => {
    if (!currentUserId) return null;
    return reactions[id] || null;
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

  const getReactionsCounts = (
    id: string,
    initialCounts?: { likes?: number; loves?: number; dislikes?: number }
  ): { likes: number; loves: number; dislikes: number } => {
    if (reactionsCounts[id] !== undefined) {
      return reactionsCounts[id];
    }
    return {
      likes: parseCount(initialCounts?.likes),
      loves: parseCount(initialCounts?.loves),
      dislikes: parseCount(initialCounts?.dislikes),
    };
  };

  const toggleLike = async (
    id: string,
    options?: {
      targetType?: LikeTargetType;
      initialCount?: number | string;
      title?: string;
    }
  ): Promise<{ success: boolean; liked: boolean; newCount: number }> => {
    const activeUid = currentUserId;
    if (!activeUid) {
      window.dispatchEvent(
        new CustomEvent('open_auth_modal', {
          detail: {
            mode: 'login',
            message: 'Za všečkanje objav se morate prijaviti.',
          },
        })
      );
      return { success: false, liked: false, newCount: getLikesCount(id, options?.initialCount) };
    }

    // Toggle reaction through toggleReaction for unification
    const currentReaction = getReaction(id);
    const result = await toggleReaction(id, 'like', {
      targetType: options?.targetType,
      initialCounts: { likes: parseCount(options?.initialCount) },
      title: options?.title,
    });

    return {
      success: result.success,
      liked: result.reaction === 'like',
      newCount: result.counts.likes,
    };
  };

  const toggleReaction = async (
    id: string,
    reaction: ReactionType,
    options?: {
      targetType?: LikeTargetType;
      initialCounts?: { likes?: number; loves?: number; dislikes?: number };
      title?: string;
    }
  ): Promise<{ 
    success: boolean; 
    reaction: ReactionType | null; 
    counts: { likes: number; loves: number; dislikes: number } 
  }> => {
    const activeUid = currentUserId;
    if (!activeUid) {
      window.dispatchEvent(
        new CustomEvent('open_auth_modal', {
          detail: {
            mode: 'login',
            message: 'Za reakcijo na objave se morate prijaviti.',
          },
        })
      );
      return { 
        success: false, 
        reaction: null, 
        counts: getReactionsCounts(id, options?.initialCounts) 
      };
    }

    const previousReaction = reactions[id] || null;
    const isTogglingOff = previousReaction === reaction;
    const nextReaction = isTogglingOff ? null : reaction;

    const initialCounts = getReactionsCounts(id, options?.initialCounts);
    const nextCounts = { ...initialCounts };

    // Deduct old reaction
    if (previousReaction === 'like') {
      nextCounts.likes = Math.max(0, nextCounts.likes - 1);
    } else if (previousReaction === 'love') {
      nextCounts.loves = Math.max(0, nextCounts.loves - 1);
    } else if (previousReaction === 'dislike') {
      nextCounts.dislikes = Math.max(0, nextCounts.dislikes - 1);
    }

    // Add new reaction
    if (nextReaction === 'like') {
      nextCounts.likes += 1;
    } else if (nextReaction === 'love') {
      nextCounts.loves += 1;
    } else if (nextReaction === 'dislike') {
      nextCounts.dislikes += 1;
    }

    // Optimistically update reactions, standard likedIds, and overrides
    setReactions(prev => ({
      ...prev,
      [id]: nextReaction,
    }));

    setReactionsCounts(prev => ({
      ...prev,
      [id]: nextCounts,
    }));

    // Update standard likedIds array for 100% compatibility
    setLikedIds(prev => (nextReaction === 'like' ? [...prev, id] : prev.filter(i => i !== id)));
    setCountsOverride(prev => ({
      ...prev,
      [id]: nextCounts.likes,
    }));

    // Persist to Firestore
    try {
      const targetType = (options?.targetType || 'post') as any;
      await toggleItemReactionInFirestore(targetType, id, activeUid, nextReaction, previousReaction);
    } catch (err) {
      console.error('Error persisting reaction to Firestore:', err);
    }

    return {
      success: true,
      reaction: nextReaction,
      counts: nextCounts,
    };
  };

  return (
    <LikeContext.Provider value={{ 
      likedIds, 
      isLiked, 
      getLikesCount, 
      toggleLike,
      reactions,
      getReaction,
      getReactionsCounts,
      toggleReaction
    }}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikeContext);
  if (!context) throw new Error('useLikes must be used within LikeProvider');
  return context;
}
