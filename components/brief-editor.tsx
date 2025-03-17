"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { updateBriefContent } from "@/actions/brief-actions";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, X } from "lucide-react";
import CommandPopup from "./command-popup";

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
  
  // Command popup state
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const [commandPopupPosition, setCommandPopupPosition] = useState({ top: 0, left: 0 });
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  
  // Check for "/" key to show command popup
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "/") {
      e.preventDefault();
      
      // Get cursor position for popup placement
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart;
        setSlashIndex(cursorPos);
        
        // Calculate position for popup (below the cursor)
        const cursorCoords = getCaretCoordinates(textarea, cursorPos);
        setCommandPopupPosition({
          top: cursorCoords.top + 20, // Below cursor
          left: cursorCoords.left
        });
        
        // Update content with the slash and update search query
        const newContent = content.substring(0, cursorPos) + "/" + content.substring(cursorPos);
        setContent(newContent);
        setCommandSearchQuery("/");
        setShowCommandPopup(true);
      }
    } else if (showCommandPopup) {
      // Update command search query as user types after "/"
      if (e.key === "Escape") {
        setShowCommandPopup(false);
      } else if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Enter") {
        const textarea = textareaRef.current;
        if (textarea && slashIndex !== null) {
          // Let the input update normally, then update the search query
          setTimeout(() => {
            const currentPos = textarea.selectionStart;
            const query = content.substring(slashIndex, currentPos);
            setCommandSearchQuery(query);
          }, 0);
        }
      }
    }
  };
  
  // Helper function to get caret coordinates in the textarea
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    // Create a mirror div to measure where the caret is
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(element);
    
    // Copy styles to ensure accurate measurement
    mirror.style.cssText = 'position: absolute; top: 0; left: 0; visibility: hidden; overflow: hidden; white-space: pre-wrap; word-wrap: break-word;';
    Array.from(style).forEach(key => {
      // @ts-ignore - style properties are valid
      mirror.style[key] = style[key];
    });
    
    // Set content up to caret position
    mirror.textContent = element.value.substring(0, position);
    
    // Add a span at caret position
    const span = document.createElement('span');
    span.textContent = '.';
    mirror.appendChild(span);
    
    document.body.appendChild(mirror);
    const rect = span.getBoundingClientRect();
    document.body.removeChild(mirror);
    
    // Calculate position relative to the textarea
    const textareaRect = element.getBoundingClientRect();
    return {
      top: rect.top - textareaRect.top + element.scrollTop,
      left: rect.left - textareaRect.left + element.scrollLeft
    };
  };
  
  // Apply formatting to selected text or at cursor position
  const applyFormatting = (format: Partial<TextFormatting>) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      
      // Update the formatting state
      setFormatting({ ...formatting, ...format });
      
      // Set focus back to the textarea
      textarea.focus();
    }
  };
  
  // Handle command selection
  const handleCommandSelect = (commandId: string, params?: any) => {
    const textarea = textareaRef.current;
    if (textarea && slashIndex !== null) {
      const currentPos = textarea.selectionStart;
      
      // Remove the slash command text
      let newContent = content.substring(0, slashIndex) + content.substring(currentPos);
      let cursorPosition = slashIndex;
      
      // Apply the command formatting based on the command selected
      switch (commandId) {
        case "heading1":
          // Apply heading 1 style
          setFormatting(prev => ({ 
            ...prev, 
            fontSize: "28px", 
            bold: true 
          }));
          break;
        case "heading2":
          // Apply heading 2 style
          setFormatting(prev => ({ 
            ...prev, 
            fontSize: "24px", 
            bold: true 
          }));
          break;
        case "heading3":
          // Apply heading 3 style
          setFormatting(prev => ({ 
            ...prev, 
            fontSize: "20px", 
            bold: true 
          }));
          break;
        case "paragraph":
          // Reset to paragraph style
          setFormatting(prev => ({ 
            ...prev, 
            fontSize: "16px", 
            bold: false,
            italic: false,
            underline: false,
            align: 'left'
          }));
          break;
        case "bold":
          // Toggle bold formatting
          setFormatting(prev => ({ ...prev, bold: !prev.bold }));
          break;
        case "italic":
          // Toggle italic formatting
          setFormatting(prev => ({ ...prev, italic: !prev.italic }));
          break;
        case "underline":
          // Toggle underline formatting
          setFormatting(prev => ({ ...prev, underline: !prev.underline }));
          break;
        case "fontSize":
          // Apply font size
          setFormatting(prev => ({ ...prev, fontSize: params || "16px" }));
          break;
        case "textAlign":
          // Apply text alignment
          setFormatting(prev => ({ ...prev, align: params || "left" }));
          break;
      }
      
      // Update content and focus back on the textarea
      setContent(newContent);
      
      // Reset command popup state
      setShowCommandPopup(false);
      setSlashIndex(null);
      setCommandSearchQuery("");
      
      // Focus back on textarea and set cursor position
      textarea.focus();
      setTimeout(() => {
        textarea.selectionStart = cursorPosition;
        textarea.selectionEnd = cursorPosition;
      }, 0);
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
      
      {/* Format button to open toolbar */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setShowToolbar(prev => !prev)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#292929] hover:bg-[#3A3A3A] text-sm text-white/70"
        >
          <span>Format</span>
          {showToolbar ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      
      {/* Formatting toolbar - only show when button is clicked */}
      {showToolbar && (
        <div className="absolute top-12 left-4 bg-[#1E1E1E] rounded-md p-2 flex items-center gap-2 z-10 border border-[#4A4A4A] shadow-lg">
          {/* Font size dropdown */}
          <select 
            className="bg-[#292929] text-white px-2 py-1 rounded text-sm border-none outline-none"
            onChange={(e) => handleFontSizeChange(e.target.value)}
            value={formatting.fontSize}
          >
            <option value="16px">16px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="28px">28px</option>
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

      {/* Command popup - show when slash is typed */}
      {showCommandPopup && (
        <CommandPopup
          position={commandPopupPosition}
          searchQuery={commandSearchQuery}
          onClose={() => setShowCommandPopup(false)}
          onSelect={handleCommandSelect}
        />
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
          style={{
            fontWeight: formatting.bold ? 'bold' : 'normal',
            fontStyle: formatting.italic ? 'italic' : 'normal',
            textDecoration: formatting.underline ? 'underline' : 'none',
            fontSize: formatting.fontSize,
            textAlign: formatting.align,
          }}
        />
      </div>
    </div>
  );
}