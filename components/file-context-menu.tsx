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
import { deleteFile, moveFile } from "@/actions/file-actions";

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
    if (!wasabiObjectPath || fileType === "folder") {
      toast.error("This item cannot be downloaded");
      return;
    }

    try {
      // In a real implementation, this would generate a pre-signed URL from Wasabi
      // For now, we'll just show a success message
      toast.success("Download started");
      
      // Example of how you'd handle a real download with a pre-signed URL:
      // const response = await fetch(`/api/projects/${projectId}/files/${fileId}/download`);
      // const { downloadUrl } = await response.json();
      // window.open(downloadUrl, '_blank');
    } catch (error) {
      toast.error("Failed to download file");
      console.error("Download error:", error);
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