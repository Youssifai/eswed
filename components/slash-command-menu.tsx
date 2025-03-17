"use client";

import { 
  Text, 
  Heading1, 
  Heading2, 
  Heading3, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  CheckSquare 
} from "lucide-react";
import { type Editor } from '@tiptap/react';
import { useEffect, useRef, useState, useCallback } from "react";

interface CommandOption {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
  shortcut?: string;
  keywords?: string[];
}

interface SlashCommandMenuProps {
  editor: Editor | null;
  onCommand: (callback: () => void) => void;
}

export function SlashCommandMenu({ editor, onCommand }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  
  if (!editor) return null;
  
  // Define all command options
  const allCommandOptions: CommandOption[] = [
    {
      icon: <Text className="h-4 w-4" />,
      label: "Text",
      description: "Plain text",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().run();
      },
      keywords: ["paragraph", "normal", "text", "plain"],
    },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: "Heading 1",
      description: "Large heading",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().setHeading({ level: 1 }).run();
      },
      shortcut: "h1",
      keywords: ["h1", "heading1", "title", "large"],
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: "Heading 2",
      description: "Medium heading",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().setHeading({ level: 2 }).run();
      },
      shortcut: "h2",
      keywords: ["h2", "heading2", "subtitle", "medium"],
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      label: "Heading 3",
      description: "Small heading",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().setHeading({ level: 3 }).run();
      },
      shortcut: "h3",
      keywords: ["h3", "heading3", "subheading", "small"],
    },
    {
      icon: <Bold className="h-4 w-4" />,
      label: "Bold",
      description: "Make text bold",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().toggleBold().run();
      },
      shortcut: "b",
      keywords: ["bold", "strong", "b", "thick"],
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: "Italic",
      description: "Make text italic",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().toggleItalic().run();
      },
      shortcut: "i",
      keywords: ["italic", "em", "i", "slant"],
    },
    {
      icon: <Underline className="h-4 w-4" />,
      label: "Underline",
      description: "Make text underlined",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().toggleUnderline().run();
      },
      shortcut: "u",
      keywords: ["underline", "u", "line"],
    },
    {
      icon: <List className="h-4 w-4" />,
      label: "Bullet List",
      description: "Create a bulleted list",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().toggleBulletList().run();
      },
      shortcut: "-",
      keywords: ["bullet", "list", "unordered", "ul"],
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: "Numbered List",
      description: "Create a numbered list",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().toggleOrderedList().run();
      },
      shortcut: "1.",
      keywords: ["number", "ordered", "ol", "numbered"],
    },
    {
      icon: <CheckSquare className="h-4 w-4" />,
      label: "To-Do List",
      description: "Create a to-do list",
      action: () => {
        // First delete the slash character at the current position
        const { selection } = editor.state;
        const pos = selection.from - 1;
        
        if (pos >= 0) {
          editor.commands.deleteRange({ from: pos, to: pos + 1 });
        }
        
        // Then apply the formatting
        editor.chain().focus().setParagraph().toggleTaskList().run();
      },
      shortcut: "[]",
      keywords: ["todo", "task", "checklist", "checkbox"],
    },
  ];

  // Filter command options based on input
  const filteredOptions = filterText.length > 0
    ? allCommandOptions.filter(option => {
        const searchText = filterText.toLowerCase();
        return (
          option.label.toLowerCase().includes(searchText) ||
          option.description.toLowerCase().includes(searchText) ||
          option.keywords?.some(keyword => keyword.toLowerCase().includes(searchText)) ||
          option.shortcut?.toLowerCase().includes(searchText)
        );
      })
    : allCommandOptions;

  // Reset selected index when filtered options change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredOptions.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (menuRef.current === null) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
      scrollIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      scrollIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedOption = filteredOptions[selectedIndex];
      if (selectedOption) {
        onCommand(selectedOption.action);
      }
    } else if (e.key === 'Escape') {
      // Close the menu
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
      onCommand(() => {});
    }
  }, [filteredOptions, selectedIndex, onCommand]);

  // Add keyboard event listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [handleKeyDown]);

  // Scroll selected item into view
  const scrollIntoView = useCallback(() => {
    const selectedElement = optionsRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Focus on input when menu is opened
  useEffect(() => {
    const menuElement = menuRef.current;
    const focusableElement = menuElement?.querySelector('[tabindex="0"]');
    
    if (focusableElement instanceof HTMLElement) {
      focusableElement.focus();
    }
    
    if (!mounted) {
      setMounted(true);
    }
    
    // Clean up
    return () => {
      if (menuRef.current) {
        // Clean up focus if needed
      }
    };
  }, [mounted]);

  return (
    <div 
      ref={menuRef}
      className="py-2 overflow-hidden rounded-md shadow-lg border border-border bg-background"
      tabIndex={0}
      aria-label="Slash command menu"
      role="menu"
      aria-activedescendant={filteredOptions.length > 0 ? `slash-command-${selectedIndex}` : undefined}
      style={{ maxHeight: '80vh' }}
    >
      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
        {filterText ? `Search: ${filterText}` : "Basic blocks"}
      </div>
      <div ref={optionsRef} className="max-h-[calc(80vh-40px)] overflow-y-auto">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => (
            <button
              key={option.label}
              id={`slash-command-${index}`}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted text-left ${
                selectedIndex === index ? "bg-muted" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCommand(option.action);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              role="menuitem"
              aria-selected={selectedIndex === index}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-md border bg-background">
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {option.shortcut && (
                    <kbd className="ml-auto text-xs text-muted-foreground">
                      {option.shortcut}
                    </kbd>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="px-2 py-4 text-sm text-center text-muted-foreground">
            No commands found for "{filterText}"
          </div>
        )}
      </div>
    </div>
  );
} 