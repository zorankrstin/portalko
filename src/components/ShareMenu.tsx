import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { buildPostUrl } from '../utils/urlUtils';
import { ShareModal } from './common/ShareModal';

export interface ShareMenuProps {
  url?: string;
  id?: string;
  type?: 'blog' | 'post' | 'ad' | 'event' | 'deal' | 'news';
  title?: string;
  description?: string;
  className?: string;
  buttonClassName?: string;
  showLabel?: boolean;
  label?: string;
  dropDirection?: 'up' | 'down';
  imageUrl?: string;
  category?: string;
  author?: string;
  price?: string;
  location?: string;
  discount?: string;
  date?: string;
}

export function ShareMenu({ 
  url, 
  id, 
  type,
  title = "Preveri to objavo!", 
  description,
  imageUrl,
  category,
  author,
  price,
  location,
  discount,
  date,
  className = '', 
  buttonClassName = '', 
  showLabel = false,
  label = 'Deli',
}: ShareMenuProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const getShareUrl = () => {
    if (url) return url;
    if (!id) return typeof window !== 'undefined' ? window.location.href : '';
    
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    if (type) {
      const cleanType = (type === 'post' ? 'blog' : type) as 'blog' | 'ad' | 'event' | 'deal';
      if (cleanType === 'blog' || cleanType === 'ad' || cleanType === 'event' || cleanType === 'deal') {
        const cleanPath = buildPostUrl({
          type: cleanType,
          id,
          title,
        });
        return `${origin}${cleanPath}`;
      }
    }

    // Check if id already has category prefix
    if (id.startsWith('ad-') || id.startsWith('event-') || id.startsWith('deal-') || id.startsWith('blog-') || id.startsWith('post-')) {
      const match = id.match(/^(deal|event|ad|post|blog)-(.*)$/);
      if (match) {
        const cleanType = (match[1] === 'post' ? 'blog' : match[1]) as 'blog' | 'ad' | 'event' | 'deal';
        const cleanPath = buildPostUrl({
          type: cleanType,
          id: match[2],
          title,
        });
        return `${origin}${cleanPath}`;
      }
    }

    return `${origin}/#blog-${id}`;
  };

  const shareUrl = getShareUrl();

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <button 
          onClick={handleShareClick}
          className={buttonClassName || "p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5 cursor-pointer"}
          title="Deli objavo (kopiraj povezavo ali deli na družbena omrežja)"
          aria-label="Deli objavo"
          type="button"
        >
          <Share2 className="w-4 h-4 text-outline hover:text-primary transition-colors shrink-0" />
          {showLabel && (
            <span className="text-on-surface-variant font-medium">
              {label}
            </span>
          )}
        </button>
      </div>

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          id={id}
          type={type}
          title={title}
          description={description}
          url={shareUrl}
          imageUrl={imageUrl}
          category={category}
          author={author}
          price={price}
          location={location}
          discount={discount}
          date={date}
        />
      )}
    </>
  );
}
