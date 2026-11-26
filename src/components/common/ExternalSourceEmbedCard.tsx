import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { extractDomainFromUrl, normalizeExternalUrl } from '../../services/externalEmbedService';

interface ExternalSourceInlineProps {
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  isExternalEmbed?: boolean;
  className?: string;
}

/**
 * Clean unboxed source attribution for fetched external posts in feed cards
 * (avoids decorative pill badges while keeping domain & original link crystal clear).
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
  const href = externalUrl ? normalizeExternalUrl(externalUrl) : '';
  const domain = sourceDomain || extractDomainFromUrl(href) || sourceName || 'zunanja stran';
  const displayName = sourceName && sourceName.toLowerCase() !== domain.toLowerCase()
    ? `${sourceName} (${domain})`
    : domain;

  if (!href) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] text-outline font-medium ${className}`}>
        <Globe className="w-3 h-3 text-primary/80 shrink-0" />
        <span>Izvorna objava · {displayName}</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-on-surface-variant hover:text-primary transition-colors ${className}`}
      title={`Odpri izvirno objavo na ${domain}`}
    >
      {sourceFavicon ? (
        <img
          src={sourceFavicon}
          alt=""
          className="w-3.5 h-3.5 rounded-xs shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-3 h-3 text-primary shrink-0" />
      )}
      <span className="truncate">
        Izvor: <span className="font-semibold text-on-surface">{domain}</span>
      </span>
      <ExternalLink className="w-3 h-3 text-primary shrink-0" />
    </a>
  );
};

interface ExternalSourceDetailEmbedProps {
  type: 'ad' | 'deal';
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
 * Rich embedded preview card shown on PostDetailPage when a Mali oglas or Akcija
 * was fetched from an external website.
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
  if (!isExternalEmbed && !externalUrl) return null;
  if (!externalUrl || externalUrl === '#') return null;

  const href = normalizeExternalUrl(externalUrl);
  const domain = sourceDomain || extractDomainFromUrl(href) || 'spletna stran';
  const publisher = sourceName || domain;
  const cleanDesc = (description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <div className="rounded-2xl border border-surface-container bg-surface-container-low/70 overflow-hidden shadow-xs">
      <div className="px-4 py-2.5 border-b border-surface-container/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 text-xs">
          {sourceFavicon ? (
            <img
              src={sourceFavicon}
              alt=""
              className="w-4 h-4 rounded-xs shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="font-bold text-on-surface truncate">{publisher}</span>
          <span className="text-outline">·</span>
          <span className="text-outline truncate">{domain}</span>
          {fetchedAt && (
            <>
              <span className="text-outline hidden sm:inline">·</span>
              <span className="text-[11px] text-outline hidden sm:inline">
                Pridobljeno {new Date(fetchedAt).toLocaleDateString('sl-SI')}
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] font-semibold text-primary">
          {type === 'ad' ? 'Vdelani zunanji oglas' : 'Vdelana zunanja akcija'}
        </span>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col sm:flex-row gap-4 p-4 hover:bg-surface-container/40 transition-colors group"
      >
        {image && (
          <div className="sm:w-36 h-28 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-surface-container/60">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex flex-col justify-between flex-1 min-w-0 gap-2">
          <div>
            <h4 className="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h4>
            {cleanDesc && (
              <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                {cleanDesc}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {price ? (
              <span className="text-sm font-black text-primary">{price}</span>
            ) : (
              <span className="text-xs text-outline truncate max-w-[260px]">{href}</span>
            )}

            <span className="px-3.5 py-1.5 rounded-xl bg-primary group-hover:bg-primary-container text-on-primary text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs shrink-0">
              <span>Odpri na {domain}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
};
