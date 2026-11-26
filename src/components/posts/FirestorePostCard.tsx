import React, { useState, useEffect } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { LikeButton } from "../LikeButton";
import { Heart, MessageCircle, Edit3, Check, Ban, ArrowRight, Trash2, Loader2, BookOpen, Clock, Camera, Paperclip, Eye, MapPin } from 'lucide-react';
import { FirestorePost, deletePostInFirestore, deleteAdInFirestore, deleteEventInFirestore } from "../../services/firestoreService";
import { useAuth } from "../../contexts/AuthContext";
import { AdPost } from "./AdPost";
import { DealPost } from "./DealPost";
import { EventPost } from "./EventPost";
import { EditPostModal, EditablePostItem } from "./EditPostModal";
import { PromotedBadge } from "../common/PromotedBadge";
import { UserDisplayName } from "../common/UserDisplayName";
import { UserAvatar } from "../common/UserAvatar";
import { resolveUserUploadedAvatar } from "../../utils/avatarUtils";
import { isItemActivelyPromoted } from "../../services/promotionService";
import { parseEventDateInfo, resolveEventDisplayDate, formatSlovenianDate } from "../../utils/dateUtils";
import { getPlainTextSnippet, formatViewsCount } from "../../utils/textUtils";
import { handleImageFallbackError, getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, buildTagUrl, navigateApp, slugify } from "../../utils/urlUtils";
import { parseTags } from "../../utils/tagUtils";
import { ResilientEmbedImage } from "../common/EmbedThumbnailPlaceholder";
import {
  getDirectVideoThumbnailUrl,
  resolvePostExternalUrlCandidate,
  useResolvedExternalEmbed,
} from "../../services/externalEmbedService";
import type { PostDetailTarget } from "../../types";

export interface FirestorePostCardProps {
  post: FirestorePost;
  onNavigatePost?: (target: PostDetailTarget) => void;
  onTagClick?: (tag: string) => void;
}

export const FirestorePostCard: React.FC<FirestorePostCardProps> = ({ post, onNavigatePost, onTagClick }) => {
  const normalizedTags = parseTags(post.tags);
  const { currentUser, users } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveAuthorAvatar = React.useMemo(() => {
    return resolveUserUploadedAvatar(post.authorAvatar, post.authorId, post.authorName, users);
  }, [post.authorAvatar, post.authorId, post.authorName, users]);

  const isDeal = post.category === 'deal' || 
                 post.category === 'ugodnosti' || 
                 post.category?.startsWith('deal') || 
                 post.categoryName === 'Ugodnosti' || 
                 post.categoryName === 'Ugodnost' ||
                 post.id.startsWith('deal-') || 
                 post.id.startsWith('hero-bento-') ||
                 Boolean(post.price && post.category !== 'ad' && post.category !== 'event');

  const isDelegatedCardType = post.category === 'ad' || isDeal || post.category === 'event';
  const hasDbImage = Boolean(post.imageUrl && post.imageUrl.trim());
  const candidateExternalUrl = !hasDbImage && !isDelegatedCardType
    ? resolvePostExternalUrlCandidate(post, { includeSocialEmbeds: true })
    : undefined;
  const resolvedEmbedMeta = useResolvedExternalEmbed(
    candidateExternalUrl,
    !candidateExternalUrl || hasDbImage || isDelegatedCardType
  );
  const extractedEmbedImage = (!hasDbImage
    ? (resolvedEmbedMeta?.imageUrl || getDirectVideoThumbnailUrl(post.embedCode || candidateExternalUrl))
    : '') || '';

  const resolveInitialImage = () => {
    if (hasDbImage) return post.imageUrl!.trim();
    if (extractedEmbedImage) return extractedEmbedImage;
    return getActiveFallbackImage(true, post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog') || '';
  };
  const [imgSrc, setImgSrc] = useState<string>(resolveInitialImage());
  const [hasImgError, setHasImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasImgError(false);
  }, [post.imageUrl, extractedEmbedImage]);

  const handleImageError = () => {
    const fallback = getActiveFallbackImage(false);
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
      return;
    }
    setHasImgError(true);
  };

  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isAuthor = currentUser?.id === post.authorId;
  const canEdit = isAdminOrSuper || isAuthor;

  // Hide post if it is a draft, rejected, or archived, unless viewed by admin or author
  if (post.status === 'osnutek' || post.status === 'rejected' || post.status === 'archived') {
    if (!canEdit) {
      return null;
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Ali ste prepričani, da želite izbrisati objavo "${post.title}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      if (post.category === 'ad') {
        await deleteAdInFirestore(post.id);
      } else if (post.category === 'event') {
        await deleteEventInFirestore(post.id);
      } else {
        await deletePostInFirestore(post.id);
      }
    } catch (err) {
      console.error('Napaka pri brisanju objave:', err);
      alert('Prišlo je do napake pri brisanju objave.');
    } finally {
      setIsDeleting(false);
    }
  };

  const editableItem: EditablePostItem = {
    id: post.id,
    type: isDeal ? 'deal' : post.category === 'ad' ? 'ad' : post.category === 'event' ? 'event' : 'post',
    title: post.title,
    subtitle: post.subtitle,
    content: post.content,
    category: isDeal ? (post.category && post.category !== 'blog' && post.category !== 'post' ? post.category : 'deal') : post.category,
    categoryName: isDeal ? (post.categoryName || 'Ugodnosti') : post.categoryName,
    authorName: post.authorName,
    authorId: post.authorId,
    authorRole: post.authorRole,
    authorAvatar: post.authorAvatar,
    status: post.status || 'published',
    imageUrl: post.imageUrl,
    price: post.price,
    oldPrice: post.oldPrice,
    newPrice: post.newPrice,
    startDate: post.startDate,
    expirationDate: post.expirationDate,
    discount: post.discount,
    promoCode: post.promoCode,
    dealLink: post.dealLink,
    location: post.location,
    eventDate: post.eventDate,
    eventTime: post.eventTime,
    eventDates: post.eventDates,
    eventSchedule: post.eventSchedule,
    ticketUrl: post.ticketUrl,
    embedCode: post.embedCode,
    embedOrientation: post.embedOrientation,
    isExternalEmbed: post.isExternalEmbed,
    externalUrl: post.externalUrl,
    sourceName: post.sourceName,
    sourceDomain: post.sourceDomain,
    sourceFavicon: post.sourceFavicon,
    fetchedAt: post.fetchedAt,
    tags: normalizedTags.length > 0 ? normalizedTags : undefined,
    rejectionReason: post.rejectionReason,
  };

  // If the Firestore post is specifically marked as an ad, deal, or event, render in that category's layout
  const isPostPromoted = Boolean(
    post.promotion
      ? isItemActivelyPromoted(post.promotion, isDeal ? 'deals' : post.category === 'ad' ? 'ads' : post.category === 'event' ? 'events' : 'blog')
      : (post.isPromoted && (!post.promotedUntil || new Date(post.promotedUntil).getTime() > Date.now()))
  );
  const promoBadge = post.promotionBadgeType || post.promotion?.badgeType || 'PROMO';

  const renderAdminCardActions = () => {
    if (!canEdit) return null;
    return (
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 bg-surface-container-lowest/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-md border border-surface-container">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditModalOpen(true);
          }}
          className="px-2 py-1 rounded-lg text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 transition-colors cursor-pointer"
          title="Uredi objavo (Skrbnik / Avtor)"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Uredi</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className="p-1 rounded-lg text-xs font-semibold hover:bg-error/15 text-outline hover:text-error flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          title="Izbriši objavo"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-error" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  };

  if (post.category === 'ad') {
    return (
      <div className="relative group/card">
        {renderAdminCardActions()}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
          {isPostPromoted && !canEdit && <PromotedBadge type={promoBadge} size="sm" />}
        </div>
        <AdPost
          id={post.id}
          title={post.title}
          subtitle={post.subtitle}
          price={post.price || "Po dogovoru"}
          author={post.authorName}
          authorId={post.authorId}
          authorAvatar={post.authorAvatar}
          authorRole={post.authorRole}
          location="Slovenija"
          date="Ravno objavljeno"
          description={post.content}
          categoryName="Mali oglas"
          category="oglasi"
          image={post.imageUrl}
          likesCount={post.likesCount || 0}
          tags={normalizedTags}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
          isExternalEmbed={post.isExternalEmbed}
          externalUrl={post.externalUrl}
          embedCode={post.embedCode}
          sourceName={post.sourceName}
          sourceDomain={post.sourceDomain}
          sourceFavicon={post.sourceFavicon}
          fetchedAt={post.fetchedAt}
          onNavigatePost={onNavigatePost}
          onTagClick={onTagClick}
        />
        {isEditModalOpen && (
          <EditPostModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            item={editableItem}
            onSaved={() => setIsEditModalOpen(false)}
          />
        )}
      </div>
    );
  }

  if (isDeal) {
    return (
      <div className="relative group/card">
        {renderAdminCardActions()}
        <DealPost
          id={post.id}
          title={post.title}
          subtitle={post.subtitle}
          discount={post.discount || post.price || "Ugodnost"}
          oldPrice={post.oldPrice}
          newPrice={post.newPrice}
          startDate={post.startDate}
          expirationDate={post.expirationDate}
          author={post.authorName}
          authorId={post.authorId}
          authorRole={post.authorRole || "Partner"}
          authorAvatar={post.authorAvatar}
          date={post.expirationDate ? `Velja do ${post.expirationDate}` : "Aktualno"}
          description={post.content}
          image={post.imageUrl}
          code={post.promoCode}
          link={post.dealLink}
          categoryName={post.categoryName || "Ugodnosti"}
          category="ugodnosti"
          region={post.location || "Slovenija"}
          verifiedText="Preverjeno"
          votesCount={post.likesCount ?? (post as any).votes ?? 0}
          tags={normalizedTags}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
          isExternalEmbed={post.isExternalEmbed}
          externalUrl={post.externalUrl || post.dealLink}
          embedCode={post.embedCode}
          sourceName={post.sourceName}
          sourceDomain={post.sourceDomain}
          sourceFavicon={post.sourceFavicon}
          fetchedAt={post.fetchedAt}
          onNavigatePost={onNavigatePost}
          onTagClick={onTagClick}
        />
        {isEditModalOpen && (
          <EditPostModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            item={editableItem}
            onSaved={() => setIsEditModalOpen(false)}
          />
        )}
      </div>
    );
  }

  if (post.category === 'event') {
    const resolvedDate = resolveEventDisplayDate(post);
    return (
      <div className="relative group/card">
        {renderAdminCardActions()}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
          {isPostPromoted && !canEdit && <PromotedBadge type={promoBadge} size="sm" />}
        </div>
        <EventPost
          id={post.id}
          title={post.title}
          subtitle={post.subtitle}
          organizer={post.authorName}
          authorId={post.authorId}
          authorAvatar={post.authorAvatar}
          authorRole={post.authorRole}
          categoryName={post.categoryName || "Dogodek"}
          category="dogodki"
          location={resolvedDate.location || post.location || "Slovenija"}
          date={resolvedDate.dateInfo.fullDate}
          eventTime={resolvedDate.eventTime || post.eventTime}
          eventDates={post.eventDates}
          eventSchedule={post.eventSchedule}
          month={resolvedDate.dateInfo.month}
          day={resolvedDate.dateInfo.day}
          price={post.price || "Vstop prost"}
          ticketUrl={post.ticketUrl}
          description={post.content}
          image={post.imageUrl}
          likesCount={post.likesCount || 0}
          tags={normalizedTags}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
          embedCode={post.embedCode}
          externalUrl={post.externalUrl}
          isExternalEmbed={post.isExternalEmbed}
          onNavigatePost={onNavigatePost}
          onTagClick={onTagClick}
        />
        {isEditModalOpen && (
          <EditPostModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            item={editableItem}
            onSaved={() => setIsEditModalOpen(false)}
          />
        )}
      </div>
    );
  }

  const bookmarkData = {
    type: 'blog',
    category: post.category || 'blog',
    title: post.title,
    author: post.authorName,
    authorRole: post.authorRole,
    authorAvatar: post.authorAvatar,
    date: formatSlovenianDate(post.createdAt) || 'Nedavno',
    description: post.content,
    image: post.imageUrl || extractedEmbedImage || (imgSrc && !hasImgError ? imgSrc : undefined),
  };

  const roleLabels: Record<string, string> = {
    superadmin: 'Glavni skrbnik',
    admin: 'Skrbnik',
    verified: 'Preverjen uporabnik',
    registered: 'Registriran',
    guest: 'Gost',
  };

  const isActivelyPromoted = post.isPromoted && (!post.promotedUntil || new Date(post.promotedUntil).getTime() > Date.now());
  const badgeType = post.promotionBadgeType || post.promotion?.badgeType || 'PROMO';

  const postUrl = buildPostUrl({
    type: 'blog',
    id: post.id,
    title: post.title,
    category: post.category,
    categoryName: post.categoryName,
    subcategory: post.subcategory,
    subcategoryName: post.subcategoryName,
  });

  const authorUrl = `/avtor/${slugify(post.authorName)}`;

  const handleOpenDetail = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigatePost) {
      const targetType = isDeal ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog';
      onNavigatePost({
        type: targetType,
        id: post.id,
        titleSlug: slugify(post.title),
        categorySlug: slugify(post.categoryName || post.category || (isDeal ? 'akcije' : 'blog')),
        subcategorySlug: post.subcategoryName || post.subcategory ? slugify(post.subcategoryName || post.subcategory) : undefined,
        initialData: {
          id: post.id,
          title: post.title,
          category: post.category,
          categoryName: post.categoryName,
          author: post.authorName,
          authorRole: post.authorRole,
          authorAvatar: post.authorAvatar,
          image: imgSrc || post.imageUrl || '',
          images: post.images || post.imageUrls || (imgSrc ? [imgSrc] : []),
          description: post.content,
          embedCode: post.embedCode,
          embedOrientation: post.embedOrientation,
          date: formatSlovenianDate(post.createdAt) || 'Nedavno',
          likesCount: post.likesCount || 0,
          votes: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          viewsCount: post.viewsCount || 0,
          tags: normalizedTags.length > 0 ? normalizedTags : undefined,
        },
      });
    } else {
      window.history.pushState({ type: 'blog', id: post.id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const plainSnippet = getPlainTextSnippet(post.content);
  const wordCount = plainSnippet ? plainSnippet.split(/\s+/).filter(Boolean).length : 0;
  const readMinutes = Math.max(1, Math.round(wordCount / 180));
  const galleryCount = Array.isArray(post.images) && post.images.length > 0
    ? post.images.length
    : Array.isArray(post.imageUrls) && post.imageUrls.length > 0
      ? post.imageUrls.length
      : (imgSrc ? 1 : 0);
  const attachmentsCount = Array.isArray(post.attachments) ? post.attachments.length : 0;

  return (
    <article className={`bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg flex flex-col gap-3.5 relative overflow-hidden group/article ${
      isActivelyPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/60 hover:border-primary/25'
    }`}>
      {post.status === 'osnutek' && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2 font-semibold">
          <span>Osnutek – ta objava še ni javno objavljena</span>
        </div>
      )}
      {post.status === 'rejected' && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-2.5 text-xs text-error flex items-center gap-2">
          <Ban className="w-4 h-4 shrink-0" />
          <span>Ta objava je bila zavrnjena {post.rejectionReason && `(Razlog: ${post.rejectionReason})`}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={authorUrl}
            data-author-name={post.authorName}
            data-author-id={post.authorId}
            data-author-avatar={effectiveAuthorAvatar || ''}
            data-author-role={post.authorRole}
            data-post-id={post.id}
            data-post-type={post.category === 'deal' || post.category === 'ugodnosti' ? 'deal' : post.category === 'event' ? 'event' : 'blog'}
            data-post-title={post.title}
            data-post-image={post.imageUrl || (post.images && post.images[0])}
            data-post-category={post.categoryName || post.category}
            data-post-price={post.price || post.discount}
            data-post-location={post.location}
            className="group/author shrink-0 focus:outline-none"
            title={`Ogled profila avtorja: ${post.authorName}`}
          >
            <UserAvatar
              src={effectiveAuthorAvatar}
              name={post.authorName}
              userId={post.authorId}
              role={post.authorRole}
              size="md"
              className="w-11 h-11 ring-2 ring-primary/10 group-hover/author:ring-primary/40 transition-all"
            />
          </a>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <a
                href={authorUrl}
                data-author-name={post.authorName}
                data-author-id={post.authorId}
                data-author-avatar={effectiveAuthorAvatar || ''}
                data-author-role={post.authorRole}
                data-post-id={post.id}
                data-post-type={post.category === 'deal' || post.category === 'ugodnosti' ? 'deal' : post.category === 'event' ? 'event' : 'blog'}
                data-post-title={post.title}
                data-post-image={post.imageUrl || (post.images && post.images[0])}
                data-post-category={post.categoryName || post.category}
                data-post-price={post.price || post.discount}
                data-post-location={post.location}
                className="font-headline-sm text-sm font-bold text-on-surface hover:text-primary hover:underline transition-colors truncate"
                title={`Ogled profila avtorja: ${post.authorName}`}
              >
                <UserDisplayName name={post.authorName} role={post.authorRole} userId={post.authorId} users={users} />
              </a>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high/80 text-on-surface-variant font-semibold">
                {roleLabels[post.authorRole] || 'Član'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-outline mt-0.5">
              <span>{formatSlovenianDate(post.createdAt) || 'Nedavno'}</span>
              {(post.categoryName || post.category) && (
                <>
                  <span>•</span>
                  <span className="text-primary font-semibold">{post.categoryName || post.category}</span>
                </>
              )}
              {post.location && post.location !== 'Slovenija' && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {post.location}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {isActivelyPromoted && (
            <div className="mr-1">
              <PromotedBadge type={badgeType} size="sm" />
            </div>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-fixed/70 text-on-primary-fixed text-[11px] font-bold tracking-wide">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Blog</span>
          </span>
          {canEdit && (
            <div className="flex items-center gap-1 mr-0.5">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-1 transition-colors cursor-pointer"
                title="Uredi objavo"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Uredi</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-error/15 text-outline hover:text-error flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Izbriši objavo"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-error" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
          <BookmarkButton id={post.id} data={bookmarkData} />
          <ShareMenu 
            id={post.id} 
            type={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog'}
            title={post.title} 
            description={post.content}
            url={`${window.location.origin}${postUrl}`}
            imageUrl={(post as any).image || post.imageUrl || (post.images && post.images[0]) || extractedEmbedImage || (imgSrc && !hasImgError ? imgSrc : undefined)}
            category={post.categoryName || post.category}
            author={post.authorName}
            price={(post as any).price}
            location={(post as any).location || (post as any).region}
            discount={(post as any).discount}
            date={(post as any).date}
            showCount={false}
            initialSharesCount={post.sharesCount || 0}
          />
          <ReportButton 
            targetId={post.id}
            targetType={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'post'}
            targetTitle={post.title}
            targetAuthor={post.authorName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-0.5">
        <a
          href={postUrl}
          onClick={handleOpenDetail}
          className="block group/title cursor-pointer"
          title="Odpri samostojno stran članka"
        >
          <h2 className="font-headline-md text-[21px] sm:text-[24px] text-on-surface font-extrabold leading-[1.26] tracking-[-0.018em] group-hover/title:text-primary transition-colors">
            {post.title}
          </h2>
          {post.subtitle && post.subtitle.trim() && (
            <p className="text-sm sm:text-[15px] font-semibold text-primary/85 leading-snug mt-1.5">
              {post.subtitle.trim()}
            </p>
          )}
        </a>
        {plainSnippet && (
          <p className="font-body-md text-[14.5px] sm:text-[15px] text-on-surface-variant/90 line-clamp-3 leading-[1.62]">
            {plainSnippet}
          </p>
        )}
      </div>

      {(imgSrc || post.isExternalEmbed || post.externalUrl || post.embedCode) && (
        <a
          href={postUrl}
          onClick={handleOpenDetail}
          className="relative rounded-xl overflow-hidden aspect-[16/9] max-h-80 w-full bg-surface-container block cursor-pointer group/img ring-1 ring-black/5"
          title="Odpri samostojno stran članka"
        >
          <ResilientEmbedImage
            alt={post.title}
            className="w-full h-full object-cover group-hover/img:scale-[1.03] transition-transform duration-500"
            src={imgSrc}
            fallbackSrcs={[...(post.images || []), ...(post.imageUrls || []), ...(resolvedEmbedMeta?.images || [])]}
            loading="lazy"
            onAllImagesFailed={() => setHasImgError(true)}
            placeholderProps={{
              postType: 'blog',
              title: post.title,
              sourceDomain: post.sourceDomain || resolvedEmbedMeta?.domain,
              sourceName: post.sourceName || resolvedEmbedMeta?.siteName,
              sourceFavicon: post.sourceFavicon || resolvedEmbedMeta?.faviconUrl,
              externalUrl: post.externalUrl || candidateExternalUrl,
              variant: 'card',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
            <span className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg font-label-md text-[11px] font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-secondary-fixed" />
              <span>{readMinutes} min branja</span>
            </span>
            {galleryCount > 1 && (
              <span className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg font-label-md text-[11px] font-medium flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-primary-fixed" />
                <span>{galleryCount} fotografij</span>
              </span>
            )}
            {attachmentsCount > 0 && (
              <span className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg font-label-md text-[11px] font-medium flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-primary-fixed" />
                <span>{attachmentsCount} {attachmentsCount === 1 ? 'priloga' : 'prilog'}</span>
              </span>
            )}
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

      {post.price && (
        <div className="inline-flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-lg text-secondary font-bold text-sm self-start">
          <span>Posebna ponudba:</span>
          <span>{post.price}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-container-low pt-3 mt-0.5">
        <div className="flex flex-wrap items-center gap-4 text-xs font-label-md">
          <LikeButton
            id={post.id}
            targetType={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog'}
            initialLikesCount={post.likesCount || 0}
            variant="card-action"
            itemTitle={post.title}
            authorId={post.authorId}
          />

          <a 
            href={postUrl}
            onClick={handleOpenDetail}
            className="flex items-center gap-1.5 text-outline hover:text-on-surface text-label-md font-label-md transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentsCount || 0} komentarjev</span>
          </a>

          {(post.viewsCount || 0) > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-outline">
              <Eye className="w-4 h-4" />
              <span>{formatViewsCount(post.viewsCount || 0)}</span>
            </span>
          )}

          <ShareMenu
            id={post.id}
            type={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog'}
            title={post.title}
            description={post.content}
            url={`${window.location.origin}${postUrl}`}
            imageUrl={(post as any).image || post.imageUrl || (post.images && post.images[0]) || extractedEmbedImage || (imgSrc && !hasImgError ? imgSrc : undefined)}
            category={post.categoryName || post.category}
            author={post.authorName}
            price={(post as any).price}
            location={(post as any).location || (post as any).region}
            discount={(post as any).discount}
            date={(post as any).date}
            showLabel={true}
            showCount={true}
            initialSharesCount={post.sharesCount || 0}
            buttonClassName="flex items-center gap-1.5 text-outline hover:text-primary text-label-md font-label-md transition-colors cursor-pointer group"
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

      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editableItem}
      />
    </article>
  );
};
