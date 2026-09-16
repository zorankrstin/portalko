import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { MapPin, Phone } from 'lucide-react';

export interface AdPostProps {
  id?: string;
  title?: string;
  price?: string;
  author?: string;
  authorInitials?: string;
  location?: string;
  date?: string;
  description?: string;
  categoryName?: string;
  category?: string;
  image?: string;
  images?: string[];
  status?: string;
}

export const AdPost: React.FC<AdPostProps> = ({ 
  id = "ad",
  title = "Apple iPhone 15 Pro 128GB - Naravni Titan, garancija do nov. 2025",
  price = "790 €",
  author = "Marko K.",
  authorInitials = "MK",
  location = "Ljubljana",
  date = "Danes",
  description = "Telefon je brezhiben, od prvega dne nošen v originalnem Apple usnjenem ovitku ter z nameščenim PanzerGlass steklom.",
  categoryName = "Telefonija",
  category,
  image,
  images,
  status = "Aktivno",
}) => {
  const displayImage = image || (images && images.length > 0 ? images[0] : "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80");
  const displayCategory = categoryName || category || 'Oglas';

  const bookmarkData = {
    type: 'ad',
    category: 'ads',
    title,
    price,
    location,
    description,
    image: displayImage,
  };

  return (
    <article className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container/50 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row">
      {displayImage && (
        <div className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative">
          <img alt={title} className="w-full h-full object-cover" src={displayImage} />
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white font-label-caps text-[10px] font-bold uppercase tracking-wider">
            {displayCategory}
          </span>
        </div>
      )}
      <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="font-headline-lg text-xl font-bold text-primary">{price}</span>
            <div className="flex items-center gap-1">
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu id={id} title={title} />
            </div>
          </div>
          <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1">{title}</h3>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" /> {location} • {date}
          </span>
          <button className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
            <Phone className="w-3.5 h-3.5" />
            <span>Kontakt</span>
          </button>
        </div>
      </div>
    </article>
  );
};
