import React from 'react';
import { Flag } from 'lucide-react';
import { useReportModal } from '../contexts/ReportContext';
import { ReportTargetType } from '../types';

export interface ReportButtonProps {
  targetId: string;
  targetType: ReportTargetType;
  targetTitle: string;
  targetAuthor?: string;
  targetUrl?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ReportButton({
  targetId,
  targetType,
  targetTitle,
  targetAuthor,
  targetUrl,
  className = '',
  showLabel = false,
  size = 'md',
}: ReportButtonProps) {
  const { openReportModal } = useReportModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openReportModal({
      targetId,
      targetType,
      targetTitle,
      targetAuthor,
      targetUrl,
    });
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const defaultClass = `p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-container transition-colors flex items-center gap-1.5 cursor-pointer`;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className || defaultClass}
      title="Prijavi neprimerno vsebino"
      aria-label="Prijavi vsebino"
    >
      <Flag className={iconSize} />
      {showLabel && (
        <span className="text-xs font-semibold text-outline hover:text-error transition-colors">
          Prijavi
        </span>
      )}
    </button>
  );
}
