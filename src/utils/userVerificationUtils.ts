import { slugify } from './urlUtils';

export interface CheckUserVerifiedParams {
  role?: string | null;
  authorRole?: string | null;
  userId?: string | null;
  authorId?: string | null;
  name?: string | null;
  authorName?: string | null;
  isVerified?: boolean | null;
  users?: Array<{ id?: string; name?: string; role?: string; isVerified?: boolean }>;
}

/**
 * Checks if a user is verified based on role, status, ID, or user directory.
 */
export function isUserVerified(params?: CheckUserVerifiedParams | string | null): boolean {
  if (!params) return false;

  // Direct string passed (e.g. role name)
  if (typeof params === 'string') {
    const r = params.toLowerCase().trim();
    return r === 'verified' || r === 'preverjen' || r.includes('preverjen') || r === 'partner' || r === 'preverjeni';
  }

  // 1. Direct boolean flag
  if (params.isVerified === true) return true;

  // 2. Check role / authorRole string
  const rawRole = params.role || params.authorRole;
  if (rawRole) {
    const r = rawRole.toLowerCase().trim();
    if (r === 'verified' || r === 'preverjen' || r.includes('preverjen') || r === 'partner' || r === 'preverjeni') {
      return true;
    }
  }

  // 3. Check known verified IDs/names from initial verified accounts (e.g. Maja Zupan, Špas teater)
  const targetId = params.userId || params.authorId;
  const targetName = params.name || params.authorName;

  if (targetId) {
    if (targetId === 'u3' || targetId === 'u_1790672978765') {
      return true;
    }
  }

  if (targetName) {
    const sName = slugify(targetName);
    if (sName === 'spas-teater' || sName === 'maja-zupan') {
      return true;
    }
  }

  // 4. Cross reference with users list if provided
  if (params.users && Array.isArray(params.users)) {
    const matchedUser = params.users.find(u => 
      (targetId && u.id === targetId) ||
      (targetName && u.name && slugify(u.name) === slugify(targetName))
    );
    if (matchedUser) {
      if (matchedUser.isVerified === true) return true;
      if (matchedUser.role) {
        const r = matchedUser.role.toLowerCase().trim();
        if (r === 'verified' || r === 'preverjen' || r.includes('preverjen') || r === 'partner' || r === 'preverjeni') {
          return true;
        }
      }
    }
  }

  return false;
}
