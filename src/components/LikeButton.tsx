import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useLikes, LikeTargetType } from '../contexts/LikeContext';

export interface LikeButtonProps {
  id: string;
  targetType?: LikeTargetType;
  initialLikesCount?: number | string;
  showCount?: boolean;
  showLabel?: boolean;
  className?: string;
  countClassName?: string;
  iconClassName?: string;
  itemTitle?: string;
  variant?: 'minimal' | 'pill' | 'card-action';
  onLikeChanged?: (isLiked: boolean, newCount: number) => void;
}

export function LikeButton({
  id,
  targetType = 'post',
  initialLikesCount = 0,
  showCount = true,
  showLabel = false,
  className = '',
  countClassName = '',
  iconClassName = 'w-4 h-4',
  itemTitle,
  variant = 'minimal',
  onLikeChanged,
}: LikeButtonProps) {
  const { isLiked, getLikesCount, toggleLike } = useLikes();
  const [isAnimating, setIsAnimating] = useState(false);

  const active = isLiked(id);
  const count = getLikesCount(id, initialLikesCount);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    const result = await toggleLike(id, {
      targetType,
      initialCount: initialLikesCount,
      title: itemTitle,
    });

    if (onLikeChanged) {
      onLikeChanged(result.liked, result.newCount);
    }
  };

  const getSlovenianCountLabel = (n: number) => {
    if (!showLabel) return '';
    if (n === 1) return 'všeček';
    if (n === 2) return 'všečka';
    if (n === 3 || n === 4) return 'všečki';
    return 'všečkov';
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={active ? 'Odstrani všeček' : 'Všečkaj to objavo'}
        className={className || `px-3.5 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
          active
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold'
            : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container'
        }`}
      >
        <Heart
          className={`${iconClassName} ${
            active ? 'fill-rose-500 text-rose-500' : 'text-outline hover:text-rose-500'
          } ${isAnimating ? 'scale-125 transition-transform duration-200' : 'transition-transform'}`}
        />
        {showCount && (
          <span className={countClassName}>
            {count} {getSlovenianCountLabel(count)}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'card-action') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={active ? 'Odstrani všeček' : 'Všečkaj to objavo'}
        className={className || `flex items-center gap-1.5 text-xs font-label-md transition-colors cursor-pointer ${
          active ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-outline hover:text-rose-500'
        }`}
      >
        <Heart
          className={`${iconClassName} ${
            active ? 'fill-rose-500 text-rose-500' : ''
          } ${isAnimating ? 'scale-125 transition-transform duration-200' : 'transition-transform'}`}
        />
        {showCount && (
          <span className={countClassName}>
            {count} {getSlovenianCountLabel(count)}
          </span>
        )}
      </button>
    );
  }

  // Default 'minimal' variant (e.g. icon button with optional count beside it)
  return (
    <button
      type="button"
      onClick={handleClick}
      title={active ? 'Odstrani všeček' : 'Všečkaj to objavo'}
      className={className || `p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
        active
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-outline hover:text-rose-500 hover:bg-surface-container'
      }`}
    >
      <Heart
        className={`${iconClassName} ${
          active ? 'fill-rose-500 text-rose-500' : ''
        } ${isAnimating ? 'scale-125 transition-transform duration-200' : 'transition-transform'}`}
      />
      {showCount && count > 0 && (
        <span className={`text-xs font-semibold ${active ? 'text-rose-600 dark:text-rose-400' : 'text-outline'}`}>
          {count}
        </span>
      )}
      {showLabel && (
        <span className="text-xs font-medium ml-0.5">
          {active ? 'Všeč mi je' : 'Všečkaj'}
        </span>
      )}
    </button>
  );
}
