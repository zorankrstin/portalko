import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PostDetailType } from '../types';

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

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const playNotificationSound = () => {
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
