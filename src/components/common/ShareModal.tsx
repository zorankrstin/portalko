import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Mail,
  Smartphone,
  Link as LinkIcon,
  Facebook,
  Linkedin,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { buildPostUrl } from '../../utils/urlUtils';
import { getPlainTextSnippet } from '../../utils/textUtils';
import { getActiveFallbackImage } from '../../services/portalSettingsService';
import { useShares } from '../../contexts/ShareContext';

export const XLogoIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

export const WhatsAppLogoIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export const ViberLogoIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.98 5.603c-.23-1.077-.866-2.022-1.748-2.613-1.127-.753-2.453-1.002-3.805-.851-1.306.143-2.529.626-3.568 1.402-1.659 1.233-2.68 3.109-2.829 5.18-.088 1.218.17 2.451.789 3.493.593 1.006 1.42 1.83 2.42 2.443.918.56 1.942.863 3 .961 1.704.161 3.409-.346 4.782-1.424 1.34-1.054 2.213-2.583 2.502-4.298.3-1.786.012-3.666-.867-5.26-.201-.366-.466-.694-.776-.933zm-9.06 9.832c-.853-.615-1.604-1.401-2.196-2.29-.636-.96-.921-2.087-.9-3.21.026-1.34.61-2.624 1.554-3.57.946-.948 2.247-1.492 3.593-1.464 1.139.025 2.223.364 3.167.97.946.61 1.7 1.445 2.19 2.419.645 1.282.784 2.766.417 4.142-.295 1.085-.863 2.072-1.636 2.834-.848.835-1.922 1.41-3.097 1.638-1.144.22-2.333.107-3.415-.366a5.454 5.454 0 0 1-1.344-.811L7.76 17.51l.93-2.223a7.484 7.484 0 0 1 2.23-1.852z" />
  </svg>
);

export const TelegramLogoIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

type PreviewPlatform = 'facebook' | 'x' | 'whatsapp';

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

function resolveBestPreviewMedia(imageUrl?: string, description?: string): { src: string; isFallback: boolean } {
  const direct = (imageUrl || '').trim();
  if (direct && !direct.endsWith('/favicon.png')) {
    return { src: direct, isFallback: false };
  }

  if (description && typeof description === 'string') {
    const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1] && !imgMatch[1].trim().endsWith('/favicon.png')) {
      return { src: imgMatch[1].trim(), isFallback: false };
    }

    const ytMatch = description.match(
      /(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
    );
    if (ytMatch?.[1]) {
      return { src: `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`, isFallback: false };
    }
  }

  const portalFallback = getActiveFallbackImage();
  if (portalFallback && !portalFallback.endsWith('/favicon.png')) {
    return { src: portalFallback, isFallback: false };
  }

  return { src: '/favicon.png', isFallback: true };
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
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('facebook');
  const [previewImgFailed, setPreviewImgFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerShareFeedback } = useShares();

  // Derive canonical or current URL
  const resolvedUrl = useMemo(() => {
    if (url) return url;
    if (typeof window !== 'undefined') {
      if (id && type) {
        const cleanType = (type === 'post' ? 'blog' : type) as 'blog' | 'ad' | 'event' | 'deal';
        if (cleanType === 'blog' || cleanType === 'ad' || cleanType === 'event' || cleanType === 'deal') {
          return `${window.location.origin}${buildPostUrl({
            type: cleanType,
            id,
            title,
            category,
            categoryName: category,
          })}`;
        }
      }
      return window.location.href;
    }
    return 'https://portalko.net';
  }, [url, id, type, title, category]);

  const displayDomain = useMemo(() => {
    try {
      const parsed = new URL(resolvedUrl);
      return parsed.hostname.replace(/^www\./i, '') || 'portalko.net';
    } catch {
      return 'portalko.net';
    }
  }, [resolvedUrl]);

  const cleanTitle = useMemo(() => {
    return getPlainTextSnippet(title) || title || 'Portalko objava';
  }, [title]);

  const cleanExcerpt = useMemo(() => {
    if (!description) return '';
    const plain = getPlainTextSnippet(description);
    return plain.length > 155 ? `${plain.slice(0, 152).trim()}...` : plain;
  }, [description]);

  const previewMedia = useMemo(() => {
    return resolveBestPreviewMedia(imageUrl, description);
  }, [imageUrl, description]);

  useEffect(() => {
    setPreviewImgFailed(false);
  }, [previewMedia.src]);

  // Determine highlights
  const highlights: string[] = [];
  if (type === 'ad' && price) highlights.push(`Cena: ${price}`);
  if (type === 'deal' && discount) highlights.push(`Popust: ${discount}`);
  if (type === 'event' && date) highlights.push(`Datum: ${date}`);
  if (location) highlights.push(`Lokacija: ${location}`);
  const highlightSnippet = highlights.length > 0 ? highlights.join(' · ') : '';

  const categoryLabel =
    category ||
    (type === 'ad'
      ? 'Mali oglasi'
      : type === 'event'
      ? 'Dogodki'
      : type === 'deal'
      ? 'Akcije'
      : type === 'news'
      ? 'Novice'
      : 'Blog');

  const metaParts = [categoryLabel, author, highlightSnippet].filter(Boolean);
  const previewFallbackDescription =
    cleanExcerpt ||
    (highlightSnippet ? `${highlightSnippet} — Preberite več na portalu Portalko.` : 'Slovenski spletni portal za novice, male oglase, dogodke in ugodnosti.');

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

  const showFallbackVisual = previewMedia.isFallback || previewImgFailed;
  const activePreviewImg = showFallbackVisual ? '/favicon.png' : previewMedia.src;

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
      triggerShareFeedback({
        title: 'Povezava uspešno kopirana!',
        subtitle: cleanTitle,
        url: resolvedUrl,
        imageUrl: activePreviewImg,
        domain: displayDomain,
        showConfetti: false,
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Kopiranje povezave ni uspelo', err);
    }
  };

  const copyCustomNoteToClipboard = async () => {
    const highlightNote = highlightSnippet ? ` (${highlightSnippet})` : '';
    const textToCopy = customNote.trim()
      ? `${customNote.trim()}\n\n[Portalko] ${cleanTitle}${highlightNote}\n${resolvedUrl}`
      : `[Portalko] ${cleanTitle}${highlightNote}\n\n${cleanExcerpt ? `${cleanExcerpt}\n\n` : ''}Povezava: ${resolvedUrl}`;

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
      triggerShareFeedback({
        title: 'Besedilo za deljenje kopirano!',
        subtitle: cleanTitle,
        url: resolvedUrl,
        imageUrl: activePreviewImg,
        domain: displayDomain,
        showConfetti: false,
      });
      setTimeout(() => setCopiedNote(false), 2500);
    } catch (err) {
      console.error('Kopiranje besedila ni uspelo', err);
    }
  };

  const notifySocialShareSuccess = (networkLabel: string) => {
    triggerShareFeedback({
      title: `Deljeno prek ${networkLabel}!`,
      subtitle: cleanTitle,
      url: resolvedUrl,
      imageUrl: activePreviewImg,
      domain: displayDomain,
      showConfetti: true,
    });
  };

  const handleFacebookShare = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    notifySocialShareSuccess('Facebooka');
  };

  const handleXShare = () => {
    const suffix = highlightSnippet ? ` (${highlightSnippet})` : '';
    const text = customNote.trim()
      ? `${customNote.trim()} ${cleanTitle}${suffix}`
      : `${cleanTitle}${suffix} | Portalko`;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(text)}&hashtags=Portalko,Slovenija`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    notifySocialShareSuccess('omrežja X');
  };

  const handleWhatsAppShare = () => {
    const suffix = highlightSnippet ? ` (${highlightSnippet})` : '';
    const message = customNote.trim()
      ? `${customNote.trim()}\n\n*${cleanTitle}*${suffix}\n${resolvedUrl}`
      : `*${cleanTitle}*${suffix}\n${cleanExcerpt ? `${cleanExcerpt}\n` : ''}${resolvedUrl}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    notifySocialShareSuccess('WhatsAppa');
  };

  const handleViberShare = () => {
    const suffix = highlightSnippet ? ` (${highlightSnippet})` : '';
    const message = customNote.trim()
      ? `${customNote.trim()} ${cleanTitle} ${resolvedUrl}`
      : `${cleanTitle}${suffix} - ${resolvedUrl}`;
    const shareUrl = `viber://forward?text=${encodeURIComponent(message)}`;
    window.location.href = shareUrl;
    notifySocialShareSuccess('Viberja');
  };

  const handleLinkedInShare = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    notifySocialShareSuccess('LinkedIna');
  };

  const handleTelegramShare = () => {
    const text = customNote.trim() ? `${customNote.trim()} - ${cleanTitle}` : cleanTitle;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    notifySocialShareSuccess('Telegrama');
  };

  const handleEmailShare = () => {
    const suffix = highlightSnippet ? ` (${highlightSnippet})` : '';
    const subject = `Priporočam v ogled: ${cleanTitle} na Portalko.net`;
    const body =
      `Pozdravljeni,\n\nNa slovenskem portalu Portalko.net sem našel zanimivo vsebino:\n\n` +
      `"${cleanTitle}"${suffix}\n\n` +
      (customNote.trim() ? `Komentar pošiljatelja:\n"${customNote.trim()}"\n\n` : '') +
      (cleanExcerpt ? `Povzetek:\n${cleanExcerpt}\n\n` : '') +
      `Povezava:\n${resolvedUrl}\n\n` +
      `Lep pozdrav!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    notifySocialShareSuccess('e-pošte');
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!hasNativeShare) return;
    try {
      await navigator.share({
        title: cleanTitle,
        text: customNote.trim() || cleanExcerpt || cleanTitle,
        url: resolvedUrl,
      });
      triggerShareFeedback({
        title: 'Objava uspešno deljena!',
        subtitle: cleanTitle,
        url: resolvedUrl,
        imageUrl: activePreviewImg,
        domain: displayDomain,
        showConfetti: true,
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed', err);
      }
    }
  };

  const platformHelperLabel =
    previewPlatform === 'facebook'
      ? 'Facebooku'
      : previewPlatform === 'x'
      ? 'omrežju X'
      : 'WhatsAppu / Viberju';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="w-full max-w-xl bg-surface-container-lowest text-on-surface rounded-3xl shadow-2xl border border-surface-container flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-container-low flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="share-modal-title" className="font-headline-sm text-base sm:text-lg font-bold text-on-surface truncate">
                Deli objavo
              </h2>
              <p className="text-xs text-on-surface-variant truncate">
                Kopirajte povezavo ali preverite videz na družbenih omrežjih
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-primary"
            title="Zapri okno (Esc)"
            aria-label="Zapri okno"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5">
          {/* 1. Social Media Appearance Preview */}
          <section aria-labelledby="share-preview-heading" className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span id="share-preview-heading" className="text-xs font-bold text-on-surface">
                  Predogled na družbenih omrežjih
                </span>
              </div>

              {/* Interactive Platform Switcher */}
              <div
                className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low border border-surface-container"
                role="tablist"
                aria-label="Izberite platformo za predogled"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewPlatform === 'facebook'}
                  onClick={() => setPreviewPlatform('facebook')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    previewPlatform === 'facebook'
                      ? 'bg-surface-container-lowest text-[#1877F2] shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Facebook
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewPlatform === 'x'}
                  onClick={() => setPreviewPlatform('x')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    previewPlatform === 'x'
                      ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  X
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewPlatform === 'whatsapp'}
                  onClick={() => setPreviewPlatform('whatsapp')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    previewPlatform === 'whatsapp'
                      ? 'bg-surface-container-lowest text-emerald-700 dark:text-emerald-400 shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Platform-Specific Preview Card */}
            {previewPlatform === 'facebook' && (
              <div className="rounded-2xl overflow-hidden border border-surface-container-high bg-[#F0F2F5] dark:bg-surface-container-low shadow-2xs">
                <div className="w-full h-40 sm:h-44 bg-surface-container relative overflow-hidden flex items-center justify-center">
                  {!showFallbackVisual ? (
                    <img
                      src={activePreviewImg}
                      alt={cleanTitle}
                      className="w-full h-full object-cover"
                      onError={() => setPreviewImgFailed(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-4">
                      <img
                        src="/favicon.png"
                        alt="Portalko"
                        className="w-14 h-14 object-contain rounded-xl"
                      />
                      <span className="text-[11px] font-medium text-on-surface-variant">
                        Portalko · predogled povezave
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-surface-container-high/70 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-outline truncate">
                    {displayDomain}
                  </span>
                  <h3 className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">
                    {cleanTitle}
                  </h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {previewFallbackDescription}
                  </p>
                  {metaParts.length > 0 && (
                    <p className="text-[11px] text-outline truncate pt-0.5">
                      {metaParts.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {previewPlatform === 'x' && (
              <div className="rounded-2xl overflow-hidden border border-surface-container-high bg-surface-container-lowest shadow-2xs">
                <div className="w-full h-36 sm:h-40 bg-surface-container relative overflow-hidden flex items-center justify-center">
                  {!showFallbackVisual ? (
                    <img
                      src={activePreviewImg}
                      alt={cleanTitle}
                      className="w-full h-full object-cover"
                      onError={() => setPreviewImgFailed(true)}
                    />
                  ) : (
                    <img
                      src="/favicon.png"
                      alt="Portalko"
                      className="w-14 h-14 object-contain rounded-xl"
                    />
                  )}
                  <span className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-medium">
                    {displayDomain}
                  </span>
                </div>
                <div className="px-4 py-3 border-t border-surface-container flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-on-surface line-clamp-2 leading-snug">
                    {cleanTitle}
                  </h3>
                  <p className="text-xs text-on-surface-variant line-clamp-1 leading-relaxed">
                    {previewFallbackDescription}
                  </p>
                </div>
              </div>
            )}

            {previewPlatform === 'whatsapp' && (
              <div className="rounded-2xl border border-emerald-600/20 bg-emerald-500/8 p-3.5 flex flex-col gap-2">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-lowest/90 border border-surface-container">
                  {!showFallbackVisual ? (
                    <img
                      src={activePreviewImg}
                      alt={cleanTitle}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 bg-surface-container"
                      onError={() => setPreviewImgFailed(true)}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      <img src="/favicon.png" alt="Portalko" className="w-10 h-10 object-contain" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-on-surface line-clamp-2 leading-snug">
                      {cleanTitle}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-snug">
                      {previewFallbackDescription}
                    </p>
                    <span className="text-[11px] text-outline truncate mt-0.5">
                      {displayDomain}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium px-1 min-w-0">
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate underline decoration-primary/40">{resolvedUrl}</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-on-surface-variant leading-snug">
              {showFallbackVisual
                ? `Objava nima lastne fotografije – ob delitvi na ${platformHelperLabel} se prikažeta naslov in logotip portala.`
                : `Tako bosta naslov in slika prikazana ob delitvi na ${platformHelperLabel}.`}
            </p>
          </section>

          {/* 2. Direct Copy Link Bar */}
          <div className="flex flex-col gap-2">
            <label htmlFor="share-modal-url-input" className="text-xs font-bold text-on-surface flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-primary" />
                <span>Neposredna povezava</span>
              </span>
              <span className="text-[11px] text-outline font-normal">Kliknite za kopiranje</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-surface-container-low border border-surface-container focus-within:border-primary transition-colors">
              <input
                id="share-modal-url-input"
                ref={inputRef}
                type="text"
                readOnly
                value={resolvedUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full min-w-0 bg-transparent px-3 py-2 text-xs text-on-surface font-mono outline-none select-all truncate"
              />
              <button
                type="button"
                id="btn-share-modal-copy-url"
                onClick={copyLinkToClipboard}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-primary ${
                  copiedLink
                    ? 'bg-secondary text-on-secondary ring-2 ring-secondary/30'
                    : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Povezava kopirana!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Kopiraj povezavo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Social Media Share Actions */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-on-surface">
              Deli prek družbenih omrežij in aplikacij
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleFacebookShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/18 text-[#1877F2] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-[#1877F2]/20 focus-visible:outline-2 focus-visible:outline-[#1877F2]"
                title="Deli na Facebook"
              >
                <div className="w-7 h-7 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                  <Facebook className="w-4 h-4 fill-white" />
                </div>
                <span className="truncate">Facebook</span>
              </button>

              <button
                type="button"
                onClick={handleXShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-black/8 dark:bg-white/10 hover:bg-black/14 dark:hover:bg-white/16 text-on-surface font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-surface-container focus-visible:outline-2 focus-visible:outline-primary"
                title="Objavi na omrežju X (Twitter)"
              >
                <div className="w-7 h-7 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                  <XLogoIcon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">X (Twitter)</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/18 text-[#128C7E] dark:text-[#25D366] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-[#25D366]/20 focus-visible:outline-2 focus-visible:outline-[#25D366]"
                title="Pošlji prek WhatsApp"
              >
                <div className="w-7 h-7 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <WhatsAppLogoIcon className="w-4 h-4" />
                </div>
                <span className="truncate">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleViberShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-[#7360F2]/10 hover:bg-[#7360F2]/18 text-[#7360F2] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-[#7360F2]/20 focus-visible:outline-2 focus-visible:outline-[#7360F2]"
                title="Pošlji prek Viber"
              >
                <div className="w-7 h-7 rounded-xl bg-[#7360F2] text-white flex items-center justify-center shrink-0">
                  <ViberLogoIcon className="w-4 h-4" />
                </div>
                <span className="truncate">Viber</span>
              </button>

              <button
                type="button"
                onClick={handleTelegramShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-[#229ED9]/10 hover:bg-[#229ED9]/18 text-[#229ED9] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-[#229ED9]/20 focus-visible:outline-2 focus-visible:outline-[#229ED9]"
                title="Deli prek Telegram"
              >
                <div className="w-7 h-7 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shrink-0">
                  <TelegramLogoIcon className="w-4 h-4" />
                </div>
                <span className="truncate">Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleLinkedInShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/18 text-[#0A66C2] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-[#0A66C2]/20 focus-visible:outline-2 focus-visible:outline-[#0A66C2]"
                title="Objavi na LinkedIn"
              >
                <div className="w-7 h-7 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0">
                  <Linkedin className="w-4 h-4 fill-white" />
                </div>
                <span className="truncate">LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={handleEmailShare}
                className="min-h-[44px] p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/18 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-amber-500/20 focus-visible:outline-2 focus-visible:outline-amber-500"
                title="Pošlji po elektronski pošti"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="truncate">E-pošta</span>
              </button>

              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="col-span-2 sm:col-span-2 min-h-[44px] p-2.5 rounded-2xl bg-primary/10 hover:bg-primary/18 text-primary font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-primary/25 focus-visible:outline-2 focus-visible:outline-primary"
                  title="Odpri sistemski meni za deljenje"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Več možnosti (Meni naprave)</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Optional Custom Note & Copy Full Snippet */}
          <div className="pt-3 border-t border-surface-container-low flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowNoteEditor(!showNoteEditor)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showNoteEditor ? 'Zapri osebno opombo' : '+ Dodaj osebno opombo k sporočilu'}</span>
              </button>
              <button
                type="button"
                onClick={copyCustomNoteToClipboard}
                className="text-xs text-on-surface-variant hover:text-primary font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Kopiraj naslov, povzetek in povezavo"
              >
                {copiedNote ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNote ? 'Sporočilo kopirano!' : 'Kopiraj celotno sporočilo'}</span>
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
                <span className="text-[11px] text-outline">
                  Vaša opomba se vključi v sporočilo za WhatsApp, X, e-pošto in kopirano besedilo.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-surface-container-low bg-surface-container-low/40 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          >
            Zapri
          </button>
        </div>
      </div>
    </div>
  );
}
