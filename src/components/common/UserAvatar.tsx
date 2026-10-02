import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { resolveUserUploadedAvatar, getUserInitials, getAvatarRoleColors, isUserUploadedAvatar } from '../../utils/avatarUtils';
import { Crown, Shield, CheckCircle, User as UserIcon } from 'lucide-react';

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  userId?: string | null;
  role?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  imgClassName?: string;
  alt?: string;
  showRoleBadge?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

const sizeClasses: Record<string, { container: string; text: string; icon: string; badge: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', icon: 'w-3 h-3', badge: 'w-2.5 h-2.5 p-0.5' },
  sm: { container: 'w-8 h-8', text: 'text-xs', icon: 'w-3.5 h-3.5', badge: 'w-3 h-3 p-0.5' },
  md: { container: 'w-10 h-10', text: 'text-sm', icon: 'w-4 h-4', badge: 'w-3.5 h-3.5 p-0.5' },
  lg: { container: 'w-12 h-12', text: 'text-base', icon: 'w-5 h-5', badge: 'w-4 h-4 p-1' },
  xl: { container: 'w-16 h-16', text: 'text-xl', icon: 'w-7 h-7', badge: 'w-5 h-5 p-1' },
  '2xl': { container: 'w-24 h-24 sm:w-28 sm:h-28', text: 'text-2xl sm:text-3xl', icon: 'w-10 h-10', badge: 'w-6 h-6 p-1.5' },
  custom: { container: '', text: 'text-sm', icon: 'w-4 h-4', badge: 'w-3.5 h-3.5 p-0.5' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  userId,
  role,
  size = 'md',
  className = '',
  imgClassName = '',
  alt,
  showRoleBadge = false,
  onClick,
  title,
}) => {
  const { users } = useAuth();
  const [imgError, setImgError] = useState(false);

  // Strictly resolve genuine user-uploaded avatar, ignoring dummy images
  const resolvedAvatar = useMemo(() => {
    // If src is explicitly provided and is a user-uploaded image
    if (src && isUserUploadedAvatar(src)) {
      return src;
    }
    // Otherwise check users context to find if user has an uploaded photo
    return resolveUserUploadedAvatar(src, userId, name, users);
  }, [src, userId, name, users]);

  const initials = getUserInitials(name || 'U');
  const roleColors = getAvatarRoleColors(role, name);
  const sizeConfig = sizeClasses[size] || sizeClasses.md;

  const resolvedTitle = title || (name ? `Uporabnik: ${name}` : undefined);
  const resolvedAlt = alt || (name ? `Profilna slika: ${name}` : 'Uporabniški avatar');

  const hasValidUploadedImage = Boolean(resolvedAvatar && !imgError);

  const containerClasses = [
    'relative shrink-0 rounded-full select-none flex items-center justify-center font-bold tracking-tight',
    sizeConfig.container,
    className,
  ].filter(Boolean).join(' ');

  const imageElement = hasValidUploadedImage ? (
    <img
      src={resolvedAvatar}
      alt={resolvedAlt}
      className={`w-full h-full rounded-full object-cover shadow-xs ring-1 ring-black/5 ${imgClassName}`}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  ) : (
    <div
      className={`w-full h-full rounded-full flex items-center justify-center font-bold shadow-xs ${roleColors.bg} ${roleColors.text} ${roleColors.ring} ring-1`}
    >
      {initials ? (
        <span className={`${sizeConfig.text} font-bold leading-none`}>{initials}</span>
      ) : (
        <UserIcon className={sizeConfig.icon} />
      )}
    </div>
  );

  return (
    <div
      className={containerClasses}
      onClick={onClick}
      title={resolvedTitle}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {imageElement}

      {showRoleBadge && role && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center shadow-xs border border-white dark:border-surface-container-lowest ${
            role === 'superadmin' ? 'bg-purple-600 text-white' :
            role === 'admin' ? 'bg-rose-600 text-white' :
            role === 'verified' ? 'bg-amber-500 text-white' :
            'bg-primary text-white'
          } ${sizeConfig.badge}`}
          title={role === 'superadmin' ? 'Superadmin' : role === 'admin' ? 'Administrator' : 'Preverjen uporabnik'}
        >
          {role === 'superadmin' ? (
            <Crown className="w-full h-full" />
          ) : role === 'admin' ? (
            <Shield className="w-full h-full" />
          ) : (
            <CheckCircle className="w-full h-full" />
          )}
        </span>
      )}
    </div>
  );
};
