"use server";

import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects-queries";
import { createFile, updateFileWasabiPath } from "@/db/queries/files-queries";
import { determineAutoSortFolder } from "./file-actions";
import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getWasabiClient, generateWasabiPath, uploadToWasabi } from "@/lib/wasabi-client";

export interface ChunkMetadata {
  projectId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  parentId: string | null;
  description: string | null;
  tags: string | null;
  chunkIndex: number;
  totalChunks: number;
}

// Maps file ids to chunk data
const chunksStore = new Map<string, {
  chunks: ArrayBuffer[];
  metadata: ChunkMetadata;
  fileId?: string;
}>();

/**
 * Handles a chunk of a large file upload
 */
export async function uploadFileChunk(
  chunk: ArrayBuffer, 
  metadata: ChunkMetadata
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const { userId } = auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Convert ArrayBuffer to a plain serializable format
    const serializedChunk = Array.from(new Uint8Array(chunk));
    
    // Create a unique key for this file upload
    const uploadKey = `${userId}_${metadata.projectId}_${metadata.fileName}_${Date.now()}`;
    
    // If this is the first chunk, initialize store
    if (metadata.chunkIndex === 0) {
      chunksStore.set(uploadKey, {
        chunks: [],
        metadata
      });
      
      // For the first chunk, also create a file record in the database
      const sortedParentId = metadata.parentId || 
        await determineAutoSortFolder(metadata.projectId, metadata.fileName, metadata.fileType);
      
      // Create wasabi path for the file
      const wasabiObjectPath = generateWasabiPath(
        userId,
        metadata.projectId,
        metadata.fileName,
        sortedParentId
      );
      
      // Create file record
      const file = await createFile({
        projectId: metadata.projectId,
        name: metadata.fileName,
        type: "file",
        parentId: sortedParentId,
        mimeType: metadata.fileType || "application/octet-stream",
        size: metadata.fileSize.toString(),
        wasabiObjectPath,
        description: metadata.description,
        tags: metadata.tags,
      });
      
      // Save the file id in the chunks store
      chunksStore.get(uploadKey)!.fileId = file.id;
    }
    
    // Get the store for this upload
    const fileStore = chunksStore.get(uploadKey);
    if (!fileStore) {
      return { 
        success: false, 
        error: "Upload session not found" 
      };
    }
    
    // Convert back to ArrayBuffer and store the chunk
    const arrayBuffer = new Uint8Array(serializedChunk).buffer;
    fileStore.chunks.push(arrayBuffer);
    
    // If this is the last chunk, assemble and upload the file
    if (metadata.chunkIndex === metadata.totalChunks - 1) {
      // Assemble chunks into a single buffer
      const totalSize = fileStore.chunks.reduce((size, chunk) => size + chunk.byteLength, 0);
      const assembledFile = new Uint8Array(totalSize);
      
      let offset = 0;
      for (const chunk of fileStore.chunks) {
        assembledFile.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      // Upload to Wasabi
      const fileId = fileStore.fileId;
      const file = assembledFile.buffer;
      
      if (!fileId) {
        return { 
          success: false, 
          error: "File ID not found" 
        };
      }
      
      // Get the wasabi path from database
      const sortedParentId = metadata.parentId || 
        await determineAutoSortFolder(metadata.projectId, metadata.fileName, metadata.fileType);
      
      // Generate path
      const wasabiObjectPath = generateWasabiPath(
        userId,
        metadata.projectId,
        metadata.fileName,
        sortedParentId
      );
      
      // Upload to Wasabi
      await uploadToWasabi(wasabiObjectPath, Buffer.from(file));
      
      // Update the file record with the Wasabi path
      await updateFileWasabiPath(fileId, wasabiObjectPath);
      
      // Clean up chunks
      chunksStore.delete(uploadKey);
      
      return {
        success: true,
        fileId
      };
    }
    
    // If not the last chunk, just return success
    return {
      success: true
    };
  } catch (error) {
    console.error("Error in uploadFileChunk:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
} 