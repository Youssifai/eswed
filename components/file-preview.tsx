import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileIcon, DownloadIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

interface FilePreviewProps {
  fileId: string;
  fileName: string;
  mimeType: string;
  description?: string | null;
  tags?: string | null;
  projectId: string;
}

export function FilePreview({
  fileId,
  fileName,
  mimeType,
  description,
  tags,
  projectId,
}: FilePreviewProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isImage = mimeType?.startsWith("image/");
  const isDocument = mimeType?.includes("pdf") || 
                    mimeType?.includes("word") || 
                    mimeType?.includes("text/") ||
                    mimeType?.includes("spreadsheet");

  // Format tags for display
  const tagsList = tags ? tags.split(",").map(tag => tag.trim()) : [];

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // Get the download URL from our API
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}/download-url`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate download URL");
      }
      
      const { downloadUrl, fileName: dlFileName } = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = dlFileName || fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${fileName}`,
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "An error occurred during download",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isImage ? (
            <div className="w-5 h-5 text-blue-500">📷</div>
          ) : isDocument ? (
            <div className="w-5 h-5 text-green-500">📄</div>
          ) : (
            <FileIcon className="w-5 h-5 text-gray-500" />
          )}
          <span className="truncate">{fileName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isImage && (
          <div className="relative h-48 w-full overflow-hidden rounded-md bg-gray-100">
            <Button 
              className="absolute right-2 top-2 z-10 h-8 w-8 p-0" 
              size="sm" 
              variant="outline"
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DownloadIcon className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center justify-center h-full text-gray-400">
              {/* In a real implementation, you'd fetch and show a preview of the image */}
              <p>Image Preview (would load from Wasabi)</p>
            </div>
          </div>
        )}
        
        {description && (
          <div>
            <h4 className="text-sm font-medium text-gray-500">Description:</h4>
            <p className="text-sm">{description}</p>
          </div>
        )}
        
        {tagsList.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Tags:</h4>
            <div className="flex flex-wrap gap-1">
              {tagsList.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleDownload}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing download...
            </>
          ) : (
            <>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 