import React, { useState } from 'react';
import { 
  Facebook, 
  Mail, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Sparkles, 
  Send,
  MessageCircle,
  Smartphone
} from 'lucide-react';

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

export interface SocialShareWidgetProps {
  url?: string;
  title: string;
  description?: string;
  type?: 'ad' | 'event' | 'deal' | 'blog' | 'post' | 'news';
  category?: string;
  author?: string;
  date?: string;
  price?: string;
  location?: string;
  discount?: string;
  className?: string;
}

export function SocialShareWidget({
  url,
  title,
  description,
  type = 'post',
  category,
  author,
  date,
  price,
  location,
  discount,
  className = '',
}: SocialShareWidgetProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Derive canonical or current URL
  const resolvedUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  // Determine category badge name
  const categoryLabel = category || (
    type === 'ad' ? 'Mali oglas' :
    type === 'event' ? 'Dogodek' :
    type === 'deal' ? 'Ugodnost' :
    type === 'news' ? 'Novica' : 'Članek'
  );

  // Build specific highlights
  const highlights: string[] = [];
  if (type === 'ad' && price) highlights.push(`Cena: ${price}`);
  if (type === 'deal' && discount) highlights.push(`Popust: ${discount}`);
  if (type === 'event' && date) highlights.push(`Datum: ${date}`);
  if (location) highlights.push(`Lokacija: ${location}`);

  const highlightSnippet = highlights.length > 0 ? ` (${highlights.join(' • ')})` : '';

  // Clean description excerpt
  const rawExcerpt = description ? description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim() : '';
  const cleanExcerpt = rawExcerpt.length > 180 ? `${rawExcerpt.slice(0, 177)}...` : rawExcerpt;

  // Pre-filled texts
  const baseMessage = `📢 [Portalko.net] ${title}${highlightSnippet}\n\n${cleanExcerpt ? `${cleanExcerpt}\n\n` : ''}`;
  const fullPreFilledText = customNote.trim() 
    ? `${customNote.trim()}\n\n${baseMessage}🔗 Povezava: ${resolvedUrl}`
    : `${baseMessage}🔗 Oglej si celotno objavo:\n${resolvedUrl}`;

  const tweetText = customNote.trim()
    ? `${customNote.trim()} ${title}${highlightSnippet} #Portalko\n${resolvedUrl}`
    : `${title}${highlightSnippet} | Portalko.net\n${resolvedUrl} #Portalko #Slovenija`;

  const emailSubject = `Priporočam v branje: ${title} na Portalko.net`;
  const emailBody = `Pozdravljeni,\n\nNa slovenskem portalu Portalko.net sem našel zanimivo vsebino:\n\n` +
    `"${title}"${highlightSnippet}\n\n` +
    (customNote.trim() ? `Komentar pošiljatelja:\n"${customNote.trim()}"\n\n` : '') +
    (cleanExcerpt ? `Povzetek:\n${cleanExcerpt}\n\n` : '') +
    `Povezava do celotne objave:\n${resolvedUrl}\n\n` +
    `Lep pozdrav!`;

  const showTemporaryFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const copyToClipboard = async (text: string, isLink: boolean) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (isLink) {
        setCopiedLink(true);
        showTemporaryFeedback('Povezava je kopirana v odložišče!');
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedText(true);
        showTemporaryFeedback('Vnaprej pripravljeno besedilo je kopirano!');
        setTimeout(() => setCopiedText(false), 2500);
      }
    } catch (err) {
      console.error('Kopiranje ni uspelo', err);
    }
  };

  // 1. Share Facebook
  const handleFacebookShare = () => {
    const quoteText = customNote.trim() ? `${customNote.trim()} - ${title}` : `${title}${highlightSnippet}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}&quote=${encodeURIComponent(quoteText)}`;
    window.open(fbUrl, '_blank', 'width=620,height=480,scrollbars=yes,resizable=yes');
    showTemporaryFeedback('Odpiranje Facebook deljenja...');
  };

  // 2. Share X (Twitter)
  const handleXShare = () => {
    const xUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(
      customNote.trim() ? `${customNote.trim()} - ${title}${highlightSnippet}` : `${title}${highlightSnippet}`
    )}&hashtags=Portalko,Slovenija`;
    window.open(xUrl, '_blank', 'width=620,height=480,scrollbars=yes,resizable=yes');
    showTemporaryFeedback('Odpiranje X (Twitter) deljenja...');
  };

  // 3. Share WhatsApp
  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullPreFilledText)}`;
    window.open(waUrl, '_blank');
    showTemporaryFeedback('Odpiranje WhatsApp sporočila s pripravljeno vsebino...');
  };

  // 4. Share Viber
  const handleViberShare = () => {
    // Viber deep link: viber://forward?text=...
    const viberText = encodeURIComponent(fullPreFilledText);
    const viberProtocolUrl = `viber://forward?text=${viberText}`;
    
    // Copy prefilled text to clipboard as safety net for desktop browsers without desktop Viber client
    copyToClipboard(fullPreFilledText, false);

    // Attempt protocol launch
    window.location.href = viberProtocolUrl;
    showTemporaryFeedback('Odpiranje Viberja (besedilo s povezavo je tudi kopirano v odložišče)');
  };

  // 5. Share Email
  const handleEmailShare = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    showTemporaryFeedback('Pripravljam e-poštno sporočilo...');
  };

  // 6. Native Web Share API (for mobile devices)
  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title,
        text: customNote.trim() ? `${customNote.trim()}\n\n${title}` : `${title}${highlightSnippet}`,
        url: resolvedUrl,
      });
      showTemporaryFeedback('Uspešno deljeno prek sistemskega menija!');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        copyToClipboard(resolvedUrl, true);
      }
    }
  };

  return (
    <section 
      id="social-share-widget" 
      className={`bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container/70 shadow-xs flex flex-col gap-4 ${className}`}
      aria-label="Deli objavo na družbenih omrežjih"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-surface-container/50 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface leading-tight">
              Deli objavo na družbenih omrežjih
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Neposredno deljenje z vnaprej pripravljenim slovenskim besedilom in povezavo
            </p>
          </div>
        </div>

        {/* Quick action: Copy Link & Native Share */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {hasNativeShare && (
            <button
              type="button"
              id="btn-share-native-mobile"
              onClick={handleNativeShare}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer border border-surface-container/60 shadow-2xs"
              title="Odpri sistemski meni deljenja v telefonu"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Telefon</span>
            </button>
          )}

          <button
            type="button"
            id="btn-share-copy-post-link"
            onClick={() => copyToClipboard(resolvedUrl, true)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer border border-surface-container/60 shadow-2xs"
            title="Kopiraj neposredno spletno povezavo"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-secondary" />
                <span className="text-secondary font-bold">Kopirano!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-outline" />
                <span>Kopiraj povezavo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Temporary Toast feedback banner */}
      {actionFeedback && (
        <div className="bg-primary/10 border border-primary/25 text-primary px-3.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setActionFeedback(null)} 
            className="text-primary hover:opacity-70 text-xs font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Grid of Dedicated Social Network Sharing Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* 1. Facebook */}
        <button
          type="button"
          id="btn-share-facebook"
          onClick={handleFacebookShare}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/25 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-2xs group cursor-pointer"
          title="Deli na Facebooku z vnaprej pripravljenim besedilom"
        >
          <Facebook className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span>Facebook</span>
        </button>

        {/* 2. X (Twitter) */}
        <button
          type="button"
          id="btn-share-x"
          onClick={handleXShare}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-surface-container hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-on-surface border border-surface-container-high font-semibold text-xs sm:text-sm transition-all duration-200 shadow-2xs group cursor-pointer"
          title="Objavi na X (Twitter) s priponko in povezavo"
        >
          <XLogoIcon className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110" />
          <span>X (Twitter)</span>
        </button>

        {/* 3. WhatsApp */}
        <button
          type="button"
          id="btn-share-whatsapp"
          onClick={handleWhatsAppShare}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-2xs group cursor-pointer"
          title="Pošlji prek WhatsAppa s celotnim povzetkom in povezavo"
        >
          <WhatsAppLogoIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span>WhatsApp</span>
        </button>

        {/* 4. Viber */}
        <button
          type="button"
          id="btn-share-viber"
          onClick={handleViberShare}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#7360F2]/10 hover:bg-[#7360F2] text-[#7360F2] hover:text-white border border-[#7360F2]/30 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-2xs group cursor-pointer"
          title="Deli prek Viberja s pripravljenim sporočilom"
        >
          <ViberLogoIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span>Viber</span>
        </button>

        {/* 5. Email */}
        <button
          type="button"
          id="btn-share-email"
          onClick={handleEmailShare}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/25 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-2xs group cursor-pointer"
          title="Pošlji priporočilo po e-pošti z vnaprej izpolnjeno zadevo in vsebino"
        >
          <Mail className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span>E-pošta</span>
        </button>
      </div>

      {/* Pre-filled Message Preview & Customization Accordion */}
      <div className="bg-surface-container-low/60 rounded-xl p-3 sm:p-3.5 border border-surface-container/60 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-on-surface">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            <span>Predogled pripravljenega sporočila:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(fullPreFilledText, false)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              title="Kopiraj celotno besedilo v odložišče"
            >
              {copiedText ? (
                <>
                  <Check className="w-3 h-3 text-secondary" />
                  <span className="text-secondary font-bold">Besedilo kopirano!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Kopiraj sporočilo</span>
                </>
              )}
            </button>

            <span className="text-outline/40">•</span>

            <button
              type="button"
              onClick={() => setShowCustomize(!showCustomize)}
              className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              {showCustomize ? 'Zapri urejanje' : 'Dodaj osebno sporočilo'}
            </button>
          </div>
        </div>

        {/* Optional custom note editor */}
        {showCustomize && (
          <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in duration-150">
            <label htmlFor="input-custom-share-note" className="text-[11px] font-medium text-outline">
              Dodaj lasten nagovor ali opombo (npr. &quot;Poglej tole ponudbo!&quot;):
            </label>
            <div className="flex items-center gap-2">
              <input
                id="input-custom-share-note"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Vnesite osebno pripombo pred deljenjem..."
                className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
              />
              {customNote && (
                <button
                  type="button"
                  onClick={() => setCustomNote('')}
                  className="text-outline hover:text-on-surface text-xs font-semibold px-2 py-1"
                >
                  Počisti
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message snippet box */}
        <div className="bg-surface-container-lowest rounded-lg p-2.5 border border-surface-container font-mono text-[11px] text-on-surface-variant leading-relaxed select-all overflow-hidden line-clamp-3">
          {fullPreFilledText}
        </div>
      </div>
    </section>
  );
}
