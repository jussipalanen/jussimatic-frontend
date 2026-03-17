import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const btnCls = 'px-2 py-1 rounded text-xs font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
const activeCls = 'bg-gray-600 text-white';

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[160px] px-3 py-2 text-sm text-white focus:outline-none',
      },
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const btn = (label: string, action: () => boolean, isActive?: boolean, title?: string) => (
    <button
      type="button"
      title={title ?? label}
      onClick={action}
      disabled={disabled}
      className={`${btnCls} ${isActive ? activeCls : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className={`rounded-lg border bg-gray-900 ${disabled ? 'opacity-60 border-gray-700' : 'border-gray-600 focus-within:border-blue-500'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-700 px-2 py-1.5">
        {btn('B', () => editor!.chain().focus().toggleBold().run(), editor?.isActive('bold'), 'Bold')}
        {btn('I', () => editor!.chain().focus().toggleItalic().run(), editor?.isActive('italic'), 'Italic')}
        {btn('S', () => editor!.chain().focus().toggleStrike().run(), editor?.isActive('strike'), 'Strikethrough')}
        {btn('Code', () => editor!.chain().focus().toggleCode().run(), editor?.isActive('code'), 'Inline code')}

        <span className="mx-1 text-gray-700">|</span>

        {btn('H1', () => editor!.chain().focus().toggleHeading({ level: 1 }).run(), editor?.isActive('heading', { level: 1 }))}
        {btn('H2', () => editor!.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive('heading', { level: 2 }))}
        {btn('H3', () => editor!.chain().focus().toggleHeading({ level: 3 }).run(), editor?.isActive('heading', { level: 3 }))}

        <span className="mx-1 text-gray-700">|</span>

        {btn('UL', () => editor!.chain().focus().toggleBulletList().run(), editor?.isActive('bulletList'), 'Bullet list')}
        {btn('OL', () => editor!.chain().focus().toggleOrderedList().run(), editor?.isActive('orderedList'), 'Ordered list')}
        {btn('"""', () => editor!.chain().focus().toggleBlockquote().run(), editor?.isActive('blockquote'), 'Blockquote')}
        {btn('---', () => editor!.chain().focus().setHorizontalRule().run(), false, 'Horizontal rule')}

        <span className="mx-1 text-gray-700">|</span>

        {btn('↩', () => editor!.chain().focus().undo().run(), false, 'Undo')}
        {btn('↪', () => editor!.chain().focus().redo().run(), false, 'Redo')}
      </div>

      {/* Editor area */}
      <div className="relative rich-text-editor-content">
        <style>{`
          .rich-text-editor-content .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
          .rich-text-editor-content .tiptap h2 { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
          .rich-text-editor-content .tiptap h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
          .rich-text-editor-content .tiptap p { margin: 0.4rem 0; }
          .rich-text-editor-content .tiptap ul { list-style: disc; padding-left: 1.5rem; margin: 0.4rem 0; }
          .rich-text-editor-content .tiptap ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4rem 0; }
          .rich-text-editor-content .tiptap blockquote { border-left: 3px solid #4b5563; padding-left: 0.75rem; color: #9ca3af; margin: 0.5rem 0; }
          .rich-text-editor-content .tiptap code { background: #1f2937; border-radius: 3px; padding: 0.1em 0.3em; font-size: 0.85em; font-family: monospace; }
          .rich-text-editor-content .tiptap pre { background: #1f2937; border-radius: 6px; padding: 0.75rem 1rem; margin: 0.5rem 0; overflow-x: auto; }
          .rich-text-editor-content .tiptap pre code { background: none; padding: 0; }
          .rich-text-editor-content .tiptap hr { border-color: #374151; margin: 0.75rem 0; }
          .rich-text-editor-content .tiptap strong { font-weight: 700; }
          .rich-text-editor-content .tiptap em { font-style: italic; }
          .rich-text-editor-content .tiptap s { text-decoration: line-through; }
        `}</style>
        {editor && editor.isEmpty && placeholder && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-gray-500 select-none">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
