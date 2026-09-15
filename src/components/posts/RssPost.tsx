import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { Rss, ExternalLink, Clock } from 'lucide-react';
import { formatSlovenianDate, formatFullSlovenianDateTime } from "../../utils/dateUtils";

interface RssPostProps {
  id?: string;
  title?: string;
  link?: string;
  description?: string;
  sourceName?: string;
  pubDate?: string;
  thumbnail?: string;
}

export const RssPost: React.FC<RssPostProps> = ({ 
  id = "default",
  title = "Cene življenjskih potrebščin v februarju zmernejše, letna inflacija na 1,8 odstotka",
  link = "https://www.rtvslo.si",
  description = "Statistični urad RS (SURS) poroča o umiritvi cen hrane in brezalkoholnih pijač, medtem ko se cene storitev še naprej krepijo s povprečno 3,2-odstotno letno rastjo.",
  sourceName = "RTV Slovenija",
  pubDate = "pred 35 min",
  thumbnail = "https://lh3.googleusercontent.com/aida-public/AB6AXuBwa3x1j5cEF-Q5lqAuTCNRDeCuUWlx07IL-SE9-c3bPNgf9mqKgoqSLqpi74z2tdnR_H1fDvgOsdbWrxsVpt5XBs9keJPGcD-RdiK80jklKPkTFRKen6kXVuTB_aaEDFw2RgOW2jFy3xwfMgT4P_HXw1S06uG0DJ59rQcK_T65fjqdl8nJT0EvOmjASY8u2InfluMhuWH9Z_ZLH2mgKmPNZx4N5kegWcqZdfGFfV67CDd9WIGh7qpl"
}) => {
  
  // Format the date to local Slovenian time (Europe/Ljubljana)
  const displayDate = formatSlovenianDate(pubDate);
  const fullDateTime = formatFullSlovenianDateTime(pubDate);

  // Stripping HTML from description
  const cleanDescription = description.replace(/<\/?[^>]+(>|$)/g, "");

  const [imgError, setImgError] = React.useState(false);

  const sourceInitial = sourceName ? sourceName.substring(0, 3).toUpperCase() : "RSS";

  const domain = React.useMemo(() => {
    try {
      return new URL(link || '').hostname;
    } catch (e) {
      return '';
    }
  }, [link]);
  
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm border-l-4 border-l-primary">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center font-bold text-xs text-on-surface-variant overflow-hidden shrink-0">
            {!imgError && faviconUrl ? (
              <img src={faviconUrl} alt={sourceName} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              sourceInitial
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-md text-xs font-bold text-on-surface">{sourceName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span className="font-body-sm text-xs text-outline" title={fullDateTime || displayDate}>{displayDate}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          
          <BookmarkButton id={id} data={{ title, link, description, sourceName, pubDate, thumbnail, type: 'news', category: 'news' }} />
          <ShareMenu id={id} url={link} title={title} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-md items-center">
        <div className={`flex flex-col gap-2 ${thumbnail ? 'sm:col-span-8' : 'sm:col-span-12'}`}>
          <h4 className="font-headline-sm text-headline-sm text-on-surface leading-tight hover:text-primary transition-colors">
            <a className="hover:underline" href={link} rel="noopener noreferrer" target="_blank">
              {title}
            </a>
          </h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
            {cleanDescription}
          </p>
          <div className="pt-1">
            <a className="inline-flex items-center gap-1.5 text-primary font-label-md text-label-md font-semibold hover:underline" href={link} rel="noopener noreferrer" target="_blank">
              <span>Beri celoten članek</span>
              <ExternalLink className="w-[1em] h-[1em] text-sm" />
            </a>
            
          </div>
        </div>
        
        {thumbnail && (
          <div className="sm:col-span-4 rounded-xl overflow-hidden h-32 bg-surface-container">
            <img className="w-full h-full object-cover" src={thumbnail} alt={title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        )}
      </div>
      
      
    </article>
  );
};
