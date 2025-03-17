"use server";

import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects-queries";
import { createFile } from "@/db/queries/files-queries";
import { determineAutoSortFolder } from "./file-actions";
import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getWasabiClient, generateWasabiPath } from "@/lib/wasabi-client";

interface ChunkInfo {
  fileName: string;
  fileType: string;
  parentId?: string;
  chunkIndex: number;
  totalChunks: number;
  chunkData: string; // base64 encoded chunk
  fileSize: string;
  description?: string;
  tags?: string[];
}

// Temporary storage for chunks (in memory)
// In a production app, use a more robust solution like a temporary file storage
const chunkStorage: Record<string, ArrayBuffer[]> = {};

/**
 * Handles a chunk of a large file upload
 */
export async function uploadFileChunk(
  chunk: ArrayBuffer,
  chunkInfo: {
    projectId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    parentId?: string | null;
    description?: string | null;
    tags?: string | null;
    chunkIndex: number;
    totalChunks: number;
  }
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  const { userId } = auth();

  if (!userId) {
    return { success: false, error: "Authentication required" };
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(chunkInfo.projectId);
    
    if (!project) {
      return { success: false, error: "Project not found" };
    }
    
    if (project.ownerId !== userId) {
      return { success: false, error: "Unauthorized to access this project" };
    }

    // Create a unique key for this file's chunks
    const fileKey = `${chunkInfo.projectId}_${chunkInfo.fileName}_${chunkInfo.fileSize}`;
    
    // Initialize the chunks array if it doesn't exist
    if (!chunkStorage[fileKey]) {
      chunkStorage[fileKey] = new Array(chunkInfo.totalChunks);
    }
    
    // Store this chunk
    chunkStorage[fileKey][chunkInfo.chunkIndex] = chunk;
    
    // Check if we have all chunks
    const isComplete = chunkStorage[fileKey].every(chunk => chunk !== undefined);
    
    // If this is the last chunk, combine and upload the complete file
    if (isComplete) {
      console.log(`All ${chunkInfo.totalChunks} chunks received for ${chunkInfo.fileName}. Combining...`);
      
      // Combine all chunks
      const totalLength = chunkStorage[fileKey].reduce((total, chunk) => total + chunk.byteLength, 0);
      const completeFile = new Uint8Array(totalLength);
      
      let offset = 0;
      for (const chunk of chunkStorage[fileKey]) {
        completeFile.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      // If no specific parentId is provided, determine the best folder
      let targetParentId = chunkInfo.parentId;
      if (!targetParentId) {
        targetParentId = await determineAutoSortFolder(
          chunkInfo.projectId, 
          chunkInfo.fileName, 
          chunkInfo.fileType
        );
      }
      
      // Generate Wasabi path
      const wasabiObjectPath = generateWasabiPath(
        userId,
        chunkInfo.projectId,
        chunkInfo.fileName,
        targetParentId
      );
      
      try {
        // Upload to Wasabi
        const s3Client = getWasabiClient();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: wasabiObjectPath,
            Body: completeFile,
            ContentType: chunkInfo.fileType,
          })
        );
        
        // Create file record in database
        const file = await createFile({
          projectId: chunkInfo.projectId,
          name: chunkInfo.fileName,
          type: "file",
          parentId: targetParentId || null,
          mimeType: chunkInfo.fileType,
          size: chunkInfo.fileSize.toString(),
          wasabiObjectPath,
          description: chunkInfo.description || null,
          tags: Array.isArray(chunkInfo.tags) 
            ? chunkInfo.tags.join(',') 
            : chunkInfo.tags,
        });
        
        // Clean up memory
        delete chunkStorage[fileKey];
        
        // Revalidate the files page
        revalidatePath(`/projects/${chunkInfo.projectId}/files`);
        
        return { 
          success: true, 
          fileId: file.id 
        };
      } catch (uploadError) {
        console.error("Error uploading complete file to Wasabi:", uploadError);
        return { 
          success: false, 
          error: "Failed to upload complete file to storage" 
        };
      }
    }
    
    // If we don't have all chunks yet, just return success for this chunk
    return { 
      success: true,
      // Only return fileId when all chunks are processed
      fileId: isComplete ? 'pending' : undefined
    };
  } catch (error) {
    console.error("Error processing file chunk:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
} 