import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  normalizeAuthorFollowKey,
  subscribeToUserFollowing,
  subscribeToAuthorFollowerCount,
  toggleFollowAuthorInFirestore,
} from '../../services/firestoreService';

export interface FollowAuthorButtonProps {
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  showFollowerCount?: boolean;
  compact?: boolean;
  className?: string;
}

export function formatFollowersCount(count: number): string {
  const rounded = Math.max(0, Math.floor(count));
  const mod100 = rounded % 100;
  if (mod100 === 1) return `${rounded.toLocaleString('sl-SI')} sledilec`;
  if (mod100 === 2) return `${rounded.toLocaleString('sl-SI')} sledilca`;
  if (mod100 === 3 || mod100 === 4) return `${rounded.toLocaleString('sl-SI')} sledilci`;
  return `${rounded.toLocaleString('sl-SI')} sledilcev`;
}

export const FollowAuthorButton: React.FC<FollowAuthorButtonProps> = ({
  authorId,
  authorName,
  authorAvatar,
  showFollowerCount = true,
  compact = false,
  className = '',
}) => {
  const { currentUser } = useAuth();
  const authorKey = normalizeAuthorFollowKey(authorId, authorName);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHoveringFollowing, setIsHoveringFollowing] = useState(false);

  const isSelf =
    Boolean(currentUser?.id && authorId && currentUser.id === authorId) ||
    Boolean(currentUser?.id && currentUser.id === authorKey);

  useEffect(() => {
    if (!authorKey) return;
    const unsubCount = subscribeToAuthorFollowerCount(authorKey, (count) => {
      setFollowerCount(count);
    });
    return () => unsubCount();
  }, [authorKey]);

  useEffect(() => {
    if (!currentUser?.id || currentUser.role === 'guest') {
      setIsFollowing(false);
      return;
    }
    const unsub = subscribeToUserFollowing(currentUser.id, (authorKeys) => {
      setIsFollowing(authorKeys.includes(authorKey));
    });
    return () => unsub();
  }, [currentUser?.id, currentUser?.role, authorKey]);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser || currentUser.role === 'guest') {
      window.dispatchEvent(new CustomEvent('open_auth_modal', { detail: { mode: 'login' } }));
      return;
    }

    if (isUpdating || isSelf) return;

    const nextFollow = !isFollowing;
    setIsUpdating(true);
    setIsFollowing(nextFollow);
    setFollowerCount((prev) => Math.max(0, prev + (nextFollow ? 1 : -1)));

    try {
      await toggleFollowAuthorInFirestore({
        followerId: currentUser.id,
        followerName: currentUser.name,
        authorId,
        authorName,
        authorAvatar,
        follow: nextFollow,
      });
    } catch (err) {
      console.error('Napaka pri posodabljanju sledenja avtorju:', err);
      setIsFollowing(!nextFollow);
      setFollowerCount((prev) => Math.max(0, prev + (nextFollow ? -1 : 1)));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`flex items-center gap-2.5 flex-wrap ${className}`}>
      {showFollowerCount && (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-lowest/90 px-2.5 py-1 rounded-lg border border-surface-container"
          title={`Število sledilcev avtorja ${authorName}`}
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>{formatFollowersCount(followerCount)}</span>
        </span>
      )}

      {!isSelf && (
        <button
          type="button"
          onClick={handleToggleFollow}
          disabled={isUpdating}
          onMouseEnter={() => setIsHoveringFollowing(true)}
          onMouseLeave={() => setIsHoveringFollowing(false)}
          aria-pressed={isFollowing}
          title={
            !currentUser || currentUser.role === 'guest'
              ? `Prijavite se za sledenje avtorju ${authorName}`
              : isFollowing
              ? `Prekliči sledenje avtorju ${authorName}`
              : `Sledi avtorju ${authorName}`
          }
          className={`${
            compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
          } rounded-xl font-label-md font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 ${
            isFollowing
              ? isHoveringFollowing
                ? 'bg-error/10 text-error border border-error/30 shadow-2xs'
                : 'bg-primary/10 text-primary border border-primary/25 shadow-2xs'
              : 'bg-primary hover:bg-primary-container text-on-primary shadow-xs'
          }`}
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isFollowing ? (
            <UserCheck className="w-3.5 h-3.5" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          <span>
            {isFollowing
              ? isHoveringFollowing
                ? 'Prekliči sledenje'
                : 'Sledite'
              : 'Sledi'}
          </span>
        </button>
      )}
    </div>
  );
};
