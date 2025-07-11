import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Quote, 
  Image as ImageIcon, 
  Table as TableIcon,
  CheckSquare,
  Link as LinkIcon,
  Highlighter,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Plus,
  Trash2
} from 'lucide-react';

// Configure lowlight for code highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';

// Create and configure lowlight instance for code highlighting
const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('html', html);

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
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md my-4',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300 my-4',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border border-gray-300',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-100 font-bold p-2',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#F98B3D] hover:text-[#e07a2c] underline',
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'bg-yellow-200 px-1 rounded',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-100 rounded-lg p-4 my-4 overflow-x-auto',
        },
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
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));
          
          imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result;
              if (typeof result === 'string') {
                editor?.chain().focus().setImage({ src: result }).run();
              }
            };
            reader.readAsDataURL(file);
          });
          
          return true;
        }
        return false;
      },
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setShowLinkDialog(true);
    // Keep editor focused while dialog is open
    setTimeout(() => editor.chain().focus().run(), 0);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  useEditorContent(editor, initialValue);

  // Toolbar button component for consistency
  const ToolbarButton = ({ onClick, isActive, title, children, className = '' }: {
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseDown={(e) => {
        // Prevent focus loss from editor
        e.preventDefault();
      }}
      className={`p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 transition-colors ${
        isActive ? 'bg-[#F98B3D] text-white hover:bg-[#e07a2c]' : 'bg-white'
      } ${className}`}
      title={title}
      type="button"
    >
      {children}
    </button>
  );

  return (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#F98B3D] focus-within:border-transparent">
        {/* Enhanced Toolbar */}
        <div className="border-b border-gray-200 bg-gray-50 p-2">
          {/* Text Formatting Row */}
          <div className="flex flex-wrap gap-1 mb-2">
            <ToolbarButton
              onClick={() => editor?.chain().focus().undo().run()}
              title="Undo (Ctrl+Z)"
            >
              <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              title="Redo (Ctrl+Y)"
            >
              <Redo size={16} />
            </ToolbarButton>
            
            <div className="border-l border-gray-300 mx-2" />
            
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor?.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor?.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor?.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={16} />
            </ToolbarButton>
            
            <div className="border-l border-gray-300 mx-2" />
            
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              isActive={editor?.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              isActive={editor?.isActive('highlight')}
              title="Highlight"
            >
              <Highlighter size={16} />
            </ToolbarButton>
          </div>

          {/* Lists and Blocks Row */}
          <div className="flex flex-wrap gap-1 mb-2">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList')}
              title="Bullet List"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              isActive={editor?.isActive('taskList')}
              title="Task List"
            >
              <CheckSquare size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              isActive={editor?.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              isActive={editor?.isActive('codeBlock')}
              title="Code Block"
            >
              <Code2 size={16} />
            </ToolbarButton>
          </div>

          {/* Advanced Features Row */}
          <div className="flex flex-wrap gap-1">
            <ToolbarButton
              onClick={addImage}
              title="Insert Image"
            >
              <ImageIcon size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={insertTable}
              title="Insert Table"
            >
              <TableIcon size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={addLink}
              isActive={editor?.isActive('link')}
              title="Add Link"
            >
              <LinkIcon size={16} />
            </ToolbarButton>
            
            {/* Table Controls (shown when in table) */}
            {editor?.isActive('table') && (
              <>
                <div className="border-l border-gray-300 mx-2" />
                <ToolbarButton
                  onClick={() => editor?.chain().focus().addRowBefore().run()}
                  title="Add Row Above"
                >
                  <Plus size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().addRowAfter().run()}
                  title="Add Row Below"
                >
                  <Plus size={16} />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().deleteRow().run()}
                  title="Delete Row"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </ToolbarButton>
              </>
            )}
          </div>
        </div>

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="border-b border-gray-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Enter URL..."
                className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                  }
                }}
              />
                             <button
                 onClick={(e) => {
                   e.preventDefault();
                   setLink();
                 }}
                 onMouseDown={(e) => e.preventDefault()}
                 className="px-3 py-1 bg-[#F98B3D] text-white rounded hover:bg-[#e07a2c] focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50"
               >
                 Set
               </button>
               <button
                 onClick={(e) => {
                   e.preventDefault();
                   setShowLinkDialog(false);
                   setLinkUrl('');
                   editor?.chain().focus().run();
                 }}
                 onMouseDown={(e) => e.preventDefault()}
                 className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
               >
                 Cancel
               </button>
            </div>
          </div>
        )}

        {/* Editor Content */}
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