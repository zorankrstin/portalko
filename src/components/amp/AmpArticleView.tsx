import React, { useState } from 'react';
import { 
  Zap, ArrowLeft, Share2, Copy, Check, Clock, Calendar, 
  ExternalLink, Code, CheckCircle, Smartphone 
} from 'lucide-react';
import { AmpArticleData, generateAmpHtml, buildAmpUrl, estimateReadingTime } from '../../services/ampService';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface AmpArticleViewProps {
  article: AmpArticleData;
  onExitAmp: () => void;
  onNavigateAuthor?: (authorName: string) => void;
}

export const AmpArticleView: React.FC<AmpArticleViewProps> = ({
  article,
  onExitAmp,
  onNavigateAuthor,
}) => {
  const [copiedAmpUrl, setCopiedAmpUrl] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [showHtmlModal, setShowHtmlModal] = useState(false);

  const readingTime = estimateReadingTime(article.content);
  const ampUrl = buildAmpUrl(article);
  const canonicalUrl = article.canonicalUrl || (typeof window !== 'undefined' ? window.location.href.replace(/([?&])amp=[^&]+(&|$)/, '$1').replace(/[?&]$/, '') : 'https://portalko.net');
  const primaryImage = article.image || article.imageUrl;
  const isoPublished = article.publishedAt || new Date().toISOString();

  const handleCopyAmpUrl = async () => {
    try {
      await navigator.clipboard.writeText(ampUrl);
      setCopiedAmpUrl(true);
      setTimeout(() => setCopiedAmpUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyHtml = async () => {
    try {
      const ampHtml = generateAmpHtml(article);
      await navigator.clipboard.writeText(ampHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24">
      {/* AMP Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onExitAmp}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Nazaj na portal"
            aria-label="Nazaj na portal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-base tracking-tight">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Portalko</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
            <Zap className="w-3 h-3 fill-amber-300" />
            AMP Hitro
          </span>
          <button
            onClick={onExitAmp}
            className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <span>Polna spletna stran</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Notice Banner explaining AMP mode */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-1.5 truncate">
          <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">
            Ogledate si <strong>AMP različico</strong> za takojšnje nalaganje na mobilnih telefonih.
          </span>
        </div>
        <button
          onClick={() => setShowHtmlModal(true)}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary dark:text-primary-light hover:underline ml-2 cursor-pointer"
        >
          <Code className="w-3 h-3" />
          <span className="hidden xs:inline">AMP Koda</span>
        </button>
      </div>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm">
          {/* Metadata bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
            <span className="uppercase tracking-wider text-primary dark:text-primary-light">
              {article.categoryName || (article.type === 'news' ? 'Novice' : 'Blog')}
              {article.subcategoryName ? ` • ${article.subcategoryName}` : ''}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{readingTime} min branja</span>
            </span>
          </div>

          {/* H1 Main Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 leading-tight mb-3">
            {article.title}
          </h1>

          {/* Subtitle / Excerpt */}
          {article.subtitle && (
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-4 font-normal">
              {article.subtitle}
            </p>
          )}

          {/* Author Byline */}
          <div className="flex items-center justify-between py-3 border-y border-slate-100 dark:border-slate-800 mb-5">
            <div 
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => article.authorName && onNavigateAuthor?.(article.authorName)}
            >
              {article.authorAvatar ? (
                <img 
                  src={article.authorAvatar} 
                  alt={article.authorName || 'Avtor'} 
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {(article.authorName || 'P')[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1 font-bold text-sm text-slate-900 dark:text-slate-100">
                  <span>{article.authorName || 'Uredništvo Portalko.net'}</span>
                  <VerifiedBadge size="xs" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(isoPublished).toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </span>
                  {article.location && (
                    <span>• {article.location}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyAmpUrl}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Kopiraj AMP povezavo"
                aria-label="Kopiraj AMP povezavo"
              >
                {copiedAmpUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Article Image */}
          {primaryImage && (
            <div className="mb-6 -mx-5 sm:-mx-7 overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img 
                src={primaryImage} 
                alt={article.title} 
                className="w-full h-auto max-h-[460px] object-cover" 
                loading="eager"
              />
            </div>
          )}

          {/* Sanitized Article Body */}
          <div 
            className="prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed text-slate-800 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              {article.tags.map((tag, idx) => (
                <span 
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Call to action to view comments / desktop version */}
          <div className="mt-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Želite sodelovati v razpravi, pustiti komentar ali uporabiti napredna orodja?
            </p>
            <button
              onClick={onExitAmp}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-dim transition-all shadow-sm cursor-pointer"
            >
              <span>Odpri polno različico s komentarji</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </article>
      </main>

      {/* Floating Bottom Bar on Mobile */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between z-30">
        <button
          onClick={onExitAmp}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Nazaj na portal</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAmpUrl}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {copiedAmpUrl ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Kopirano!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Deli AMP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AMP HTML Source Code Modal */}
      {showHtmlModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowHtmlModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Veljavna AMP HTML koda
                </h3>
              </div>
              <button
                onClick={() => setShowHtmlModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Ta koda je 100% skladna z Googlovim standardom <strong>Accelerated Mobile Pages (AMP)</strong>, vključno z obveznim AMP Boilerplate CSS in Schema.org strukturiranimi podatki.
            </p>

            <div className="flex-1 overflow-auto bg-slate-950 text-emerald-400 font-mono text-xs p-3.5 rounded-xl border border-slate-800 mb-4 select-all">
              <pre className="whitespace-pre-wrap">{generateAmpHtml(article)}</pre>
            </div>

            <div className="flex items-center justify-end gap-2">
              <a
                href={`https://validator.ampproject.org/#url=${encodeURIComponent(ampUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              >
                <span>Preveri z Google AMP Validatorjem</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={handleCopyHtml}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dim flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Kopirano!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopiraj vso AMP kodo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
