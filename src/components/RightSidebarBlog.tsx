import { useState } from 'react';
import { 
  BookOpen, 
  TrendingUp, 
  UserCheck, 
  Sparkles, 
  PenTool, 
  Tag, 
  ArrowRight, 
  Eye, 
  Clock, 
  Heart,
  Award
} from 'lucide-react';
import { INITIAL_BLOG_POSTS } from '../data/mockFeedData';
import { PostDetailTarget } from '../types';
import { ComposeModal } from './ComposeModal';
import { scrollToPageTop } from '../utils/scrollUtils';

interface RightSidebarBlogProps {
  onNavigatePost?: (target: PostDetailTarget) => void;
}

export function RightSidebarBlog({ onNavigatePost }: RightSidebarBlogProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const handleOpenPost = (id: string) => {
    if (onNavigatePost) {
      onNavigatePost({ type: 'blog', id });
    } else {
      window.location.hash = `blog-${id}`;
    }
    scrollToPageTop();
  };

  const topAuthors = [
    {
      name: 'Maja Zupan',
      role: 'Urednica popotniških vodnikov',
      articlesCount: 14,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0aillBK42foqYYRs3Hl0i5psDvvr2NDlrZX_P-FXMFxLDlTrJyttrIRyIM7OjAMIeCA8VDw5Da046gdbXusHkNnSCNLmgTP1y3GLJPh-_spwBhPsrnwKXD-zF6zEb144nZU8FLIklzGTs5sg8xvIs7NcM-R4fOwdNJHr4sPnR2x0Im8d6D1xpgLSCk-6lXFjnWO5W4kUTP6QjtqfjqwL9sD3BxP22cIPCehiW4qkKlJEasSlcrIVW',
      verified: true
    },
    {
      name: 'Gregor Kovič',
      role: 'Mojster prenove & gradnje',
      articlesCount: 19,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    {
      name: 'Ana Novak',
      role: 'Kulinarična blogerka',
      articlesCount: 26,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      verified: true
    },
    {
      name: 'Luka Bergant',
      role: 'Tehnološki navdušenec',
      articlesCount: 11,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      verified: false
    }
  ];

  const popularTopics = [
    { name: 'Izleti & Turizem', count: 48, tag: 'turizem' },
    { name: 'Dom & Gradnja', count: 35, tag: 'dom' },
    { name: 'Kulinarika & Recepti', count: 29, tag: 'kulinarika' },
    { name: 'Finance & Varčevanje', count: 22, tag: 'finance' },
    { name: 'Šport & Outdoor', count: 18, tag: 'šport' },
    { name: 'Tehnologija', count: 16, tag: 'tehnologija' }
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
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Najbolj brani članki</h3>
          </div>
          <span className="font-label-caps text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">Ta teden</span>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          {INITIAL_BLOG_POSTS.slice(0, 4).map((post, idx) => (
            <div
              key={post.id}
              onClick={() => handleOpenPost(post.id)}
              className="group flex gap-2.5 p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <div className="relative w-16 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/70 text-white text-[9px] font-black flex items-center justify-center">
                  {idx + 1}
                </span>
              </div>
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <h4 className="font-headline-sm text-xs font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-outline mt-1">
                  <span className="truncate">{post.author}</span>
                  <span>•</span>
                  <span className="shrink-0">{post.readTime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Priljubljeni avtorji blogov */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
          <div className="flex items-center gap-2">
            <UserCheck className="w-[1em] h-[1em] text-secondary text-xl" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">Priporočeni avtorji</h3>
          </div>
          <span className="text-[11px] text-outline font-medium">Slovenija</span>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {topAuthors.map((author, index) => (
            <div key={index} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-black/10 shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-xs font-bold text-on-surface truncate">{author.name}</span>
                    {author.verified && (
                      <Sparkles className="w-3 h-3 text-secondary shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-outline truncate">{author.role}</div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-primary shrink-0 bg-primary/5 px-2 py-0.5 rounded-lg">
                {author.articlesCount} objav
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Priljubljene rubrike in oznake */}
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
              <span className="text-[10px] text-outline">({topic.count})</span>
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
