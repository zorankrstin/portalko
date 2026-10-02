/**
 * Utility functions for user profile photos and avatars.
 * Strictly avoids dummy/generated placeholder image services (ui-avatars.com, dicebear.com, etc.)
 * and ensures user-uploaded profile photos are always prioritized and preserved.
 */

export interface AvatarUser {
  id?: string;
  name?: string;
  avatar?: string;
  role?: string;
  email?: string;
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
    lower.includes('robohash.org')
  ) {
    return true;
  }
  return false;
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
  usersList?: AvatarUser[] | null
): string | undefined {
  // 1. Direct explicit avatar if uploaded by user and not a dummy image
  if (explicitAvatar && isUserUploadedAvatar(explicitAvatar)) {
    return explicitAvatar;
  }

  // 2. Look up in active users list by id or name
  if (usersList && usersList.length > 0 && (userId || authorName)) {
    const trimmedAuthorName = authorName ? authorName.trim().toLowerCase() : '';
    const matched = usersList.find(u => {
      if (userId && u.id && u.id === userId) return true;
      if (trimmedAuthorName && u.name && u.name.trim().toLowerCase() === trimmedAuthorName) return true;
      return false;
    });

    if (matched?.avatar && isUserUploadedAvatar(matched.avatar)) {
      return matched.avatar;
    }
  }

  // 3. Known official organization photos/logos (Portalko, Spas teater)
  if (authorName) {
    const lower = authorName.toLowerCase();
    if (lower.includes('portalko')) {
      return 'https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg';
    }
    if (lower.includes('špas') || lower.includes('spas')) {
      return 'https://www.spasteater.si/og-default.jpg';
    }
  }

  return undefined;
}
