import React, { useState } from 'react';
import {
  Globe,
  Link2,
  Loader2,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  ExternalEmbedMetadata,
  fetchExternalEmbedUrl,
} from '../../services/externalEmbedService';
import { ResilientEmbedImage } from './EmbedThumbnailPlaceholder';

interface ExternalEmbedFetcherBoxProps {
  modeLabel: 'ad' | 'deal';
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  isExternalEmbed?: boolean;
  onFetched: (meta: ExternalEmbedMetadata) => void;
  onClearExternal: () => void;
}

export const ExternalEmbedFetcherBox: React.FC<ExternalEmbedFetcherBoxProps> = ({
  modeLabel,
  externalUrl = '',
  sourceName = '',
  sourceDomain = '',
  sourceFavicon = '',
  isExternalEmbed = false,
  onFetched,
  onClearExternal,
}) => {
  const [urlInput, setUrlInput] = useState(externalUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [lastFetchedMeta, setLastFetchedMeta] = useState<ExternalEmbedMetadata | null>(null);

  React.useEffect(() => {
    if (externalUrl && externalUrl !== urlInput) {
      setUrlInput(externalUrl);
    }
  }, [externalUrl]);

  const handleFetch = async () => {
    if (!urlInput.trim()) {
      setFetchError('Prilepite povezavo do spletne strani (npr. bolha.com, mimovrste.com...).');
      return;
    }

    setIsLoading(true);
    setFetchError('');
    try {
      const meta = await fetchExternalEmbedUrl(urlInput);
      setLastFetchedMeta(meta);
      setUrlInput(meta.url);
      onFetched(meta);
    } catch (err: any) {
      setFetchError(err?.message || 'Podatkov s te strani žal ni bilo mogoče pridobiti.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeDomain = lastFetchedMeta?.domain || sourceDomain;
  const activeSiteName = lastFetchedMeta?.siteName || sourceName || activeDomain;
  const activeFavicon = lastFetchedMeta?.faviconUrl || sourceFavicon;
  const activeUrl = lastFetchedMeta?.url || externalUrl;
  const hasActiveExternal = Boolean(isExternalEmbed && activeUrl);

  return (
    <div className="p-3.5 rounded-xl bg-primary/[0.04] border border-primary/25 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/12 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span>
                {modeLabel === 'ad'
                  ? 'Pridobi mali oglas s spletne povezave (Vdelana objava)'
                  : 'Pridobi akcijo / ugodnost s spletne povezave (Vdelana objava)'}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">
              {modeLabel === 'ad'
                ? 'Prilepite povezavo oglasa z druge spletne strani – samodejno pridobimo naslov, opis, fotografijo, ceno in vir.'
                : 'Prilepite povezavo izdelka ali akcije iz spletne trgovine – samodejno izpolnimo naslov, opis, ceno in izvorno povezavo.'}
            </p>
          </div>
        </div>

        {hasActiveExternal && (
          <button
            type="button"
            onClick={() => {
              setLastFetchedMeta(null);
              setUrlInput('');
              setFetchError('');
              onClearExternal();
            }}
            className="text-[11px] font-semibold text-outline hover:text-error flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-error/10 transition-colors cursor-pointer shrink-0"
            title="Odstrani povezavo na zunanjo objavo"
          >
            <X className="w-3.5 h-3.5" />
            <span>Odstrani vir</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Link2 className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleFetch();
              }
            }}
            placeholder={
              modeLabel === 'ad'
                ? 'https://www.bolha.com/... ali https://www.avto.net/...'
                : 'https://www.mimovrste.com/... ali https://www.bigbang.si/...'
            }
            className="w-full bg-surface-container-lowest pl-8 pr-3 py-2 rounded-xl font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleFetch()}
          disabled={isLoading || !urlInput.trim()}
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Pridobivam...</span>
            </>
          ) : hasActiveExternal ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Osveži podatke</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pridobi objavo</span>
            </>
          )}
        </button>
      </div>

      {fetchError && (
        <div className="p-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[11px] flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{fetchError}</span>
        </div>
      )}

      {hasActiveExternal && (
        <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-container shrink-0 bg-surface-container-low">
              <ResilientEmbedImage
                src={lastFetchedMeta?.imageUrl}
                fallbackSrcs={lastFetchedMeta?.images}
                alt={lastFetchedMeta?.title || activeSiteName || 'Predogled'}
                className="w-full h-full object-cover"
                placeholderProps={{
                  postType: modeLabel,
                  sourceDomain: activeDomain,
                  sourceName: activeSiteName,
                  sourceFavicon: activeFavicon,
                  externalUrl: activeUrl,
                  variant: 'embed',
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-secondary font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Povezano kot vdelana zunanja objava</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface font-medium truncate mt-0.5">
                {activeFavicon && (
                  <img
                    src={activeFavicon}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-3.5 h-3.5 rounded-xs shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="font-bold truncate">{activeSiteName}</span>
                {activeDomain && activeDomain !== activeSiteName.toLowerCase() && (
                  <span className="text-outline truncate">· {activeDomain}</span>
                )}
              </div>
            </div>
          </div>

          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Odpri</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
