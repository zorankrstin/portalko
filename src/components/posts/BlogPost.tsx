import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { LikeButton } from "../LikeButton";
import { BookOpen, MoreHorizontal, Camera, Heart, MessageCircle, Eye, ArrowRight } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType } from "../../types";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { handleImageFallbackError, getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, buildTagUrl, navigateApp, slugify } from "../../utils/urlUtils";
import { parseTags } from "../../utils/tagUtils";
import { UserAvatar } from "../common/UserAvatar";
import { VerifiedBadge } from "../common/VerifiedBadge";
import { isUserVerified } from "../../utils/userVerificationUtils";
import { useAuth } from "../../contexts/AuthContext";
import { ResilientEmbedImage } from "../common/EmbedThumbnailPlaceholder";
import { EmbedSourceBadge } from "../common/ExternalSourceEmbedCard";
import {
  filterRealStoredImages,
  getDirectVideoThumbnailUrl,
  resolvePostExternalUrlCandidate,
  useResolvedExternalEmbedState,
} from "../../services/externalEmbedService";
import type { PostDetailTarget } from "../../types";

export interface BlogPostProps {
  id?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  author?: string;
  authorName?: string;
  authorId?: string;
  authorRole?: string;
  authorAvatar?: string;
  date?: string;
  location?: string;
  description?: string;
  excerpt?: string;
  image?: string;
  images?: string[];
  readTime?: string;
  photoCount?: string;
  likesCount?: string;
  lovesCount?: string | number;
  dislikesCount?: string | number;
  commentsCount?: string;
  viewsCount?: string;
  sharesCount?: number;
  tags?: string[] | string;
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
  embedCode?: string;
  externalUrl?: string;
  isExternalEmbed?: boolean;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onTagClick?: (tag: string) => void;
}

export const BlogPost: React.FC<BlogPostProps> = ({ 
  id = "blog",
  title: rawTitle,
  subtitle,
  category = "turizem-izleti",
  categoryName: rawCategoryName,
  subcategory,
  subcategoryName,
  author: rawAuthor,
  authorName,
  authorId,
  authorRole: rawAuthorRole,
  authorAvatar: rawAuthorAvatar,
  date: rawDate,
  location: rawLocation,
  description: rawDescription,
  excerpt,
  image: rawImage,
  images,
  readTime = "5 minut branja",
  photoCount = "8 fotografij",
  likesCount = 0,
  lovesCount = 0,
  dislikesCount = 0,
  commentsCount = "0 komentarjev",
  viewsCount = "1.420 ogledov",
  sharesCount = 0,
  tags = [],
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  embedCode,
  externalUrl,
  isExternalEmbed,
  onNavigatePost,
  onTagClick,
}) => {
  const isDemoBlog = !id || id === 'blog';
  const title = rawTitle ?? (isDemoBlog ? "Potep po dolini Soče: 5 skritih kotičkov, ki jih morate obiskati to pomlad" : "Objava");
  const categoryName = rawCategoryName ?? (isDemoBlog ? "Turizem & Izleti" : "Blog");
  const date = rawDate ?? (isDemoBlog ? "Pred 2 urama" : "Nedavno");
  const location = rawLocation ?? (isDemoBlog ? "Dolina Soče, Bovec" : "Slovenija");
  const description = rawDescription ?? (isDemoBlog ? "Pomlad ob smaragdni reki ponuja popolno tišino pred glavno turistično sezono. Odkrili smo manj znane slapove, neobljudene tolmunčke v Trenti ter domačo sirarno v vasi Čezsoča, kjer še vedno ohranjajo stoletno tradicijo izdelave bovškega sira." : "");
  const image = rawImage ?? (isDemoBlog ? "https://lh3.googleusercontent.com/aida-public/AB6AXuDmfcqLkX6EpehopwShblWWWTErEk6fiZmrLuObihcFhQPTTdN1UP0HwAJWNxbpewO7AD8rNtHki7D2UQxR3ruAprxzai0oCSFiLO7Ucc2eM__0HctsIVOGVfYNHax9soqlpthUdhwDbTst0e68dCdSFOM0wasuTUnvpZCJ__StsF3T8Qey5cE-RGiZXa7sEzk59Ev8spqvVpe-6CJ-6XR19xlIiJd9yyxqk2aRczUvHRHR4HUWu0Zv" : undefined);

  const { users, currentUser } = useAuth();
  const rawAuthorCandidate = authorName?.trim() || rawAuthor?.trim() || '';
  const matchedAuthorUser = React.useMemo(() => {
    if (!users || users.length === 0) return undefined;
    if (authorId) {
      const byId = users.find((u) => u.id === authorId || u.googleId === authorId);
      if (byId) return byId;
    }
    if (!rawAuthorCandidate) return undefined;
    return users.find(
      (u) =>
        u.name &&
        (u.name.trim().toLowerCase() === rawAuthorCandidate.toLowerCase() ||
          slugify(u.name) === slugify(rawAuthorCandidate))
    );
  }, [users, authorId, rawAuthorCandidate]);

  const effectiveAuthorId = matchedAuthorUser?.id || authorId;
  const author =
    (authorId && matchedAuthorUser?.name?.trim()) ||
    rawAuthorCandidate ||
    matchedAuthorUser?.name?.trim() ||
    (isDemoBlog ? "Uredništvo Portalko.net" : "Avtor");
  const authorRole = matchedAuthorUser?.role || rawAuthorRole || (isDemoBlog ? "admin" : "Član skupnosti");
  const authorAvatar = matchedAuthorUser?.avatar || rawAuthorAvatar || (currentUser?.id && effectiveAuthorId === currentUser.id ? currentUser.avatar : undefined);

  const normalizedTags = parseTags(tags);
  const finalDesc = excerpt || description;

  const isAuthorVerified = isUserVerified({
    role: authorRole,
    userId: effectiveAuthorId,
    name: author,
    users,
  });

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

  const portalBrokenFallback = getActiveFallbackImage(false);
  const realStoredImages = React.useMemo(
    () => filterRealStoredImages([image, ...(images || [])], portalBrokenFallback),
    [image, images, portalBrokenFallback]
  );
  const hasDbImage = realStoredImages.length > 0;
  const sourceEmbedUrl = React.useMemo(
    () => resolvePostExternalUrlCandidate(
      { embedCode, externalUrl, description: finalDesc },
      { includeSocialEmbeds: true }
    ),
    [embedCode, externalUrl, finalDesc]
  );
  const candidateUrl = !hasDbImage ? sourceEmbedUrl : undefined;
  const { data: resolvedEmbedMeta, isLoading: isExternalMetaLoading } = useResolvedExternalEmbedState(
    candidateUrl,
    !candidateUrl || hasDbImage
  );
  const extractedImage = (!hasDbImage
    ? (resolvedEmbedMeta?.imageUrl || getDirectVideoThumbnailUrl(embedCode || candidateUrl))
    : '') || '';

  const resolveInitialImage = () => {
    if (realStoredImages[0]) return realStoredImages[0];
    if (extractedImage) return extractedImage;
    if (!sourceEmbedUrl) {
      return getActiveFallbackImage(true, 'blog') || '';
    }
    return '';
  };
  const [imgSrc, setImgSrc] = React.useState<string>(resolveInitialImage());
  const [hasError, setHasError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasError(false);
  }, [realStoredImages, extractedImage, sourceEmbedUrl]);

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
          id,
          title,
          category,
          categoryName,
          subcategory,
          subcategoryName,
          author,
          authorName: author,
          authorId: effectiveAuthorId,
          authorRole,
          authorAvatar,
          image: (imgSrc && !hasError ? imgSrc : '') || realStoredImages[0] || '',
          images: realStoredImages.length > 0 ? realStoredImages : (imgSrc && !hasError ? [imgSrc] : []),
          date,
          location,
          description: finalDesc,
          embedCode,
          externalUrl,
          isExternalEmbed,
          likesCount: typeof likesCount === 'number' ? likesCount : (parseInt(String(likesCount).replace(/\D/g, ''), 10) || 0),
          viewsCount,
          commentsCount,
          tags: normalizedTags.length > 0 ? normalizedTags : undefined,
        },
      });
    } else {
      window.history.pushState({ type: 'blog', id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const effectiveImage = (imgSrc && !hasError ? imgSrc : '') || realStoredImages[0] || '';

  const bookmarkData = {
    type: 'blog',
    category: 'blog',
    title,
    author,
    authorName: author,
    authorId: effectiveAuthorId,
    authorRole,
    authorAvatar,
    categoryName,
    subcategory,
    subcategoryName,
    date,
    location,
    description: finalDesc,
    image: effectiveImage,
    images: realStoredImages.length > 0 ? realStoredImages : undefined,
    tags: normalizedTags.length > 0 ? normalizedTags : undefined,
    embedCode,
    externalUrl,
    isExternalEmbed,
    readTime,
    photoCount,
  };

  return (
    <article className={`bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg flex flex-col gap-3.5 group/article ${
      isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/60 hover:border-primary/25'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={authorUrl}
            data-author-name={author}
            data-author-id={effectiveAuthorId}
            data-author-avatar={authorAvatar}
            data-author-role={authorRole}
            data-post-id={id}
            data-post-type="blog"
            data-post-title={title}
            data-post-image={image}
            data-post-category={categoryName || category}
            data-post-location={location}
            className="group/author shrink-0 focus:outline-none"
            title={`Ogled profila avtorja: ${author}`}
          >
            <UserAvatar
              src={authorAvatar}
              name={author}
              userId={effectiveAuthorId}
              role={authorRole}
              size="md"
              className="w-11 h-11 ring-2 ring-primary/10 group-hover/avatar:ring-primary/40 transition-all"
            />
          </a>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={authorUrl}
                data-author-name={author}
                data-author-id={effectiveAuthorId}
                data-author-avatar={authorAvatar}
                data-author-role={authorRole}
                data-post-id={id}
                data-post-type="blog"
                data-post-title={title}
                data-post-image={image}
                data-post-category={categoryName || category}
                data-post-location={location}
                className="font-headline-sm text-sm font-bold text-on-surface hover:text-primary hover:underline transition-colors flex items-center gap-1 truncate"
                title={`Ogled profila avtorja: ${author}`}
              >
                <span>{author}</span>
                {isAuthorVerified && (
                  <VerifiedBadge size="xs" />
                )}
              </a>
              <span className="font-label-caps text-label-caps bg-surface-container-high/80 text-on-surface-variant px-2 py-0.5 rounded-md font-semibold">{authorRole}</span>
            </div>
            <p className="font-body-sm text-xs text-outline flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>{date}</span>
              {categoryName && (
                <>
                  <span>•</span>
                  <span className="text-primary font-semibold">{categoryName}</span>
                </>
              )}
              {location && (
                <>
                  <span>•</span>
                  <span>{location}</span>
                </>
              )}
              {(isExternalEmbed || sourceEmbedUrl) && (
                <>
                  <span>•</span>
                  <EmbedSourceBadge
                    externalUrl={sourceEmbedUrl || externalUrl}
                    sourceName={resolvedEmbedMeta?.siteName}
                    sourceDomain={resolvedEmbedMeta?.domain}
                    sourceFavicon={resolvedEmbedMeta?.faviconUrl}
                    size="sm"
                  />
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPromoted && (
            <PromotedBadge type={promotionBadgeType} size="sm" />
          )}
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-fixed/70 text-on-primary-fixed font-label-caps text-[11px] font-bold tracking-wide">
            <BookOpen className="w-3.5 h-3.5" /> Blog
          </span>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu 
            id={id} 
            type="blog" 
            title={title} 
            description={description} 
            url={`${window.location.origin}${postUrl}`}
            imageUrl={effectiveImage}
            category={categoryName || category}
            author={author}
            date={date}
            showCount={false}
            initialSharesCount={sharesCount}
          />
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
      
      <div className="flex flex-col gap-2 pt-0.5">
        <a 
          href={postUrl}
          onClick={handleOpenDetail}
          className="block group/title cursor-pointer"
          title="Odpri samostojno stran članka"
        >
          <h2 className="font-headline-md text-[21px] sm:text-[24px] font-extrabold text-on-surface leading-[1.26] tracking-[-0.018em] group-hover/title:text-primary transition-colors">
            {title}
          </h2>
          {subtitle && subtitle.trim() && (
            <p className="text-sm sm:text-[15px] font-semibold text-primary/85 leading-snug mt-1.5">
              {subtitle.trim()}
            </p>
          )}
        </a>
        <p className="font-body-md text-[14.5px] sm:text-[15px] text-on-surface-variant/90 line-clamp-3 leading-[1.62]">
          {getPlainTextSnippet(finalDesc)}
        </p>
      </div>
      
      {(imgSrc || isExternalEmbed || externalUrl || embedCode) && (
        <a
          href={postUrl}
          onClick={handleOpenDetail}
          className="relative rounded-xl overflow-hidden aspect-[16/9] max-h-80 w-full bg-surface-container block cursor-pointer group/img ring-1 ring-black/5"
          title="Odpri samostojno stran članka"
        >
          <ResilientEmbedImage
            className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-500"
            src={imgSrc}
            fallbackSrcs={[...realStoredImages.slice(1), ...(resolvedEmbedMeta?.images || [])]}
            alt={title}
            showLoadingShimmer={true}
            isMetadataLoading={isExternalMetaLoading && !hasDbImage}
            onAllImagesFailed={() => setHasError(true)}
            placeholderProps={{
              postType: 'blog',
              title,
              sourceDomain: resolvedEmbedMeta?.domain,
              sourceName: resolvedEmbedMeta?.siteName,
              sourceFavicon: resolvedEmbedMeta?.faviconUrl,
              externalUrl: externalUrl || sourceEmbedUrl,
              variant: 'card',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 z-20 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg font-label-md text-[11px] font-medium flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-secondary-fixed" /> {readTime} {photoCount ? `• ${photoCount}` : ''}
          </div>
        </a>
      )}
      
      {normalizedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {normalizedTags.slice(0, 5).map((tag, idx) => (
            <a
              key={`${tag}-${idx}`}
              href={buildTagUrl(tag)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onTagClick) {
                  onTagClick(tag);
                } else {
                  navigateApp(buildTagUrl(tag));
                }
              }}
              className="text-xs font-label-md font-medium text-primary/90 hover:text-on-primary bg-primary/5 hover:bg-primary px-2.5 py-0.5 rounded-lg border border-primary/15 transition-colors cursor-pointer"
              title={`Prikaži vse objave z oznako #${tag}`}
            >
              #{tag}
            </a>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-container-low mt-0.5">
        <div className="flex flex-wrap items-center gap-4 text-on-surface-variant font-label-md text-xs">
          <LikeButton
            id={id}
            targetType="blog"
            initialLikesCount={likesCount}
            variant="card-action"
            itemTitle={title}
            authorId={effectiveAuthorId}
          />
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
            imageUrl={effectiveImage}
            category={categoryName || category}
            author={author}
            date={date}
            showLabel={true}
            showCount={true}
            initialSharesCount={sharesCount}
            buttonClassName="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-on-surface-variant font-label-md text-xs group"
          />
        </div>

        <div className="flex items-center gap-2">
          <a
            href={postUrl}
            onClick={handleOpenDetail}
            className="px-3.5 py-1.5 rounded-xl bg-primary/8 hover:bg-primary text-primary hover:text-on-primary font-label-md text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer border border-primary/20 shadow-2xs"
            title="Preberi celoten članek"
          >
            <span>Preberi članek</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
