import React, { useState } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { MapPin, Star } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType } from "../../types";

export interface EventPostProps {
  id?: string;
  title?: string;
  organizer?: string;
  categoryName?: string;
  location?: string;
  date?: string;
  time?: string;
  month?: string;
  day?: string;
  price?: string;
  description?: string;
  image?: string;
  interestedCount?: string | number;
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
}

export const EventPost: React.FC<EventPostProps> = ({ 
  id = "event",
  title = "Literarni večer z domačimi avtorji in akustični koncert Dua Sever",
  organizer = "Mestna knjižnica Kranj",
  categoryName = "Kultura & Umetnost • Kranj",
  location = "Kranj, Glavni trg 12",
  date = "Četrtek, 20. marec ob 19:00",
  month = "MAR",
  day = "20",
  price,
  description = "Vabljeni v dvorano Mestne knjižnice Kranj na predstavitev novih pesniških zbirk gorenjskih avtorjev.",
  image = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
  interestedCount = 86,
  isPromoted = false,
  promotionBadgeType = 'PROMO',
}) => {
  const [currentCount, setCurrentCount] = useState<number>(
    typeof interestedCount === 'number' ? interestedCount : parseInt(String(interestedCount)) || 86
  );
  const [isInterested, setIsInterested] = useState(false);

  const handleInterest = () => {
    setIsInterested(prev => !prev);
    setCurrentCount(prev => isInterested ? prev - 1 : prev + 1);
  };

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
    price: price || 'Vstop prost',
    description,
    image,
  };

  return (
    <article className={`bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow flex flex-col sm:flex-row ${
      isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50'
    }`}>
      {image && (
        <a 
          href={`#event-${id}`}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = `event-${id}`;
          }}
          className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group"
          title="Odpri samostojno stran tega dogodka"
        >
          <img alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={image} />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
            {isPromoted && (
              <PromotedBadge type={promotionBadgeType} size="sm" />
            )}
            <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1.5 text-center min-w-[44px] shadow-sm border border-black/5">
              <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{month}</div>
              <div className="text-base font-black text-on-surface leading-none mt-0.5">{day}</div>
            </div>
          </div>
        </a>
      )}
      <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-label-caps text-[11px] text-primary font-semibold uppercase tracking-wider">
                {categoryName}
              </span>
              {organizer && (
                <>
                  <span className="text-[11px] text-outline">•</span>
                  <a
                    href={`#author-${encodeURIComponent(organizer.replace(/\s+/g, '_'))}`}
                    className="font-label-caps text-[11px] font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                    title={`Ogled profila organizatorja: ${organizer}`}
                  >
                    {organizer}
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu id={id} type="event" title={title} description={description} />
              <ReportButton 
                targetId={id} 
                targetType="event" 
                targetTitle={title} 
                targetAuthor={organizer} 
              />
            </div>
          </div>
          <a
            href={`#event-${id}`}
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = `event-${id}`;
            }}
            className="block group/title cursor-pointer"
          >
            <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1 group-hover/title:text-primary transition-colors">
              {title}
            </h3>
          </a>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {location}
            </span>
            {organizer && (
              <>
                <span>•</span>
                <a
                  href={`#author-${encodeURIComponent(organizer.replace(/\s+/g, '_'))}`}
                  className="hover:text-primary hover:underline font-medium text-on-surface transition-colors"
                  title={`Ogled profila organizatorja: ${organizer}`}
                >
                  {organizer}
                </a>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-sm font-bold text-primary">{price || 'Vstop prost'}</span>
            <ShareMenu 
              id={id} 
              type="event" 
              title={title} 
              description={description} 
              showLabel={true} 
              buttonClassName="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container" 
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

