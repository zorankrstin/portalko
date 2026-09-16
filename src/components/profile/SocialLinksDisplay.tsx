import React from 'react';
import { 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Youtube, 
  Github, 
  MessageCircle, 
  Link2, 
  ExternalLink,
  Plus,
  Edit2
} from 'lucide-react';
import { SocialLink, SocialPlatform } from '../../contexts/AuthContext';

interface SocialLinksDisplayProps {
  socialLinks?: SocialLink[];
  onEditClick?: () => void;
  canEdit?: boolean;
}

export function getPlatformIcon(platform: SocialPlatform, className = "w-4 h-4") {
  switch (platform) {
    case 'website':
      return <Globe className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'facebook':
      return <Facebook className={className} />;
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'twitter':
      return <Twitter className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'github':
      return <Github className={className} />;
    case 'telegram':
      return <MessageCircle className={className} />;
    case 'custom':
    default:
      return <Link2 className={className} />;
  }
}

export function getPlatformLabel(platform: SocialPlatform): string {
  switch (platform) {
    case 'website': return 'Spletna stran';
    case 'instagram': return 'Instagram';
    case 'facebook': return 'Facebook';
    case 'linkedin': return 'LinkedIn';
    case 'twitter': return 'X (Twitter)';
    case 'youtube': return 'YouTube';
    case 'github': return 'GitHub';
    case 'telegram': return 'Telegram';
    case 'custom': return 'Povezava';
    default: return 'Povezava';
  }
}

export function SocialLinksDisplay({ socialLinks = [], onEditClick, canEdit = false }: SocialLinksDisplayProps) {
  const hasLinks = socialLinks.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3" id="user-profile-social-links-container">
      {hasLinks ? (
        socialLinks.map((link) => {
          const formattedUrl = link.url.startsWith('http://') || link.url.startsWith('https://')
            ? link.url
            : `https://${link.url}`;

          const displayLabel = link.label || getPlatformLabel(link.platform);

          return (
            <a
              key={link.id}
              href={formattedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold border border-surface-container/70 shadow-2xs hover:shadow-xs hover:border-primary/40 hover:text-primary transition-all group"
              title={`${displayLabel}: ${formattedUrl}`}
              id={`social-link-${link.id}`}
            >
              <span className="text-on-surface-variant group-hover:text-primary transition-colors">
                {getPlatformIcon(link.platform, "w-3.5 h-3.5")}
              </span>
              <span>{displayLabel}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5" />
            </a>
          );
        })
      ) : canEdit ? (
        <button
          type="button"
          onClick={onEditClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border border-dashed border-primary/30 font-label-md text-xs font-medium transition-all"
          id="btn-add-initial-social-links"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dodaj družbena omrežja (Instagram, LinkedIn, X...)</span>
        </button>
      ) : null}

      {hasLinks && canEdit && onEditClick && (
        <button
          type="button"
          onClick={onEditClick}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-outline hover:text-primary hover:bg-surface-container-low font-label-md text-xs font-semibold transition-colors"
          title="Uredi družbena omrežja"
          id="btn-quick-edit-social-links"
        >
          <Edit2 className="w-3 h-3" />
          <span>Uredi</span>
        </button>
      )}
    </div>
  );
}
