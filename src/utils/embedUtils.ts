/**
 * Utility for parsing and formatting social media links & embed codes
 * (YouTube, YouTube Shorts, Twitter/X, Instagram Reels/Posts, Facebook, TikTok, or raw iframe embeds).
 * Fully supports and distinguishes between Horizontal (16:9) and Vertical (9:16 portrait) embeds.
 */

export interface ParsedEmbed {
  platform: 'youtube' | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'iframe' | 'generic';
  platformName: string;
  originalInput: string;
  embedHtml: string;
  embedUrl?: string;
  previewTitle?: string;
  isVertical?: boolean;
}

/**
 * Checks whether an HTML snippet, iframe or link represents a vertical format video
 * (YouTube Shorts, Instagram Reels, TikTok, or iframes with height > width).
 */
export function isIframeOrHtmlVertical(htmlOrUrl: string): boolean {
  if (!htmlOrUrl) return false;
  const lower = htmlOrUrl.toLowerCase();

  // Explicit vertical markers or attributes
  if (
    lower.includes('data-vertical="true"') ||
    lower.includes("data-vertical='true'") ||
    lower.includes('data-orientation="vertical"') ||
    lower.includes('/shorts/') ||
    lower.includes('shorts?v=') ||
    lower.includes('/reel/') ||
    lower.includes('/reels/') ||
    lower.includes('tiktok.com') ||
    lower.includes('tiktok-embed') ||
    lower.includes('vertical') ||
    lower.includes('portrait') ||
    lower.includes('aspect-[9/16]') ||
    lower.includes('aspect-ratio: 9/16') ||
    lower.includes('aspect-ratio: 9 / 16') ||
    lower.includes('youtube shorts')
  ) {
    return true;
  }

  // Instagram embeds without explicit horizontal class are portrait / vertical cards
  if (lower.includes('instagram.com') || lower.includes('instagram-media')) {
    // If not explicitly marked horizontal
    if (!lower.includes('aspect-video') && !lower.includes('aspect-ratio: 16/9') && !lower.includes('aspect-ratio: 16 / 9')) {
      return true;
    }
  }

  // Check explicit width vs height attributes on iframe/embed tags
  // e.g. <iframe width="315" height="560"...>
  const widthMatch = htmlOrUrl.match(/width=["']?([0-9]+)(?:px)?["']?/i);
  const heightMatch = htmlOrUrl.match(/height=["']?([0-9]+)(?:px)?["']?/i);
  if (widthMatch && heightMatch) {
    const w = parseInt(widthMatch[1], 10);
    const h = parseInt(heightMatch[1], 10);
    if (h > w && h > 200) {
      return true;
    }
  }

  // Check inline style width and height
  const styleMatchW = htmlOrUrl.match(/width:\s*([0-9]+)px/i);
  const styleMatchH = htmlOrUrl.match(/height:\s*([0-9]+)px/i);
  if (styleMatchW && styleMatchH) {
    const w = parseInt(styleMatchW[1], 10);
    const h = parseInt(styleMatchH[1], 10);
    if (h > w && h > 200) {
      return true;
    }
  }

  return false;
}

export function parseSocialEmbed(rawInput: string, forceOrientation?: 'vertical' | 'horizontal'): ParsedEmbed | null {
  const input = rawInput.trim();
  if (!input) return null;

  // Determine vertical preference if user explicitly selected it
  const isUserForcedVertical = forceOrientation === 'vertical';
  const isUserForcedHorizontal = forceOrientation === 'horizontal';

  // 1. Raw iframe or HTML block
  if (input.includes('<iframe') || input.includes('<blockquote')) {
    // Check if input is an Instagram blockquote
    const igBlockquoteMatch = input.match(/data-instgrm-permalink=["']([^"']+)["']/i);
    if (igBlockquoteMatch && igBlockquoteMatch[1]) {
      const igUrl = igBlockquoteMatch[1];
      const parsedFromUrl = parseSocialEmbed(igUrl, forceOrientation);
      if (parsedFromUrl) return parsedFromUrl;
    }

    // Check if input is a TikTok blockquote
    const tiktokCiteMatch = input.match(/cite=["']([^"']+)["']/i);
    if (tiktokCiteMatch && tiktokCiteMatch[1] && tiktokCiteMatch[1].includes('tiktok.com')) {
      const parsedFromUrl = parseSocialEmbed(tiktokCiteMatch[1], forceOrientation);
      if (parsedFromUrl) return parsedFromUrl;
    }

    const autoVertical = isIframeOrHtmlVertical(input);
    const isVertical = isUserForcedVertical ? true : (isUserForcedHorizontal ? false : autoVertical);
    let formatted = input;

    if (input.includes('<iframe')) {
      if (isVertical) {
        // Strip conflicting horizontal aspect classes and styles if present
        let cleanedIframe = input
          .replace(/class=["'][^"']*aspect-video[^"']*["']/gi, 'class="w-full h-full border-0"')
          .replace(/style=["'][^"']*aspect-ratio:\s*16\/9[^"']*["']/gi, '');

        // Ensure data-vertical="true" is on the iframe tag
        if (!cleanedIframe.includes('data-vertical')) {
          cleanedIframe = cleanedIframe.replace(/<iframe/i, '<iframe data-vertical="true"');
        }

        formatted = `<div class="embed-vertical-container my-4 w-full flex justify-center"><div class="w-full max-w-[360px] min-h-[580px] aspect-[9/16] max-h-[740px] rounded-2xl overflow-hidden border border-surface-container shadow-md bg-surface-container-lowest relative flex justify-center" style="aspect-ratio: 9/16; min-height: 580px;">${cleanedIframe}</div></div>`;
      } else {
        formatted = `<div class="embed-horizontal-container responsive-embed my-3 w-full max-w-3xl mx-auto aspect-video rounded-xl overflow-hidden border border-surface-container shadow-xs" style="aspect-ratio: 16/9;">${input}</div>`;
      }
    }

    return {
      platform: 'iframe',
      platformName: isVertical ? 'Vdelana vsebina (navpični format 9:16)' : 'Koda za vdelavo (HTML/Iframe)',
      originalInput: input,
      embedHtml: formatted,
      previewTitle: isVertical ? 'Navpična vdelana vsebina' : 'Vdelana vsebina (koda)',
      isVertical,
    };
  }

  // 2. YouTube URLs (Standard 16:9 vs Vertical Shorts 9:16)
  // Standard: https://www.youtube.com/watch?v=dQw4w9WgXcQ, https://youtu.be/dQw4w9WgXcQ
  // Shorts: https://www.youtube.com/shorts/XYZ, https://youtu.be/shorts/XYZ
  const ytMatch = input.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const detectedShort = input.includes('/shorts/') || input.includes('shorts?v=');
    const isShort = isUserForcedVertical ? true : (isUserForcedHorizontal ? false : detectedShort);
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

    let embedHtml = '';
    if (isShort) {
      embedHtml = `<div class="embed-vertical-container my-4 w-full flex justify-center"><div class="w-full max-w-[360px] aspect-[9/16] min-h-[580px] max-h-[720px] rounded-2xl overflow-hidden border border-surface-container shadow-md bg-black relative" style="aspect-ratio: 9/16; min-height: 580px;"><iframe src="${embedUrl}" data-vertical="true" class="w-full h-full border-0" title="YouTube Shorts predvajalnik" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></div>`;
    } else {
      embedHtml = `<div class="embed-horizontal-container my-3 w-full max-w-3xl mx-auto aspect-video rounded-xl overflow-hidden border border-surface-container shadow-xs" style="aspect-ratio: 16/9;"><iframe src="${embedUrl}" data-vertical="false" class="w-full h-full border-0" title="YouTube video predvajalnik" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }

    return {
      platform: 'youtube',
      platformName: isShort ? 'YouTube Shorts (navpični video 9:16)' : 'YouTube video',
      originalInput: input,
      embedUrl,
      embedHtml,
      previewTitle: isShort ? `YouTube Shorts (${videoId})` : `YouTube video (${videoId})`,
      isVertical: isShort,
    };
  }

  // 3. Twitter / X URLs
  // https://x.com/username/status/123456789
  // https://twitter.com/username/status/123456789
  const twitterMatch = input.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/([0-9]+)/i);
  if (twitterMatch) {
    const username = twitterMatch[1];
    const tweetId = twitterMatch[2];
    const cleanUrl = `https://x.com/${username}/status/${tweetId}`;
    const embedHtml = `<blockquote class="twitter-tweet my-3 p-4 rounded-xl border border-surface-container bg-surface-container-low max-w-xl mx-auto shadow-xs" data-dnt="true"><div class="flex items-center justify-between mb-1.5"><span class="font-bold text-xs text-on-surface flex items-center gap-1.5">𝕏 Objava na omrežju X (@${username})</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri izvirnik ↗</a></div><p class="text-xs text-on-surface-variant font-medium">Kliknite za ogled objave in razprave na omrežju X.</p></blockquote>`;
    return {
      platform: 'twitter',
      platformName: 'X / Twitter objava',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: `X / Twitter objava (@${username})`,
      isVertical: false,
    };
  }

  // 4. Instagram URLs (Reels / Stories vs Posts)
  // https://www.instagram.com/p/C_abc123/ or /reel/C_abc123/ or /reels/C_abc123/
  const igMatch = input.match(/instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const postId = igMatch[1];
    const detectedReel = input.includes('/reel/') || input.includes('/reels/');
    // Instagram posts and reels are both vertical in layout; user can force horizontal if desired
    const isVertical = isUserForcedHorizontal ? false : true;
    const cleanUrl = detectedReel ? `https://www.instagram.com/reel/${postId}/` : `https://www.instagram.com/p/${postId}/`;
    const embedUrl = `https://www.instagram.com/p/${postId}/embed`;

    let embedHtml = '';
    if (isVertical) {
      embedHtml = `<div class="embed-vertical-container my-4 w-full flex justify-center"><div class="w-full max-w-[380px] rounded-2xl border border-surface-container bg-surface-container-low p-3.5 shadow-md flex flex-col gap-2" style="min-height: 580px;"><div class="flex items-center justify-between"><span class="font-bold text-xs text-pink-600 flex items-center gap-1.5">🎬 Instagram ${detectedReel ? 'Reel' : 'objava'} (navpični format)</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri ↗</a></div><iframe src="${embedUrl}" data-vertical="true" class="w-full min-h-[640px] sm:min-h-[700px] border-0 rounded-xl bg-surface-container-lowest" allowtransparency="true" scrolling="no"></iframe></div></div>`;
    } else {
      embedHtml = `<div class="embed-post-container my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low max-w-lg mx-auto shadow-xs"><div class="flex items-center justify-between mb-2"><span class="font-bold text-xs text-pink-600 flex items-center gap-1.5">📸 Instagram objava</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri na Instagramu ↗</a></div><iframe src="${embedUrl}" data-vertical="false" class="w-full min-h-[520px] sm:min-h-[580px] border-0 rounded-lg bg-surface-container-lowest" allowtransparency="true" scrolling="no"></iframe></div>`;
    }

    return {
      platform: 'instagram',
      platformName: detectedReel ? 'Instagram Reel (navpični video)' : 'Instagram objava',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: detectedReel ? `Instagram Reel (${postId})` : `Instagram objava (${postId})`,
      isVertical,
    };
  }

  // 5. Facebook URLs (Reels vs Posts)
  if (input.includes('facebook.com/') || input.includes('fb.watch/')) {
    let cleanUrl = input;
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const detectedReel = cleanUrl.includes('/reel/') || cleanUrl.includes('/reels/') || cleanUrl.includes('fb.watch/');
    const isVertical = isUserForcedVertical ? true : (isUserForcedHorizontal ? false : detectedReel);
    const pluginUrl = `https://www.facebook.com/plugins/${isVertical ? 'video.php' : 'post.php'}?href=${encodeURIComponent(cleanUrl)}&show_text=true&width=${isVertical ? '360' : '500'}`;

    let embedHtml = '';
    if (isVertical) {
      embedHtml = `<div class="embed-vertical-container my-4 w-full flex justify-center"><div class="w-full max-w-[360px] rounded-2xl border border-surface-container bg-surface-container-low p-3.5 shadow-md flex flex-col gap-2" style="min-height: 580px;"><div class="flex items-center justify-between"><span class="font-bold text-xs text-blue-600 flex items-center gap-1.5">🎬 Facebook Reel (navpični format)</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri na Facebooku ↗</a></div><iframe src="${pluginUrl}" data-vertical="true" class="w-full min-h-[620px] border-0 rounded-xl overflow-hidden bg-surface-container-lowest" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div></div>`;
    } else {
      embedHtml = `<div class="embed-post-container my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low max-w-lg mx-auto shadow-xs"><div class="flex items-center justify-between mb-2"><span class="font-bold text-xs text-blue-600 flex items-center gap-1.5">📘 Facebook objava</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri na Facebooku ↗</a></div><iframe src="${pluginUrl}" data-vertical="false" class="w-full min-h-[380px] border-0 rounded-lg overflow-hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`;
    }

    return {
      platform: 'facebook',
      platformName: isVertical ? 'Facebook Reel (navpični format)' : 'Facebook objava',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: isVertical ? 'Facebook Reel' : 'Facebook vsebina',
      isVertical,
    };
  }

  // 6. TikTok URLs (Always Vertical 9:16)
  // https://www.tiktok.com/@user/video/1234567890
  const tiktokMatch = input.match(/(?:tiktok\.com\/@([^/]+)\/video\/([0-9]+)|(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]+))/i);
  if (tiktokMatch) {
    const user = tiktokMatch[1] || 'tiktok';
    const videoId = tiktokMatch[2] || tiktokMatch[3];
    const cleanUrl = tiktokMatch[2] ? `https://www.tiktok.com/@${user}/video/${videoId}` : input;
    const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
    const embedHtml = `<div class="embed-vertical-container my-4 w-full flex justify-center"><div class="w-full max-w-[360px] rounded-2xl border border-surface-container bg-surface-container-low p-3.5 shadow-md flex flex-col gap-2" style="aspect-ratio: 9/16; min-height: 580px;"><div class="flex items-center justify-between"><span class="font-bold text-xs text-on-surface flex items-center gap-1.5">🎵 TikTok video (@${user})</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri v TikTok ↗</a></div><iframe src="${embedUrl}" data-vertical="true" class="w-full min-h-[660px] sm:min-h-[740px] border-0 rounded-xl bg-surface-container-lowest" allowfullscreen allow="autoplay"></iframe></div></div>`;
    return {
      platform: 'tiktok',
      platformName: 'TikTok video (navpični format 9:16)',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: `TikTok video (@${user})`,
      isVertical: true,
    };
  }

  // 7. Generic URL link fallback if standard web URL
  if (/^https?:\/\//i.test(input) || input.startsWith('www.')) {
    const url = input.startsWith('http') ? input : `https://${input}`;
    let domain = 'spletna povezava';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {}

    const embedHtml = `<div class="my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low flex items-center justify-between gap-3 shadow-xs"><div class="flex items-center gap-2"><span class="text-base">🔗</span><div><div class="text-xs font-bold text-on-surface">${domain}</div><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline break-all">${url}</a></div></div><a href="${url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-1 shrink-0"><span>Odpri</span><span>↗</span></a></div>`;
    return {
      platform: 'generic',
      platformName: 'Spletna povezava',
      originalInput: input,
      embedUrl: url,
      embedHtml,
      previewTitle: domain,
      isVertical: false,
    };
  }

  return null;
}
