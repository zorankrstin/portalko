import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { BookOpen, MoreHorizontal, Camera, Heart, MessageCircle, Eye, ArrowRight } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType } from "../../types";
import { AdSense } from "../ads/AdSense";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { handleImageFallbackError, getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, slugify } from "../../utils/urlUtils";
import type { PostDetailTarget } from "../../types";

export interface BlogPostProps {
  id?: string;
  title?: string;
  category?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
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
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export const BlogPost: React.FC<BlogPostProps> = ({ 
  id = "blog",
  title = "Potep po dolini Soče: 5 skritih kotičkov, ki jih morate obiskati to pomlad",
  category = "turizem-izleti",
  categoryName = "Turizem & Izleti",
  subcategory,
  subcategoryName,
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
  commentsCount = "0 komentarjev",
  viewsCount = "1.420 ogledov",
  tags = ["turizem", "slovenija", "izlet", "socaValley"],
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  onNavigatePost,
}) => {
  const finalDesc = excerpt || description;

  const postUrl = buildPostUrl({
    type: 'blog',
    id,
    title,
    category,
    categoryName,
    subcategory,
    subcategoryName,
  });

  const authorUrl = `/avtor/${slugify(author)}`;

  const resolveInitialImage = () => {
    if (image && image.trim()) return image.trim();
    return getActiveFallbackImage(true, 'blog') || '';
  };
  const [imgSrc, setImgSrc] = React.useState<string>(resolveInitialImage());
  const [hasError, setHasError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasError(false);
  }, [image]);

  const handleImageError = () => {
    const fallback = getActiveFallbackImage(false);
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
      return;
    }
    setHasError(true);
  };

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({
        type: 'blog',
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
          author,
          image,
          date,
          location,
          description: finalDesc,
        },
      });
    } else {
      window.history.pushState({ type: 'blog', id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
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
    <article className={`bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border hover:shadow-md transition-shadow flex flex-col gap-space-sm group/article ${
      isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={authorUrl}
            className="group/avatar shrink-0 focus:outline-none"
            title={`Ogled profila avtorja: ${author}`}
          >
            <img className="w-11 h-11 rounded-full object-cover ring-1 ring-black/5 group-hover/avatar:ring-2 group-hover/avatar:ring-primary transition-all" src={authorAvatar} alt={author} />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <a
                href={authorUrl}
                className="font-headline-sm text-sm font-bold text-on-surface hover:text-primary hover:underline transition-colors"
                title={`Ogled profila avtorja: ${author}`}
              >
                {author}
              </a>
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
          {isPromoted && (
            <PromotedBadge type={promotionBadgeType} size="sm" />
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-label-caps text-label-caps font-bold">
            <BookOpen className="w-[1em] h-[1em] text-xs" /> Blog
          </span>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu id={id} type="blog" title={title} description={description} url={`${window.location.origin}${postUrl}`} />
          <ReportButton 
            targetId={id || ''} 
            targetType="post" 
            targetTitle={title || ''} 
            targetAuthor={author} 
          />
          <button className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container" type="button">
            <MoreHorizontal className="w-[1em] h-[1em] text-lg" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <a 
          href={postUrl}
          onClick={handleOpenDetail}
          className="block group/title cursor-pointer"
          title="Odpri samostojno stran članka"
        >
          <h4 className="font-headline-md text-headline-md font-bold text-on-surface group-hover/title:text-primary transition-colors">
            {title}
          </h4>
        </a>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 leading-relaxed">
          {getPlainTextSnippet(finalDesc)}
        </p>
      </div>
      
      {imgSrc && !hasError && (
        <a
          href={postUrl}
          onClick={handleOpenDetail}
          className="relative rounded-xl overflow-hidden h-72 w-full bg-surface-container block cursor-pointer group/img"
          title="Odpri samostojno stran članka"
        >
          <img 
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
            src={imgSrc} 
            alt={title} 
            onError={handleImageError}
          />
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
          <ShareMenu
            id={id}
            type="blog"
            title={title}
            description={description}
            url={`${window.location.origin}${postUrl}`}
            showLabel={true}
            buttonClassName="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-on-surface-variant font-label-md text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <a
            href={postUrl}
            onClick={handleOpenDetail}
            className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-surface-container"
            title="Preberi celoten članek"
          >
            <span>Preberi članek</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </div>
      <AdSense />
    </article>
  );
};
