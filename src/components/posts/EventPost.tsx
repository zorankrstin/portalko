import React, { useState } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { MapPin, Star } from 'lucide-react';

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
    <article className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col sm:flex-row">
      {image && (
        <a 
          href={`#event-${id}`}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = `event-${id}`;
          }}
          className="sm:w-56 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group"
          title="Odpri samostojno stran tega dogodka"
        >
          <img alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={image} />
          <div className="absolute top-2 left-2 bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1.5 text-center min-w-[44px] shadow-sm border border-black/5">
            <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{month}</div>
            <div className="text-base font-black text-on-surface leading-none mt-0.5">{day}</div>
          </div>
        </a>
      )}
      <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="font-label-caps text-[11px] text-primary font-semibold uppercase tracking-wider">
              {categoryName}
            </span>
            <div className="flex items-center gap-1">
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu id={id} title={title} />
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
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" /> {location}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-sm font-bold text-primary">{price || 'Vstop prost'}</span>
            <a
              href={`#event-${id}`}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = `event-${id}`;
              }}
              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
              title="Poglej celotno stran dogodka"
            >
              <span>Stran dogodka</span>
            </a>
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

