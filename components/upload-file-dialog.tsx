"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { fileToBase64, uploadLargeFileInChunks, MAX_BASE64_SIZE } from "@/lib/file-utils";
import { uploadFileChunk } from "@/actions/chunked-upload-actions";

interface UploadFileDialogProps {
  projectId: string;
  parentId?: string | null;
  onSuccess?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialFiles?: File[];
}

// Type for file with user-provided metadata
type FileWithMeta = {
  file: File;
  description: string;
  tags: string;
};

type UploadStatus = {
  file: File;
  description: string;
  tags: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
};

export default function UploadFileDialog({
  projectId,
  parentId,
  onSuccess,
  children,
  open: controlledOpen,
  onOpenChange,
  initialFiles = [],
}: UploadFileDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track description and tags for each file
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [description, setDescription] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle dialog open state changes
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
    
    // Reset state when dialog is opened
    if (newOpen) {
      setError(null);
      // Don't reset upload statuses if we're reopening with previous files
    } else {
      // Reset state when dialog is closed if we're not in the middle of uploading
      if (!isUploading) {
        setUploadStatuses([]);
        setActiveFileIndex(null);
        setDescription("");
        setTags("");
      }
    }
  };

  // Process initial files when they change
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      // Convert initial files to upload statuses
      setUploadStatuses(
        initialFiles.map(file => ({
          file,
          description: "",
          tags: "",
          progress: 0,
          status: "pending" as const
        }))
      );
    }
  }, [initialFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setUploadStatuses(prev => [
        ...prev,
        ...newFiles.map(file => ({
          file,
          description: "",
          tags: "",
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
          description: "",
          tags: "",
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
  const fileToBase64 = (file: File): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
      // Only convert small files to base64
      if (file.size > MAX_BASE64_SIZE) {
        resolve(undefined);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => {
        console.error("Error reading file:", error);
        reject(undefined);
      };
    });
  };

  // Update metadata for a specific file
  const updateFileMetadata = (index: number, description: string, tags: string) => {
    setUploadStatuses(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        description,
        tags
      };
      return updated;
    });
  };

  // Set active file for metadata editing
  const setActiveFile = (index: number) => {
    setActiveFileIndex(index);
    setDescription(uploadStatuses[index]?.description || "");
    setTags(uploadStatuses[index]?.tags || "");
  };

  // Save metadata for active file
  const saveMetadata = () => {
    if (activeFileIndex !== null) {
      updateFileMetadata(activeFileIndex, description, tags);
      setActiveFileIndex(null);
      setDescription("");
      setTags("");
    }
  };

  const handleUpload = async () => {
    if (uploadStatuses.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    // Prevent duplicate uploads
    if (isSubmitting || isUploading) {
      console.log("Upload already in progress, ignoring duplicate request");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsUploading(true);
      setError(null);
      
      // Upload each file with progress tracking
      await Promise.all(
        uploadStatuses.map(async (status, index) => {
          // Skip files that have already been uploaded or are currently uploading
          if (status.status === "completed" || status.status === "uploading") {
            console.log(`Skipping file ${status.file.name} as it's already ${status.status}`);
            return;
          }

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
              
              // Create a serializable file info object with metadata
              const fileInfo = {
                name: status.file.name,
                type: status.file.type,
                size: status.file.size,
                base64Data,
                description: status.description,
                tags: status.tags
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
              await uploadFile(projectId, fileInfo, parentId || null);
            } else {
              // For larger files, use the chunked upload approach
              await uploadLargeFileInChunks(
                status.file,
                async (chunk, chunkIndex, totalChunks) => {
                  // Send each chunk to the server
                  const result = await uploadFileChunk(chunk, {
                    projectId,
                    fileName: status.file.name,
                    fileType: status.file.type,
                    fileSize: status.file.size,
                    parentId: parentId || null,
                    description: status.description,
                    tags: status.tags,
                    chunkIndex,
                    totalChunks
                  });
                  
                  if (!result.success) {
                    throw new Error(result.error || "Failed to upload chunk");
                  }
                  
                  return result;
                },
                updateProgress
              );
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
          } catch (err: any) {
            console.error("Error uploading files:", err);
            setError(err.message || "Failed to upload files");
            setIsUploading(false);
            setIsSubmitting(false);
          }
        })
      );
      
      // Wait a moment to show completed progress, then close dialog
      setTimeout(() => {
        completeUpload();
      }, 1000);
    } catch (error) {
      setError(
        error instanceof Error 
          ? error.message 
          : "Failed to upload files"
      );
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  // Render the file list with metadata editing capabilities
  const renderFileList = () => {
    return (
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {uploadStatuses.map((status, index) => (
          <div 
            key={index} 
            className={`relative p-3 border rounded-md ${
              activeFileIndex === index ? 'border-primary' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileIcon className="h-8 w-8 text-primary" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{status.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(status.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {/* Show metadata when not actively editing */}
                {activeFileIndex !== index && (
                  <div className="mt-2 text-xs">
                    {status.description && (
                      <p className="text-muted-foreground truncate">
                        Description: {status.description}
                      </p>
                    )}
                    {status.tags && (
                      <p className="text-muted-foreground truncate">
                        Tags: {status.tags}
                      </p>
                    )}
                    {!status.description && !status.tags && status.status !== "uploading" && status.status !== "completed" && (
                      <button 
                        className="text-primary hover:underline" 
                        onClick={() => setActiveFile(index)}
                      >
                        + Add description and tags
                      </button>
                    )}
                  </div>
                )}
                
                {/* Metadata editing form */}
                {activeFileIndex === index && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Description"
                      className="w-full px-2 py-1 text-xs rounded border border-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Tags (comma separated)"
                      className="w-full px-2 py-1 text-xs rounded border border-input"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setActiveFileIndex(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={saveMetadata}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Progress bar */}
                {(status.status === "uploading" || status.status === "completed") && (
                  <div className="mt-2">
                    <Progress value={status.progress} className="h-1" />
                    <p className="text-xs text-right mt-1">
                      {status.status === "completed" ? "Completed" : `${status.progress}%`}
                    </p>
                  </div>
                )}
                
                {/* Error message */}
                {status.status === "error" && (
                  <p className="text-xs text-destructive mt-1">{status.error}</p>
                )}
              </div>
              
              {/* Remove button (only when not uploading) */}
              {status.status !== "uploading" && status.status !== "completed" && (
                <button 
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Complete the upload operation
  const completeUpload = () => {
    setIsUploading(false);
    setIsSubmitting(false);
    handleOpenChange(false);
    router.refresh();
      
    // Call onSuccess if provided
    if (onSuccess) {
      onSuccess();
    }
    
    // Reset all states
    setUploadStatuses([]);
    setActiveFileIndex(null);
    setDescription("");
    setTags("");
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to this project. Files will be automatically sorted into appropriate folders.
          </DialogDescription>
        </DialogHeader>
        
        {/* File selection area */}
        {uploadStatuses.length === 0 ? (
          <div 
            className="border-2 border-dashed border-border rounded-md p-10 text-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <UploadIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium mb-1">
              Drag and drop files here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Browse Files
            </Button>
          </div>
        ) : (
          renderFileList()
        )}
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || uploadStatuses.length === 0}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 