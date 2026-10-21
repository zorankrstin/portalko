import React from 'react';

interface RssPostSkeletonProps {
  hasImage?: boolean;
}

/**
 * Skeleton placeholder representing an individual RSS news card with pulsing shimmer animation.
 * Replicates the geometry, padding, borders, and typography rhythm of RssPost.
 */
export const RssPostSkeleton: React.FC<RssPostSkeletonProps> = ({ hasImage = true }) => {
  return (
    <article 
      className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 border-l-4 border-l-primary/30 flex flex-col gap-space-sm animate-pulse select-none"
      aria-hidden="true"
    >
      {/* Header: source icon placeholder, source name, dot, date, and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Favicon placeholder */}
          <div className="w-8 h-8 rounded-md bg-surface-container-high/80 shrink-0" />
          
          {/* Source and timestamp */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 rounded bg-surface-container-high" />
            <div className="w-1.5 h-1.5 rounded-full bg-surface-container-high/60" />
            <div className="h-3 w-16 rounded bg-surface-container" />
          </div>
        </div>

        {/* Action button placeholders */}
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-surface-container/70" />
          <div className="w-7 h-7 rounded-lg bg-surface-container/70" />
        </div>
      </div>

      {/* Main Grid: title + description + link, and image thumbnail */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-md items-center">
        <div className={`flex flex-col gap-2.5 ${hasImage ? 'sm:col-span-8' : 'sm:col-span-12'}`}>
          {/* Title lines */}
          <div className="space-y-2">
            <div className="h-5 w-11/12 rounded-md bg-surface-container-high" />
            <div className="h-5 w-3/4 rounded-md bg-surface-container-high" />
          </div>

          {/* Description lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 w-full rounded bg-surface-container" />
            <div className="h-3.5 w-5/6 rounded bg-surface-container" />
          </div>

          {/* Read article link placeholder */}
          <div className="pt-1 flex items-center gap-2">
            <div className="h-3.5 w-28 rounded bg-primary/25" />
            <div className="w-3.5 h-3.5 rounded bg-primary/25" />
          </div>
        </div>

        {/* Thumbnail placeholder */}
        {hasImage && (
          <div className="sm:col-span-4 rounded-xl overflow-hidden h-32 bg-surface-container relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-surface-container via-surface-container-high/50 to-surface-container" />
          </div>
        )}
      </div>
    </article>
  );
};

interface NewsFeedSkeletonListProps {
  count?: number;
  retryAttempt?: number;
  message?: string;
}

/**
 * Skeleton screen displayed while fetching RSS news feeds.
 */
export const NewsFeedSkeletonList: React.FC<NewsFeedSkeletonListProps> = ({ 
  count = 5, 
  retryAttempt = 0,
  message
}) => {
  return (
    <div className="flex flex-col gap-space-md" role="status" aria-label="Nalaganje novic">
      {/* Informative loading banner */}
      <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container/60 shadow-xs flex items-center justify-between gap-3 text-xs text-on-surface-variant animate-pulse">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="font-semibold text-on-surface">
            {message || (
              retryAttempt > 0 
                ? `Ponovni poskus vzpostavljanja povezave z RSS viri (${retryAttempt}/2)...` 
                : 'Prenašanje in obdelava najnovejših novic iz osrednjih slovenskih medijev...'
            )}
          </span>
        </div>
        <span className="font-label-caps text-[10px] uppercase font-bold text-outline shrink-0 hidden sm:inline">
          Nalaganje v živo
        </span>
      </div>

      {/* Repeating skeleton cards */}
      {Array.from({ length: count }).map((_, idx) => (
        <RssPostSkeleton 
          key={`news-skeleton-${idx}`} 
          hasImage={idx % 4 !== 3} // Varied layout with/without thumbnails like real news
        />
      ))}
    </div>
  );
};
