import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Heart, Calendar, MessageSquare, Tag, Check, Bookmark, 
  Sparkles, CheckCheck, Trash2, ChevronRight, Info, ShieldCheck, X 
} from 'lucide-react';
import { useNotifications, NotificationType } from '../contexts/NotificationContext';
import { PostDetailTarget, ViewMode } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

interface NotificationCenterProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
  onViewChange?: (view: ViewMode) => void;
}

export function NotificationCenter({ onNavigatePost, onViewChange }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'comment' | 'post' | 'system'>('all');
  const [isRinging, setIsRinging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { 
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
  } = useNotifications();
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  const prevCountRef = useRef(unreadCount);
  const prevLatestTimestampRef = useRef<number>(notifications[0]?.timestamp || 0);

  // Detect when a new real-time notification arrives and trigger the bell shake & pulse animation
  useEffect(() => {
    const currentLatest = notifications[0]?.timestamp || 0;
    const isNewNotification = 
      (unreadCount > prevCountRef.current && prevCountRef.current !== undefined) ||
      (currentLatest > prevLatestTimestampRef.current && prevLatestTimestampRef.current !== 0);

    if (isNewNotification) {
      setIsRinging(true);
      const timer = setTimeout(() => {
        setIsRinging(false);
      }, 1800);
      return () => clearTimeout(timer);
    }

    prevCountRef.current = unreadCount;
    prevLatestTimestampRef.current = currentLatest;
  }, [unreadCount, notifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTogglePush = async () => {
    setIsEnablingPush(true);
    try {
      await enablePushNotifications();
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTriggerTest = () => {
    setIsRinging(true);
    setTimeout(() => setIsRinging(false), 1800);
    addNotification({
      type: 'reply',
      title: '💬 Odgovor na vaš komentar',
      description: 'Uporabnik Maja K. je pravkar odgovoril na vaš komentar pri objavi.',
      target: {
        type: 'post',
        id: 'test-reply-target',
      },
      authorName: 'Maja K.',
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'comment') return n.type === 'comment' || n.type === 'reply';
    if (activeFilter === 'post') return ['deal', 'event', 'ad', 'like', 'interaction'].includes(n.type);
    if (activeFilter === 'system') return n.type === 'system';
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-secondary" />;
      case 'deal':
        return <Tag className="w-4 h-4 text-primary" />;
      case 'event':
        return <Calendar className="w-4 h-4 text-sky-500" />;
      case 'ad':
        return <Bookmark className="w-4 h-4 text-emerald-500" />;
      case 'like':
      case 'interaction':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'system':
      default:
        return <ShieldCheck className="w-4 h-4 text-purple-500" />;
    }
  };

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markAsRead(notif.id);
    if (notif.target && onNavigatePost) {
      setIsOpen(false);
      onNavigatePost(notif.target);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button 
        id="header-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.92 }}
        className={`relative p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer select-none ${
          isOpen 
            ? 'bg-primary/10 text-primary ring-2 ring-primary/20' 
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
        }`} 
        type="button"
        title="Obvestila v realnem času (odgovori na objave in komentarje)"
        aria-label="Center obvestil"
        aria-expanded={isOpen}
      >
        {/* Subtle radial expanding wave/pulse on new notification */}
        <AnimatePresence>
          {isRinging && (
            <motion.span
              key="bell-pulse-wave"
              initial={{ scale: 0.8, opacity: 0.85 }}
              animate={{ scale: [0.8, 1.7, 2.2], opacity: [0.85, 0.35, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut", repeat: 1 }}
              className="absolute inset-0 rounded-xl bg-primary/30 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Framer motion animated bell icon: shakes & pulses on new real-time alert */}
        <motion.div
          animate={
            isRinging
              ? {
                  rotate: [0, -20, 20, -15, 15, -9, 9, -4, 4, 0],
                  scale: [1, 1.25, 1.25, 1.16, 1.16, 1.08, 1.08, 1, 1, 1],
                  color: ['#6366f1', '#4f46e5', '#7c3aed', '#4f46e5'],
                }
              : unreadCount > 0
              ? {
                  rotate: [0, -4, 4, -2, 2, 0],
                  scale: [1, 1.06, 1],
                }
              : { rotate: 0, scale: 1 }
          }
          transition={
            isRinging
              ? {
                  duration: 1.2,
                  ease: "easeInOut",
                }
              : unreadCount > 0
              ? {
                  duration: 2.8,
                  repeat: Infinity,
                  repeatDelay: 3.5,
                  ease: "easeInOut",
                }
              : { duration: 0.2 }
          }
          style={{ transformOrigin: 'top center' }}
          className="flex items-center justify-center"
        >
          <Bell className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors ${unreadCount > 0 ? 'text-primary' : ''}`} />
        </motion.div>

        {/* Animated unread count badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="unread-count-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex items-center justify-center min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] px-1 rounded-full bg-error text-white text-[9px] sm:text-[10px] font-black border-2 border-surface-container-lowest shadow-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[calc(100vw-1rem)] max-w-[340px] sm:w-[410px] bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container/80 flex flex-col z-50 overflow-hidden"
          >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-surface-container-low bg-surface-container/30">
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">Center obvestil</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {unreadCount} novo
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleTriggerTest}
                className="flex items-center gap-1 text-[11px] font-semibold text-outline hover:text-primary transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-surface-container"
                title="Sproži preizkusno obvestilo o odgovoru v realnem času"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="hidden xs:inline">Preizkusi</span>
              </button>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-container transition-colors cursor-pointer"
                  title="Označi vsa obvestila kot prebrana"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prebrano</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1 rounded text-outline hover:text-error transition-colors cursor-pointer"
                  title="Počisti vsa obvestila"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* FCM Push Notifications Banner */}
          {isPushSupported && (
            <div className="px-3.5 py-2 border-b border-surface-container-low bg-surface-container-low/60 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${pushPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="truncate text-on-surface-variant font-medium">
                  {pushPermission === 'granted'
                    ? 'Potisna obvestila v brskalniku so aktivna'
                    : 'Omogočite takojšnja obvestila v brskalniku'}
                </span>
              </div>
              {pushPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={isEnablingPush}
                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold shadow-2xs shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                  title="Vklopi potisna obvestila brskalnika ob novih komentarjih in všečkih"
                >
                  {isEnablingPush ? 'Vklapljanje...' : 'Vklopi'}
                </button>
              )}
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center flex-wrap gap-1.5 px-3 py-2 border-b border-surface-container-low bg-surface-container-low/40 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'all' 
                  ? 'bg-on-surface text-surface-container-lowest shadow-2xs' 
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-outline"></div>
              Vse ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('comment')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'comment' 
                  ? 'bg-secondary text-on-secondary shadow-2xs' 
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
              Komentarji in odgovori ({notifications.filter(n => n.type === 'comment' || n.type === 'reply').length})
            </button>
            <button
              onClick={() => setActiveFilter('post')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'post' 
                  ? 'bg-primary text-on-primary shadow-2xs' 
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              Ugodnosti & Oglasi ({notifications.filter(n => ['deal', 'event', 'ad', 'like', 'interaction'].includes(n.type)).length})
            </button>
            <button
              onClick={() => setActiveFilter('system')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'system' 
                  ? 'bg-tertiary text-on-tertiary shadow-2xs' 
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-tertiary"></div>
              Sistem
            </button>
          </div>
          
          {/* Notifications List */}
          <div className="flex flex-col max-h-[380px] overflow-y-auto divide-y divide-surface-container-low">
            {filteredNotifications.length === 0 ? (
              <div className="p-10 text-center text-outline text-sm flex flex-col items-center gap-3">
                <Bell className="w-10 h-10 opacity-20" />
                <div className="space-y-1">
                  <p className="font-semibold text-on-surface-variant">Ni novih obvestil</p>
                  <p className="text-xs">Trenutno ni nobene aktivnosti v tej kategoriji.</p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notif, idx) => (
                <div 
                  key={`notif-${notif.id}-${idx}`} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex gap-3 p-3 sm:p-3.5 hover:bg-surface-container-low transition-colors cursor-pointer group relative ${
                    notif.read ? 'opacity-75 bg-transparent' : 'bg-primary/5'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-xs truncate ${notif.read ? 'text-on-surface-variant font-medium' : 'text-on-surface font-bold'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-outline whitespace-nowrap">{formatRelativeTime(notif.timestamp)}</span>
                    </div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>
                    {notif.target && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold mt-1 group-hover:underline">
                        <span>Poglej objavo</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error transition-opacity absolute right-2 top-2"
                    title="Odstrani obvestilo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="p-2.5 border-t border-surface-container-low bg-surface-container-lowest flex items-center justify-between text-xs text-outline">
            <span>Obvestila v realnem času</span>
            <button 
              onClick={() => {
                setIsOpen(false);
                onViewChange?.('main');
              }}
              className="text-primary font-bold hover:underline cursor-pointer"
            >
              Vse objave
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
