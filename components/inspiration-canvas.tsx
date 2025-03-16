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
      if (e.code === "Space" && !spacePressed) {
        setSpacePressed(true);
        document.body.style.cursor = "grab";
        setCanvasCursor("grab");
      }
      
      // Delete selected item on Backspace or Delete
      if ((e.key === "Backspace" || e.key === "Delete") && selectedItemId) {
        setCanvasItems(prev => prev.filter(item => item.id !== selectedItemId));
        setSelectedItemId(null);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
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
    };
  }, [spacePressed, isDragging, selectedItemId]);
  
  // Handle mouse events for canvas panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (spacePressed) {
      setIsDragging(true);
      setStartDragPos({ x: e.clientX, y: e.clientY });
      setCanvasCursor("grabbing");
      document.body.style.cursor = "grabbing";
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && spacePressed) {
      const dx = e.clientX - startDragPos.x;
      const dy = e.clientY - startDragPos.y;
      
      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setStartDragPos({ x: e.clientX, y: e.clientY });
    } else if (resizing && selectedItemId) {
      const dx = e.clientX - resizeStartPos.x;
      const dy = e.clientY - resizeStartPos.y;
      
      setCanvasItems(prev => prev.map(item => {
        if (item.id === selectedItemId) {
          return {
            ...item,
            size: {
              width: Math.max(100, resizeStartSize.width + dx),
              height: Math.max(100, resizeStartSize.height + dy)
            }
          };
        }
        return item;
      }));
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = spacePressed ? "grab" : "default";
      setCanvasCursor(spacePressed ? "grab" : "default");
    }
    
    if (resizing) {
      setResizing(false);
      document.body.style.cursor = "default";
      setCanvasCursor("default");
    }
  };
  
  // Handle zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (spacePressed) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.min(Math.max(0.5, scale + delta), 2.5); // Limit scale between 0.5 and 2.5
      
      // Zoom centered on mouse position
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
      position,
      size: type === "image" ? { width: 200, height: 200 } : undefined
    };
    
    setCanvasItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };
  
  // Handle canvas click based on selected tool
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (selectedTool === "text") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - position.x) / scale;
        const y = (e.clientY - rect.top - position.y) / scale;
        addItem("text", { x, y }, "New text");
      }
    } else if (selectedTool === "move") {
      // Deselect when clicking on empty canvas with move tool
      setSelectedItemId(null);
    }
  };
  
  // Handle item selection and movement
  const handleItemClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTool === "move") {
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
  const startResize = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (selectedTool === "move") {
      const item = canvasItems.find(item => item.id === id);
      if (item && item.size) {
        setResizing(true);
        setResizeStartPos({ x: e.clientX, y: e.clientY });
        setResizeStartSize({ width: item.size.width, height: item.size.height });
      }
    }
  };
  
  // Handle drag end for repositioning items
  const handleDragEnd = (id: string, info: { offset: { x: number, y: number } }) => {
    setCanvasItems(items =>
      items.map(item => {
        if (item.id === id) {
          return {
            ...item,
            position: {
              x: item.position.x + info.offset.x / scale,
              y: item.position.y + info.offset.y / scale
            }
          };
        }
        return item;
      })
    );
  };
  
  // Handle image drop or paste
  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          // Place it in the center of the viewport
          const x = (window.innerWidth / 2 - rect.left - position.x) / scale;
          const y = (window.innerHeight / 2 - rect.top - position.y) / scale;
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
            backgroundImage: 'radial-gradient(circle, #444 1px, transparent 1px)',
            backgroundSize: `${30 * scale}px ${30 * scale}px`,
            backgroundPosition: `${position.x % (30 * scale)}px ${position.y % (30 * scale)}px`,
            backgroundColor: '#121212',
            transition: 'background-size 0.1s ease-out'
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
                animate={{ opacity: 1 }}
                className={`absolute ${selectedItemId === item.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{ 
                  left: item.position.x, 
                  top: item.position.y,
                  cursor: selectedTool === 'move' ? 'move' : 'default',
                  zIndex: selectedItemId === item.id ? 10 : 1,
                  width: item.type === 'image' && item.size ? item.size.width : 'auto',
                  height: item.type === 'image' && item.size ? item.size.height : 'auto'
                }}
                drag={selectedTool === 'move'}
                dragMomentum={false}
                onDragEnd={(_, info) => handleDragEnd(item.id, info)}
                onClick={(e) => handleItemClick(item.id, e)}
              >
                {item.type === 'text' ? (
                  <div 
                    contentEditable={selectedTool === 'text' && selectedItemId === item.id}
                    className="p-2 min-w-[100px] bg-transparent outline-none"
                    suppressContentEditableWarning={true}
                    onBlur={(e) => updateItemContent(item.id, e.currentTarget.textContent || '')}
                  >
                    {item.content}
                  </div>
                ) : item.type === 'image' ? (
                  <>
                    <img 
                      src={item.content} 
                      alt="Canvas item" 
                      className="max-w-full h-auto object-contain"
                      draggable={false}
                    />
                    {/* Resize handle - only shown when item is selected */}
                    {selectedItemId === item.id && selectedTool === 'move' && (
                      <div 
                        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-sm cursor-se-resize"
                        onMouseDown={(e) => startResize(item.id, e)}
                      />
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