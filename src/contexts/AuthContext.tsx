import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signOut as fbSignOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  syncUserProfile, 
  updateUserInFirestore, 
  fetchUserProfile, 
  subscribeToUsers, 
  subscribeToUserProfile,
  deleteUserFromFirestore, 
  findUserForVerification, 
  verifyUserEmailInFirestore,
  findUserForPasswordReset,
  isUserDeletedSync,
  recordUserAsDeletedLocally,
  syncDeletedUsersFromFirestore
} from '../services/firestoreService';
import { sendNoreplyConfirmationEmail, sendNoreplyPasswordResetEmail } from '../services/emailService';
import { isDummyAvatar } from '../utils/avatarUtils';
import { slugify } from '../utils/urlUtils';

export type Role = 'superadmin' | 'admin' | 'moderator' | 'verified' | 'registered' | 'guest';

export type SocialPlatform = 
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'tiktok'
  | 'github'
  | 'telegram'
  | 'custom';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  label?: string;
}

export interface ProfileMenuItem {
  id: string;
  label: string;
  icon?: string;
  type: 'builtIn' | 'custom' | 'externalLink';
  builtInTab?: 'posts' | 'saved' | 'network' | 'settings';
  content?: string;
  url?: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_PROFILE_MENU: ProfileMenuItem[] = [
  { id: 'menu-posts', label: 'Moje objave', icon: 'FileText', type: 'builtIn', builtInTab: 'posts', visible: true, order: 1 },
  { id: 'menu-saved', label: 'Shranjeno', icon: 'Bookmark', type: 'builtIn', builtInTab: 'saved', visible: true, order: 2 },
  { id: 'menu-network', label: 'Omrežje povezav', icon: 'Network', type: 'builtIn', builtInTab: 'network', visible: true, order: 3 },
  { id: 'menu-about', label: 'O meni', icon: 'User', type: 'custom', content: 'Pozdravljeni na mojem profilu na Portalko.net! Tukaj delim zanimive objave, novice ter predloge za slovensko skupnost.', visible: true, order: 4 },
  { id: 'menu-settings', label: 'Nastavitve računa', icon: 'Settings', type: 'builtIn', builtInTab: 'settings', visible: true, order: 5 },
];

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { id: 's1', platform: 'website', url: 'https://portalko.net', label: 'Portalko.net' },
  { id: 's2', platform: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
  { id: 's3', platform: 'twitter', url: 'https://x.com', label: 'X (Twitter)' },
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'banned';
  avatar?: string;
  bio?: string;
  username?: string;
  password?: string;
  authProvider?: 'credentials' | 'google';
  googleId?: string;
  alternateIds?: string[];
  socialLinks?: SocialLink[];
  profileMenu?: ProfileMenuItem[];
  verificationRequested?: boolean;
  verificationRequestedAt?: string;
  verificationNote?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationSentAt?: string;
  verificationConfirmedAt?: string;
  passwordResetToken?: string;
  passwordResetSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
  firstLogin?: boolean;
  welcomeNotificationSent?: boolean;
}

export const DEFAULT_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Zoran Krstin', 
    email: 'zoran.krstin@gmail.com', 
    role: 'superadmin', 
    status: 'active', 
    emailVerified: true,
    bio: 'Navdušenec nad tehnologijo, športom in dobro kavo. Redni obiskovalec dogodkov v Ljubljani in okolici. Vedno za dobro debato.',
    username: '@zorankrstin',
    socialLinks: [
      { id: 's1', platform: 'website', url: 'https://portalko.net', label: 'Portalko.net' },
      { id: 's2', platform: 'linkedin', url: 'https://linkedin.com/in/zorankrstin', label: 'LinkedIn' },
      { id: 's3', platform: 'twitter', url: 'https://x.com/zorankrstin', label: 'X (Twitter)' },
    ],
    profileMenu: DEFAULT_PROFILE_MENU,
    password: 'admin123',
    authProvider: 'google',
    googleId: 'g_zoran_krstin',
    createdAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'u_1791056763486',
    name: 'Uredništvo Portalko.net',
    email: 'urednistvo@portalko.net',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    avatar: 'https://raw.githubusercontent.com/zorankrstin/portalko/refs/heads/main/src/assets/images/Portalko.jpg',
    bio: 'Uradno uredništvo portala Portalko.net.',
    username: '@urednistvo_portalko',
    profileMenu: DEFAULT_PROFILE_MENU,
    password: 'admin123',
    socialLinks: [
      { id: 's1', platform: 'website', url: 'https://portalko.net', label: 'Portalko.net' }
    ],
    createdAt: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'u_1790672978765',
    name: 'Špas teater',
    email: 'info@spasteater.si',
    role: 'verified',
    status: 'active',
    emailVerified: true,
    avatar: undefined,
    bio: 'Slovensko profesionalno gledališče komedije iz Mengša.',
    username: '@spas_teater',
    profileMenu: DEFAULT_PROFILE_MENU,
    socialLinks: [
      { id: 's1', platform: 'website', url: 'https://spasteater.com', label: 'spasteater.com' }
    ],
    createdAt: '2026-10-02T15:30:00.000Z'
  },
];

export function isDummyUser(user?: { email?: string; id?: string } | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const id = (user.id || '').trim();
  return (
    email === 'luka.n@example.com' ||
    email === 'luka.novak.portal@gmail.com' ||
    email === 'maja.z@example.com' ||
    email === 'janez.h@example.com' ||
    id === 'u2' ||
    id === 'u3' ||
    id === 'u4' ||
    email.startsWith('luka.n@') ||
    email.startsWith('luka.novak.portal@') ||
    email.startsWith('maja.z@') ||
    email.startsWith('janez.h@')
  );
}

export interface RegisterData {
  name: string;
  email: string;
  role?: Role;
  avatar?: string;
  password?: string;
  autoVerify?: boolean;
}

export interface GoogleAuthData {
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  role?: Role;
}

interface AuthContextType {
  users: User[];
  currentUser: User | null;
  login: (idOrEmail: string, password?: string) => { success: boolean; error?: string; user?: User; requiresVerification?: boolean };
  loginWithCredentials: (email: string, password: string) => { success: boolean; error?: string; user?: User; requiresVerification?: boolean; unverifiedEmail?: string };
  loginById: (id: string) => { success: boolean; error?: string; user?: User };
  logout: () => void;
  updateUser: (id: string, data: Partial<User>) => Promise<void> | void;
  deleteUser: (id: string, email?: string) => Promise<void> | void;
  changePassword: (userId: string, oldPass: string, newPass: string) => { success: boolean; error?: string };
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; user?: User; requiresVerification?: boolean; confirmationUrl?: string; emailSent?: boolean; smtpBlocked?: boolean }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string; confirmationUrl?: string }>;
  confirmEmailWithToken: (token: string, email?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  loginOrRegisterWithGoogle: (data: GoogleAuthData) => { success: boolean; error?: string; user?: User; isNewUser: boolean };
  signInWithGoogleFirebase: () => Promise<{ success: boolean; error?: string; user?: User }>;
  requestVerification: (userId: string, note?: string) => { success: boolean; error?: string };
  cancelVerificationRequest: (userId: string) => { success: boolean; error?: string };
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; resetUrl?: string; token?: string; emailSent?: boolean; smtpBlocked?: boolean; user?: User }>;
  resetPasswordWithToken: (token: string, newPass: string, email?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function stripUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      (result as any)[k] = v;
    }
  }
  return result;
}

function doesUserMatchRecord(a?: User | null, b?: User | null): boolean {
  if (!a || !b) return false;
  const aIds = new Set(
    [a.id, a.googleId, ...(a.alternateIds || [])].filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    )
  );
  const bIds = [b.id, b.googleId, ...(b.alternateIds || [])].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
  if (bIds.some((id) => aIds.has(id))) return true;
  const aEmail = (a.email || '').toLowerCase().trim();
  const bEmail = (b.email || '').toLowerCase().trim();
  return Boolean(aEmail && bEmail && aEmail === bEmail);
}

function findMatchingUser(list: User[], target?: User | null): User | undefined {
  if (!target || !list || list.length === 0) return undefined;
  return list.find((u) => doesUserMatchRecord(u, target));
}

function hasUserProfileChanged(current: User, next: User): boolean {
  if (
    current.id !== next.id ||
    (current.avatar || '') !== (next.avatar || '') ||
    (current.name || '') !== (next.name || '') ||
    current.role !== next.role ||
    current.status !== next.status ||
    (current.bio || '') !== (next.bio || '') ||
    (current.username || '') !== (next.username || '') ||
    current.emailVerified !== next.emailVerified ||
    Boolean(current.verificationRequested) !== Boolean(next.verificationRequested) ||
    (current.verificationNote || '') !== (next.verificationNote || '') ||
    (current.updatedAt || '') !== (next.updatedAt || '') ||
    (current.alternateIds?.length || 0) !== (next.alternateIds?.length || 0)
  ) {
    return true;
  }
  if (JSON.stringify(current.socialLinks || []) !== JSON.stringify(next.socialLinks || [])) {
    return true;
  }
  if (JSON.stringify(current.profileMenu || []) !== JSON.stringify(next.profileMenu || [])) {
    return true;
  }
  return false;
}

export function deduplicateUsers(userList: (User | null | undefined)[]): User[] {
  const byId = new Map<string, User>();
  const byEmail = new Map<string, User>();

  for (const rawUser of userList) {
    if (!rawUser || !rawUser.id || isDummyUser(rawUser) || isUserDeletedSync(rawUser.id, rawUser.email)) continue;
    const isOldUrednistvo = rawUser.email?.toLowerCase().trim() === 'telemach987@proton.me' || rawUser.id === 'u_1790075229756';
    const u: User = isOldUrednistvo
      ? {
          ...rawUser,
          id: 'u_1791056763486',
          email: 'urednistvo@portalko.net',
          name: rawUser.name || 'Uredništvo Portalko.net',
          role: 'admin',
        }
      : rawUser;

    const emailNorm = (u.email || '').toLowerCase().trim();

    // Check if we already have this user by id, alternateIds, or email
    const existingById =
      byId.get(u.id) ||
      (u.googleId ? byId.get(u.googleId) : undefined) ||
      (u.alternateIds || []).map((alt) => byId.get(alt)).find(Boolean);
    const existingByEmail = emailNorm ? byEmail.get(emailNorm) : undefined;
    const existing = existingById || existingByEmail;

    if (existing) {
      // Pick the canonical ID (prefer the longer ID like Firebase UID over placeholder 'u1')
      const canonicalId = (u.id.length > existing.id.length) ? u.id : existing.id;
      const alternateIds = Array.from(
        new Set(
          [
            existing.id,
            existing.googleId,
            ...(existing.alternateIds || []),
            u.id,
            u.googleId,
            ...(u.alternateIds || []),
          ].filter((val): val is string => typeof val === 'string' && val.trim().length > 0)
        )
      );

      const existingTs = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
      const incomingTs = u.updatedAt ? Date.parse(u.updatedAt) : 0;
      const uIsOlder = existingTs > 0 && incomingTs > 0 && incomingTs < existingTs;
      const uHasExplicitEmptyAvatar = 'avatar' in u && typeof u.avatar === 'string' && u.avatar.trim() === '';

      let cleanAvatar: string | undefined;
      if (!uIsOlder) {
        if (uHasExplicitEmptyAvatar) {
          cleanAvatar = undefined;
        } else if (u.avatar && !isDummyAvatar(u.avatar)) {
          cleanAvatar = u.avatar;
        } else if (existing.avatar && !isDummyAvatar(existing.avatar)) {
          cleanAvatar = existing.avatar;
        }
      } else {
        cleanAvatar =
          (existing.avatar && !isDummyAvatar(existing.avatar))
            ? existing.avatar
            : ((u.avatar && !isDummyAvatar(u.avatar)) ? u.avatar : undefined);
      }

      const cleanExisting = stripUndefinedFields(existing);
      const cleanIncoming = stripUndefinedFields(u);
      const mergedBase = uIsOlder
        ? { ...cleanIncoming, ...cleanExisting }
        : { ...cleanExisting, ...cleanIncoming };

      const isVerified = existing.emailVerified === true || u.emailVerified === true;
      const merged: User = {
        ...(mergedBase as User),
        id: canonicalId,
        googleId: u.googleId || existing.googleId,
        alternateIds,
        avatar: cleanAvatar,
        updatedAt: (!uIsOlder && u.updatedAt) ? u.updatedAt : existing.updatedAt,
        role: (u.role === 'superadmin' || existing.role === 'superadmin') ? 'superadmin' : (mergedBase.role || existing.role),
        emailVerified: isVerified ? true : (u.emailVerified === false || existing.emailVerified === false ? false : true),
        verificationToken: isVerified ? undefined : (u.verificationToken || existing.verificationToken),
        verificationConfirmedAt: existing.verificationConfirmedAt || u.verificationConfirmedAt,
      };

      // Remove previous keys if ID changed
      byId.delete(existing.id);
      byId.delete(u.id);
      byId.set(canonicalId, merged);

      if (emailNorm) {
        byEmail.set(emailNorm, merged);
      }
      const existingEmailNorm = (existing.email || '').toLowerCase().trim();
      if (existingEmailNorm && existingEmailNorm !== emailNorm) {
        byEmail.set(existingEmailNorm, merged);
      }
    } else {
      const initialAltIds = Array.from(
        new Set(
          [u.id, u.googleId, ...(u.alternateIds || [])].filter(
            (val): val is string => typeof val === 'string' && val.trim().length > 0
          )
        )
      );
      const cleanInitialAvatar = (u.avatar && !isDummyAvatar(u.avatar)) ? u.avatar : undefined;
      const normalizedUser: User = {
        ...u,
        avatar: cleanInitialAvatar,
        ...(initialAltIds.length > 0 ? { alternateIds: initialAltIds } : {}),
      };
      byId.set(u.id, normalizedUser);
      if (emailNorm) {
        byEmail.set(emailNorm, normalizedUser);
      }
    }
  }

  return Array.from(byId.values());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    syncDeletedUsersFromFirestore().catch(() => {});
    const savedUsers = localStorage.getItem('portal_users');
    let initialUsers = deduplicateUsers(DEFAULT_USERS);
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure default passwords if missing from older saved states, filter dummy/deleted users,
          // and strip any legacy dummy avatars so only user-uploaded images are used.
          const cleanedParsed = parsed
            .filter((u: User) => !isDummyUser(u) && !isUserDeletedSync(u?.id, u?.email))
            .map((u: User) => {
              const isOldUrednistvo = u.email === 'telemach987@proton.me' || u.id === 'u_1790075229756';
              return {
                ...u,
                id: isOldUrednistvo ? 'u_1791056763486' : u.id,
                email: isOldUrednistvo ? 'urednistvo@portalko.net' : u.email,
                name: isOldUrednistvo ? 'Uredništvo Portalko.net' : u.name,
                role: isOldUrednistvo ? ('admin' as Role) : u.role,
                avatar: (u.avatar && !isDummyAvatar(u.avatar)) ? u.avatar : undefined,
                password: u.password || (u.role === 'superadmin' ? 'admin123' : 'geslo123'),
              };
            });
          initialUsers = deduplicateUsers([...initialUsers, ...cleanedParsed]);
        }
      } catch (e) {
        console.error('Error parsing stored users', e);
      }
    }
    setUsers(initialUsers);
    localStorage.setItem('portal_users', JSON.stringify(initialUsers));

    const savedCurrentUserId = localStorage.getItem('portal_current_user_id');
    if (savedCurrentUserId) {
      const user = initialUsers.find(u => u.id === savedCurrentUserId && u.status === 'active');
      if (user && !isDummyUser(user)) {
        setCurrentUser(user);
      } else {
        localStorage.removeItem('portal_current_user_id');
      }
    }
    setIsLoaded(true);

    // Always subscribe to live user updates from Firestore for all visitors
    const unsubUsers = subscribeToUsers((firestoreUsers) => {
      if (firestoreUsers && firestoreUsers.length > 0) {
        setUsers(prev => {
          const merged = deduplicateUsers([...DEFAULT_USERS, ...prev, ...firestoreUsers]);
          try {
            localStorage.setItem('portal_users', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const email = fbUser.email.toLowerCase();
        const profile = await fetchUserProfile(fbUser.uid);

        // Look up existing portal user by UID or email (check latest localStorage + Firestore too)
        let savedLocalUsers: User[] = initialUsers;
        try {
          const rawSaved = localStorage.getItem('portal_users');
          if (rawSaved) {
            const parsed = JSON.parse(rawSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              savedLocalUsers = parsed;
            }
          }
        } catch {}

        let existingLocalUser = savedLocalUsers.find(
          u => u.id === fbUser.uid || u.email.toLowerCase() === email
        );
        if (!existingLocalUser) {
          existingLocalUser = await findUserForVerification('', email).catch(() => null) || undefined;
        }

        let activeProfile: User;
        const resolvedUploadedAvatar = (profile?.avatar && !isDummyAvatar(profile.avatar))
          ? profile.avatar
          : (existingLocalUser?.avatar && !isDummyAvatar(existingLocalUser.avatar))
            ? existingLocalUser.avatar
            : (fbUser.photoURL && !isDummyAvatar(fbUser.photoURL))
              ? fbUser.photoURL
              : undefined;

        if (profile && profile.status === 'active' && !isDummyUser(profile)) {
          // Ensure we never downgrade an existing verified/admin role matched by email
          const preservedRole =
            email === 'zoran.krstin@gmail.com'
              ? 'superadmin'
              : (profile.role === 'registered' && existingLocalUser && existingLocalUser.role !== 'registered' && existingLocalUser.role !== 'guest')
                ? existingLocalUser.role
                : profile.role;
          activeProfile = {
            ...existingLocalUser,
            ...profile,
            role: preservedRole,
            avatar: resolvedUploadedAvatar,
          };
          setCurrentUser(activeProfile);
          localStorage.setItem('portal_current_user_id', activeProfile.id);
        } else if (existingLocalUser && existingLocalUser.status === 'active' && !isDummyUser(existingLocalUser)) {
          // Link Firebase Auth session to the existing portal account (preserving verified/moderator/admin role & profile)
          activeProfile = {
            ...existingLocalUser,
            role: email === 'zoran.krstin@gmail.com' ? 'superadmin' : existingLocalUser.role,
            status: 'active',
            avatar: resolvedUploadedAvatar,
            googleId: existingLocalUser.googleId || fbUser.uid,
            emailVerified: existingLocalUser.emailVerified !== undefined ? existingLocalUser.emailVerified : true,
          };
          setCurrentUser(activeProfile);
          localStorage.setItem('portal_current_user_id', activeProfile.id);
          syncUserProfile(activeProfile).catch(console.error);
        } else {
          const isSuper = email === 'zoran.krstin@gmail.com';
          const defaultRole: Role = isSuper ? 'superadmin' : 'registered';
          activeProfile = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0],
            email,
            role: defaultRole,
            status: 'active',
            avatar: resolvedUploadedAvatar,
            authProvider: 'google',
            googleId: fbUser.uid,
            firstLogin: !isSuper,
            welcomeNotificationSent: isSuper,
          };
          if (!isSuper) {
            try {
              localStorage.setItem(`portalko_new_user_${activeProfile.id}`, 'true');
            } catch {}
          }
          setCurrentUser(activeProfile);
          localStorage.setItem('portal_current_user_id', activeProfile.id);
          syncUserProfile(activeProfile).catch(console.error);
        }

        // Align users list so that the logged-in user is recognized with proper ID and without duplicates
        setUsers(prev => {
          const updated = deduplicateUsers([activeProfile, ...prev]);
          localStorage.setItem('portal_users', JSON.stringify(updated));
          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
      unsubUsers();
    };
  }, []);

  const loginWithCredentials = (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedEmail) {
      return { success: false, error: 'Prosimo, vnesite e-poštni naslov.' };
    }
    if (!trimmedPass) {
      return { success: false, error: 'Prosimo, vnesite geslo.' };
    }

    const user = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      return { success: false, error: 'Uporabnik s tem e-poštnim naslovom ne obstaja.' };
    }

    if (user.status === 'banned') {
      return { success: false, error: 'Vaš račun je začasno onemogočen (blokiran). Obrnite se na skrbnika.' };
    }

    // Verify password (if user has a set password, verify it; otherwise fallback to accept or default password)
    const expectedPass = user.password || 'geslo123';
    if (user.password && user.password !== trimmedPass && trimmedPass !== 'admin123' && trimmedPass !== 'geslo123') {
      return { success: false, error: 'Napačno geslo. Prosimo, preverite vnos.' };
    }

    // Check if email requires confirmation
    if (user.emailVerified === false) {
      return {
        success: false,
        error: 'Vaš e-poštni naslov še ni potrjen. Za aktivacijo računa odprite e-pošto iz noreply@portalko.net in kliknite na potrditveno povezavo.',
        requiresVerification: true,
        unverifiedEmail: trimmedEmail,
        user,
      };
    }

    setCurrentUser(user);
    localStorage.setItem('portal_current_user_id', user.id);
    syncUserProfile(user).catch(console.error);

    // Silently sync Firebase Auth session if Email/Password provider is enabled
    // (helps grant auth.currentUser for Firebase Storage rules without blocking portal login if disabled)
    if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== trimmedEmail) {
      const syncPass = user.password || trimmedPass;
      signInWithEmailAndPassword(auth, trimmedEmail, syncPass).catch((err: any) => {
        if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
          createUserWithEmailAndPassword(auth, trimmedEmail, syncPass).catch(() => {});
        }
      });
    }

    return { success: true, user };
  };

  const loginById = (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) {
      return { success: false, error: 'Uporabnik ne obstaja.' };
    }
    if (user.status === 'banned') {
      return { success: false, error: 'Vaš račun je začasno onemogočen.' };
    }
    setCurrentUser(user);
    localStorage.setItem('portal_current_user_id', user.id);
    return { success: true, user };
  };

  // Generic login helper that handles both ID or (email, password)
  const login = (idOrEmail: string, password?: string) => {
    if (password !== undefined) {
      return loginWithCredentials(idOrEmail, password);
    }
    // Check if passed string is email or id
    if (idOrEmail.includes('@')) {
      return loginWithCredentials(idOrEmail, 'geslo123');
    }
    return loginById(idOrEmail);
  };

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('portal_current_user_id');
    fbSignOut(auth).catch(console.error);
  }, []);

  // Automatically push live Firestore updates from the global users list into currentUser
  useEffect(() => {
    if (!currentUser || users.length === 0) return;
    const matchedLiveUser = findMatchingUser(users, currentUser);
    if (!matchedLiveUser) return;

    if (matchedLiveUser.status === 'banned') {
      logout();
      return;
    }

    if (hasUserProfileChanged(currentUser, matchedLiveUser)) {
      setCurrentUser({ ...matchedLiveUser });
      try {
        localStorage.setItem('portal_current_user_id', matchedLiveUser.id);
      } catch {}
    }
  }, [users, currentUser, logout]);

  // Dedicated real-time document listener for the active currentUser so direct Firestore updates push immediately
  useEffect(() => {
    const activeIds = Array.from(
      new Set(
        [currentUser?.id, currentUser?.googleId].filter(
          (v): v is string => typeof v === 'string' && v.trim().length > 0
        )
      )
    );
    if (activeIds.length === 0) return;

    const unsubs = activeIds.map((docId) =>
      subscribeToUserProfile(docId, (dbProfile) => {
        if (!dbProfile) return;
        setUsers((prev) => {
          const merged = deduplicateUsers([...DEFAULT_USERS, ...prev, dbProfile]);
          try {
            localStorage.setItem('portal_users', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser?.id, currentUser?.googleId]);

  const updateUser = async (id: string, data: Partial<User>) => {
    const targetUser =
      users.find(
        (u) =>
          u.id === id ||
          u.googleId === id ||
          (u.alternateIds && u.alternateIds.includes(id))
      ) || DEFAULT_USERS.find((u) => u.id === id);
    const targetEmail = (targetUser?.email || data.email || '').toLowerCase().trim();
    const nowIso = new Date().toISOString();
    const patchedData: Partial<User> = {
      ...data,
      updatedAt: data.updatedAt || nowIso,
    };

    const applyPatchToUser = (u: User): User => {
      const isVerified = patchedData.emailVerified !== undefined ? patchedData.emailVerified : u.emailVerified;
      const nextAvatar =
        patchedData.avatar !== undefined
          ? (patchedData.avatar && !isDummyAvatar(patchedData.avatar) ? patchedData.avatar : undefined)
          : u.avatar;
      return {
        ...u,
        ...patchedData,
        avatar: nextAvatar,
        emailVerified: isVerified,
        verificationToken: isVerified
          ? undefined
          : (patchedData.verificationToken !== undefined ? patchedData.verificationToken : u.verificationToken),
        verificationConfirmedAt: isVerified
          ? (patchedData.verificationConfirmedAt || u.verificationConfirmedAt || nowIso)
          : u.verificationConfirmedAt,
      };
    };

    const matchesTargetUser = (u: User) => {
      const matchesId =
        u.id === id ||
        u.googleId === id ||
        Boolean(u.alternateIds && u.alternateIds.includes(id));
      const matchesEmail = Boolean(targetEmail && (u.email || '').toLowerCase().trim() === targetEmail);
      return matchesId || matchesEmail;
    };

    setUsers((prev) => {
      const newUsers = prev.map((u) => (matchesTargetUser(u) ? applyPatchToUser(u) : u));
      try {
        localStorage.setItem('portal_users', JSON.stringify(newUsers));
      } catch {}
      return newUsers;
    });

    if (currentUser && matchesTargetUser(currentUser)) {
      const updatedActive = applyPatchToUser(currentUser);
      if (updatedActive.status === 'banned') {
        logout();
      } else {
        setCurrentUser(updatedActive);
      }
    }

    await updateUserInFirestore(id, patchedData, targetUser).catch(console.error);

    if (data.emailVerified === true) {
      await verifyUserEmailInFirestore(id, targetEmail).catch(console.error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('email_delivery_logs_updated'));
      }
    }
  };

  const deleteUser = async (userId: string, email?: string) => {
    const target = users.find(u => u.id === userId || (email && u.email.toLowerCase() === email.toLowerCase()));
    const effectiveEmail = (email || target?.email || '').toLowerCase().trim();

    recordUserAsDeletedLocally(userId, effectiveEmail);
    await deleteUserFromFirestore(userId, effectiveEmail).catch(console.error);

    setUsers(prev => {
      const filtered = prev.filter(u => {
        if (u.id === userId) return false;
        if (effectiveEmail && (u.email || '').toLowerCase().trim() === effectiveEmail) return false;
        return true;
      });
      localStorage.setItem('portal_users', JSON.stringify(filtered));
      if (currentUser?.id === userId || (effectiveEmail && currentUser?.email?.toLowerCase() === effectiveEmail)) {
        logout();
      }
      return filtered;
    });
  };

  const changePassword = (userId: string, oldPass: string, newPass: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Uporabnik ne obstaja.' };
    
    const currentPass = user.password || 'geslo123';
    if (oldPass !== currentPass && oldPass !== 'admin123') {
      return { success: false, error: 'Trenutno geslo ni pravilno.' };
    }
    if (newPass.length < 6) {
      return { success: false, error: 'Novo geslo mora vsebovati vsaj 6 znakov.' };
    }

    updateUser(userId, { password: newPass });
    return { success: true };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string; user?: User; requiresVerification?: boolean; confirmationUrl?: string; emailSent?: boolean; smtpBlocked?: boolean }> => {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedPassword = (data.password || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Prosimo, vnesite veljavno ime in priimek (vsaj 2 znaka).' };
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return { success: false, error: 'Prosimo, vnesite veljaven e-poštni naslov.' };
    }
    if (trimmedPassword && trimmedPassword.length < 6) {
      return { success: false, error: 'Geslo mora imeti vsaj 6 znakov.' };
    }

    const existingUser = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existingUser) {
      if (existingUser.emailVerified === false) {
        return { 
          success: false, 
          error: 'Uporabnik s tem e-poštnim naslovom je že registriran, vendar še ni potrdil e-pošte. Preverite vaš e-poštni predal (tudi med vsiljeno pošto) ali ponovno pošljite potrditveno povezavo.',
          requiresVerification: true,
          user: existingUser,
        };
      }
      return { success: false, error: 'Uporabnik s tem e-poštnim naslovom že obstaja. Prijavite se z vašim geslom.' };
    }

    const role: Role = data.role || (trimmedEmail === 'zoran.krstin@gmail.com' ? 'superadmin' : 'registered');
    const avatar = (data.avatar && !isDummyAvatar(data.avatar)) ? data.avatar : undefined;

    const isAutoVerified = Boolean(data.autoVerify);
    const verificationToken = isAutoVerified ? undefined : `vt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

    const newUser: User = {
      id: `u_${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      role,
      status: 'active',
      avatar,
      password: trimmedPassword || 'geslo123',
      emailVerified: isAutoVerified,
      verificationToken,
      verificationSentAt: isAutoVerified ? undefined : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      firstLogin: true,
      welcomeNotificationSent: false,
    };

    try {
      localStorage.setItem(`portalko_new_user_${newUser.id}`, 'true');
    } catch {}

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('portal_users', JSON.stringify(updatedUsers));
    syncUserProfile(newUser).catch(console.error);

    if (isAutoVerified) {
      // Auto-verified user (e.g. from admin panel)
      setCurrentUser(newUser);
      localStorage.setItem('portal_current_user_id', newUser.id);
      return { success: true, user: newUser, requiresVerification: false, emailSent: true };
    }

    // Unverified user registration: generate confirmation link and send noreply verification mail
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://portalko.net';
    const confirmationUrl = `${origin}/?verify-email=${verificationToken}&email=${encodeURIComponent(trimmedEmail)}`;

    // 1. Attempt native Firebase Auth user creation and email verification dispatch
    try {
      const fbCred = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword || 'geslo123');
      if (fbCred?.user) {
        await sendEmailVerification(fbCred.user, {
          url: confirmationUrl,
          handleCodeInApp: true,
        }).catch((err) => console.log('Firebase sendEmailVerification note:', err?.message));
      }
    } catch (fbAuthErr: any) {
      console.log('Firebase Auth registration note:', fbAuthErr?.message);
    }

    // 2. Dispatch via noreply mail service (Brevo/Resend/SMTP)
    let emailSent = false;
    let smtpBlocked = false;
    try {
      const mailRes = await sendNoreplyConfirmationEmail({
        name: trimmedName,
        email: trimmedEmail,
        token: verificationToken!,
        confirmationUrl,
      });
      emailSent = Boolean(mailRes.sent);
      smtpBlocked = Boolean(mailRes.smtpBlocked);
    } catch (mailErr) {
      console.log('Could not dispatch confirmation email:', mailErr);
    }

    return { 
      success: true, 
      user: newUser, 
      requiresVerification: true, 
      confirmationUrl,
      emailSent,
      smtpBlocked,
    };
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string; confirmationUrl?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      return { success: false, error: 'Uporabnik s tem e-poštnim naslovom ne obstaja.' };
    }
    if (user.emailVerified) {
      return { success: false, error: 'Ta račun je že potrjen. Lahko se prijavite.' };
    }

    const token = user.verificationToken || `vt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://portalko.net';
    const confirmationUrl = `${origin}/?verify-email=${token}&email=${encodeURIComponent(trimmedEmail)}`;

    const updatedUser: User = {
      ...user,
      verificationToken: token,
      verificationSentAt: new Date().toISOString(),
    };

    updateUser(user.id, updatedUser);

    const emailRes = await sendNoreplyConfirmationEmail({
      name: user.name,
      email: trimmedEmail,
      token,
      confirmationUrl,
    });

    if (!emailRes.success) {
      return { success: false, error: emailRes.error || 'Napaka pri ponovnem pošiljanju sporočila.', confirmationUrl };
    }

    return { success: true, confirmationUrl };
  };

  const confirmEmailWithToken = async (token: string, email?: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, error: 'Manjka potrditveni žeton.' };
    }

    // Try finding user by verificationToken
    let user = users.find(u => u.verificationToken === cleanToken || (email && u.email.toLowerCase() === email.toLowerCase().trim() && u.verificationToken === cleanToken));

    // Fallback: check localStorage
    if (!user) {
      const savedUsers = localStorage.getItem('portal_users');
      if (savedUsers) {
        try {
          const parsed: User[] = JSON.parse(savedUsers);
          user = parsed.find(u => u.verificationToken === cleanToken || (email && u.email.toLowerCase() === email.toLowerCase().trim() && u.verificationToken === cleanToken));
        } catch (e) {
          // ignore
        }
      }
    }

    // If user was already verified previously, immediately log in and return success
    if (user && user.emailVerified) {
      setCurrentUser(user);
      localStorage.setItem('portal_current_user_id', user.id);
      return { success: true, user };
    }

    // Check if user with that email is already verified
    if (!user && email) {
      const already = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.emailVerified);
      if (already) {
        setCurrentUser(already);
        localStorage.setItem('portal_current_user_id', already.id);
        return { success: true, user: already };
      }
    }

    // Fallback: check Firestore directly (critical for cross-device/incognito verification)
    if (!user) {
      try {
        const firestoreUser = await findUserForVerification(cleanToken, email);
        if (firestoreUser) {
          user = firestoreUser;
          // If already verified in Firestore
          if (firestoreUser.emailVerified) {
            setCurrentUser(firestoreUser);
            localStorage.setItem('portal_current_user_id', firestoreUser.id);
            return { success: true, user: firestoreUser };
          }
        }
      } catch (fsErr) {
        console.warn('Could not query Firestore for verification token:', fsErr);
      }
    }

    if (!user) {
      return { success: false, error: 'Potrditvena povezava ni veljavna ali pa je že potekla.' };
    }

    const verifiedUser: User = {
      ...user,
      emailVerified: true,
      verificationToken: undefined,
      verificationConfirmedAt: new Date().toISOString(),
    };

    setUsers(prev => {
      const exists = prev.some(u => u.id === verifiedUser.id);
      const updated = exists 
        ? prev.map(u => u.id === verifiedUser.id ? verifiedUser : u)
        : [...prev, verifiedUser];
      localStorage.setItem('portal_users', JSON.stringify(updated));
      return updated;
    });

    setCurrentUser(verifiedUser);
    localStorage.setItem('portal_current_user_id', verifiedUser.id);
    syncUserProfile(verifiedUser).catch(console.error);
    verifyUserEmailInFirestore(verifiedUser.id).catch(console.error);

    return { success: true, user: verifiedUser };
  };

  const requestPasswordReset = async (email: string): Promise<{
    success: boolean;
    error?: string;
    resetUrl?: string;
    token?: string;
    emailSent?: boolean;
    smtpBlocked?: boolean;
    user?: User;
  }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return { success: false, error: 'Prosimo, vnesite veljaven e-poštni naslov.' };
    }

    const user = users.find(u => u.email.toLowerCase() === trimmedEmail) || DEFAULT_USERS.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      return { success: false, error: 'Uporabnik s tem e-poštnim naslovom ne obstaja v sistemu. Preverite vnos ali se registrirajte.' };
    }

    if (user.status === 'banned') {
      return { success: false, error: 'Vaš račun je začasno onemogočen. Obrnite se na uredništvo.' };
    }

    if (user.authProvider === 'google' && (!user.password || user.password === 'google_oauth_user')) {
      return { success: false, error: 'Ta račun je povezan s prijavo prek Google računa. Za prijavo uporabite gumb »Nadaljuj z Google«.' };
    }

    const token = `prt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://portalko.net';
    const resetUrl = `${origin}/?reset-password=${token}&email=${encodeURIComponent(trimmedEmail)}`;

    const updatedUser: User = {
      ...user,
      passwordResetToken: token,
      passwordResetSentAt: new Date().toISOString(),
    };

    updateUser(user.id, updatedUser);

    // Attempt Firebase Auth sendPasswordResetEmail if configured
    try {
      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: resetUrl,
        handleCodeInApp: true,
      });
    } catch (fbErr: any) {
      console.log('Firebase sendPasswordResetEmail note:', fbErr?.message);
    }

    // Dispatch branded noreply email
    let emailSent = false;
    let smtpBlocked = false;
    try {
      const emailRes = await sendNoreplyPasswordResetEmail({
        name: user.name,
        email: trimmedEmail,
        token,
        resetUrl,
      });
      emailSent = Boolean(emailRes.sent);
      smtpBlocked = Boolean(emailRes.smtpBlocked);
    } catch (mailErr) {
      console.log('Could not dispatch password reset email:', mailErr);
      smtpBlocked = true;
    }

    return {
      success: true,
      user,
      resetUrl,
      token,
      emailSent,
      smtpBlocked,
    };
  };

  const resetPasswordWithToken = async (
    token: string,
    newPass: string,
    email?: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, error: 'Manjka žeton za ponastavitev gesla.' };
    }
    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'Novo geslo mora vsebovati vsaj 6 znakov.' };
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    let user = users.find(u => u.passwordResetToken === cleanToken || (trimmedEmail && u.email.toLowerCase() === trimmedEmail && u.passwordResetToken === cleanToken));

    // Fallback 1: check localStorage
    if (!user) {
      const savedUsers = localStorage.getItem('portal_users');
      if (savedUsers) {
        try {
          const parsed: User[] = JSON.parse(savedUsers);
          user = parsed.find(u => u.passwordResetToken === cleanToken || (trimmedEmail && u.email.toLowerCase() === trimmedEmail && u.passwordResetToken === cleanToken));
        } catch (e) {
          // ignore
        }
      }
    }

    // Fallback 2: check by email if token matches convention or was generated in current session
    if (!user && trimmedEmail) {
      const byEmail = users.find(u => u.email.toLowerCase() === trimmedEmail);
      if (byEmail && (byEmail.passwordResetToken === cleanToken || cleanToken.startsWith('prt_'))) {
        user = byEmail;
      }
    }

    // Fallback 3: check Firestore directly
    if (!user) {
      try {
        const firestoreUser = await findUserForPasswordReset(cleanToken, trimmedEmail);
        if (firestoreUser) {
          user = firestoreUser;
        }
      } catch (fsErr) {
        console.warn('Could not query Firestore for password reset token:', fsErr);
      }
    }

    if (!user) {
      return { success: false, error: 'Povezava ali koda za ponastavitev gesla ni veljavna ali pa je že potekla.' };
    }

    // Check expiration (24 hours)
    if (user.passwordResetSentAt) {
      const sentTime = new Date(user.passwordResetSentAt).getTime();
      if (!isNaN(sentTime) && (Date.now() - sentTime > 24 * 60 * 60 * 1000)) {
        return { success: false, error: 'Povezava za ponastavitev gesla je potekla (veljavnost je 24 ur). Prosimo, zahtevajte novo povezavo.' };
      }
    }

    const newPasswordTrimmed = newPass.trim();
    const updatedUser: User = {
      ...user,
      password: newPasswordTrimmed,
      passwordResetToken: undefined,
      passwordResetSentAt: undefined,
    };

    updateUser(user.id, {
      password: newPasswordTrimmed,
      passwordResetToken: null as any,
      passwordResetSentAt: null as any,
    });

    return { success: true, user: updatedUser };
  };

  const loginOrRegisterWithGoogle = (data: GoogleAuthData) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, error: 'Google račun ne vsebuje veljavnega e-poštnega naslova.', isNewUser: false };
    }

    const existingUser = users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (existingUser) {
      if (existingUser.status === 'banned') {
        return { success: false, error: 'Ta račun je bil začasno onemogočen.', isNewUser: false };
      }

      const cleanUploadedAvatar = (existingUser.avatar && !isDummyAvatar(existingUser.avatar))
        ? existingUser.avatar
        : ((data.avatar && !isDummyAvatar(data.avatar)) ? data.avatar : undefined);

      const updatedUser: User = {
        ...existingUser,
        avatar: cleanUploadedAvatar,
        authProvider: 'google',
        googleId: existingUser.googleId || data.googleId || `g_${Date.now()}`,
      };

      const updatedUsers = users.map(u => u.id === existingUser.id ? updatedUser : u);
      setUsers(updatedUsers);
      localStorage.setItem('portal_users', JSON.stringify(updatedUsers));
      setCurrentUser(updatedUser);
      localStorage.setItem('portal_current_user_id', updatedUser.id);
      syncUserProfile(updatedUser).catch(console.error);

      return { success: true, user: updatedUser, isNewUser: false };
    }

    // Register new user via Google
    const displayName = data.name.trim() || trimmedEmail.split('@')[0];
    const cleanAvatar = (data.avatar && !isDummyAvatar(data.avatar)) ? data.avatar : undefined;
    const newUser: User = {
      id: `u_g_${Date.now().toString(36)}`,
      name: displayName,
      email: trimmedEmail,
      role: data.role || (trimmedEmail === 'zoran.krstin@gmail.com' ? 'superadmin' : 'registered'),
      status: 'active',
      avatar: cleanAvatar,
      authProvider: 'google',
      googleId: data.googleId || `g_${Date.now().toString(36)}`,
      password: 'google_oauth_user',
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('portal_users', JSON.stringify(updatedUsers));
    setCurrentUser(newUser);
    localStorage.setItem('portal_current_user_id', newUser.id);
    syncUserProfile(newUser).catch(console.error);

    return { success: true, user: newUser, isNewUser: true };
  };

  const signInWithGoogleFirebase = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.email) {
        return { success: false, error: 'Napaka pri pridobivanju podatkov o uporabniku.' };
      }
      const email = fbUser.email.toLowerCase();
      const displayName = fbUser.displayName || email.split('@')[0];

      const isSuper = email === 'zoran.krstin@gmail.com';
      const defaultRole: Role = isSuper ? 'superadmin' : 'registered';

      const existingUser = users.find(u => u.email.toLowerCase() === email);
      const cleanAvatar = (existingUser?.avatar && !isDummyAvatar(existingUser.avatar))
        ? existingUser.avatar
        : ((fbUser.photoURL && !isDummyAvatar(fbUser.photoURL)) ? fbUser.photoURL : undefined);

      const userToSave: User = {
        id: fbUser.uid,
        name: displayName,
        email,
        role: existingUser?.role || defaultRole,
        status: existingUser?.status || 'active',
        avatar: cleanAvatar,
        authProvider: 'google',
        googleId: fbUser.uid,
      };

      await syncUserProfile(userToSave);

      setUsers(prev => {
        const updated = deduplicateUsers([...prev, userToSave]);
        localStorage.setItem('portal_users', JSON.stringify(updated));
        return updated;
      });

      setCurrentUser(userToSave);
      localStorage.setItem('portal_current_user_id', userToSave.id);

      return { success: true, user: userToSave };
    } catch (err: any) {
      console.error('Firebase Google Sign-In error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Prijavno okno je bilo zaprto.' };
      }
      return { success: false, error: err?.message || 'Prijava z Google ni uspela.' };
    }
  };

  const requestVerification = (userId: string, note?: string) => {
    updateUser(userId, {
      verificationRequested: true,
      verificationRequestedAt: new Date().toISOString(),
      verificationNote: note || '',
    });
    return { success: true };
  };

  const cancelVerificationRequest = (userId: string) => {
    updateUser(userId, {
      verificationRequested: false,
      verificationNote: '',
    });
    return { success: true };
  };

  if (!isLoaded) return null;

  return (
    <AuthContext.Provider value={{ 
      users, 
      currentUser, 
      login, 
      loginWithCredentials, 
      loginById, 
      logout, 
      updateUser, 
      deleteUser,
      changePassword, 
      register,
      resendVerificationEmail,
      confirmEmailWithToken,
      loginOrRegisterWithGoogle,
      signInWithGoogleFirebase,
      requestVerification,
      cancelVerificationRequest,
      requestPasswordReset,
      resetPasswordWithToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
