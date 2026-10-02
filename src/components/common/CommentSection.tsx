import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  CornerDownRight, 
  ThumbsUp, 
  Sparkles, 
  Smile, 
  X, 
  User, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  LogIn,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FirestoreComment, 
  subscribeToPostComments, 
  addCommentToFirestore, 
  deleteCommentFromFirestore 
} from '../../services/firestoreService';
import { ReportButton } from '../ReportButton';
import { LoginModal } from '../LoginModal';
import { AuthorProfileTarget, PostDetailType, ViewMode } from '../../types';
import { UserAvatar } from './UserAvatar';
import { isDummyAvatar } from '../../utils/avatarUtils';
import { formatSlovenianDate, formatRelativeTime } from '../../utils/dateUtils';
import { scrollToPageTop } from '../../utils/scrollUtils';

export interface CommentSectionProps {
  targetId: string;
  targetType: PostDetailType;
  targetTitle: string;
  onAuthorClick?: (author: AuthorProfileTarget) => void;
  onViewChange?: (view: ViewMode) => void;
  className?: string;
}

export interface LocalCommentLikeMap {
  [commentId: string]: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🔥', '🎉', '💡', '👌', '🙌'];

export const CommentSection: React.FC<CommentSectionProps> = ({
  targetId,
  targetType,
  targetTitle,
  onAuthorClick,
  onViewChange,
  className = '',
}) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<FirestoreComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [customGuestName, setCustomGuestName] = useState('');
  const [replyTo, setReplyTo] = useState<FirestoreComment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [likedComments, setLikedComments] = useState<LocalCommentLikeMap>(() => {
    try {
      const saved = localStorage.getItem('portalko_liked_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time comments subscription from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToPostComments(targetId, (firestoreComments) => {
      // Also check if there are locally stored comments for this specific item as fallback/merge
      let localFallback: FirestoreComment[] = [];
      try {
        const storageKey = `portalko_comments_${targetType}_${targetId}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          localFallback = parsed.map((p: any) => ({
            id: p.id || `local-${Date.now()}`,
            targetId,
            targetType,
            authorName: p.author || p.authorName || 'Uporabnik',
            authorAvatar: p.authorAvatar,
            authorRole: p.authorRole,
            content: p.content,
            createdAt: p.createdAt || p.date || new Date().toISOString(),
          }));
        }
      } catch {
        // ignore
      }

      // Merge firestore and local fallback, removing duplicates
      const seen = new Set<string>();
      const combined: FirestoreComment[] = [];

      firestoreComments.forEach(c => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          combined.push(c);
        }
      });

      localFallback.forEach(c => {
        if (!seen.has(c.id) && !combined.some(item => item.content === c.content && item.authorName === c.authorName)) {
          seen.add(c.id);
          combined.push(c);
        }
      });

      setComments(combined);
      setIsLoading(false);
    });

    return () => {
      unsub();
    };
  }, [targetId, targetType]);

  // Handle comment like
  const handleToggleLikeComment = (commentId: string) => {
    setLikedComments(prev => {
      const isLiked = Boolean(prev[commentId]);
      const next = { ...prev, [commentId]: !isLiked };
      try {
        localStorage.setItem('portalko_liked_comments', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Submit comment handler
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = newCommentText.trim();
    if (!cleanContent) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    const authorName = currentUser?.name || customGuestName.trim() || 'Gost Portalko';
    const authorAvatar = (currentUser?.avatar && !isDummyAvatar(currentUser.avatar)) ? currentUser.avatar : '';
    const authorRole = currentUser?.role === 'superadmin' ? 'Superadmin' :
                       currentUser?.role === 'admin' ? 'Administrator' :
                       currentUser?.role === 'verified' ? 'Preverjen uporabnik' :
                       currentUser?.role === 'registered' ? 'Registriran član' : 'Gost';

    let finalContent = cleanContent;
    if (replyTo) {
      finalContent = `@${replyTo.authorName}: ${cleanContent}`;
    }

    try {
      // 1. Add to Firestore
      const newCommentId = await addCommentToFirestore({
        targetId,
        targetType,
        authorId: currentUser?.id,
        authorName,
        authorAvatar,
        authorRole,
        content: finalContent,
      });

      // 2. Also keep local storage mirror
      try {
        const storageKey = `portalko_comments_${targetType}_${targetId}`;
        const localObj = {
          id: newCommentId || `comment-${Date.now()}`,
          author: authorName,
          authorAvatar,
          authorRole,
          date: 'Pravkar',
          createdAt: new Date().toISOString(),
          content: finalContent,
        };
        const existingStr = localStorage.getItem(storageKey);
        const existingArr = existingStr ? JSON.parse(existingStr) : [];
        localStorage.setItem(storageKey, JSON.stringify([...existingArr, localObj]));
      } catch {
        // ignore
      }

      setNewCommentText('');
      setReplyTo(null);
      setFeedbackMsg({ text: 'Komentar je bil uspešno objavljen!', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      console.error('Error adding comment to Firestore:', err);
      // Local fallback on network error
      const localId = `local-${Date.now()}`;
      const fallbackComment: FirestoreComment = {
        id: localId,
        targetId,
        targetType,
        authorId: currentUser?.id,
        authorName,
        authorAvatar,
        authorRole,
        content: finalContent,
        createdAt: new Date().toISOString(),
      };
      setComments(prev => [...prev, fallbackComment]);
      setNewCommentText('');
      setReplyTo(null);
      setFeedbackMsg({ text: 'Komentar je shranjen lokalno.', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Ali ste prepričani, da želite izbrisati ta komentar?')) return;

    try {
      await deleteCommentFromFirestore(commentId, targetId, targetType);
      
      // Update local state and local storage
      setComments(prev => prev.filter(c => c.id !== commentId));
      try {
        const storageKey = `portalko_comments_${targetType}_${targetId}`;
        const existingStr = localStorage.getItem(storageKey);
        if (existingStr) {
          const parsed = JSON.parse(existingStr);
          const updated = parsed.filter((c: any) => c.id !== commentId);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      } catch {
        // ignore
      }

      setFeedbackMsg({ text: 'Komentar je bil izbrisan.', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  // Quick emoji insertion
  const handleInsertEmoji = (emoji: string) => {
    setNewCommentText(prev => `${prev} ${emoji} `.replace(/\s+/g, ' '));
    textareaRef.current?.focus();
  };

  // Sorted comments
  const sortedComments = useMemo(() => {
    const list = [...comments];
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [comments, sortOrder]);

  const formatCommentDate = (dateStr: string) => {
    if (!dateStr) return 'Nedavno';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 60 * 1000) return 'Pravkar';
      if (diffMs < 24 * 60 * 60 * 1000) {
        return formatRelativeTime(date.getTime());
      }
      return formatSlovenianDate(dateStr) || date.toLocaleDateString('sl-SI', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section 
      id="discussion-comments-section"
      className={`bg-surface-container-lowest rounded-2xl p-4 sm:p-6 border border-surface-container/60 shadow-sm flex flex-col gap-5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-low pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
              <span>Vprašanja & komentarji</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-on-surface-variant">
              Delite svoje mnenje, postavite vprašanje avtorju ali sodelujte v pogovoru
            </p>
          </div>
        </div>

        {/* Sort Controls & Info */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {comments.length > 1 && (
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-surface-container/70 text-xs">
              <button
                type="button"
                onClick={() => setSortOrder('newest')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  sortOrder === 'newest'
                    ? 'bg-surface-container-lowest text-primary shadow-2xs font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
                title="Prikaži najnovejše komentarje na vrhu"
              >
                Najnovejši
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('oldest')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  sortOrder === 'oldest'
                    ? 'bg-surface-container-lowest text-primary shadow-2xs font-bold'
                    : 'text-outline hover:text-on-surface'
                }`}
                title="Prikaži najstarejše komentarje po kronološkem vrstnem redu"
              >
                Kronološko
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' 
            ? 'bg-secondary/10 border border-secondary/20 text-secondary' 
            : 'bg-error/10 border border-error/20 text-error'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Submit Comment Form */}
      <form onSubmit={handleSubmitComment} className="flex flex-col gap-3 bg-surface-container-low/60 p-3.5 sm:p-4 rounded-2xl border border-surface-container/80 shadow-2xs">
        {/* Reply to badge */}
        {replyTo && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 truncate">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
              <span>Odgovor uporabniku: <strong>@{replyTo.authorName}</strong></span>
              <span className="text-outline truncate italic max-w-xs">"{replyTo.content.substring(0, 40)}..."</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-1 rounded-lg hover:bg-primary/20 text-primary transition-colors cursor-pointer"
              title="Prekliči odgovor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label htmlFor="comment-textarea" className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span>Zapišite vprašanje ali mnenje</span>
          </label>
          {/* Quick emoji reaction helpers */}
          <div className="hidden sm:flex items-center gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container text-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                title={`Vstavi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="comment-textarea"
            ref={textareaRef}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={replyTo ? `Odgovorite uporabniku @${replyTo.authorName}...` : "Napišite komentar, vprašanje za avtorja ali delite svoje izkušnje..."}
            rows={3}
            maxLength={600}
            className="w-full p-3 rounded-xl bg-surface-container-lowest border border-surface-container focus:border-primary focus:ring-1 focus:ring-primary/40 focus:outline-none text-xs sm:text-sm text-on-surface font-body-sm resize-none transition-all placeholder:text-outline"
          />
          {newCommentText.length > 0 && (
            <span className="absolute bottom-2.5 right-3 text-[10px] text-outline">
              {newCommentText.length}/600
            </span>
          )}
        </div>

        {/* User Identity Info & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {currentUser ? (
              <div className="flex items-center gap-2 text-xs text-on-surface">
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  userId={currentUser.id}
                  role={currentUser.role}
                  size="xs"
                  className="w-5 h-5 ring-1 ring-primary/20"
                />
                <span className="font-semibold text-primary">{currentUser.name}</span>
                {currentUser.role && currentUser.role !== 'registered' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                    {currentUser.role === 'superadmin' ? 'Superadmin' : currentUser.role === 'admin' ? 'Admin' : 'Preverjen'}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={customGuestName}
                  onChange={(e) => setCustomGuestName(e.target.value)}
                  placeholder="Vaše ime (neobvezno)"
                  maxLength={30}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:outline-none focus:border-primary w-36 sm:w-44 placeholder:text-outline"
                />
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  title="Prijavite se za objavo s profilom"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Prijava</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {replyTo && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  setNewCommentText('');
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-surface-container text-outline hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                Prekliči
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !newCommentText.trim()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Objavljam...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Objavi komentar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="flex flex-col divide-y divide-surface-container-low/80">
        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-outline">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Nalagam komentarje...</span>
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-outline">
              <MessageSquare className="w-6 h-6 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Ni še objavljenih komentarjev</p>
              <p className="text-xs text-on-surface-variant max-w-sm mt-0.5">
                Bodite prvi, ki boste postavili vprašanje ali delili svoje mnenje o tej objavi.
              </p>
            </div>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isAuthorOfComment = Boolean(currentUser && (
              (comment.authorId && currentUser.id === comment.authorId) ||
              (!comment.authorId && currentUser.name?.toLowerCase().trim() === comment.authorName?.toLowerCase().trim())
            ));

            const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin'));
            const canDelete = isAuthorOfComment || isAdmin;
            const isLiked = Boolean(likedComments[comment.id]);

            return (
              <div 
                key={comment.id} 
                id={`comment-${comment.id}`}
                className="py-4 first:pt-1 last:pb-1 flex items-start gap-3 group transition-colors"
              >
                {/* Avatar */}
                <button
                  type="button"
                  onClick={() => {
                    if (onAuthorClick) {
                      onAuthorClick({
                        id: comment.authorId,
                        name: comment.authorName,
                        avatar: comment.authorAvatar,
                        role: comment.authorRole,
                        fromPostTarget: { type: targetType, id: targetId }
                      });
                    } else if (onViewChange) {
                      onViewChange('profile');
                    }
                    scrollToPageTop();
                  }}
                  className="shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                  title={`Profil uporabnika: ${comment.authorName}`}
                >
                  <UserAvatar
                    src={comment.authorAvatar}
                    name={comment.authorName}
                    userId={comment.authorId}
                    role={comment.authorRole}
                    size="sm"
                    className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 ring-1 ring-black/5 shadow-2xs"
                  />
                </button>

                {/* Comment Body */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (onAuthorClick) {
                            onAuthorClick({
                              id: comment.authorId,
                              name: comment.authorName,
                              avatar: comment.authorAvatar,
                              role: comment.authorRole,
                              fromPostTarget: { type: targetType, id: targetId }
                            });
                          } else if (onViewChange) {
                            onViewChange('profile');
                          }
                          scrollToPageTop();
                        }}
                        className="font-bold text-xs sm:text-sm text-on-surface hover:text-primary hover:underline text-left cursor-pointer transition-colors"
                        title={`Ogled profila: ${comment.authorName}`}
                      >
                        {comment.authorName}
                      </button>

                      {comment.authorRole && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          comment.authorRole === 'Superadmin' || comment.authorRole === 'Administrator'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : comment.authorRole === 'Preverjen uporabnik'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-surface-container text-outline'
                        }`}>
                          {comment.authorRole}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-outline" title={comment.createdAt}>
                        {formatCommentDate(comment.createdAt)}
                      </span>

                      <ReportButton
                        targetId={comment.id}
                        targetType="comment"
                        targetTitle={`Komentar (${comment.authorName}): "${comment.content.substring(0, 40)}..."`}
                        targetAuthor={comment.authorName}
                        size="sm"
                        className="p-1 rounded text-outline hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                      />

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          title="Izbriši komentar"
                          className="p-1 rounded text-outline hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Text */}
                  <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed break-words whitespace-pre-line">
                    {comment.content.startsWith('@') ? (
                      <span>
                        <strong className="text-primary font-bold">{comment.content.split(':')[0]}: </strong>
                        {comment.content.substring(comment.content.indexOf(':') + 1)}
                      </span>
                    ) : (
                      comment.content
                    )}
                  </div>

                  {/* Comment Actions: Reply & Like */}
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleLikeComment(comment.id)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        isLiked 
                          ? 'text-primary' 
                          : 'text-outline hover:text-primary'
                      }`}
                      title="Všeč mi je ta komentar"
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{isLiked ? 'Všečkano' : 'Všeč mi je'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(comment);
                        textareaRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-outline hover:text-primary transition-colors cursor-pointer"
                      title={`Odgovori uporabniku ${comment.authorName}`}
                    >
                      <CornerDownRight className="w-3 h-3" />
                      <span>Odgovori</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Login Modal for Guests */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        initialMode="login" 
      />
    </section>
  );
};
