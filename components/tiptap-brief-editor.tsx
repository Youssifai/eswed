"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from '@tiptap/extension-text-align';
import { useDebounce } from "use-debounce";
import { updateBriefContent } from "@/actions/brief-actions";
import { 
  Bold,
  Italic, 
  Underline as UnderlineIcon, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { SlashCommandMenu } from "./slash-command-menu";

type BriefEditorProps = {
  projectId: string;
  initialContent: string | null;
};

export default function TipTapBriefEditor({ projectId, initialContent }: BriefEditorProps) {
  const [content, setContent] = useState(initialContent || "<p>Add your brief details here...</p>");
  const [debouncedContent] = useDebounce(content, 1000);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Editor setup with extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // We'll add our own heading extension
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-4',
          },
        },
      }),
      Underline,
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: 'font-bold',
          1: { class: 'text-3xl my-4' },
          2: { class: 'text-2xl my-3' },
          3: { class: 'text-xl my-2' },
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
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      // Handle slash commands
      const { from } = editor.state.selection;
      const currentPosition = from;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, currentPosition - 10),
        currentPosition
      );
      
      // Check if the last character typed is a slash
      if (textBefore.endsWith('/')) {
        // Get position for slash menu
        const coords = editor.view.coordsAtPos(from);
        setSlashMenuPosition({
          top: coords.bottom + window.scrollY,
          left: coords.left + window.scrollX,
        });
        setShowSlashMenu(true);
      } else if (showSlashMenu && !textBefore.includes('/')) {
        // Hide menu if user continues typing something else
        setShowSlashMenu(false);
      }
    },
    editorProps: {
      attributes: {
        class: 'outline-none w-full h-full p-4 prose prose-invert max-w-none',
      },
    },
  });
  
  // Save content when it changes
  useEffect(() => {
    const saveContent = async () => {
      if (debouncedContent === initialContent) return;
      
      try {
        await updateBriefContent(projectId, debouncedContent);
        console.log("Brief content saved successfully");
      } catch (error) {
        console.error("Failed to save brief content:", error);
      }
    };
    
    saveContent();
  }, [debouncedContent, initialContent, projectId]);
  
  // Handle slash command selection
  const handleSlashCommand = useCallback((action: () => void) => {
    if (editor) {
      action();
      setShowSlashMenu(false);
    }
  }, [editor]);

  // Handle keyboard events for slash menu navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSlashMenu) return;
      
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSlashMenu]);
  
  // Close slash menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSlashMenu && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSlashMenu]);
  
  return (
    <div className="w-full h-full flex flex-col" ref={editorRef}>
      <div className="flex-1 overflow-auto">
        {/* The main editor */}
        <EditorContent 
          editor={editor} 
          className="h-full focus:outline-none" 
        />
        
        {/* Bubble menu shown when text is selected */}
        {editor && (
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100 }}
            className="bg-background border rounded-md shadow-md p-1 flex items-center gap-1"
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('bold') ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('italic') ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('underline') ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('heading', { level: 1 }) ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('heading', { level: 2 }) ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('heading', { level: 3 }) ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('bulletList') ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('orderedList') ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive('taskList') ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Task List"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1 rounded hover:bg-neutral-800 ${editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-800 text-white' : 'text-neutral-300'}`}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </button>
          </BubbleMenu>
        )}
        
        {/* Slash command menu */}
        {editor && showSlashMenu && (
          <div 
            style={{ 
              position: 'absolute', 
              top: slashMenuPosition.top + 'px', 
              left: slashMenuPosition.left + 'px',
              zIndex: 50 
            }}
            className="bg-background border border-neutral-800 rounded-md shadow-lg overflow-hidden"
          >
            <SlashCommandMenu editor={editor} onCommand={handleSlashCommand} />
          </div>
        )}
      </div>
    </div>
  );
} 