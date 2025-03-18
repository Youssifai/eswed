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
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Extension } from "@tiptap/core";

type BriefEditorProps = {
  projectId: string;
  initialContent: string | null;
};

export default function TipTapBriefEditor({ projectId, initialContent }: BriefEditorProps) {
  const [content, setContent] = useState(initialContent || "<p>Add your brief details here...</p>");
  const [debouncedContent] = useDebounce(content, 1000);
  const [isSlashCommandOpen, setIsSlashCommandOpen] = useState(false);
  const [slashCommandRange, setSlashCommandRange] = useState<{ from: number; to: number } | null>(null);
  const [slashCommandQuery, setSlashCommandQuery] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Editor setup with extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // We'll use our own heading extension
        bulletList: {}, // Ensure bullet list is enabled
        orderedList: {}, // Ensure ordered list is enabled
      }),
      Underline,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'What are you working on?',
      }),
      CharacterCount.configure({
        limit: 30000,
      }),
      Extension.create({
        name: 'slashCommand',
        addKeyboardShortcuts() {
          return {
            Escape: () => {
              if (isSlashCommandOpen) {
                setIsSlashCommandOpen(false);
                return true;
              }
              return false;
            },
          };
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-neutral dark:prose-invert max-w-none focus:outline-none p-4',
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Handle Escape key to close the slash command menu
          if (event.key === 'Escape' && isSlashCommandOpen) {
            setIsSlashCommandOpen(false);
            return true;
          }
          
          // Check if typing "/" at the start of a line or after a space
          if (event.key === '/' && editor) {
            const { selection } = editor.state;
            const { empty, from } = selection;
            
            if (empty) {
              const textBefore = editor.state.doc.textBetween(
                Math.max(0, from - 1),
                from,
                '\n'
              );
              
              // Only activate if at line start or after a space
              if (from === 1 || textBefore === ' ' || textBefore === '\n') {
                setSlashCommandRange({ from, to: from });
                setSlashCommandQuery('');
                setIsSlashCommandOpen(true);
                return true;
              }
            }
          }
          
          // Track the query for filtering commands
          if (isSlashCommandOpen && editor && slashCommandRange) {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
              // Let the slash command menu handle these keys
              event.preventDefault();
              return true;
            }
            
            // Update the range and query as the user types
            setTimeout(() => {
              if (!editor) return;
              
              const { selection } = editor.state;
              const currentTextRange = { from: slashCommandRange.from, to: selection.from };
              
              // Get the text between the slash and the cursor
              let queryText = editor.state.doc.textBetween(
                currentTextRange.from,
                currentTextRange.to,
                '\n'
              );
              
              // Remove the initial slash if present
              if (queryText.startsWith('/')) {
                queryText = queryText.substring(1);
              }
              
              setSlashCommandQuery(queryText);
              setSlashCommandRange(currentTextRange);
              
              // Close the menu if the range becomes invalid or if text has a space
              if (currentTextRange.from >= currentTextRange.to || queryText.includes(' ')) {
                setIsSlashCommandOpen(false);
              }
            }, 0);
          }
          
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (editor) {
        const html = editor.getHTML();
        setContent(html);
      }
    },
    content: content,
    editable: true,
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
      setIsSlashCommandOpen(false);
    }
  }, [editor]);

  // Update slash menu position when it changes
  useEffect(() => {
    if (!isSlashCommandOpen || !editor) return;
    
    const { view } = editor;
    const { selection } = view.state;
    
    if (!selection) return;
    
    // Get the coordinates at cursor position
    const coords = view.coordsAtPos(selection.head);
    
    setSlashCommandRange({
      from: selection.from,
      to: selection.from,
    });
  }, [isSlashCommandOpen, editor]);

  // Handle keyboard events for slash menu navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSlashCommandOpen) return;
      
      if (e.key === 'Escape') {
        setIsSlashCommandOpen(false);
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlashCommandOpen]);
  
  // Close slash menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSlashCommandOpen && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setIsSlashCommandOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSlashCommandOpen]);
  
  return (
    <div className="w-full h-full flex flex-col bg-[#121212] rounded-md" ref={editorRef}>
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
            className="bg-[#252525] border border-neutral-800 rounded-md shadow-md p-1 flex items-center gap-1 max-w-[95vw]"
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('bold') ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('italic') ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('underline') ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('heading', { level: 1 }) ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('heading', { level: 2 }) ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('heading', { level: 3 }) ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('bulletList') ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('orderedList') ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive('taskList') ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Task List"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive({ textAlign: 'left' }) ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive({ textAlign: 'center' }) ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1 rounded hover:bg-[#1C1C1C] ${editor.isActive({ textAlign: 'right' }) ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300'}`}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </button>
          </BubbleMenu>
        )}
        
        {/* Slash command menu */}
        {editor && isSlashCommandOpen && slashCommandRange && (
          <div className="absolute z-50" style={{ 
            top: `${editor.view.coordsAtPos(slashCommandRange.from).top + 20}px`,
            left: `${editor.view.coordsAtPos(slashCommandRange.from).left}px`
          }}>
            <SlashCommandMenu
              editor={editor}
              query={slashCommandQuery}
              range={slashCommandRange}
              setMenuOpen={setIsSlashCommandOpen}
            />
          </div>
        )}
      </div>
    </div>
  );
} 