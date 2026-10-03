import { LikeTargetType, ReactionType } from '../contexts/LikeContext';

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

export function LikeButton(_props: LikeButtonProps) {
  return null;
}
