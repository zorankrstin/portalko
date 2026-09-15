import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ShieldCheck, MapPin, MessageSquare } from 'lucide-react';

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
  location = "Ljubljana - Bežigrad",
  date = "danes ob 11:20",
  description = "Telefon je brezhiben, od prvega dne nošen v originalnem Apple usnjenem ovitku ter z nameščenim PanzerGlass steklom. Zdravje baterije 98%. Priložen original račun (iStyle Ljubljana), embalaža in nerabljen kabel. Možen osebni prevzem ali preizkus v Ljubljani.",
  categoryName = "Telefonija",
  image,
  images = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBfIBngWKS30xAFzsMq_Dxy2qrMQztheyrgJ5NmeICUhk5lSyoH8H0jEx6lEbzYMgY5qP-PRwxH7wcmTG1TdM0SVmIequYR1ci3Qt5BwzjPQrYx32XODDP5xacq9fV1QSDsjGtXYJYKrxZ_3frQ7mNFrFCFfQQPO0kMUXGiaUV4qBUID4yNyRy3oVkWAuk1XP3IrSgzM6PPd1AyM8Z2ZbdZaWha3pAyQDNC3djtCF6TMbqwo5NG21uz",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBoc0CSy-sKNVmhSZRxOp8WfTqAS43GZKvTGz7WryDO9KEXVbXoj1vXymDCGxJyOfq6npN2TKvMZ1d1DTKqkt6Rp-aZZS69FFDNyD4NmKui28nOBaSqLE1z3mN-XiYbeBcdmMZLsmk4fHFPCk1UkccXclOnv7KfCGc3Bs4w0IsSr92MFx0Y0cW5I6BAyhN1fT0FmewUJIkbVFHOaNSFbofa-6-EavEYLlODaKrnu_YtT4X9UJ8Ag1fg",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA10ax7mFCM-yQNrIJq21b97T4uRkzmFDhh5WcuzqI9OljY6mdWJdxNyzDP_NVd0aBfQ924RkMmq940fSphuDqijAafp3dKmbYEqbuZH3sT647N7ynYOwREBrYrM_Q6ZjKQy_Yrhbq5BHhwX1kPxQHOD9n0hACn-H3_nelebdRcIvAZeYb8EepQyPRC0ga_fcIlbHwnq-a8o9sdr46Sp5J_HmJFctNTEVriBrVUncxGmiQJnj64M25V",
  ],
  status = "Aktivno",
}) => {
  const displayImages = images && images.length > 0 ? images : (image ? [image] : []);
  const bookmarkData = {
    type: 'ad',
    category: 'ads',
    title,
    price,
    author,
    location,
    date,
    description,
    image: displayImages[0],
    images: displayImages,
    categoryName,
  };

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center font-bold">
            {authorInitials || author.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">{author}</h3>
              <ShieldCheck className="w-[1em] h-[1em] text-sm text-secondary" />
            </div>
            <p className="font-body-sm text-xs text-outline">{location} {date ? `• ${date}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps font-bold">
            {status}
          </span>
          <span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg">
            Oglas
          </span>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu id={id} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            {title}
          </h4>
          {price && <span className="font-headline-lg text-2xl font-black text-primary">{price}</span>}
        </div>
        {description && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      
      {displayImages.length > 0 && (
        <div className={`grid ${displayImages.length >= 3 ? 'grid-cols-3' : displayImages.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 rounded-xl overflow-hidden`}>
          {displayImages.slice(0, 3).map((img, idx) => (
            <div key={idx} className="h-36 bg-surface-container relative">
              <img className="w-full h-full object-cover" src={img} alt={`Slika ${idx + 1}`} />
              {idx === 2 && displayImages.length > 3 && (
                <div className="absolute inset-0 bg-inverse-surface/40 flex items-center justify-center text-inverse-on-surface font-label-md text-xs">
                  +{displayImages.length - 3} slik
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-outline font-label-md text-xs">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-[1em] h-[1em] text-sm text-primary" /> {location}
            </span>
          )}
          {categoryName && (
            <>
              <span>•</span>
              <span>Kategorija: {categoryName}</span>
            </>
          )}
          <span>•</span>
          <span className="text-secondary font-semibold">Osebni prevzem ali pošta</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all shadow-sm flex items-center gap-1.5" type="button">
            <MessageSquare className="w-[1em] h-[1em] text-base" />
            <span>Kontaktiraj prodajalca</span>
          </button>
        </div>
      </div>
    </article>
  );
};
