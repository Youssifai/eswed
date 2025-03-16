"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { moveFile } from "@/actions/file-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { File, Folder, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MoveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  projectId: string;
  fileType: "file" | "folder";
  allFolders: {
    id: string;
    name: string;
    parentId: string | null;
  }[];
}

export default function MoveFileDialog({
  isOpen,
  onClose,
  fileId,
  fileName,
  projectId,
  fileType,
  allFolders,
}: MoveFileDialogProps) {
  const router = useRouter();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out the current file/folder and any of its children if it's a folder
  const availableFolders = allFolders.filter(folder => {
    // Can't move to itself
    if (folder.id === fileId) return false;
    
    // Can't move a folder into its own child (would create circular reference)
    if (fileType === "folder") {
      // This is a simplified check - in a real implementation you'd need to check 
      // the entire folder hierarchy recursively
      return folder.parentId !== fileId;
    }
    
    return true;
  });
  
  // Group folders by parent
  const foldersByParent: Record<string, typeof allFolders> = {};
  availableFolders.forEach(folder => {
    const parentId = folder.parentId || "root";
    if (!foldersByParent[parentId]) {
      foldersByParent[parentId] = [];
    }
    foldersByParent[parentId].push(folder);
  });
  
  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleMove = async () => {
    try {
      setIsMoving(true);
      setError(null);
      
      await moveFile(fileId, projectId, selectedFolderId);
      
      toast.success(`Moved ${fileName} successfully`);
      onClose();
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to move item. Please try again.");
      }
    } finally {
      setIsMoving(false);
    }
  };
  
  // Recursive function to render folders
  const renderFolders = (parentId: string | null = null) => {
    const folders = foldersByParent[parentId || "root"] || [];
    
    return folders.map(folder => (
      <div key={folder.id} className="ml-4">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer ${
            selectedFolderId === folder.id
              ? "bg-blue-600"
              : "hover:bg-neutral-800"
          }`}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {selectedFolderId === folder.id ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
          <span className="text-sm">{folder.name}</span>
        </div>
        
        {foldersByParent[folder.id] && renderFolders(folder.id)}
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-white border-neutral-800">
        <DialogHeader>
          <DialogTitle>Move {fileType === "folder" ? "Folder" : "File"}</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Select a destination folder for {fileName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer ${
                selectedFolderId === null ? "bg-blue-600" : "hover:bg-neutral-800"
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              <Folder className="h-5 w-5" />
              <span className="font-medium">Root</span>
            </div>
          </div>
          
          <ScrollArea className="h-[200px] rounded-md border border-neutral-800 p-2">
            {renderFolders()}
            
            {availableFolders.length === 0 && (
              <div className="py-4 text-center text-neutral-400">
                No folders available
              </div>
            )}
          </ScrollArea>
          
          <div className="mt-2 flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              {fileType === "folder" ? (
                <Folder className="h-4 w-4 text-yellow-500" />
              ) : (
                <File className="h-4 w-4 text-blue-400" />
              )}
              <span>{fileName}</span>
            </div>
            <span className="text-neutral-400">will be moved to</span>
            <div className="flex items-center gap-1 font-medium">
              <Folder className="h-4 w-4 text-neutral-300" />
              <span>
                {selectedFolderId
                  ? availableFolders.find(f => f.id === selectedFolderId)?.name || "Unknown"
                  : "Root"}
              </span>
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isMoving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 