import React, { useEffect, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewProps,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Check, Copy, ExternalLink, Monitor, Smartphone, Trash2, Video } from 'lucide-react';
import {
  copyEmbedUrlToClipboard,
  detectVideoPlatformFromUrl,
  getEmbedSourceLabel,
  isIframeOrHtmlVertical,
  parseVideoLinkForEditor,
  VideoPlatform,
} from '../utils/embedUtils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      /**
       * Parse a video link (YouTube, YouTube Shorts, TikTok, Instagram Reels, or iframe HTML)
       * and insert a responsive video embed node with automatic orientation detection.
       */
      setVideoEmbed: (options: {
        urlOrHtml: string;
        orientation?: 'auto' | 'vertical' | 'horizontal';
      }) => ReturnType;
      /**
       * Toggle the orientation of the currently selected video embed node.
       */
      toggleVideoOrientation: () => ReturnType;
    };
  }
}

function getPlatformBadgeMeta(platform: VideoPlatform, isVertical: boolean): {
  label: string;
  accentClass: string;
} {
  switch (platform) {
    case 'youtube':
      return {
        label: isVertical ? 'YouTube Shorts' : 'YouTube',
        accentClass: 'bg-red-500/10 text-red-600 border-red-500/20',
      };
    case 'tiktok':
      return {
        label: 'TikTok',
        accentClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      };
    case 'instagram':
      return {
        label: isVertical ? 'Instagram Reels' : 'Instagram',
        accentClass: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
      };
    case 'facebook':
      return {
        label: isVertical ? 'Facebook Reel' : 'Facebook Video',
        accentClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      };
    default:
      return {
        label: 'Vdelani video',
        accentClass: 'bg-primary/10 text-primary border-primary/20',
      };
  }
}

const VideoEmbedNodeView: React.FC<ReactNodeViewProps> = ({
  node,
  selected,
  updateAttributes,
  deleteNode,
}) => {
  const src = String(node.attrs.src || '');
  const isVertical = node.attrs['data-vertical'] === 'true';
  const platform = (node.attrs['data-platform'] as VideoPlatform) || detectVideoPlatformFromUrl(src);
  const originalUrl = String(node.attrs['data-original-url'] || '');
  const title = String(node.attrs.title || 'Vdelani video');
  const badge = getPlatformBadgeMeta(platform, isVertical);
  const sourceLabel = getEmbedSourceLabel(originalUrl || src, platform);
  const [copied, setCopied] = useState(false);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const copyTargetUrl = /^https?:\/\//i.test(originalUrl) ? originalUrl : /^https?:\/\//i.test(src) ? src : '';

  useEffect(() => {
    setIsFrameReady(false);
    const timeoutId = window.setTimeout(() => setIsFrameReady(true), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [src]);

  const handleCopyUrl = async () => {
    if (!copyTargetUrl) return;
    const ok = await copyEmbedUrlToClipboard(copyTargetUrl);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const toggleOrientation = () => {
    const nextVertical = !isVertical;
    updateAttributes({
      'data-vertical': nextVertical ? 'true' : 'false',
      'data-orientation': nextVertical ? 'vertical' : 'horizontal',
      title: nextVertical ? 'Navpični video (9:16)' : 'Vodoravni video (16:9)',
    });
  };

  return (
    <NodeViewWrapper
      as="div"
      data-video-embed="true"
      data-platform={platform}
      data-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={`embed-container my-4 flex flex-col items-center transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2 rounded-2xl' : ''
      }`}
    >
      {/* Compact Editor Controls Bar */}
      <div
        contentEditable={false}
        className={`w-full ${
          isVertical ? 'max-w-[360px]' : 'max-w-3xl'
        } flex items-center justify-between gap-2 px-3 py-1.5 rounded-t-xl bg-surface-container border border-b-0 border-surface-container-high text-xs`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Video className="w-3.5 h-3.5 text-primary shrink-0" />
          <span
            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${badge.accentClass}`}
          >
            Vir: {sourceLabel}
          </span>
          {copyTargetUrl && (
            <a
              href={copyTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="embed-visit-source-link inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-primary/25 bg-surface-container-lowest hover:bg-primary/10 text-[10px] font-semibold text-primary transition-colors whitespace-nowrap"
              title="Odpri izvirno povezavo v novem zavihku"
            >
              <span>Obišči vir</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
          <span className="text-[11px] font-medium text-on-surface-variant truncate">
            {isVertical ? '9:16 navpično' : '16:9 vodoravno'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleOrientation}
            className="px-2 py-1 rounded-md hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
            title={
              isVertical
                ? 'Preklopi na vodoravni format (16:9)'
                : 'Preklopi na navpični format (9:16)'
            }
          >
            {isVertical ? (
              <>
                <Monitor className="w-3 h-3" />
                <span>16:9</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3" />
                <span>9:16</span>
              </>
            )}
          </button>

          {copyTargetUrl && (
            <button
              type="button"
              onClick={handleCopyUrl}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                copied
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
              title="Kopiraj izvorno povezavo"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Kopirano!' : 'Kopiraj povezavo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded-md hover:bg-error/10 text-outline hover:text-error cursor-pointer transition-colors"
            title="Odstrani video iz objave"
            aria-label="Odstrani video"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Responsive Frame Preview */}
      {isVertical ? (
        <div className="video-embed-wrapper video-embed-vertical embed-vertical-container w-full flex justify-center !my-0">
          <div
            className="video-embed-frame video-embed-frame--vertical w-full max-w-[360px] aspect-[9/16] min-h-[580px] max-h-[740px] rounded-b-2xl overflow-hidden border border-surface-container shadow-md bg-black relative flex justify-center"
            style={{ aspectRatio: '9/16', minHeight: '580px' }}
          >
            <div
              aria-hidden={isFrameReady}
              className={`absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center gap-2 embed-shimmer transition-opacity duration-300 ${
                isFrameReady ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest/70 border border-outline-variant/25 animate-pulse" />
              <span className="text-[11px] font-semibold text-on-surface-variant/80">
                Nalaganje videa...
              </span>
            </div>
            <iframe
              src={src}
              title={title}
              frameBorder={0}
              allowFullScreen
              onLoad={() => setIsFrameReady(true)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              scrolling="no"
              data-vertical="true"
              data-orientation="vertical"
              data-platform={platform}
              className="video-embed-iframe w-full h-full border-0"
            />
          </div>
        </div>
      ) : (
        <div
          className="video-embed-wrapper video-embed-horizontal embed-horizontal-container responsive-video-embed relative w-full max-w-3xl mx-auto aspect-video !my-0 overflow-hidden rounded-b-xl shadow-xs border border-surface-container bg-black/5"
          style={{ aspectRatio: '16/9' }}
        >
          <div
            aria-hidden={isFrameReady}
            className={`absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center gap-2 embed-shimmer transition-opacity duration-300 ${
              isFrameReady ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest/70 border border-outline-variant/25 animate-pulse" />
            <span className="text-[11px] font-semibold text-on-surface-variant/80">
              Nalaganje videa...
            </span>
          </div>
          <iframe
            src={src}
            title={title}
            frameBorder={0}
            allowFullScreen
            onLoad={() => setIsFrameReady(true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            scrolling="no"
            data-vertical="false"
            data-orientation="horizontal"
            data-platform={platform}
            className="video-embed-iframe w-full h-full border-0"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const VideoEmbedExtension = Node.create({
  name: 'iframe',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      frameborder: {
        default: '0',
      },
      allowfullscreen: {
        default: 'true',
      },
      allow: {
        default:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      },
      class: {
        default: 'video-embed-iframe w-full h-full border-0',
      },
      scrolling: {
        default: 'no',
      },
      title: {
        default: 'Vdelana video vsebina',
      },
      'data-platform': {
        default: 'iframe',
        parseHTML: (element) => {
          const direct = element.getAttribute('data-platform');
          if (direct) return direct;
          const wrapper = element.closest('[data-platform]');
          if (wrapper?.getAttribute('data-platform')) {
            return wrapper.getAttribute('data-platform');
          }
          return detectVideoPlatformFromUrl(element.getAttribute('src') || '');
        },
        renderHTML: (attributes) => ({
          'data-platform': attributes['data-platform'] || 'iframe',
        }),
      },
      'data-original-url': {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-original-url') ||
          element.getAttribute('src') ||
          '',
        renderHTML: (attributes) =>
          attributes['data-original-url']
            ? { 'data-original-url': attributes['data-original-url'] }
            : {},
      },
      'data-vertical': {
        default: 'false',
        parseHTML: (element) => {
          const direct = element.getAttribute('data-vertical');
          if (direct === 'true') return 'true';
          if (direct === 'false') return 'false';
          const wrapper = element.closest('[data-orientation]');
          if (wrapper?.getAttribute('data-orientation') === 'vertical') return 'true';
          if (wrapper?.getAttribute('data-orientation') === 'horizontal') return 'false';
          const parentContainer = element.closest(
            '.embed-vertical-container, .video-embed-vertical'
          );
          if (parentContainer) return 'true';
          const src = element.getAttribute('src') || '';
          return isIframeOrHtmlVertical(element.outerHTML) ||
            isIframeOrHtmlVertical(src)
            ? 'true'
            : 'false';
        },
        renderHTML: (attributes) => ({
          'data-vertical': attributes['data-vertical'] || 'false',
          'data-orientation':
            attributes['data-vertical'] === 'true' ? 'vertical' : 'horizontal',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-video-embed="true"]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const iframe = element.querySelector('iframe');
          if (!iframe) return false;
          const src = iframe.getAttribute('src') || '';
          const orientationAttr =
            element.getAttribute('data-orientation') ||
            iframe.getAttribute('data-orientation');
          const isVertical =
            orientationAttr === 'vertical' ||
            iframe.getAttribute('data-vertical') === 'true' ||
            element.classList.contains('video-embed-vertical') ||
            element.classList.contains('embed-vertical-container') ||
            isIframeOrHtmlVertical(src);

          return {
            src,
            frameborder: iframe.getAttribute('frameborder') || '0',
            allowfullscreen: iframe.getAttribute('allowfullscreen') || 'true',
            allow:
              iframe.getAttribute('allow') ||
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            scrolling: iframe.getAttribute('scrolling') || 'no',
            title:
              iframe.getAttribute('title') ||
              (isVertical ? 'Navpični video (9:16)' : 'Vdelan video (16:9)'),
            'data-platform':
              iframe.getAttribute('data-platform') ||
              element.getAttribute('data-platform') ||
              detectVideoPlatformFromUrl(src),
            'data-original-url':
              iframe.getAttribute('data-original-url') || src,
            'data-vertical': isVertical ? 'true' : 'false',
          };
        },
      },
      {
        tag: 'iframe',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const src = element.getAttribute('src') || '';
          const parentContainer = element.closest(
            '.embed-vertical-container, .video-embed-vertical'
          );
          const isVertical =
            element.getAttribute('data-vertical') === 'true' ||
            Boolean(parentContainer) ||
            isIframeOrHtmlVertical(element.outerHTML) ||
            isIframeOrHtmlVertical(src);

          return {
            src,
            frameborder: element.getAttribute('frameborder') || '0',
            allowfullscreen: element.getAttribute('allowfullscreen') || 'true',
            allow:
              element.getAttribute('allow') ||
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            scrolling: element.getAttribute('scrolling') || 'no',
            title:
              element.getAttribute('title') ||
              (isVertical ? 'Navpični video (9:16)' : 'Vdelana vsebina'),
            'data-platform':
              element.getAttribute('data-platform') ||
              detectVideoPlatformFromUrl(src),
            'data-original-url':
              element.getAttribute('data-original-url') || src,
            'data-vertical': isVertical ? 'true' : 'false',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || '');
    const originalUrl = String(HTMLAttributes['data-original-url'] || src);
    const platform =
      String(HTMLAttributes['data-platform'] || '') ||
      detectVideoPlatformFromUrl(src);
    const isVertical =
      HTMLAttributes['data-vertical'] === 'true' || isIframeOrHtmlVertical(src);
    const orientation = isVertical ? 'vertical' : 'horizontal';
    const sourceLabel = getEmbedSourceLabel(originalUrl || src, platform);
    const hasOriginalLink = /^https?:\/\//i.test(originalUrl);

    const iframeAttrs = mergeAttributes(HTMLAttributes, {
      'data-vertical': isVertical ? 'true' : 'false',
      'data-orientation': orientation,
      'data-platform': platform,
      class: 'video-embed-iframe w-full h-full border-0',
    });

    const sourceBadgeBar: [string, Record<string, any>, ...any[]] = [
      'div',
      {
        class:
          'embed-source-bar px-3.5 py-2 border-b border-surface-container/60 bg-surface-container-lowest/70 flex flex-wrap items-center justify-between gap-2',
      },
      [
        'div',
        {
          class: 'flex flex-wrap items-center gap-2',
        },
        hasOriginalLink
          ? [
              'a',
              {
                href: originalUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                class:
                  'embed-source-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/10 text-xs font-medium text-on-surface hover:bg-primary/15 transition-colors',
              },
              ['span', { class: 'text-on-surface-variant' }, 'Vir:'],
              ['strong', { class: 'font-bold text-primary' }, sourceLabel],
              ['span', { 'aria-hidden': 'true', class: 'text-primary' }, '↗'],
            ]
          : [
              'span',
              {
                class:
                  'embed-source-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/10 text-xs font-medium text-on-surface',
              },
              ['span', { class: 'text-on-surface-variant' }, 'Vir:'],
              ['strong', { class: 'font-bold text-primary' }, sourceLabel],
            ],
        ...(hasOriginalLink
          ? [
              [
                'a',
                {
                  href: originalUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  class:
                    'embed-visit-source-link inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/25 bg-surface-container-lowest hover:bg-primary/10 text-xs font-semibold text-primary transition-colors whitespace-nowrap',
                  title: 'Odpri izvirno vsebino v novem zavihku',
                },
                'Obišči vir ↗',
              ],
            ]
          : []),
      ],
      ...(hasOriginalLink
        ? [
            [
              'div',
              {
                class: 'flex items-center gap-2 flex-wrap',
              },
              [
                'button',
                {
                  type: 'button',
                  'data-copy-embed-url': originalUrl,
                  class:
                    'embed-copy-link-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-surface-container-high bg-surface-container-low hover:bg-surface-container text-[11px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer whitespace-nowrap',
                  title: 'Kopiraj izvorno povezavo',
                },
                'Kopiraj povezavo',
              ],
            ],
          ]
        : []),
    ];

    if (isVertical) {
      return [
        'div',
        {
          class:
            'embed-container my-4 w-full max-w-[388px] mx-auto rounded-2xl border border-surface-container bg-surface-container-low/75 overflow-hidden shadow-xs',
          'data-video-embed': 'true',
          'data-platform': platform,
          'data-orientation': 'vertical',
        },
        sourceBadgeBar,
        [
          'div',
          {
            class:
              'video-embed-wrapper video-embed-vertical embed-vertical-container !my-0 p-2 sm:p-3 w-full flex justify-center',
          },
          [
            'div',
            {
              class:
                'video-embed-frame video-embed-frame--vertical w-full max-w-[360px] aspect-[9/16] min-h-[580px] max-h-[740px] rounded-xl overflow-hidden border border-surface-container shadow-md bg-black relative flex justify-center',
              style: 'aspect-ratio: 9/16; min-height: 580px;',
            },
            ['iframe', iframeAttrs],
          ],
        ],
      ];
    }

    return [
      'div',
      {
        class:
          'embed-container my-4 w-full max-w-3xl mx-auto rounded-2xl border border-surface-container bg-surface-container-low/75 overflow-hidden shadow-xs',
        'data-video-embed': 'true',
        'data-platform': platform,
        'data-orientation': 'horizontal',
      },
      sourceBadgeBar,
      [
        'div',
        {
          class: 'p-2 sm:p-3',
        },
        [
          'div',
          {
            class:
              'video-embed-wrapper video-embed-horizontal embed-horizontal-container responsive-video-embed relative w-full max-w-3xl mx-auto aspect-video !my-0 overflow-hidden rounded-xl shadow-xs border border-surface-container',
            style: 'aspect-ratio: 16/9;',
          },
          ['iframe', iframeAttrs],
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedNodeView);
  },

  addCommands() {
    return {
      setVideoEmbed:
        ({ urlOrHtml, orientation = 'auto' }) =>
        ({ chain }) => {
          const meta = parseVideoLinkForEditor(
            urlOrHtml,
            orientation === 'auto' ? undefined : orientation
          );
          if (!meta) return false;

          return chain()
            .insertContent([
              {
                type: this.name,
                attrs: {
                  src: meta.embedUrl,
                  title: meta.title,
                  'data-platform': meta.platform,
                  'data-original-url': meta.originalUrl,
                  'data-vertical': meta.isVertical ? 'true' : 'false',
                },
              },
              { type: 'paragraph' },
            ])
            .run();
        },
      toggleVideoOrientation:
        () =>
        ({ state, commands }) => {
          const { selection } = state;
          const node =
            selection instanceof Object && 'node' in selection
              ? (selection as { node?: { type?: { name?: string }; attrs?: Record<string, any> } }).node
              : undefined;
          if (!node || node.type?.name !== this.name) return false;
          const currentlyVertical = node.attrs?.['data-vertical'] === 'true';
          return commands.updateAttributes(this.name, {
            'data-vertical': currentlyVertical ? 'false' : 'true',
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: new PluginKey('videoEmbedPasteAutoDetect'),
        props: {
          handlePaste: (_view, event) => {
            // Do not intercept if clipboard carries files (images are handled separately)
            if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
              return false;
            }
            const pastedText = event.clipboardData?.getData('text/plain')?.trim();
            if (!pastedText) return false;

            // Only auto-embed standalone YouTube, TikTok, or Instagram Reels links / video iframes
            const isVideoPlatformUrl =
              /(?:youtube\.com\/|youtu\.be\/|tiktok\.com\/|instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p|tv)\/)/i.test(
                pastedText
              ) || pastedText.includes('<iframe');

            if (!isVideoPlatformUrl) return false;

            const meta = parseVideoLinkForEditor(pastedText);
            if (!meta) return false;

            event.preventDefault();
            return extensionThis.editor.commands.setVideoEmbed({
              urlOrHtml: pastedText,
              orientation: 'auto',
            });
          },
        },
      }),
    ];
  },
});
