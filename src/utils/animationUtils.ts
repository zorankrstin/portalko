export const FEED_STAGGER_DELAY_CLASSES = [
  'animate-feed-delay-0',
  'animate-feed-delay-1',
  'animate-feed-delay-2',
  'animate-feed-delay-3',
  'animate-feed-delay-4',
  'animate-feed-delay-5',
  'animate-feed-delay-6',
  'animate-feed-delay-7',
  'animate-feed-delay-8',
  'animate-feed-delay-9',
] as const;

/**
 * Returns the smooth fade-in-up animation utility plus a staggered delay class
 * based on the card's position within the current feed page.
 */
export function getFeedCardAnimationClass(index: number, pageSize: number = 10): string {
  const safePageSize = Math.max(1, pageSize);
  const positionInPage = Math.max(0, index % safePageSize);
  const delayIndex = Math.min(positionInPage, FEED_STAGGER_DELAY_CLASSES.length - 1);
  return `animate-fade-in-up ${FEED_STAGGER_DELAY_CLASSES[delayIndex]}`;
}
