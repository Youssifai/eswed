"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { File as FileIcon, Folder as FolderIcon, FolderPlus, Upload, Download } from "lucide-react";
import { Tree, Folder, File as TreeFile } from "./magicui/file-tree";
import { cn } from "@/lib/utils";
import { FileContextMenu } from "./file-context-menu";
import MoveFileDialog from "./move-file-dialog";
import { toast } from "sonner";
import { moveFile } from "@/actions/file-actions";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type FileType = {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  projectId: string;
  wasabiObjectPath?: string | null;
  mimeType?: string | null;
  description?: string | null;
  tags?: string | null;
  children?: FileType[];
};

interface FileManagerProps {
  projectId: string;
  rootFiles: FileType[];
}

export default function FileManager({ projectId, rootFiles = [] }: FileManagerProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedFile, setDraggedFile] = useState<FileType | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<FileType | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});
  
  // Track all folders in a flat structure for the move dialog
  const allFoldersRef = useRef<{
    id: string;
    name: string;
    parentId: string | null;
  }[]>([]);
  
  // Clean up any timeout on unmount
  useEffect(() => {
    // Add global drag event listeners to ensure we capture all drag events
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
    };

    const handleGlobalDrop = (e: DragEvent) => {
      // Reset state when dropping outside valid drop targets
      dragCounterRef.current = {};
      setDragOverFolderId(null);
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
      
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);
  
  // Helper to get folder name by id
  const getFolderName = useCallback((folderId: string | null) => {
    if (!folderId) return "Root";
    const folder = rootFiles.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  }, [rootFiles]);
  
  // Transform files into a tree structure
  const transformToTreeStructure = useCallback((files: FileType[]) => {
    const fileMap: { [key: string]: FileType } = {};
    const rootItems: FileType[] = [];
    allFoldersRef.current = [];

    // Create a map of all files by id
    files.forEach(file => {
      fileMap[file.id] = { ...file, children: [] };
      
      // Keep track of all folders for the move dialog
      if (file.type === "folder") {
        allFoldersRef.current.push({
          id: file.id,
          name: file.name,
          parentId: file.parentId
        });
      }
    });

    // Build the tree structure
    files.forEach(file => {
      if (file.parentId === null) {
        rootItems.push(fileMap[file.id]);
      } else if (fileMap[file.parentId]) {
        if (!fileMap[file.parentId].children) {
          fileMap[file.parentId].children = [];
        }
        fileMap[file.parentId].children!.push(fileMap[file.id]);
      }
    });

    // Sort folders first, then files alphabetically
    const sortItems = (items: FileType[]) => {
      return items.sort((a, b) => {
        // Folders come before files
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        // System folders come first
        if ((a as any).isSystemFolder !== (b as any).isSystemFolder) {
          return (a as any).isSystemFolder ? -1 : 1;
        }
        // Alphabetical sort
        return a.name.localeCompare(b.name);
      });
    };
    
    // Apply sorting recursively
    const sortRecursively = (items: FileType[]) => {
      sortItems(items);
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortRecursively(item.children);
        }
      });
      return items;
    };
    
    return sortRecursively(rootItems);
  }, []);

  const treeData = transformToTreeStructure(rootFiles);
  
  const handleSelectFile = (id: string) => {
    setSelectedFile(id);
    // Additional logic for file selection can be added here
  };
  
  const handleDragStart = (event: React.DragEvent, file: FileType) => {
    // Stop event propagation to prevent parent elements from being affected
    event.stopPropagation();
    
    // Set the data transfer properties for drag operation
    // Required for Firefox and Safari compatibility
    event.dataTransfer.setData("text/plain", file.id);
    event.dataTransfer.setData("application/json", JSON.stringify({
      fileId: file.id,
      fileName: file.name,
      fileType: file.type
    }));
    event.dataTransfer.effectAllowed = "move";
    
    console.log("Drag started for file:", file.name);
    
    // Add drag preview text to show what's being dragged
    const element = document.createElement("div");
    element.textContent = `Moving: ${file.name}`;
    element.style.position = "absolute";
    element.style.top = "0";
    element.style.left = "0";
    element.style.padding = "8px 12px";
    element.style.background = "rgba(59, 130, 246, 0.8)";
    element.style.borderRadius = "4px";
    element.style.color = "white";
    element.style.pointerEvents = "none";
    element.style.zIndex = "9999";
    document.body.appendChild(element);
    
    // Use a transparent image as fallback for browsers that don't support setDragImage
    try {
      event.dataTransfer.setDragImage(element, 20, 20);
    } catch (e) {
      console.error("Error setting drag image:", e);
    }
    
    setTimeout(() => {
      document.body.removeChild(element);
    }, 0);
    
    // Set the draggedFile state with a slight delay to ensure data transfer is set first
    setTimeout(() => {
      setDraggedFile(file);
    }, 0);
    
    // Add a class to indicate the item is being dragged
    const dragElement = event.currentTarget as HTMLElement;
    dragElement.classList.add("dragging");
    
    // Highlight potential drop targets
    const folderElements = document.querySelectorAll('.folder-drop-target');
    folderElements.forEach((el) => {
      (el as HTMLElement).style.transition = 'background-color 0.2s ease, transform 0.2s ease';
    });
    
    // Clean up styles when drag ends
    const cleanup = () => {
      console.log("Drag ended");
      dragElement.classList.remove("dragging");
      
      // Remove highlights from potential drop targets
      const folderElements = document.querySelectorAll('.folder-drop-target');
      folderElements.forEach((el) => {
        (el as HTMLElement).style.transition = '';
      });
      
      setTimeout(() => setDraggedFile(null), 50);
      document.removeEventListener("dragend", cleanup);
    };
    
    document.addEventListener("dragend", cleanup);
    
    // Add additional listener to handle cases where dragend doesn't fire
    document.addEventListener("mouseup", cleanup, { once: true });
  };
  
  const handleDragOver = (event: React.DragEvent, folderId: string | null) => {
    // Must call preventDefault to allow drop
    event.preventDefault();
    event.stopPropagation();
    
    // Get dragged file from state or data transfer
    let currentDraggedFile = draggedFile;
    if (!currentDraggedFile) {
      try {
        const dataStr = event.dataTransfer.getData("application/json");
        if (dataStr) {
          const data = JSON.parse(dataStr);
          if (data.fileId) {
            // Find the file in our data structure
            const findFile = (items: FileType[]): FileType | null => {
              for (const item of items) {
                if (item.id === data.fileId) return item;
                if (item.children?.length) {
                  const found = findFile(item.children);
                  if (found) return found;
                }
              }
              return null;
            };
            
            currentDraggedFile = findFile(rootFiles);
          }
        }
      } catch (e) {
        console.error("Error processing drag data:", e);
      }
    }
    
    if (!currentDraggedFile) return;
    
    // Use a counter to track multiple drag events on the same folder
    const key = folderId || "root";
    if (!dragCounterRef.current[key]) {
      dragCounterRef.current[key] = 0;
    }
    dragCounterRef.current[key]++;
    
    // Only update the drag over state if the folder changes
    if (folderId !== dragOverFolderId) {
      console.log("Dragging over folder:", folderId);
      setDragOverFolderId(folderId);
    }
    
    // Set the drop effect to indicate a move operation
    event.dataTransfer.dropEffect = "move";
  };
  
  const handleDragLeave = (event: React.DragEvent, folderId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Decrement the counter for this folder
    if (dragCounterRef.current[folderId || "root"]) {
      dragCounterRef.current[folderId || "root"]--;
    }
    
    // Only clear the drag over state if the counter reaches 0
    if (dragCounterRef.current[folderId || "root"] === 0) {
      if (dragOverFolderId === folderId) {
        // Clear the drag over state after a small delay to prevent flickering
        dragTimeoutRef.current = setTimeout(() => {
          setDragOverFolderId(null);
        }, 50);
      }
    }
  };
  
  // Check if a folder is a descendant of another folder
  const isDescendant = (potentialParentId: string, folderId: string): boolean => {
    const folder = rootFiles.find(f => f.id === folderId);
    if (!folder || folder.parentId === null) return false;
    if (folder.parentId === potentialParentId) return true;
    return isDescendant(potentialParentId, folder.parentId);
  };
  
  const handleDrop = async (event: React.DragEvent, targetFolderId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Reset drag counters
    dragCounterRef.current = {};
    
    // Clear the drag over state
    setDragOverFolderId(null);
    
    if (!draggedFile) {
      try {
        // Try to extract file id from dataTransfer
        const fileId = event.dataTransfer.getData("text/plain");
        const dataStr = event.dataTransfer.getData("application/json");
        
        if (fileId) {
          // Find the file in our data structure
          const file = rootFiles.find(f => f.id === fileId);
          if (file) {
            console.log("Dropping file by ID:", file.name);
            await processDrop(file, targetFolderId);
            return;
          }
        } else if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            if (data.fileId) {
              const file = rootFiles.find(f => f.id === data.fileId);
              if (file) {
                console.log("Dropping file by JSON data:", file.name);
                await processDrop(file, targetFolderId);
                return;
              }
            }
          } catch (e) {
            console.error("Error parsing JSON data:", e);
          }
        }
        
        // Check if files were dropped from outside the app
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          console.log("External files dropped - handle with upload logic");
          // Handle external file drops here if needed
          return;
        }
      } catch (e) {
        console.error("Error processing drop data:", e);
      }
      return;
    }
    
    await processDrop(draggedFile, targetFolderId);
  };
  
  // Helper function to process the drop operation
  const processDrop = async (file: FileType, targetFolderId: string | null) => {
    // Don't allow dropping onto itself
    if (file.id === targetFolderId) {
      return;
    }
    
    // Don't allow dropping a folder into its own child (would create circular reference)
    if (file.type === "folder" && targetFolderId) {
      if (isDescendant(file.id, targetFolderId)) {
        toast.error("Cannot move a folder into its own subfolder");
        return;
      }
    }
    
    // Don't move if the target is already the parent
    if (file.parentId === targetFolderId) {
      return;
    }
    
    try {
      // Show immediate visual feedback that the drop was accepted
      toast.loading(`Moving ${file.name} to ${getFolderName(targetFolderId)}...`);
      
      // Call the server action to update the database
      await moveFile(file.id, projectId, targetFolderId);
      
      // Show success message with the target folder name
      toast.success(`Moved "${file.name}" to ${getFolderName(targetFolderId)}`);
      
      // Refresh the router to get the updated data
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to move item");
      }
    } finally {
      setDraggedFile(null);
    }
  };
  
  const handleMoveFile = (file: FileType) => {
    setFileToMove(file);
    setMoveDialogOpen(true);
  };

  // Recursive function to render folders and files
  const renderTree = (items: FileType[]) => {
    return items.map((item) => {
      if (item.type === "folder") {
        const isDropTarget = dragOverFolderId === item.id;
        const isValidDropTarget = draggedFile && 
          draggedFile.id !== item.id && 
          (!draggedFile.type || draggedFile.type !== "folder" || !isDescendant(draggedFile.id, item.id));
        
        return (
          <FileContextMenu
            key={item.id}
            fileId={item.id}
            fileName={item.name}
            projectId={projectId}
            fileType="folder"
          >
            <div
              draggable={true}
              onDragStart={(e) => {
                e.stopPropagation(); // Stop bubbling to prevent parent folders from catching the event
                handleDragStart(e, item);
              }}
              onDragOver={(e) => {
                e.stopPropagation(); // Stop bubbling
                handleDragOver(e, item.id);
              }}
              onDragLeave={(e) => {
                e.stopPropagation(); // Stop bubbling
                handleDragLeave(e, item.id);
              }}
              onDrop={(e) => {
                e.stopPropagation(); // Stop bubbling
                handleDrop(e, item.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative rounded-md transition-colors duration-200 file-tree-item folder-drop-target my-1.5 pb-1.5",
                isDropTarget && isValidDropTarget && "bg-blue-800/20 outline-blue-500/50 scale-102 drag-over",
                isDropTarget && !isValidDropTarget && "bg-red-800/20 outline-red-500/50"
              )}
            >
              {isDropTarget && isValidDropTarget && (
                <div className="absolute top-1 right-1 py-0.5 px-1.5 bg-blue-500 text-white text-xs rounded-full opacity-90 z-10">
                  Drop here
                </div>
              )}
              <Folder 
                key={item.id} 
                value={item.id}
                element={item.name}
                isSelectable={true}
              >
                {item.children && item.children.length > 0 ? (
                  <div className="pl-2">
                    {renderTree(item.children)}
                  </div>
                ) : null}
              </Folder>
            </div>
          </FileContextMenu>
        );
      } else {
        return (
          <FileContextMenu
            key={item.id}
            fileId={item.id}
            fileName={item.name}
            projectId={projectId}
            fileType="file"
            wasabiObjectPath={item.wasabiObjectPath || undefined}
          >
            <div
              draggable={true}
              onDragStart={(e) => {
                e.stopPropagation(); // Stop bubbling to prevent parent folders from catching the event
                handleDragStart(e, item);
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative transition-transform duration-200 file-tree-item my-1"
            >
              <TreeFile
                key={item.id}
                value={item.id}
                handleSelect={handleSelectFile}
                isSelect={selectedFile === item.id}
                fileIcon={<FileIcon className="h-4 w-4" />}
              >
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="truncate max-w-[180px]">{item.name}</span>
                  {item.tags && (
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      {item.tags.split(',').slice(0, 2).map((tag, index) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                      {item.tags.split(',').length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{item.tags.split(',').length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </TreeFile>
            </div>
          </FileContextMenu>
        );
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white border border-neutral-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium">Files</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700"
              onClick={() => {
                document.getElementById('create-folder-trigger')?.click();
              }}
            >
              <FolderPlus size={16} className="mr-1" /> Create Folder
            </Button>
            <Button
              variant="outline"
              className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700"
              onClick={() => {
                document.getElementById('upload-file-trigger')?.click();
              }}
            >
              <Upload size={16} className="mr-1" /> Upload Files
            </Button>
            <Button
              variant="outline"
              className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700"
              onClick={() => {
                const downloadUrl = `/api/projects/${projectId}/download-folder`;
                // Open in a new tab to handle large downloads
                window.open(downloadUrl, '_blank');
              }}
            >
              <Download size={16} className="mr-1" /> Download All
            </Button>
          </div>
        </div>
      </div>
      <div className={cn(
        "flex-1 overflow-auto relative p-4",
        "scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900"
      )}>
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FolderIcon className="h-16 w-16 text-neutral-500 mb-4" />
            <h3 className="text-xl font-medium text-neutral-300 mb-2">No files yet</h3>
            <p className="text-neutral-500 max-w-sm">
              Upload files or create folders to organize your project assets.
            </p>
          </div>
        ) : (
          <Tree
            className="min-w-full w-max"
          >
            {renderTree(treeData)}
          </Tree>
        )}
      </div>
      {/* Move File Dialog */}
      {fileToMove && (
        <MoveFileDialog
          isOpen={moveDialogOpen}
          onClose={() => {
            setMoveDialogOpen(false);
            setFileToMove(null);
          }}
          fileId={fileToMove.id}
          fileName={fileToMove.name}
          projectId={projectId}
          fileType={fileToMove.type}
          allFolders={allFoldersRef.current}
        />
      )}
    </div>
  );
} 