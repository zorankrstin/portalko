import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PromotionBanner, BannerPosition } from '../types';

const BANNERS_COLLECTION = 'banners';
const LOCAL_STORAGE_KEY = 'portalko_promotion_banners_cache';

// High-quality initial default demo banners to ensure the feature is immediately testable and visually rich
export const DEFAULT_SAMPLE_BANNERS: PromotionBanner[] = [
  {
    id: 'banner-main-spring-fair',
    title: 'Pomladni kulinarični sejem 2026',
    position: 'main_container',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    targetUrl: 'https://portalko.si/dogodki',
    altText: 'Pomladni kulinarični sejem',
    caption: 'Okusite lokalne dobrote priznanih domačih pridelovalcev to soboto v mestnem jedru!',
    openInNewTab: true,
    isActive: true,
    order: 1,
    clicksCount: 24,
    viewsCount: 312,
    createdAt: new Date().toISOString(),
    createdBy: 'Uredništvo Portalko'
  },
  {
    id: 'banner-right-cafe',
    title: 'Pražarna Kave Mestni Trg',
    position: 'right_sidebar',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    targetUrl: 'https://portalko.si/akcije',
    altText: 'Pražarna Kave Mestni Trg - Posebna ponudba',
    caption: '15% popust na vse pakete sveže pražene kave s kodo PORTALKO15.',
    openInNewTab: true,
    isActive: true,
    order: 1,
    clicksCount: 18,
    viewsCount: 245,
    createdAt: new Date().toISOString(),
    createdBy: 'Uredništvo Portalko'
  },
  {
    id: 'banner-left-advertise',
    title: 'Oglašujte na Portalko',
    position: 'left_sidebar',
    type: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80',
    targetUrl: 'https://portalko.si/info',
    altText: 'Oglašujte svojo dejavnost na Portalko',
    caption: 'Dosezite več kot 45.000 lokalnih bralcev mesečno z izpostavljeno pasico.',
    openInNewTab: true,
    isActive: true,
    order: 1,
    clicksCount: 9,
    viewsCount: 180,
    createdAt: new Date().toISOString(),
    createdBy: 'Uredništvo Portalko'
  },
  {
    id: 'banner-right-thirdparty-widget',
    title: 'Interaktivna koda tretjih oseb (Widget)',
    position: 'right_sidebar',
    type: 'code',
    customCode: `<div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 14px; padding: 14px; color: #fff; text-align: center; border: 1px solid rgba(255,255,255,0.1); font-family: inherit;">
  <span style="display: inline-block; font-size: 10px; font-weight: 700; background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">Partner Portala</span>
  <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #f8fafc;">Lokalna Eko Tržnica</h4>
  <p style="margin: 0 0 10px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">Brezplačna dostava sveže zelenjave in sadja za vsa naročila nad 25€.</p>
  <a href="https://eko-portal.si" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #10b981; color: white; padding: 6px 14px; border-radius: 8px; font-size: 11px; font-weight: 600; text-decoration: none;">Naroči z dostavo →</a>
</div>`,
    isActive: true,
    order: 2,
    clicksCount: 11,
    viewsCount: 198,
    createdAt: new Date().toISOString(),
    createdBy: 'Partner Oglas'
  }
];

// In-memory cache
let cachedBanners: PromotionBanner[] = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore localStorage parse error
  }
  return [...DEFAULT_SAMPLE_BANNERS];
})();

function updateCache(banners: PromotionBanner[]) {
  cachedBanners = banners;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(banners));
  } catch (e) {
    // Ignore storage quota error
  }
}

/**
 * Real-time subscription to promotion banners.
 * Automatically handles Firestore snapshot updates and falls back to cached data on error.
 */
export function subscribeToBanners(callback: (banners: PromotionBanner[]) => void): () => void {
  // Immediately notify listener with current cached data
  callback(cachedBanners);

  try {
    const q = query(collection(db, BANNERS_COLLECTION));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: PromotionBanner[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || '',
              position: data.position || 'main_container',
              type: data.type || 'image',
              imageUrl: data.imageUrl || '',
              targetUrl: data.targetUrl || '',
              altText: data.altText || '',
              caption: data.caption || '',
              openInNewTab: data.openInNewTab !== false,
              customCode: data.customCode || '',
              isActive: data.isActive !== false,
              order: typeof data.order === 'number' ? data.order : 1,
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              clicksCount: typeof data.clicksCount === 'number' ? data.clicksCount : 0,
              viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || undefined,
              createdBy: data.createdBy || 'Admin',
              createdById: data.createdById || undefined
            };
          });

          // Sort by order ascending
          loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
          updateCache(loaded);
          callback(loaded);
        } else {
          // If Firestore collection is empty, seed defaults into Firestore for immediate persistence
          seedDefaultBanners().catch(() => {});
          callback(cachedBanners);
        }
      },
      (error) => {
        console.warn('Could not listen to banners collection (using cached/fallback):', error);
        callback(cachedBanners);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to initialize banners listener:', err);
    callback(cachedBanners);
    return () => {};
  }
}

/**
 * Seed default banners to Firestore if collection is empty
 */
async function seedDefaultBanners(): Promise<void> {
  try {
    for (const b of DEFAULT_SAMPLE_BANNERS) {
      const bannerRef = doc(db, BANNERS_COLLECTION, b.id);
      await setDoc(bannerRef, {
        ...b,
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Could not seed default banners to Firestore:', err);
  }
}

/**
 * Fetch all banners once
 */
export async function getBanners(): Promise<PromotionBanner[]> {
  try {
    const q = query(collection(db, BANNERS_COLLECTION));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const loaded: PromotionBanner[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any)
      }));
      loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
      updateCache(loaded);
      return loaded;
    }
  } catch (error) {
    console.warn('getBanners error (returning cached):', error);
  }
  return cachedBanners;
}

/**
 * Create or update a promotion banner
 */
export async function saveBanner(
  bannerData: Partial<PromotionBanner> & { title: string; position: BannerPosition; type: 'image' | 'code' }
): Promise<PromotionBanner> {
  const isEditing = Boolean(bannerData.id);
  const bannerId = bannerData.id || `banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const finalBanner: PromotionBanner = {
    id: bannerId,
    title: bannerData.title.trim(),
    position: bannerData.position,
    type: bannerData.type,
    imageUrl: bannerData.imageUrl?.trim() || '',
    targetUrl: bannerData.targetUrl?.trim() || '',
    altText: bannerData.altText?.trim() || '',
    caption: bannerData.caption?.trim() || '',
    openInNewTab: bannerData.openInNewTab !== false,
    customCode: bannerData.customCode || '',
    isActive: bannerData.isActive !== false,
    order: Number(bannerData.order) || 1,
    startDate: bannerData.startDate || '',
    endDate: bannerData.endDate || '',
    clicksCount: typeof bannerData.clicksCount === 'number' ? bannerData.clicksCount : 0,
    viewsCount: typeof bannerData.viewsCount === 'number' ? bannerData.viewsCount : 0,
    createdAt: bannerData.createdAt || now,
    updatedAt: now,
    createdBy: bannerData.createdBy || 'Administrator',
    createdById: bannerData.createdById
  };

  // Optimistically update local cache
  const updatedList = isEditing
    ? cachedBanners.map((b) => (b.id === bannerId ? finalBanner : b))
    : [...cachedBanners, finalBanner];
  updatedList.sort((a, b) => (a.order || 0) - (b.order || 0));
  updateCache(updatedList);

  // Persist to Firestore
  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, bannerId);
    await setDoc(bannerRef, finalBanner, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BANNERS_COLLECTION}/${bannerId}`);
  }

  return finalBanner;
}

/**
 * Delete a promotion banner
 */
export async function deleteBanner(bannerId: string): Promise<void> {
  // Optimistically remove from cache
  const updatedList = cachedBanners.filter((b) => b.id !== bannerId);
  updateCache(updatedList);

  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, bannerId);
    await deleteDoc(bannerRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BANNERS_COLLECTION}/${bannerId}`);
  }
}

/**
 * Toggle banner active status
 */
export async function toggleBannerStatus(bannerId: string, isActive: boolean): Promise<void> {
  // Optimistically update cache
  const updatedList = cachedBanners.map((b) =>
    b.id === bannerId ? { ...b, isActive, updatedAt: new Date().toISOString() } : b
  );
  updateCache(updatedList);

  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, bannerId);
    await updateDoc(bannerRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BANNERS_COLLECTION}/${bannerId}`);
  }
}

/**
 * Increment click count for analytics
 */
export async function recordBannerClick(bannerId: string): Promise<void> {
  // Optimistic update
  const updatedList = cachedBanners.map((b) =>
    b.id === bannerId ? { ...b, clicksCount: (b.clicksCount || 0) + 1 } : b
  );
  updateCache(updatedList);

  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, bannerId);
    await updateDoc(bannerRef, {
      clicksCount: increment(1)
    });
  } catch (error) {
    // Non-critical, ignore error
  }
}

/**
 * Increment view/impression count
 */
export async function recordBannerImpression(bannerId: string): Promise<void> {
  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, bannerId);
    await updateDoc(bannerRef, {
      viewsCount: increment(1)
    });
  } catch (error) {
    // Non-critical, ignore error
  }
}

/**
 * Filter active banners for a specific position, respecting scheduling
 */
export function filterActiveBannersForPosition(
  banners: PromotionBanner[],
  position: BannerPosition
): PromotionBanner[] {
  const now = Date.now();
  return banners
    .filter((b) => {
      if (b.position !== position) return false;
      if (!b.isActive) return false;

      // Start date check
      if (b.startDate) {
        const start = new Date(b.startDate).getTime();
        if (!isNaN(start) && now < start) return false;
      }

      // End date check
      if (b.endDate) {
        const end = new Date(b.endDate).getTime();
        if (!isNaN(end) && now > end) return false;
      }

      return true;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}
