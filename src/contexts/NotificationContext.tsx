import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PostDetailType } from '../types';
import { useAuth } from './AuthContext';
import {
  requestFcmToken,
  showBrowserNotification,
  subscribeToUserNotifications,
  listenForForegroundFcm,
  isFcmSupported,
  markNotificationAsReadInFirestore,
  markAllNotificationsAsReadInFirestore,
  deleteNotificationFromFirestore,
  clearAllNotificationsFromFirestore,
  sendTargetAuthorNotification,
  sendWelcomeNotificationForNewUser,
} from '../services/fcmService';
import { formatRelativeTime } from '../utils/dateUtils';

export type NotificationType = 'comment' | 'reply' | 'interaction' | 'system' | 'like' | 'deal' | 'event' | 'ad';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  read: boolean;
  target?: {
    type: PostDetailType;
    id: string;
  };
  authorName?: string;
  authorAvatar?: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'time'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  // FCM Push Notifications properties
  isPushSupported: boolean;
  pushPermission: NotificationPermission;
  enablePushNotifications: () => Promise<boolean>;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-sys-1',
    type: 'system',
    title: 'Dobrodošli na Portalko.net!',
    description: 'Raziščite samostojne strani za ugodnosti, dogodke in male oglase ter nov center obvestil.',
    time: 'Pravkar',
    timestamp: Date.now() - 1000 * 60 * 2,
    read: false,
  },
  {
    id: 'notif-deal-1',
    type: 'deal',
    title: 'Nova ekskluzivna ugodnost',
    description: 'Hervis Slovenija je objavil 30% popust na vso tekaško obutev.',
    time: 'pred 1 uro',
    timestamp: Date.now() - 1000 * 60 * 65,
    read: false,
    target: {
      type: 'deal',
      id: 'deal-1',
    },
  },
  {
    id: 'notif-event-1',
    type: 'event',
    title: 'Opomnik za dogodek jutri',
    description: 'Koncert Big Foot Mama v Cvetličarni se začne jutri ob 20:00.',
    time: 'pred 3 urami',
    timestamp: Date.now() - 1000 * 60 * 180,
    read: true,
    target: {
      type: 'event',
      id: 'event-1',
    },
  },
  {
    id: 'notif-like-1',
    type: 'interaction',
    title: 'Nov glas za ugodnost',
    description: 'Uporabnik Peter M. je glasoval za vašo deljeno ugodnost v kategoriji Tehnika.',
    time: 'včeraj',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
  },
];

const LOCAL_STORAGE_KEY = 'portalko_notifications_v1';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: AppNotification[] = JSON.parse(saved);
        return parsed.filter(n => n.id !== 'notif-welcome');
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Check browser push support on mount
  useEffect(() => {
    isFcmSupported().then(setIsPushSupported);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Save in localStorage on change (filtering out any phantom welcome items)
  useEffect(() => {
    try {
      const sanitized = notifications.filter(n => n.id !== 'notif-welcome');
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Request token and register in Firestore if permission already granted or when user logs in
  useEffect(() => {
    if (currentUser?.id && pushPermission === 'granted') {
      requestFcmToken(currentUser.id).catch(() => {});
    }
  }, [currentUser?.id, pushPermission]);

  // Real-time Firestore subscription for notifications directed to currentUser
  useEffect(() => {
    if (!currentUser?.id) {
      // Load saved notifications for guests
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed: AppNotification[] = JSON.parse(saved);
          setNotifications(parsed.filter(n => n.id !== 'notif-welcome'));
        } else {
          setNotifications([]);
        }
      } catch {
        setNotifications([]);
      }
      return;
    }

    // One-time welcome notification dispatch: ONLY for newly registered users upon their first login
    const welcomeKey = `portalko_welcome_notif_sent_${currentUser.id}`;
    const isNewUserFlag = 
      (typeof window !== 'undefined' && localStorage.getItem(`portalko_new_user_${currentUser.id}`) === 'true') ||
      currentUser.firstLogin === true;

    if (isNewUserFlag && typeof window !== 'undefined' && localStorage.getItem(welcomeKey) !== 'true') {
      localStorage.setItem(welcomeKey, 'true');
      try {
        localStorage.removeItem(`portalko_new_user_${currentUser.id}`);
      } catch {}
      sendWelcomeNotificationForNewUser({
        id: currentUser.id,
        name: currentUser.name,
      }).catch((e) => console.warn('sendWelcomeNotificationForNewUser failed:', e));
    } else {
      // Existing user: mark welcomeKey so they are never treated as new users
      if (typeof window !== 'undefined') {
        localStorage.setItem(welcomeKey, 'true');
      }
    }

    const unsubscribe = subscribeToUserNotifications(
      currentUser.id,
      (firestoreNotifs) => {
        // Map firestore notifications to AppNotification
        const mappedList: AppNotification[] = firestoreNotifs
          .filter((item: any) => item.id !== 'notif-welcome')
          .map((item: any) => {
            const rawTime = item.timestamp || (item.createdAt ? new Date(item.createdAt).getTime() : Date.now());
            return {
              id: item.id || `notif-${Date.now()}`,
              type: (item.type || 'comment') as NotificationType,
              title: item.title || 'Novo obvestilo',
              description: item.body || item.description || '',
              time: formatRelativeTime(rawTime),
              timestamp: rawTime,
              read: Boolean(item.read),
              target: item.targetId ? {
                type: item.targetType || 'post',
                id: item.targetId,
              } : undefined,
              authorName: item.senderName,
              authorAvatar: item.senderAvatar,
            };
          });

        // Set notifications directly from Firestore. When empty, stays empty (never re-injects hardcoded welcome)
        setNotifications(mappedList);
      },
      (_newNotif) => {
        playNotificationSound();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.firstLogin]);

  // Listen for FCM foreground messages
  useEffect(() => {
    const unsubscribe = listenForForegroundFcm((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Novo obvestilo';
      const body = payload.notification?.body || payload.data?.body || '';
      addNotification({
        type: (payload.data?.type as any) || 'interaction',
        title,
        description: body,
        target: payload.data?.targetId ? {
          type: payload.data?.targetType || 'post',
          id: payload.data?.targetId,
        } : undefined,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume (subtle)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio autoplay restrictions
    }
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'time'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      time: 'Pravkar',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    playNotificationSound();

    // If logged in, also persist to user's Firestore notifications
    if (currentUser?.id) {
      sendTargetAuthorNotification({
        targetAuthorId: currentUser.id,
        senderId: 'system',
        senderName: 'Portalko.net',
        type: notif.type,
        title: notif.title,
        postTitle: '',
        targetId: notif.target?.id || '',
        targetType: notif.target?.type || 'post',
        commentSnippet: notif.description,
      }).catch(() => {});
    }

    // Trigger browser native push if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      showBrowserNotification(newNotif.title, {
        body: newNotif.description,
        data: newNotif.target,
      });
    }
  };

  const enablePushNotifications = async (): Promise<boolean> => {
    try {
      const res = await requestFcmToken(currentUser?.id);
      setPushPermission(res.permission);
      if (res.permission === 'granted') {
        showBrowserNotification('🎉 Obvestila Portalko.net so vklopljena!', {
          body: 'Prejemali boste takojšnja obvestila v brskalniku ob novih komentarjih in odgovorih.',
        });
        return true;
      }
      return false;
    } catch (e) {
      console.warn('enablePushNotifications failed:', e);
      return false;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (currentUser?.id && id !== 'notif-welcome') {
      markNotificationAsReadInFirestore(currentUser.id, id).catch(() => {});
    }
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read && n.id !== 'notif-welcome').map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (currentUser?.id && unreadIds.length > 0) {
      markAllNotificationsAsReadInFirestore(currentUser.id, unreadIds).catch(() => {});
    }
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (currentUser?.id && id !== 'notif-welcome') {
      deleteNotificationFromFirestore(currentUser.id, id).catch(() => {});
    }
  };

  const clearAll = () => {
    const realIds = notifications.filter(n => n.id !== 'notif-welcome').map(n => n.id);
    setNotifications([]);
    if (currentUser?.id && realIds.length > 0) {
      clearAllNotificationsFromFirestore(currentUser.id, realIds).catch(() => {});
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        isPushSupported,
        pushPermission,
        enablePushNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
