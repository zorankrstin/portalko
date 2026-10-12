import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PostDetailType } from '../types';
import { useAuth } from './AuthContext';
import {
  requestFcmToken,
  showBrowserNotification,
  subscribeToUserNotifications,
  listenForForegroundFcm,
  isFcmSupported,
} from '../services/fcmService';

export type NotificationType = 'comment' | 'interaction' | 'system' | 'like' | 'deal' | 'event' | 'ad';

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
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_NOTIFICATIONS;
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

  // Save in localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notifications));
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
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToUserNotifications(currentUser.id, (newNotif) => {
      // Add incoming real-time notification to local list if not already present
      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        const mapped: AppNotification = {
          id: newNotif.id || `notif-${Date.now()}`,
          type: newNotif.type || 'interaction',
          title: newNotif.title || 'Novo obvestilo',
          description: newNotif.body || 'Imate novo interakcijo.',
          time: 'Pravkar',
          timestamp: newNotif.timestamp || Date.now(),
          read: false,
          target: newNotif.targetId ? {
            type: newNotif.targetType || 'post',
            id: newNotif.targetId,
          } : undefined,
          authorName: newNotif.senderName,
          authorAvatar: newNotif.senderAvatar,
        };
        return [mapped, ...prev];
      });
      playNotificationSound();
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

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
          body: 'Prejemali boste takojšnja obvestila v brskalniku ob novih komentarjih in všečkih.',
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
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
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
