import React, { useState, useRef, useEffect } from 'react';
import { Bell, Heart, Calendar, MessageSquare, Tag, Check, Bookmark } from 'lucide-react';

interface Notification {
  id: string;
  type: 'like' | 'event' | 'message' | 'alert' | 'bookmark';
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '0', type: 'bookmark', title: 'Nova aktivnost (Shranjeno)', description: 'Na vaši shranjeni objavi "Kino Šiška koncert" je nov komentar.', time: 'pravkar', read: false },
  { id: '1', type: 'like', title: 'Novi všečki', description: 'Tvojo objavo "Potep po dolini Soče" so všečkali 3 uporabniki.', time: 'pred 10 min', read: false },
  { id: '2', type: 'event', title: 'Opomnik: Kino Šiška', description: 'Dogodek "Koncert Joker Out" se začne jutri ob 20:00.', time: 'pred 2 urama', read: false },
  { id: '3', type: 'message', title: 'Novo sporočilo', description: 'Maja Zupan: Hej, a še prodajaš kolo?', time: 'včeraj', read: true },
  { id: '4', type: 'alert', title: 'Oglas bo potekel', description: 'Vaš oglas "Prodam Audi A4" bo potekel čez 3 dni.', time: 'včeraj', read: true },
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-primary" />;
      case 'event': return <Calendar className="w-4 h-4 text-tertiary-container" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-secondary" />;
      case 'alert': return <Tag className="w-4 h-4 text-error" />;
      case 'bookmark': return <Bookmark className="w-4 h-4 text-primary" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${isOpen ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`} 
        type="button"
      >
        <Bell className="w-[1em] h-[1em] text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-error border-2 border-surface-container-lowest animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container/70 flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-surface-container-low bg-surface-container/30">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">Obvestila</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs font-label-md text-primary hover:text-primary-container transition-colors"
              >
                <Check className="w-[1em] h-[1em] text-sm" />
                Označi vse kot prebrano
              </button>
            )}
          </div>
          
          <div className="flex flex-col max-h-[400px] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-outline text-sm">Ni novih obvestil.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => markAsRead(notif.id)}
                  className={`flex gap-3 p-4 border-b border-surface-container-low last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer ${notif.read ? 'opacity-70' : 'bg-primary/5'}`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`font-label-lg text-sm truncate ${notif.read ? 'text-on-surface-variant' : 'text-on-surface font-bold'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-outline whitespace-nowrap">{notif.time}</span>
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                      {notif.description}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-surface-container-low bg-surface-container-lowest/50">
            <button className="w-full py-2 rounded-xl text-sm font-label-md font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
              Prikaži vsa obvestila
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
