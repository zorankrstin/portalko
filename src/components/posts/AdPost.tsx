import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { LikeButton } from "../LikeButton";
import { MapPin, Phone } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType, PostDetailTarget } from "../../types";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, buildTagUrl, navigateApp, slugify } from "../../utils/urlUtils";
import { parseTags } from "../../utils/tagUtils";
import { UserAvatar } from "../common/UserAvatar";
import { isUserUploadedAvatar, resolveUserUploadedAvatar } from "../../utils/avatarUtils";
import { VerifiedBadge } from "../common/VerifiedBadge";
import { isUserVerified } from "../../utils/userVerificationUtils";
import { useAuth } from "../../contexts/AuthContext";
import { ExternalLink } from 'lucide-react';
import { ExternalSourceInline } from "../common/ExternalSourceEmbedCard";
import { ResilientEmbedImage } from "../common/EmbedThumbnailPlaceholder";
import {
  extractDomainFromUrl,
  filterRealStoredImages,
  normalizeExternalUrl,
  resolvePostExternalUrlCandidate,
  useResolvedExternalEmbedState,
} from "../../services/externalEmbedService";

export interface AdPostProps {
  id?: string;
  title?: string;
  subtitle?: string;
  price?: string;
  author?: string;
  authorName?: string;
  authorId?: string;
  authorAvatar?: string;
  authorRole?: string;
  authorInitials?: string;
  location?: string;
  date?: string;
  description?: string;
  categoryName?: string;
  category?: string;
  subcategory?: string;
  subcategoryName?: string;
  image?: string;
  images?: string[];
  status?: string;
  likesCount?: number | string;
  lovesCount?: number | string;
  dislikesCount?: number | string;
  tags?: string[] | string;
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
  isExternalEmbed?: boolean;
  externalUrl?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceFavicon?: string;
  fetchedAt?: string;
  embedCode?: string;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onTagClick?: (tag: string) => void;
}

export const AdPost: React.FC<AdPostProps> = ({ 
  id = "ad",
  title: rawTitle,
  subtitle,
  price: rawPrice,
  author: rawAuthor,
  authorName,
  authorId,
  authorAvatar: rawAuthorAvatar,
  authorRole: rawAuthorRole,
  authorInitials,
  location: rawLocation,
  date: rawDate,
  description: rawDescription,
  categoryName: rawCategoryName,
  category = "elektronika",
  subcategory,
  subcategoryName,
  image,
  images,
  status = "Aktivno",
  likesCount = 0,
  lovesCount = 0,
  dislikesCount = 0,
  tags,
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  isExternalEmbed,
  externalUrl,
  sourceName,
  sourceDomain,
  sourceFavicon,
  fetchedAt,
  embedCode,
  onNavigatePost,
  onTagClick,
}) => {
  const isDemoAd = !id || id === 'ad';
  const title = rawTitle ?? (isDemoAd ? "Apple iPhone 15 Pro 128GB - Naravni Titan, garancija do nov. 2025" : "Mali oglas");
  const price = rawPrice ?? (isDemoAd ? "790 €" : "Po dogovoru");
  const location = rawLocation ?? (isDemoAd ? "Ljubljana" : "Slovenija");
  const date = rawDate ?? (isDemoAd ? "Danes" : "");
  const description = rawDescription ?? (isDemoAd ? "Telefon je brezhiben, od prvega dne nošen v originalnem Apple usnjenem ovitku ter z nameščenim PanzerGlass steklom." : "");
  const categoryName = rawCategoryName ?? (isDemoAd ? "Telefonija" : "Mali oglas");

  const { users, currentUser } = useAuth();
  const rawAuthorCandidateRaw = authorName?.trim() || rawAuthor?.trim() || '';
  const dummyAdAuthors = new Set(['marko k.', 'organizator', 'avtor', 'uporabnik', 'neznan avtor']);
  const rawAuthorCandidate =
    !isDemoAd && dummyAdAuthors.has(rawAuthorCandidateRaw.toLowerCase()) ? '' : rawAuthorCandidateRaw;

  const matchedAuthorUser = React.useMemo(() => {
    if (!users || users.length === 0) return undefined;
    if (authorId) {
      const byId = users.find(
        (u) =>
          u.id === authorId ||
          u.googleId === authorId ||
          (u.alternateIds && u.alternateIds.includes(authorId))
      );
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
    matchedAuthorUser?.name?.trim() ||
    rawAuthorCandidate ||
    (isDemoAd ? "Marko K." : "Uporabnik");
  const authorRole = rawAuthorRole || matchedAuthorUser?.role || "Uporabnik";
  const authorAvatar = resolveUserUploadedAvatar(
    matchedAuthorUser ? matchedAuthorUser.avatar : rawAuthorAvatar,
    effectiveAuthorId,
    author,
    users,
    currentUser
  );

  const normalizedTags = parseTags(tags);
  const postUrl = buildPostUrl({
    type: 'ad',
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
        type: 'ad',
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
          image: imgSrc || image || (images && images[0]) || '',
          images: (images && images.length > 0)
            ? images
            : (resolvedExternalMeta?.images && resolvedExternalMeta.images.length > 0
                ? resolvedExternalMeta.images
                : (image ? [image] : (imgSrc ? [imgSrc] : []))),
          price: effectivePrice,
          location,
          date,
          description: cleanDescription || description,
          tags: normalizedTags.length > 0 ? normalizedTags : undefined,
          likesCount: typeof likesCount === 'number' ? likesCount : (parseInt(String(likesCount).replace(/\D/g, ''), 10) || 0),
          embedCode,
          isExternalEmbed: effectiveIsExternalEmbed,
          externalUrl: effectiveExternalUrl,
          sourceName: effectiveSourceName,
          sourceDomain: effectiveSourceDomain,
          sourceFavicon: effectiveSourceFavicon,
          fetchedAt: effectiveFetchedAt,
        },
      });
    } else {
      window.history.pushState({ type: 'ad', id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const candidateExternalUrl = React.useMemo(
    () => resolvePostExternalUrlCandidate({ externalUrl, embedCode, description, isExternalEmbed }),
    [externalUrl, embedCode, description, isExternalEmbed]
  );

  const portalBrokenFallback = getActiveFallbackImage(false);
  const realStoredImages = React.useMemo(
    () => filterRealStoredImages([image, ...(images || [])], portalBrokenFallback),
    [image, images, portalBrokenFallback]
  );
  const hasStoredImage = realStoredImages.length > 0;

  const { data: resolvedExternalMeta, isLoading: isExternalMetaLoading } = useResolvedExternalEmbedState(
    candidateExternalUrl,
    !candidateExternalUrl || hasStoredImage
  );

  const effectiveExternalUrl = externalUrl || candidateExternalUrl || resolvedExternalMeta?.url;
  const effectiveIsExternalEmbed = Boolean(isExternalEmbed || effectiveExternalUrl);
  const effectiveSourceName = sourceName || resolvedExternalMeta?.siteName;
  const effectiveSourceDomain = sourceDomain || resolvedExternalMeta?.domain;
  const effectiveSourceFavicon = sourceFavicon || resolvedExternalMeta?.faviconUrl;
  const effectiveFetchedAt = fetchedAt || resolvedExternalMeta?.fetchedAt;
  const effectivePrice =
    (!price || price === "Po dogovoru") && resolvedExternalMeta?.price
      ? resolvedExternalMeta.price
      : price;

  const resolveInitialImage = () => {
    if (realStoredImages[0]) return realStoredImages[0];
    if (resolvedExternalMeta?.imageUrl) return resolvedExternalMeta.imageUrl;
    if (resolvedExternalMeta?.images && resolvedExternalMeta.images.length > 0) return resolvedExternalMeta.images[0];
    if (!candidateExternalUrl) {
      const fallback = getActiveFallbackImage(true);
      return fallback || '';
    }
    return '';
  };

  const [imgSrc, setImgSrc] = React.useState<string>(resolveInitialImage());
  const [hasError, setHasError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasError(false);
  }, [realStoredImages, resolvedExternalMeta, candidateExternalUrl]);

  const handleImageError = () => {
    const fallback = getActiveFallbackImage(false);
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
      return;
    }
    setHasError(true);
  };

  const hasVisibleImage = !!imgSrc && !hasError;
  const shouldShowMediaSlot = Boolean(imgSrc || effectiveIsExternalEmbed || embedCode);
  const displayCategory = categoryName || category || 'Oglas';
  const rawCleanDesc = getPlainTextSnippet(description);
  const cleanDescription = rawCleanDesc || (resolvedExternalMeta?.description ? getPlainTextSnippet(resolvedExternalMeta.description) : '');

  const isAuthorVerified = isUserVerified({
    role: authorRole,
    userId: effectiveAuthorId,
    name: author,
    users,
  });

  const bookmarkData = {
    type: 'ad',
    category: 'ads',
    title,
    price: effectivePrice,
    author,
    authorName: author,
    authorId: effectiveAuthorId,
    authorRole,
    authorAvatar: (authorAvatar && isUserUploadedAvatar(authorAvatar)) ? authorAvatar : undefined,
    categoryName,
    subcategory,
    subcategoryName,
    location,
    date,
    description: cleanDescription,
    image: hasVisibleImage ? imgSrc : undefined,
    images: realStoredImages.length > 0 ? realStoredImages : undefined,
    tags: normalizedTags.length > 0 ? normalizedTags : undefined,
    embedCode,
    isExternalEmbed: effectiveIsExternalEmbed,
    externalUrl: effectiveExternalUrl,
    sourceName: effectiveSourceName,
    sourceDomain: effectiveSourceDomain,
    sourceFavicon: effectiveSourceFavicon,
  };

  return (
    <article className={`bg-surface-container-lowest rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-md flex flex-col sm:flex-row ${
      isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50 hover:border-surface-container-high'
    }`}>
      {shouldShowMediaSlot && (
        <a 
          href={postUrl}
          onClick={handleOpenDetail}
          className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group overflow-hidden"
          title="Odpri samostojno stran tega malega oglasa"
        >
          <ResilientEmbedImage
            src={imgSrc}
            fallbackSrcs={[...realStoredImages.slice(1), ...(resolvedExternalMeta?.images || [])]}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            showLoadingShimmer={true}
            isMetadataLoading={isExternalMetaLoading && !hasStoredImage}
            onAllImagesFailed={() => setHasError(true)}
            placeholderProps={{
              postType: 'ad',
              title,
              sourceDomain: effectiveSourceDomain,
              sourceName: effectiveSourceName,
              sourceFavicon: effectiveSourceFavicon,
              externalUrl: effectiveExternalUrl,
              variant: 'card',
            }}
          />
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 flex-wrap">
            {isPromoted && (
              <PromotedBadge type={promotionBadgeType} size="sm" />
            )}
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white font-label-caps text-[10px] font-bold uppercase tracking-wider">
              {displayCategory}
            </span>
          </div>
        </a>
      )}
      <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
        <div>
          {!shouldShowMediaSlot && (
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-surface-container font-label-caps text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                {displayCategory}
              </span>
              {isPromoted && (
                <PromotedBadge type={promotionBadgeType} size="sm" />
              )}
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <span className="font-headline-lg text-xl font-bold text-primary">{effectivePrice}</span>
            <div className="flex items-center gap-1">
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu 
                id={id} 
                type="ad" 
                title={title} 
                description={cleanDescription} 
                url={`${window.location.origin}${postUrl}`}
                imageUrl={hasVisibleImage ? imgSrc : (realStoredImages[0] || undefined)}
                category={categoryName || category}
                author={author}
                price={price}
                location={location}
              />
              <ReportButton 
                targetId={id} 
                targetType="ad" 
                targetTitle={title} 
                targetAuthor={author} 
              />
            </div>
          </div>
          <a
            href={postUrl}
            onClick={handleOpenDetail}
            className="block group/title cursor-pointer"
          >
            <h3 className="font-headline-md text-base font-bold text-on-surface line-clamp-2 mt-1 group-hover/title:text-primary transition-colors">
              {title}
            </h3>
            {subtitle && subtitle.trim() && (
              <p className="font-headline-xs text-xs font-medium text-on-surface-variant/90 line-clamp-1 mt-0.5">
                {subtitle.trim()}
              </p>
            )}
          </a>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1">{cleanDescription}</p>
          {normalizedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {normalizedTags.slice(0, 4).map((tag, idx) => (
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
                  className="text-[11px] font-label-md font-medium text-primary/90 hover:text-on-primary bg-primary/8 hover:bg-primary px-2 py-0.5 rounded-md border border-primary/15 transition-colors cursor-pointer"
                  title={`Prikaži vse objave z oznako #${tag}`}
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low text-xs text-outline">
          <div className="flex items-center gap-2 flex-wrap">
            {author && (
              <>
                <a
                  href={authorUrl}
                  data-author-name={author}
                  data-author-id={effectiveAuthorId}
                  data-author-avatar={(authorAvatar && isUserUploadedAvatar(authorAvatar)) ? authorAvatar : ''}
                  data-author-role={authorRole}
                  data-post-id={id}
                  data-post-type="ad"
                  data-post-title={title}
                  data-post-image={image}
                  data-post-category={categoryName || category}
                  data-post-price={price}
                  data-post-location={location}
                  className="inline-flex items-center gap-1.5 font-semibold text-on-surface hover:text-primary hover:underline transition-colors"
                  title={`Ogled profila prodajalca: ${author}`}
                >
                  <UserAvatar
                    src={authorAvatar}
                    name={author}
                    userId={effectiveAuthorId}
                    role={authorRole}
                    size="xs"
                    className="w-5 h-5 ring-1 ring-surface-container/60 shrink-0"
                  />
                  <span>{author}</span>
                  {isAuthorVerified && (
                    <VerifiedBadge size="xs" />
                  )}
                </a>
                <span>•</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {location} • {date}
            </span>
            {(effectiveIsExternalEmbed || effectiveExternalUrl) && (
              <>
                <span>•</span>
                <ExternalSourceInline
                  isExternalEmbed={effectiveIsExternalEmbed}
                  externalUrl={effectiveExternalUrl}
                  sourceName={effectiveSourceName}
                  sourceDomain={effectiveSourceDomain}
                  sourceFavicon={effectiveSourceFavicon}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LikeButton 
              id={id} 
              targetType="ad" 
              initialLikesCount={likesCount} 
              variant="pill" 
              itemTitle={title} 
              authorId={effectiveAuthorId}
              showLabel={false}
              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-surface-container" 
            />
            <ShareMenu 
              id={id} 
              type="ad" 
              title={title} 
              description={cleanDescription || description} 
              url={`${window.location.origin}${postUrl}`}
              imageUrl={hasVisibleImage ? imgSrc : (realStoredImages[0] || undefined)}
              category={categoryName || category}
              author={author}
              price={effectivePrice}
              location={location}
              showLabel={true} 
              buttonClassName="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container" 
            />
            {effectiveExternalUrl && (
              <a
                href={normalizeExternalUrl(effectiveExternalUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border border-primary/25"
                title={`Odpri izvirni oglas na ${effectiveSourceDomain || extractDomainFromUrl(effectiveExternalUrl)}`}
              >
                <span>Odpri vir</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button 
              onClick={handleOpenDetail}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{effectiveExternalUrl ? 'Podrobnosti' : 'Kontakt'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
