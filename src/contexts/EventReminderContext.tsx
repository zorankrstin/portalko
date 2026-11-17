import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import {
  EventReminderLeadMinutes,
  EventReminderRecord,
  subscribeToUserEventReminders,
  upsertEventReminderInFirestore,
  deleteEventReminderFromFirestore,
  markEventReminderTriggeredInFirestore,
  getCachedEventReminders,
  saveCachedEventReminders,
  sanitizeReminderDocId,
} from '../services/firestoreService';
import {
  computeRemindAtIso,
  formatSingleDateSlovenian,
  getTodayYmd,
  normalizeDateToYmd,
} from '../utils/eventFilterUtils';

export interface SetEventReminderInput {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  leadMinutes: EventReminderLeadMinutes;
}

interface EventReminderContextType {
  reminders: EventReminderRecord[];
  remindersByEventId: Record<string, EventReminderRecord>;
  remindersByDate: Record<string, EventReminderRecord[]>;
  activeRemindersCount: number;
  getReminderForEvent: (eventId: string) => EventReminderRecord | undefined;
  hasReminder: (eventId: string) => boolean;
  setEventReminder: (input: SetEventReminderInput) => Promise<EventReminderRecord>;
  removeEventReminder: (eventId: string) => Promise<void>;
}

const EventReminderContext = createContext<EventReminderContextType | undefined>(undefined);

export function formatLeadTimeLabel(leadMinutes: EventReminderLeadMinutes): string {
  switch (leadMinutes) {
    case 0:
      return 'Ob začetku';
    case 15:
      return '15 min prej';
    case 60:
      return '1 uro prej';
    case 1440:
      return '1 dan prej';
    default:
      return '1 uro prej';
  }
}

export const EventReminderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addNotification } = useNotifications();
  const storageIdentity = currentUser?.id ? sanitizeReminderDocId(currentUser.id) : 'guest';

  const [reminders, setReminders] = useState<EventReminderRecord[]>(() =>
    getCachedEventReminders(storageIdentity)
  );

  // Track already-dispatched IDs in-session to prevent duplicate firing on rapid re-renders
  const dispatchedIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to Firestore for logged-in users, or load localStorage for guests
  useEffect(() => {
    if (!currentUser?.id) {
      setReminders(getCachedEventReminders('guest'));
      return;
    }

    const unsubscribe = subscribeToUserEventReminders(currentUser.id, (list) => {
      setReminders(list);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Keep localStorage synced on changes
  useEffect(() => {
    saveCachedEventReminders(storageIdentity, reminders);
  }, [storageIdentity, reminders]);

  // Live scheduler: checks untriggered reminders every 20 seconds and fires NotificationContext alerts
  useEffect(() => {
    const checkDueReminders = () => {
      const nowMs = Date.now();
      const maxStaleWindowMs = 24 * 60 * 60 * 1000;

      for (const rem of reminders) {
        if (rem.triggered || dispatchedIdsRef.current.has(rem.id)) continue;

        const remindAtMs = new Date(rem.remindAt).getTime();
        if (isNaN(remindAtMs)) continue;

        if (nowMs >= remindAtMs && nowMs - remindAtMs <= maxStaleWindowMs) {
          dispatchedIdsRef.current.add(rem.id);

          const dateLabel = formatSingleDateSlovenian(rem.eventDate);
          const timePart = rem.eventTime ? ` ob ${rem.eventTime}` : '';
          const locPart = rem.location ? ` • ${rem.location}` : '';

          addNotification({
            type: 'event',
            title: `Opomnik za dogodek: ${rem.eventTitle}`,
            description: `${dateLabel}${timePart}${locPart} (${formatLeadTimeLabel(rem.leadMinutes)})`,
            target: {
              type: 'event',
              id: rem.eventId,
            },
          });

          // Mark as triggered locally and in Firestore
          setReminders((prev) =>
            prev.map((item) =>
              item.id === rem.id
                ? { ...item, triggered: true, updatedAt: new Date().toISOString() }
                : item
            )
          );

          if (currentUser?.id) {
            markEventReminderTriggeredInFirestore(currentUser.id, rem.eventId, rem).catch(() => {});
          }
        }
      }
    };

    checkDueReminders();
    const intervalId = window.setInterval(checkDueReminders, 20_000);
    return () => window.clearInterval(intervalId);
  }, [reminders, currentUser?.id, addNotification]);

  const setEventReminder = useCallback(
    async (input: SetEventReminderInput): Promise<EventReminderRecord> => {
      const safeEventId = sanitizeReminderDocId(input.eventId);
      const normalizedDate = normalizeDateToYmd(input.eventDate) || getTodayYmd();
      const remindAtIso = computeRemindAtIso(normalizedDate, input.eventTime, input.leadMinutes);
      const nowIso = new Date().toISOString();

      // Allow re-triggering if user reschedules reminder
      dispatchedIdsRef.current.delete(safeEventId);

      const optimisticRecord: EventReminderRecord = {
        id: safeEventId,
        userId: storageIdentity,
        eventId: safeEventId,
        eventTitle: (input.eventTitle || 'Dogodek').trim().slice(0, 200),
        eventDate: normalizedDate,
        ...(input.eventTime && input.eventTime.trim() ? { eventTime: input.eventTime.trim().slice(0, 64) } : {}),
        ...(input.location && input.location.trim() ? { location: input.location.trim().slice(0, 200) } : {}),
        leadMinutes: input.leadMinutes,
        remindAt: remindAtIso,
        triggered: false,
        createdAt:
          reminders.find((r) => r.eventId === safeEventId || r.id === safeEventId)?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      setReminders((prev) => {
        const filtered = prev.filter((r) => r.eventId !== safeEventId && r.id !== safeEventId);
        return [optimisticRecord, ...filtered];
      });

      if (currentUser?.id) {
        const saved = await upsertEventReminderInFirestore({
          userId: currentUser.id,
          eventId: safeEventId,
          eventTitle: optimisticRecord.eventTitle,
          eventDate: optimisticRecord.eventDate,
          eventTime: optimisticRecord.eventTime,
          location: optimisticRecord.location,
          leadMinutes: optimisticRecord.leadMinutes,
          remindAt: optimisticRecord.remindAt,
          triggered: false,
        });
        return saved;
      }

      return optimisticRecord;
    },
    [currentUser?.id, storageIdentity, reminders]
  );

  const removeEventReminder = useCallback(
    async (eventId: string): Promise<void> => {
      const safeEventId = sanitizeReminderDocId(eventId);
      dispatchedIdsRef.current.delete(safeEventId);

      setReminders((prev) =>
        prev.filter((r) => r.eventId !== safeEventId && r.id !== safeEventId && r.eventId !== eventId)
      );

      if (currentUser?.id) {
        await deleteEventReminderFromFirestore(currentUser.id, safeEventId);
      }
    },
    [currentUser?.id]
  );

  const remindersByEventId = useMemo(() => {
    const map: Record<string, EventReminderRecord> = {};
    for (const rem of reminders) {
      map[rem.eventId] = rem;
      map[rem.id] = rem;
    }
    return map;
  }, [reminders]);

  const remindersByDate = useMemo(() => {
    const map: Record<string, EventReminderRecord[]> = {};
    for (const rem of reminders) {
      if (!rem.eventDate) continue;
      if (!map[rem.eventDate]) {
        map[rem.eventDate] = [];
      }
      map[rem.eventDate].push(rem);
    }
    return map;
  }, [reminders]);

  const getReminderForEvent = useCallback(
    (eventId: string) => {
      const safeId = sanitizeReminderDocId(eventId);
      return remindersByEventId[eventId] || remindersByEventId[safeId];
    },
    [remindersByEventId]
  );

  const hasReminder = useCallback(
    (eventId: string) => Boolean(getReminderForEvent(eventId)),
    [getReminderForEvent]
  );

  const activeRemindersCount = reminders.length;

  return (
    <EventReminderContext.Provider
      value={{
        reminders,
        remindersByEventId,
        remindersByDate,
        activeRemindersCount,
        getReminderForEvent,
        hasReminder,
        setEventReminder,
        removeEventReminder,
      }}
    >
      {children}
    </EventReminderContext.Provider>
  );
};

export function useEventReminders() {
  const ctx = useContext(EventReminderContext);
  if (!ctx) {
    throw new Error('useEventReminders must be used within an EventReminderProvider');
  }
  return ctx;
}
