import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, Sparkles, Megaphone } from 'lucide-react';
import { PromotionBanner, BannerPosition } from '../../types';
import {
  subscribeToBanners,
  filterActiveBannersForPosition,
  recordBannerClick,
  recordBannerImpression
} from '../../services/bannerService';

interface PromotionBannerZoneProps {
  position: BannerPosition;
  className?: string;
  limit?: number;
  showSponsoredLabel?: boolean;
}

/**
 * Dedicated sub-component for third-party HTML/JS banner code.
 * Ensures `<script>` elements in third-party snippets actually execute and render correctly.
 */
function CodeBannerEmbed({ code, className = '' }: { code: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !code) return;

    // Reset container HTML
    container.innerHTML = code;

    // Extract all script tags to dynamically execute them
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      // Copy inline script contents
      if (oldScript.innerHTML) {
        newScript.innerHTML = oldScript.innerHTML;
      }
      // Replace old non-executing script with the live script
      if (oldScript.parentNode) {
        oldScript.parentNode.replaceChild(newScript, oldScript);
      }
    });
  }, [code]);

  return (
    <div
      ref={containerRef}
      className={`third-party-banner-container w-full min-w-0 flex justify-center items-center overflow-visible rounded-xl ${className}`}
    />
  );
}

export function PromotionBannerZone({
  position,
  className = '',
  limit,
  showSponsoredLabel = true
}: PromotionBannerZoneProps) {
  const [activeBanners, setActiveBanners] = useState<PromotionBanner[]>([]);
  const recordedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeToBanners((allBanners) => {
      const filtered = filterActiveBannersForPosition(allBanners, position);
      setActiveBanners(limit ? filtered.slice(0, limit) : filtered);
    });

    return () => unsub();
  }, [position, limit]);

  // Record impressions once per session for active banners
  useEffect(() => {
    activeBanners.forEach((b) => {
      if (!recordedImpressions.current.has(b.id)) {
        recordedImpressions.current.add(b.id);
        recordBannerImpression(b.id);
      }
    });
  }, [activeBanners]);

  if (activeBanners.length === 0) {
    return null;
  }

  return (
    <div
      className={`promotion-banner-zone flex flex-col gap-3.5 my-2 w-full ${className}`}
      data-zone-position={position}
    >
      {activeBanners.map((banner) => {
        if (banner.type === 'code' && banner.customCode) {
          return (
            <div
              key={banner.id}
              className="bg-surface-container-lowest border border-surface-container/60 rounded-2xl p-2 sm:p-2.5 shadow-xs transition-shadow hover:shadow-sm flex flex-col items-center justify-center overflow-visible w-full"
            >
              {showSponsoredLabel && (
                <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-surface-container-low mb-2 text-[10px] text-outline font-semibold uppercase tracking-wider w-full">
                  <span className="flex items-center gap-1">
                    <Megaphone className="w-3 h-3 text-primary" />
                    <span>Oglasno sporočilo</span>
                  </span>
                  <span className="text-[9px] text-outline/80 font-normal">Sponzorirano</span>
                </div>
              )}
              <CodeBannerEmbed code={banner.customCode} />
            </div>
          );
        }

        // Image banner rendering
        if (banner.type === 'image' && banner.imageUrl) {
          const isMainContainer = position === 'main_container';
          const isLeftSidebar = position === 'left_sidebar';

          const content = (
            <div
              className={`group relative overflow-hidden rounded-2xl border border-surface-container/70 bg-surface-container-lowest shadow-xs hover:shadow-md transition-all duration-300 ${
                isMainContainer ? 'w-full' : ''
              }`}
            >
              {/* Image Container */}
              <div
                className={`relative overflow-hidden w-full ${
                  isMainContainer
                    ? 'h-36 sm:h-44 md:h-52'
                    : isLeftSidebar
                    ? 'h-32'
                    : 'h-[250px] min-h-[250px]'
                }`}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.altText || banner.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Graceful fallback to styled background if broken
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

                {/* Badge top-left */}
                {showSponsoredLabel && (
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/60 backdrop-blur-md text-amber-300 border border-amber-300/30 shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Promocija</span>
                    </span>
                  </div>
                )}

                {/* Link icon top-right if targetUrl provided */}
                {banner.targetUrl && (
                  <div className="absolute top-2.5 right-2.5 z-10 opacity-75 group-hover:opacity-100 transition-opacity">
                    <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white text-xs border border-white/20 shadow-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}

                {/* Overlay Text & Caption */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white z-10 flex flex-col gap-0.5">
                  <h4 className="font-bold text-sm sm:text-base leading-tight drop-shadow-sm group-hover:text-primary-container transition-colors line-clamp-2">
                    {banner.title}
                  </h4>
                  {banner.caption && (
                    <p className="text-xs text-slate-200 line-clamp-1 sm:line-clamp-2 drop-shadow-xs opacity-90">
                      {banner.caption}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );

          if (banner.targetUrl) {
            return (
              <a
                key={banner.id}
                href={banner.targetUrl}
                target={banner.openInNewTab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                onClick={() => recordBannerClick(banner.id)}
                className="block cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl"
                title={banner.title}
              >
                {content}
              </a>
            );
          }

          return <div key={banner.id}>{content}</div>;
        }

        return null;
      })}
    </div>
  );
}
