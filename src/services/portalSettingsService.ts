import { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PortalSettings {
  fallbackImageUrl?: string;
  useFallbackForMissingImages?: boolean;
  useFallbackForBrokenImages?: boolean;
  fallbackTypes?: {
    posts?: boolean;
    events?: boolean;
    ads?: boolean;
    deals?: boolean;
    news?: boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: PortalSettings = {
  fallbackImageUrl: '',
  useFallbackForMissingImages: false,
  useFallbackForBrokenImages: false,
  fallbackTypes: {
    posts: true,
    events: true,
    ads: true,
    deals: true,
    news: true,
  },
};

// In-memory cache for fast, synchronous access across components
let cachedSettings: PortalSettings = { ...DEFAULT_SETTINGS };

const SETTINGS_DOC_REF = () => doc(db, 'settings', 'portal');

/**
 * Real-time listener for portal settings with fallback to defaults.
 */
export function subscribeToPortalSettings(callback: (settings: PortalSettings) => void): () => void {
  try {
    const unsub = onSnapshot(
      SETTINGS_DOC_REF(),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PortalSettings;
          cachedSettings = {
            fallbackImageUrl: data.fallbackImageUrl || '',
            useFallbackForMissingImages: !!data.useFallbackForMissingImages,
            useFallbackForBrokenImages: !!data.useFallbackForBrokenImages,
            fallbackTypes: data.fallbackTypes || DEFAULT_SETTINGS.fallbackTypes,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          };
        } else {
          cachedSettings = { ...DEFAULT_SETTINGS };
        }
        callback(cachedSettings);
      },
      (error) => {
        console.warn('Could not subscribe to portal settings (offline or permission):', error);
        callback(cachedSettings);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Error setting up settings listener:', err);
    callback(cachedSettings);
    return () => {};
  }
}

/**
 * Fetch current settings once.
 */
export async function getPortalSettings(): Promise<PortalSettings> {
  try {
    const snap = await getDoc(SETTINGS_DOC_REF());
    if (snap.exists()) {
      const data = snap.data() as PortalSettings;
      cachedSettings = {
        fallbackImageUrl: data.fallbackImageUrl || '',
        useFallbackForMissingImages: !!data.useFallbackForMissingImages,
        useFallbackForBrokenImages: !!data.useFallbackForBrokenImages,
        fallbackTypes: data.fallbackTypes || DEFAULT_SETTINGS.fallbackTypes,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
  } catch (err) {
    console.warn('Error fetching portal settings:', err);
  }
  return cachedSettings;
}

/**
 * Save updated portal settings (admin only).
 */
export async function savePortalSettings(
  updates: Partial<PortalSettings>,
  updatedBy?: string
): Promise<void> {
  const newSettings: PortalSettings = {
    ...cachedSettings,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || cachedSettings.updatedBy || 'admin',
  };

  await setDoc(SETTINGS_DOC_REF(), newSettings, { merge: true });
  cachedSettings = newSettings;
}

/**
 * React hook to consume and update portal settings.
 */
export function usePortalSettings() {
  const [settings, setSettings] = useState<PortalSettings>(cachedSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToPortalSettings((updated) => {
      setSettings(updated);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return {
    settings,
    loading,
    saveSettings: savePortalSettings,
  };
}

/**
 * Synchronous check to get the active fallback image if enabled.
 * Returns null if disabled or not configured.
 */
export function getActiveFallbackImage(
  forMissingPostPhoto: boolean = false,
  postType?: 'blog' | 'post' | 'event' | 'ad' | 'deal' | 'news'
): string | null {
  if (forMissingPostPhoto) {
    if (cachedSettings.useFallbackForMissingImages && cachedSettings.fallbackImageUrl) {
      if (postType && cachedSettings.fallbackTypes) {
        const typeKey = postType === 'post' || postType === 'blog' 
          ? 'posts' 
          : (postType === 'event' ? 'events' : (postType === 'ad' ? 'ads' : (postType === 'deal' ? 'deals' : 'news')));
        if (cachedSettings.fallbackTypes[typeKey as keyof typeof cachedSettings.fallbackTypes] === false) {
          return null;
        }
      }
      return cachedSettings.fallbackImageUrl;
    }
    return null;
  }

  if (cachedSettings.useFallbackForBrokenImages && cachedSettings.fallbackImageUrl) {
    return cachedSettings.fallbackImageUrl;
  }
  return null;
}

/**
 * Universal onError handler for image tags.
 * If admin configured and enabled a custom fallback image, it switches to it once.
 * Otherwise, it gracefully hides the broken image container so no broken icon is shown.
 */
export function handleImageFallbackError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const fallback = cachedSettings.useFallbackForBrokenImages ? (cachedSettings.fallbackImageUrl || '') : '';

  if (fallback && img.src !== fallback) {
    img.src = fallback;
    return;
  }

  // If no fallback is configured, gracefully hide the broken image element
  img.style.display = 'none';
  // Also hide parent link/container if it was an image wrapper
  if (img.parentElement && img.parentElement.classList.contains('image-wrapper-hideable')) {
    img.parentElement.style.display = 'none';
  }
}
