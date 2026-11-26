import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { parseSocialEmbed } from '../../utils/embedUtils';
import {
  extractDomainFromUrl,
  extractEmbedSourceUrl,
  getDirectVideoThumbnailUrl,
  useResolvedExternalEmbed,
  type ExternalEmbedMetadata,
} from '../../services/externalEmbedService';
import { ResilientEmbedImage } from './EmbedThumbnailPlaceholder';
import { EmbedSourceBadge, formatEmbedSourceLabel } from './ExternalSourceEmbedCard';

interface EmbedContentRendererProps {
  embedCode?: string;
  embedOrientation?: 'horizontal' | 'vertical' | 'auto';
  dbImage?: string;
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  title?: string;
  preResolvedMeta?: ExternalEmbedMetadata | null;
  sanitizeHtml?: (html: string) => string;
}

/**
 * Renders embed content (social links, video players, iframes, or external website URLs).
 * Automatically extracts `og:image` and metadata from the source URL if no image is stored in the database,
 * displays a consistent placeholder thumbnail on failure, and surfaces a clear source badge (e.g. "Vir: Avto.net").
 */
export const EmbedContentRenderer: React.FC<EmbedContentRendererProps> = ({
  embedCode,
  embedOrientation,
  dbImage,
  externalUrl,
  sourceName,
  sourceDomain,
  sourceFavicon,
  title,
  preResolvedMeta,
  sanitizeHtml,
}) => {
  const rawEmbed = (embedCode || '').trim();
  const parsed = useMemo(() => {
    if (!rawEmbed) return null;
    const forced =
      embedOrientation === 'vertical' || embedOrientation === 'horizontal'
        ? embedOrientation
        : undefined;
    return parseSocialEmbed(rawEmbed, forced);
  }, [rawEmbed, embedOrientation]);

  const sourceUrl = useMemo(() => {
    return externalUrl?.trim() || parsed?.embedUrl || extractEmbedSourceUrl(rawEmbed);
  }, [externalUrl, parsed?.embedUrl, rawEmbed]);

  const hasDbImage = Boolean(dbImage && dbImage.trim());
  const shouldSkipAutoFetch = !sourceUrl || hasDbImage || Boolean(preResolvedMeta?.imageUrl);
  const autoMeta = useResolvedExternalEmbed(sourceUrl, shouldSkipAutoFetch);

  if (!rawEmbed && !sourceUrl) return null;

  const meta = preResolvedMeta || autoMeta;
  const extractedOgImage =
    (!hasDbImage ? meta?.imageUrl || getDirectVideoThumbnailUrl(sourceUrl || rawEmbed) : '') || '';
  const displayImage = extractedOgImage || (hasDbImage ? dbImage!.trim() : '');

  const effectiveDomain =
    sourceDomain || meta?.domain || extractDomainFromUrl(sourceUrl) || parsed?.previewTitle || '';
  const effectiveSiteName = sourceName || meta?.siteName;
  const effectiveFavicon = sourceFavicon || meta?.faviconUrl;
  const formattedSource = formatEmbedSourceLabel(
    effectiveDomain,
    effectiveSiteName,
    parsed?.platform
  );

  const cleanHtml = (html: string) => (sanitizeHtml ? sanitizeHtml(html) : html);

  // Generic external link: rich preview card with clear source transparency badge ("Vir: ...")
  if (parsed?.platform === 'generic' && sourceUrl) {
    const cardTitle = meta?.title || title || formattedSource;
    const cardDesc = meta?.description || '';

    return (
      <div className="rounded-2xl border border-surface-container bg-surface-container-low/75 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 border-b border-surface-container/60 flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest/60">
          <EmbedSourceBadge
            externalUrl={sourceUrl}
            sourceName={effectiveSiteName}
            sourceDomain={effectiveDomain}
            sourceFavicon={effectiveFavicon}
            platform={parsed?.platform}
            size="md"
          />
          <span className="text-[11px] font-medium text-outline truncate">
            Vdelana zunanja objava
          </span>
        </div>

        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-surface-container/50 transition-colors flex flex-col sm:flex-row group"
        >
          <div className="sm:w-48 h-40 sm:h-auto bg-surface-container shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r border-surface-container/60">
            <ResilientEmbedImage
              src={displayImage}
              fallbackSrcs={meta?.images}
              alt={cardTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              placeholderProps={{
                postType: 'embed',
                title: cardTitle,
                sourceDomain: effectiveDomain,
                sourceName: effectiveSiteName,
                sourceFavicon: effectiveFavicon,
                externalUrl: sourceUrl,
                platform: parsed?.platform,
                variant: 'embed',
              }}
            />
          </div>
          <div className="p-4 flex flex-col justify-between flex-1 min-w-0 gap-2">
            <div>
              <h4 className="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                {cardTitle}
              </h4>
              {cardDesc && (
                <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                  {cardDesc}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              {meta?.price ? (
                <span className="text-sm font-black text-primary">{meta.price}</span>
              ) : (
                <span className="text-[11px] text-outline truncate max-w-[260px]">{sourceUrl}</span>
              )}
              <span className="px-3 py-1.5 rounded-xl bg-primary group-hover:bg-primary-container text-on-primary text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors">
                <span>Odpri na {formattedSource}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-container bg-surface-container-low/50 p-3 sm:p-3.5">
      {/* Transparent source badge for all embedded content (YouTube, TikTok, Instagram, Facebook, X, iframes) */}
      {(sourceUrl || effectiveDomain || effectiveSiteName || parsed?.platform) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-surface-container/60">
          <EmbedSourceBadge
            externalUrl={sourceUrl}
            sourceName={effectiveSiteName}
            sourceDomain={effectiveDomain}
            sourceFavicon={effectiveFavicon}
            platform={parsed?.platform}
            size="md"
          />
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-on-surface-variant hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              <span>Odpri izvirnik</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {parsed?.embedHtml ? (
        <div
          className="tiptap rounded-xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: cleanHtml(parsed.embedHtml) }}
        />
      ) : rawEmbed ? (
        <div
          className="tiptap rounded-xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: cleanHtml(rawEmbed) }}
        />
      ) : null}

      {/* For social/iframe embeds when no DB image was stored, display extracted og:image preview card or placeholder for Twitter/X or fallback visual context */}
      {!hasDbImage && (extractedOgImage || !parsed?.embedHtml) && (parsed?.platform === 'twitter' || !parsed?.embedHtml) && (
        <a
          href={sourceUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-surface-container bg-surface-container-low/70 hover:bg-surface-container/50 overflow-hidden flex flex-col sm:flex-row items-stretch group transition-colors"
        >
          <div className="sm:w-44 h-36 sm:h-auto bg-surface-container shrink-0 overflow-hidden">
            <ResilientEmbedImage
              src={extractedOgImage}
              fallbackSrcs={meta?.images}
              alt={meta?.title || title || 'Izvorna slika objave'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              placeholderProps={{
                postType: 'embed',
                title: meta?.title || title,
                sourceDomain: effectiveDomain,
                sourceName: effectiveSiteName,
                sourceFavicon: effectiveFavicon,
                externalUrl: sourceUrl,
                platform: parsed?.platform,
                variant: 'embed',
              }}
            />
          </div>
          <div className="p-3.5 flex flex-col justify-between min-w-0 flex-1 gap-1.5">
            <div className="text-xs font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
              {meta?.title || title || 'Izvorna objava'}
            </div>
            {meta?.description && (
              <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                {meta.description}
              </p>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary mt-1">
              <span>Vir: {formattedSource}</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </a>
      )}
    </div>
  );
};
