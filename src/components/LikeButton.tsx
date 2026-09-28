import React, { useState, useRef, useEffect } from 'react';
import { Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  onLikeChanged?: (isLiked: boolean, newCount: number) => void;
  onReactionChanged?: (
    reaction: ReactionType | null, 
    newCounts: { likes: number; loves: number; dislikes: number }
  ) => void;
}

export function LikeButton({
  id,
  targetType = 'post',
  initialLikesCount = 0,
  initialLovesCount = 0,
  initialDislikesCount = 0,
  showCount = true,
  showLabel = false,
  className = '',
  countClassName = '',
  iconClassName = 'w-4 h-4',
  itemTitle,
  variant = 'minimal',
  onLikeChanged,
  onReactionChanged,
}: LikeButtonProps) {
  const { getReaction, getReactionsCounts, toggleReaction } = useLikes();
  const [showPicker, setShowPicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState<ReactionType | null>(null);
  const pickerTimeoutRef = useRef<any>(null);

  const activeReaction = getReaction(id);
  const counts = getReactionsCounts(id, {
    likes: typeof initialLikesCount === 'number' ? initialLikesCount : parseInt(String(initialLikesCount)) || 0,
    loves: typeof initialLovesCount === 'number' ? initialLovesCount : parseInt(String(initialLovesCount)) || 0,
    dislikes: typeof initialDislikesCount === 'number' ? initialDislikesCount : parseInt(String(initialDislikesCount)) || 0,
  });

  const totalCount = counts.likes + counts.loves + counts.dislikes;

  useEffect(() => {
    return () => {
      if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
    setShowPicker(true);
  };

  const handleMouseLeave = () => {
    pickerTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 600);
  };

  const handleSelectReaction = async (reaction: ReactionType, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPicker(false);

    setIsAnimating(reaction);
    setTimeout(() => setIsAnimating(null), 500);

    const result = await toggleReaction(id, reaction, {
      targetType,
      initialCounts: {
        likes: typeof initialLikesCount === 'number' ? initialLikesCount : parseInt(String(initialLikesCount)) || 0,
        loves: typeof initialLovesCount === 'number' ? initialLovesCount : parseInt(String(initialLovesCount)) || 0,
        dislikes: typeof initialDislikesCount === 'number' ? initialDislikesCount : parseInt(String(initialDislikesCount)) || 0,
      },
      title: itemTitle,
    });

    if (onReactionChanged) {
      onReactionChanged(result.reaction, result.counts);
    }
    if (onLikeChanged) {
      onLikeChanged(result.reaction === 'like', result.counts.likes);
    }
  };

  const handleQuickToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Quick toggle: if active, toggle it off; if inactive, default to 'like'
    const targetReaction: ReactionType = activeReaction || 'like';
    setIsAnimating(targetReaction);
    setTimeout(() => setIsAnimating(null), 500);

    const result = await toggleReaction(id, targetReaction, {
      targetType,
      initialCounts: {
        likes: typeof initialLikesCount === 'number' ? initialLikesCount : parseInt(String(initialLikesCount)) || 0,
        loves: typeof initialLovesCount === 'number' ? initialLovesCount : parseInt(String(initialLovesCount)) || 0,
        dislikes: typeof initialDislikesCount === 'number' ? initialDislikesCount : parseInt(String(initialDislikesCount)) || 0,
      },
      title: itemTitle,
    });

    if (onReactionChanged) {
      onReactionChanged(result.reaction, result.counts);
    }
    if (onLikeChanged) {
      onLikeChanged(result.reaction === 'like', result.counts.likes);
    }
  };

  // Icon mapping
  const renderActiveIcon = () => {
    const isBig = isAnimating ? 'scale-125 duration-300' : 'duration-150';
    const baseClass = `${iconClassName} transition-transform ${isBig}`;

    if (activeReaction === 'like') {
      return <ThumbsUp className={`${baseClass} fill-blue-500 text-blue-500`} />;
    }
    if (activeReaction === 'love') {
      return <Heart className={`${baseClass} fill-rose-500 text-rose-500`} />;
    }
    if (activeReaction === 'dislike') {
      return <ThumbsDown className={`${baseClass} fill-amber-600 text-amber-600`} />;
    }
    
    // Default outline
    return <Heart className={`${baseClass} text-outline group-hover:text-rose-500`} />;
  };

  const getSlovenianReactionLabel = () => {
    if (activeReaction === 'like') return 'Všeč mi je';
    if (activeReaction === 'love') return 'Obožujem';
    if (activeReaction === 'dislike') return 'Ni mi všeč';
    return 'Reagiraj';
  };

  // Build a smart count tooltip/breakdown
  const tooltipText = `Všečki: ${counts.likes} | Srčki: ${counts.loves} | Proti: ${counts.dislikes}`;

  // Mini picker overlay component
  const renderPicker = () => {
    if (!showPicker) return null;
    return (
      <div 
        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-surface-container-highest/95 backdrop-blur-md shadow-lg border border-surface-container/80 rounded-full px-2.5 py-1.5 flex gap-3.5 z-50 animate-fade-in items-center"
        onClick={e => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={(e) => handleSelectReaction('like', e)}
          className="hover:scale-125 transition-transform duration-150 relative group cursor-pointer"
          title="Všeč mi je 👍"
        >
          <span className="text-lg">👍</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            Všeč mi je
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => handleSelectReaction('love', e)}
          className="hover:scale-125 transition-transform duration-150 relative group cursor-pointer"
          title="Obožujem ❤️"
        >
          <span className="text-lg">❤️</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            Obožujem
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => handleSelectReaction('dislike', e)}
          className="hover:scale-125 transition-transform duration-150 relative group cursor-pointer"
          title="Ni mi všeč 👎"
        >
          <span className="text-lg">👎</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            Ni mi všeč
          </span>
        </button>
      </div>
    );
  };

  const activeColorClass = () => {
    if (activeReaction === 'like') return 'text-blue-500 font-bold';
    if (activeReaction === 'love') return 'text-rose-500 font-bold';
    if (activeReaction === 'dislike') return 'text-amber-600 font-bold';
    return 'text-outline hover:text-rose-500';
  };

  if (variant === 'pill') {
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderPicker()}
        <button
          type="button"
          onClick={handleQuickToggle}
          title={tooltipText}
          className={className || `px-3.5 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border group ${
            activeReaction
              ? 'bg-surface-container-high border-surface-container-highest shadow-sm'
              : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container'
          }`}
        >
          {renderActiveIcon()}
          
          {showCount && (
            <span className={`${countClassName} ${activeColorClass()}`}>
              {totalCount}
            </span>
          )}

          {showLabel && (
            <span className="text-[10px] text-outline font-medium group-hover:text-on-surface ml-0.5">
              {getSlovenianReactionLabel()}
            </span>
          )}
        </button>
      </div>
    );
  }

  if (variant === 'card-action') {
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderPicker()}
        <button
          type="button"
          onClick={handleQuickToggle}
          title={tooltipText}
          className={className || `flex items-center gap-1.5 text-xs font-label-md transition-colors cursor-pointer group ${activeColorClass()}`}
        >
          {renderActiveIcon()}
          {showCount && (
            <span className={countClassName}>
              {totalCount}
            </span>
          )}
          {showLabel && (
            <span className="text-[10px] text-outline font-medium ml-0.5">
              {getSlovenianReactionLabel()}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Default 'minimal' variant
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderPicker()}
      <button
        type="button"
        onClick={handleQuickToggle}
        title={tooltipText}
        className={className || `p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 group ${
          activeReaction ? 'bg-surface-container-low' : 'hover:bg-surface-container-low'
        }`}
      >
        {renderActiveIcon()}
        {showCount && totalCount > 0 && (
          <span className={`text-xs font-semibold ${activeColorClass()}`}>
            {totalCount}
          </span>
        )}
        {showLabel && (
          <span className="text-xs font-medium ml-0.5">
            {getSlovenianReactionLabel()}
          </span>
        )}
      </button>
    </div>
  );
}
