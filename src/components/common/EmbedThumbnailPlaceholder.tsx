import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Globe,
  ImageOff,
  Percent,
  PlayCircle,
  ShoppingBag,
} from 'lucide-react';
import { getActiveFallbackImage } from '../../services/portalSettingsService';
import { extractDomainFromUrl } from '../../services/externalEmbedService';

export type EmbedThumbnailPostType = 'ad' | 'deal' | 'event' | 'blog' | 'embed';
export type EmbedThumbnailVariant = 'embed' | 'card' | 'hero';

export interface EmbedThumbnailPlaceholderProps {
  postType?: EmbedThumbnailPostType;
  title?: string;
  sourceDomain?: string;
  sourceName?: string;
  sourceFavicon?: string;
  externalUrl?: string;
  platform?: string;
  variant?: EmbedThumbnailVariant;
  className?: string;
}

/**
 * Validates whether an image URL candidate is structurally usable before assigning it to <img>.
 * Rejects empty strings, obvious non-image data URIs, and script/control schemes.
 */
export function isLikelyValidImageUrl(url?: string | null): url is string {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return false;
  }

  if (lower.startsWith('data:')) {
    return /^data:image\/(jpeg|jpg|png|webp|gif|avif|svg\+xml|bmp|x-icon|vnd\.microsoft\.icon)[;,]/i.test(
      trimmed
    );
  }

  if (lower.startsWith('blob:') || lower.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Consistent UI placeholder / default thumbnail rendered when an embed post lacks an image
 * or its fetched og:image fails to load (404, hotlink block, invalid MIME-type, 0x0 image).
 */
export const EmbedThumbnailPlaceholder: React.FC<EmbedThumbnailPlaceholderProps> = ({
  postType = 'embed',
  title,
  sourceDomain,
  sourceName,
  sourceFavicon,
  externalUrl,
  platform,
  variant = 'card',
  className = '',
}) => {
  const [faviconFailed, setFaviconFailed] = useState(false);

  const resolvedDomain = useMemo(() => {
    if (sourceDomain && sourceDomain.trim()) return sourceDomain.trim();
    if (externalUrl) return extractDomainFromUrl(externalUrl);
    return '';
  }, [sourceDomain, externalUrl]);

  const label = sourceName?.trim() || resolvedDomain || 'Vdelana objava';

  const IconComponent = useMemo(() => {
    if (platform === 'youtube' || platform === 'tiktok') return PlayCircle;
    switch (postType) {
      case 'ad':
        return ShoppingBag;
      case 'deal':
        return Percent;
      case 'event':
        return Calendar;
      case 'blog':
        return BookOpen;
      default:
        return resolvedDomain ? Globe : ImageOff;
    }
  }, [platform, postType, resolvedDomain]);

  const isHero = variant === 'hero';
  const isEmbed = variant === 'embed';

  return (
    <div
      role="img"
      aria-label={title ? `Privzeta sličica za ${title}` : 'Privzeta sličica vdelane objave'}
      className={`w-full h-full relative overflow-hidden flex flex-col items-center justify-center text-center select-none bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high/85 ${
        isHero ? 'p-8 gap-3' : isEmbed ? 'p-3 gap-1.5' : 'p-4 gap-2'
      } ${className}`}
    >
      {/* Subtle geometric lattice pattern so the empty media frame reads as intentional surface */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.045] dark:opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: isHero ? '20px 20px' : '14px 14px',
        }}
      />

      <div
        className={`relative z-10 flex items-center justify-center rounded-2xl bg-surface-container-lowest/90 dark:bg-surface-container-highest/70 border border-outline-variant/30 text-primary shadow-2xs ${
          isHero ? 'w-16 h-16' : isEmbed ? 'w-10 h-10 rounded-xl' : 'w-12 h-12'
        }`}
      >
        <IconComponent
          className={isHero ? 'w-7 h-7' : isEmbed ? 'w-5 h-5' : 'w-6 h-6'}
          strokeWidth={1.75}
        />

        {sourceFavicon && !faviconFailed && (
          <img
            src={sourceFavicon}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFaviconFailed(true)}
            className={`absolute -bottom-1 -right-1 rounded-sm bg-surface-container-lowest border border-outline-variant/40 object-contain ${
              isHero ? 'w-5 h-5 p-0.5' : 'w-4 h-4 p-0.5'
            }`}
          />
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center min-w-0 max-w-full px-2">
        <span
          className={`font-semibold text-on-surface-variant truncate max-w-full ${
            isHero ? 'text-sm' : isEmbed ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {label}
        </span>
        {!isEmbed && (
          <span
            className={`text-outline truncate max-w-full mt-0.5 ${
              isHero ? 'text-xs' : 'text-[10px]'
            }`}
          >
            Predogled slike ni na voljo
          </span>
        )}
      </div>
    </div>
  );
};

export interface ResilientEmbedImageProps {
  src?: string | null;
  fallbackSrcs?: Array<string | undefined | null>;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  allowPortalBrokenFallback?: boolean;
  onImageLoaded?: (loadedSrc: string) => void;
  onAllImagesFailed?: () => void;
  placeholderProps?: Omit<EmbedThumbnailPlaceholderProps, 'className'>;
  placeholderClassName?: string;
}

/**
 * Resilient media renderer that cascades through primary image, optional fallback URLs,
 * and portal settings fallback. Guards against HTTP 404, hotlink blocks, and invalid MIME-types
 * (including 0x0 or 1x1 tracking pixels), seamlessly rendering EmbedThumbnailPlaceholder on failure
 * so container geometry never collapses.
 */
export const ResilientEmbedImage: React.FC<ResilientEmbedImageProps> = ({
  src,
  fallbackSrcs,
  alt,
  className = 'w-full h-full object-cover',
  loading = 'lazy',
  allowPortalBrokenFallback = true,
  onImageLoaded,
  onAllImagesFailed,
  placeholderProps,
  placeholderClassName = '',
}) => {
  const candidates = useMemo(() => {
    const list: string[] = [];
    const add = (cand?: string | null) => {
      if (!isLikelyValidImageUrl(cand)) return;
      const trimmed = cand.trim();
      if (!list.includes(trimmed)) {
        list.push(trimmed);
      }
    };

    add(src);
    if (Array.isArray(fallbackSrcs)) {
      for (const extra of fallbackSrcs) {
        add(extra);
      }
    }
    if (allowPortalBrokenFallback) {
      add(getActiveFallbackImage(false));
    }
    return list;
  }, [src, fallbackSrcs, allowPortalBrokenFallback]);

  const candidatesKey = candidates.join('|');
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [exhausted, setExhausted] = useState(candidates.length === 0);

  useEffect(() => {
    setAttemptIndex(0);
    setExhausted(candidates.length === 0);
  }, [candidatesKey]);

  const advanceToNextOrFail = () => {
    const nextIdx = attemptIndex + 1;
    if (nextIdx < candidates.length) {
      setAttemptIndex(nextIdx);
    } else {
      setExhausted(true);
      onAllImagesFailed?.();
    }
  };

  const activeSrc = !exhausted ? candidates[attemptIndex] : undefined;

  if (!activeSrc || exhausted) {
    return (
      <EmbedThumbnailPlaceholder
        {...placeholderProps}
        className={placeholderClassName}
      />
    );
  }

  return (
    <img
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={loading}
      className={className}
      onLoad={(e) => {
        const img = e.currentTarget;
        // Guard against invalid MIME responses or 1x1 tracking pixels that fire load with tiny dimensions
        if (!img.complete || img.naturalWidth < 2 || img.naturalHeight < 2) {
          advanceToNextOrFail();
          return;
        }
        onImageLoaded?.(activeSrc);
      }}
      onError={advanceToNextOrFail}
    />
  );
};
