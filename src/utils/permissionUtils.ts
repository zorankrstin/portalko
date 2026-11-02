import { Role } from '../types';

export type PostContentType = 'post' | 'blog' | 'deal' | 'ad' | 'event';

/**
 * Roles allowed to publish Blog posts and Deals (Akcije).
 * Can be posted ONLY by superadmin, admins, moderators, and verified users.
 */
export const ROLES_BLOG_AND_DEALS: Role[] = ['superadmin', 'admin', 'moderator', 'verified'];

/**
 * Roles allowed to publish Classifieds (Mali oglasi).
 * Can be posted by superadmin, admins, verified users, moderators, and registered users.
 */
export const ROLES_CLASSIFIEDS: Role[] = ['superadmin', 'admin', 'moderator', 'verified', 'registered'];

/**
 * Roles allowed to publish Events (Dogodki in prireditve).
 */
export const ROLES_EVENTS: Role[] = ['superadmin', 'admin', 'moderator', 'verified', 'registered'];

/**
 * Determines whether a user with the given role can post a specific content type.
 */
export function canUserPostContentType(
  role: Role | string | undefined | null,
  type: PostContentType
): boolean {
  if (!role || role === 'guest') return false;
  const normalizedRole = role.toLowerCase().trim() as Role;

  switch (type) {
    case 'post':
    case 'blog':
    case 'deal':
      return ROLES_BLOG_AND_DEALS.includes(normalizedRole);
    case 'ad':
      return ROLES_CLASSIFIEDS.includes(normalizedRole);
    case 'event':
      return ROLES_EVENTS.includes(normalizedRole);
    default:
      return false;
  }
}

/**
 * Helper to check if a user can post Blog or Deals.
 */
export function canUserPostBlogOrDeals(role: Role | string | undefined | null): boolean {
  return canUserPostContentType(role, 'post');
}

/**
 * Helper to check if a user can post Classifieds (Mali oglasi).
 */
export function canUserPostClassifieds(role: Role | string | undefined | null): boolean {
  return canUserPostContentType(role, 'ad');
}

/**
 * Helper to check if a user can post Events (Dogodki).
 */
export function canUserPostEvents(role: Role | string | undefined | null): boolean {
  return canUserPostContentType(role, 'event');
}

/**
 * Returns a human-friendly Slovenian description of permission requirements for a content type.
 */
export function getRoleRequirementMessage(type: PostContentType): string {
  switch (type) {
    case 'post':
    case 'blog':
      return 'Objavljanje blog člankov je omogočeno preverjenim uporabnikom (Verified), moderatorjem ter skrbnikom.';
    case 'deal':
      return 'Objavljanje ugodnosti in akcij je omogočeno preverjenim uporabnikom (Verified), moderatorjem ter skrbnikom.';
    case 'ad':
      return 'Objavljanje malih oglasov je omogočeno registriranim in preverjenim uporabnikom ter skrbnikom.';
    case 'event':
      return 'Objavljanje dogodkov je omogočeno registriranim in preverjenim uporabnikom ter skrbnikom.';
    default:
      return 'Za objavljanje morate biti prijavljeni z ustreznimi pravicami.';
  }
}
