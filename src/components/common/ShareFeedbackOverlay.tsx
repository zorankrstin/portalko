import React, { useState } from 'react';
import { Check, CheckCircle2, Copy, PartyPopper, X } from 'lucide-react';

export interface ShareFeedbackPayload {
  id: number;
  title: string;
  subtitle?: string;
  url?: string;
  imageUrl?: string;
  domain?: string;
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
  const [copiedFromToast, setCopiedFromToast] = useState(false);

  if (!feedback) return null;

  const handleCopyToastUrl = async () => {
    if (!feedback.url) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(feedback.url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = feedback.url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedFromToast(true);
      setTimeout(() => setCopiedFromToast(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

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
          className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 w-0 h-0 overflow-visible"
        >
          {CONFETTI_CLASSES.map((cls, idx) => (
            <span
              key={idx}
              className={`absolute left-0 top-0 block share-confetti-particle ${cls}`}
            />
          ))}
        </div>
      )}

      {/* Editorial Toast Notification with Mini Social Preview & Direct Copy Link */}
      <div className="pointer-events-auto w-full sm:w-[340px] max-w-sm bg-surface-container-lowest/95 backdrop-blur-md text-on-surface border border-surface-container-high rounded-2xl shadow-xl p-3 flex flex-col gap-2.5 animate-share-toast-in">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            {feedback.showConfetti ? (
              <PartyPopper className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-on-surface leading-snug truncate">
              {feedback.title}
            </p>
            {feedback.domain && (
              <p className="text-[11px] text-outline leading-tight truncate">
                Predogled za družbena omrežja · {feedback.domain}
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

        {(feedback.subtitle || feedback.imageUrl) && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low/80 border border-surface-container">
            {feedback.imageUrl && (
              <img
                src={feedback.imageUrl}
                alt=""
                className="w-11 h-11 rounded-lg object-cover shrink-0 bg-surface-container"
              />
            )}
            <div className="min-w-0 flex-1">
              {feedback.domain && (
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-outline truncate">
                  {feedback.domain}
                </span>
              )}
              <p className="text-xs font-semibold text-on-surface line-clamp-2 leading-snug">
                {feedback.subtitle}
              </p>
            </div>
          </div>
        )}

        {feedback.url && (
          <button
            type="button"
            onClick={handleCopyToastUrl}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              copiedFromToast
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
            }`}
          >
            {copiedFromToast ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Povezava kopirana</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-primary" />
                <span>Kopiraj povezavo</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
