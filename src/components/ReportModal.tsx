import React, { useState } from 'react';
import { 
  X, 
  Flag, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  User, 
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  REPORT_REASONS, 
  submitReport 
} from '../services/reportService';
import { ReportModalTarget, ReportReason, ReportTargetType } from '../types';

interface ReportModalProps {
  target: ReportModalTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  ad: 'Mali oglas',
  post: 'Objava / Blog',
  event: 'Dogodek',
  deal: 'Ugodnost',
  comment: 'Komentar',
  news: 'Novica',
};

export function ReportModal({ target, isOpen, onClose, onSuccess }: ReportModalProps) {
  const { currentUser } = useAuth();
  
  const [selectedReason, setSelectedReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !target) {
    return null;
  }

  const handleClose = () => {
    setIsSubmitted(false);
    setDetails('');
    setGuestEmail('');
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const reasonObj = REPORT_REASONS.find(r => r.id === selectedReason);
    const reasonLabel = reasonObj ? reasonObj.label : 'Neznano';

    setIsSubmitting(true);
    try {
      await submitReport({
        targetId: target.targetId,
        targetType: target.targetType,
        targetTitle: target.targetTitle,
        targetAuthor: target.targetAuthor,
        targetUrl: target.targetUrl || window.location.href,
        reason: selectedReason,
        reasonLabel,
        details: details.trim(),
        reporterId: currentUser?.id || null,
        reporterEmail: currentUser?.email || guestEmail.trim() || null,
        reporterName: currentUser?.name || (currentUser ? 'Prijavljen uporabnik' : 'Gost'),
      });

      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Napaka pri oddaji prijave:', err);
      setErrorMessage('Pri oddaji prijave je prišlo do napake. Prosimo, poskusite znova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div 
        className="bg-surface rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 id="report-modal-title" className="font-headline-sm text-base font-bold text-on-surface leading-tight">
                Prijavi neprimerno vsebino
              </h3>
              <p className="text-xs text-outline font-body-sm">
                Pomagajte ohranjati varno in zanesljivo skupnost Portalko
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Zapri"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isSubmitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-headline-sm text-lg font-bold text-on-surface">
                  Prijava je bila uspešno oddana
                </h4>
                <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Hvala za vaš prispevek k varnosti skupnosti. Naša ekipa skrbnikov bo vsebino nemudoma pregledala in po potrebi ukrepala.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Zapri
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target info preview */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-caps text-[11px] font-bold text-primary uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10">
                    {TARGET_TYPE_LABELS[target.targetType] || 'Vsebina'}
                  </span>
                  {target.targetAuthor && (
                    <span className="text-xs text-outline flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {target.targetAuthor}
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-on-surface line-clamp-2">
                  {target.targetTitle}
                </div>
              </div>

              {/* Reasons Selection */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Izberite razlog prijave *
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map(reason => {
                    const isSelected = selectedReason === reason.id;
                    return (
                      <label 
                        key={reason.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected 
                            ? 'bg-primary/5 border-primary shadow-xs' 
                            : 'bg-surface hover:bg-surface-container-low border-outline-variant/30 text-on-surface'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="reportReason" 
                          value={reason.id} 
                          checked={isSelected} 
                          onChange={() => setSelectedReason(reason.id)}
                          className="mt-0.5 w-4 h-4 text-primary focus:ring-primary accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs sm:text-sm font-semibold leading-tight ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                            {reason.label}
                          </div>
                          <div className="text-[11px] sm:text-xs text-outline mt-0.5 leading-normal">
                            {reason.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Details textarea */}
              <div>
                <label htmlFor="report-details" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Dodatne podrobnosti (neobvezno)
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Navedite več podrobnosti o kršitvi, specifičnem delu besedila ali povezavi..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  maxLength={500}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-outline">
                    {details.length}/500 znakov
                  </span>
                </div>
              </div>

              {/* Guest reporter email if not authenticated */}
              {!currentUser && (
                <div>
                  <label htmlFor="guest-email" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Vaš e-poštni naslov (neobvezno)
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    placeholder="vas@email.si (za morebitno obvestilo)"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <p className="text-[11px] text-outline mt-1">
                    Vaš kontakt bo viden izključno skrbnikom portala.
                  </p>
                </div>
              )}

              {/* Error message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs text-error font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-outline hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-error text-white hover:bg-error/90 flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pošiljam...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      <span>Oddaj prijavo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
