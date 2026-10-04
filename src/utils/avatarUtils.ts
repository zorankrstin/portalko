/**
 * Utility functions for user profile photos and avatars.
 * Strictly avoids dummy/generated placeholder image services (ui-avatars.com, dicebear.com, etc.)
 * and ensures user-uploaded profile photos are always prioritized and preserved.
 */

import { slugify } from './urlUtils';

export const KNOWN_ADMIN_IDS = new Set(['admin', 'u1', 'superadmin', 'AABsRoeGCgaddFMh9S2cZqN9CaG3']);
export const KNOWN_ADMIN_NAMES = new Set(['superadmin', 'zoran krstin', 'uredništvo', 'administrator', 'admin', 'uredništvo portalko.net']);

export interface AvatarUser {
  id?: string;
  name?: string;
  avatar?: string;
  role?: string;
  email?: string;
  googleId?: string;
  username?: string;
}

/**
 * Checks if an avatar URL is a dummy/generated placeholder image.
 */
export function isDummyAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const lower = url.trim().toLowerCase();
  if (!lower) return true;
  if (
    lower.includes('ui-avatars.com') ||
    lower.includes('dicebear.com') ||
    lower.includes('placeholder.com') ||
    lower.includes('gravatar.com/avatar/?d=') ||
    lower.includes('dummyimage.com') ||
    lower.includes('robohash.org') ||
    lower.includes('default-avatar') ||
    lower.includes('no-avatar')
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true if the avatar is a genuine custom uploaded image file
 * (e.g. base64 data URL, blob, or Google/Firebase storage URL).
 */
export function isCustomUploadedAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('storage.googleapis.com') ||
    trimmed.includes('googleusercontent.com/a/')
  );
}

/**
 * Returns true only if the avatar string is a genuine user-uploaded image
 * (e.g. data URL from local upload, blob URL, or real hosted image URL).
 */
export function isUserUploadedAvatar(url?: string | null): boolean {
  return !isDummyAvatar(url);
}

/**
 * Extracts 1-2 uppercase letters for native initials badge when user has not uploaded a photo.
 */
export function getUserInitials(name?: string | null, fallback = 'U'): string {
  if (!name || typeof name !== 'string') return fallback.toUpperCase();
  const trimmed = name.trim();
  if (!trimmed) return fallback.toUpperCase();

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.substring(0, Math.min(2, trimmed.length)).toUpperCase();
}

/**
 * Deterministic background and text color styling for native avatar badges based on role or name.
 */
export function getAvatarRoleColors(role?: string | null, name?: string | null): { bg: string; text: string; ring: string } {
  const r = (role || '').toLowerCase();
  if (r === 'superadmin' || r.includes('superadmin')) {
    return {
      bg: 'bg-purple-600',
      text: 'text-white',
      ring: 'ring-purple-400/40',
    };
  }
  if (r === 'admin' || r.includes('admin') || r.includes('urednik')) {
    return {
      bg: 'bg-rose-600',
      text: 'text-white',
      ring: 'ring-rose-400/40',
    };
  }
  if (r === 'verified' || r.includes('preverjen') || r.includes('partner')) {
    return {
      bg: 'bg-amber-500',
      text: 'text-white',
      ring: 'ring-amber-400/40',
    };
  }
  
  // Deterministic palette based on name for regular registered users/guests
  const palettes = [
    { bg: 'bg-blue-600', text: 'text-white', ring: 'ring-blue-400/30' },
    { bg: 'bg-teal-600', text: 'text-white', ring: 'ring-teal-400/30' },
    { bg: 'bg-emerald-600', text: 'text-white', ring: 'ring-emerald-400/30' },
    { bg: 'bg-indigo-600', text: 'text-white', ring: 'ring-indigo-400/30' },
    { bg: 'bg-violet-600', text: 'text-white', ring: 'ring-violet-400/30' },
    { bg: 'bg-cyan-600', text: 'text-white', ring: 'ring-cyan-400/30' },
  ];

  if (!name) return palettes[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}

/**
 * Resolves the genuine user-uploaded avatar for a user or author, strictly ignoring dummy images.
 */
export function resolveUserUploadedAvatar(
  explicitAvatar?: string | null,
  userId?: string | null,
  authorName?: string | null,
  usersList?: AvatarUser[] | null,
  activeCurrentUser?: AvatarUser | null
): string | undefined {
  const trimmedAuthorName = authorName ? authorName.trim().toLowerCase() : '';
  const authorSlug = authorName ? slugify(authorName) : '';
  const cleanAuthorSlug = authorSlug.replace(/-/g, '');

  const isTargetAdmin = Boolean(
    (userId && KNOWN_ADMIN_IDS.has(userId)) ||
    (authorName && KNOWN_ADMIN_NAMES.has(trimmedAuthorName))
  );

  // 1. If active logged-in user matches the author, their current session avatar is the most fresh
  if (activeCurrentUser?.avatar && isUserUploadedAvatar(activeCurrentUser.avatar)) {
    let isCurrentMatch = false;
    if (userId && (activeCurrentUser.id === userId || (KNOWN_ADMIN_IDS.has(userId) && KNOWN_ADMIN_IDS.has(activeCurrentUser.id || '')))) {
      isCurrentMatch = true;
    }
    if (!isCurrentMatch && trimmedAuthorName && activeCurrentUser.name) {
      const curLower = activeCurrentUser.name.trim().toLowerCase();
      if (curLower === trimmedAuthorName || slugify(activeCurrentUser.name) === authorSlug || slugify(activeCurrentUser.name).replace(/-/g, '') === cleanAuthorSlug) {
        isCurrentMatch = true;
      }
    }
    if (!isCurrentMatch && trimmedAuthorName && activeCurrentUser.username) {
      const curUserClean = activeCurrentUser.username.replace('@', '').trim().toLowerCase();
      if (curUserClean === trimmedAuthorName || slugify(curUserClean) === authorSlug) {
        isCurrentMatch = true;
      }
    }
    if (isCurrentMatch) {
      return activeCurrentUser.avatar;
    }
  }

  const findInList = (list: AvatarUser[]): string | undefined => {
    if (!list || list.length === 0) return undefined;

    // Collect all matching user candidates
    const matchedUsers: AvatarUser[] = [];

    for (const u of list) {
      let isMatch = false;
      if (userId) {
        if (u.id === userId) isMatch = true;
        else if (u.googleId && u.googleId === userId) isMatch = true;
        else if (u.email && u.email.toLowerCase() === userId.toLowerCase()) isMatch = true;
        else {
          const cleanUserId = userId.replace(/^(user|author|organizer|partner)-/, '');
          if (u.id === cleanUserId) isMatch = true;
        }
      }
      if (!isMatch && trimmedAuthorName && u.name) {
        const uNameLower = u.name.trim().toLowerCase();
        if (uNameLower === trimmedAuthorName) isMatch = true;
        else if (authorSlug && slugify(u.name) === authorSlug) isMatch = true;
        else if (cleanAuthorSlug && slugify(u.name).replace(/-/g, '') === cleanAuthorSlug) isMatch = true;
      }
      if (!isMatch && trimmedAuthorName && u.username) {
        const uClean = u.username.replace('@', '').trim().toLowerCase();
        if (uClean === trimmedAuthorName || (authorSlug && slugify(uClean) === authorSlug)) isMatch = true;
      }
      if (!isMatch && isTargetAdmin) {
        if (u.id && KNOWN_ADMIN_IDS.has(u.id)) isMatch = true;
        else if (u.email === 'zoran.krstin@gmail.com') isMatch = true;
        else if (u.name && KNOWN_ADMIN_NAMES.has(u.name.trim().toLowerCase())) isMatch = true;
        else if (u.role === 'superadmin') isMatch = true;
      }
      if (isMatch) {
        matchedUsers.push(u);
      }
    }

    if (matchedUsers.length > 0) {
      // Prioritize activeCurrentUser if present among matches, then custom uploaded avatars, then exact userId match
      matchedUsers.sort((a, b) => {
        if (activeCurrentUser) {
          if (a.id === activeCurrentUser.id && b.id !== activeCurrentUser.id) return -1;
          if (b.id === activeCurrentUser.id && a.id !== activeCurrentUser.id) return 1;
        }
        if (userId) {
          if (a.id === userId && b.id !== userId) return -1;
          if (b.id === userId && a.id !== userId) return 1;
        }
        const aScore = isCustomUploadedAvatar(a.avatar) ? 3 : (a.avatar && !isDummyAvatar(a.avatar) ? 2 : 0);
        const bScore = isCustomUploadedAvatar(b.avatar) ? 3 : (b.avatar && !isDummyAvatar(b.avatar) ? 2 : 0);
        if (bScore !== aScore) return bScore - aScore;
        const aLen = a.avatar ? a.avatar.length : 0;
        const bLen = b.avatar ? b.avatar.length : 0;
        return bLen - aLen;
      });

      for (const m of matchedUsers) {
        if (m.avatar && !isDummyAvatar(m.avatar)) {
          return m.avatar;
        }
      }
    }

    return undefined;
  };

  // 2. Direct explicit avatar if it is a genuine custom uploaded image (data:image/, blob, storage)
  if (explicitAvatar && isCustomUploadedAvatar(explicitAvatar)) {
    return explicitAvatar;
  }

  // 3. Look up in active users list provided from context (prioritizing user-uploaded photos)
  if (usersList && usersList.length > 0) {
    const fromList = findInList(usersList);
    if (fromList) return fromList;
  }

  // 4. Direct explicit avatar if uploaded by user and not a dummy image
  if (explicitAvatar && isUserUploadedAvatar(explicitAvatar)) {
    return explicitAvatar;
  }

  // 4. Fallback to localStorage portal_users
  try {
    if (typeof window !== 'undefined') {
      const rawUsers = localStorage.getItem('portal_users');
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const fromLocal = findInList(parsed);
          if (fromLocal) return fromLocal;
        }
      }
    }
  } catch (e) {
    // Ignore JSON parse errors in localStorage
  }

  // 5. Known official editorial fallback only
  if (authorName) {
    const lower = authorName.toLowerCase();
    if (lower.includes('portalko') || lower.includes('uredništvo')) {
      return 'https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg';
    }
  }

  return undefined;
}
