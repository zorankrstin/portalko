/**
 * SEO & GEO Optimization Utilities for Portalko
 * Handles document title, meta descriptions, OpenGraph, Twitter Cards,
 * GEO coordinates/regions, Canonical tags, and Schema.org JSON-LD structured data.
 */

import { slugify } from './urlUtils';

export { slugify };

export interface SeoMetadataOptions {
  title?: string;
  description?: string;
  url?: string;
  canonicalUrl?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'event' | 'profile';
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

  const ogType = options.type === 'article' || options.type === 'product' || options.type === 'event' || options.type === 'profile' 
    ? (options.type === 'article' ? 'article' : 'website') 
    : 'website';
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

  // 2. Standard Meta Tags
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'keywords', 'Portalko, mali oglasi, novice Slovenija, dogodki Slovenija, kuponi, popusti, ugodnosti, Ljubljana, Maribor, Celje, Kranj, Koper, Novo mesto, slovenski portal');
  setMetaTag('name', 'author', 'Portalko Skupnost');
  setMetaTag('name', 'robots', 'index, follow');

  // 3. GEO Meta Tags (Slovenia & local city/region targeting)
  setMetaTag('name', 'geo.region', DEFAULT_GEO_REGION);
  setMetaTag('name', 'geo.placename', placename);
  setMetaTag('name', 'geo.position', geoPosition);
  setMetaTag('name', 'ICBM', geoPosition.replace(';', ', '));
  setMetaTag('name', 'geo.country', 'SI');

  // 4. OpenGraph Tags
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:site_name', 'Portalko');
  setMetaTag('property', 'og:locale', 'sl_SI');
  setMetaTag('property', 'og:image', image.startsWith('http') ? image : (typeof window !== 'undefined' ? `${window.location.origin}${image}` : image));

  // 5. Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:url', canonicalUrl);
  setMetaTag('name', 'twitter:image', image.startsWith('http') ? image : (typeof window !== 'undefined' ? `${window.location.origin}${image}` : image));

  // 6. Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

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
}
