import React from 'react';
import { CheckCircle2, PartyPopper, X } from 'lucide-react';

export interface ShareFeedbackPayload {
  id: number;
  title: string;
  subtitle?: string;
  showConfetti: boolean;
}

interface ShareFeedbackOverlayProps {
  feedback: ShareFeedbackPayload | null;
  onDismiss: () => void;
}

const CONFETTI_CLASSES = [
  'share-confetti-0 w-2 h-2 rounded-full bg-primary',
  'share-confetti-1 w-2.5 h-1.5 rounded-xs bg-secondary',
  'share-confetti-2 w-2 h-2 rounded-xs bg-amber-400',
  'share-confetti-3 w-1.5 h-2.5 rounded-full bg-tertiary',
  'share-confetti-4 w-2 h-2 rounded-xs bg-sky-500',
  'share-confetti-5 w-2.5 h-1.5 rounded-full bg-emerald-500',
  'share-confetti-6 w-2 h-2 rounded-xs bg-primary',
  'share-confetti-7 w-1.5 h-2.5 rounded-xs bg-amber-500',
  'share-confetti-8 w-2 h-2 rounded-full bg-secondary',
  'share-confetti-9 w-2.5 h-1.5 rounded-xs bg-sky-400',
  'share-confetti-10 w-2 h-2 rounded-xs bg-tertiary',
  'share-confetti-11 w-2 h-2 rounded-full bg-amber-400',
  'share-confetti-12 w-1.5 h-2.5 rounded-xs bg-emerald-500',
  'share-confetti-13 w-2 h-2 rounded-xs bg-primary',
  'share-confetti-14 w-2.5 h-1.5 rounded-full bg-secondary',
  'share-confetti-15 w-2 h-2 rounded-xs bg-amber-500',
];

export function ShareFeedbackOverlay({ feedback, onDismiss }: ShareFeedbackOverlayProps) {
  if (!feedback) return null;

  return (
    <div
      key={feedback.id}
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[80] pointer-events-none flex items-end justify-end max-w-[calc(100vw-2rem)]"
      role="status"
      aria-live="polite"
    >
      {/* Celebratory Confetti Burst anchored cleanly above toast */}
      {feedback.showConfetti && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 w-0 h-0 overflow-visible"
        >
          {CONFETTI_CLASSES.map((cls, idx) => (
            <span
              key={idx}
              className={`absolute left-0 top-0 block share-confetti-particle ${cls}`}
            />
          ))}
        </div>
      )}

      {/* Compact Editorial Toast Notification */}
      <div className="pointer-events-auto w-full sm:w-auto min-w-[260px] max-w-sm bg-surface-container-lowest/95 backdrop-blur-md text-on-surface border border-primary/25 rounded-2xl shadow-xl px-3.5 py-3 flex items-center gap-3 animate-share-toast-in">
        <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
          {feedback.showConfetti ? (
            <PartyPopper className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-on-surface leading-snug truncate">
            {feedback.title}
          </p>
          {feedback.subtitle && (
            <p className="text-[11px] text-on-surface-variant leading-snug truncate mt-0.5">
              {feedback.subtitle}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
          aria-label="Zapri obvestilo"
          title="Zapri obvestilo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
