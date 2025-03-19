"use client";

import { useState } from "react";
import Link from "next/link";
import { SelectFile } from "@/db/schema/files-schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  File, 
  Folder, 
  Download, 
  Trash, 
  Edit, 
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  PresentationIcon
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { getFileDownloadUrl } from "@/actions/file-actions";
import { Badge } from "@/components/ui/badge";

interface FilesListProps {
  files: SelectFile[];
  projectId: string;
}

export function FilesList({ files, projectId }: FilesListProps) {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  // Function to get file icon based on mime type
  const getFileIcon = (file: SelectFile) => {
    if (file.type === "folder") {
      return <Folder className="h-6 w-6 text-blue-500" />;
    }
    
    if (!file.mimeType) {
      return <File className="h-6 w-6 text-gray-500" />;
    }
    
    if (file.mimeType.startsWith("image/")) {
      return <FileImage className="h-6 w-6 text-green-500" />;
    }
    
    if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.mimeType.includes("csv")) {
      return <FileSpreadsheet className="h-6 w-6 text-green-700" />;
    }
    
    if (file.mimeType.includes("presentation") || file.mimeType.includes("powerpoint")) {
      return <PresentationIcon className="h-6 w-6 text-orange-500" />;
    }
    
    if (file.mimeType.includes("zip") || file.mimeType.includes("archive") || file.mimeType.includes("compressed")) {
      return <FileArchive className="h-6 w-6 text-purple-500" />;
    }
    
    return <FileText className="h-6 w-6 text-blue-400" />;
  };
  
  // Function to handle file download
  const handleDownload = async (fileId: string, fileName: string) => {
    setIsLoading(prev => ({ ...prev, [fileId]: true }));
    
    try {
      const response = await getFileDownloadUrl(fileId, projectId);
      
      if (response.success && response.downloadUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement("a");
        link.href = response.downloadUrl;
        link.download = response.fileName || fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error("Failed to get download URL:", response.message);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    } finally {
      setIsLoading(prev => ({ ...prev, [fileId]: false }));
    }
  };
  
  // Function to format file size
  const formatFileSize = (size: string | null) => {
    if (!size) return "Unknown size";
    
    const sizeInBytes = parseInt(size);
    if (isNaN(sizeInBytes)) return size;
    
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    if (sizeInBytes < 1024 * 1024 * 1024) return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Function to render tags
  const renderTags = (tags: string | null) => {
    if (!tags) return null;
    
    return tags.split(",").map(tag => (
      <Badge key={tag} variant="outline" className="mr-1">
        {tag.trim()}
      </Badge>
    ));
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No files found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => (
        <Card key={file.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {getFileIcon(file)}
                <CardTitle className="text-lg truncate">
                  {file.type === "folder" ? (
                    <Link href={`/projects/${projectId}/files?folderId=${file.id}`} className="hover:underline">
                      {file.name}
                    </Link>
                  ) : (
                    file.name
                  )}
                </CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {file.type !== "folder" && (
                    <DropdownMenuItem 
                      onClick={() => handleDownload(file.id, file.name)}
                      disabled={isLoading[file.id]}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription className="truncate">
              {file.description || (file.type === "folder" ? "Folder" : "File")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {file.tags && (
              <div className="flex flex-wrap gap-1 mb-2">
                {renderTags(file.tags)}
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-gray-500 pt-0 flex justify-between">
            <span>
              {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
            </span>
            {file.type !== "folder" && (
              <span>{formatFileSize(file.size)}</span>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 