import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Unlink } from 'lucide-react';

interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (content: string) => void;
}

export function RichTextEditor({ placeholder = 'O čem želite pisati?', onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getText() || editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap w-full bg-surface-container-low px-4 py-3 min-h-[140px] rounded-b-xl font-body-md text-sm text-on-surface focus:outline-none focus:border-primary border border-transparent transition-colors',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const newUrl = window.prompt('URL povezave:', previousUrl);
    
    // cancelled
    if (newUrl === null) {
      return;
    }

    // empty
    if (newUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: newUrl }).run();
  };

  return (
    <div className="flex flex-col rounded-xl border border-transparent focus-within:border-primary bg-surface-container-low transition-colors shadow-sm overflow-hidden">
      <div className="flex items-center gap-1 p-2 bg-surface-container border-b border-surface-container-low">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Krepko"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Ležeče"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-surface-container-high mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Označen seznam"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Oštevilčen seznam"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-surface-container-high mx-1"></div>
        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('link') ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          title="Dodaj povezavo"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          className="p-1.5 rounded-lg transition-colors text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
          title="Odstrani povezavo"
        >
          <Unlink className="w-4 h-4" />
        </button>
      </div>
      
      <EditorContent editor={editor} />
    </div>
  );
}
