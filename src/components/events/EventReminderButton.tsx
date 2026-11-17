import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellRing,
  BellPlus,
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Trash2,
  X,
} from 'lucide-react';
import { useEventReminders, formatLeadTimeLabel } from '../../contexts/EventReminderContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { EventReminderLeadMinutes } from '../../services/firestoreService';
import {
  buildGoogleCalendarUrl,
  computeRemindAtIso,
  downloadEventIcsFile,
  formatSingleDateSlovenian,
  getTodayYmd,
  normalizeDateToYmd,
} from '../../utils/eventFilterUtils';

export interface EventReminderButtonProps {
  eventId: string;
  eventTitle: string;
  eventDate?: string | null;
  eventTime?: string | null;
  location?: string | null;
  description?: string | null;
  compact?: boolean;
  className?: string;
}

const LEAD_TIME_OPTIONS: { value: EventReminderLeadMinutes; label: string; hint: string }[] = [
  { value: 0, label: 'Ob začetku dogodka', hint: 'Točno ob uri pričetka' },
  { value: 15, label: '15 minut prej', hint: 'Kratek opomnik pred odhodom' },
  { value: 60, label: '1 uro prej', hint: 'Priporočeno za pravočasno pripravo' },
  { value: 1440, label: '1 dan prej', hint: '24 ur pred dogodkom' },
];

export const EventReminderButton: React.FC<EventReminderButtonProps> = ({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  location,
  description,
  compact = false,
  className = '',
}) => {
  const { getReminderForEvent, setEventReminder, removeEventReminder } = useEventReminders();
  const { isPushSupported, pushPermission, enablePushNotifications } = useNotifications();

  const existingReminder = getReminderForEvent(eventId);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<EventReminderLeadMinutes>(
    existingReminder?.leadMinutes ?? 60
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const normalizedDateYmd = useMemo(
    () => normalizeDateToYmd(eventDate) || getTodayYmd(),
    [eventDate]
  );

  useEffect(() => {
    if (existingReminder) {
      setSelectedLead(existingReminder.leadMinutes);
    }
  }, [existingReminder]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const previewRemindAtFormatted = useMemo(() => {
    const iso = computeRemindAtIso(normalizedDateYmd, eventTime, selectedLead);
    try {
      return new Date(iso).toLocaleString('sl-SI', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return formatSingleDateSlovenian(normalizedDateYmd, true);
    }
  }, [normalizedDateYmd, eventTime, selectedLead]);

  const googleCalendarUrl = useMemo(
    () =>
      buildGoogleCalendarUrl({
        title: eventTitle,
        dateYmd: normalizedDateYmd,
        eventTime: eventTime || undefined,
        location: location || undefined,
        description: description || undefined,
      }),
    [eventTitle, normalizedDateYmd, eventTime, location, description]
  );

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setJustSaved(false);
    setIsOpen(true);
  };

  const handleSaveReminder = async () => {
    setIsSaving(true);
    try {
      await setEventReminder({
        eventId,
        eventTitle,
        eventDate: normalizedDateYmd,
        eventTime: eventTime || undefined,
        location: location || undefined,
        leadMinutes: selectedLead,
      });
      setJustSaved(true);
      setTimeout(() => {
        setIsOpen(false);
        setJustSaved(false);
      }, 650);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveReminder = async () => {
    setIsSaving(true);
    try {
      await removeEventReminder(eventId);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadIcs = () => {
    downloadEventIcsFile({
      id: eventId,
      title: eventTitle,
      dateYmd: normalizedDateYmd,
      eventTime: eventTime || undefined,
      location: location || undefined,
      description: description || undefined,
      leadMinutes: selectedLead,
    });
  };

  const isReminderActive = Boolean(existingReminder);

  return (
    <>
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label={
          isReminderActive
            ? `Uredi opomnik za dogodek ${eventTitle}`
            : `Dodaj opomnik za dogodek ${eventTitle}`
        }
        title={
          isReminderActive
            ? `Opomnik nastavljen (${formatLeadTimeLabel(existingReminder!.leadMinutes)}) – klikni za urejanje`
            : 'Dodaj opomnik za ta dogodek'
        }
        className={
          className ||
          (compact
            ? `inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 border ${
                isReminderActive
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-surface-container'
              }`
            : `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
                isReminderActive
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/25 shadow-2xs'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container'
              }`)
        }
      >
        {isReminderActive ? (
          <>
            <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{compact ? 'Opomnik ✓' : `Opomnik (${formatLeadTimeLabel(existingReminder!.leadMinutes)})`}</span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5 text-tertiary-container shrink-0" />
            <span>Opomnik</span>
          </>
        )}
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reminder-modal-title-${eventId}`}
          >
            <div
              className="bg-surface-container-lowest border border-surface-container rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-surface-container-low/70 border-b border-surface-container flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-tertiary-container/15 text-tertiary-container flex items-center justify-center shrink-0 mt-0.5">
                    {isReminderActive ? (
                      <BellRing className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <BellPlus className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3
                      id={`reminder-modal-title-${eventId}`}
                      className="font-headline-sm text-sm font-bold text-on-surface"
                    >
                      {isReminderActive ? 'Uredi opomnik za dogodek' : 'Nastavi opomnik za dogodek'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium line-clamp-2 mt-0.5">
                      {eventTitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
                  aria-label="Zapri okno opomnika"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Event Date / Location Summary */}
              <div className="px-5 py-3 bg-surface-container-low/30 border-b border-surface-container/60 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{formatSingleDateSlovenian(normalizedDateYmd, true)}</span>
                </span>
                {eventTime && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-on-surface tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{eventTime}</span>
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1 text-outline truncate max-w-[220px]">
                    <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                )}
              </div>

              {/* Lead Time Selector */}
              <div className="p-5 flex flex-col gap-3">
                <div className="text-xs font-bold text-outline uppercase tracking-wider">
                  Kdaj vas naj opomnimo?
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LEAD_TIME_OPTIONS.map((opt) => {
                    const isSelected = selectedLead === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedLead(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-on-surface ring-1 ring-primary/40 shadow-2xs'
                            : 'bg-surface-container-low/60 hover:bg-surface-container border-surface-container text-on-surface-variant'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-on-surface">{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <span className="text-[11px] text-outline leading-snug">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scheduled Preview */}
                <div className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container/70 text-[11px] text-on-surface-variant flex items-center justify-between gap-2">
                  <span className="text-outline font-medium">Predvideno obvestilo:</span>
                  <span className="font-bold text-on-surface tabular-nums">{previewRemindAtFormatted}</span>
                </div>

                {/* Optional Browser Push Permission CTA */}
                {isPushSupported && pushPermission !== 'granted' && (
                  <div className="px-3 py-2.5 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-on-surface-variant leading-snug">
                      Vklopite obvestila brskalnika za opozorilo na namizju ali telefonu.
                    </span>
                    <button
                      type="button"
                      onClick={() => void enablePushNotifications()}
                      className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-[11px] font-bold whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                    >
                      Vklopi
                    </button>
                  </div>
                )}

                {/* External Calendar Sync */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Prenesi .ics</span>
                  </button>
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-secondary" />
                    <span>Google Koledar</span>
                    <ExternalLink className="w-3 h-3 text-outline" />
                  </a>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3.5 bg-surface-container-low/60 border-t border-surface-container flex items-center justify-between gap-2">
                {isReminderActive ? (
                  <button
                    type="button"
                    onClick={handleRemoveReminder}
                    disabled={isSaving}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-error hover:bg-error/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Odstrani opomnik</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Prekliči
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveReminder}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60 ${
                    justSaved
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-tertiary-container hover:bg-tertiary-container/90 text-on-tertiary-container'
                  }`}
                >
                  {justSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Opomnik shranjen!</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-3.5 h-3.5" />
                      <span>{isReminderActive ? 'Posodobi opomnik' : 'Nastavi opomnik'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
