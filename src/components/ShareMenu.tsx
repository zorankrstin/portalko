import React, { useState, useEffect, useRef } from 'react';
import { Share2 } from 'lucide-react';
import { buildPostUrl } from '../utils/urlUtils';
import { ShareModal } from './common/ShareModal';
import { useShares } from '../contexts/ShareContext';

export interface ShareMenuProps {
  url?: string;
  id?: string;
  type?: 'blog' | 'post' | 'ad' | 'event' | 'deal' | 'news';
  title?: string;
  description?: string;
  className?: string;
  buttonClassName?: string;
  showLabel?: boolean;
  showCount?: boolean;
  initialSharesCount?: number;
  countClassName?: string;
  label?: string;
  dropDirection?: 'up' | 'down';
  imageUrl?: string;
  category?: string;
  author?: string;
  price?: string;
  location?: string;
  discount?: string;
  date?: string;
  onShareIncrement?: (newCount: number) => void;
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
  showCount,
  initialSharesCount = 0,
  countClassName = '',
  label = 'Deli',
  onShareIncrement,
}: ShareMenuProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);
  const [isCountPopping, setIsCountPopping] = useState(false);
  const { getSharesCount, incrementShareCount } = useShares();

  const shouldShowCount = showCount !== undefined ? showCount : showLabel;
  const hasShareTarget = Boolean(id || (type === 'news' && url));
  const sharesCount = hasShareTarget ? getSharesCount(id, type, url, initialSharesCount) : 0;

  const buttonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef<number>(sharesCount);
  const hasMountedRef = useRef(false);

  const triggerButtonAnimation = () => {
    if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    setIsButtonAnimating(false);
    requestAnimationFrame(() => {
      setIsButtonAnimating(true);
      buttonTimerRef.current = setTimeout(() => {
        setIsButtonAnimating(false);
      }, 540);
    });
  };

  const triggerCountAnimation = () => {
    if (countTimerRef.current) clearTimeout(countTimerRef.current);
    setIsCountPopping(false);
    requestAnimationFrame(() => {
      setIsCountPopping(true);
      countTimerRef.current = setTimeout(() => {
        setIsCountPopping(false);
      }, 500);
    });
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevCountRef.current = sharesCount;
      return;
    }
    if (sharesCount > prevCountRef.current) {
      triggerCountAnimation();
    }
    prevCountRef.current = sharesCount;
  }, [sharesCount]);

  useEffect(() => {
    return () => {
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
      if (countTimerRef.current) clearTimeout(countTimerRef.current);
    };
  }, []);

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

    triggerButtonAnimation();
    setIsShareModalOpen(true);

    if (hasShareTarget) {
      triggerCountAnimation();
      void incrementShareCount({
        id,
        type,
        url: url || shareUrl,
        initialCount: initialSharesCount,
      }).then((nextCount) => {
        if (onShareIncrement) {
          onShareIncrement(nextCount);
        }
      });
    }
  };

  const baseButtonClasses =
    buttonClassName ||
    "p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5 cursor-pointer group";

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <button 
          onClick={handleShareClick}
          className={`${baseButtonClasses} ${
            isButtonAnimating ? 'animate-share-bounce text-primary bg-primary/10' : ''
          }`}
          title={hasShareTarget ? `Deli objavo (${sharesCount} delitev)` : "Deli objavo (kopiraj povezavo ali deli na družbena omrežja)"}
          aria-label={hasShareTarget ? `Deli objavo, število delitev: ${sharesCount}` : "Deli objavo"}
          type="button"
        >
          <Share2
            className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
              isButtonAnimating
                ? 'scale-125 text-primary'
                : sharesCount > 0 && shouldShowCount
                ? 'text-primary'
                : 'text-outline group-hover:text-primary'
            }`}
          />
          {showLabel && (
            <span className={`font-medium ${isButtonAnimating ? 'text-primary' : 'text-on-surface-variant'}`}>
              {label}
            </span>
          )}
          {shouldShowCount && hasShareTarget && (
            <span
              className={
                countClassName ||
                `inline-block text-xs font-semibold tabular-nums transition-colors duration-200 ${
                  isCountPopping
                    ? 'animate-share-count-pop text-primary font-extrabold'
                    : sharesCount > 0
                    ? 'text-primary font-bold'
                    : 'text-outline'
                }`
              }
            >
              {sharesCount}
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
