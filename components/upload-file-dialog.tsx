"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/actions/file-actions";
import { FileIcon, UploadIcon, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UploadFileDialogProps {
  projectId: string;
  parentId?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

type UploadStatus = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
};

// Max file size for base64 encoding (5MB)
const MAX_BASE64_SIZE = 5 * 1024 * 1024;

export default function UploadFileDialog({
  projectId,
  parentId,
  onSuccess,
  children,
}: UploadFileDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setUploadStatuses(prev => [
        ...prev,
        ...newFiles.map(file => ({
          file,
          progress: 0,
          status: "pending" as const
        }))
      ]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setUploadStatuses(prev => [
        ...prev,
        ...newFiles.map(file => ({
          file,
          progress: 0,
          status: "pending" as const
        }))
      ]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setUploadStatuses(prev => prev.filter((_, i) => i !== index));
  };

  // Convert file to base64 for small files
  const fileToBase64 = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      // Only convert small files to base64
      if (file.size > MAX_BASE64_SIZE) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => {
        console.error("Error reading file:", error);
        reject(null);
      };
    });
  };

  const uploadLargeFile = async (
    file: File, 
    index: number, 
    updateProgress: (progress: number) => void
  ): Promise<void> => {
    try {
      // 1. Get a pre-signed URL from the server
      const response = await fetch(`/api/projects/${projectId}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file.name,
          fileType: file.type,
          parentId 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get upload URL");
      }
      
      const { uploadUrl, fileId } = await response.json();
      
      // In a real app, we would upload to Wasabi/S3 here
      // For now, we'll just simulate the upload
      updateProgress(50);
      
      // Simulate the actual upload to Wasabi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulating successful upload
      updateProgress(100);
      
      return;
    } catch (error) {
      console.error("Error uploading large file:", error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (uploadStatuses.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      // Upload each file with progress tracking
      await Promise.all(
        uploadStatuses.map(async (status, index) => {
          try {
            // Start uploading
            setUploadStatuses(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: "uploading",
                progress: 10 // Initial progress
              };
              return updated;
            });
            
            // Update progress function
            const updateProgress = (progress: number) => {
              setUploadStatuses(prev => {
                const updated = [...prev];
                updated[index] = {
                  ...updated[index],
                  progress
                };
                return updated;
              });
            };
            
            // For small files, use base64 encoding
            if (status.file.size <= MAX_BASE64_SIZE) {
              // Convert small files to base64
              const base64Data = await fileToBase64(status.file);
              
              // Create a serializable file info object
              const fileInfo = {
                name: status.file.name,
                type: status.file.type,
                size: status.file.size,
                base64Data: base64Data || undefined
              };
              
              // Simulate upload progress
              await new Promise<void>(resolve => {
                let currentProgress = 10;
                const interval = setInterval(() => {
                  currentProgress += Math.floor(Math.random() * 20);
                  if (currentProgress >= 90) {
                    clearInterval(interval);
                    currentProgress = 90;
                    resolve();
                  }
                  updateProgress(currentProgress);
                }, 500);
              });
              
              // Actual file upload using our server action
              await uploadFile(projectId, fileInfo, parentId);
            } else {
              // For larger files, use the pre-signed URL approach
              await uploadLargeFile(status.file, index, updateProgress);
            }
            
            // Mark as completed
            setUploadStatuses(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: "completed",
                progress: 100
              };
              return updated;
            });
          } catch (err) {
            setUploadStatuses(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed"
              };
              return updated;
            });
            throw err;
          }
        })
      );
      
      // Wait a moment to show completed progress, then close dialog
      setTimeout(() => {
        setOpen(false);
        setUploadStatuses([]);
        router.refresh();
        toast.success("Files uploaded successfully");
        if (onSuccess) {
          onSuccess();
        }
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to upload files. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-neutral-900 text-white border-neutral-800">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Select files to upload to your project.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {uploadStatuses.length === 0 ? (
            <div
              className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center hover:border-neutral-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                multiple
              />
              <UploadIcon className="h-10 w-10 text-neutral-400 mx-auto mb-4" />
              <p className="text-sm text-neutral-300 mb-1">
                Drag and drop files here or click to browse
              </p>
              <p className="text-xs text-neutral-500">
                Supported file types: Any file type is supported
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {uploadStatuses.map((status, index) => (
                <div
                  key={index}
                  className="bg-neutral-800 rounded-md p-3 relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileIcon className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm truncate max-w-[350px]">{status.file.name}</span>
                      <span className="text-xs text-neutral-500">
                        {status.file.size > 1024 * 1024
                          ? `${(status.file.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(status.file.size / 1024).toFixed(1)} KB`}
                      </span>
                    </div>
                    {status.status === "pending" && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-neutral-400 hover:text-white p-1"
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <Progress 
                      value={status.progress} 
                      className="h-1.5 bg-neutral-700"
                      indicatorClassName={
                        status.status === "error" 
                          ? "bg-red-500" 
                          : status.status === "completed"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }
                    />
                    <div className="flex justify-between text-xs">
                      <span>
                        {status.status === "pending" && "Ready to upload"}
                        {status.status === "uploading" && "Uploading..."}
                        {status.status === "completed" && "Upload complete"}
                        {status.status === "error" && "Upload failed"}
                      </span>
                      <span>{Math.round(status.progress)}%</span>
                    </div>
                    {status.error && (
                      <p className="text-red-400 text-xs mt-1">{status.error}</p>
                    )}
                  </div>
                </div>
              ))}
              
              <Button
                className="mt-4 w-full bg-neutral-800 hover:bg-neutral-700"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
              >
                Add More Files
              </Button>
            </div>
          )}
          
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button 
            variant="secondary"
            onClick={() => setOpen(false)}
            className="bg-neutral-800 hover:bg-neutral-700"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={isUploading || uploadStatuses.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? "Uploading..." : `Upload ${uploadStatuses.length} File${uploadStatuses.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 