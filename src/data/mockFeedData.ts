export interface MockBlogItem {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  date: string;
  location: string;
  description: string;
  image: string;
  images?: string[];
  readTime: string;
  photoCount: string;
  likesCount: string;
  commentsCount: string;
  viewsCount: string;
  tags: string[];
}

export interface MockAdItem {
  id: string;
  title: string;
  price: string;
  author: string;
  authorInitials: string;
  location: string;
  date: string;
  description: string;
  categoryName: string;
  category: string;
  image: string;
  images?: string[];
  views?: number;
}

export interface MockEventItem {
  id: string;
  title: string;
  organizer: string;
  categoryName: string;
  category: string;
  location: string;
  city: string;
  date: string;
  month: string;
  day: string;
  price?: string;
  description: string;
  image?: string;
  images?: string[];
  interestedCount: string | number;
}

export interface MockNewsItem {
  id: string;
  source: string;
  categoryName: string;
  timeAgo: string;
  link: string;
  title: string;
  summary: string;
  thumbnail?: string;
}

// All appearance mock posts removed - only real user submissions are displayed across feeds
export const INITIAL_BLOG_POSTS: MockBlogItem[] = [];
export const INITIAL_ADS: MockAdItem[] = [];
export const INITIAL_EVENTS: MockEventItem[] = [];
export const INITIAL_NEWS: MockNewsItem[] = [];
