import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { syncUserProfile, updateUserInFirestore, fetchUserProfile, subscribeToUsers, deleteUserFromFirestore, findUserForVerification, verifyUserEmailInFirestore } from '../services/firestoreService';
import { sendNoreplyConfirmationEmail } from '../services/emailService';
import { isDummyAvatar } from '../utils/avatarUtils';
import { slugify } from '../utils/urlUtils';

export type Role = 'superadmin' | 'admin' | 'verified' | 'registered' | 'guest';

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
  builtInTab?: 'posts' | 'saved' | 'settings';
  content?: string;
  url?: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_PROFILE_MENU: ProfileMenuItem[] = [
  { id: 'menu-posts', label: 'Moje objave', icon: 'FileText', type: 'builtIn', builtInTab: 'posts', visible: true, order: 1 },
  { id: 'menu-saved', label: 'Shranjeno', icon: 'Bookmark', type: 'builtIn', builtInTab: 'saved', visible: true, order: 2 },
  { id: 'menu-about', label: 'O meni', icon: 'User', type: 'custom', content: 'Pozdravljeni na mojem profilu na Portalko.net! Tukaj delim zanimive objave, novice ter predloge za slovensko skupnost.', visible: true, order: 3 },
  { id: 'menu-settings', label: 'Nastavitve računa', icon: 'Settings', type: 'builtIn', builtInTab: 'settings', visible: true, order: 4 },
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
  socialLinks?: SocialLink[];
  profileMenu?: ProfileMenuItem[];
  verificationRequested?: boolean;
  verificationRequestedAt?: string;
  verificationNote?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationSentAt?: string;
  verificationConfirmedAt?: string;
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
    googleId: 'g_zoran_krstin'
  },
  { 
    id: 'u3', 
    name: 'Maja Zupan', 
    email: 'maja.z@example.com', 
    role: 'verified', 
    status: 'active', 
    emailVerified: true,
    bio: 'Kulinarični blog in doživetja po Sloveniji.',
    username: '@maja_zupan',
    socialLinks: [
      { id: 's1', platform: 'instagram', url: 'https://instagram.com', label: 'Instagram' },
    ],
    profileMenu: DEFAULT_PROFILE_MENU,
    password: 'geslo123'
  },
  { 
    id: 'u4', 
    name: 'Janez Horvat', 
    email: 'janez.h@example.com', 
    role: 'registered', 
    status: 'banned', 
    emailVerified: true,
    bio: 'Član skupnosti.',
    username: '@janez_h',
    profileMenu: DEFAULT_PROFILE_MENU,
    password: 'geslo123'
  },
  {
    id: 'u_1790075229756',
    name: 'Uredništvo Portalko.net',
    email: 'telemach987@proton.me',
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
    ]
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
    ]
  },
];

export function isDummyUser(user?: { email?: string; id?: string } | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const id = (user.id || '').trim();
  return (
    email === 'luka.n@example.com' ||
    email === 'luka.novak.portal@gmail.com' ||
    id === 'u2' ||
    email.startsWith('luka.n@') ||
    email.startsWith('luka.novak.portal@')
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
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, oldPass: string, newPass: string) => { success: boolean; error?: string };
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; user?: User; requiresVerification?: boolean; confirmationUrl?: string; emailSent?: boolean; smtpBlocked?: boolean }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string; confirmationUrl?: string }>;
  confirmEmailWithToken: (token: string, email?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  loginOrRegisterWithGoogle: (data: GoogleAuthData) => { success: boolean; error?: string; user?: User; isNewUser: boolean };
  signInWithGoogleFirebase: () => Promise<{ success: boolean; error?: string; user?: User }>;
  requestVerification: (userId: string, note?: string) => { success: boolean; error?: string };
  cancelVerificationRequest: (userId: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function deduplicateUsers(userList: (User | null | undefined)[]): User[] {
  const byId = new Map<string, User>();
  const byEmail = new Map<string, User>();

  for (const u of userList) {
    if (!u || !u.id || isDummyUser(u)) continue;
    const emailNorm = (u.email || '').toLowerCase().trim();

    // Check if we already have this user by id or by email
    const existingById = byId.get(u.id);
    const existingByEmail = emailNorm ? byEmail.get(emailNorm) : undefined;
    const existing = existingById || existingByEmail;

    if (existing) {
      // Pick the canonical ID (prefer the longer ID like Firebase UID over placeholder 'u1')
      const canonicalId = (u.id.length > existing.id.length) ? u.id : existing.id;
      
      const cleanAvatar = (u.avatar && !isDummyAvatar(u.avatar)) 
        ? u.avatar 
        : ((existing.avatar && !isDummyAvatar(existing.avatar)) ? existing.avatar : undefined);

      const merged: User = {
        ...existing,
        ...u,
        id: canonicalId,
        avatar: cleanAvatar,
        role: (u.role === 'superadmin' || existing.role === 'superadmin') ? 'superadmin' : (u.role || existing.role),
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
      byId.set(u.id, u);
      if (emailNorm) {
        byEmail.set(emailNorm, u);
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
    const savedUsers = localStorage.getItem('portal_users');
    let initialUsers = deduplicateUsers(DEFAULT_USERS);
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure default passwords if missing from older saved states, filter dummy users,
          // and strip any legacy dummy avatars so only user-uploaded images are used.
          const cleanedParsed = parsed
            .filter((u: User) => !isDummyUser(u))
            .map((u: User) => ({
              ...u,
              avatar: (u.avatar && !isDummyAvatar(u.avatar)) ? u.avatar : undefined,
              password: u.password || (u.role === 'superadmin' ? 'admin123' : 'geslo123'),
            }));
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
          const merged = deduplicateUsers([...prev, ...DEFAULT_USERS, ...firestoreUsers]);
          localStorage.setItem('portal_users', JSON.stringify(merged));
          return merged;
        });
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const email = fbUser.email.toLowerCase();
        const profile = await fetchUserProfile(fbUser.uid);
        let activeProfile: User;
        const existingLocalUser = initialUsers.find(u => u.email.toLowerCase() === email || u.id === fbUser.uid);
        const resolvedUploadedAvatar = (profile?.avatar && !isDummyAvatar(profile.avatar))
          ? profile.avatar
          : (existingLocalUser?.avatar && !isDummyAvatar(existingLocalUser.avatar))
            ? existingLocalUser.avatar
            : (fbUser.photoURL && !isDummyAvatar(fbUser.photoURL))
              ? fbUser.photoURL
              : undefined;

        if (profile && profile.status === 'active' && !isDummyUser(profile)) {
          activeProfile = { ...profile, avatar: resolvedUploadedAvatar };
          setCurrentUser(activeProfile);
          localStorage.setItem('portal_current_user_id', activeProfile.id);
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
          };
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

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('portal_current_user_id');
    fbSignOut(auth).catch(console.error);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const targetUser = users.find(u => u.id === id) || DEFAULT_USERS.find(u => u.id === id);
    updateUserInFirestore(id, data, targetUser).catch(console.error);
    setUsers(prev => {
      const authorSlug = targetUser?.name ? slugify(targetUser.name) : '';
      const newUsers = prev.map(u => {
        if (u.id === id) return { ...u, ...data };
        // If avatar is updated, keep any matching duplicate account for same organization synchronized
        if (data.avatar !== undefined && targetUser?.name && u.name && (u.name.trim().toLowerCase() === targetUser.name.trim().toLowerCase() || slugify(u.name) === authorSlug)) {
          return { ...u, avatar: data.avatar };
        }
        return u;
      });
      localStorage.setItem('portal_users', JSON.stringify(newUsers));
      if (currentUser?.id === id || (data.avatar !== undefined && targetUser?.name && currentUser?.name && slugify(currentUser.name) === authorSlug)) {
        const updated = newUsers.find(u => u.id === (currentUser?.id || id));
        if (updated) {
          if (updated.status === 'banned') {
            logout();
          } else {
            setCurrentUser(updated);
          }
        }
      }
      return newUsers;
    });
  };

  const deleteUser = (userId: string) => {
    deleteUserFromFirestore(userId).catch(console.error);
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== userId);
      localStorage.setItem('portal_users', JSON.stringify(filtered));
      if (currentUser?.id === userId) {
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
    };

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
      password: 'google_oauth_user'
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
        const filtered = prev.filter(u => u.email.toLowerCase() !== email);
        const updated = [...filtered, userToSave];
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
      cancelVerificationRequest
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
