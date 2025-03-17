"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Download, Trash2, FolderUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteFile, moveFile, getFileDownloadUrl } from "@/actions/file-actions";

interface FileContextMenuProps {
  children: React.ReactNode;
  fileId: string;
  fileName: string;
  projectId: string;
  fileType: "file" | "folder";
  wasabiObjectPath?: string | null;
  parentId: string | null;
  onMoveFile?: (fileId: string) => void;
}

export default function FileContextMenu({
  children,
  fileId,
  fileName,
  projectId,
  fileType,
  wasabiObjectPath,
  parentId,
  onMoveFile,
}: FileContextMenuProps) {
  const router = useRouter();

  const handleDownload = async () => {
    // Check if this is a file that can be downloaded
    if (!wasabiObjectPath || fileType === "folder") {
      toast.error(fileType === "folder" 
        ? "Folders cannot be downloaded directly" 
        : "This file doesn't have a storage location"
      );
      return;
    }

    console.log(`Requesting download for ${fileName}`);

    try {
      // Get the pre-signed URL
      const response = await getFileDownloadUrl(fileId, projectId);
      
      if (!response.success) {
        console.error("Download failed:", response);
        // Handle error message
        toast.error(response.message || "Failed to download file");
        return;
      }

      if (!response.downloadUrl) {
        toast.error("No download URL was returned");
        return;
      }

      // Create an anchor element to trigger the download
      const link = document.createElement('a');
      link.href = response.downloadUrl;
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      toast.success(`Downloading ${fileName}...`);
      
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFile(fileId, projectId);
      toast.success(`${fileType === "folder" ? "Folder" : "File"} deleted successfully`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to delete item");
      }
      console.error("Delete error:", error);
    }
  };

  const handleMoveToRoot = async () => {
    if (!parentId) {
      toast.error("This item is already at the root level");
      return;
    }

    try {
      await moveFile(fileId, projectId, null);
      toast.success(`Moved ${fileName} to root`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to move item");
      }
      console.error("Move error:", error);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-neutral-900 border-neutral-800 text-white">
        {fileType === "file" && wasabiObjectPath && (
          <ContextMenuItem
            className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </ContextMenuItem>
        )}
        
        {parentId && (
          <ContextMenuItem
            className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
            onClick={handleMoveToRoot}
          >
            <FolderUp className="h-4 w-4 mr-2" />
            Move to Root
          </ContextMenuItem>
        )}
        
        {onMoveFile && (
          <ContextMenuItem
            className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
            onClick={() => onMoveFile(fileId)}
          >
            <FolderUp className="h-4 w-4 mr-2" />
            Move to Folder...
          </ContextMenuItem>
        )}
        
        <ContextMenuItem
          className="cursor-pointer text-red-500 hover:bg-neutral-800 focus:bg-neutral-800 hover:text-red-400"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
} 