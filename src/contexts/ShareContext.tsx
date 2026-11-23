import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  ShareTargetType,
  computeCanonicalShareKey,
  getCachedShareCounts,
  saveCachedShareCounts,
  subscribeToShareCounts,
  incrementShareCountInFirestore,
} from '../services/firestoreService';
import { ShareFeedbackOverlay, ShareFeedbackPayload } from '../components/common/ShareFeedbackOverlay';

export type { ShareTargetType };

export interface TriggerShareFeedbackOptions {
  title: string;
  subtitle?: string;
  url?: string;
  imageUrl?: string;
  domain?: string;
  showConfetti?: boolean;
}

interface ShareContextType {
  shareCounts: Record<string, number>;
  getShareKey: (id?: string, type?: ShareTargetType | string, url?: string) => string;
  getSharesCount: (id?: string, type?: ShareTargetType | string, url?: string, initialCount?: number) => number;
  incrementShareCount: (params: {
    id?: string;
    type?: ShareTargetType | string;
    url?: string;
    initialCount?: number;
  }) => Promise<number>;
  triggerShareFeedback: (options: TriggerShareFeedbackOptions) => void;
  dismissShareFeedback: () => void;
}

const ShareContext = createContext<ShareContextType | undefined>(undefined);

export function ShareProvider({ children }: { children: ReactNode }) {
  const [shareCounts, setShareCounts] = useState<Record<string, number>>(() => getCachedShareCounts());
  const [shareFeedback, setShareFeedback] = useState<ShareFeedbackPayload | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackIdRef = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeToShareCounts((firestoreCounts) => {
      setShareCounts((prev) => {
        const merged: Record<string, number> = { ...prev };
        for (const [key, value] of Object.entries(firestoreCounts)) {
          if (typeof value === 'number' && value >= 0) {
            merged[key] = Math.max(value, merged[key] ?? 0);
          }
        }
        saveCachedShareCounts(merged);
        return merged;
      });
    });

    return () => {
      unsubscribe();
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const dismissShareFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setShareFeedback(null);
  }, []);

  const triggerShareFeedback = useCallback((options: TriggerShareFeedbackOptions) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackIdRef.current += 1;
    const nextId = feedbackIdRef.current;

    setShareFeedback({
      id: nextId,
      title: options.title,
      subtitle: options.subtitle,
      url: options.url,
      imageUrl: options.imageUrl,
      domain: options.domain,
      showConfetti: options.showConfetti ?? true,
    });

    feedbackTimerRef.current = setTimeout(() => {
      setShareFeedback((current) => (current?.id === nextId ? null : current));
    }, 3800);
  }, []);

  const getShareKey = useCallback((id?: string, type?: ShareTargetType | string, url?: string): string => {
    return computeCanonicalShareKey({ id, type, url });
  }, []);

  const getSharesCount = useCallback(
    (id?: string, type?: ShareTargetType | string, url?: string, initialCount?: number): number => {
      const base = typeof initialCount === 'number' && initialCount > 0 ? initialCount : 0;
      const key = computeCanonicalShareKey({ id, type, url });
      if (!key) return base;
      const tracked = shareCounts[key] ?? 0;
      return Math.max(tracked, base);
    },
    [shareCounts]
  );

  const incrementShareCount = useCallback(
    async (params: {
      id?: string;
      type?: ShareTargetType | string;
      url?: string;
      initialCount?: number;
    }): Promise<number> => {
      const key = computeCanonicalShareKey(params);
      if (!key) return 0;

      const base = typeof params.initialCount === 'number' && params.initialCount > 0 ? params.initialCount : 0;
      let optimisticNext = 1;

      setShareCounts((prev) => {
        const current = Math.max(prev[key] ?? 0, base);
        optimisticNext = current + 1;
        const nextMap = { ...prev, [key]: optimisticNext };
        saveCachedShareCounts(nextMap);
        return nextMap;
      });

      try {
        const persisted = await incrementShareCountInFirestore({
          id: params.id,
          type: params.type,
          url: params.url,
        });
        if (typeof persisted === 'number' && persisted > optimisticNext) {
          setShareCounts((prev) => {
            const nextMap = { ...prev, [key]: Math.max(persisted, prev[key] ?? 0) };
            saveCachedShareCounts(nextMap);
            return nextMap;
          });
          return persisted;
        }
      } catch (err) {
        console.warn('[ShareContext] Error persisting share count:', err);
      }

      return optimisticNext;
    },
    []
  );

  return (
    <ShareContext.Provider
      value={{
        shareCounts,
        getShareKey,
        getSharesCount,
        incrementShareCount,
        triggerShareFeedback,
        dismissShareFeedback,
      }}
    >
      {children}
      <ShareFeedbackOverlay feedback={shareFeedback} onDismiss={dismissShareFeedback} />
    </ShareContext.Provider>
  );
}

export function useShares() {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error('useShares must be used within ShareProvider');
  }
  return context;
}
