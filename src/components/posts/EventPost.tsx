import React, { useState, useEffect, useMemo } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { LikeButton } from "../LikeButton";
import { MapPin, Star, Ticket, Clock, ExternalLink, Calendar } from 'lucide-react';
import { PromotedBadge } from "../common/PromotedBadge";
import { PromotionBadgeType, PostDetailTarget, EventScheduleSlot } from "../../types";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, buildTagUrl, navigateApp, slugify } from "../../utils/urlUtils";
import { parseTags } from "../../utils/tagUtils";
import { useEventFilter } from "../../contexts/EventFilterContext";
import { useAuth } from "../../contexts/AuthContext";
import { isDummyAvatar, isUserUploadedAvatar, resolveUserUploadedAvatar, KNOWN_ADMIN_IDS } from "../../utils/avatarUtils";
import { UserAvatar } from "../common/UserAvatar";
import { resolveEventDisplayDate } from "../../utils/dateUtils";
import { VerifiedBadge } from "../common/VerifiedBadge";
import { isUserVerified } from "../../utils/userVerificationUtils";
import { EventReminderButton } from "../events/EventReminderButton";
import { ResilientEmbedImage } from "../common/EmbedThumbnailPlaceholder";
import { EmbedSourceBadge } from "../common/ExternalSourceEmbedCard";
import {
  filterRealStoredImages,
  getDirectVideoThumbnailUrl,
  resolvePostExternalUrlCandidate,
  useResolvedExternalEmbedState,
} from "../../services/externalEmbedService";

export interface EventPostProps {
  id?: string;
  title?: string;
  subtitle?: string;
  organizer?: string;
  author?: string;
  authorName?: string;
  authorId?: string;
  authorAvatar?: string;
  authorRole?: string;
  categoryName?: string;
  category?: string;
  subcategory?: string;
  subcategoryName?: string;
  location?: string;
  region?: string;
  date?: string;
  eventDate?: string;
  time?: string;
  eventTime?: string;
  eventDates?: string[];
  eventSchedule?: EventScheduleSlot[];
  month?: string;
  day?: string;
  price?: string;
  ticketUrl?: string;
  description?: string;
  image?: string;
  images?: string[];
  interestedCount?: string | number;
  likesCount?: number | string;
  lovesCount?: number | string;
  dislikesCount?: number | string;
  tags?: string[] | string;
  isPromoted?: boolean;
  promotionBadgeType?: PromotionBadgeType;
  embedCode?: string;
  externalUrl?: string;
  isExternalEmbed?: boolean;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onTagClick?: (tag: string) => void;
  onAuthorClick?: (author: { name: string; id?: string; avatar?: string; role?: string; fromPostTarget?: PostDetailTarget }) => void;
  onCategoryClick?: (category?: string, categoryName?: string, subcategory?: string, subcategoryName?: string) => void;
  onLocationClick?: (location?: string, region?: string) => void;
}

export const EventPost: React.FC<EventPostProps> = ({ 
  id = "event",
  title: rawTitle,
  subtitle,
  organizer,
  author,
  authorName,
  authorId,
  authorAvatar,
  authorRole: rawAuthorRole,
  categoryName: rawCategoryName,
  category = "dogodki",
  subcategory,
  subcategoryName,
  location: rawLocation,
  region,
  date: rawDate,
  eventDate,
  time,
  eventTime,
  eventDates,
  eventSchedule,
  month: rawMonth,
  day: rawDay,
  price,
  ticketUrl,
  description: rawDescription,
  image,
  images,
  interestedCount = 86,
  likesCount = 0,
  lovesCount = 0,
  dislikesCount = 0,
  tags,
  isPromoted = false,
  promotionBadgeType = 'PROMO',
  embedCode,
  externalUrl,
  isExternalEmbed,
  onNavigatePost,
  onTagClick,
  onAuthorClick,
  onCategoryClick,
  onLocationClick,
}) => {
  const isDemoEvent = !id || id === 'event';
  const title = rawTitle ?? (isDemoEvent ? "Literarni večer z domačimi avtorji in akustični koncert Dua Sever" : "Dogodek");
  const categoryName = rawCategoryName ?? (isDemoEvent ? "Kultura & Umetnost • Kranj" : "Dogodek");
  const location = rawLocation ?? (isDemoEvent ? "Kranj, Glavni trg 12" : (region || "Slovenija"));
  const date = rawDate ?? eventDate ?? (isDemoEvent ? "Četrtek, 20. marec ob 19:00" : "");
  const month = rawMonth ?? (isDemoEvent ? "MAR" : "DOG");
  const day = rawDay ?? (isDemoEvent ? "20" : "★");
  const description = rawDescription ?? (isDemoEvent ? "Vabljeni v dvorano Mestna knjižnice Kranj na predstavitev novih pesniških zbirk gorenjskih avtorjev." : "");

  const normalizedTags = parseTags(tags);
  const { filterByEventLocation } = useEventFilter();
  const { users, currentUser } = useAuth();

  const rawAuthorCandidateRaw = authorName?.trim() || organizer?.trim() || author?.trim() || '';
  const dummyEventAuthorNames = new Set([
    'mestna knjižnica kranj',
    'organizator',
    'avtor',
    'uporabnik',
    'partner',
    'portalko partner',
    'neznan avtor',
  ]);
  const rawAuthorCandidate =
    !isDemoEvent && dummyEventAuthorNames.has(rawAuthorCandidateRaw.toLowerCase())
      ? ''
      : rawAuthorCandidateRaw;

  const matchedAuthorUser = useMemo(() => {
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
  const effectiveAuthorRole = matchedAuthorUser?.role || rawAuthorRole || 'Organizator';
  const effectiveAuthorDisplayName =
    (authorId && matchedAuthorUser?.name?.trim()) ||
    matchedAuthorUser?.name?.trim() ||
    rawAuthorCandidate ||
    (isDemoEvent ? 'Mestna knjižnica Kranj' : 'Organizator');

  const effectiveAuthorAvatar = useMemo(() => {
    return resolveUserUploadedAvatar(
      authorAvatar || matchedAuthorUser?.avatar,
      effectiveAuthorId,
      effectiveAuthorDisplayName,
      users,
      currentUser
    );
  }, [authorAvatar, matchedAuthorUser?.avatar, effectiveAuthorId, effectiveAuthorDisplayName, users, currentUser]);

  const handleLocationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLocationClick) {
      onLocationClick(location, region);
    } else {
      filterByEventLocation(location, region);
    }
  };
  const [currentCount, setCurrentCount] = useState<number>(
    typeof interestedCount === 'number' ? interestedCount : parseInt(String(interestedCount)) || 86
  );
  const [isInterested, setIsInterested] = useState(false);

  const postUrl = buildPostUrl({
    type: 'event',
    id,
    title,
    category,
    categoryName,
    subcategory,
    subcategoryName,
  });

  const authorUrl = `/avtor/${slugify(effectiveAuthorDisplayName)}`;

  const effectiveTime = eventTime || time;

  const distinctScheduleLocations = useMemo(() => {
    if (!eventSchedule || !Array.isArray(eventSchedule)) return [];
    const locs = eventSchedule.map(s => s.location?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(locs));
  }, [eventSchedule]);
  const hasMultipleLocations = distinctScheduleLocations.length > 1;

  // Dynamically resolve next earliest upcoming date if multiple dates or schedule exist
  const resolvedDate = useMemo(() => {
    return resolveEventDisplayDate({
      eventDate: eventDate || (eventDates && eventDates[0]) || date,
      date,
      eventDates,
      eventSchedule,
      eventTime: effectiveTime,
      location,
    });
  }, [eventDate, date, eventDates, eventSchedule, effectiveTime, location]);

  const displayDate = resolvedDate.dateInfo.fullDate || date;
  const displayMonth = resolvedDate.dateInfo.month || month || 'DOG';
  const displayDay = resolvedDate.dateInfo.day || day || '★';
  const displayTime = resolvedDate.eventTime || effectiveTime;
  const displayLocation = (hasMultipleLocations ? location : (resolvedDate.location || location)) || 'Slovenija';
  const showDistinctTime = displayTime && !displayDate?.includes(displayTime);

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      onNavigatePost({
        type: 'event',
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
          author: effectiveAuthorDisplayName,
          authorName: effectiveAuthorDisplayName,
          organizer: effectiveAuthorDisplayName,
          authorId: effectiveAuthorId,
          authorAvatar: effectiveAuthorAvatar,
          authorRole: effectiveAuthorRole,
          image: imgSrc || image || '',
          images: (images && images.length > 0) ? images : (image ? [image] : (imgSrc ? [imgSrc] : [])),
          location: displayLocation,
          date: displayDate,
          time: displayTime,
          eventTime: displayTime,
          eventDate: resolvedDate.dateYmd,
          eventDates,
          eventSchedule,
          price,
          ticketUrl,
          description,
          tags: normalizedTags.length > 0 ? normalizedTags : undefined,
          likesCount: typeof likesCount === 'number' ? likesCount : (parseInt(String(likesCount).replace(/\D/g, ''), 10) || 0),
          interestedCount,
          embedCode,
          externalUrl: resolvedExternalUrl || externalUrl,
          isExternalEmbed: Boolean(isExternalEmbed || resolvedExternalUrl),
        },
      });
    } else {
      window.history.pushState({ type: 'event', id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const portalBrokenFallback = getActiveFallbackImage(false);
  const realStoredImages = useMemo(
    () => filterRealStoredImages([image, ...(images || [])], portalBrokenFallback),
    [image, images, portalBrokenFallback]
  );
  const hasDbImage = realStoredImages.length > 0;
  const sourceEmbedUrl = useMemo(
    () => resolvePostExternalUrlCandidate(
      { externalUrl, link: ticketUrl, embedCode, description },
      { includeSocialEmbeds: true }
    ),
    [externalUrl, ticketUrl, embedCode, description]
  );
  const resolvedExternalUrl = !hasDbImage ? sourceEmbedUrl : undefined;
  const { data: resolvedEmbedMeta, isLoading: isExternalMetaLoading } = useResolvedExternalEmbedState(
    resolvedExternalUrl,
    !resolvedExternalUrl || hasDbImage
  );
  const extractedImage = (!hasDbImage
    ? (resolvedEmbedMeta?.imageUrl || getDirectVideoThumbnailUrl(embedCode || resolvedExternalUrl))
    : '') || '';

  // Resolve image without forcing any hardcoded stock photo
  const resolveInitialImage = () => {
    if (realStoredImages[0]) return realStoredImages[0];
    if (extractedImage) return extractedImage;
    // Only use fallback if explicitly configured by admin for missing photos
    if (!sourceEmbedUrl) {
      const fallback = getActiveFallbackImage(true);
      return fallback || '';
    }
    return '';
  };

  const [imgSrc, setImgSrc] = useState<string>(resolveInitialImage());
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasError(false);
  }, [realStoredImages, extractedImage, sourceEmbedUrl]);

  const handleInterest = () => {
    setIsInterested(prev => !prev);
    setCurrentCount(prev => isInterested ? prev - 1 : prev + 1);
  };

  const handleImageError = () => {
    // If admin configured a custom fallback for broken links, switch to it
    const fallback = getActiveFallbackImage(false);
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
      return;
    }
    // Otherwise, gracefully hide the broken image element
    setHasError(true);
  };

  const cleanDescription = getPlainTextSnippet(description);
  const displayPrice = price && price.trim() !== '' ? price : 'Vstop prost';
  const hasVisibleImage = !!imgSrc && !hasError;
  const shouldShowMediaSlot = Boolean(imgSrc || isExternalEmbed || externalUrl || embedCode);

  const bookmarkData = {
    type: 'event',
    category: 'events',
    title,
    organizer: effectiveAuthorDisplayName,
    author: effectiveAuthorDisplayName,
    authorName: effectiveAuthorDisplayName,
    authorId: effectiveAuthorId,
    authorAvatar: effectiveAuthorAvatar,
    authorRole: effectiveAuthorRole,
    categoryName,
    subcategory,
    subcategoryName,
    location: displayLocation,
    region,
    date: displayDate,
    eventDate: resolvedDate.dateYmd || eventDate,
    eventTime: displayTime,
    eventDates,
    eventSchedule,
    month: displayMonth,
    day: displayDay,
    price: displayPrice,
    ticketUrl,
    description: cleanDescription,
    image: hasVisibleImage ? imgSrc : undefined,
    images: realStoredImages.length > 0 ? realStoredImages : undefined,
    tags: normalizedTags.length > 0 ? normalizedTags : undefined,
    embedCode,
    externalUrl: sourceEmbedUrl || externalUrl,
    isExternalEmbed: Boolean(isExternalEmbed || sourceEmbedUrl || externalUrl),
  };

  const isAuthorVerified = isUserVerified({
    role: effectiveAuthorRole,
    userId: effectiveAuthorId,
    name: effectiveAuthorDisplayName,
    users,
  });

  return (
    <article className={`bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-md flex flex-col sm:flex-row ${
      isPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50 hover:border-surface-container-high'
    }`}>
      {shouldShowMediaSlot && (
        <a 
          href={postUrl}
          onClick={handleOpenDetail}
          className="sm:w-60 h-48 sm:h-auto bg-surface-container shrink-0 relative block cursor-pointer group overflow-hidden"
          title="Odpri samostojno stran tega dogodka"
        >
          <ResilientEmbedImage
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={imgSrc}
            fallbackSrcs={[...realStoredImages.slice(1), ...(resolvedEmbedMeta?.images || [])]}
            showLoadingShimmer={true}
            isMetadataLoading={isExternalMetaLoading && !hasDbImage}
            onAllImagesFailed={() => setHasError(true)}
            placeholderProps={{
              postType: 'event',
              title,
              sourceDomain: resolvedEmbedMeta?.domain,
              sourceName: resolvedEmbedMeta?.siteName,
              sourceFavicon: resolvedEmbedMeta?.faviconUrl,
              externalUrl: sourceEmbedUrl || externalUrl || ticketUrl,
              variant: 'card',
            }}
          />
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 flex-wrap">
            {isPromoted && (
              <PromotedBadge type={promotionBadgeType} size="sm" />
            )}
            <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1.5 text-center min-w-[44px] shadow-sm border border-black/5">
              <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{displayMonth}</div>
              <div className="text-base font-black text-on-surface leading-none mt-0.5">{displayDay}</div>
            </div>
          </div>
        </a>
      )}
      <div className="p-space-md flex flex-col justify-between flex-1 gap-3">
        <div>
          {/* Header row when no image is shown: display date badge & promo badge nicely */}
          {!shouldShowMediaSlot && (
            <div className="flex items-center gap-3 mb-2.5">
              <div className="bg-primary/10 rounded-xl px-2.5 py-1 text-center min-w-[46px] border border-primary/20 shrink-0">
                <div className="text-[10px] font-bold text-primary uppercase font-label-caps">{displayMonth}</div>
                <div className="text-base font-black text-primary leading-none mt-0.5">{displayDay}</div>
              </div>
              {isPromoted && (
                <PromotedBadge type={promotionBadgeType} size="sm" />
              )}
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {effectiveAuthorDisplayName && (
                <a
                  href={authorUrl}
                  onClick={(e) => {
                    if (onAuthorClick) {
                      e.preventDefault();
                      onAuthorClick({
                        name: effectiveAuthorDisplayName,
                        id: effectiveAuthorId,
                        avatar: effectiveAuthorAvatar,
                        role: effectiveAuthorRole,
                        fromPostTarget: {
                          type: 'event',
                          id,
                          initialData: {
                            title,
                            image: imgSrc,
                            category: categoryName || category,
                            location,
                          }
                        }
                      });
                    }
                  }}
                  data-author-name={effectiveAuthorDisplayName}
                  data-author-id={effectiveAuthorId}
                  data-author-avatar={effectiveAuthorAvatar || ''}
                  data-author-role={effectiveAuthorRole}
                  data-post-id={id}
                  data-post-type="event"
                  data-post-title={title}
                  data-post-image={image}
                  data-post-category={categoryName || category}
                  data-post-location={location}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface hover:text-primary hover:underline transition-colors group/author"
                  title={`Ogled profila avtorja: ${effectiveAuthorDisplayName}`}
                >
                  <UserAvatar
                    src={effectiveAuthorAvatar}
                    name={effectiveAuthorDisplayName}
                    userId={effectiveAuthorId}
                    role={effectiveAuthorRole}
                    size="sm"
                    className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 ring-1.5 ring-surface-container-high group-hover/author:ring-primary shadow-xs transition-all"
                  />
                  <span>{effectiveAuthorDisplayName}</span>
                  {isAuthorVerified && (
                    <VerifiedBadge size="xs" />
                  )}
                </a>
              )}
            </div>
            <div className="flex items-center gap-1">
              <BookmarkButton 
                id={id} 
                data={bookmarkData}
              />
              <ShareMenu 
                id={id} 
                type="event" 
                title={title} 
                description={cleanDescription} 
                url={`${window.location.origin}${postUrl}`}
                imageUrl={hasVisibleImage ? imgSrc : image}
                category={categoryName || category}
                author={effectiveAuthorDisplayName}
                date={date}
                location={location}
                price={price}
              />
              <ReportButton 
                targetId={id} 
                targetType="event" 
                targetTitle={title} 
                targetAuthor={effectiveAuthorDisplayName} 
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
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
            {cleanDescription || 'Vabljeni na prireditev v prijetnem vzdušju.'}
          </p>
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
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasMultipleLocations ? (
              <button
                type="button"
                onClick={handleOpenDetail}
                className="flex items-center gap-1 text-secondary hover:underline transition-colors cursor-pointer text-left font-medium"
                title={`Različne lokacije po datumih: ${distinctScheduleLocations.join(', ')}`}
              >
                <MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span>{distinctScheduleLocations.length} krajev ({distinctScheduleLocations.slice(0, 2).join(', ')}{distinctScheduleLocations.length > 2 ? '...' : ''})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLocationClick}
                className="flex items-center gap-1 text-outline hover:text-primary hover:underline transition-colors cursor-pointer text-left"
                title={`Filtriraj dogodke po lokaciji: ${location}`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{location}</span>
              </button>
            )}
            {displayDate && (
              <>
                <span>•</span>
                <span className="font-medium text-on-surface flex items-center gap-1.5">
                  <span>{displayDate}</span>
                  {eventDates && eventDates.length > 1 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0" title={`Ta dogodek ima ${eventDates.length} razpisanih terminov/ponovitev`}>
                      <Calendar className="w-3 h-3" />
                      <span>+{eventDates.length - 1} ponovitev</span>
                    </span>
                  )}
                </span>
              </>
            )}
            {showDistinctTime && (
              <>
                <span>•</span>
                <span className="font-semibold text-on-surface flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  {displayTime}
                </span>
              </>
            )}
            {(isExternalEmbed || externalUrl || embedCode) && (sourceEmbedUrl || externalUrl) && (
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
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <EventReminderButton
              eventId={id}
              eventTitle={title}
              eventDate={resolvedDate.dateYmd}
              eventTime={displayTime}
              location={displayLocation}
              description={cleanDescription}
            />
            <LikeButton 
              id={id} 
              targetType="event" 
              initialLikesCount={likesCount} 
              variant="pill" 
              itemTitle={title} 
              authorId={effectiveAuthorId}
              showLabel={false}
              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-surface-container" 
            />
            {ticketUrl && (
              <a 
                href={ticketUrl.startsWith('http') ? ticketUrl : `https://${ticketUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-label-md text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Kupi vstopnice za ta dogodek"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Kupi vstopnice</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}
            <ShareMenu 
              id={id} 
              type="event" 
              title={title} 
              description={cleanDescription} 
              url={`${window.location.origin}${postUrl}`}
              imageUrl={hasVisibleImage ? imgSrc : image}
              category={categoryName || category}
              author={effectiveAuthorDisplayName}
              date={date}
              location={location}
              price={price}
              showLabel={true} 
              buttonClassName="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer border border-surface-container" 
            />
          </div>
        </div>
      </div>
    </article>
  );
};


