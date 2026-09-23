import React, { useState } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ReportButton } from "../ReportButton";
import { Heart, MessageCircle, Sparkles, Edit3, Check, Ban, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { FirestorePost, togglePostLikeInFirestore, deletePostInFirestore, deleteAdInFirestore, deleteEventInFirestore } from "../../services/firestoreService";
import { useAuth } from "../../contexts/AuthContext";
import { AdPost } from "./AdPost";
import { DealPost } from "./DealPost";
import { EventPost } from "./EventPost";
import { EditPostModal, EditablePostItem } from "./EditPostModal";
import { PromotedBadge } from "../common/PromotedBadge";
import { UserDisplayName } from "../common/UserDisplayName";
import { isItemActivelyPromoted } from "../../services/promotionService";

export interface FirestorePostCardProps {
  post: FirestorePost;
}

export const FirestorePostCard: React.FC<FirestorePostCardProps> = ({ post }) => {
  const { currentUser } = useAuth();
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    location: post.location,
    rejectionReason: post.rejectionReason,
  };

  // If the Firestore post is specifically marked as an ad, deal, or event, render in that category's layout
  const isPostPromoted = Boolean(
    post.promotion
      ? isItemActivelyPromoted(post.promotion, isDeal ? 'deals' : post.category === 'ad' ? 'ads' : post.category === 'event' ? 'events' : 'blog')
      : (post.isPromoted && (!post.promotedUntil || new Date(post.promotedUntil).getTime() > Date.now()))
  );
  const promoBadge = post.promotionBadgeType || post.promotion?.badgeType || 'PROMO';

  if (post.category === 'ad') {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {isPostPromoted && <PromotedBadge type={promoBadge} size="sm" />}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-2.5 h-2.5" />
            V živo
          </span>
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
          image={post.imageUrl}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
        />
      </div>
    );
  }

  if (isDeal) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {isPostPromoted && <PromotedBadge type={promoBadge} size="sm" />}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/90 backdrop-blur-xs text-on-secondary text-[10px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-2.5 h-2.5" />
            V živo
          </span>
        </div>
        <DealPost
          id={post.id}
          title={post.title}
          discount={post.price || "Ugodnost"}
          author={post.authorName}
          authorRole={post.authorRole || "Partner"}
          authorAvatar={post.authorAvatar}
          date="Aktualno"
          description={post.content}
          image={post.imageUrl}
          categoryName={post.categoryName || "Ugodnosti"}
          region={post.location || "Slovenija"}
          verifiedText="Preverjeno"
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
        />
      </div>
    );
  }

  if (post.category === 'event') {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {isPostPromoted && <PromotedBadge type={promoBadge} size="sm" />}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-2.5 h-2.5" />
            V živo
          </span>
        </div>
        <EventPost
          id={post.id}
          title={post.title}
          organizer={post.authorName}
          categoryName="Dogodek"
          location="Slovenija"
          date="Kmalu"
          month="AKT"
          day="!"
          price={post.price || "Vstop prost"}
          description={post.content}
          image={post.imageUrl}
          isPromoted={isPostPromoted}
          promotionBadgeType={promoBadge}
        />
      </div>
    );
  }

  const handleLike = async () => {
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));
    await togglePostLikeInFirestore(post.id, nextLiked);
  };

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
            href={`#author-${encodeURIComponent(post.authorName.replace(/\s+/g, '_'))}`}
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
                href={`#author-${encodeURIComponent(post.authorName.replace(/\s+/g, '_'))}`}
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
          href={`#blog-${post.id}`}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = `blog-${post.id}`;
          }}
          className="block group/title cursor-pointer"
          title="Odpri samostojno stran članka"
        >
          <h2 className="font-headline-sm text-title-md text-on-surface font-bold leading-snug group-hover/title:text-primary transition-colors">
            {post.title}
          </h2>
        </a>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 leading-relaxed">
          {post.content}
        </p>
      </div>

      {post.imageUrl && (
        <a
          href={`#blog-${post.id}`}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = `blog-${post.id}`;
          }}
          className="relative rounded-xl overflow-hidden aspect-[16/9] bg-surface-container max-h-80 block cursor-pointer group/img"
          title="Odpri samostojno stran članka"
        >
          <img 
            alt={post.title} 
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
            src={post.imageUrl} 
            loading="lazy"
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
          <button 
            type="button" 
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-label-md font-label-md transition-colors cursor-pointer ${hasLiked ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-primary text-primary' : ''}`} />
            <span>{likesCount} všečkov</span>
          </button>
          
          <a 
            href={`#blog-${post.id}`}
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = `blog-${post.id}`;
            }}
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
            showLabel={true}
            buttonClassName="flex items-center gap-1.5 text-outline hover:text-primary text-label-md font-label-md transition-colors cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`#blog-${post.id}`}
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = `blog-${post.id}`;
            }}
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
