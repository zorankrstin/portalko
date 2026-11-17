import React, { useEffect, useRef, useState } from 'react';
import { useShares, ShareTargetType } from '../../contexts/ShareContext';

export interface ShareCounterProps {
  id?: string;
  type?: ShareTargetType | string;
  url?: string;
  initialSharesCount?: number;
  variant?: 'compact' | 'inline' | 'pill';
  showLabel?: boolean;
  className?: string;
}

function formatSlovenianSharesLabel(count: number): string {
  const mod100 = Math.abs(count) % 100;
  if (mod100 === 1) return 'delitev';
  if (mod100 === 2) return 'delitvi';
  if (mod100 === 3 || mod100 === 4) return 'delitve';
  return 'delitev';
}

export function ShareCounter({
  id,
  type,
  url,
  initialSharesCount = 0,
  variant = 'inline',
  showLabel = false,
  className = '',
}: ShareCounterProps) {
  const { getSharesCount } = useShares();
  const hasShareTarget = Boolean(id || (type === 'news' && url));
  const sharesCount = hasShareTarget ? getSharesCount(id, type, url, initialSharesCount) : 0;

  const [isPopping, setIsPopping] = useState(false);
  const [deltaInfo, setDeltaInfo] = useState<{ amount: number; key: number } | null>(null);

  const prevCountRef = useRef<number>(sharesCount);
  const hasMountedRef = useRef(false);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deltaKeyRef = useRef(0);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevCountRef.current = sharesCount;
      return;
    }

    if (sharesCount > prevCountRef.current) {
      const diff = sharesCount - prevCountRef.current;

      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);

      setIsPopping(false);
      deltaKeyRef.current += 1;
      const nextKey = deltaKeyRef.current;

      requestAnimationFrame(() => {
        setIsPopping(true);
        setDeltaInfo({ amount: diff, key: nextKey });

        popTimerRef.current = setTimeout(() => {
          setIsPopping(false);
        }, 520);

        deltaTimerRef.current = setTimeout(() => {
          setDeltaInfo((current) => (current?.key === nextKey ? null : current));
        }, 740);
      });
    }

    prevCountRef.current = sharesCount;
  }, [sharesCount]);

  useEffect(() => {
    return () => {
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    };
  }, []);

  if (!hasShareTarget) {
    return null;
  }

  const labelText = formatSlovenianSharesLabel(sharesCount);
  const fullAriaLabel = `${sharesCount} ${labelText}`;

  const variantClasses = (() => {
    if (variant === 'pill') {
      return isPopping
        ? 'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-primary/40 bg-primary/12 text-primary shadow-xs'
        : sharesCount > 0
        ? 'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary shadow-2xs'
        : 'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-surface-container/60 bg-surface-container-low text-on-surface-variant shadow-2xs';
    }
    if (variant === 'compact') {
      return isPopping
        ? 'px-1.5 py-0.5 rounded-md border border-primary/40 bg-primary/15 text-primary'
        : sharesCount > 0
        ? 'px-1.5 py-0.5 rounded-md border border-primary/20 bg-primary/8 text-primary'
        : 'px-1.5 py-0.5 rounded-md border border-surface-container/40 bg-surface-container-low/70 text-outline';
    }
    // 'inline'
    return isPopping
      ? 'px-1.5 py-0.5 rounded-md border border-primary/35 bg-primary/12 text-primary'
      : sharesCount > 0
      ? 'px-1.5 py-0.5 rounded-md border border-primary/15 bg-primary/6 text-primary'
      : 'px-1.5 py-0.5 rounded-md border border-surface-container/40 bg-surface-container-low/60 text-outline';
  })();

  return (
    <span
      className={`relative inline-flex items-center gap-1 select-none shrink-0 transition-colors duration-200 ${variantClasses} ${className}`}
      aria-live="polite"
      aria-label={fullAriaLabel}
      title={`${fullAriaLabel} (posodobljeno v realnem času)`}
    >
      <span
        key={isPopping ? `pop-${sharesCount}` : 'steady'}
        className={`inline-block font-label-md tabular-nums leading-none ${
          variant === 'pill' ? 'text-xs sm:text-sm font-extrabold' : 'text-xs font-bold'
        } ${isPopping ? 'animate-share-count-pop' : ''}`}
      >
        {sharesCount}
      </span>
      {showLabel && (
        <span
          className={`leading-none ${
            variant === 'pill' ? 'text-xs font-semibold' : 'text-[11px] font-medium'
          } ${isPopping ? 'text-primary' : sharesCount > 0 ? 'text-primary/85' : 'text-outline'}`}
        >
          {labelText}
        </span>
      )}
      {deltaInfo && (
        <span
          key={deltaInfo.key}
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 right-0 px-1 py-0.5 rounded bg-primary text-on-primary text-[10px] font-extrabold leading-none tabular-nums shadow-xs animate-share-delta-rise"
        >
          +{deltaInfo.amount}
        </span>
      )}
    </span>
  );
}
