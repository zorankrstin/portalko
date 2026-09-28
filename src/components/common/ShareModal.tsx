import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Mail, 
  Send, 
  Smartphone, 
  Sparkles,
  Link as LinkIcon,
  MessageCircle,
  Facebook,
  Linkedin,
  Tag,
  Calendar,
  MapPin,
  Store
} from 'lucide-react';
import { buildPostUrl } from '../../utils/urlUtils';
import { getActiveFallbackImage, handleImageFallbackError } from '../../services/portalSettingsService';

export const XLogoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

export const WhatsAppLogoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export const ViberLogoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.98 5.603c-.23-1.077-.866-2.022-1.748-2.613-1.127-.753-2.453-1.002-3.805-.851-1.306.143-2.529.626-3.568 1.402-1.659 1.233-2.68 3.109-2.829 5.18-.088 1.218.17 2.451.789 3.493.593 1.006 1.42 1.83 2.42 2.443.918.56 1.942.863 3 .961 1.704.161 3.409-.346 4.782-1.424 1.34-1.054 2.213-2.583 2.502-4.298.3-1.786.012-3.666-.867-5.26-.201-.366-.466-.694-.776-.933zm-9.06 9.832c-.853-.615-1.604-1.401-2.196-2.29-.636-.96-.921-2.087-.9-3.21.026-1.34.61-2.624 1.554-3.57.946-.948 2.247-1.492 3.593-1.464 1.139.025 2.223.364 3.167.97.946.61 1.7 1.445 2.19 2.419.645 1.282.784 2.766.417 4.142-.295 1.085-.863 2.072-1.636 2.834-.848.835-1.922 1.41-3.097 1.638-1.144.22-2.333.107-3.415-.366a5.454 5.454 0 0 1-1.344-.811L7.76 17.51l.93-2.223a7.484 7.484 0 0 1 2.23-1.852z"/>
  </svg>
);

export const TelegramLogoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url?: string;
  id?: string;
  type?: 'ad' | 'event' | 'deal' | 'blog' | 'post' | 'news';
  imageUrl?: string;
  description?: string;
  category?: string;
  author?: string;
  price?: string;
  location?: string;
  discount?: string;
  date?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  url,
  id,
  type = 'post',
  imageUrl,
  description,
  category,
  author,
  price,
  location,
  discount,
  date,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive canonical or current URL
  const resolvedUrl = React.useMemo(() => {
    if (url) return url;
    if (typeof window !== 'undefined') {
      if (id && type) {
        const cleanType = (type === 'post' ? 'blog' : type) as 'blog' | 'ad' | 'event' | 'deal';
        if (cleanType === 'blog' || cleanType === 'ad' || cleanType === 'event' || cleanType === 'deal') {
          return `${window.location.origin}${buildPostUrl({ type: cleanType, id, title })}`;
        }
      }
      return window.location.href;
    }
    return '';
  }, [url, id, type, title]);

  // Clean description excerpt
  const cleanExcerpt = React.useMemo(() => {
    if (!description) return '';
    const raw = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    return raw.length > 160 ? `${raw.slice(0, 157)}...` : raw;
  }, [description]);

  // Determine highlights
  const highlights: string[] = [];
  if (type === 'ad' && price) highlights.push(`Cena: ${price}`);
  if (type === 'deal' && discount) highlights.push(`Popust: ${discount}`);
  if (type === 'event' && date) highlights.push(`Datum: ${date}`);
  if (location) highlights.push(`Lokacija: ${location}`);
  const highlightSnippet = highlights.length > 0 ? ` (${highlights.join(' • ')})` : '';

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyLinkToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = resolvedUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Kopiranje povezave ni uspelo', err);
    }
  };

  const copyCustomNoteToClipboard = async () => {
    const textToCopy = customNote.trim() 
      ? `${customNote.trim()}\n\n📢 [Portalko] ${title}${highlightSnippet}\n🔗 ${resolvedUrl}`
      : `📢 [Portalko] ${title}${highlightSnippet}\n\n${cleanExcerpt ? `${cleanExcerpt}\n\n` : ''}🔗 Povezava: ${resolvedUrl}`;

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
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2500);
    } catch (err) {
      console.error('Kopiranje besedila ni uspelo', err);
    }
  };

  // Social sharing handlers
  const handleFacebookShare = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const handleXShare = () => {
    const text = customNote.trim()
      ? `${customNote.trim()} ${title}${highlightSnippet}`
      : `${title}${highlightSnippet} | Portalko`;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(text)}&hashtags=Portalko,Slovenija`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const handleWhatsAppShare = () => {
    const message = customNote.trim() 
      ? `${customNote.trim()}\n\n*${title}*${highlightSnippet}\n${resolvedUrl}`
      : `*${title}*${highlightSnippet}\n${cleanExcerpt ? `${cleanExcerpt}\n` : ''}${resolvedUrl}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleViberShare = () => {
    const message = customNote.trim() 
      ? `${customNote.trim()} ${title} ${resolvedUrl}`
      : `${title}${highlightSnippet} - ${resolvedUrl}`;
    const shareUrl = `viber://forward?text=${encodeURIComponent(message)}`;
    window.location.href = shareUrl;
  };

  const handleLinkedInShare = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const handleTelegramShare = () => {
    const text = customNote.trim() ? `${customNote.trim()} - ${title}` : title;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const handleEmailShare = () => {
    const subject = `Priporočam v ogled: ${title} na Portalko.net`;
    const body = `Pozdravljeni,\n\nNa slovenskem portalu Portalko.net sem našel zanimivo vsebino:\n\n` +
      `"${title}"${highlightSnippet}\n\n` +
      (customNote.trim() ? `Komentar pošiljatelja:\n"${customNote.trim()}"\n\n` : '') +
      (cleanExcerpt ? `Povzetek:\n${cleanExcerpt}\n\n` : '') +
      `Povezava:\n${resolvedUrl}\n\n` +
      `Lep pozdrav!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!hasNativeShare) return;
    try {
      await navigator.share({
        title,
        text: customNote.trim() || cleanExcerpt || title,
        url: resolvedUrl,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed', err);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        className="w-full max-w-lg bg-surface-container-lowest text-on-surface rounded-3xl shadow-2xl border border-surface-container flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-container-low flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="share-modal-title" className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                Deli objavo
              </h2>
              <p className="text-xs text-on-surface-variant">
                Kopirajte povezavo ali delite na družbena omrežja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Zapri okno (Esc)"
            aria-label="Zapri okno"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* Post Preview Snippet */}
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low/60 border border-surface-container">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="" 
                className="w-16 h-16 rounded-xl object-cover shrink-0 bg-surface-container ring-1 ring-black/5"
                onError={handleImageFallbackError}
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                <Share2 className="w-7 h-7 opacity-70" />
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  {category || (type === 'ad' ? 'Mali oglas' : type === 'event' ? 'Dogodek' : type === 'deal' ? 'Ugodnost' : 'Članek')}
                </span>
                {author && (
                  <span className="text-[11px] text-outline truncate">
                    • {author}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface line-clamp-2 leading-snug">
                {title}
              </h3>
              {highlightSnippet && (
                <span className="text-[11px] font-semibold text-secondary mt-0.5 truncate">
                  {highlightSnippet}
                </span>
              )}
            </div>
          </div>

          {/* 1. Direct Copy Link */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-on-surface flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                <span>Povezava do objave</span>
              </span>
              <span className="text-[11px] text-outline font-normal">Kliknite za kopiranje</span>
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-container-low border border-surface-container focus-within:border-primary transition-colors">
              <input
                ref={inputRef}
                type="text"
                readOnly
                value={resolvedUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-transparent px-2.5 py-1 text-xs text-on-surface font-mono outline-none select-all truncate"
              />
              <button
                type="button"
                id="btn-share-modal-copy-url"
                onClick={copyLinkToClipboard}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  copiedLink
                    ? 'bg-secondary text-on-secondary ring-2 ring-secondary/30 scale-102'
                    : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Kopirano!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiraj</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Social Media Grid */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-on-surface flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span>Deli prek družbenih omrežij & aplikacij</span>
              </span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Facebook */}
              <button
                type="button"
                onClick={handleFacebookShare}
                className="p-2.5 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-[#1877F2]/20"
                title="Deli na Facebook"
              >
                <div className="w-7 h-7 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Facebook className="w-4 h-4 fill-white" />
                </div>
                <span className="truncate">Facebook</span>
              </button>

              {/* X / Twitter */}
              <button
                type="button"
                onClick={handleXShare}
                className="p-2.5 rounded-2xl bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15 text-on-surface font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-surface-container"
                title="Objavi na omrežju X (Twitter)"
              >
                <div className="w-7 h-7 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-2xs">
                  <XLogoIcon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">X (Twitter)</span>
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="p-2.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-[#25D366]/20"
                title="Pošlji prek WhatsApp"
              >
                <div className="w-7 h-7 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <WhatsAppLogoIcon className="w-4 h-4" />
                </div>
                <span className="truncate">WhatsApp</span>
              </button>

              {/* Viber */}
              <button
                type="button"
                onClick={handleViberShare}
                className="p-2.5 rounded-2xl bg-[#7360F2]/10 hover:bg-[#7360F2]/20 text-[#7360F2] font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-[#7360F2]/20"
                title="Pošlji prek Viber"
              >
                <div className="w-7 h-7 rounded-xl bg-[#7360F2] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ViberLogoIcon className="w-4 h-4" />
                </div>
                <span className="truncate">Viber</span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={handleTelegramShare}
                className="p-2.5 rounded-2xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-[#229ED9]/20"
                title="Deli prek Telegram"
              >
                <div className="w-7 h-7 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <TelegramLogoIcon className="w-4 h-4" />
                </div>
                <span className="truncate">Telegram</span>
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                onClick={handleLinkedInShare}
                className="p-2.5 rounded-2xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-[#0A66C2]/20"
                title="Objavi na LinkedIn"
              >
                <div className="w-7 h-7 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Linkedin className="w-4 h-4 fill-white" />
                </div>
                <span className="truncate">LinkedIn</span>
              </button>

              {/* E-pošta */}
              <button
                type="button"
                onClick={handleEmailShare}
                className="p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center gap-2 transition-all hover:scale-102 cursor-pointer border border-amber-500/20"
                title="Pošlji po elektronski pošti"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="truncate">E-pošta</span>
              </button>

              {/* Native Web Share API (če je na voljo) */}
              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="col-span-2 sm:col-span-2 p-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs flex items-center justify-center gap-2 transition-all hover:scale-102 cursor-pointer border border-primary/25"
                  title="Odpri sistemski meni za deljenje (AirDrop, Bluetooth, druge aplikacije)"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Več možnosti (Meni naprave)</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Optional Custom Note & Preformatted text */}
          <div className="pt-2 border-t border-surface-container-low flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowNoteEditor(!showNoteEditor)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showNoteEditor ? 'Zapri opombo' : '+ Dodaj osebno opombo k sporočilu'}</span>
              </button>
              <button
                type="button"
                onClick={copyCustomNoteToClipboard}
                className="text-xs text-on-surface-variant hover:text-primary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Kopiraj celotno besedilo s povzetkom objave"
              >
                {copiedNote ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNote ? 'Besedilo kopirano!' : 'Kopiraj celotno sporočilo'}</span>
              </button>
            </div>

            {showNoteEditor && (
              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-surface-container-low border border-surface-container animate-in fade-in duration-200">
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Vpišite poljubno sporočilo ali komentar, ki bo dodan povezavi..."
                  rows={2}
                  className="w-full bg-surface-container-lowest p-2.5 rounded-xl text-xs text-on-surface border border-surface-container outline-none focus:border-primary resize-none"
                />
                <span className="text-[10px] text-outline">
                  Vaša opomba se bo avtomatsko vključila v sporočilo za WhatsApp, X, e-pošto in kopirano besedilo.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-container-low bg-surface-container-low/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
}
