"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, useAnimation, Reorder } from "framer-motion";
import { useDebounce } from "use-debounce";
import InspirationToolbar from "./inspiration-toolbar";
import { updateInspirationData } from "@/actions/inspiration-actions";

interface CanvasItem {
  id: string;
  type: "text" | "image";
  content: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

interface InspirationCanvasProps {
  projectId: string;
  initialData: string;
}

// Tool types
type Tool = "move" | "text" | "image" | "sticky" | "comment" | "diagram";

// Add resize corner types
type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export default function InspirationCanvas({ projectId, initialData }: InspirationCanvasProps) {
  // Parse initial data or use empty canvas
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(() => {
    try {
      return initialData ? JSON.parse(initialData) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Canvas state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });
  const [selectedTool, setSelectedTool] = useState<Tool>("move");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [showImageHelp, setShowImageHelp] = useState(false);
  const [canvasCursor, setCanvasCursor] = useState<string>("default");
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  
  // Debounced canvas data for saving
  const [debouncedCanvasItems] = useDebounce(canvasItems, 1000);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Add state for selected items
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Add state for resize corner
  const [resizeCorner, setResizeCorner] = useState<ResizeCorner | null>(null);
  
  // Add a new state to track the original position when starting to drag an item
  const [dragStartItemPos, setDragStartItemPos] = useState<{ x: number, y: number } | null>(null);
  
  // Add state variables to track custom dragging
  const [customDragging, setCustomDragging] = useState(false);
  const [customDragId, setCustomDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Save canvas data when it changes
  useEffect(() => {
    const saveData = async () => {
      setIsSaving(true);
      try {
        const serializedData = JSON.stringify(debouncedCanvasItems);
        await updateInspirationData(projectId, serializedData);
      } catch (e) {
        console.error("Failed to save canvas data:", e);
      } finally {
        setIsSaving(false);
      }
    };
    
    saveData();
  }, [debouncedCanvasItems, projectId]);
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if currently editing text - don't trigger space+move when editing text
      const isEditingText = document.activeElement &&
                           (document.activeElement.getAttribute('contenteditable') === 'true' ||
                            document.activeElement.tagName === 'INPUT' ||
                            document.activeElement.tagName === 'TEXTAREA');

      if (e.code === "Space" && !spacePressed && !isEditingText) {
        e.preventDefault(); // Prevent default space bar behavior (scrolling)
        setSpacePressed(true);
        document.body.style.cursor = "grab";
        setCanvasCursor("grab");
        // Disable all interactions when space is pressed
        setSelectedItemId(null);
      }
      
      // Only handle tool shortcuts when space is not pressed and not editing text
      if (!spacePressed && !e.ctrlKey && !e.metaKey && !isEditingText) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setSelectedTool('move');
            break;
          case 't':
            setSelectedTool('text');
            break;
          case 'i':
            setSelectedTool('image');
            break;
        }
      }
      
      // Delete selected item on Backspace or Delete
      if ((e.key === "Backspace" || e.key === "Delete") && selectedItemId && !spacePressed && !isEditingText) {
        setCanvasItems(prev => prev.filter(item => item.id !== selectedItemId));
        setSelectedItemId(null);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Check if currently editing text - don't trigger space+move when editing text
      const isEditingText = document.activeElement &&
                           (document.activeElement.getAttribute('contenteditable') === 'true' ||
                            document.activeElement.tagName === 'INPUT' ||
                            document.activeElement.tagName === 'TEXTAREA');
                            
      if (e.code === "Space" && !isEditingText) {
        setSpacePressed(false);
        document.body.style.cursor = "default";
        setCanvasCursor("default");
        
        if (isDragging) {
          setIsDragging(false);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.body.style.cursor = "default";
      
      // Reset all pointer events when component unmounts
      const itemElements = document.querySelectorAll('.canvas-item');
      itemElements.forEach(el => {
        (el as HTMLElement).style.pointerEvents = 'auto';
      });
    };
  }, [spacePressed, isDragging, selectedItemId]);
  
  // Handle mouse events for canvas panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (spacePressed) {
      // Panning mode (space + drag)
      e.preventDefault();
      setIsDragging(true);
      setStartDragPos({ x: e.clientX, y: e.clientY });
      setCanvasCursor("grabbing");
      document.body.style.cursor = "grabbing";
      
      // Make sure no items are selected during panning
      setSelectedItemId(null);
      setSelectedItemIds(new Set());
    }
  };
  
  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (customDragging && customDragId) {
      e.preventDefault();
      
      // Get mouse position in canvas space
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      if (canvasBounds) {
        const mouseXInCanvas = (e.clientX - canvasBounds.left - position.x) / scale;
        const mouseYInCanvas = (e.clientY - canvasBounds.top - position.y) / scale;
        
        // Calculate the new position by subtracting the offset
        const newX = mouseXInCanvas - dragOffset.x;
        const newY = mouseYInCanvas - dragOffset.y;
        
        // Update the item position directly
        setCanvasItems(prev => prev.map(item => {
          if (item.id === customDragId) {
            return {
              ...item,
              position: { x: newX, y: newY }
            };
          }
          return item;
        }));
      }
    } else if (resizing && selectedItemId && resizeCorner) {
      e.preventDefault(); // Prevent any default behavior
      
      // Calculate the mouse movement in canvas coordinates (divide by scale)
      const dx = (e.clientX - resizeStartPos.x) / scale;
      const dy = (e.clientY - resizeStartPos.y) / scale;
      
      setCanvasItems(prev => prev.map(item => {
        if (item.id === selectedItemId) {
          // Get the initial values
          const initialWidth = resizeStartSize.width;
          const initialHeight = resizeStartSize.height;
          const initialX = item.position.x;
          const initialY = item.position.y;
          
          // Define variables for new position and size
          let newWidth, newHeight, newX, newY;
          
          // Calculate new values based on resize corner and mouse movement
          switch (resizeCorner) {
            case 'top-left':
              // Calculate new size
              newWidth = Math.max(50, initialWidth - dx);
              newHeight = Math.max(50, initialHeight - dy);
              
              // Calculate new position - maintain bottom-right corner position
              newX = initialX - (newWidth - initialWidth);
              newY = initialY - (newHeight - initialHeight);
              break;
              
            case 'top-right':
              // Calculate new size
              newWidth = Math.max(50, initialWidth + dx);
              newHeight = Math.max(50, initialHeight - dy);
              
              // Calculate new position - maintain bottom-left corner position
              newX = initialX;
              newY = initialY - (newHeight - initialHeight);
              break;
              
            case 'bottom-left':
              // Calculate new size
              newWidth = Math.max(50, initialWidth - dx);
              newHeight = Math.max(50, initialHeight + dy);
              
              // Calculate new position - maintain top-right corner position
              newX = initialX - (newWidth - initialWidth);
              newY = initialY;
              break;
              
            case 'bottom-right':
              // Calculate new size
              newWidth = Math.max(50, initialWidth + dx);
              newHeight = Math.max(50, initialHeight + dy);
              
              // Calculate new position - maintain top-left corner position
              newX = initialX;
              newY = initialY;
              break;
          }
          
          return {
            ...item,
            position: { x: newX, y: newY },
            size: { width: newWidth, height: newHeight }
          };
        }
        return item;
      }));
    } else if (isDragging && spacePressed) {
      const dx = e.clientX - startDragPos.x;
      const dy = e.clientY - startDragPos.y;
      
      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setStartDragPos({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (customDragging) {
      e.preventDefault();
      setCustomDragging(false);
      setCustomDragId(null);
    }
    
    if (isDragging || resizing) {
      e.preventDefault();
      
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = spacePressed ? "grab" : "default";
        setCanvasCursor(spacePressed ? "grab" : "default");
      }
      
      if (resizing) {
        setResizing(false);
        setResizeCorner(null);
        document.body.style.cursor = "default";
        setCanvasCursor("default");
      }
    }
  };
  
  // Handle zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.min(Math.max(0.5, scale + delta), 2.5);
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      if (canvasBounds) {
        const mouseXRelativeToCanvas = mouseX - canvasBounds.left;
        const mouseYRelativeToCanvas = mouseY - canvasBounds.top;
        
        const mouseXCanvasSpace = (mouseXRelativeToCanvas - position.x) / scale;
        const mouseYCanvasSpace = (mouseYRelativeToCanvas - position.y) / scale;
        
        const newPosition = {
          x: position.x - (mouseXCanvasSpace * (newScale - scale)),
          y: position.y - (mouseYCanvasSpace * (newScale - scale))
        };
        
        setPosition(newPosition);
      }
      
      setScale(newScale);
    } else {
      // Regular wheel scrolls the canvas vertically (no need to prevent default)
      if (!spacePressed) {
        setPosition(prev => ({
          x: prev.x,
          y: prev.y - e.deltaY
        }));
      }
    }
  };
  
  // Show image help text when image tool is selected
  useEffect(() => {
    setShowImageHelp(selectedTool === "image");
  }, [selectedTool]);
  
  // Add a new item to the canvas
  const addItem = (type: "text" | "image", position: { x: number, y: number }, content: string = "") => {
    const newItem: CanvasItem = {
      id: `item-${Date.now()}`,
      type,
      content,
      position: {
        x: type === "image" ? position.x - 100 : position.x - 75,
        y: type === "image" ? position.y - 100 : position.y - 12
      },
      size: type === "image" 
        ? { width: 200, height: 200 } 
        : { width: 150, height: 24 }
    };
    
    setCanvasItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };
  
  // Handle canvas click based on selected tool
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't process clicks when panning
    if (spacePressed || isDragging) return;
    
    if (!e.shiftKey) {
      setSelectedItemIds(new Set());
      setSelectedItemId(null);
    }
    
    if (selectedTool === "text") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = (e.clientX - rect.left - position.x) / scale;
        const clickY = (e.clientY - rect.top - position.y) / scale;
        addItem("text", { x: clickX, y: clickY }, "New text");
      }
    } else if (selectedTool === "move") {
      // Deselect when clicking on empty canvas with move tool (already handled above)
    }
  };
  
  // Handle item selection and movement
  const handleItemClick = (id: string, e: React.MouseEvent) => {
    // Don't process item clicks when panning
    if (spacePressed || isDragging) {
      e.stopPropagation();
      return;
    }
    
    e.stopPropagation();
    
    if (selectedTool === 'move') {
      if (e.shiftKey) {
        // Add to selection if shift is pressed
        setSelectedItemIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return newSet;
        });
      } else {
        // Single select if shift is not pressed
        setSelectedItemIds(new Set([id]));
      }
      setSelectedItemId(id);
    }
  };
  
  // Update text content
  const updateItemContent = (id: string, content: string) => {
    setCanvasItems(items => 
      items.map(item => 
        item.id === id ? { ...item, content } : item
      )
    );
  };

  // Start resize operation
  const startResize = (id: string, corner: ResizeCorner, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (selectedTool === "move") {
      const item = canvasItems.find(item => item.id === id);
      if (item) {
        setResizing(true);
        setResizeCorner(corner);
        setResizeStartPos({ x: e.clientX, y: e.clientY });
        setResizeStartSize(item.size || { width: 100, height: 100 });
      }
    }
  };
  
  // Handle drag start
  const handleDragStart = (id: string) => {
    // Find the item being dragged
    const item = canvasItems.find(item => item.id === id);
    if (item) {
      // Store the original position
      setDragStartItemPos(item.position);
    }
  };
  
  // Handle drag end
  const handleDragEnd = (id: string, info: { offset: { x: number, y: number } }) => {
    if (dragStartItemPos) {
      setCanvasItems(items =>
        items.map(item => {
          if (item.id === id) {
            // Calculate new position using the raw offset divided by scale
            // This ensures precise positioning without any snapping
            const newX = dragStartItemPos.x + (info.offset.x / scale);
            const newY = dragStartItemPos.y + (info.offset.y / scale);
            
            return {
              ...item,
              position: {
                x: newX,
                y: newY
              }
            };
          }
          return item;
        })
      );
      
      // Reset drag start position
      setDragStartItemPos(null);
    }
  };
  
  // Handle image drop or paste
  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          // Center the image in the viewport
          const centerX = (window.innerWidth / 2 - rect.left - position.x) / scale;
          const centerY = (window.innerHeight / 2 - rect.top - position.y) / scale;
          // Position is now based on center of the image
          const x = centerX - 100; // Half of default width
          const y = centerY - 100; // Half of default height
          addItem("image", { x, y }, e.target.result as string);
          setSelectedTool("move"); // Switch to move tool after adding image
        }
      }
    };
    reader.readAsDataURL(file);
  }, [position, scale]);
  
  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) handleImageUpload(file);
          }
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]);
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.match('image.*')) {
        handleImageUpload(file);
      }
    }
  }, [handleImageUpload]);
  
  // Prevent default for drag over to allow dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Fix the space+hover issue by capturing all mouse events when space is pressed
  useEffect(() => {
    // Apply a transparent overlay when space is pressed to prevent interactions with items
    if (spacePressed) {
      // Disable pointer events on items during panning
      const itemElements = document.querySelectorAll('.canvas-item');
      itemElements.forEach(el => {
        (el as HTMLElement).style.pointerEvents = 'none';
      });
    } else {
      // Re-enable pointer events when not panning
      const itemElements = document.querySelectorAll('.canvas-item');
      itemElements.forEach(el => {
        (el as HTMLElement).style.pointerEvents = 'auto';
      });
    }
  }, [spacePressed]);
  
  // Implement custom mouse down handler for elements
  const handleItemMouseDown = (id: string, e: React.MouseEvent) => {
    // Only handle if the tool is move and we're not in space pressed mode
    if (selectedTool === 'move' && !spacePressed) {
      e.stopPropagation();
      
      // Find the item being dragged
      const item = canvasItems.find(item => item.id === id);
      if (item) {
        // Calculate the offset between mouse position and item top-left position
        const canvasBounds = canvasRef.current?.getBoundingClientRect();
        if (canvasBounds) {
          const mouseXInCanvas = (e.clientX - canvasBounds.left - position.x) / scale;
          const mouseYInCanvas = (e.clientY - canvasBounds.top - position.y) / scale;
          
          setDragOffset({
            x: mouseXInCanvas - item.position.x,
            y: mouseYInCanvas - item.position.y
          });
          
          setCustomDragging(true);
          setCustomDragId(id);
          setSelectedItemId(id);
        }
      }
    }
  };
  
  return (
    <div className="h-full w-full overflow-hidden">
      {/* The toolbar is fixed positioned so we don't need a container for it */}
      <InspirationToolbar 
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
      />
        
      {/* Canvas */}
      <div 
        className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden"
        style={{ cursor: canvasCursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        ref={canvasRef}
      >
        {/* Grid background with pan and zoom */}
        <motion.div
          className="absolute inset-0"
          style={{ 
            backgroundColor: '#121212',
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${position.x}px ${position.y}px`,
          }}
        >
          <motion.div 
            style={{ 
              x: position.x, 
              y: position.y,
              scale,
              transformOrigin: '0 0' 
            }}
            className="absolute"
          >
            {/* Render canvas items */}
            {canvasItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  boxShadow: selectedItemId === item.id ? '0 0 0 2px #3b82f6' : 'none'
                }}
                transition={{ 
                  boxShadow: { duration: 0.1 } 
                }}
                className={`absolute canvas-item ${selectedItemId === item.id ? '' : ''}`}
                style={{ 
                  left: item.position.x, 
                  top: item.position.y,
                  cursor: selectedTool === 'move' && !spacePressed ? 'move' : 'default',
                  zIndex: selectedItemId === item.id ? 10 : 1,
                  width: item.size?.width || 'auto',
                  height: item.size?.height || 'auto',
                  touchAction: 'none',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  padding: 0,
                  margin: 0,
                  pointerEvents: spacePressed ? 'none' : 'auto',
                  transition: 'box-shadow 0.1s ease-in-out'
                }}
                drag={false}
                onMouseDown={(e) => handleItemMouseDown(item.id, e)}
                onClick={(e) => handleItemClick(item.id, e)}
              >
                {item.type === 'text' ? (
                  <>
                    <div 
                      contentEditable={selectedTool === 'text' && selectedItemId === item.id}
                      className="min-w-[50px] bg-transparent outline-none"
                      style={{
                        width: item.size?.width || 'auto',
                        height: item.size?.height || 'auto',
                        minHeight: '24px',
                        padding: '0',
                        margin: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        lineHeight: '1.2',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => updateItemContent(item.id, e.currentTarget.textContent || '')}
                    >
                      {item.content}
                    </div>
                    {/* Resize handles - show for both text and images when selected */}
                    {selectedItemId === item.id && selectedTool === 'move' && (
                      <>
                        <div 
                          className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-nw-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'top-left', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div 
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-ne-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'top-right', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div 
                          className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-sw-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'bottom-left', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div 
                          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-se-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'bottom-right', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                      </>
                    )}
                  </>
                ) : item.type === 'image' ? (
                  <>
                    <img 
                      src={item.content} 
                      alt="Canvas item" 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: 0,
                        margin: 0
                      }}
                      draggable={false}
                    />
                    {/* Resize handle - only shown when item is selected */}
                    {selectedItemId === item.id && selectedTool === 'move' && (
                      <>
                        <div 
                          className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-nw-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'top-left', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div 
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-ne-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'top-right', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div 
                          className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-sw-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'bottom-left', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div 
                          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-blue-500 rounded-sm cursor-se-resize flex items-center justify-center"
                          onMouseDown={(e) => startResize(item.id, 'bottom-right', e)}
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        
        {/* Help overlay for image tool */}
        {showImageHelp && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="bg-background rounded-md p-4 shadow-lg text-center">
              <p className="text-lg font-semibold">Drag and drop image in the canvas</p>
              <p className="text-sm text-muted-foreground mt-1">or paste from clipboard</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 