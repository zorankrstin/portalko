import React from 'react';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Linkedin, 
  MessageCircle, 
  Globe, 
  Link2 
} from 'lucide-react';
import { SocialMediaPlatform, SocialMediaLink } from '../../types';
import { usePortalSettings, DEFAULT_SOCIAL_LINKS } from '../../services/portalSettingsService';

/**
 * Returns human-readable Slovenian name for a given platform.
 */
export function getSocialPlatformName(platform: SocialMediaPlatform): string {
  switch (platform) {
    case 'facebook': return 'Facebook';
    case 'instagram': return 'Instagram';
    case 'tiktok': return 'TikTok';
    case 'twitter': return 'X (Twitter)';
    case 'youtube': return 'YouTube';
    case 'linkedin': return 'LinkedIn';
    case 'threads': return 'Threads';
    case 'telegram': return 'Telegram';
    case 'whatsapp': return 'WhatsApp';
    case 'custom': return 'Spletna stran';
    default: return 'Družbeno omrežje';
  }
}

/**
 * Returns the crisp platform icon.
 */
export function getSocialPlatformIcon(platform: SocialMediaPlatform, className = 'w-4 h-4') {
  switch (platform) {
    case 'facebook':
      return <Facebook className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'telegram':
      return <MessageCircle className={className} />;
    case 'whatsapp':
      // Clean WhatsApp icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
          <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
        </svg>
      );
    case 'tiktok':
      // Official TikTok note icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.41a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 10.77 4.54 6.27 6.27 0 0 0 1.91-4.54V9.05a8.28 8.28 0 0 0 5.23 1.83V7.43a4.85 4.85 0 0 1-1.46-.74z"/>
        </svg>
      );
    case 'twitter':
      // Official 𝕏 logo
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'threads':
      // Threads icon
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10 3.14 0 6.03-1.45 7.89-3.81l-1.63-1.18C16.82 18.66 14.52 19.8 12 19.8c-4.31 0-7.8-3.49-7.8-7.8 0-4.31 3.49-7.8 7.8-7.8 3.99 0 7.29 3 7.74 6.91H17.5c-.38-2.67-2.68-4.71-5.5-4.71-3.09 0-5.6 2.51-5.6 5.6s2.51 5.6 5.6 5.6c1.69 0 3.23-.76 4.26-1.97.26-.31.64-.5.99-.5h.15c.66 0 1.2.54 1.2 1.2 0 .19-.05.37-.13.53C19.04 19.46 15.77 21 12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9c0 1.25-.26 2.44-.73 3.52l1.83.77C22.68 14.98 23 13.53 23 12c0-6.075-4.925-11-11-11z"/>
        </svg>
      );
    case 'custom':
    default:
      return <Globe className={className} />;
  }
}

/**
 * Returns brand hover styling for a platform.
 */
export function getSocialPlatformHoverClasses(platform: SocialMediaPlatform): string {
  switch (platform) {
    case 'facebook':
      return 'hover:text-[#1877F2] hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30';
    case 'instagram':
      return 'hover:text-[#E4405F] hover:bg-[#E4405F]/10 hover:border-[#E4405F]/30';
    case 'tiktok':
      return 'hover:text-[#00f2fe] hover:bg-[#00f2fe]/10 hover:border-[#00f2fe]/30';
    case 'twitter':
      return 'hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/30 dark:hover:border-white/30';
    case 'youtube':
      return 'hover:text-[#FF0000] hover:bg-[#FF0000]/10 hover:border-[#FF0000]/30';
    case 'linkedin':
      return 'hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 hover:border-[#0A66C2]/30';
    case 'threads':
      return 'hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/30 dark:hover:border-white/30';
    case 'telegram':
      return 'hover:text-[#229ED9] hover:bg-[#229ED9]/10 hover:border-[#229ED9]/30';
    case 'whatsapp':
      return 'hover:text-[#25D366] hover:bg-[#25D366]/10 hover:border-[#25D366]/30';
    case 'custom':
    default:
      return 'hover:text-primary hover:bg-primary/10 hover:border-primary/30';
  }
}

/**
 * Sidebar Social Media Links component designed for the left sidebar footer.
 * Consumes real-time links managed by the admin in PortalSettings.
 */
export function SidebarSocialLinks({ className = '' }: { className?: string }) {
  const { settings } = usePortalSettings();
  const links = settings.socialLinks || DEFAULT_SOCIAL_LINKS;

  // Filter only active links with valid URLs and sort by order
  const activeLinks = links
    .filter(link => link.isActive && link.url && link.url.trim() !== '')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (activeLinks.length === 0) {
    return null;
  }

  return (
    <div className={`px-2 flex flex-col gap-1.5 ${className}`} id="sidebar-social-media-container">
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-[10px] uppercase font-bold text-outline tracking-wider">
          Spremljajte nas
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        {activeLinks.map((link) => {
          const formattedUrl = link.url.startsWith('http://') || link.url.startsWith('https://')
            ? link.url
            : `https://${link.url}`;

          const platformName = getSocialPlatformName(link.platform);
          const tooltip = link.label ? `${link.label} (${platformName})` : platformName;
          const hoverClasses = getSocialPlatformHoverClasses(link.platform);

          return (
            <a
              key={link.id}
              href={formattedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-8 h-8 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container/70 text-on-surface-variant flex items-center justify-center transition-all duration-200 shadow-2xs hover:shadow-xs hover:scale-105 ${hoverClasses}`}
              title={tooltip}
              aria-label={tooltip}
              id={`sidebar-social-icon-${link.platform}`}
            >
              {getSocialPlatformIcon(link.platform, 'w-4 h-4')}
            </a>
          );
        })}
      </div>
    </div>
  );
}
