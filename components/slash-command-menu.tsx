"use client";

import { 
  Text, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, useCallback } from "react";

interface CommandOption {
  icon: React.ReactNode;
  label: string;
  action: (editor: Editor) => void;
}

interface SlashCommandMenuProps {
  editor: Editor;
  query: string;
  range: { from: number; to: number };
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Define command options
const commandOptions: CommandOption[] = [
  {
    icon: <Text className="h-3.5 w-3.5" />,
    label: "Plain Text",
    action: (editor: Editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    icon: <Bold className="h-3.5 w-3.5" />,
    label: "Bold",
    action: (editor: Editor) => {
      editor.chain().focus().toggleBold().run();
    },
  },
  {
    icon: <Italic className="h-3.5 w-3.5" />,
    label: "Italic",
    action: (editor: Editor) => {
      editor.chain().focus().toggleItalic().run();
    },
  },
  {
    icon: <Underline className="h-3.5 w-3.5" />,
    label: "Underline",
    action: (editor: Editor) => {
      editor.chain().focus().toggleUnderline().run();
    },
  },
  {
    icon: <Heading1 className="h-3.5 w-3.5" />,
    label: "Heading 1",
    action: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    icon: <Heading2 className="h-3.5 w-3.5" />,
    label: "Heading 2",
    action: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    icon: <Heading3 className="h-3.5 w-3.5" />,
    label: "Heading 3",
    action: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    icon: <List className="h-3.5 w-3.5" />,
    label: "Bullet List",
    action: (editor: Editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    icon: <ListOrdered className="h-3.5 w-3.5" />,
    label: "Numbered List",
    action: (editor: Editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    icon: <CheckSquare className="h-3.5 w-3.5" />,
    label: "Task List",
    action: (editor: Editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    icon: <AlignLeft className="h-3.5 w-3.5" />,
    label: "Align Left",
    action: (editor: Editor) => {
      editor.chain().focus().setTextAlign('left').run();
    },
  },
  {
    icon: <AlignCenter className="h-3.5 w-3.5" />,
    label: "Align Center",
    action: (editor: Editor) => {
      editor.chain().focus().setTextAlign('center').run();
    },
  },
  {
    icon: <AlignRight className="h-3.5 w-3.5" />,
    label: "Align Right",
    action: (editor: Editor) => {
      editor.chain().focus().setTextAlign('right').run();
    },
  },
];

export function SlashCommandMenu({
  editor,
  query,
  range,
  setMenuOpen,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const filteredItems = query
    ? commandOptions.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : commandOptions;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((selectedIndex + 1) % filteredItems.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        selectedIndex === 0 ? filteredItems.length - 1 : selectedIndex - 1
      );
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectItem(filteredItems[selectedIndex]);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMenuOpen(false);
    }
  };

  const selectItem = (item: CommandOption) => {
    // Delete the slash or whatever triggered the command
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .run();

    // Perform the command
    item.action(editor);
    setMenuOpen(false);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <div 
      className="bg-[#252525] border border-neutral-800 rounded-md shadow-md p-1 flex items-center gap-1 overflow-x-auto max-w-[90vw]"
      onKeyDown={onKeyDown}
    >
      {filteredItems.map((item: CommandOption, index: number) => (
        <button
          key={index}
          onClick={() => selectItem(item)}
          className={`p-1 rounded flex items-center whitespace-nowrap ${
            index === selectedIndex ? 'bg-[#1C1C1C] text-white' : 'text-neutral-300 hover:bg-[#1C1C1C]'
          }`}
        >
          <div className="w-5 h-5 mr-1 flex items-center justify-center">
            {item.icon}
          </div>
          {item.label}
        </button>
      ))}
    </div>
  );
} 