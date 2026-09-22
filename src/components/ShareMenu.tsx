import React, { useState, useRef, useEffect } from 'react';
import { Share2, Facebook, Linkedin, Link as LinkIcon, Check, Send, Mail } from 'lucide-react';

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const ViberIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.98 5.603c-.23-1.077-.866-2.022-1.748-2.613-1.127-.753-2.453-1.002-3.805-.851-1.306.143-2.529.626-3.568 1.402-1.659 1.233-2.68 3.109-2.829 5.18-.088 1.218.17 2.451.789 3.493.593 1.006 1.42 1.83 2.42 2.443.918.56 1.942.863 3 .961 1.704.161 3.409-.346 4.782-1.424 1.34-1.054 2.213-2.583 2.502-4.298.3-1.786.012-3.666-.867-5.26-.201-.366-.466-.694-.776-.933zm-9.06 9.832c-.853-.615-1.604-1.401-2.196-2.29-.636-.96-.921-2.087-.9-3.21.026-1.34.61-2.624 1.554-3.57.946-.948 2.247-1.492 3.593-1.464 1.139.025 2.223.364 3.167.97.946.61 1.7 1.445 2.19 2.419.645 1.282.784 2.766.417 4.142-.295 1.085-.863 2.072-1.636 2.834-.848.835-1.922 1.41-3.097 1.638-1.144.22-2.333.107-3.415-.366a5.454 5.454 0 0 1-1.344-.811L7.76 17.51l.93-2.223a7.484 7.484 0 0 1 2.23-1.852z"/>
  </svg>
);

const MessengerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.14 2 11.246c0 2.9 1.455 5.485 3.738 7.152v3.6l3.42-1.89c.895.247 1.85.38 2.842.38 5.523 0 10-4.14 10-9.242S17.523 2 12 2zm1.093 12.443-2.81-2.997-5.48 2.997 6.012-6.39 2.892 2.997 5.397-2.997-6.01 6.39z"/>
  </svg>
);

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
}

export function ShareMenu({ 
  url, 
  id, 
  type,
  title = "Preveri to objavo!", 
  description,
  className = '', 
  buttonClassName = '', 
  showLabel = false,
  label = 'Deli',
  dropDirection = 'up'
}: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getShareUrl = () => {
    if (url) return url;
    if (!id) return window.location.href;
    
    const origin = window.location.origin;
    const path = window.location.pathname;

    // Check if id already has category prefix
    if (id.startsWith('ad-') || id.startsWith('event-') || id.startsWith('deal-') || id.startsWith('blog-') || id.startsWith('post-')) {
      return `${origin}${path}#${id}`;
    }

    if (type) {
      const cleanType = type === 'post' ? 'blog' : type;
      return `${origin}${path}#${cleanType}-${id}`;
    }

    return `${origin}${path}#blog-${id}`;
  };

  const shareUrl = getShareUrl();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = async (targetUrl?: string) => {
    const textToCopy = targetUrl || shareUrl;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentShareUrl = getShareUrl();
    const shareTitle = title || 'Portalko';
    const shareText = description 
      ? (description.length > 140 ? description.slice(0, 137) + '...' : description)
      : 'Oglejte si to objavo na slovenskem portalu Portalko!';

    // Check if Web Share API is supported in the browser
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const shareData = {
        title: shareTitle,
        text: shareText,
        url: currentShareUrl,
      };

      let canShareData = true;
      if (typeof navigator.canShare === 'function') {
        try {
          canShareData = navigator.canShare(shareData);
        } catch {
          canShareData = true;
        }
      }

      if (canShareData) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            // User cancelled the native share sheet
            return;
          }
          console.warn('Native share failed or was restricted, falling back to copy & menu:', err);
        }
      }
    }

    // Fallback: Copy link directly to clipboard and open menu
    await copyToClipboard(currentShareUrl);
    setIsOpen((prev) => !prev);
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    setIsOpen(false);
  };

  const shareX = () => {
    window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, '_blank');
    setIsOpen(false);
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`, '_blank');
    setIsOpen(false);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + shareUrl)}`, '_blank');
    setIsOpen(false);
  };

  const shareViber = () => {
    window.open(`viber://forward?text=${encodeURIComponent(title + ' ' + shareUrl)}`, '_self');
    setIsOpen(false);
  };

  const shareMessenger = () => {
    window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`, '_self');
    setIsOpen(false);
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Priporočam v branje: ${title}`);
    const body = encodeURIComponent(`Pozdravljeni,\n\nNa Portalko.net sem našel zanimivo objavo: "${title}".\n\nOgled objave:\n${shareUrl}\n\nLep pozdrav!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsOpen(false);
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button 
        onClick={handleShareClick}
        className={buttonClassName || "p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5 cursor-pointer"}
        title={copied ? "Povezava kopirana!" : "Deli objavo (Web Share / Kopiraj povezavo)"}
        aria-label="Deli objavo"
        type="button"
      >
        {copied ? (
          <Check className="w-4 h-4 text-primary shrink-0" />
        ) : (
          <Share2 className="w-4 h-4 text-outline hover:text-primary transition-colors shrink-0" />
        )}
        {showLabel && (
          <span className={`text-on-surface-variant font-medium ${copied ? 'text-primary font-bold' : ''}`}>
            {copied ? 'Kopirano!' : label}
          </span>
        )}
      </button>

      {/* Floating feedback toast badge when copied without opening full menu */}
      {copied && !isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-0.5 rounded-md bg-inverse-surface text-inverse-on-surface text-[11px] font-semibold whitespace-nowrap shadow-md z-[110] animate-in fade-in">
          Povezava kopirana!
        </div>
      )}

      {isOpen && (
        <div className={`absolute right-0 ${dropDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'} w-52 bg-surface-container-lowest rounded-xl shadow-elevation-3 border border-surface-container py-1.5 z-[100] flex flex-col gap-0.5`}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              copyToClipboard();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <LinkIcon className="w-4 h-4 text-on-surface-variant" />}
            <span className={copied ? 'text-primary font-bold' : ''}>
              {copied ? 'Kopirano v odložišče!' : 'Kopiraj povezavo'}
            </span>
          </button>

          {hasNativeShare && (
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await navigator.share({
                    title: title || 'Portalko',
                    text: description || title || 'Preveri objavo!',
                    url: shareUrl,
                  });
                  setIsOpen(false);
                } catch {}
              }}
              className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-primary font-medium cursor-pointer"
            >
              <Send className="w-4 h-4 text-primary" />
              <span>Sistemska delitev...</span>
            </button>
          )}
          
          <div className="h-px w-full bg-surface-container my-1"></div>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareWhatsApp();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
            WhatsApp
          </button>

          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareViber();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <ViberIcon className="w-4 h-4 text-[#7360F2]" />
            Viber
          </button>

          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareMessenger();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <MessengerIcon className="w-4 h-4 text-[#00B2FF]" />
            Messenger
          </button>

          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareFacebook();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <Facebook className="w-4 h-4 text-[#1877F2]" />
            Facebook
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareX();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <XIcon className="w-4 h-4 text-on-surface" />
            X (Twitter)
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareLinkedIn();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            LinkedIn
          </button>

          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              shareEmail();
            }} 
            className="w-full px-4 py-2 text-left font-body-sm text-sm hover:bg-surface-container-low flex items-center gap-3 transition-colors text-on-surface cursor-pointer"
          >
            <Mail className="w-4 h-4 text-primary" />
            E-pošta
          </button>
        </div>
      )}
    </div>
  );
}
