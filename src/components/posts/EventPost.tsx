import React, { useState, useEffect } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { LikeButton } from "../LikeButton";
import { MapPin, Star, Ticket, Clock, ExternalLink, Calendar } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType, PostDetailTarget, EventScheduleSlot } from "../../types";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, slugify } from "../../utils/urlUtils";
import { useEventFilter } from "../../contexts/EventFilterContext";

export interface EventPostProps {
  id?: string;
  title?: string;
  organizer?: string;
  categoryName?: string;
  category?: string;
  subcategory?: string;
  subcategoryName?: string;
  location?: string;
  region?: string;
  date?: string;
  time?: string;
  eventTime?: string;
  eventDates?: string[];
  eventSchedule?: EventScheduleSlot[];
  month?: string;
  day?: string;
  price?: string;
  ticketUrl?: string;
  description?: string;
  image?: string;
  interestedCount?: string | number;
  likesCount?: number | string;
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onCategoryClick?: (category?: string, categoryName?: string, subcategory?: string, subcategoryName?: string) => void;
  onLocationClick?: (location?: string, region?: string) => void;
}

export const EventPost: React.FC<EventPostProps> = ({ 
  id = "event",
  title = "Literarni večer z domačimi avtorji in akustični koncert Dua Sever",
  organizer = "Mestna knjižnica Kranj",
  categoryName = "Kultura & Umetnost • Kranj",
  category = "dogodki",
  subcategory,
  subcategoryName,
  location = "Kranj, Glavni trg 12",
  region,
  date = "Četrtek, 20. marec ob 19:00",
  time,
  eventTime,
  eventDates,
  eventSchedule,
  month = "MAR",
  day = "20",
  price,
  ticketUrl,
  description = "Vabljeni v dvorano Mestne knjižnice Kranj na predstavitev novih pesniških zbirk gorenjskih avtorjev.",
  image,
  interestedCount = 86,
  likesCount = 0,
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  onNavigatePost,
  onCategoryClick,
  onLocationClick,
}) => {
  const { filterByEventCategory, filterByEventLocation } = useEventFilter();

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCategoryClick) {
      onCategoryClick(category, categoryName, subcategory, subcategoryName);
    } else {
      filterByEventCategory(category, categoryName, subcategory, subcategoryName);
    }
  };

  const handleLocationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLocationClick) {
      onLocationClick(location, region);
    } else {
      filterByEventLocation(location, region);
    }
  };
  const [currentCount, setCurrentCount] = useState<number>(
    typeof interestedCount === 'number' ? interestedCount : parseInt(String(interestedCount)) || 86
  );
  const [isInterested, setIsInterested] = useState(false);

  const postUrl = buildPostUrl({
    type: 'event',
    id,
    title,
    category,
    categoryName,
    subcategory,
    subcategoryName,
  });

  const authorUrl = `/avtor/${slugify(organizer)}`;

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({
        type: 'event',
        id,
        titleSlug: slugify(title),
        categorySlug: slugify(categoryName || category),
        subcategorySlug: subcategoryName || subcategory ? slugify(subcategoryName || subcategory) : undefined,
        initialData: {
          title,
          category,
          categoryName,
          subcategory,
          subcategoryName,
          author: organizer,
          image: imgSrc,
          location,
          date,
          time,
          eventTime,
          eventDates,
          eventSchedule,
          price,
          ticketUrl,
          description,
        },
      });
    } else {
      window.history.pushState({ type: 'event', id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  // Resolve image without forcing any hardcoded stock photo
  const resolveInitialImage = () => {
    if (image && image.trim()) return image.trim();
    // Only use fallback if explicitly configured by admin for missing photos
    const fallback = getActiveFallbackImage(true);
    return fallback || '';
  };

  const [imgSrc, setImgSrc] = useState<string>(resolveInitialImage());
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasError(false);
  }, [image]);

  const handleInterest = () => {
    setIsInterested(prev => !prev);
    setCurrentCount(prev => isInterested ? prev - 1 : prev + 1);
  };

  const handleImageError = () => {
    // If admin configured a custom fallback for broken links, switch to it
    const fallback = getActiveFallbackImage(false);
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
      return;
    }
    // Otherwise, gracefully hide the broken image element
    setHasError(true);
  };

  const cleanDescription = getPlainTextSnippet(description);
  const displayPrice = price && price.trim() !== '' ? price : 'Vstop prost';
  const hasVisibleImage = !!imgSrc && !hasError;

  const bookmarkData = {
    type: 'event',
    category: 'events',
    title,
    organizer,
    categoryName,
    location,
    date,
    month,
    day,
    price: displayPrice,
    description: cleanDescription,
    image: hasVisibleImage ? imgSrc : undefined,
  };

  const effectiveTime = eventTime || time;
  const showDistinctTime = effectiveTime && !date?.includes(effectiveTime);

  return (
    <article className={`bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow flex flex-col sm:flex-row ${
      isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50'
    }`}>
      {hasVisibleImage && (
        <a 
          href={postUrl}
          onClick={handleOpenDetail}
          className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group overflow-hidden"
          title="Odpri samostojno stran tega dogodka"
        >
          <img 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            src={imgSrc} 
            onError={handleImageError}
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
            {isPromoted && (
              <PromotedBadge type={promotionBadgeType} size="sm" />
            )}
            <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1.5 text-center min-w-[44px] shadow-sm border border-black/5">
              <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{month || 'DOG'}</div>
              <div className="text-base font-black text-on-surface leading-none mt-0.5">{day || '★'}</div>
            </div>
          </div>
        </a>
      )}
      <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
        <div>
          {/* Header row when no image is shown: display date badge & promo badge nicely */}
          {!hasVisibleImage && (
            <div className="flex items-center gap-3 mb-2.5">
              <div className="bg-primary/10 rounded-xl px-2.5 py-1 text-center min-w-[46px] border border-primary/20 shrink-0">
                <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{month || 'DOG'}</div>
                <div className="text-base font-black text-primary leading-none mt-0.5">{day || '★'}</div>
              </div>
              {isPromoted && (
                <PromotedBadge type={promotionBadgeType} size="sm" />
              )}
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleCategoryClick}
                className="font-label-caps text-[11px] text-primary hover:text-primary/80 hover:underline font-semibold uppercase tracking-wider cursor-pointer transition-colors text-left"
                title={`Filtriraj dogodke po kategoriji: ${categoryName}`}
              >
                {categoryName}
              </button>
              {organizer && (
                <>
                  <span className="text-[11px] text-outline">•</span>
                  <a
                    href={authorUrl}
                    className="font-label-caps text-[11px] font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                    title={`Ogled profila organizatorja: ${organizer}`}
                  >
                    {organizer}
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <LikeButton 
                id={id}
                targetType="event"
                initialLikesCount={likesCount}
                variant="minimal"
                showCount={true}
                itemTitle={title}
              />
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu id={id} type="event" title={title} description={cleanDescription} url={`${window.location.origin}${postUrl}`} />
              <ReportButton 
                targetId={id} 
                targetType="event" 
                targetTitle={title} 
                targetAuthor={organizer} 
              />
            </div>
          </div>
          <a
            href={postUrl}
            onClick={handleOpenDetail}
            className="block group/title cursor-pointer"
          >
            <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1 group-hover/title:text-primary transition-colors">
              {title}
            </h3>
          </a>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
            {cleanDescription || 'Vabljeni na prireditev v prijetnem vzdušju.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleLocationClick}
              className="flex items-center gap-1 text-outline hover:text-primary hover:underline transition-colors cursor-pointer text-left"
              title={`Filtriraj dogodke po lokaciji: ${location}`}
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{location}</span>
            </button>
            {date && (
              <>
                <span>•</span>
                <span className="font-medium text-on-surface flex items-center gap-1.5">
                  <span>{date}</span>
                  {eventDates && eventDates.length > 1 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>+{eventDates.length - 1} ponovitev</span>
                    </span>
                  )}
                </span>
              </>
            )}
            {showDistinctTime && (
              <>
                <span>•</span>
                <span className="font-semibold text-on-surface flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  {effectiveTime}
                </span>
              </>
            )}
            {organizer && (
              <>
                <span>•</span>
                <a
                  href={authorUrl}
                  className="hover:text-primary hover:underline font-medium text-on-surface transition-colors"
                  title={`Ogled profila organizatorja: ${organizer}`}
                >
                  {organizer}
                </a>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-headline-sm text-sm font-bold text-primary">{displayPrice}</span>
            {ticketUrl && (
              <a 
                href={ticketUrl.startsWith('http') ? ticketUrl : `https://${ticketUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-label-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Kupi vstopnice za ta dogodek"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Kupi vstopnice</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
            <ShareMenu 
              id={id} 
              type="event" 
              title={title} 
              description={cleanDescription} 
              url={`${window.location.origin}${postUrl}`}
              showLabel={true} 
              buttonClassName="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container" 
            />
            <LikeButton 
              id={id}
              targetType="event"
              initialLikesCount={likesCount}
              variant="pill"
              showCount={true}
              showLabel={true}
              itemTitle={title}
            />
            <button 
              onClick={handleInterest}
              className={`px-3.5 py-1.5 rounded-xl font-label-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                isInterested 
                  ? 'bg-primary-container text-on-primary-container' 
                  : 'bg-primary hover:bg-primary-container text-on-primary'
              }`}
            >
              <Star className={`w-3 h-3 ${isInterested ? 'fill-current' : ''}`} />
              <span>Zanima me ({currentCount})</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};


