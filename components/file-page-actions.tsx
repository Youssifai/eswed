"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateFolderDialog from "@/components/create-folder-dialog";
import UploadFileDialog from "@/components/upload-file-dialog";
import { Button } from "@/components/ui/button";
import { FolderPlus, Upload, Download } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FilePageActionsProps {
  projectId: string;
  initialUpload?: boolean;
}

export default function FilePageActions({ projectId, initialUpload = false }: FilePageActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (initialUpload) {
      // Get files from sessionStorage
      const pendingFilesJson = sessionStorage.getItem(`project_${projectId}_pending_files`);
      if (pendingFilesJson) {
        const pendingFilesInfo = JSON.parse(pendingFilesJson);
        
        // Create File objects from the stored blobs
        const loadFiles = async () => {
          const loadedFiles: File[] = [];
          for (let i = 0; i < pendingFilesInfo.length; i++) {
            const blobUrl = sessionStorage.getItem(`project_${projectId}_file_${i}`);
            if (blobUrl) {
              try {
                const response = await fetch(blobUrl);
                const blob = await response.blob();
                const file = new File(
                  [blob], 
                  pendingFilesInfo[i].name, 
                  { 
                    type: pendingFilesInfo[i].type,
                    lastModified: pendingFilesInfo[i].lastModified
                  }
                );
                loadedFiles.push(file);
              } catch (error) {
                console.error('Failed to reconstruct file from blob URL:', error);
              }
            }
          }
          
          if (loadedFiles.length > 0) {
            setPendingFiles(loadedFiles);
            setUploadDialogOpen(true);
            
            // Clean up sessionStorage
            sessionStorage.removeItem(`project_${projectId}_pending_files`);
            for (let i = 0; i < pendingFilesInfo.length; i++) {
              const blobUrl = sessionStorage.getItem(`project_${projectId}_file_${i}`);
              if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                sessionStorage.removeItem(`project_${projectId}_file_${i}`);
              }
            }
            
            // Remove the initialUpload param from URL to avoid reopening on refresh
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('initialUpload');
            router.replace(`/projects/${projectId}/files${newParams.toString() ? `?${newParams.toString()}` : ''}`);
          }
        };
        
        loadFiles();
      }
    }
  }, [initialUpload, projectId, router, searchParams]);

  const handleDownload = () => {
    // First get info about how many files there are
    fetch(`/api/projects/${projectId}/download-folder?page=1`)
      .then(response => {
        // Check if we got an actual zip file
        const contentType = response.headers.get('Content-Type');
        if (contentType === 'application/zip') {
          // Just a single page, download it directly
          window.open(`/api/projects/${projectId}/download-folder`, '_blank');
          return;
        }
        
        // If we got JSON, read pagination info
        return response.json().then(data => {
          if (data.pagination) {
            const { totalPages } = data.pagination;
            
            // Show download info if multiple pages
            if (totalPages > 1) {
              toast({
                title: "Large Project Download",
                description: `This project has been split into ${totalPages} downloads due to size limits. Each download will open in a new tab.`,
                duration: 10000,
              });
              
              // Open download windows for each page, with a slight delay to prevent browser blocking
              for (let page = 1; page <= totalPages; page++) {
                setTimeout(() => {
                  window.open(`/api/projects/${projectId}/download-folder?page=${page}`, '_blank');
                }, page * 500); // 500ms delay between pages
              }
            } else {
              // Fallback to regular download for single page
              window.open(`/api/projects/${projectId}/download-folder`, '_blank');
            }
          } else {
            // Fallback to regular download
            window.open(`/api/projects/${projectId}/download-folder`, '_blank');
          }
        });
      })
      .catch(error => {
        console.error("Download error:", error);
        toast({
          title: "Download Error",
          description: "There was a problem preparing your download. Please try again.",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="flex gap-2">
      <CreateFolderDialog projectId={projectId}>
        <Button className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700">
          <FolderPlus className="h-4 w-4 mr-2" />
          Create Folder
        </Button>
      </CreateFolderDialog>
      
      <UploadFileDialog 
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        initialFiles={pendingFiles}
      >
        <Button className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700">
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </UploadFileDialog>
      
      <Button 
        className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4 mr-2" />
        Download All
      </Button>
    </div>
  );
} 