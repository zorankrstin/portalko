import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { BookOpen, MoreHorizontal, Camera, Heart, MessageCircle, Eye, ArrowRight } from 'lucide-react';

export interface BlogPostProps {
  id?: string;
  title?: string;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  date?: string;
  location?: string;
  description?: string;
  excerpt?: string;
  image?: string;
  readTime?: string;
  photoCount?: string;
  likesCount?: string;
  commentsCount?: string;
  viewsCount?: string;
  tags?: string[];
  onNavigatePost?: (target: { type: 'blog'; id: string }) => void;
}

export const BlogPost: React.FC<BlogPostProps> = ({ 
  id = "blog",
  title = "Potep po dolini Soče: 5 skritih kotičkov, ki jih morate obiskati to pomlad",
  author = "Maja Zupan",
  authorRole = "Registrirana",
  authorAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuA0aillBK42foqYYRs3Hl0i5psDvvr2NDlrZX_P-FXMFxLDlTrJyttrIRyIM7OjAMIeCA8VDw5Da046gdbXusHkNnSCNLmgTP1y3GLJPh-_spwBhPsrnwKXD-zF6zEb144nZU8FLIklzGTs5sg8xvIs7NcM-R4fOwdNJHr4sPnR2x0Im8d6D1xpgLSCk-6lXFjnWO5W4kUTP6QjtqfjqwL9sD3BxP22cIPCehiW4qkKlJEasSlcrIVW",
  date = "Pred 2 urama",
  location = "Dolina Soče, Bovec",
  description = "Pomlad ob smaragdni reki ponuja popolno tišino pred glavno turistično sezono. Odkrili smo manj znane slapove, neobljudene tolmunčke v Trenti ter domačo sirarno v vasi Čezsoča, kjer še vedno ohranjajo stoletno tradicijo izdelave bovškega sira.",
  excerpt,
  image = "https://lh3.googleusercontent.com/aida-public/AB6AXuDmfcqLkX6EpehopwShblWWWTErEk6fiZmrLuObihcFhQPTTdN1UP0HwAJWNxbpewO7AD8rNtHki7D2UQxR3ruAprxzai0oCSFiLO7Ucc2eM__0HctsIVOGVfYNHax9soqlpthUdhwDbTst0e68dCdSFOM0wasuTUnvpZCJ__StsF3T8Qey5cE-RGiZXa7sEzk59Ev8spqvVpe-6CJ-6XR19xlIiJd9yyxqk2aRczUvHRHR4HUWu0Zv",
  readTime = "5 minut branja",
  photoCount = "8 fotografij",
  likesCount = "84 všečkov",
  commentsCount = "19 komentarjev",
  viewsCount = "1.420 ogledov",
  tags = ["turizem", "slovenija", "izlet", "socaValley"],
  onNavigatePost,
}) => {
  const finalDesc = excerpt || description;

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({ type: 'blog', id });
    } else {
      window.location.hash = `blog-${id}`;
    }
  };

  const bookmarkData = {
    type: 'blog',
    category: 'blog',
    title,
    author,
    authorRole,
    authorAvatar,
    date,
    location,
    description: finalDesc,
    image,
    readTime,
    photoCount,
  };

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm group/article">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img className="w-11 h-11 rounded-full object-cover ring-1 ring-black/5" src={authorAvatar} alt={author} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">{author}</h3>
              <span className="font-label-caps text-label-caps bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-md">{authorRole}</span>
            </div>
            <p className="font-body-sm text-xs text-outline flex items-center gap-1">
              <span>{date}</span>
              {location && (
                <>
                  <span>•</span>
                  <span>{location}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-label-caps text-label-caps font-bold">
            <BookOpen className="w-[1em] h-[1em] text-xs" /> Blog
          </span>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu id={id} title={title} />
          <button className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container" type="button">
            <MoreHorizontal className="w-[1em] h-[1em] text-lg" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <a 
          href={`#blog-${id}`}
          onClick={handleOpenDetail}
          className="block group/title cursor-pointer"
          title="Odpri samostojno stran članka"
        >
          <h4 className="font-headline-md text-headline-md font-bold text-on-surface group-hover/title:text-primary transition-colors">
            {title}
          </h4>
        </a>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3">
          {finalDesc}
        </p>
      </div>
      
      {image && (
        <a
          href={`#blog-${id}`}
          onClick={handleOpenDetail}
          className="relative rounded-xl overflow-hidden h-72 w-full bg-surface-container block cursor-pointer group/img"
          title="Odpri samostojno stran članka"
        >
          <img className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" src={image} alt={title} />
          <div className="absolute bottom-3 left-3 bg-inverse-surface/80 backdrop-blur-sm text-inverse-on-surface px-2.5 py-1 rounded-lg font-label-md text-xs flex items-center gap-1.5">
            <Camera className="w-[1em] h-[1em] text-xs text-secondary-fixed" /> {readTime} {photoCount ? `• ${photoCount}` : ''}
          </div>
        </a>
      )}
      
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((tag, idx) => (
            <span key={idx} className="text-xs font-label-md text-primary hover:underline cursor-pointer">
              #{tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-container-low">
        <div className="flex items-center gap-4 text-on-surface-variant font-label-md text-xs">
          <button 
            onClick={handleOpenDetail}
            className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
          >
            <Heart className="w-[1em] h-[1em] text-base" />
            <span>{likesCount}</span>
          </button>
          <button 
            onClick={handleOpenDetail}
            className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
          >
            <MessageCircle className="w-[1em] h-[1em] text-base" />
            <span>{commentsCount}</span>
          </button>
          <span className="flex items-center gap-1 text-outline">
            <Eye className="w-[1em] h-[1em] text-base" />
            <span>{viewsCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`#blog-${id}`}
            onClick={handleOpenDetail}
            className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-surface-container"
            title="Preberi celoten članek"
          >
            <span>Preberi članek</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </div>
    </article>
  );
};
