import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { 
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3, Heading4, List, ListOrdered, Link as LinkIcon, Unlink, 
  Image as ImageIcon, ImagePlus, Smile, X, Check, ExternalLink, Share2, 
  Video, Code, Sparkles, AlertCircle, Upload, Loader2,
  Table2, Trash2, Merge, Split, Plus, Minus, Columns3, Rows3
} from 'lucide-react';
import { parseSocialEmbed, ParsedEmbed, parseVideoLinkForEditor, VideoEmbedMeta } from '../utils/embedUtils';
import { VideoEmbedExtension } from '../extensions/VideoEmbedExtension';
import { uploadImageFileToStorage, MAX_STORAGE_FILE_BYTES } from '../services/storageService';
import { auth } from '../lib/firebase';

export interface RichTextEditorRef {
  setLink: () => void;
  unsetLink: () => void;
  addImage: () => void;
  openFilePicker: () => void;
  openLinkDialog: () => void;
  openImageDialog: () => void;
  openEmbedDialog: () => void;
  openVideoDialog: () => void;
  insertEmbed: (embedHtml: string) => void;
  insertVideo: (urlOrHtml: string, orientation?: 'auto' | 'vertical' | 'horizontal') => boolean;
  insertContent: (content: string) => void;
  insertTable: (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }) => void;
  openTableDialog: () => void;
  getContent: () => string;
  setContent: (content: string) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleHeading: (level: 1 | 2 | 3 | 4) => void;
}

interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (content: string) => void;
  initialContent?: string;
  className?: string;
  minHeight?: string;
  uploadFolder?: string;
  authorId?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ 
  placeholder = 'O čem želite pisati?', 
  onChange, 
  initialContent = '',
  className = '',
  minHeight = 'min-h-[140px]',
  uploadFolder = 'posts/inline',
  authorId,
}, ref) => {
  // Modal states for non-blocking in-app inputs
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadPercent, setImageUploadPercent] = useState(0);
  const [imageUploadFileName, setImageUploadFileName] = useState('');
  const [imageUploadCountLabel, setImageUploadCountLabel] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');
  const [isDragOverImage, setIsDragOverImage] = useState(false);
  
  // Embed dialog state
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [embedInput, setEmbedInput] = useState('');
  const [embedError, setEmbedError] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedEmbed | null>(null);
  const [embedOrientation, setEmbedOrientation] = useState<'auto' | 'vertical' | 'horizontal'>('auto');

  // Video link dialog state
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [videoError, setVideoError] = useState('');
  const [videoPreview, setVideoPreview] = useState<VideoEmbedMeta | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<'auto' | 'vertical' | 'horizontal'>('auto');

  // Table insertion dialog state
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableWithHeader, setTableWithHeader] = useState(true);
  const [hoverTableGrid, setHoverTableGrid] = useState<{ rows: number; cols: number } | null>(null);

  const linkInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const embedInputRef = useRef<HTMLTextAreaElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadFilesHandlerRef = useRef<(files: File[], insertPos?: number) => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      VideoEmbedExtension,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap text-primary underline cursor-pointer hover:text-primary-hover font-medium',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-3 border border-surface-container shadow-xs',
        },
      }),
      Table.configure({
        resizable: true,
        renderWrapper: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
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
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false;
        const imageFiles = Array.from(event.dataTransfer.files).filter((f) =>
          f.type.startsWith('image/')
        );
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        setIsDragOverImage(false);
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void uploadFilesHandlerRef.current(imageFiles, coords?.pos);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        void uploadFilesHandlerRef.current(imageFiles);
        return true;
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
    setIsVideoDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsTableDialogOpen(false);
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
    setImageUploadError('');
    setIsImageDialogOpen(true);
    setIsLinkDialogOpen(false);
    setIsEmbedDialogOpen(false);
    setIsVideoDialogOpen(false);
    setIsTableDialogOpen(false);
    setTimeout(() => imageInputRef.current?.focus(), 80);
  };

  const uploadImageFilesToEditor = async (files: File[], insertPos?: number) => {
    if (!editor || files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setImageUploadError(`Datoteka »${file.name}« ni veljavna slika.`);
        continue;
      }
      if (file.size > MAX_STORAGE_FILE_BYTES) {
        setImageUploadError(
          `Slika »${file.name}« presega omejitev ${Math.round(MAX_STORAGE_FILE_BYTES / (1024 * 1024))} MB.`
        );
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const uploaderUid = authorId || auth.currentUser?.uid || 'editor';
    setIsUploadingImage(true);
    setImageUploadPercent(0);
    setImageUploadError('');

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setImageUploadFileName(file.name);
        setImageUploadCountLabel(
          validFiles.length > 1 ? `(${i + 1}/${validFiles.length})` : ''
        );

        const uploadedUrl = await uploadImageFileToStorage(
          file,
          uploadFolder,
          uploaderUid,
          (pct) => {
            setImageUploadPercent(pct);
          }
        );

        const chain =
          typeof insertPos === 'number' && i === 0
            ? editor.chain().focus(insertPos)
            : editor.chain().focus();

        chain
          .insertContent([
            {
              type: 'image',
              attrs: {
                src: uploadedUrl,
                alt: file.name.replace(/\.[^.]+$/, ''),
              },
            },
            { type: 'paragraph' },
          ])
          .run();
      }

      setImageUploadPercent(100);
      setIsImageDialogOpen(false);
      setImageUrl('');
    } catch (err: any) {
      setImageUploadError(err?.message || 'Nalaganje slike v Firebase Storage ni uspelo.');
    } finally {
      setIsUploadingImage(false);
      setImageUploadPercent(0);
      setImageUploadFileName('');
      setImageUploadCountLabel('');
    }
  };

  uploadFilesHandlerRef.current = uploadImageFilesToEditor;

  const handleInlineImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    e.target.value = '';
    await uploadImageFilesToEditor(files);
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
    setImageUploadError('');
  };

  // Embed dialog handlers
  const openEmbedDialog = () => {
    setEmbedInput('');
    setEmbedError('');
    setParsedPreview(null);
    setEmbedOrientation('auto');
    setIsEmbedDialogOpen(true);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsVideoDialogOpen(false);
    setIsTableDialogOpen(false);
    setTimeout(() => embedInputRef.current?.focus(), 80);
  };

  // Video link dialog handlers
  const openVideoDialog = () => {
    setVideoInput('');
    setVideoError('');
    setVideoPreview(null);
    setVideoOrientation('auto');
    setIsVideoDialogOpen((prev) => !prev);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsEmbedDialogOpen(false);
    setIsTableDialogOpen(false);
    setTimeout(() => videoInputRef.current?.focus(), 80);
  };

  const handleVideoInputChange = (
    val: string,
    forcedOri?: 'auto' | 'vertical' | 'horizontal'
  ) => {
    setVideoInput(val);
    setVideoError('');
    const targetOri = forcedOri !== undefined ? forcedOri : videoOrientation;
    if (val.trim()) {
      const parsed = parseVideoLinkForEditor(
        val.trim(),
        targetOri === 'auto' ? undefined : targetOri
      );
      setVideoPreview(parsed);
      if (forcedOri === undefined && targetOri === 'auto' && parsed) {
        setVideoOrientation(parsed.isVertical ? 'vertical' : 'horizontal');
      }
    } else {
      setVideoPreview(null);
    }
  };

  const handleVideoOrientationChange = (newOri: 'vertical' | 'horizontal') => {
    setVideoOrientation(newOri);
    if (videoInput.trim()) {
      const parsed = parseVideoLinkForEditor(videoInput.trim(), newOri);
      setVideoPreview(parsed);
    }
  };

  const handleApplyVideo = () => {
    if (!editor) return;
    const trimmed = videoInput.trim();
    if (!trimmed) {
      setVideoError('Vnesite povezavo do videa (YouTube, TikTok ali Instagram Reels).');
      return;
    }

    const ok = editor.chain().focus().setVideoEmbed({
      urlOrHtml: trimmed,
      orientation: videoOrientation,
    }).run();

    if (!ok) {
      setVideoError(
        'Povezave ni bilo mogoče prepoznati. Podprti so YouTube, YouTube Shorts, TikTok, Instagram Reels ter <iframe> koda.'
      );
      return;
    }

    setIsVideoDialogOpen(false);
    setVideoInput('');
    setVideoPreview(null);
    setVideoError('');
    setVideoOrientation('auto');
  };

  // Table dialog handlers
  const openTableDialog = () => {
    setHoverTableGrid(null);
    setIsTableDialogOpen((prev) => !prev);
    setIsLinkDialogOpen(false);
    setIsImageDialogOpen(false);
    setIsEmbedDialogOpen(false);
    setIsVideoDialogOpen(false);
  };

  const handleInsertTable = (
    rows = tableRows,
    cols = tableCols,
    withHeaderRow = tableWithHeader
  ) => {
    if (!editor) return;
    const safeRows = Math.max(1, Math.min(20, Math.floor(Number(rows) || 3)));
    const safeCols = Math.max(1, Math.min(10, Math.floor(Number(cols) || 3)));
    editor
      .chain()
      .focus()
      .insertTable({ rows: safeRows, cols: safeCols, withHeaderRow })
      .run();
    setIsTableDialogOpen(false);
    setHoverTableGrid(null);
  };

  const handleEmbedInputChange = (val: string, forcedOri?: 'auto' | 'vertical' | 'horizontal') => {
    setEmbedInput(val);
    setEmbedError('');
    const targetOri = forcedOri !== undefined ? forcedOri : embedOrientation;
    if (val.trim()) {
      const parsed = parseSocialEmbed(val.trim(), targetOri === 'auto' ? undefined : targetOri);
      setParsedPreview(parsed);
      if (forcedOri === undefined && targetOri === 'auto' && parsed) {
        setEmbedOrientation(parsed.isVertical ? 'vertical' : 'horizontal');
      }
    } else {
      setParsedPreview(null);
    }
  };

  const handleOrientationChange = (newOri: 'vertical' | 'horizontal') => {
    setEmbedOrientation(newOri);
    if (embedInput.trim()) {
      const parsed = parseSocialEmbed(embedInput.trim(), newOri);
      setParsedPreview(parsed);
    }
  };

  const handleApplyEmbed = () => {
    if (!editor) return;
    const trimmed = embedInput.trim();
    if (!trimmed) {
      setEmbedError('Prosimo, vnesite povezavo ali kodo za vdelavo.');
      return;
    }

    const parsed = parseSocialEmbed(trimmed, embedOrientation === 'auto' ? undefined : embedOrientation);
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
    setEmbedOrientation('auto');
  };

  useImperativeHandle(ref, () => ({
    setLink: openLinkDialog,
    openLinkDialog,
    unsetLink: () => editor?.chain().focus().unsetLink().run(),
    addImage: openImageDialog,
    openFilePicker: () => fileInputRef.current?.click(),
    openImageDialog,
    openEmbedDialog,
    openVideoDialog,
    insertEmbed: (embedHtml: string) => editor?.chain().focus().insertContent(embedHtml).run(),
    insertVideo: (urlOrHtml: string, orientation: 'auto' | 'vertical' | 'horizontal' = 'auto') =>
      Boolean(editor?.chain().focus().setVideoEmbed({ urlOrHtml, orientation }).run()),
    insertContent: (content: string) => editor?.chain().focus().insertContent(content).run(),
    insertTable: (options) => {
      const safeRows = Math.max(1, Math.min(20, Math.floor(options?.rows ?? 3)));
      const safeCols = Math.max(1, Math.min(10, Math.floor(options?.cols ?? 3)));
      editor
        ?.chain()
        .focus()
        .insertTable({
          rows: safeRows,
          cols: safeCols,
          withHeaderRow: options?.withHeaderRow ?? true,
        })
        .run();
    },
    openTableDialog,
    getContent: () => editor?.getHTML() || '',
    setContent: (content: string) => editor?.commands.setContent(content),
    toggleBold: () => editor?.chain().focus().toggleBold().run(),
    toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
    toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
    toggleHeading: (level: 1 | 2 | 3 | 4) => editor?.chain().focus().toggleHeading({ level }).run(),
  }));

  useEffect(() => {
    const normalized = initialContent || '';
    if (editor && normalized !== editor.getHTML()) {
      editor.commands.setContent(normalized);
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
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-1.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 ${editor.isActive('heading', { level: 1 }) ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Naslov H1 (Ctrl+Alt+1)"
          aria-label="Naslov H1"
          aria-pressed={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-1.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 ${editor.isActive('heading', { level: 2 }) ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Podnaslov H2 (Ctrl+Alt+2)"
          aria-label="Podnaslov H2"
          aria-pressed={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-1.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 ${editor.isActive('heading', { level: 3 }) ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Podnaslov H3 (Ctrl+Alt+3)"
          aria-label="Podnaslov H3"
          aria-pressed={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={`px-1.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 ${editor.isActive('heading', { level: 4 }) ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Podnaslov H4 (Ctrl+Alt+4)"
          aria-label="Podnaslov H4"
          aria-pressed={editor.isActive('heading', { level: 4 })}
        >
          <Heading4 className="w-4 h-4" />
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

        {/* Quick Video Link Button (YouTube, TikTok, Instagram Reels) */}
        <button
          type="button"
          onClick={openVideoDialog}
          className={`p-1.5 px-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border ${
            isVideoDialogOpen || editor.isActive('iframe')
              ? 'bg-primary text-on-primary border-primary font-bold shadow-xs'
              : 'text-primary hover:bg-primary/10 bg-primary/5 border-primary/20'
          }`}
          title="Vstavi video povezavo (YouTube, YouTube Shorts, TikTok, Instagram Reels)"
          aria-pressed={isVideoDialogOpen || editor.isActive('iframe')}
        >
          <Video className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">Video</span>
        </button>

        {/* Embed Post from Social Media Button */}
        <button 
          type="button" 
          onClick={openEmbedDialog} 
          className="p-1.5 px-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-secondary hover:bg-secondary/10 bg-secondary/5 border border-secondary/20" 
          title="Vdelaj objavo z družbenih omrežij (YouTube, X, Instagram, Facebook, TikTok) ali kodo"
        >
          <Share2 className="w-3.5 h-3.5 text-secondary" />
          <span className="text-[11px] font-bold text-secondary">Vdelaj objavo</span>
        </button>
        
        <div className="w-px h-4 bg-surface-container-high mx-1"></div>
        
        {/* Direct Image File Upload Input & Toolbar Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={isUploadingImage}
          onChange={handleInlineImageFileUpload}
          className="hidden"
          aria-label="Naloži sliko v besedilo"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingImage}
          className="p-1.5 px-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 disabled:opacity-50"
          title="Naloži sliko z naprave neposredno v besedilo"
        >
          {isUploadingImage ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="text-[11px] font-bold text-primary">
            {isUploadingImage ? `${imageUploadPercent}%` : 'Dodaj sliko'}
          </span>
        </button>

        <button 
          type="button" 
          onClick={openImageDialog} 
          className="p-1.5 rounded-lg transition-colors text-on-surface-variant hover:bg-surface-container-high cursor-pointer" 
          title="Vstavi sliko preko spletnega naslova (URL)"
          aria-label="Vstavi sliko preko URL"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Table Button */}
        <button
          type="button"
          onClick={openTableDialog}
          className={`p-1.5 px-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            editor.isActive('table') || isTableDialogOpen
              ? 'bg-primary text-on-primary font-bold shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
          title="Vstavi ali uredi tabelo"
          aria-label="Tabela"
          aria-pressed={editor.isActive('table') || isTableDialogOpen}
        >
          <Table2 className="w-4 h-4" />
          <span className="text-[11px] font-semibold">Tabela</span>
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

      {/* Contextual Table Editing Sub-Toolbar (Shown when cursor is inside a table) */}
      {editor.isActive('table') && (
        <div
          className="bg-primary/5 border-b border-primary/20 px-2.5 py-1.5 flex items-center gap-1 flex-wrap text-[11px]"
          role="toolbar"
          aria-label="Orodja za urejanje tabele"
        >
          <span className="inline-flex items-center gap-1 font-bold text-primary mr-1">
            <Table2 className="w-3.5 h-3.5" />
            <span>Tabela:</span>
          </span>

          {/* Rows controls */}
          <div className="inline-flex items-center gap-0.5 bg-surface-container-lowest border border-surface-container rounded-lg p-0.5">
            <Rows3 className="w-3 h-3 text-outline mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer flex items-center gap-0.5"
              title="Dodaj vrstico zgoraj"
            >
              <Plus className="w-3 h-3 text-primary" />
              <span>Zgoraj</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer flex items-center gap-0.5"
              title="Dodaj vrstico spodaj"
            >
              <Plus className="w-3 h-3 text-primary" />
              <span>Spodaj</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-1.5 py-0.5 rounded hover:bg-error/10 text-error font-medium cursor-pointer flex items-center gap-0.5"
              title="Izbriši trenutno vrstico"
            >
              <Minus className="w-3 h-3" />
              <span>Vrstica</span>
            </button>
          </div>

          {/* Columns controls */}
          <div className="inline-flex items-center gap-0.5 bg-surface-container-lowest border border-surface-container rounded-lg p-0.5">
            <Columns3 className="w-3 h-3 text-outline mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer flex items-center gap-0.5"
              title="Dodaj stolpec levo"
            >
              <Plus className="w-3 h-3 text-primary" />
              <span>Levo</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer flex items-center gap-0.5"
              title="Dodaj stolpec desno"
            >
              <Plus className="w-3 h-3 text-primary" />
              <span>Desno</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-1.5 py-0.5 rounded hover:bg-error/10 text-error font-medium cursor-pointer flex items-center gap-0.5"
              title="Izbriši trenutni stolpec"
            >
              <Minus className="w-3 h-3" />
              <span>Stolpec</span>
            </button>
          </div>

          {/* Header & Cell merge controls */}
          <div className="inline-flex items-center gap-0.5 bg-surface-container-lowest border border-surface-container rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer"
              title="Preklopi naslovno vrstico"
            >
              Glava vrstice
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer"
              title="Preklopi naslovni stolpec"
            >
              Glava stolpca
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().mergeCells().run()}
              disabled={!editor.can().mergeCells()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Združi izbrane celice"
            >
              <Merge className="w-3 h-3" />
              <span>Združi</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().splitCell().run()}
              disabled={!editor.can().splitCell()}
              className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface font-medium cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Razdeli združeno celico"
            >
              <Split className="w-3 h-3" />
              <span>Razdeli</span>
            </button>
          </div>

          {/* Delete Table */}
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="ml-auto px-2 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error font-semibold cursor-pointer flex items-center gap-1 transition-colors"
            title="Izbriši celotno tabelo"
          >
            <Trash2 className="w-3 h-3" />
            <span>Izbriši tabelo</span>
          </button>
        </div>
      )}

      {/* Inline Upload Progress & Error Bar (Visible even when Image URL popover is closed) */}
      {(isUploadingImage || (imageUploadError && !isImageDialogOpen)) && (
        <div className="bg-surface-container-lowest border-b border-primary/25 px-3 py-2 flex flex-col gap-1.5">
          {isUploadingImage && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5 truncate min-w-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">
                    Nalagam sliko {imageUploadCountLabel}
                    {imageUploadFileName ? `: ${imageUploadFileName}` : '...'}
                  </span>
                </span>
                <span className="font-mono font-bold text-[11px] shrink-0">
                  {imageUploadPercent}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={imageUploadPercent}
                aria-label="Napredek nalaganja slike"
                className="w-full h-1.5 bg-primary/15 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${Math.max(4, imageUploadPercent)}%` }}
                />
              </div>
            </div>
          )}
          {imageUploadError && !isImageDialogOpen && (
            <div className="text-[11px] text-error bg-error/10 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{imageUploadError}</span>
              </span>
              <button
                type="button"
                onClick={() => setImageUploadError('')}
                className="p-0.5 rounded hover:bg-error/15 cursor-pointer shrink-0"
                aria-label="Zapri napako nalaganja"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

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
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-secondary/20 flex flex-col gap-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-bold text-[10px] uppercase">
                    {parsedPreview.platformName}
                  </span>
                  <span className="font-semibold text-on-surface truncate max-w-[220px]">
                    {parsedPreview.previewTitle || parsedPreview.originalInput}
                  </span>
                </div>
                <span className="text-secondary text-[11px] font-bold shrink-0">Pripravljeno za vdelavo ✓</span>
              </div>

              {/* Format orientation chooser */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-surface-container/60 flex-wrap">
                <span className="text-[11px] font-semibold text-outline">Oblika prikaza:</span>
                <div className="inline-flex rounded-lg p-0.5 bg-surface-container border border-surface-container-high text-xs">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('vertical')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      parsedPreview.isVertical
                        ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="Navpični format primeren za YouTube Shorts, Instagram Reels, TikTok in portretne videe"
                  >
                    <span>📱 Navpično (9:16)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange('horizontal')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      !parsedPreview.isVertical
                        ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="Klasični vodoravni video 16:9 za standardne YouTube in Vimeo posnetke"
                  >
                    <span>📺 Vodoravno (16:9)</span>
                  </button>
                </div>
              </div>
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
              Vstavi sliko v besedilo
            </span>
            <button
              type="button"
              onClick={() => setIsImageDialogOpen(false)}
              className="p-1 text-outline hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="border border-dashed border-primary/40 hover:border-primary rounded-lg px-3 py-2 flex flex-col items-stretch justify-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            {isUploadingImage ? (
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate min-w-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">
                      Nalagam{imageUploadFileName ? ` (${imageUploadFileName})` : ' sliko'}...
                    </span>
                  </span>
                  <span className="font-mono font-bold text-[11px] shrink-0">{imageUploadPercent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={imageUploadPercent}
                  aria-label="Napredek nalaganja slike v Firebase Storage"
                  className="w-full h-1.5 bg-primary/20 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-150 ease-out"
                    style={{ width: `${Math.max(4, imageUploadPercent)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                <span>Naloži sliko z naprave v Firebase Storage</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploadingImage}
              onChange={handleInlineImageFileUpload}
              className="hidden"
            />
          </label>

          {imageUploadError && (
            <div className="text-[11px] text-error bg-error/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{imageUploadError}</span>
            </div>
          )}
          
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-outline">Ali prilepite URL naslov slike</label>
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
              disabled={!imageUrl.trim() || isUploadingImage}
              className="px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Vstavi sliko</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Table Insertion Dialog Popover */}
      {isTableDialogOpen && (
        <div className="bg-surface-container-lowest border-b border-primary/30 p-3 flex flex-col gap-3 animate-in fade-in duration-150 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5" />
              Vstavi novo tabelo
            </span>
            <button
              type="button"
              onClick={() => setIsTableDialogOpen(false)}
              className="p-1 text-outline hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Zapri pogovorno okno za tabelo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Visual 6x6 Interactive Grid Picker */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-outline">
                Hitri izbor ({hoverTableGrid ? `${hoverTableGrid.rows} × ${hoverTableGrid.cols}` : `${tableRows} × ${tableCols}`})
              </span>
              <div
                className="grid grid-cols-6 gap-1 p-1.5 rounded-lg bg-surface-container border border-surface-container-high"
                onMouseLeave={() => setHoverTableGrid(null)}
              >
                {Array.from({ length: 6 }).map((_, rIdx) =>
                  Array.from({ length: 6 }).map((__, cIdx) => {
                    const r = rIdx + 1;
                    const c = cIdx + 1;
                    const activeRows = hoverTableGrid ? hoverTableGrid.rows : tableRows;
                    const activeCols = hoverTableGrid ? hoverTableGrid.cols : tableCols;
                    const isHighlighted = r <= activeRows && c <= activeCols;
                    return (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onMouseEnter={() => setHoverTableGrid({ rows: r, cols: c })}
                        onClick={() => handleInsertTable(r, c, tableWithHeader)}
                        aria-label={`Vstavi tabelo ${r} krat ${c}`}
                        className={`w-5 h-5 rounded-sm border transition-colors cursor-pointer ${
                          isHighlighted
                            ? 'bg-primary/80 border-primary'
                            : 'bg-surface-container-lowest border-surface-container-high hover:border-primary/50'
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom Dimensions, Presets & Header Option */}
            <div className="flex-1 flex flex-col gap-2.5 w-full">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-outline mr-1">Predloge:</span>
                {[
                  { rows: 2, cols: 2 },
                  { rows: 3, cols: 3 },
                  { rows: 4, cols: 3 },
                  { rows: 5, cols: 4 },
                ].map((preset) => (
                  <button
                    key={`${preset.rows}x${preset.cols}`}
                    type="button"
                    onClick={() => {
                      setTableRows(preset.rows);
                      setTableCols(preset.cols);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                      tableRows === preset.rows && tableCols === preset.cols
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-surface-container border-surface-container-high text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {preset.rows} × {preset.cols}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-outline">Število vrstic</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-outline">Število stolpcev</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tableWithHeader}
                  onChange={(e) => setTableWithHeader(e.target.checked)}
                  className="rounded border-surface-container-high text-primary focus:ring-primary"
                />
                <span>Vključi naslovno vrstico (glava tabele)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container-high/40">
            <button
              type="button"
              onClick={() => setIsTableDialogOpen(false)}
              className="px-3 py-1 text-xs font-medium text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="button"
              onClick={() => handleInsertTable()}
              className="px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Vstavi tabelo ({tableRows} × {tableCols})</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Video Link Insertion Dialog (YouTube, TikTok, Instagram Reels) */}
      {isVideoDialogOpen && (
        <div className="bg-surface-container-lowest border-b border-primary/30 p-3.5 flex flex-col gap-3 animate-in fade-in duration-150 shadow-sm z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-xs font-bold text-on-surface block">
                  Vstavi video povezavo (samodejno zaznavanje)
                </span>
                <span className="text-[10px] text-outline">
                  YouTube (16:9), YouTube Shorts (9:16), TikTok (9:16) in Instagram Reels (9:16). Nasvet: povezavo lahko tudi neposredno prilepite v besedilo!
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVideoDialogOpen(false)}
              className="p-1 text-outline hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Zapri pogovorno okno za video"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-outline">
              URL povezava do videa (YouTube, TikTok, Instagram Reels) *
            </label>
            <input
              ref={videoInputRef}
              type="text"
              value={videoInput}
              onChange={(e) => handleVideoInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyVideo();
                }
                if (e.key === 'Escape') {
                  setIsVideoDialogOpen(false);
                }
              }}
              placeholder="https://www.youtube.com/watch?v=... ali https://www.tiktok.com/@.../video/... ali https://www.instagram.com/reel/..."
              className="w-full px-3 py-2 rounded-xl bg-surface-container font-mono text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-high"
            />
          </div>

          {videoError && (
            <div className="flex items-center gap-1.5 text-xs text-error font-medium bg-error/10 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{videoError}</span>
            </div>
          )}

          {videoPreview && (
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col gap-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold text-[10px] uppercase">
                    {videoPreview.platformName}
                  </span>
                  <span className="font-semibold text-on-surface truncate max-w-[240px]">
                    {videoPreview.title}
                  </span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shrink-0">
                  Zaznano ✓
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1.5 border-t border-surface-container/60 flex-wrap">
                <span className="text-[11px] font-semibold text-outline">Odzivni format:</span>
                <div className="inline-flex rounded-lg p-0.5 bg-surface-container border border-surface-container-high text-xs">
                  <button
                    type="button"
                    onClick={() => handleVideoOrientationChange('vertical')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      videoPreview.isVertical
                        ? 'bg-amber-500 text-black shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Navpično (9:16)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVideoOrientationChange('horizontal')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      !videoPreview.isVertical
                        ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Vodoravno (16:9)
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-container-high/40">
            <button
              type="button"
              onClick={() => setIsVideoDialogOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-outline hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              type="button"
              onClick={handleApplyVideo}
              disabled={!videoInput.trim()}
              className="px-3.5 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-on-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Vstavi video</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area with Drag-and-Drop highlight */}
      <div
        className={`relative ${isDragOverImage ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}`}
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault();
            setIsDragOverImage(true);
          }
        }}
        onDragLeave={() => setIsDragOverImage(false)}
        onDrop={() => setIsDragOverImage(false)}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});
