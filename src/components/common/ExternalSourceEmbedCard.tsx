import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Globe } from 'lucide-react';
import {
  extractDomainFromUrl,
  normalizeExternalUrl,
  useResolvedExternalEmbedState,
} from '../../services/externalEmbedService';
import { copyEmbedUrlToClipboard } from '../../utils/embedUtils';
import { EmbedContainerSkeleton, ResilientEmbedImage } from './EmbedThumbnailPlaceholder';

const KNOWN_SOURCE_BRANDS: Record<string, string> = {
  'avto.net': 'Avto.net',
  'bolha.com': 'Bolha.com',
  'nepremicnine.net': 'Nepremičnine.net',
  'mimovrste.com': 'Mimovrste',
  'bigbang.si': 'Big Bang',
  'merkur.si': 'Merkur',
  'intersport.si': 'Intersport',
  'hervis.si': 'Hervis',
  'hofer.si': 'Hofer',
  'lidl.si': 'Lidl',
  'spar.si': 'Spar',
  'mercator.si': 'Mercator',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'youtube-nocookie.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'instagram.com': 'Instagram',
  'facebook.com': 'Facebook',
  'fb.watch': 'Facebook',
  'twitter.com': 'X (Twitter)',
  'x.com': 'X (Twitter)',
  '24ur.com': '24ur.com',
  'rtvslo.si': 'RTV SLO',
  'siol.net': 'Siol.net',
  'delo.si': 'Delo.si',
  'n1info.si': 'N1',
  'slovenskenovice.si': 'Slovenske novice',
  'zurnal24.si': 'Žurnal24',
  'eventim.si': 'Eventim.si',
  'mojekarte.si': 'MojeKarte.si',
};

/**
 * Formats a clean, human-readable source website label (e.g. "avto.net" -> "Avto.net").
 */
export function formatEmbedSourceLabel(
  domain?: string,
  siteName?: string,
  platform?: string
): string {
  const cleanDomain = (domain || '').replace(/^www\./i, '').trim();
  const cleanDomainLower = cleanDomain.toLowerCase();
  const cleanSite = (siteName || '').trim();

  if (cleanDomainLower && KNOWN_SOURCE_BRANDS[cleanDomainLower]) {
    return KNOWN_SOURCE_BRANDS[cleanDomainLower];
  }

  // Subdomain match for known brands (e.g. "m.avto.net" -> "Avto.net", "vm.tiktok.com" -> "TikTok")
  if (cleanDomainLower) {
    for (const [brandDomain, brandLabel] of Object.entries(KNOWN_SOURCE_BRANDS)) {
      if (cleanDomainLower === brandDomain || cleanDomainLower.endsWith(`.${brandDomain}`)) {
        return brandLabel;
      }
    }
  }

  if (platform) {
    const pLower = platform.toLowerCase();
    if (pLower === 'youtube') return 'YouTube';
    if (pLower === 'tiktok') return 'TikTok';
    if (pLower === 'instagram') return 'Instagram';
    if (pLower === 'facebook') return 'Facebook';
    if (pLower === 'twitter') return 'X (Twitter)';
  }

  if (cleanDomain) {
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  }
  if (cleanSite) {
    return cleanSite.charAt(0).toUpperCase() + cleanSite.slice(1);
  }
  return 'Zunanji vir';
}

export interface EmbedSourceBadgeProps {
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  platform?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Clear visual source badge (e.g. "Vir: Avto.net") indicating where embedded content originates.
 */
export const EmbedSourceBadge: React.FC<EmbedSourceBadgeProps> = ({
  externalUrl,
  sourceName,
  sourceDomain,
  sourceFavicon,
  platform,
  size = 'sm',
  className = '',
}) => {
  const href = externalUrl && externalUrl.trim() !== '#' ? normalizeExternalUrl(externalUrl) : '';
  const extractedDomain = sourceDomain || (href ? extractDomainFromUrl(href) : '');
  const sourceLabel = formatEmbedSourceLabel(extractedDomain, sourceName, platform);

  if (!href && !sourceDomain && !sourceName && !platform) return null;

  const isMedium = size === 'md';
  const baseClasses = `inline-flex items-center gap-1.5 rounded-lg border font-medium whitespace-nowrap max-w-full transition-colors ${
    isMedium
      ? 'px-2.5 py-1 text-xs bg-primary/10 dark:bg-primary/15 border-primary/25 text-on-surface hover:bg-primary/15 hover:border-primary/40'
      : 'px-2 py-0.5 text-[11px] bg-primary/8 dark:bg-primary/15 border-primary/20 text-on-surface hover:bg-primary/15 hover:border-primary/35'
  } ${className}`;

  const content = (
    <>
      {sourceFavicon ? (
        <img
          src={sourceFavicon}
          alt=""
          referrerPolicy="no-referrer"
          className={`${isMedium ? 'w-3.5 h-3.5' : 'w-3 h-3'} rounded-xs shrink-0 object-contain`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Globe className={`${isMedium ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-primary shrink-0`} />
      )}
      <span className="text-on-surface-variant">Vir:</span>
      <span className="font-bold text-primary truncate">{sourceLabel}</span>
      {href && (
        <ExternalLink
          className={`${isMedium ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-primary/80 shrink-0`}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (!href) {
    return (
      <span
        className={baseClasses}
        title={`Vir vsebine: ${sourceLabel}`}
      >
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={baseClasses}
      title={`Odpri izvirno vsebino na ${extractedDomain || sourceLabel}`}
    >
      {content}
    </a>
  );
};

export interface EmbedCopyLinkButtonProps {
  url?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Compact 'Copy Link' button for .embed-container cards that copies the source URL to clipboard with visual feedback.
 */
export const EmbedCopyLinkButton: React.FC<EmbedCopyLinkButtonProps> = ({
  url,
  size = 'sm',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const cleanUrl = url && url.trim() && url.trim() !== '#' ? normalizeExternalUrl(url.trim()) : '';
  if (!cleanUrl) return null;

  const isMedium = size === 'md';

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyEmbedUrlToClipboard(cleanUrl);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Povezava kopirana v odložišče' : 'Kopiraj izvorno povezavo'}
      title={copied ? 'Povezava kopirana!' : `Kopiraj povezavo: ${cleanUrl}`}
      className={`embed-copy-link-btn inline-flex items-center gap-1.5 rounded-lg border font-semibold whitespace-nowrap transition-colors cursor-pointer ${
        isMedium ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${
        copied
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-surface-container-high bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
      } ${className}`}
    >
      {copied ? (
        <Check className={isMedium ? 'w-3.5 h-3.5 shrink-0' : 'w-3 h-3 shrink-0'} />
      ) : (
        <Copy className={isMedium ? 'w-3.5 h-3.5 shrink-0' : 'w-3 h-3 shrink-0'} />
      )}
      <span>{copied ? 'Kopirano!' : 'Kopiraj povezavo'}</span>
    </button>
  );
};

export interface EmbedVisitSourceLinkProps {
  url?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Clean 'Visit Source' link rendered alongside the source badge inside .embed-container cards,
 * opening the original source URL in a new browser tab.
 */
export const EmbedVisitSourceLink: React.FC<EmbedVisitSourceLinkProps> = ({
  url,
  size = 'sm',
  className = '',
}) => {
  const cleanUrl = url && url.trim() && url.trim() !== '#' ? normalizeExternalUrl(url.trim()) : '';
  if (!cleanUrl) return null;

  const isMedium = size === 'md';

  return (
    <a
      href={cleanUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Odpri izvirno vsebino v novem zavihku: ${cleanUrl}`}
      className={`embed-visit-source-link inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-surface-container-lowest hover:bg-primary/10 font-semibold text-primary whitespace-nowrap transition-colors ${
        isMedium ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${className}`}
    >
      <span>Obišči vir</span>
      <ExternalLink
        className={isMedium ? 'w-3.5 h-3.5 shrink-0' : 'w-3 h-3 shrink-0'}
        aria-hidden="true"
      />
    </a>
  );
};

interface ExternalSourceInlineProps {
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  isExternalEmbed?: boolean;
  className?: string;
}

/**
 * Clean source transparency badge for fetched external posts in feed cards (e.g. "Vir: Avto.net").
 */
export const ExternalSourceInline: React.FC<ExternalSourceInlineProps> = ({
  externalUrl,
  sourceName,
  sourceDomain,
  sourceFavicon,
  isExternalEmbed,
  className = '',
}) => {
  if (!isExternalEmbed && !externalUrl) return null;
  return (
    <EmbedSourceBadge
      externalUrl={externalUrl}
      sourceName={sourceName}
      sourceDomain={sourceDomain}
      sourceFavicon={sourceFavicon}
      size="sm"
      className={className}
    />
  );
};

interface ExternalSourceDetailEmbedProps {
  type: 'ad' | 'deal' | 'blog' | 'event';
  title: string;
  description?: string;
  image?: string;
  price?: string;
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  isExternalEmbed?: boolean;
  fetchedAt?: string;
}

/**
 * Rich embedded preview card shown when a post was fetched or linked from an external website.
 * Automatically extracts og:image and metadata from externalUrl when no DB image is available.
 */
export const ExternalSourceDetailEmbed: React.FC<ExternalSourceDetailEmbedProps> = ({
  type,
  title,
  description,
  image,
  price,
  externalUrl,
  sourceName,
  sourceDomain,
  sourceFavicon,
  isExternalEmbed,
  fetchedAt,
}) => {
  const hasValidUrl = Boolean(externalUrl && externalUrl.trim() && externalUrl.trim() !== '#');
  const href = hasValidUrl ? normalizeExternalUrl(externalUrl!) : '';
  const hasDbImage = Boolean(image && image.trim());

  // Automatically attempt og:image + metadata extraction when image is missing in database
  const { data: resolvedMeta, isLoading: isMetaLoading } = useResolvedExternalEmbedState(
    href || undefined,
    !href || (hasDbImage && Boolean(sourceDomain))
  );

  if (!isExternalEmbed && !hasValidUrl) return null;
  if (!href) return null;

  const domain = sourceDomain || resolvedMeta?.domain || extractDomainFromUrl(href) || 'spletna stran';
  const publisher = sourceName || resolvedMeta?.siteName || domain;
  const effectiveFavicon = sourceFavicon || resolvedMeta?.faviconUrl;
  const effectiveFetchedAt = fetchedAt || resolvedMeta?.fetchedAt;
  const effectiveImage = (hasDbImage ? image?.trim() : '') || resolvedMeta?.imageUrl || '';
  const effectiveTitle = (title && title.trim()) || resolvedMeta?.title || domain;
  const effectivePrice =
    price && price.trim() && price.trim().toLowerCase() !== 'po dogovoru'
      ? price
      : resolvedMeta?.price || price;
  const rawDesc = (description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanDesc = rawDesc || resolvedMeta?.description || '';
  const showFullSkeleton = isMetaLoading && !hasDbImage && !(title && title.trim());

  const typeLabel =
    type === 'ad'
      ? 'Vdelani zunanji oglas'
      : type === 'deal'
      ? 'Vdelana zunanja akcija'
      : type === 'event'
      ? 'Vdelani zunanji dogodek'
      : 'Vdelani zunanji vir';

  return (
    <div
      aria-busy={isMetaLoading}
      className={`embed-container rounded-2xl border border-surface-container bg-surface-container-low/70 overflow-hidden shadow-xs transition-opacity duration-300 ${
        isMetaLoading ? 'is-loading' : ''
      }`}
    >
      <div className="px-4 py-2.5 border-b border-surface-container/60 flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest/70">
        <div className="flex items-center gap-2 min-w-0 flex-wrap text-xs">
          <EmbedSourceBadge
            externalUrl={href}
            sourceName={publisher}
            sourceDomain={domain}
            sourceFavicon={effectiveFavicon}
            size="md"
          />
          <EmbedVisitSourceLink url={href} size="md" />
          {effectiveFetchedAt && (
            <span className="text-[11px] text-outline hidden sm:inline">
              Pridobljeno {new Date(effectiveFetchedAt).toLocaleDateString('sl-SI')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <EmbedCopyLinkButton url={href} size="sm" />
          <span className="text-[11px] font-semibold text-on-surface-variant">
            {typeLabel}
          </span>
        </div>
      </div>

      {showFullSkeleton ? (
        <EmbedContainerSkeleton variant="compact" />
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row gap-4 p-4 hover:bg-surface-container/40 transition-colors group"
        >
          <div className="sm:w-40 h-28 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-surface-container/60">
            <ResilientEmbedImage
              src={effectiveImage}
              fallbackSrcs={resolvedMeta?.images}
              alt={effectiveTitle}
              showLoadingShimmer={true}
              isMetadataLoading={isMetaLoading && !hasDbImage}
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
              placeholderProps={{
                postType: type,
                title: effectiveTitle,
                sourceDomain: domain,
                sourceName: publisher,
                sourceFavicon: effectiveFavicon,
                externalUrl: href,
                variant: 'embed',
              }}
            />
          </div>

          <div className="flex flex-col justify-between flex-1 min-w-0 gap-2">
            <div>
              <h4 className="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                {effectiveTitle}
              </h4>
              {cleanDesc ? (
                <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                  {cleanDesc}
                </p>
              ) : isMetaLoading ? (
                <div className="mt-1.5 space-y-1.5" aria-hidden="true">
                  <div className="h-3 w-full rounded-md embed-shimmer animate-pulse" />
                  <div className="h-3 w-3/4 rounded-md embed-shimmer animate-pulse" />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {effectivePrice ? (
                <span className="text-sm font-black text-primary">{effectivePrice}</span>
              ) : (
                <span className="text-xs text-outline truncate max-w-[260px]">{href}</span>
              )}

              <span className="px-3.5 py-1.5 rounded-xl bg-primary group-hover:bg-primary-container text-on-primary text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs shrink-0">
                <span>Odpri na {formatEmbedSourceLabel(domain, publisher)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </a>
      )}
    </div>
  );
};
