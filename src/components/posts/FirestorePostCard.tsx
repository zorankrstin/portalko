import React, { useState, useEffect } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { Heart, MessageCircle, Sparkles, Edit3, Check, Ban, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { FirestorePost, deletePostInFirestore, deleteAdInFirestore, deleteEventInFirestore } from "../../services/firestoreService";
import { useAuth } from "../../contexts/AuthContext";
import { LikeButton } from "../LikeButton";
import { AdPost } from "./AdPost";
import { DealPost } from "./DealPost";
import { EventPost } from "./EventPost";
import { EditPostModal, EditablePostItem } from "./EditPostModal";
import { PromotedBadge } from "../common/PromotedBadge";
import { UserDisplayName } from "../common/UserDisplayName";
import { isItemActivelyPromoted } from "../../services/promotionService";
import { parseEventDateInfo } from "../../utils/dateUtils";
import { getPlainTextSnippet } from "../../utils/textUtils";
import { handleImageFallbackError, getActiveFallbackImage } from "../../services/portalSettingsService";
import { buildPostUrl, slugify } from "../../utils/urlUtils";
import type { PostDetailTarget } from "../../types";

export interface FirestorePostCardProps {
  post: FirestorePost;
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export const FirestorePostCard: React.FC<FirestorePostCardProps> = ({ post, onNavigatePost }) => {
  const { currentUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resolveInitialImage = () => {
    if (post.imageUrl && post.imageUrl.trim()) return post.imageUrl.trim();
    return getActiveFallbackImage(true, post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog') || '';
  };
  const [imgSrc, setImgSrc] = useState<string>(resolveInitialImage());
  const [hasImgError, setHasImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(resolveInitialImage());
    setHasImgError(false);
  }, [post.imageUrl]);

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

  // Only hide post if it was explicitly rejected or archived, unless viewed by admin or author
  if (post.status === 'rejected' || post.status === 'archived') {
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

  const isDeal = post.category === 'deal' || 
                 post.category === 'ugodnosti' || 
                 post.category?.startsWith('deal') || 
                 post.categoryName === 'Ugodnosti' || 
                 post.categoryName === 'Ugodnost' ||
                 post.id.startsWith('deal-') || 
                 post.id.startsWith('hero-bento-') ||
                 Boolean(post.price && post.category !== 'ad' && post.category !== 'event');

  const editableItem: EditablePostItem = {
    id: post.id,
    type: isDeal ? 'deal' : post.category === 'ad' ? 'ad' : post.category === 'event' ? 'event' : 'post',
    title: post.title,
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
    expirationDate: post.expirationDate,
    discount: post.discount,
    promoCode: post.promoCode,
    dealLink: post.dealLink,
    location: post.location,
    eventDate: post.eventDate,
    eventTime: post.eventTime,
    ticketUrl: post.ticketUrl,
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
          price={post.price || "Po dogovoru"}
          author={post.authorName}
          location="Slovenija"
          date="Ravno objavljeno"
          description={post.content}
          categoryName="Mali oglas"
          category="oglasi"
          image={post.imageUrl}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
          onNavigatePost={onNavigatePost}
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
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
          {isPostPromoted && !canEdit && <PromotedBadge type={promoBadge} size="sm" />}
        </div>
        <DealPost
          id={post.id}
          title={post.title}
          discount={post.discount || post.price || "Ugodnost"}
          oldPrice={post.oldPrice}
          newPrice={post.newPrice}
          expirationDate={post.expirationDate}
          author={post.authorName}
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
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
          onNavigatePost={onNavigatePost}
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
    const dateInfo = parseEventDateInfo(post.eventDate, post.eventTime);
    return (
      <div className="relative group/card">
        {renderAdminCardActions()}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 pointer-events-none">
          {isPostPromoted && !canEdit && <PromotedBadge type={promoBadge} size="sm" />}
        </div>
        <EventPost
          id={post.id}
          title={post.title}
          organizer={post.authorName}
          categoryName={post.categoryName || "Dogodek"}
          category="dogodki"
          location={post.location || "Slovenija"}
          date={dateInfo.fullDate}
          eventTime={post.eventTime}
          eventDates={post.eventDates}
          eventSchedule={post.eventSchedule}
          month={dateInfo.month}
          day={dateInfo.day}
          price={post.price || "Vstop prost"}
          ticketUrl={post.ticketUrl}
          description={post.content}
          image={post.imageUrl}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
          onNavigatePost={onNavigatePost}
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
    date: 'Ravno objavljeno',
    description: post.content,
    image: post.imageUrl,
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
      onNavigatePost({
        type: 'blog',
        id: post.id,
        titleSlug: slugify(post.title),
        categorySlug: slugify(post.categoryName || post.category || 'blog'),
        subcategorySlug: post.subcategoryName || post.subcategory ? slugify(post.subcategoryName || post.subcategory) : undefined,
        initialData: {
          title: post.title,
          category: post.category,
          categoryName: post.categoryName,
          author: post.authorName,
          authorRole: post.authorRole,
          authorAvatar: post.authorAvatar,
          image: imgSrc,
          description: post.content,
          date: 'Ravno objavljeno',
        },
      });
    } else {
      window.history.pushState({ type: 'blog', id: post.id }, '', postUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <article className={`bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border hover:shadow-md transition-shadow flex flex-col gap-space-sm relative overflow-hidden ${
      isActivelyPromoted ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-surface-container/50'
    }`}>
      {post.status === 'rejected' && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-2.5 text-xs text-error flex items-center gap-2">
          <Ban className="w-4 h-4 shrink-0" />
          <span>Ta objava je bila zavrnjena {post.rejectionReason && `(Razlog: ${post.rejectionReason})`}</span>
        </div>
      )}

      <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 flex items-center gap-1">
        {isActivelyPromoted && (
          <div className="mr-2 mt-3">
            <PromotedBadge type={badgeType} size="sm" />
          </div>
        )}
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-bl-xl bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase">
          <Sparkles className="w-3 h-3" />
          V živo (Firebase)
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={authorUrl}
            className="group/author shrink-0 focus:outline-none"
            title={`Ogled profila avtorja: ${post.authorName}`}
          >
            <img 
              alt={`Avatar ${post.authorName}`} 
              className="w-10 h-10 rounded-full object-cover ring-1 ring-black/5 group-hover/author:ring-2 group-hover/author:ring-primary transition-all" 
              src={post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=7C3AED&color=fff`} 
            />
          </a>
          <div>
            <div className="flex items-center gap-1.5">
              <a
                href={authorUrl}
                className="font-label-md text-label-md font-bold text-on-surface hover:text-primary hover:underline transition-colors"
                title={`Ogled profila avtorja: ${post.authorName}`}
              >
                <UserDisplayName name={post.authorName} role={post.authorRole} />
              </a>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                {roleLabels[post.authorRole] || 'Član'}
              </span>
            </div>
            <div className="font-label-caps text-[11px] text-outline flex items-center gap-1">
              <span>Ravno objavljeno</span>
              <span>•</span>
              <span className="capitalize">{post.category || 'Članek'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 pr-16">
          {canEdit && (
            <div className="flex items-center gap-1 mr-1">
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
          />
          <ReportButton 
            targetId={post.id}
            targetType={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'post'}
            targetTitle={post.title}
            targetAuthor={post.authorName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={postUrl}
          onClick={handleOpenDetail}
          className="block group/title cursor-pointer"
          title="Odpri samostojno stran članka"
        >
          <h2 className="font-headline-sm text-title-md text-on-surface font-bold leading-snug group-hover/title:text-primary transition-colors">
            {post.title}
          </h2>
        </a>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 leading-relaxed">
          {getPlainTextSnippet(post.content)}
        </p>
      </div>

      {imgSrc && !hasImgError && (
        <a
          href={postUrl}
          onClick={handleOpenDetail}
          className="relative rounded-xl overflow-hidden aspect-[16/9] bg-surface-container max-h-80 block cursor-pointer group/img"
          title="Odpri samostojno stran članka"
        >
          <img 
            alt={post.title} 
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
            src={imgSrc} 
            loading="lazy"
            onError={handleImageError}
          />
        </a>
      )}

      {post.price && (
        <div className="inline-flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-lg text-secondary font-bold text-sm">
          <span>Posebna ponudba:</span>
          <span>{post.price}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-container-low pt-3 mt-1">
        <div className="flex items-center gap-4">
          <LikeButton
            id={post.id}
            targetType={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog'}
            initialLikesCount={post.likesCount || 0}
            variant="card-action"
            showCount={true}
            showLabel={true}
            itemTitle={post.title}
          />
          
          <a 
            href={postUrl}
            onClick={handleOpenDetail}
            className="flex items-center gap-1.5 text-outline hover:text-on-surface text-label-md font-label-md transition-colors cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentsCount || 0} komentarjev</span>
          </a>

          <ShareMenu
            id={post.id}
            type={post.category === 'deal' ? 'deal' : post.category === 'event' ? 'event' : post.category === 'ad' ? 'ad' : 'blog'}
            title={post.title}
            description={post.content}
            url={`${window.location.origin}${postUrl}`}
            showLabel={true}
            buttonClassName="flex items-center gap-1.5 text-outline hover:text-primary text-label-md font-label-md transition-colors cursor-pointer"
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

      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editableItem}
      />
    </article>
  );
};
