/**
 * SEO & GEO Optimization Utilities for Portalko
 * Handles document title, meta descriptions, OpenGraph, Twitter Cards,
 * GEO coordinates/regions, Canonical tags, and Schema.org JSON-LD structured data.
 */

import { slugify } from './urlUtils';
import { trackPageView, ensureGoogleAnalyticsTag } from './analyticsUtils';

export { slugify, trackPageView, ensureGoogleAnalyticsTag };

export interface SeoMetadataOptions {
  title?: string;
  description?: string;
  url?: string;
  canonicalUrl?: string;
  ampHtmlUrl?: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  ogType?: 'website' | 'article';
  type?: 'website' | 'article' | 'product' | 'event' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  location?: string;
  geoPosition?: string; // e.g. "46.1512;14.9955"
  jsonLd?: Record<string, any>;
}

const DEFAULT_TITLE = 'Portalko – Slovenski portal za novice, male oglase in dogodke';
const DEFAULT_DESCRIPTION = 'Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.';
const DEFAULT_IMAGE = '/favicon.png';
const DEFAULT_GEO_REGION = 'SI';
const DEFAULT_GEO_PLACENAME = 'Slovenija';
const DEFAULT_GEO_POSITION = '46.1512;14.9955';

export function updatePageSeo(options: SeoMetadataOptions = {}) {
  const title = options.title ? `${options.title}` : DEFAULT_TITLE;
  const description = options.description || DEFAULT_DESCRIPTION;
  const image = options.image || DEFAULT_IMAGE;
  
  // Clean URL without hash fragments for canonical and OpenGraph
  let rawUrl = options.url || (typeof window !== 'undefined' ? window.location.href : 'https://portalko.net');
  if (rawUrl.includes('#')) {
    rawUrl = rawUrl.split('#')[0];
  }
  const currentUrl = rawUrl;
  let canonicalUrl = options.canonicalUrl || currentUrl;
  if (canonicalUrl.includes('#')) {
    canonicalUrl = canonicalUrl.split('#')[0];
  }

  const ogType: 'website' | 'article' =
    options.ogType || (options.type === 'article' ? 'article' : 'website');
  const placename = options.location ? `${options.location}, Slovenija` : DEFAULT_GEO_PLACENAME;
  const geoPosition = options.geoPosition || DEFAULT_GEO_POSITION;

  if (typeof document === 'undefined') return;

  // 1. Update Title
  document.title = title;

  // Helper to update or create a meta tag
  const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
    let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  const removeMetaTag = (attributeName: string, attributeValue: string) => {
    const element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (element) {
      element.remove();
    }
  };

  // 2. Standard Meta Tags
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'keywords', 'Portalko, mali oglasi, novice Slovenija, dogodki Slovenija, kuponi, popusti, ugodnosti, Ljubljana, Maribor, Celje, Kranj, Koper, Novo mesto, slovenski portal');
  setMetaTag('name', 'author', options.author || 'Portalko Skupnost');
  setMetaTag('name', 'robots', 'index, follow');

  // 3. GEO Meta Tags (Slovenia & local city/region targeting)
  setMetaTag('name', 'geo.region', DEFAULT_GEO_REGION);
  setMetaTag('name', 'geo.placename', placename);
  setMetaTag('name', 'geo.position', geoPosition);
  setMetaTag('name', 'ICBM', geoPosition.replace(';', ', '));
  setMetaTag('name', 'geo.country', 'SI');

  // 4. OpenGraph Tags
  const resolvedOgImage = (() => {
    const raw = (image || '').trim();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portalko.net';
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return `${origin}/favicon.png`;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('//')) {
      return `https:${raw}`;
    }
    return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
  })();

  const isFeaturedOgImage = !resolvedOgImage.toLowerCase().endsWith('/favicon.png');
  const resolvedImageAlt = (options.imageAlt || title).trim();
  const inferredImageType =
    options.imageType ||
    (() => {
      const lower = resolvedOgImage.split('?')[0].toLowerCase();
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.gif')) return 'image/gif';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
      return isFeaturedOgImage ? undefined : 'image/png';
    })();

  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:site_name', 'Portalko');
  setMetaTag('property', 'og:locale', 'sl_SI');
  setMetaTag('property', 'og:image', resolvedOgImage);
  setMetaTag('property', 'og:image:alt', resolvedImageAlt);

  if (resolvedOgImage.startsWith('https://')) {
    setMetaTag('property', 'og:image:secure_url', resolvedOgImage);
  } else {
    removeMetaTag('property', 'og:image:secure_url');
  }

  if (inferredImageType) {
    setMetaTag('property', 'og:image:type', inferredImageType);
  } else {
    removeMetaTag('property', 'og:image:type');
  }

  if (isFeaturedOgImage && options.imageWidth && options.imageHeight) {
    setMetaTag('property', 'og:image:width', String(options.imageWidth));
    setMetaTag('property', 'og:image:height', String(options.imageHeight));
  } else {
    removeMetaTag('property', 'og:image:width');
    removeMetaTag('property', 'og:image:height');
  }

  if (ogType === 'article' && options.author) {
    setMetaTag('property', 'article:author', options.author);
  } else {
    removeMetaTag('property', 'article:author');
  }

  if (ogType === 'article' && options.publishedTime) {
    setMetaTag('property', 'article:published_time', options.publishedTime);
  } else {
    removeMetaTag('property', 'article:published_time');
  }

  if (ogType === 'article' && options.modifiedTime) {
    setMetaTag('property', 'article:modified_time', options.modifiedTime);
  } else {
    removeMetaTag('property', 'article:modified_time');
  }

  if (ogType === 'article' && options.section) {
    setMetaTag('property', 'article:section', options.section);
  } else {
    removeMetaTag('property', 'article:section');
  }

  // 5. Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:url', canonicalUrl);
  setMetaTag('name', 'twitter:image', resolvedOgImage);
  setMetaTag('name', 'twitter:image:alt', resolvedImageAlt);

  // 6. Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // 6b. AMP HTML Discovery Link (<link rel="amphtml" href="...">)
  let ampLink = document.querySelector('link[rel="amphtml"]') as HTMLLinkElement | null;
  if (options.ampHtmlUrl) {
    if (!ampLink) {
      ampLink = document.createElement('link');
      ampLink.setAttribute('rel', 'amphtml');
      document.head.appendChild(ampLink);
    }
    ampLink.setAttribute('href', options.ampHtmlUrl);
  } else if (ampLink) {
    ampLink.remove();
  }

  // 7. Dynamic JSON-LD Structured Data
  let jsonLdScript = document.getElementById('seo-dynamic-jsonld') as HTMLScriptElement | null;
  if (options.jsonLd) {
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.id = 'seo-dynamic-jsonld';
      jsonLdScript.type = 'application/ld+json';
      document.head.appendChild(jsonLdScript);
    }
    jsonLdScript.textContent = JSON.stringify(options.jsonLd, null, 2);
  } else if (jsonLdScript) {
    jsonLdScript.remove();
  }

  // 8. Track page view in Google Analytics across every feed, post, and page
  trackPageView(title, canonicalUrl || options.url, typeof window !== 'undefined' ? window.location.href : undefined);
}
