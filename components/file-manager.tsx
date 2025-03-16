"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { File as FileIcon, Folder as FolderIcon } from "lucide-react";
import { Tree, Folder, File as TreeFile } from "./magicui/file-tree";
import { cn } from "@/lib/utils";
import FileContextMenu from "./file-context-menu";
import MoveFileDialog from "./move-file-dialog";
import { toast } from "sonner";
import { moveFile } from "@/actions/file-actions";
import { useRouter } from "next/navigation";

type FileType = {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  projectId: string;
  wasabiObjectPath?: string | null;
  mimeType?: string | null;
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
  
  // Track all folders in a flat structure for the move dialog
  const allFoldersRef = useRef<{
    id: string;
    name: string;
    parentId: string | null;
  }[]>([]);
  
  // Clean up any timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);
  
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
    event.dataTransfer.setData("fileId", file.id);
    setDraggedFile(file);
  };
  
  const handleDragOver = (event: React.DragEvent, folderId: string | null) => {
    event.preventDefault();
    
    // Only allow dropping into folders, not files
    if (folderId !== dragOverFolderId) {
      setDragOverFolderId(folderId);
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
    setDragOverFolderId(null);
    
    if (!draggedFile) return;
    
    // Don't allow dropping onto itself
    if (draggedFile.id === targetFolderId) {
      return;
    }
    
    // Don't allow dropping a folder into its own child (would create circular reference)
    if (draggedFile.type === "folder" && targetFolderId) {
      if (isDescendant(draggedFile.id, targetFolderId)) {
        toast.error("Cannot move a folder into its own subfolder");
        return;
      }
    }
    
    // Don't move if the target is already the parent
    if (draggedFile.parentId === targetFolderId) {
      return;
    }
    
    try {
      // Optimistic UI update - we'll update the UI first, then the database
      // In a real app, you'd want to store the original state to revert if the API call fails
      
      // Call the server action to update the database
      await moveFile(draggedFile.id, projectId, targetFolderId);
      
      // Show success message with the target folder name
      let targetName = "root";
      if (targetFolderId) {
        const targetFolder = rootFiles.find(f => f.id === targetFolderId);
        if (targetFolder) targetName = targetFolder.name;
      }
      toast.success(`Moved "${draggedFile.name}" to ${targetName}`);
      
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
            parentId={item.parentId}
            onMoveFile={() => handleMoveFile(item)}
          >
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={(e) => handleDrop(e, item.id)}
              className={cn(
                "relative",
                isDropTarget && isValidDropTarget && "bg-blue-800/20 rounded-md",
                isDropTarget && !isValidDropTarget && "bg-red-800/20 rounded-md"
              )}
            >
              <Folder 
                key={item.id} 
                value={item.id}
                element={item.name}
                isSelectable={true}
              >
                {item.children && item.children.length > 0 ? (
                  renderTree(item.children)
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
            wasabiObjectPath={item.wasabiObjectPath}
            parentId={item.parentId}
            onMoveFile={() => handleMoveFile(item)}
          >
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
            >
              <TreeFile
                key={item.id}
                value={item.id}
                handleSelect={handleSelectFile}
                isSelect={selectedFile === item.id}
                fileIcon={<FileIcon className="h-4 w-4" />}
              >
                {item.name}
              </TreeFile>
            </div>
          </FileContextMenu>
        );
      }
    });
  };

  return (
    <>
      <div 
        className="h-full flex flex-col overflow-hidden border border-neutral-800 rounded-lg bg-neutral-900"
        onDragOver={(e) => handleDragOver(e, null)}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="p-4 border-b border-neutral-800">
          <h3 className="text-lg font-medium">Files</h3>
        </div>
        <div className={cn(
          "flex-1 overflow-auto p-2",
          draggedFile && dragOverFolderId === null && "bg-blue-800/10"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading files...</p>
            </div>
          ) : treeData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-neutral-400">
              <p>No files or folders yet. Start by creating a folder or uploading a file.</p>
            </div>
          ) : (
            <Tree>
              {renderTree(treeData)}
            </Tree>
          )}
        </div>
      </div>
      
      {fileToMove && moveDialogOpen && (
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
    </>
  );
} 