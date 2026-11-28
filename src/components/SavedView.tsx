import { useEffect, useMemo, useRef, useState } from 'react';
import { SavedPostsTab } from './SavedPostsTab';
import { useAuth, User } from '../contexts/AuthContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { fetchUserProfile, fetchUsersList } from '../services/firestoreService';
import { isDummyAvatar } from '../utils/avatarUtils';
import type { PostDetailTarget } from '../types';

export function SavedView({
  searchQuery = '',
  onNavigatePost,
  onAuthorClick,
}: {
  searchQuery?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onAuthorClick?: (author: { name: string; id?: string; avatar?: string; role?: string; fromPostTarget?: PostDetailTarget }) => void;
}) {
  const { users: authUsers, currentUser } = useAuth();
  const { savedIds, savedItems } = useBookmarks();
  const [fetchedGlobalUsers, setFetchedGlobalUsers] = useState<User[]>([]);
  const [resolvedAuthorsById, setResolvedAuthorsById] = useState<Record<string, User>>({});
  const isMountedRef = useRef(true);
  const fetchedOrInFlightAuthorIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Ensure the full global user directory is loaded from Firestore
  useEffect(() => {
    fetchUsersList()
      .then((list) => {
        if (isMountedRef.current && list.length > 0) {
          setFetchedGlobalUsers(list);
        }
      })
      .catch(() => {});
  }, []);

  // Merge live AuthContext users, fetched Firestore users, currentUser, and any on-demand profiles
  const globalUsers = useMemo(() => {
    const map = new Map<string, User>();
    const addUser = (u?: User | null) => {
      if (!u || !u.id) return;
      const existing = map.get(u.id);
      if (existing) {
        const mergedAltIds = Array.from(
          new Set([
            ...(existing.alternateIds || []),
            ...(u.alternateIds || []),
            existing.id,
            existing.googleId,
            u.id,
            u.googleId,
          ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0))
        );
        map.set(u.id, {
          ...existing,
          ...u,
          name: u.name || existing.name,
          avatar: (u.avatar && !isDummyAvatar(u.avatar)) ? u.avatar : existing.avatar,
          alternateIds: mergedAltIds,
        });
      } else {
        map.set(u.id, u);
      }
    };

    authUsers.forEach(addUser);
    fetchedGlobalUsers.forEach(addUser);
    Object.values(resolvedAuthorsById).forEach(addUser);
    addUser(currentUser);

    return Array.from(map.values());
  }, [authUsers, fetchedGlobalUsers, resolvedAuthorsById, currentUser]);

  // Build lookup index by canonical user.id, googleId / Firebase UID, and any alternateIds
  const usersById = useMemo(() => {
    const index: Record<string, User> = {};
    globalUsers.forEach((u) => {
      if (u.id) index[u.id] = u;
      if (u.googleId) index[u.googleId] = u;
      if (u.alternateIds) {
        u.alternateIds.forEach((altId) => {
          if (altId) index[altId] = u;
        });
      }
    });
    return index;
  }, [globalUsers]);

  // Fetch any missing author profiles referenced by saved post authorIds directly from Firestore
  useEffect(() => {
    const candidateIds = new Set<string>();
    savedIds.forEach((id) => {
      const data = savedItems[id];
      const authorId = data?.authorId ? String(data.authorId).trim() : '';
      if (
        authorId &&
        !authorId.startsWith('author-') &&
        !authorId.startsWith('partner-') &&
        !authorId.startsWith('organizer-') &&
        !usersById[authorId] &&
        !fetchedOrInFlightAuthorIdsRef.current.has(authorId)
      ) {
        candidateIds.add(authorId);
      }
    });

    if (candidateIds.size === 0) return;
    candidateIds.forEach((id) => fetchedOrInFlightAuthorIdsRef.current.add(id));

    Promise.all(
      Array.from(candidateIds).map(async (authorId) => {
        const profile = await fetchUserProfile(authorId).catch(() => null);
        return { authorId, profile };
      })
    ).then((results) => {
      if (!isMountedRef.current) return;
      const additions: Record<string, User> = {};
      results.forEach(({ authorId, profile }) => {
        if (profile) {
          additions[authorId] = profile;
          if (profile.id) additions[profile.id] = profile;
          if (profile.googleId) additions[profile.googleId] = profile;
          if (profile.alternateIds) {
            profile.alternateIds.forEach((altId) => {
              if (altId) additions[altId] = profile;
            });
          }
        }
      });
      if (Object.keys(additions).length > 0) {
        setResolvedAuthorsById((prev) => ({ ...prev, ...additions }));
      }
    });
  }, [savedIds, savedItems, usersById]);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50">
        <SavedPostsTab
          searchQuery={searchQuery}
          users={globalUsers}
          resolvedAuthorsById={usersById}
          onNavigatePost={onNavigatePost}
          onAuthorClick={onAuthorClick}
        />
      </div>
    </div>
  );
}

