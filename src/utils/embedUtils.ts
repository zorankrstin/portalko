/**
 * Utility for parsing and formatting social media links & embed codes
 * (YouTube, Twitter/X, Instagram, Facebook, TikTok, Vimeo, or raw iframe embeds)
 */

export interface ParsedEmbed {
  platform: 'youtube' | 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'iframe' | 'generic';
  platformName: string;
  originalInput: string;
  embedHtml: string;
  embedUrl?: string;
  previewTitle?: string;
}

export function parseSocialEmbed(rawInput: string): ParsedEmbed | null {
  const input = rawInput.trim();
  if (!input) return null;

  // 1. Raw iframe or HTML block
  if (input.includes('<iframe') || input.includes('<blockquote')) {
    // If it's a full iframe, wrap in responsive container
    let formatted = input;
    if (input.includes('<iframe') && !input.includes('aspect-video') && !input.includes('responsive-embed')) {
      formatted = `<div class="responsive-embed my-3 w-full rounded-xl overflow-hidden border border-surface-container shadow-xs">${input}</div>`;
    }
    return {
      platform: 'iframe',
      platformName: 'Koda za vdelavo (HTML/Iframe)',
      originalInput: input,
      embedHtml: formatted,
      previewTitle: 'Vdelana vsebina (koda)',
    };
  }

  // 2. YouTube URLs
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/shorts/XYZ
  // https://www.youtube.com/embed/XYZ
  const ytMatch = input.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
    const embedHtml = `<div class="my-3 aspect-video w-full rounded-xl overflow-hidden border border-surface-container shadow-xs"><iframe src="${embedUrl}" class="w-full h-full border-0" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    return {
      platform: 'youtube',
      platformName: 'YouTube video',
      originalInput: input,
      embedUrl,
      embedHtml,
      previewTitle: `YouTube video (${videoId})`,
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
    const embedHtml = `<blockquote class="twitter-tweet my-3 p-4 rounded-xl border border-surface-container bg-surface-container-low shadow-xs" data-dnt="true"><div class="flex items-center justify-between mb-1.5"><span class="font-bold text-xs text-on-surface flex items-center gap-1.5">𝕏 Objava na omrežju X (@${username})</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri izvirnik ↗</a></div><p class="text-xs text-on-surface-variant font-medium">Kliknite za ogled objave in razprave na omrežju X.</p></blockquote>`;
    return {
      platform: 'twitter',
      platformName: 'X / Twitter objava',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: `X / Twitter objava (@${username})`,
    };
  }

  // 4. Instagram URLs
  // https://www.instagram.com/p/C_abc123/ or /reel/C_abc123/
  const igMatch = input.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch) {
    const postId = igMatch[1];
    const cleanUrl = `https://www.instagram.com/p/${postId}/`;
    const embedUrl = `https://www.instagram.com/p/${postId}/embed`;
    const embedHtml = `<div class="my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low max-w-lg mx-auto shadow-xs"><div class="flex items-center justify-between mb-2"><span class="font-bold text-xs text-pink-600 flex items-center gap-1.5">📸 Instagram objava</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri na Instagramu ↗</a></div><iframe src="${embedUrl}" class="w-full min-h-[460px] border-0 rounded-lg bg-surface-container-lowest" allowtransparency="true" scrolling="no"></iframe></div>`;
    return {
      platform: 'instagram',
      platformName: 'Instagram objava / Reel',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: `Instagram objava (${postId})`,
    };
  }

  // 5. Facebook URLs
  if (input.includes('facebook.com/') || input.includes('fb.watch/')) {
    let cleanUrl = input;
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const pluginUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(cleanUrl)}&show_text=true&width=500`;
    const embedHtml = `<div class="my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low max-w-lg mx-auto shadow-xs"><div class="flex items-center justify-between mb-2"><span class="font-bold text-xs text-blue-600 flex items-center gap-1.5">📘 Facebook objava</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri na Facebooku ↗</a></div><iframe src="${pluginUrl}" class="w-full min-h-[350px] border-0 rounded-lg overflow-hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe></div>`;
    return {
      platform: 'facebook',
      platformName: 'Facebook objava',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: 'Facebook vsebina',
    };
  }

  // 6. TikTok URLs
  // https://www.tiktok.com/@user/video/1234567890
  const tiktokMatch = input.match(/tiktok\.com\/@([^/]+)\/video\/([0-9]+)/i);
  if (tiktokMatch) {
    const user = tiktokMatch[1];
    const videoId = tiktokMatch[2];
    const cleanUrl = `https://www.tiktok.com/@${user}/video/${videoId}`;
    const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
    const embedHtml = `<div class="my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low max-w-sm mx-auto shadow-xs"><div class="flex items-center justify-between mb-2"><span class="font-bold text-xs text-on-surface flex items-center gap-1.5">🎵 TikTok video (@${user})</span><a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary font-semibold hover:underline">Odpri v TikTok ↗</a></div><iframe src="${embedUrl}" class="w-full min-h-[480px] border-0 rounded-lg" allowfullscreen></iframe></div>`;
    return {
      platform: 'tiktok',
      platformName: 'TikTok video',
      originalInput: input,
      embedUrl: cleanUrl,
      embedHtml,
      previewTitle: `TikTok video (@${user})`,
    };
  }

  // 7. Generic URL link fallback if standard web URL
  if (/^https?:\/\//i.test(input) || input.startsWith('www.')) {
    const url = input.startsWith('http') ? input : `https://${input}`;
    const domain = new URL(url).hostname.replace(/^www\./, '');
    const embedHtml = `<div class="my-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-low flex items-center justify-between gap-3 shadow-xs"><div class="flex items-center gap-2"><span class="text-base">🔗</span><div><div class="text-xs font-bold text-on-surface">${domain}</div><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline break-all">${url}</a></div></div><a href="${url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-1 shrink-0"><span>Odpri</span><span>↗</span></a></div>`;
    return {
      platform: 'generic',
      platformName: 'Spletna povezava',
      originalInput: input,
      embedUrl: url,
      embedHtml,
      previewTitle: domain,
    };
  }

  return null;
}
