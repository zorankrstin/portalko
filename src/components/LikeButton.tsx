import React, { useState } from 'react';
import { Heart, ThumbsUp } from 'lucide-react';
import { useLikes, LikeTargetType, ReactionType } from '../contexts/LikeContext';

export interface LikeButtonProps {
  id: string;
  targetType?: LikeTargetType;
  initialLikesCount?: number | string;
  initialLovesCount?: number | string;
  initialDislikesCount?: number | string;
  showCount?: boolean;
  showLabel?: boolean;
  className?: string;
  countClassName?: string;
  iconClassName?: string;
  itemTitle?: string;
  variant?: 'minimal' | 'pill' | 'card-action';
  iconType?: 'heart' | 'thumbs-up';
  onLikeChanged?: (isLiked: boolean, newCount: number) => void;
  onReactionChanged?: (
    reaction: ReactionType | null, 
    newCounts: { likes: number; loves: number; dislikes: number }
  ) => void;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  id,
  targetType = 'post',
  initialLikesCount,
  showCount = true,
  showLabel = false,
  className,
  countClassName,
  iconClassName,
  itemTitle,
  variant = 'minimal',
  iconType,
  onLikeChanged,
}) => {
  const { isLiked, getLikesCount, toggleLike } = useLikes();
  const [isPending, setIsPending] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const liked = isLiked(id);
  const count = getLikesCount(id, initialLikesCount);

  // If iconType is not specified, default deals to 'thumbs-up' and everything else to 'heart'
  const effectiveIconType = iconType || (targetType === 'deal' ? 'thumbs-up' : 'heart');

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending || !id) return;

    setIsPending(true);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    try {
      const res = await toggleLike(id, {
        targetType,
        initialCount: initialLikesCount,
        title: itemTitle,
      });

      if (res.success && onLikeChanged) {
        onLikeChanged(res.liked, res.newCount);
      }
    } catch (err) {
      console.error('Error in like toggle:', err);
    } finally {
      setIsPending(false);
    }
  };

  const IconComponent = effectiveIconType === 'thumbs-up' ? ThumbsUp : Heart;

  const iconActiveClasses = effectiveIconType === 'thumbs-up'
    ? 'text-primary fill-primary scale-110'
    : 'text-rose-500 fill-rose-500 scale-110';

  const defaultIconClasses = effectiveIconType === 'thumbs-up'
    ? 'group-hover:text-primary'
    : 'group-hover:text-rose-500';

  // Base classes for each variant
  let variantClasses = '';
  if (variant === 'pill') {
    variantClasses = `px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer shadow-2xs border ${
      liked
        ? effectiveIconType === 'thumbs-up'
          ? 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
        : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container/60'
    }`;
  } else if (variant === 'card-action') {
    variantClasses = `inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer group ${
      liked
        ? effectiveIconType === 'thumbs-up'
          ? 'text-primary'
          : 'text-rose-500'
        : 'text-outline hover:text-on-surface'
    }`;
  } else {
    // 'minimal'
    variantClasses = `inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer group ${
      liked
        ? effectiveIconType === 'thumbs-up'
          ? 'text-primary font-bold'
          : 'text-rose-500 font-bold'
        : 'text-outline hover:text-on-surface'
    }`;
  }

  const finalContainerClass = className || variantClasses;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={liked ? 'Odstrani všeček' : 'Všečkaj objavo'}
      aria-pressed={liked}
      title={liked ? 'Všečkano (klikni za preklic)' : 'Všečkaj to objavo'}
      className={`${finalContainerClass} ${isPending ? 'opacity-70 pointer-events-none' : ''}`}
    >
      <IconComponent
        className={`w-4 h-4 transition-transform duration-200 ${
          isAnimating ? 'scale-125' : ''
        } ${liked ? iconActiveClasses : defaultIconClasses} ${iconClassName || ''}`}
      />
      {showLabel && (
        <span className="font-medium">
          {liked ? 'Všečkano' : 'Všečkaj'}
        </span>
      )}
      {showCount && (
        <span className={`${countClassName || 'font-semibold text-xs'}`}>
          {count}
        </span>
      )}
    </button>
  );
};
