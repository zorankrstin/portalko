import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  UserCheck, 
  Sparkles, 
  PenTool, 
  Tag
} from 'lucide-react';
import { PostDetailTarget } from '../types';
import { ComposeModal } from './ComposeModal';
import { scrollToPageTop } from '../utils/scrollUtils';
import { subscribeToPosts, FirestorePost } from '../services/firestoreService';

interface RightSidebarBlogProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarBlog({ onNavigatePost }: RightSidebarBlogProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState<FirestorePost[]>([]);

  useEffect(() => {
    const unsub = subscribeToPosts((allPosts) => {
      const blogs = allPosts.filter(p => {
        if (p.status === 'rejected') return false;
        const isDeal = p.category === 'deal' || p.category === 'ugodnosti' || p.id.startsWith('deal-') || p.categoryName === 'Ugodnosti';
        const isAd = p.category === 'ad' || p.id.startsWith('ad-');
        const isEvent = p.category === 'event' || p.id.startsWith('event-');
        return !isDeal && !isAd && !isEvent;
      });
      setBlogPosts(blogs.slice(0, 4));
    });
    return () => unsub();
  }, []);

  const handleOpenPost = (id: string) => {
    if (onNavigatePost) {
      onNavigatePost({ type: 'blog', id });
    } else {
      window.location.hash = `blog-${id}`;
    }
    scrollToPageTop();
  };

  const popularTopics = [
    { name: 'Izleti & Turizem', tag: 'turizem' },
    { name: 'Dom & Gradnja', tag: 'dom' },
    { name: 'Kulinarika & Recepti', tag: 'kulinarika' },
    { name: 'Finance & Varčevanje', tag: 'finance' },
    { name: 'Šport & Outdoor', tag: 'šport' },
    { name: 'Tehnologija', tag: 'tehnologija' }
  ];

  return (
    <aside 
      id="right-sidebar" 
      data-sidebar="right" 
      className="sidebar-scrollable hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6"
    >
      
      {/* 1. Postani avtor / Deli svojo zgodbo CTA */}
      <div className="bg-gradient-to-br from-primary/10 via-surface-container-lowest to-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-primary/20 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider font-label-caps">
          <PenTool className="w-3.5 h-3.5" />
          <span>Skupnost ustvarjalcev</span>
        </div>
        <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface leading-snug">
          Imaš zanimivo zgodbo ali strokovni nasvet?
        </h3>
        <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
          Objavi svoj blog članek na Portalko in dosezi več tisoč domačih bralcev.
        </p>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="mt-1 w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Objavi nov članek</span>
        </button>
      </div>

      {/* 2. Najbolj brani blog članki */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-[1em] h-[1em] text-primary text-xl" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Zadnji blog članki</h3>
          </div>
          <span className="font-label-caps text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">Aktualno</span>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          {blogPosts.length === 0 ? (
            <p className="text-xs text-outline py-3 text-center">Trenutno ni objavljenih blog prispevkov.</p>
          ) : (
            blogPosts.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => handleOpenPost(post.id)}
                className="group flex gap-2.5 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                {post.imageUrl && (
                  <div className="relative w-16 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/70 text-white text-[9px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <h4 className="font-headline-sm text-xs font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-outline mt-1">
                    <span className="truncate">{post.authorName || 'Uporabnik'}</span>
                    <span>•</span>
                    <span className="shrink-0">{(post as any).readTime || '5 min branja'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Priljubljene rubrike in oznake */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <Tag className="w-[1em] h-[1em] text-primary text-xl" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Priljubljene rubrike</h3>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {popularTopics.map((topic, index) => (
            <button
              key={index}
              onClick={() => {
                window.location.hash = '';
              }}
              className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-surface-container/60"
            >
              <span className="font-semibold text-primary">#{topic.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compose modal for sidebar CTA */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        initialType="post"
      />
    </aside>
  );
}
