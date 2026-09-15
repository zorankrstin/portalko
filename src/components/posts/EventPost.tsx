import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { Library, MapPin, Users, Star } from 'lucide-react';

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
  location = "Kranj, Glavni trg 12 (Dvorana)",
  date = "Četrtek, 20. marec ob 19:00",
  month = "MAR",
  day = "20",
  price,
  description = "Vabljeni v dvorano Mestne knjižnice Kranj na predstavitev novih pesniških zbirk gorenjskih avtorjev. Večer bo obogaten z uglasbeno poezijo in prijetnim druženjem ob lokalni kapljici. Vstop je prost!",
  image,
  interestedCount = "86",
}) => {
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
    price,
    description,
    image,
    interestedCount,
  };

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
            <Library className="w-[1em] h-[1em] text-tertiary" />
          </div>
          <div>
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">{organizer}</h3>
            <p className="font-body-sm text-xs text-outline">{categoryName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {price && (
            <span className="font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 rounded-full font-bold">
              {price}
            </span>
          )}
          <span className="font-label-caps text-label-caps bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-1 rounded-full font-bold hidden sm:inline-flex">
            Dogodek
          </span>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu id={id} />
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <h4 className="font-headline-md text-headline-md text-on-surface">
          {title}
        </h4>
        {description && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            {description}
          </p>
        )}
      </div>

      {image && (
        <div className="relative rounded-xl overflow-hidden h-52 w-full bg-surface-container">
          <img className="w-full h-full object-cover" src={image} alt={title} />
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface-container-low p-3 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex flex-col items-center justify-center text-tertiary font-bold shadow-sm">
            <span className="text-[10px] uppercase leading-none">{month}</span>
            <span className="text-base leading-none">{day}</span>
          </div>
          <div>
            <span className="font-label-caps text-label-caps text-outline uppercase">Datum & Čas</span>
            <p className="font-label-md text-xs font-bold text-on-surface">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <MapPin className="w-[1em] h-[1em] text-primary text-2xl shrink-0" />
          <div className="min-w-0">
            <span className="font-label-caps text-label-caps text-outline uppercase">Lokacija</span>
            <p className="font-label-md text-xs font-bold text-on-surface truncate">{location}</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Users className="w-[1em] h-[1em] text-sm text-secondary" />
          <span className="font-semibold text-secondary">{interestedCount} oseb je označilo, da jih zanima</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors" type="button">
            Več informacij
          </button>
          <button className="px-4 py-2 rounded-xl bg-tertiary hover:bg-tertiary-container text-on-tertiary font-label-md text-label-md font-semibold transition-all shadow-sm flex items-center gap-1" type="button">
            <Star className="w-[1em] h-[1em] text-sm" />
            <span>Zanima me</span>
          </button>
        </div>
      </div>
    </article>
  );
};
