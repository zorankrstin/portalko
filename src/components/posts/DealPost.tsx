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
  startDate?: string;
  expirationDate?: string;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  date?: string;
  description?: string;
  code?: string;
  link?: string;
  votesCount?: number;
  lovesCount?: number;
  dislikesCount?: number;
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
  title = "",
  discount = "",
  oldPrice,
  newPrice,
  startDate,
  expirationDate,
  author = "Partner",
  authorRole = "Preverjen partner",
  authorAvatar,
  date = "",
  description = "",
  code,
  link = "",
  votesCount = 0,
  lovesCount = 0,
  dislikesCount = 0,
  image = "",
  categoryName = "Ugodnosti",
  category = "ugodnosti",
  subcategory,
  subcategoryName,
  region = "Vsa Slovenija",
  verifiedText = "",
  featured = false,
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  onNavigatePost,
}) => {
  const [copied, setCopied] = useState(false);
  const [votes, setVotes] = useState(votesCount);
  const [hasVoted, setHasVoted] = useState(false);

  const cleanTitle = (title || '').replace(/^\[Ugodnost\]\s*/i, '');
  const hasValidCode = Boolean(code && code.trim());

  const postUrl = buildPostUrl({
    type: 'deal',
    id,
    title: cleanTitle,
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
          code: hasValidCode ? code!.trim() : undefined,
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
    if (hasValidCode) {
      navigator.clipboard.writeText(code!.trim());
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

  const formatSlDate = (dStr: string) => dStr.includes('-') ? new Date(dStr).toLocaleDateString('sl-SI') : dStr;
  let effectiveDate = date || "Veljavno do preklica";
  if (startDate && expirationDate) {
    effectiveDate = `Akcija: ${formatSlDate(startDate)} – ${formatSlDate(expirationDate)}`;
  } else if (expirationDate) {
    effectiveDate = `Velja do ${formatSlDate(expirationDate)}`;
  } else if (startDate) {
    effectiveDate = `Od ${formatSlDate(startDate)}`;
  }

  const bookmarkData = {
    type: 'deal',
    category: 'deals',
    title: cleanTitle,
    price: newPrice || discount,
    discount,
    oldPrice,
    newPrice,
    startDate,
    expirationDate,
    author,
    authorRole,
    authorAvatar: avatarSrc,
    date: effectiveDate,
    description: cleanDescription,
    image: hasVisibleImage ? imgSrc : undefined,
    code: hasValidCode ? code!.trim() : undefined,
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
            alt={cleanTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            loading="lazy"
            onError={handleImageError}
          />
        </a>
      )}

      {/* CONTENT AREA */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3">
        <div>
          {/* Header Row: Partner info, role, and actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href={authorUrl}
                data-author-name={author}
                data-author-id={authorId}
                data-author-avatar={avatarSrc || authorAvatar}
                data-author-role={authorRole || 'partner'}
                data-post-id={id}
                data-post-type="deal"
                data-post-title={cleanTitle}
                data-post-image={imgSrc}
                data-post-category={categoryName || category}
                data-post-price={newPrice || discount || oldPrice}
                data-post-location={region}
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
                  data-author-name={author}
                  data-author-id={authorId}
                  data-author-avatar={avatarSrc || authorAvatar}
                  data-author-role={authorRole || 'partner'}
                  data-post-id={id}
                  data-post-type="deal"
                  data-post-title={cleanTitle}
                  data-post-image={imgSrc}
                  data-post-category={categoryName || category}
                  data-post-price={newPrice || discount || oldPrice}
                  data-post-location={region}
                  className="font-label-lg text-xs sm:text-sm font-bold text-on-surface hover:text-primary hover:underline truncate transition-colors"
                  title={`Ogled profila partnerja: ${author}`}
                >
                  {author}
                </a>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <LikeButton 
                id={id} 
                targetType="deal" 
                initialLikesCount={votesCount} 
                initialLovesCount={lovesCount}
                initialDislikesCount={dislikesCount}
                variant="minimal" 
                showCount={true} 
                itemTitle={cleanTitle} 
              />
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu id={id} type="deal" title={cleanTitle} description={description} url={`${window.location.origin}${postUrl}`} />
              <ReportButton 
                targetId={id} 
                targetType="deal" 
                targetTitle={cleanTitle} 
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
              {cleanTitle}
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
            {hasValidCode ? (
              <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-xl border border-surface-container/60">
                <span className="font-label-caps text-[10px] text-outline uppercase font-bold">Koda:</span>
                <span className="font-mono font-bold text-primary px-2 py-0.5 bg-surface-container-lowest rounded select-all text-xs border border-surface-container">
                  {code!.trim()}
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
            ) : null}

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

