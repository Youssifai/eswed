"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { updateBriefContent } from "@/actions/brief-actions";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, X } from "lucide-react";

type BriefEditorProps = {
  projectId: string;
  initialContent: string | null;
};

type TextFormatting = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  fontSize: string;
  align: 'left' | 'center' | 'right';
};

export default function BriefEditor({ projectId, initialContent }: BriefEditorProps) {
  const [content, setContent] = useState(initialContent || "");
  const [debouncedContent] = useDebounce(content, 1000);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [formatting, setFormatting] = useState<TextFormatting>({
    bold: false,
    italic: false,
    underline: false,
    color: "#FFFFFF",
    fontSize: "18px",
    align: 'left'
  });
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  
  // Check for "/" key to show the toolbar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "/" && !showToolbar) {
      e.preventDefault();
      setShowToolbar(true);
    }
  };
  
  // Apply formatting to selected text or at cursor position
  const applyFormatting = (format: Partial<TextFormatting>) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const selectedText = content.substring(selectionStart, selectionEnd);
      
      let formattedText = selectedText;
      let newContent = content;
      
      // Apply the formatting based on the format type
      if (format.bold !== undefined) {
        formattedText = format.bold ? `**${selectedText}**` : selectedText;
      } else if (format.italic !== undefined) {
        formattedText = format.italic ? `*${selectedText}*` : selectedText;
      } else if (format.underline !== undefined) {
        formattedText = format.underline ? `_${selectedText}_` : selectedText;
      } else if (format.color !== undefined) {
        // We'd use a proper markdown syntax for color if needed
        formattedText = `<span style="color:${format.color}">${selectedText}</span>`;
      } else if (format.fontSize !== undefined) {
        // Font size (simulating headers)
        if (format.fontSize === "24px") { // H1
          formattedText = `# ${selectedText}`;
        } else if (format.fontSize === "20px") { // H2
          formattedText = `## ${selectedText}`;
        } else if (format.fontSize === "18px") { // H3
          formattedText = `### ${selectedText}`;
        }
      } else if (format.align !== undefined) {
        // Text alignment
        if (format.align === 'center') {
          formattedText = `<div style="text-align:center">${selectedText}</div>`;
        } else if (format.align === 'right') {
          formattedText = `<div style="text-align:right">${selectedText}</div>`;
        }
      }
      
      // Replace the selected text with the formatted text
      newContent = 
        content.substring(0, selectionStart) + 
        formattedText + 
        content.substring(selectionEnd);
      
      setContent(newContent);
      setFormatting({ ...formatting, ...format });
    }
  };
  
  // Handle color change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    applyFormatting({ color: newColor });
  };
  
  // Handle font size change (h1, h2, h3)
  const handleFontSizeChange = (size: string) => {
    applyFormatting({ fontSize: size });
  };

  useEffect(() => {
    const saveContent = async () => {
      if (debouncedContent !== initialContent) {
        setIsSaving(true);
        try {
          await updateBriefContent(projectId, debouncedContent);
          setLastSaved(new Date());
        } catch (error) {
          console.error("Failed to save brief content:", error);
        } finally {
          setIsSaving(false);
        }
      }
    };

    saveContent();
  }, [debouncedContent, initialContent, projectId]);

  return (
    <div className="relative h-full">
      {/* Status indicator */}
      <div className="absolute top-4 right-4 text-sm text-white/50">
        {isSaving ? (
          "Saving..."
        ) : lastSaved ? (
          `Last saved ${lastSaved.toLocaleTimeString()}`
        ) : null}
      </div>
      
      {/* Formatting toolbar */}
      {showToolbar && (
        <div className="absolute top-0 left-0 right-0 bg-[#1E1E1E] rounded-md p-2 flex items-center gap-2 z-10 border border-[#4A4A4A]">
          {/* Font size dropdown */}
          <select 
            className="bg-[#292929] text-white px-2 py-1 rounded text-sm border-none outline-none"
            onChange={(e) => handleFontSizeChange(e.target.value)}
            value={formatting.fontSize}
          >
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
          </select>
          
          {/* Color picker */}
          <div className="relative">
            <input 
              type="color" 
              ref={colorPickerRef}
              value={formatting.color}
              onChange={handleColorChange}
              className="w-6 h-6 rounded-full cursor-pointer appearance-none bg-transparent border border-[#4A4A4A] p-0 overflow-hidden"
              style={{ backgroundColor: formatting.color }}
            />
          </div>
          
          {/* Bold button */}
          <button 
            onClick={() => applyFormatting({ bold: !formatting.bold })}
            className={`p-1 rounded ${formatting.bold ? 'bg-[#292929]' : ''}`}
          >
            <Bold size={18} />
          </button>
          
          {/* Italic button */}
          <button 
            onClick={() => applyFormatting({ italic: !formatting.italic })}
            className={`p-1 rounded ${formatting.italic ? 'bg-[#292929]' : ''}`}
          >
            <Italic size={18} />
          </button>
          
          {/* Underline button */}
          <button 
            onClick={() => applyFormatting({ underline: !formatting.underline })}
            className={`p-1 rounded ${formatting.underline ? 'bg-[#292929]' : ''}`}
          >
            <Underline size={18} />
          </button>
          
          <div className="h-5 w-[1px] bg-[#4A4A4A] mx-1"></div>
          
          {/* Text alignment */}
          <button 
            onClick={() => applyFormatting({ align: 'left' })}
            className={`p-1 rounded ${formatting.align === 'left' ? 'bg-[#292929]' : ''}`}
          >
            <AlignLeft size={18} />
          </button>
          
          <button 
            onClick={() => applyFormatting({ align: 'center' })}
            className={`p-1 rounded ${formatting.align === 'center' ? 'bg-[#292929]' : ''}`}
          >
            <AlignCenter size={18} />
          </button>
          
          <button 
            onClick={() => applyFormatting({ align: 'right' })}
            className={`p-1 rounded ${formatting.align === 'right' ? 'bg-[#292929]' : ''}`}
          >
            <AlignRight size={18} />
          </button>
          
          <div className="flex-1"></div>
          
          {/* Close button */}
          <button 
            onClick={() => setShowToolbar(false)}
            className="p-1 rounded hover:bg-[#292929]"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Text editor */}
      <div className="max-h-[calc(100vh-350px)] overflow-y-auto hide-scrollbar">
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent border-0 outline-none resize-none text-white p-0 focus:ring-0 placeholder:text-white/30"
          placeholder="Write, or press '/' for commands..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={20}
        />
      </div>
    </div>
  );
} 