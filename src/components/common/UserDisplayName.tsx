import React from 'react';
import { VerifiedBadge } from './VerifiedBadge';
import { isUserVerified } from '../../utils/userVerificationUtils';

export interface UserDisplayNameProps {
  name: string;
  role?: string;
  userId?: string;
  users?: any[];
  isVerified?: boolean;
  className?: string;
  nameClassName?: string;
  badgeSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const UserDisplayName: React.FC<UserDisplayNameProps> = ({ 
  name, 
  role, 
  userId,
  users,
  isVerified: explicitIsVerified,
  className = '',
  nameClassName = '',
  badgeSize = 'xs',
  showBadge = true
}) => {
  const verified = explicitIsVerified !== undefined 
    ? explicitIsVerified 
    : isUserVerified({ role, userId, name, users });

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <span className={nameClassName}>{name}</span>
      {showBadge && verified && (
        <VerifiedBadge size={badgeSize} />
      )}
    </span>
  );
};
