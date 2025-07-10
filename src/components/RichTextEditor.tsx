import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface RichTextEditorProps {
  initialValue?: string;
  onChange: (value: string) => void;
  onSave?: () => Promise<void>;
  placeholder?: string;
  lastSaved?: string;
}

const useEditorContent = (editor: any, content: string) => {
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue = '',
  onChange,
  onSave,
  placeholder = 'Enter your notes here...',
  lastSaved
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialValue,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          void onSave?.();
          return true;
        }
        return false;
      },
    },
  });

  useEditorContent(editor, initialValue);

  return (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#F98B3D] focus-within:border-transparent">
        <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap gap-2">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('strike') ? 'bg-gray-200' : ''}`}
            title="Strike"
          >
            <s>S</s>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Numbered List"
          >
            1.
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-gray-200 ${editor?.isActive('blockquote') ? 'bg-gray-200' : ''}`}
            title="Quote"
          >
            "
          </button>
        </div>
        <div className="p-4 min-h-[200px] prose prose-sm max-w-none">
          <EditorContent editor={editor} />
        </div>
      </div>
      {lastSaved && (
        <p className="mt-2 text-sm text-gray-500">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default RichTextEditor;