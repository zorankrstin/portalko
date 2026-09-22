import React from 'react';
import { Sparkles, Megaphone } from 'lucide-react';
import { PromotionBadgeType } from '../../types';

interface PromotedBadgeProps {
  type?: PromotionBadgeType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PromotedBadge: React.FC<PromotedBadgeProps> = ({
  type = 'PROMO',
  className = '',
  size = 'md',
  showIcon = true,
}) => {
  const isPromo = type === 'PROMO';

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[10px] px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  // High contrast, premium styling with clear script "PROMO" or "OGLAS"
  const colorClasses = isPromo
    ? 'bg-amber-500 text-amber-950 font-black shadow-xs ring-1 ring-amber-400/80 dark:bg-amber-400 dark:text-amber-950'
    : 'bg-primary text-on-primary font-black shadow-xs ring-1 ring-primary/80';

  return (
    <span
      className={`inline-flex items-center rounded-md uppercase tracking-wider font-extrabold select-none ${sizeClasses} ${colorClasses} ${className}`}
      title={isPromo ? 'Izpostavljena promocija (PROMO)' : 'Plačani oglas (OGLAS)'}
    >
      {showIcon && (
        isPromo ? (
          <Sparkles className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        ) : (
          <Megaphone className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        )
      )}
      <span>{type}</span>
    </span>
  );
};
