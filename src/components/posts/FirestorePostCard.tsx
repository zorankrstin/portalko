import React, { useState } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { Heart, MessageCircle, Sparkles, Clock, Edit3, Check, Ban } from 'lucide-react';
import { FirestorePost, togglePostLikeInFirestore, approveItemInFirestore } from "../../services/firestoreService";
import { useAuth } from "../../contexts/AuthContext";
import { AdPost } from "./AdPost";
import { DealPost } from "./DealPost";
import { EventPost } from "./EventPost";
import { EditPostModal, EditablePostItem } from "./EditPostModal";

export interface FirestorePostCardProps {
  post: FirestorePost;
}

export const FirestorePostCard: React.FC<FirestorePostCardProps> = ({ post }) => {
  const { currentUser } = useAuth();
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const isAuthor = currentUser?.id === post.authorId;
  const canEdit = isAdminOrSuper || isAuthor;

  // If post is pending or rejected and current user is neither admin nor author, do not display
  if (post.status && post.status !== 'published') {
    if (!canEdit) {
      return null;
    }
  }

  const editableItem: EditablePostItem = {
    id: post.id,
    type: post.category === 'deal' ? 'deal' : 'post',
    title: post.title,
    content: post.content,
    category: post.category,
    authorName: post.authorName,
    authorRole: post.authorRole,
    status: post.status || 'published',
    imageUrl: post.imageUrl,
    price: post.price,
    location: post.location,
    rejectionReason: post.rejectionReason,
  };

  // If the Firestore post is specifically marked as an ad, deal, or event, render in that category's layout
  if (post.category === 'ad') {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
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
        />
      </div>
    );
  }

  if (post.category === 'deal') {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
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
          authorRole="Partner"
          authorAvatar={post.authorAvatar}
          date="Aktualno"
          description={post.content}
          image={post.imageUrl}
          categoryName="Ugodnost"
          region="Slovenija"
          verifiedText="Preverjeno"
        />
      </div>
    );
  }

  if (post.category === 'event') {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
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

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm relative overflow-hidden">
      {/* Status banner for pending posts */}
      {post.status === 'pending' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs text-[#D28E3D]">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Objava je v čakanju na odobritev s strani skrbnika</span>
          </div>
          {isAdminOrSuper && (
            <button
              onClick={() => approveItemInFirestore(post.id, post.category === 'deal' ? 'deal' : 'post')}
              className="px-2.5 py-1 rounded-lg bg-secondary text-on-secondary font-bold text-xs flex items-center gap-1 hover:bg-secondary/90 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Odobri zdaj</span>
            </button>
          )}
        </div>
      )}

      {post.status === 'rejected' && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-2.5 text-xs text-error flex items-center gap-2">
          <Ban className="w-4 h-4 shrink-0" />
          <span>Ta objava je bila zavrnjena {post.rejectionReason && `(Razlog: ${post.rejectionReason})`}</span>
        </div>
      )}

      <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-bl-xl bg-primary/10 text-primary text-[11px] font-semibold tracking-wider uppercase">
          <Sparkles className="w-3 h-3" />
          V živo (Firebase)
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            alt={`Avatar ${post.authorName}`} 
            className="w-10 h-10 rounded-full object-cover ring-1 ring-black/5" 
            src={post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=7C3AED&color=fff`} 
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md font-bold text-on-surface">{post.authorName}</span>
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
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-2 py-1 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-1 transition-colors cursor-pointer mr-1"
              title="Uredi objavo"
            >
              <Edit3 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Uredi</span>
            </button>
          )}
          <BookmarkButton id={post.id} data={bookmarkData} />
          <ShareMenu 
            id={post.id} 
            title={post.title} 
            url={window.location.href} 
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-headline-sm text-title-md text-on-surface font-bold leading-snug">
          {post.title}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 leading-relaxed">
          {post.content}
        </p>
      </div>

      {post.imageUrl && (
        <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-surface-container max-h-80">
          <img 
            alt={post.title} 
            className="w-full h-full object-cover" 
            src={post.imageUrl} 
            loading="lazy"
          />
        </div>
      )}

      {post.price && (
        <div className="inline-flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-lg text-secondary font-bold text-sm">
          <span>Posebna ponudba:</span>
          <span>{post.price}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-surface-container-low pt-3 mt-1">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-label-md font-label-md transition-colors ${hasLiked ? 'text-primary font-bold' : 'text-outline hover:text-primary'}`}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-primary text-primary' : ''}`} />
            <span>{likesCount} všečkov</span>
          </button>
          
          <button 
            type="button" 
            className="flex items-center gap-1.5 text-outline hover:text-on-surface text-label-md font-label-md transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentsCount || 0} komentarjev</span>
          </button>
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
