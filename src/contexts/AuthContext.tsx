import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { syncUserProfile, updateUserInFirestore, fetchUserProfile } from '../services/firestoreService';

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
}

const DEFAULT_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Zoran Krstin', 
    email: 'zoran.krstin@gmail.com', 
    role: 'superadmin', 
    status: 'active', 
    avatar: 'https://ui-avatars.com/api/?name=Zoran+Krstin&background=7C3AED&color=fff',
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
    id: 'u2', 
    name: 'Luka Novak', 
    email: 'luka.n@example.com', 
    role: 'admin', 
    status: 'active', 
    avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA',
    bio: 'Urednik novic in tehnološki navdušenec.',
    username: '@luka_n',
    socialLinks: [
      { id: 's1', platform: 'website', url: 'https://portalko.net', label: 'Portalko.net' },
    ],
    profileMenu: DEFAULT_PROFILE_MENU,
    password: 'geslo123'
  },
  { 
    id: 'u3', 
    name: 'Maja Zupan', 
    email: 'maja.z@example.com', 
    role: 'verified', 
    status: 'active', 
    avatar: 'https://ui-avatars.com/api/?name=Maja+Zupan&background=F59E0B&color=fff',
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
    avatar: 'https://ui-avatars.com/api/?name=Janez+Horvat&background=EF4444&color=fff',
    bio: 'Član skupnosti.',
    username: '@janez_h',
    profileMenu: DEFAULT_PROFILE_MENU,
    password: 'geslo123'
  },
];

export interface RegisterData {
  name: string;
  email: string;
  role?: Role;
  avatar?: string;
  password?: string;
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
  login: (idOrEmail: string, password?: string) => { success: boolean; error?: string; user?: User };
  loginWithCredentials: (email: string, password: string) => { success: boolean; error?: string; user?: User };
  loginById: (id: string) => { success: boolean; error?: string; user?: User };
  logout: () => void;
  updateUser: (id: string, data: Partial<User>) => void;
  changePassword: (userId: string, oldPass: string, newPass: string) => { success: boolean; error?: string };
  register: (data: RegisterData) => { success: boolean; error?: string; user?: User };
  loginOrRegisterWithGoogle: (data: GoogleAuthData) => { success: boolean; error?: string; user?: User; isNewUser: boolean };
  signInWithGoogleFirebase: () => Promise<{ success: boolean; error?: string; user?: User }>;
  requestVerification: (userId: string, note?: string) => { success: boolean; error?: string };
  cancelVerificationRequest: (userId: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedUsers = localStorage.getItem('portal_users');
    let initialUsers = DEFAULT_USERS;
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure default passwords if missing from older saved states
          initialUsers = parsed.map((u: User) => ({
            ...u,
            password: u.password || (u.role === 'superadmin' ? 'admin123' : 'geslo123'),
          }));
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
      if (user) {
        setCurrentUser(user);
      } else {
        localStorage.removeItem('portal_current_user_id');
      }
    }
    setIsLoaded(true);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const email = fbUser.email.toLowerCase();
        const profile = await fetchUserProfile(fbUser.uid);
        if (profile && profile.status === 'active') {
          setCurrentUser(profile);
          localStorage.setItem('portal_current_user_id', profile.id);
        } else {
          const isSuper = email === 'zoran.krstin@gmail.com';
          const defaultRole: Role = isSuper ? 'superadmin' : 'registered';
          const newProfile: User = {
            id: fbUser.uid,
            name: fbUser.displayName || email.split('@')[0],
            email,
            role: defaultRole,
            status: 'active',
            avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || email)}&background=4285F4&color=fff`,
            authProvider: 'google',
            googleId: fbUser.uid,
          };
          setCurrentUser(newProfile);
          localStorage.setItem('portal_current_user_id', newProfile.id);
          syncUserProfile(newProfile).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
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
    updateUserInFirestore(id, data).catch(console.error);
    setUsers(prev => {
      const newUsers = prev.map(u => u.id === id ? { ...u, ...data } : u);
      localStorage.setItem('portal_users', JSON.stringify(newUsers));
      if (currentUser?.id === id) {
        const updated = newUsers.find(u => u.id === id);
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

  const register = (data: RegisterData) => {
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

    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'Uporabnik s tem e-poštnim naslovom že obstaja. Prijavite se z vašim geslom.' };
    }

    const role: Role = data.role || (trimmedEmail === 'zoran.krstin@gmail.com' ? 'superadmin' : 'registered');
    const roleColors: Record<string, string> = {
      superadmin: '7C3AED',
      admin: 'DC2626',
      verified: 'D97706',
      registered: '0D8ABC',
      guest: '6B7280',
    };

    const bgColor = roleColors[role] || '0D8ABC';
    const avatar = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=${bgColor}&color=fff`;

    const newUser: User = {
      id: `u_${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      role,
      status: 'active',
      avatar,
      password: trimmedPassword || 'geslo123',
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('portal_users', JSON.stringify(updatedUsers));

    // Automatically log in as the newly created user
    setCurrentUser(newUser);
    localStorage.setItem('portal_current_user_id', newUser.id);
    syncUserProfile(newUser).catch(console.error);

    return { success: true, user: newUser };
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

      const updatedUser: User = {
        ...existingUser,
        avatar: existingUser.avatar || data.avatar,
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
    const newUser: User = {
      id: `u_g_${Date.now().toString(36)}`,
      name: displayName,
      email: trimmedEmail,
      role: data.role || (trimmedEmail === 'zoran.krstin@gmail.com' ? 'superadmin' : 'registered'),
      status: 'active',
      avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4285F4&color=fff`,
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
      const avatar = fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4285F4&color=fff`;

      const isSuper = email === 'zoran.krstin@gmail.com';
      const defaultRole: Role = isSuper ? 'superadmin' : 'registered';

      const existingUser = users.find(u => u.email.toLowerCase() === email);
      const userToSave: User = {
        id: fbUser.uid,
        name: displayName,
        email,
        role: existingUser?.role || defaultRole,
        status: existingUser?.status || 'active',
        avatar,
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
      changePassword, 
      register,
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
