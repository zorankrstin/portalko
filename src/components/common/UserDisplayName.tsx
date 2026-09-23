import React from 'react';
import { CheckCircle } from 'lucide-react';

interface UserDisplayNameProps {
  name: string;
  role?: string;
  className?: string;
}

export const UserDisplayName: React.FC<UserDisplayNameProps> = ({ name, role, className = '' }) => {
  const isVerified = role === 'verified';
  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {name}
      {isVerified && (
        <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white" />
      )}
    </span>
  );
};
