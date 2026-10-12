import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, KeyRound, Check, AlertCircle, Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  email?: string;
  onSuccess?: () => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  token,
  email = '',
  onSuccess,
}: ResetPasswordModalProps) {
  const { resetPasswordWithToken } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Novo geslo mora imeti vsaj 6 znakov.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Gesli se ne ujemata. Prosimo, preverite vnos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPasswordWithToken(token, newPassword, email);
      if (!res.success) {
        setErrorMsg(res.error || 'Ponastavitev gesla ni uspela. Povezava je morda neveljavna ali potekla.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Geslo je bilo uspešno spremenjeno! Zdaj se lahko prijavite z novim geslom.');
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Prišlo je do nepričakovane napake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container/70 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-container-low bg-surface-container-lowest">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">
                Ponastavitev gesla
              </h2>
              {email && (
                <p className="text-xs text-on-surface-variant font-medium truncate max-w-[220px]">
                  {email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
            title="Zapri"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg ? (
            <div className="py-4 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-on-surface">
                Geslo uspešno posodobljeno!
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {successMsg}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Vnesite svoje novo geslo. Za varnost računa priporočamo vsaj 6 znakov (kombinacija črk in številk).
              </p>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-xs font-semibold text-on-surface">
                  Novo geslo
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Vnesite novo geslo (vsaj 6 znakov)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-xs font-semibold text-on-surface">
                  Ponovite novo geslo
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ponovno vnesite novo geslo"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:bg-surface-container-lowest outline-none text-sm text-on-surface transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Shranjevanje novega gesla...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Potrdi in shrani novo geslo</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
