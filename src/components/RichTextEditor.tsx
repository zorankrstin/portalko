import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Node } from '@tiptap/core';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Unlink, 
  Image as ImageIcon, Smile, X, Check, ExternalLink, Share2, 
  Video, Code, Sparkles, AlertCircle 
} from 'lucide-react';
import { parseSocialEmbed, ParsedEmbed } from '../utils/embedUtils';

// Custom Tiptap Node for Iframe Embeds
const IframeNode = Node.create({
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
        default: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      },
      class: {
        default: 'w-full aspect-video rounded-xl border border-surface-container my-3',
      },
      scrolling: {
        default: 'no',
      },
      title: {
        default: 'Vdelana vsebina',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'relative w-full aspect-video my-3 overflow-hidden rounded-xl shadow-xs border border-surface-container' }, ['iframe', HTMLAttributes]];
  },
});

export interface RichTextEditorRef {
  setLink: () => void;
  unsetLink: () => void;
  addImage: () => void;
  openLinkDialog: () => void;
  openImageDialog: () => void;
  openEmbedDialog: () => void;
  insertEmbed: (embedHtml: string) => void;
  insertContent: (content: string) => void;
  getContent: () => string;
  setContent: (content: string) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
}

interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (content: string) => void;
  initialContent?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ 
  placeholder = 'O čem želite pisati?', 
  onChange, 
  initialContent = '',
  className = '',
  minHeight = 'min-h-[140px]'
}, ref) => {
  // Modal states for non-blocking in-app inputs
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  // Embed dialog state
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [embedInput, setEmbedInput] = useState('');
  const [embedError, setEmbedError] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedEmbed | null>(null);

  const linkInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const embedInputRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      IframeNode,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap text-primary underline cursor-pointer hover:text-primary-hover font-medium',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-3 border border-surface-container shadow-xs',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `tiptap w-full bg-surface-container-low px-4 py-3 ${minHeight} rounded-b-xl font-body-md text-sm text-on-surface focus:outline-none focus:border-primary border border-transparent transition-colors`,
      },
    },
  });

  // Link dialog handlers
  const openLinkDialog = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const previousUrl = editor.getAttributes('link').href || '';
    
    setLinkUrl(previousUrl);
    setLinkText(selectedText || '');
    setIsLinkDialogOpen(true);
    setIsEmbedDialogOpen(false);
    setIsImageDialogOpen(false);
    setTimeout(() => linkInputRef.current?.focus(), 80);
  };

  const handleApplyLink = () => {
    if (!editor) return;
    
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkDialogOpen(false);
      return;
    }

    let urlToSet = trimmedUrl;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)) {
      urlToSet = `https://${trimmedUrl}`;
    }

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    const displayLabel = linkText.trim() || selectedText || urlToSet;

    if (from !== to) {
      if (linkText.trim() && linkText.trim() !== selectedText) {
        editor.chain().focus().insertContent({
          type: 'text',
          text: displayLabel,
          marks: [{ type: 'link', attrs: { href: urlToSet, target: '_blank', rel: 'noopener noreferrer' } }],
        }).run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: urlToSet, target: '_blank', rel: 'noopener noreferrer' }).run();
      }
    } else {
      editor.chain().focus().insertContent({
        type: 'text',
        text: displayLabel,
        marks: [{ type: 'link', attrs: { href: urlToSet, target: '_blank', rel: 'noopener noreferrer' } }],
      }).run();
    }

    setIsLinkDialogOpen(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Image dialog handlers
  const openImageDialog = () => {
    setImageUrl('');
    setIsImageDialogOpen(true);
    setIsLinkDialogOpen(false);
    setIsEmbedDialogOpen(false);
    setTimeout(() => imageInputRef.current?.focus(), 80);
  };

  const handleApplyImage = () => {
    if (!editor) return;
    const cleanImg = imageUrl.trim();
    if (cleanImg) {
      let finalImg = cleanImg;
      if (!/^[a-z][a-z0-9+.-]*:/i.test(cleanImg) && !cleanImg.startsWith('data:')) {
        finalImg = `https://${cleanImg}`;
      }
      editor.chain().focus().setImage({ src: finalImg }).run();
    }
    setIsImageDialogOpen(false);
    setImageUrl('');
  };

  // Embed dialog handlers
  const openEmbedDialog = () => {
    setEmbedInput('');
    setEmbedError('');
    setParsedPreview(null);
    setIsEmbedDialogOpen(true);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setTimeout(() => embedInputRef.current?.focus(), 80);
  };

  const handleEmbedInputChange = (val: string) => {
    setEmbedInput(val);
    setEmbedError('');
    if (val.trim()) {
      const parsed = parseSocialEmbed(val.trim());
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  };

  const handleApplyEmbed = () => {
    if (!editor) return;
    const trimmed = embedInput.trim();
    if (!trimmed) {
      setEmbedError('Prosimo, vnesite povezavo ali kodo za vdelavo.');
      return;
    }

    const parsed = parseSocialEmbed(trimmed);
    if (!parsed) {
      setEmbedError('Povezave ali kode ni bilo mogoče prepoznati. Preverite obliko URL-ja ali iframe kode.');
      return;
    }

    // Insert embed HTML into editor
    editor.chain().focus().insertContent(parsed.embedHtml).run();
    setIsEmbedDialogOpen(false);
    setEmbedInput('');
    setParsedPreview(null);
    setEmbedError('');
  };

  useImperativeHandle(ref, () => ({
    setLink: openLinkDialog,
    openLinkDialog,
    unsetLink: () => editor?.chain().focus().unsetLink().run(),
    addImage: openImageDialog,
    openImageDialog,
    openEmbedDialog,
    insertEmbed: (embedHtml: string) => editor?.chain().focus().insertContent(embedHtml).run(),
    insertContent: (content: string) => editor?.chain().focus().insertContent(content).run(),
    getContent: () => editor?.getHTML() || '',
    setContent: (content: string) => editor?.commands.setContent(content),
    toggleBold: () => editor?.chain().focus().toggleBold().run(),
    toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
    toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
  }));

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className={`flex flex-col rounded-xl border border-surface-container/60 focus-within:border-primary bg-surface-container-low transition-colors shadow-xs overflow-hidden relative ${className}`}>
      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-surface-container border-b border-surface-container-low flex-wrap">
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor.isActive('bold') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`} 
          title="Krepko (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor.isActive('italic') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`} 
          title="Ležeče (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor.isActive('underline') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`} 
          title="Podčrtano (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-surface-container-high mx-1"></div>
        
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor.isActive('bulletList') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`} 
          title="Označen seznam"
        >
          <List className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor.isActive('orderedList') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`} 
          title="Oštevilčen seznam"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-surface-container-high mx-1"></div>
        
        {/* URL Link button */}
        <button 
          type="button" 
          onClick={openLinkDialog} 
          className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            editor.isActive('link') 
              ? 'bg-primary text-on-primary font-semibold' 
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`} 
          title={editor.isActive('link') ? "Uredi spletno povezavo (URL link)" : "Vstavi spletno povezavo (URL link)"}
        >
          <LinkIcon className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-semibold text-primary">Povezava</span>
        </button>
        
        {editor.isActive('link') && (
          <button 
            type="button" 
            onClick={() => editor.chain().focus().unsetLink().run()} 
            className="p-1.5 rounded-lg transition-colors text-error hover:bg-error/10 cursor-pointer" 
            title="Odstrani povezavo"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}

        <div className="w-px h-4 bg-surface-container-high mx-1"></div>

        {/* Embed Post from Social Media Button */}
        <button 
          type="button" 
          onClick={openEmbedDialog} 
          className="p-1.5 px-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-secondary hover:bg-secondary/10 bg-secondary/5 border border-secondary/20" 
          title="Vdelaj objavo z družbenih omrežij (YouTube, X, Instagram, Facebook, TikTok) ali video"
        >
          <Share2 className="w-3.5 h-3.5 text-secondary" />
          <span className="text-[11px] font-bold text-secondary">Vdelaj objavo</span>
        </button>
        
        <div className="w-px h-4 bg-surface-container-high mx-1"></div>
        
        <button 
          type="button" 
          onClick={openImageDialog} 
          className="p-1.5 rounded-lg transition-colors text-on-surface-variant hover:bg-surface-container-high cursor-pointer" 
          title="Vstavi spletno sliko v besedilo"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button 
          type="button" 
          onClick={() => editor.chain().focus().insertContent(' 😊 ').run()} 
          className="p-1.5 rounded-lg transition-colors text-on-surface-variant hover:bg-surface-container-high cursor-pointer" 
          title="Dodaj smeško"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Link Dialog Popover */}
      {isLinkDialogOpen && (
        <div className="bg-surface-container-lowest border-b border-primary/30 p-3 flex flex-col gap-2.5 animate-in fade-in duration-150 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              {editor.isActive('link') ? 'Uredi spletno povezavo (URL)' : 'Vstavi spletno povezavo (URL)'}
            </span>
            <button
              type="button"
              onClick={() => setIsLinkDialogOpen(false)}
              className="p-1 text-outline hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-outline">URL naslov povezave *</label>
              <input
                ref={linkInputRef}
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyLink();
                  }
                  if (e.key === 'Escape') {
                    setIsLinkDialogOpen(false);
                  }
                }}
                placeholder="https://primer.si ali www.trgovina.si"
                className="w-full px-3 py-1.5 rounded-lg bg-surface-container font-mono text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-outline">Besedilo povezave (neobvezno)</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyLink();
                  }
                  if (e.key === 'Escape') {
                    setIsLinkDialogOpen(false);
                  }
                }}
                placeholder="Npr. Obiščite uradno stran ali Ugodnost tukaj"
                className="w-full px-3 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  setIsLinkDialogOpen(false);
                }}
                className="px-2.5 py-1 text-xs text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer mr-auto"
              >
                Odstrani povezavo
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsLinkDialogOpen(false)}
              className="px-3 py-1 text-xs font-medium text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="button"
              onClick={handleApplyLink}
              disabled={!linkUrl.trim()}
              className="px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Vstavi povezavo</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Embed Dialog Popover (Social Media & Video) */}
      {isEmbedDialogOpen && (
        <div className="bg-surface-container-lowest border-b border-secondary/30 p-3.5 flex flex-col gap-3 animate-in fade-in duration-150 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-secondary" />
              <div>
                <span className="text-xs font-bold text-on-surface block">
                  Vdelaj objavo z družbenih omrežij ali video
                </span>
                <span className="text-[10px] text-outline">
                  Podprto: YouTube, X (Twitter), Instagram, Facebook, TikTok ter koda &lt;iframe&gt;
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEmbedDialogOpen(false)}
              className="p-1 text-outline hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick platform badges */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="text-outline font-semibold">Primeri:</span>
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 font-semibold">YouTube</span>
            <span className="px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-on-surface font-semibold">𝕏 Twitter</span>
            <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 font-semibold">Instagram</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-semibold">Facebook</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 font-semibold">TikTok</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold">&lt;iframe&gt; koda</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-outline">
              Povezava (URL) do objave ali koda za vdelavo (&lt;iframe...&gt;) *
            </label>
            <textarea
              ref={embedInputRef}
              rows={2}
              value={embedInput}
              onChange={(e) => handleEmbedInputChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ali https://x.com/.../status/... ali https://instagram.com/p/... ali koda..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container font-mono text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-high resize-none"
            />
          </div>

          {embedError && (
            <div className="flex items-center gap-1.5 text-xs text-error font-medium bg-error/10 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{embedError}</span>
            </div>
          )}

          {parsedPreview && (
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-secondary/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-bold text-[10px] uppercase">
                  {parsedPreview.platformName}
                </span>
                <span className="font-semibold text-on-surface truncate max-w-[260px]">
                  {parsedPreview.previewTitle || parsedPreview.originalInput}
                </span>
              </div>
              <span className="text-secondary text-[11px] font-bold">Pripravljeno za vdelavo ✓</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container-high/40">
            <button
              type="button"
              onClick={() => setIsEmbedDialogOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="button"
              onClick={handleApplyEmbed}
              disabled={!embedInput.trim()}
              className="px-3.5 py-1.5 text-xs font-bold bg-secondary hover:bg-secondary/90 text-on-secondary rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Vdelaj v opis</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Image Dialog Popover */}
      {isImageDialogOpen && (
        <div className="bg-surface-container-lowest border-b border-primary/30 p-3 flex flex-col gap-2.5 animate-in fade-in duration-150 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Vstavi spletno sliko
            </span>
            <button
              type="button"
              onClick={() => setIsImageDialogOpen(false)}
              className="p-1 text-outline hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-outline">URL naslov slike *</label>
            <input
              ref={imageInputRef}
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyImage();
                }
                if (e.key === 'Escape') {
                  setIsImageDialogOpen(false);
                }
              }}
              placeholder="https://images.unsplash.com/... ali druga slika"
              className="w-full px-3 py-1.5 rounded-lg bg-surface-container font-mono text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsImageDialogOpen(false)}
              className="px-3 py-1 text-xs font-medium text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="button"
              onClick={handleApplyImage}
              disabled={!imageUrl.trim()}
              className="px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Vstavi sliko</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
});
