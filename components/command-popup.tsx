"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Heading1, Heading2, Heading3, Pilcrow, ChevronRight, AlignJustify
} from "lucide-react";

export type CommandOption = {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  subCommands?: CommandOption[];
};

type CommandPopupProps = {
  position: { top: number; left: number };
  searchQuery: string;
  onClose: () => void;
  onSelect: (commandId: string, params?: any) => void;
};

export default function CommandPopup({ 
  position, 
  searchQuery, 
  onClose,
  onSelect
}: CommandPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<CommandOption[]>([]);
  const [showSubCommands, setShowSubCommands] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Define all available commands
  const allCommands: CommandOption[] = [
    {
      id: "heading1",
      label: "Heading 1",
      icon: <Heading1 size={18} />,
      shortcut: "h1",
      action: () => onSelect("heading1"),
    },
    {
      id: "heading2",
      label: "Heading 2",
      icon: <Heading2 size={18} />,
      shortcut: "h2",
      action: () => onSelect("heading2"),
    },
    {
      id: "heading3",
      label: "Heading 3",
      icon: <Heading3 size={18} />,
      shortcut: "h3",
      action: () => onSelect("heading3"),
    },
    {
      id: "paragraph",
      label: "Paragraph",
      icon: <Pilcrow size={18} />,
      shortcut: "p",
      action: () => onSelect("paragraph"),
    },
    {
      id: "bold",
      label: "Bold",
      icon: <Bold size={18} />,
      shortcut: "⌘+B",
      action: () => onSelect("bold"),
    },
    {
      id: "italic",
      label: "Italic",
      icon: <Italic size={18} />,
      shortcut: "⌘+I",
      action: () => onSelect("italic"),
    },
    {
      id: "underline",
      label: "Underline",
      icon: <Underline size={18} />,
      shortcut: "⌘+U",
      action: () => onSelect("underline"),
    },
    {
      id: "fontSize",
      label: "Font Size",
      icon: <span className="text-sm font-bold">A</span>,
      action: () => setShowSubCommands("fontSize"),
      subCommands: [
        {
          id: "fontSize_12",
          label: "12px",
          icon: <span className="text-xs">A</span>,
          action: () => onSelect("fontSize", "12px"),
        },
        {
          id: "fontSize_14",
          label: "14px",
          icon: <span className="text-sm">A</span>,
          action: () => onSelect("fontSize", "14px"),
        },
        {
          id: "fontSize_16",
          label: "16px",
          icon: <span className="text-base">A</span>,
          action: () => onSelect("fontSize", "16px"),
        },
        {
          id: "fontSize_18",
          label: "18px",
          icon: <span className="text-lg">A</span>,
          action: () => onSelect("fontSize", "18px"),
        },
      ],
    },
    {
      id: "textAlign",
      label: "Text Alignment",
      icon: <AlignLeft size={18} />,
      action: () => setShowSubCommands("textAlign"),
      subCommands: [
        {
          id: "align_left",
          label: "Left",
          icon: <AlignLeft size={18} />,
          action: () => onSelect("textAlign", "left"),
        },
        {
          id: "align_center",
          label: "Center",
          icon: <AlignCenter size={18} />,
          action: () => onSelect("textAlign", "center"),
        },
        {
          id: "align_right",
          label: "Right",
          icon: <AlignRight size={18} />,
          action: () => onSelect("textAlign", "right"),
        },
        {
          id: "align_justify",
          label: "Justify",
          icon: <AlignJustify size={18} />,
          action: () => onSelect("textAlign", "justify"),
        },
      ],
    },
  ];

  // Filter commands based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase().replace("/", "");
    if (query === "") {
      setFilteredCommands(allCommands);
    } else {
      const filtered = allCommands.filter(cmd => 
        cmd.label.toLowerCase().includes(query) || 
        cmd.id.toLowerCase().includes(query) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(query))
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
    setShowSubCommands(null);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubCommands) {
        const parentCommand = allCommands.find(cmd => cmd.id === showSubCommands);
        const subCommands = parentCommand?.subCommands || [];
        
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : subCommands.length - 1));
            break;
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex(prev => (prev < subCommands.length - 1 ? prev + 1 : 0));
            break;
          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < subCommands.length) {
              subCommands[selectedIndex].action();
              onClose();
            }
            break;
          case "Escape":
            e.preventDefault();
            setShowSubCommands(null);
            break;
          case "Backspace":
            if (searchQuery === "/") {
              setShowSubCommands(null);
            }
            break;
        }
      } else {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
            break;
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
            break;
          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filteredCommands.length) {
              filteredCommands[selectedIndex].action();
              if (!filteredCommands[selectedIndex].subCommands) {
                onClose();
              }
            }
            break;
          case "Escape":
            e.preventDefault();
            onClose();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, selectedIndex, onClose, showSubCommands, searchQuery]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // If no commands match, show a message
  if (filteredCommands.length === 0) {
    return (
      <div 
        ref={popupRef}
        className="absolute z-50 bg-[#121212] rounded-md shadow-lg border border-[#4A4A4A] w-64 overflow-hidden"
        style={{ top: position.top, left: position.left }}
      >
        <div className="p-2 text-sm text-gray-400">
          No commands match "{searchQuery.replace('/', '')}"
        </div>
      </div>
    );
  }

  // Render sub-commands if a parent command is selected
  if (showSubCommands) {
    const parentCommand = allCommands.find(cmd => cmd.id === showSubCommands);
    const subCommands = parentCommand?.subCommands || [];

    return (
      <div 
        ref={popupRef}
        className="absolute z-50 bg-[#121212] rounded-md shadow-lg border border-[#4A4A4A] w-64 overflow-hidden"
        style={{ top: position.top, left: position.left }}
      >
        <div className="p-2 flex items-center gap-2 border-b border-[#4A4A4A] text-gray-300">
          <button 
            onClick={() => setShowSubCommands(null)}
            className="p-1 rounded hover:bg-[#292929]"
          >
            <ChevronRight className="rotate-180" size={16} />
          </button>
          <span>{parentCommand?.label}</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {subCommands.map((command, index) => (
            <div 
              key={command.id}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
                index === selectedIndex ? "bg-[#2A2A2A]" : "hover:bg-[#1D1D1D]"
              }`}
              onClick={() => {
                command.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{command.icon}</span>
                <span className="text-sm">{command.label}</span>
              </div>
              {command.shortcut && (
                <span className="text-xs text-gray-500">{command.shortcut}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render main command list
  return (
    <div 
      ref={popupRef}
      className="absolute z-50 bg-[#121212] rounded-md shadow-lg border border-[#4A4A4A] min-w-64 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="max-h-72 overflow-y-auto">
        {filteredCommands.map((command, index) => (
          <div 
            key={command.id}
            className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
              index === selectedIndex ? "bg-[#2A2A2A]" : "hover:bg-[#1D1D1D]"
            }`}
            onClick={() => {
              command.action();
              if (!command.subCommands) {
                onClose();
              }
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{command.icon}</span>
              <span className="text-sm">{command.label}</span>
            </div>
            <div className="flex items-center">
              {command.shortcut && (
                <span className="text-xs text-gray-500 mr-2">{command.shortcut}</span>
              )}
              {command.subCommands && (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 