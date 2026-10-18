import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, AlertCircle, X, Loader2, Info } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  itemTitle?: string;
  itemTypeLabel?: string;
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemTitle,
  itemTypeLabel,
  details,
  confirmLabel = 'Da, trajno izbriši',
  cancelLabel = 'Prekliči',
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div 
        className="bg-surface-container-lowest rounded-2xl max-w-md w-full shadow-2xl border border-surface-container overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-surface-container-low flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDanger 
                ? 'bg-error/10 text-error' 
                : isWarning 
                  ? 'bg-amber-500/10 text-amber-600' 
                  : 'bg-primary/10 text-primary'
            }`}>
              {isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 id="confirmation-modal-title" className="font-bold text-base text-on-surface leading-tight">
                {title}
              </h3>
              {itemTypeLabel && (
                <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant">
                  {itemTypeLabel}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            title="Zapri"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5">
          {itemTitle && (
            <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-outline">Izbrani element:</span>
              <span className="text-xs font-bold text-on-surface truncate max-w-[220px]" title={itemTitle}>
                {itemTitle}
              </span>
            </div>
          )}

          {message && (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {message}
            </p>
          )}

          {details}

          {isDanger && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-error text-xs">
                  To dejanje je nepovratno
                </p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Podatki bodo trajno izbrisani iz baze podatkov in jih ne bo več mogoče obnoviti.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-surface-container bg-surface-container-low/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isDanger
                ? 'bg-error text-on-error hover:bg-error/90 active:scale-98'
                : isWarning
                  ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-98'
                  : 'bg-primary text-on-primary hover:bg-primary/90 active:scale-98'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Brisanje v teku...</span>
              </>
            ) : (
              <>
                {isDanger && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
