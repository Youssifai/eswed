"use client";

import React, { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteFile } from "@/actions/file-actions";
import { useRouter } from "next/navigation";
import { FileIcon, FolderIcon } from "lucide-react";

export interface FileContextMenuProps {
  children: React.ReactNode;
  fileId?: string;
  fileName?: string;
  projectId?: string;
  wasabiObjectPath?: string;
  fileType?: "file" | "folder";
  onRename?: (name: string) => void;
  className?: string;
  disableDelete?: boolean;
  disableDownload?: boolean;
  disableRename?: boolean;
}

export function FileContextMenu({
  children,
  fileId,
  fileName,
  projectId,
  wasabiObjectPath,
  fileType = "file",
  onRename,
  className,
  disableDelete = false,
  disableDownload = false,
  disableRename = false,
}: FileContextMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!fileId || !projectId || !fileName) return;
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      setLoading(true);
      await deleteFile(fileId, projectId);
      toast.success(`${fileType === "folder" ? "Folder" : "File"} deleted`);
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        `Failed to delete ${fileType === "folder" ? "folder" : "file"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!fileId || !fileName || !projectId) return;

    try {
      setLoading(true);
      console.log("Downloading file:", fileName);
      
      // Use direct API endpoint instead of signed URL
      const downloadUrl = `/api/projects/${projectId}/files/${fileId}`;
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Failed to download ${fileName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!fileId || !projectId || !fileName) return;
    const newName = prompt("Enter new name:", fileName);
    if (!newName || newName === fileName) return;

    try {
      setLoading(true);
      // We're using the onRename callback instead of a server action
      if (onRename) onRename(newName);
      toast.success(`Renamed to ${newName}`);
      router.refresh();
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("Failed to rename");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <div className="flex items-center px-2 py-2">
            <div className="mr-2">
              {fileType === "folder" ? (
                <FolderIcon className="h-5 w-5" />
              ) : (
                <FileIcon className="h-5 w-5" />
              )}
            </div>
            <span className="font-medium truncate">
              {loading ? (
                <span className="text-sm text-muted-foreground">Loading...</span>
              ) : (
                fileName || "File"
              )}
            </span>
          </div>
          <ContextMenuSeparator />
          
          {!disableRename && (
            <ContextMenuItem onClick={handleRename} disabled={loading}>
              Rename
            </ContextMenuItem>
          )}
          
          {!disableDownload && fileType !== "folder" && (
            <ContextMenuItem onClick={handleDownload} disabled={loading}>
              Download
            </ContextMenuItem>
          )}
          
          {!disableDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
} 