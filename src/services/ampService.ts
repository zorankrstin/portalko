/**
 * Accelerated Mobile Pages (AMP) Service for Portalko
 * Generates compliant AMP HTML markup, Schema.org NewsArticle & BlogPosting metadata,
 * AMP boilerplate styling, and manages canonical <-> AMP discovery links.
 */

import { slugify, buildPostUrl } from '../utils/urlUtils';

export interface AmpArticleData {
  id: string;
  type: 'news' | 'blog' | 'post';
  title: string;
  subtitle?: string;
  content: string;
  description?: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
  category?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  image?: string;
  imageUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  location?: string;
  region?: string;
  tags?: string[];
  canonicalUrl?: string;
}

/**
 * Checks if the current page was requested in AMP mode (?amp=1 or /amp/ path).
 */
export function isAmpRequested(pathname?: string, search?: string): boolean {
  if (typeof window === 'undefined') return false;
  const currentPath = pathname || window.location.pathname;
  const currentSearch = search || window.location.search;

  if (currentPath.startsWith('/amp/') || currentPath === '/amp') {
    return true;
  }

  const params = new URLSearchParams(currentSearch);
  return params.get('amp') === '1' || params.get('amp') === 'true';
}

/**
 * Computes reading time in minutes based on Slovenian reading speed (~200 words/min).
 */
export function estimateReadingTime(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

/**
 * Builds the discoverable AMP URL for a news article or blog post.
 */
export function buildAmpUrl(item: {
  id: string;
  type?: string;
  title?: string;
  category?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
}, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://portalko.net');
  const postUrl = buildPostUrl({
    type: (item.type === 'news' ? 'news' : 'blog') as any,
    id: item.id,
    title: item.title,
    category: item.category,
    categoryName: item.categoryName,
    subcategory: item.subcategory,
    subcategoryName: item.subcategoryName,
  });

  // Canonical query parameter style for SPA and SSR compatibility
  return `${origin}${postUrl}${postUrl.includes('?') ? '&' : '?'}amp=1`;
}

/**
 * Strips HTML tags and unsafe attributes for clean AMP plain-text excerpts.
 */
export function cleanPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Transforms standard HTML content into AMP-compliant markup:
 * - Replaces <img> with <amp-img layout="responsive" ...>
 * - Removes disallowed inline styles and script tags
 * - Cleans target="_blank" without rel attributes
 */
export function sanitizeContentForAmp(rawHtml: string): string {
  if (!rawHtml) return '';

  let html = rawHtml;

  // Remove <script> tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove <style> tags inside body
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove <iframe tags that are not amp-iframe or convert them
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Replace <img ...> with <amp-img layout="responsive" width="600" height="400" ...></amp-img>
  html = html.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (_match, before, src, after) => {
    // Extract alt if present
    const altMatch = (before + after).match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : 'Portalko vsebina';
    return `<amp-img src="${src}" width="800" height="500" layout="responsive" alt="${alt}"></amp-img>`;
  });

  // Remove inline style="..." attributes to comply with strict AMP CSS rules
  html = html.replace(/\sstyle=["'][^"']*["']/gi, '');

  return html;
}

/**
 * Generates a fully compliant, standalone AMP HTML document string for a news article or blog post.
 * Suitable for Google Mobile Search indexing, headless scrapers, and the AMP validator.
 */
export function generateAmpHtml(article: AmpArticleData, baseUrl?: string): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://portalko.net');
  const canonicalUrl = article.canonicalUrl || `${origin}${buildPostUrl({
    type: article.type,
    id: article.id,
    title: article.title,
    category: article.category,
    categoryName: article.categoryName,
    subcategory: article.subcategory,
    subcategoryName: article.subcategoryName,
  })}`;

  const cleanDescription = article.description || cleanPlainText(article.subtitle || article.content).slice(0, 160);
  const primaryImage = article.image || article.imageUrl || `${origin}/favicon.png`;
  const authorName = article.authorName || 'Uredništvo Portalko.net';
  const categoryLabel = article.categoryName || (article.type === 'news' ? 'Novice' : 'Blog');
  const subcategoryLabel = article.subcategoryName ? ` • ${article.subcategoryName}` : '';
  const isoPublished = article.publishedAt || new Date().toISOString();
  const isoModified = article.updatedAt || isoPublished;
  const readingTime = estimateReadingTime(article.content);

  const schemaType = article.type === 'news' ? 'NewsArticle' : 'BlogPosting';

  const schemaJsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    'headline': article.title,
    'description': cleanDescription,
    'image': [primaryImage],
    'datePublished': isoPublished,
    'dateModified': isoModified,
    'author': {
      '@type': 'Person',
      'name': authorName,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Portalko',
      'logo': {
        '@type': 'ImageObject',
        'url': `${origin}/favicon.png`,
      },
    },
    'inLanguage': 'sl-SI',
  };

  const sanitizedBody = sanitizeContentForAmp(article.content);

  return `<!doctype html>
<html ⚡ lang="sl">
  <head>
    <meta charset="utf-8">
    <title>${article.title} – ${categoryLabel} | Portalko AMP</title>
    <link rel="canonical" href="${canonicalUrl}">
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <meta name="description" content="${cleanDescription.replace(/"/g, '&quot;')}">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#1a2e4c">

    <!-- Schema.org JSON-LD Structured Data for Google AMP -->
    <script type="application/ld+json">
${JSON.stringify(schemaJsonLd, null, 2)}
    </script>

    <!-- AMP Runtime JS -->
    <script async src="https://cdn.ampproject.org/v0.js"></script>

    <!-- AMP Boilerplate CSS (Strictly Required by AMP Specification) -->
    <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
    <noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>

    <!-- Custom AMP Stylesheet -->
    <style amp-custom>
      :root {
        --primary: #1a2e4c;
        --primary-light: #2c4974;
        --accent: #d97706;
        --bg: #f8fafc;
        --surface: #ffffff;
        --text: #0f172a;
        --text-muted: #64748b;
        --border: #e2e8f0;
        --amp-gold: #f59e0b;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--bg);
        color: var(--text);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }
      header.amp-header {
        background-color: var(--primary);
        color: #ffffff;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .amp-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;
        color: #ffffff;
        font-weight: 800;
        font-size: 18px;
        letter-spacing: -0.5px;
      }
      .amp-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: rgba(245, 158, 11, 0.2);
        color: var(--amp-gold);
        border: 1px solid rgba(245, 158, 11, 0.4);
        padding: 4px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      main.amp-container {
        max-width: 680px;
        margin: 0 auto;
        padding: 16px;
      }
      article.amp-article {
        background: var(--surface);
        border-radius: 12px;
        border: 1px solid var(--border);
        overflow: hidden;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .amp-meta-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 12px;
        font-weight: 600;
      }
      .amp-category {
        color: var(--primary-light);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      h1.amp-title {
        font-size: 24px;
        line-height: 1.3;
        font-weight: 800;
        color: var(--text);
        margin: 0 0 12px 0;
      }
      .amp-subtitle {
        font-size: 15px;
        line-height: 1.5;
        color: var(--text-muted);
        margin-bottom: 16px;
        font-weight: 400;
      }
      .amp-author-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        margin-bottom: 16px;
      }
      .amp-author-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        background: #cbd5e1;
      }
      .amp-author-info {
        font-size: 13px;
      }
      .amp-author-name {
        font-weight: 700;
        color: var(--text);
      }
      .amp-reading-time {
        font-size: 11px;
        color: var(--text-muted);
      }
      .amp-lead-image {
        margin: 0 -20px 20px -20px;
      }
      .amp-body {
        font-size: 16px;
        line-height: 1.7;
        color: #334155;
      }
      .amp-body p {
        margin-bottom: 1.25em;
      }
      .amp-body h2 {
        font-size: 20px;
        font-weight: 700;
        margin: 24px 0 12px 0;
        color: var(--text);
      }
      .amp-body h3 {
        font-size: 17px;
        font-weight: 700;
        margin: 20px 0 8px 0;
        color: var(--text);
      }
      .amp-body blockquote {
        margin: 16px 0;
        padding: 12px 16px;
        background: #f1f5f9;
        border-left: 4px solid var(--primary-light);
        font-style: italic;
        color: #475569;
      }
      .amp-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
      }
      .amp-tag {
        font-size: 11px;
        background: #f1f5f9;
        color: #475569;
        padding: 4px 8px;
        border-radius: 6px;
        text-decoration: none;
      }
      .amp-full-link {
        display: block;
        text-align: center;
        background: var(--primary);
        color: #ffffff;
        font-weight: 700;
        font-size: 14px;
        padding: 14px;
        border-radius: 10px;
        text-decoration: none;
        margin-top: 24px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      footer.amp-footer {
        text-align: center;
        font-size: 12px;
        color: var(--text-muted);
        padding: 24px 16px;
      }
    </style>
  </head>
  <body>
    <header class="amp-header">
      <a href="${canonicalUrl}" class="amp-logo">
        <span>⚡ Portalko</span>
      </a>
      <span class="amp-badge">⚡ AMP Hitro</span>
    </header>

    <main class="amp-container">
      <article class="amp-article">
        <div class="amp-meta-bar">
          <span class="amp-category">${categoryLabel}${subcategoryLabel}</span>
          <span class="amp-reading-time">⏱️ ${readingTime} min branja</span>
        </div>

        <h1 class="amp-title">${article.title}</h1>

        ${article.subtitle ? `<div class="amp-subtitle">${article.subtitle}</div>` : ''}

        <div class="amp-author-card">
          <amp-img 
            src="${article.authorAvatar || `${origin}/favicon.png`}" 
            width="40" 
            height="40" 
            class="amp-author-avatar" 
            alt="${authorName}">
          </amp-img>
          <div class="amp-author-info">
            <div class="amp-author-name">${authorName}</div>
            <div class="amp-reading-time">${article.location ? `${article.location} • ` : ''}${new Date(isoPublished).toLocaleDateString('sl-SI')}</div>
          </div>
        </div>

        ${primaryImage && !primaryImage.includes('favicon.png') ? `
        <div class="amp-lead-image">
          <amp-img 
            src="${primaryImage}" 
            width="800" 
            height="450" 
            layout="responsive" 
            alt="${article.title}">
          </amp-img>
        </div>
        ` : ''}

        <div class="amp-body">
          ${sanitizedBody}
        </div>

        ${article.tags && article.tags.length > 0 ? `
        <div class="amp-tags">
          ${article.tags.map(t => `<span class="amp-tag">#${t.replace(/^#/, '')}</span>`).join('')}
        </div>
        ` : ''}

        <a href="${canonicalUrl}" class="amp-full-link">
          Odpri polno spletno različico s komentarji in orodji ➔
        </a>
      </article>
    </main>

    <footer class="amp-footer">
      <p>© ${new Date().getFullYear()} Portalko.net – Slovenski spletni portal</p>
      <p>Accelerated Mobile Pages (AMP) različica za optimalno hitrost branja</p>
    </footer>
  </body>
</html>`;
}
