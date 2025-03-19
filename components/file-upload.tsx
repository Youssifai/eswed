import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { uploadFileChunk } from "@/actions/chunked-upload-actions";
import { Progress } from "@/components/ui/progress";

// Define the allowed file types
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

interface FileUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentId?: string | null;
  onSuccess?: (fileId: string) => void;
}

export function FileUpload({
  open,
  onOpenChange,
  projectId,
  parentId = null,
  onSuccess,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setFile(null);
    setFileName("");
    setDescription("");
    setTags("");
    setProgress(0);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file type is allowed
      const fileType = selectedFile.type;
      if (!ALLOWED_FILE_TYPES.includes(fileType)) {
        setError(`File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`);
        return;
      }
      
      setFile(selectedFile);
      // Use the file's name as the default value, but allow editing
      setFileName(selectedFile.name);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    if (!fileName.trim()) {
      setError("Please enter a file name");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setError("");

      // For larger files (>5MB), use chunked upload
      if (file.size > 5 * 1024 * 1024) {
        await handleChunkedUpload();
      } else {
        await handleDirectUpload();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
      toast({
        title: "Upload Failed",
        description: err.message || "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDirectUpload = async () => {
    if (!file) return;
    
    try {
      // Step 1: Get a pre-signed URL from our backend
      const response = await fetch(`/api/projects/${projectId}/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          fileType: file.type,
          parentId: parentId || null,
          description: description || null,
          tags: tags ? tags.split(",").map(tag => tag.trim()) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadUrl, fileId } = await response.json();

      // Step 2: Upload the file directly to Wasabi using the pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage provider");
      }

      // Success!
      toast({
        title: "Upload Successful",
        description: `${fileName} has been uploaded`,
      });

      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess(fileId);
    } catch (error: any) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleChunkedUpload = async () => {
    if (!file) return;

    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // Convert chunk to base64
        const reader = new FileReader();
        const chunkBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(chunk);
        });
        
        // Parse base64 to ArrayBuffer for the function
        const base64Data = chunkBase64.split(",")[1]; // Remove data URL prefix
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Upload chunk
        const result = await uploadFileChunk(
          bytes.buffer,
          {
            projectId,
            fileName,
            fileType: file.type,
            fileSize: file.size,
            parentId: parentId || null,
            description: description || null,
            tags: tags ? tags.split(",").map(tag => tag.trim()).join(",") : null,
            chunkIndex,
            totalChunks,
          }
        );
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Update progress
        const percentCompleted = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setProgress(percentCompleted);
        
        // If this is the last chunk, we get back the fileId
        if (chunkIndex === totalChunks - 1 && result.fileId) {
          toast({
            title: "Upload Successful",
            description: `${fileName} has been uploaded`,
          });
          
          resetForm();
          onOpenChange(false);
          if (onSuccess) onSuccess(result.fileId);
        }
      }
    } catch (error: any) {
      console.error("Chunked upload error:", error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] text-white border-neutral-800">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file" className="text-white">Select File</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={uploading}
              className="bg-[#252525] border-neutral-700 text-white file:bg-[#333333] file:text-white file:border-0"
            />
          </div>
          {file && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="fileName" className="text-white">File Name</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  disabled={uploading}
                  className="bg-[#252525] border-neutral-700 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-white">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploading}
                  className="bg-[#252525] border-neutral-700 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags" className="text-white">Tags (comma separated, optional)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="design, logo, draft"
                  disabled={uploading}
                  className="bg-[#252525] border-neutral-700 text-white placeholder:text-neutral-400"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="bg-neutral-700" />
              <p className="text-sm text-neutral-400 text-center">{progress}%</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={uploading}
            className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-[#252525] hover:bg-[#333333] text-white border-neutral-700"
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 