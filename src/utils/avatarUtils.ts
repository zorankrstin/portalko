/**
 * Utility functions for user profile photos and avatars.
 * Strictly avoids dummy/generated placeholder image services (ui-avatars.com, dicebear.com, etc.)
 * and ensures user-uploaded profile photos are always prioritized and preserved.
 */

import { slugify } from './urlUtils';

export const KNOWN_ADMIN_IDS = new Set(['admin', 'u1', 'superadmin', 'AABsRoeGCgaddFMh9S2cZqN9CaG3']);
export const KNOWN_ADMIN_NAMES = new Set(['superadmin', 'uredništvo', 'administrator', 'admin', 'uredništvo portalko.net']);

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
 * Resolves the genuine user-uploaded avatar for a user or author.
 * Strictly isolates avatars by unique userId/email so different accounts
 * with the same name before @ (e.g. zoran.krstin@siol.net and zoran.krstin@outlook.com)
 * never leak or share avatars.
 */
export function resolveUserUploadedAvatar(
  explicitAvatar?: string | null,
  userId?: string | null,
  authorName?: string | null,
  usersList?: AvatarUser[] | null,
  activeCurrentUser?: AvatarUser | null
): string | undefined {
  // 1. Direct explicit avatar if provided and uploaded by user
  if (explicitAvatar && isCustomUploadedAvatar(explicitAvatar)) {
    return explicitAvatar;
  }

  // 2. If active logged-in user matches by unique ID or email, their current session avatar applies
  if (activeCurrentUser && userId) {
    const isCurrentUserMatch =
      activeCurrentUser.id === userId ||
      (activeCurrentUser.googleId && activeCurrentUser.googleId === userId) ||
      (activeCurrentUser.email && activeCurrentUser.email.toLowerCase() === userId.toLowerCase());

    if (isCurrentUserMatch) {
      if (activeCurrentUser.avatar && isUserUploadedAvatar(activeCurrentUser.avatar)) {
        return activeCurrentUser.avatar;
      }
      // If active user is the target but has no custom avatar, return undefined (use initials)
      return undefined;
    }
  }

  // 3. Look up strictly by unique userId / email in usersList
  if (userId && usersList && usersList.length > 0) {
    const cleanUserId = userId.replace(/^(user|author|organizer|partner)-/, '');
    const matched = usersList.find(u =>
      u.id === userId ||
      u.id === cleanUserId ||
      (u.googleId && u.googleId === userId) ||
      (u.email && u.email.toLowerCase() === userId.toLowerCase())
    );

    if (matched) {
      if (matched.avatar && isUserUploadedAvatar(matched.avatar)) {
        return matched.avatar;
      }
      // User found in list but has no avatar: do not cross-match another user with same name!
      return undefined;
    }
  }

  // 4. Look up strictly in localStorage portal_users by userId / email
  if (userId && typeof window !== 'undefined') {
    try {
      const rawUsers = localStorage.getItem('portal_users');
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanUserId = userId.replace(/^(user|author|organizer|partner)-/, '');
          const matched = parsed.find((u: any) =>
            u.id === userId ||
            u.id === cleanUserId ||
            (u.googleId && u.googleId === userId) ||
            (u.email && u.email.toLowerCase() === userId.toLowerCase())
          );
          if (matched) {
            if (matched.avatar && isUserUploadedAvatar(matched.avatar)) {
              return matched.avatar;
            }
            return undefined;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 5. Fallback to explicit non-dummy avatar if available
  if (explicitAvatar && isUserUploadedAvatar(explicitAvatar)) {
    return explicitAvatar;
  }

  // 6. Known official editorial fallback only
  if (authorName) {
    const lower = authorName.toLowerCase();
    if (lower.includes('portalko') || lower.includes('uredništvo')) {
      return 'https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg';
    }
  }

  return undefined;
}
