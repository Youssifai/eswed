"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreateFolderDialog from "@/components/create-folder-dialog";
import UploadFileDialog from "@/components/upload-file-dialog";
import { Button } from "@/components/ui/button";
import { FolderPlus, Upload, Download } from "lucide-react";

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
    const downloadUrl = `/api/projects/${projectId}/download-folder`;
    window.open(downloadUrl, '_blank');
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