import { PromotionConfig, PromotionTargetSection, PromotionBadgeType } from '../types';

export interface PromotionPricingPlan {
  id: string;
  name: string;
  days: number;
  priceEur: number;
  description: string;
  popular?: boolean;
}

export const PROMOTION_PRICING_PLANS: PromotionPricingPlan[] = [
  {
    id: 'plan-3-days',
    name: 'Vikend izpostavitev (3 dni)',
    days: 3,
    priceEur: 4.99,
    description: 'Hitra promocija za vikend kupce ali kratke dogodke.',
  },
  {
    id: 'plan-7-days',
    name: 'Tedenska izpostavitev (7 dni)',
    days: 7,
    priceEur: 9.99,
    description: 'Najbolj priljubljen paket za maksimalen doseg med delovnim tednom.',
    popular: true,
  },
  {
    id: 'plan-14-days',
    name: 'Dvotitedenska izpostavitev (14 dni)',
    days: 14,
    priceEur: 16.99,
    description: 'Daljša prisotnost na vrhu za večje akcije, sezonsko prodajo in festivale.',
  },
  {
    id: 'plan-30-days',
    name: 'Mesečni paket (30 dni)',
    days: 30,
    priceEur: 29.99,
    description: 'Vrhunska dolgoročna izpostavitev podjetij, trgovin in rednih ugodnosti.',
  },
];

/**
 * Checks if an item is currently actively promoted for a given section/category view.
 */
export function isItemActivelyPromoted(
  promo: PromotionConfig | undefined,
  currentSection: PromotionTargetSection,
  currentCategoryId?: string,
  currentSubcategoryId?: string
): boolean {
  if (!promo || !promo.isPromoted) return false;

  // Check expiry date
  if (promo.promotedUntil) {
    const expiryTime = new Date(promo.promotedUntil).getTime();
    if (!isNaN(expiryTime) && Date.now() > expiryTime) {
      return false; // Expired
    }
  }

  // Check section targeting
  // Normalize aliases so 'ads' === 'mali-oglasi', 'events' === 'dogodki', 'deals' === 'ugodnosti'
  const normalizeSec = (s: string) => {
    if (s === 'ads' || s === 'mali-oglasi') return 'ads';
    if (s === 'events' || s === 'dogodki') return 'events';
    if (s === 'deals' || s === 'ugodnosti') return 'deals';
    if (s === 'blog' || s === 'novice') return 'blog';
    return s;
  };

  const normTarget = normalizeSec(promo.targetSection);
  const normCurrent = normalizeSec(currentSection);

  // If targetSection is 'all', it appears on all sections
  // Or if it matches the current section
  if (normTarget !== 'all' && normTarget !== normCurrent) {
    return false;
  }

  // Check category targeting (if specified and user is filtering by a specific category)
  if (promo.targetCategory && promo.targetCategory !== 'all') {
    if (currentCategoryId && currentCategoryId !== 'all' && currentCategoryId !== promo.targetCategory) {
      return false;
    }
  }

  // Check subcategory targeting (if specified and user is filtering by a specific subcategory)
  if (promo.targetSubcategory && promo.targetSubcategory !== 'all') {
    if (currentSubcategoryId && currentSubcategoryId !== 'all' && currentSubcategoryId !== promo.targetSubcategory) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates remaining days/hours for a promotion
 */
export function getPromotionTimeRemaining(promotedUntil?: string): {
  isExpired: boolean;
  text: string;
  daysRemaining: number;
} {
  if (!promotedUntil) {
    return { isExpired: false, text: 'Trajno aktivno', daysRemaining: 999 };
  }

  const expiry = new Date(promotedUntil).getTime();
  const now = Date.now();
  const diff = expiry - now;

  if (diff <= 0) {
    return { isExpired: true, text: 'Poteklo', daysRemaining: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 1) {
    return { isExpired: false, text: `Še ${days} dni`, daysRemaining: days };
  } else if (days === 1) {
    return { isExpired: false, text: 'Še 1 dan', daysRemaining: 1 };
  } else if (hours > 0) {
    return { isExpired: false, text: `Še ${hours} ur`, daysRemaining: 0 };
  } else {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
    return { isExpired: false, text: `Še ${mins} min`, daysRemaining: 0 };
  }
}
