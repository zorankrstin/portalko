export type Role = 'superadmin' | 'admin' | 'verified' | 'registered' | 'guest';
export type ViewMode = 'main' | 'news' | 'ads' | 'events' | 'blog' | 'profile' | 'admin' | 'saved' | 'deals' | 'post-detail';

export type PostDetailType = 'deal' | 'event' | 'ad' | 'post' | 'blog';

export interface PostDetailTarget {
  type: PostDetailType;
  id: string;
  source?: 'firestore' | 'mock';
  initialData?: any;
  titleSlug?: string;
  categorySlug?: string;
  subcategorySlug?: string;
}

export interface AuthorProfileTarget {
  id?: string;
  name: string;
  avatar?: string;
  role?: string;
  bio?: string;
  fromPostTarget?: PostDetailTarget;
}

export type ReportTargetType = 'ad' | 'post' | 'event' | 'deal' | 'comment' | 'news';

export type ReportReason = 
  | 'spam' 
  | 'inappropriate' 
  | 'fraud' 
  | 'misinformation' 
  | 'copyright' 
  | 'illegal' 
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface ReportItem {
  id: string;
  targetId: string;
  targetType: ReportTargetType;
  targetTitle: string;
  targetAuthor?: string;
  targetUrl?: string;
  reason: ReportReason;
  reasonLabel: string;
  details?: string;
  reporterId?: string | null;
  reporterEmail?: string | null;
  reporterName?: string | null;
  status: ReportStatus;
  adminNotes?: string;
  actionTaken?: 'none' | 'deleted_target' | 'dismissed' | 'warned_author';
  createdAt: string;
  updatedAt?: string;
}

export interface ReportModalTarget {
  targetId: string;
  targetType: ReportTargetType;
  targetTitle: string;
  targetAuthor?: string;
  targetUrl?: string;
}

// ---------------- PROMOTION & FEATURED POST TYPES ----------------
export type PromotionTargetSection = 'all' | 'ads' | 'events' | 'blog' | 'deals' | 'ugodnosti' | 'dogodki' | 'mali-oglasi' | 'oglasi' | 'novice';
export type PromotionBadgeType = 'PROMO' | 'OGLAS';

export interface PromotionConfig {
  isPromoted: boolean;
  promotedUntil?: string; // ISO date string (expiry date)
  targetSection: PromotionTargetSection;
  targetCategory?: string; // category id or 'all'
  targetSubcategory?: string; // subcategory id or 'all'
  badgeType: PromotionBadgeType;
  paidAmount?: number; // EUR paid
  isPaid?: boolean;
  promotedAt?: string;
  assignedBy?: string; // admin / superadmin name
  assignedById?: string;
}

