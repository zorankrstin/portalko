import React, { useState } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { LikeButton } from "../LikeButton";
import { Copy, Check, ArrowRight, Sparkles, CheckCircle2, Clock, MapPin, ThumbsUp } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType, PostDetailTarget } from "../../types";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, slugify } from "../../utils/urlUtils";

export interface DealPostProps {
  id?: string;
  title?: string;
  discount?: string;
  oldPrice?: string;
  newPrice?: string;
  expirationDate?: string;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  date?: string;
  description?: string;
  code?: string;
  link?: string;
  votesCount?: number;
  image?: string;
  categoryName?: string;
  category?: string;
  subcategory?: string;
  subcategoryName?: string;
  region?: string;
  verifiedText?: string;
  featured?: boolean;
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export const DealPost: React.FC<DealPostProps> = ({ 
  id = "default",
  title = "Hervis Slovenija: 30% spomladanski popust na vso tekaško obutev (Nike, Salomon, Asics)",
  discount = "-30%",
  oldPrice,
  newPrice,
  expirationDate,
  author = "Hervis Slovenija",
  authorRole = "Preverjen partner",
  authorAvatar,
  date = "Veljavno do konca meseca",
  description = "Za vse registrirane člane portala je na voljo posebna ugodnost ob začetku tekaške sezone. Koda velja v spletni trgovini ter v vseh poslovalnicah po Sloveniji ob predložitvi digitalnega kupona.",
  code = "TEK30",
  link = "https://www.hervis.si",
  votesCount = 142,
  image = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
  categoryName = "Šport & Obutev",
  category = "ugodnosti",
  subcategory,
  subcategoryName,
  region = "Vsa Slovenija / Splet",
  verifiedText = "Preverjeno danes",
  featured = false,
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  onNavigatePost,
}) => {
  const [copied, setCopied] = useState(false);
  const [votes, setVotes] = useState(votesCount);
  const [hasVoted, setHasVoted] = useState(false);

  const postUrl = buildPostUrl({
    type: 'deal',
    id,
    title,
    category,
    categoryName,
    subcategory,
    subcategoryName,
  });

  const authorUrl = `/avtor/${slugify(author)}`;

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({
        type: 'deal',
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
          authorRole,
          image: imgSrc,
          discount,
          oldPrice,
          newPrice,
          date,
          description,
          code,
          link,
          region,
        },
      });
    } else {
      window.history.pushState({ type: 'deal', id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const avatarSrc = authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(author)}`;

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVote = () => {
    if (!hasVoted) {
      setVotes(v => v + 1);
      setHasVoted(true);
    }
  };

  const resolveInitialImage = () => {
    if (image && image.trim()) return image.trim();
    const fallback = getActiveFallbackImage(true);
    return fallback || '';
  };

  const [imgSrc, setImgSrc] = useState<string>(resolveInitialImage());
  const [hasError, setHasError] = useState<boolean>(false);

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

  const hasVisibleImage = !!imgSrc && !hasError;
  const cleanDescription = getPlainTextSnippet(description);

  const effectiveDate = expirationDate 
    ? `Velja do ${expirationDate.includes('-') ? new Date(expirationDate).toLocaleDateString('sl-SI') : expirationDate}` 
    : (date || "Veljavno do preklica");

  const bookmarkData = {
    type: 'deal',
    category: 'deals',
    title,
    price: newPrice || discount,
    discount,
    oldPrice,
    newPrice,
    expirationDate,
    author,
    authorRole,
    authorAvatar: avatarSrc,
    date: effectiveDate,
    description: cleanDescription,
    image: hasVisibleImage ? imgSrc : undefined,
    code,
    link,
    votesCount: votes,
    categoryName,
    region,
    verifiedText,
  };

  return (
    <article 
      className={`bg-surface-container-lowest rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row group ${
        isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/60'
      }`}
    >
      {/* PHOTO CONTAINER */}
      {hasVisibleImage && (
        <a 
          href={postUrl}
          onClick={handleOpenDetail}
          className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative overflow-hidden block cursor-pointer"
          title="Odpri samostojno stran te ugodnosti"
        >
          <img 
            src={imgSrc} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            loading="lazy"
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden"></div>
          
          {/* Badges on image */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
            {isPromoted && (
              <PromotedBadge type={promotionBadgeType} size="sm" />
            )}
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white font-label-caps text-[10px] font-bold uppercase tracking-wider">
              {categoryName}
            </span>
            {featured && !isPromoted && (
              <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Top
              </span>
            )}
          </div>

          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-secondary text-on-secondary font-bold text-xs shadow-md">
            {discount}
          </div>
        </a>
      )}

      {/* CONTENT AREA */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3">
        <div>
          {!hasVisibleImage && (
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-secondary text-on-secondary font-bold text-xs shadow-xs">
                {discount}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label-caps text-[10px] font-bold uppercase tracking-wider">
                {categoryName}
              </span>
              {isPromoted && (
                <PromotedBadge type={promotionBadgeType} size="sm" />
              )}
            </div>
          )}
          {/* Header Row: Partner info, role, and actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href={authorUrl}
                className="shrink-0 group/avatar focus:outline-none"
                title={`Ogled profila partnerja: ${author}`}
              >
                <img 
                  src={avatarSrc} 
                  alt={author}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-black/10 group-hover/avatar:ring-2 group-hover/avatar:ring-primary shrink-0 shadow-xs transition-all"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(author)}`;
                  }}
                />
              </a>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <a
                  href={authorUrl}
                  className="font-label-lg text-xs sm:text-sm font-bold text-on-surface hover:text-primary hover:underline truncate transition-colors"
                  title={`Ogled profila partnerja: ${author}`}
                >
                  {author}
                </a>
                {authorRole && (
                  <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container text-outline font-semibold shrink-0">
                    {authorRole}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <LikeButton 
                id={id} 
                targetType="deal" 
                initialLikesCount={0} 
                variant="minimal" 
                showCount={true} 
                itemTitle={title} 
              />
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu id={id} type="deal" title={title} description={description} url={`${window.location.origin}${postUrl}`} />
              <ReportButton 
                targetId={id} 
                targetType="deal" 
                targetTitle={title} 
                targetAuthor={author} 
              />
            </div>
          </div>

          {/* Title */}
          <a
            href={postUrl}
            onClick={handleOpenDetail}
            className="block group/title cursor-pointer"
          >
            <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface line-clamp-2 mt-1.5 group-hover/title:text-primary transition-colors leading-snug">
              {title}
            </h3>
          </a>

          {/* Pricing Highlight: Old price & New price */}
          {(newPrice || oldPrice) && (
            <div className="flex items-center gap-2.5 my-1.5 p-2 rounded-xl bg-surface-container-low/80 border border-surface-container/60 w-fit flex-wrap">
              {newPrice && (
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] uppercase font-bold text-outline">Akcija:</span>
                  <span className="font-headline-sm text-base sm:text-lg font-black text-secondary">
                    {newPrice}
                  </span>
                </div>
              )}
              {oldPrice && (
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-outline">Redna:</span>
                  <span className="text-xs line-through text-outline font-medium">
                    {oldPrice}
                  </span>
                </div>
              )}
              {discount && (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/20">
                  {discount}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
            {cleanDescription}
          </p>
        </div>

        {/* Metadata & Actions Row */}
        <div className="space-y-2.5 pt-2 border-t border-surface-container-low">
          <div className="flex flex-wrap items-center justify-between gap-2 text-outline font-label-md text-[11px]">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {verifiedText && (
                <span className="flex items-center gap-1 text-secondary font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{verifiedText}</span>
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 text-error font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{effectiveDate}</span>
              </span>
              {region && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <MapPin className="w-3 h-3 text-outline shrink-0" />
                    <span>{region}</span>
                  </span>
                </>
              )}
            </div>

            {/* Upvote button */}
            <button
              onClick={handleVote}
              disabled={hasVoted}
              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                hasVoted 
                  ? 'bg-secondary/10 text-secondary' 
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
              }`}
              title="Glasuj za to ugodnost"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
              <span>{votes}</span>
            </button>
          </div>

          {/* Promo Code or Direct Link CTA */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {code ? (
              <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-surface-container/60">
                <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Koda:</span>
                <span className="font-mono font-bold text-primary px-2 py-0.5 bg-surface-container-lowest rounded select-all text-xs border border-surface-container">
                  {code}
                </span>
                <button 
                  onClick={handleCopy}
                  className="p-1 text-outline hover:text-primary transition-colors cursor-pointer" 
                  title="Kopiraj kodo" 
                  type="button"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {copied && <span className="text-[10px] font-bold text-secondary">Kopirano!</span>}
              </div>
            ) : (
              <span className="text-xs text-outline italic">Koda ni potrebna (akcija)</span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <ShareMenu 
                id={id} 
                type="deal" 
                title={title} 
                description={description} 
                url={`${window.location.origin}${postUrl}`}
                showLabel={true} 
                buttonClassName="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container" 
              />
              <a
                href={postUrl}
                onClick={handleOpenDetail}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container"
                title="Odpri celotno stran te ugodnosti s komentarji"
              >
                <span>Stran objave</span>
              </a>
              <a 
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Uveljavi popust</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

