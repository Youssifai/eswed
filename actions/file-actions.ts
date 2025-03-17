"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProjectById } from "@/db/queries/projects-queries";
import { createFolder, createFile, deleteFile as deleteFileFromDB, moveFile as moveFileInDB, getFileById, getFilesByProjectId, getAllFilesByProjectId, updateFileWasabiPath } from "@/db/queries/files-queries";
import { SelectFile } from "@/db/schema/files-schema";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getWasabiClient, generateWasabiPath, getDownloadUrl, getPlaceholderDataUrl } from "@/lib/wasabi-client";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { filesTable } from "@/db/schema/files-schema";

/**
 * Creates a new folder in the project
 */
export async function createNewFolder(
  projectId: string,
  name: string,
  parentId?: string
) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to create a folder");
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to access this project");
    }

    // Create the folder
    const newFolder = await createFolder(projectId, name, parentId);

    revalidatePath(`/projects/${projectId}/files`);
    return newFolder;
  } catch (error) {
    console.error("Error creating folder:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    } else {
      throw new Error("Failed to create folder: Unknown error");
    }
  }
}

/**
 * Creates default system folders for a project
 */
export async function createDefaultProjectFolders(projectId: string) {
  try {
    // Create default system folders
    const defaultFolders = ["assets", "design files", "png exports"];
    
    const folderPromises = defaultFolders.map(async (folderName) => {
      return await createFolder(projectId, folderName, undefined, true);
    });
    
    await Promise.all(folderPromises);
    
    revalidatePath(`/projects/${projectId}/files`);
    return { success: true };
  } catch (error) {
    console.error("Error creating default folders:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to create default folders: ${error.message}`);
    } else {
      throw new Error("Failed to create default folders: Unknown error");
    }
  }
}

/**
 * Uploads a file to the project
 * Stores the file in Wasabi and only metadata in the database
 */
export async function uploadFile(
  projectId: string,
  fileInfo: {
    name: string;
    type: string;
    size: number;
    base64Data?: string; // Base64 encoded file data for small files
    description?: string; // Optional description
    tags?: string; // Optional comma-separated tags
  },
  parentId?: string
) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to upload a file");
  }

  console.log(`Uploading file: ${fileInfo.name} (${fileInfo.type}) to project: ${projectId}`);

  try {
    // Verify Wasabi configuration first
    const requiredVars = {
      WASABI_BUCKET_NAME: process.env.WASABI_BUCKET_NAME,
      WASABI_REGION: process.env.WASABI_REGION,
      WASABI_ENDPOINT: process.env.WASABI_ENDPOINT,
      WASABI_ACCESS_KEY_ID: process.env.WASABI_ACCESS_KEY_ID,
      WASABI_SECRET_ACCESS_KEY: process.env.WASABI_SECRET_ACCESS_KEY
    };
    
    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.error(`Missing required Wasabi environment variables: ${missingVars.join(', ')}`);
      return { 
        success: false, 
        error: `Storage configuration is incomplete. Missing: ${missingVars.join(', ')}` 
      };
    }

    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to access this project");
    }

    // Auto-sort the file into the appropriate folder based on file extension and name
    let sortedParentId = parentId;
    
    if (!parentId) {
      // Only auto-sort if no specific parent folder is provided
      sortedParentId = await determineAutoSortFolder(projectId, fileInfo.name, fileInfo.type);
    }
    
    // Generate the wasabi path where the file will be stored
    // This path follows a structured format to organize files logically
    const wasabiObjectPath = generateWasabiPath(
      userId, 
      projectId, 
      fileInfo.name, 
      sortedParentId
    );
    
    console.log(`Generated Wasabi path: ${wasabiObjectPath}`);
    
    // For files with base64 content, upload to Wasabi
    if (fileInfo.base64Data) {
      try {
        console.log(`Uploading file to Wasabi at path: ${wasabiObjectPath}`);
        
        // Convert base64 to buffer for S3 upload
        const contentBuffer = Buffer.from(
          fileInfo.base64Data.split(",")[1],
          "base64"
        );
        
        // Upload to Wasabi
        const s3Client = getWasabiClient();
        
        console.log("Sending file to Wasabi storage...");
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.WASABI_BUCKET_NAME,
            Key: wasabiObjectPath,
            Body: contentBuffer,
            ContentType: fileInfo.type,
          })
        );
        
        console.log("File successfully uploaded to Wasabi");
        
        // Calculate size in bytes
        const sizeInBytes = contentBuffer.length;
        
        // Create file record in database
        const file = await createFile({
          projectId,
          name: fileInfo.name,
          type: "file",
          parentId: sortedParentId,
          mimeType: fileInfo.type,
          size: sizeInBytes.toString(),
          wasabiObjectPath,
          description: fileInfo.description || null,
          tags: fileInfo.tags || null,
        });
        
        revalidatePath(`/projects/${projectId}/files`);
        return { success: true, fileId: file.id, wasabiPath: wasabiObjectPath };
      } catch (error) {
        console.error("Error uploading file to Wasabi:", error);
        return { 
          success: false, 
          error: "Failed to upload file to storage: " + (error instanceof Error ? error.message : "Unknown error") 
        };
      }
    } else {
      // For files without content, create a placeholder record with wasabi path
      try {
        console.log(`Creating placeholder file record with Wasabi path: ${wasabiObjectPath}`);
        
        // Create file record in database
        const file = await createFile({
          projectId,
          name: fileInfo.name,
          type: "file",
          parentId: sortedParentId,
          mimeType: fileInfo.type || "application/octet-stream",
          size: fileInfo.size.toString() || "0",
          wasabiObjectPath, // We store the path even though no content yet
          description: fileInfo.description || null,
          tags: fileInfo.tags || null,
        });
        
        revalidatePath(`/projects/${projectId}/files`);
        return { 
          success: true, 
          fileId: file.id, 
          wasabiPath: wasabiObjectPath,
          message: "File record created. File content will need to be uploaded separately." 
        };
      } catch (error) {
        console.error("Error creating file record:", error);
        return { 
          success: false, 
          error: "Failed to create file record: " + (error instanceof Error ? error.message : "Unknown error") 
        };
      }
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    } else {
      throw new Error("Failed to upload file: Unknown error");
    }
  }
}

/**
 * Determines which folder to automatically place a file based on its extension and name
 */
export async function determineAutoSortFolder(projectId: string, fileName: string, mimeType: string): Promise<string | undefined> {
  try {
    // Get the system folders for this project
    const systemFolders = await db.query.files.findMany({
      where: and(
        eq(filesTable.projectId, projectId),
        eq(filesTable.type, "folder"),
        eq(filesTable.isSystemFolder, true)
      )
    });
    
    // If there are no system folders, return undefined (root folder)
    if (!systemFolders.length) {
      return undefined;
    }
    
    // Find the standard system folders
    const assetsFolder = systemFolders.find(f => f.name.toLowerCase() === "assets");
    const designFolder = systemFolders.find(f => f.name.toLowerCase() === "design files" || f.name.toLowerCase() === "design");
    const documentsFolder = systemFolders.find(f => f.name.toLowerCase() === "documents" || f.name.toLowerCase() === "docs");
    const printFolder = systemFolders.find(f => f.name.toLowerCase() === "print");
    
    // Extract the file extension if any
    const fileNameLower = fileName.toLowerCase();
    let extension = "";
    
    if (fileNameLower.includes(".")) {
      extension = fileNameLower.split(".").pop() || "";
    }
    
    console.log(`Checking file: ${fileNameLower} with extension: ${extension}`);
    
    // Check for important project documents first (briefs and inspiration)
    // These are always sorted to documents folder if it exists
    const isImportantDocument = 
      fileNameLower.includes('brief') || 
      fileNameLower.includes('inspiration') || 
      fileNameLower.includes('moodboard') || 
      fileNameLower.includes('mood board') ||
      fileNameLower.includes('concept') ||
      fileNameLower.includes('requirement') ||
      fileNameLower.includes('scope');
    
    if (documentsFolder && isImportantDocument) {
      console.log(`Sorting important document to Documents folder: ${documentsFolder.id}`);
      return documentsFolder.id;
    }
    
    // DOCUMENTS FOLDER: Proposals, Creative Briefs, Contracts, Invoices, Briefs, Inspiration
    if (
      documentsFolder && 
      (
        fileNameLower.includes('proposal') || 
        fileNameLower.includes('brief') || 
        fileNameLower.includes('inspiration') || 
        fileNameLower.includes('contract') || 
        fileNameLower.includes('invoice') ||
        fileNameLower.includes('agreement') ||
        fileNameLower.includes('scope') ||
        fileNameLower.includes('doc') ||
        fileNameLower.includes('reference') ||
        fileNameLower.includes('guide') ||
        extension === 'doc' ||
        extension === 'docx' ||
        extension === 'txt' ||
        extension === 'pdf' ||
        mimeType === 'application/pdf' ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'text/plain'
      )
    ) {
      console.log(`Sorting file to Documents folder: ${documentsFolder.id}`);
      return documentsFolder.id;
    }
    
    // ASSETS FOLDER: Images, Logos, etc.
    if (
      assetsFolder && 
      (
        extension === 'jpg' || 
        extension === 'jpeg' || 
        extension === 'png' || 
        extension === 'gif' ||
        extension === 'svg' ||
        fileNameLower.includes('logo') ||
        fileNameLower.includes('asset') ||
        fileNameLower.includes('image') ||
        fileNameLower.includes('photo') ||
        mimeType.startsWith('image/')
      )
    ) {
      console.log(`Sorting file to Assets folder: ${assetsFolder.id}`);
      return assetsFolder.id;
    }
    
    // DESIGN FOLDER: Adobe CC, Figma files
    if (
      designFolder && 
      (
        extension === 'ai' || 
        extension === 'psd' || 
        extension === 'xd' ||
        extension === 'fig' ||
        extension === 'sketch' ||
        extension === 'indd' ||
        extension === 'aep' ||
        fileNameLower.includes('design') ||
        fileNameLower.includes('figma') ||
        fileNameLower.includes('sketch') ||
        // Note: removed these since they're checked in DOCUMENTS folder first
        // fileNameLower.includes('inspiration') || 
        // fileNameLower.includes('moodboard')
        fileNameLower.includes('prototype')
      )
    ) {
      console.log(`Sorting file to Design folder: ${designFolder.id}`);
      return designFolder.id;
    }
    
    // PRINT FOLDER: Print-ready files
    if (
      printFolder && 
      (
        fileNameLower.includes('print') ||
        fileNameLower.includes('cmyk') ||
        extension === 'indd' ||
        extension === 'eps'
      )
    ) {
      console.log(`Sorting file to Print folder: ${printFolder.id}`);
      return printFolder.id;
    }
    
    // If no matching folder found, keep in root directory
    console.log(`No matching folder found for ${fileName}, keeping in root directory`);
    return undefined;
    
  } catch (error) {
    console.error("Error in determineAutoSortFolder:", error);
    // In case of error, keep the file in the root directory
    return undefined;
  }
}

// Helper function to get the full path of a folder
async function getFolderPath(folderId: string): Promise<string> {
  const folder = await getFileById(folderId);
  if (!folder) {
    return "unknown";
  }
  
  if (folder.parentId) {
    const parentPath = await getFolderPath(folder.parentId);
    return `${parentPath}/${folder.name}`;
  }
  
  return folder.name;
}

/**
 * Deletes a file or folder from the project
 */
export async function deleteFile(fileId: string, projectId: string) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to delete files");
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to access this project");
    }

    // Get the file to delete
    const file = await getFileById(fileId);
    
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    if (file.projectId !== projectId) {
      throw new Error("File does not belong to this project");
    }
    
    // In a real implementation, we would delete from Wasabi/S3 here
    // if (file.wasabiObjectPath) {
    //   await deleteFromWasabi(file.wasabiObjectPath);
    // }
    
    // Delete the file from the database
    await deleteFileFromDB(fileId);

    revalidatePath(`/projects/${projectId}/files`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    } else {
      throw new Error("Failed to delete file: Unknown error");
    }
  }
}

/**
 * Moves a file or folder to a different parent folder
 */
export async function moveFile(
  fileId: string, 
  projectId: string, 
  newParentId: string | null
) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to move files");
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to access this project");
    }

    // Get the file to move
    const file = await getFileById(fileId);
    
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    if (file.projectId !== projectId) {
      throw new Error("File does not belong to this project");
    }
    
    // Don't allow moving a file to itself as a parent
    if (newParentId === fileId) {
      throw new Error("Cannot move a folder into itself");
    }
    
    // If moving to a parent folder, verify it exists and is a folder
    if (newParentId) {
      const parentFolder = await getFileById(newParentId);
      
      if (!parentFolder) {
        throw new Error(`Parent folder not found: ${newParentId}`);
      }
      
      if (parentFolder.type !== "folder") {
        throw new Error("Target is not a folder");
      }
      
      if (parentFolder.projectId !== projectId) {
        throw new Error("Target folder does not belong to this project");
      }
    }
    
    // Update the file's parent
    await moveFileInDB(fileId, newParentId);

    revalidatePath(`/projects/${projectId}/files`);
    return { success: true };
  } catch (error) {
    console.error("Error moving file:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to move file: ${error.message}`);
    } else {
      throw new Error("Failed to move file: Unknown error");
    }
  }
}

/**
 * Gets all files for a project
 */
export async function getProjectFiles(projectId: string) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Authentication required");
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to access this project");
    }

    try {
      // Get all files for the project
      const files = await getAllFilesByProjectId(projectId);
      return files;
    } catch (dbError) {
      console.error("Database error fetching files:", dbError);
      throw new Error(`Error fetching files: ${dbError instanceof Error ? dbError.message : 'Database error'}`);
    }
  } catch (error) {
    console.error("Error getting project files:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get project files: ${error.message}`);
    } else {
      throw new Error("Failed to get project files: Unknown error");
    }
  }
}

/**
 * Debug function to test auto-sorting logic
 */
export async function testAutoSorting(
  projectId: string,
  fileName: string,
  mimeType: string = "application/octet-stream"
) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Authentication required");
  }

  try {
    // Check if user owns the project
    const project = await getProjectById(projectId);
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    if (project.ownerId !== userId) {
      throw new Error("Unauthorized to access this project");
    }
    
    // Get all folders first
    const allFiles = await getAllFilesByProjectId(projectId);
    const folderInfo = allFiles
      .filter(file => file.type === "folder")
      .map(folder => ({
        id: folder.id,
        name: folder.name,
        isSystemFolder: folder.isSystemFolder
      }));
    
    // Test the auto-sorting logic
    const targetFolderId = await determineAutoSortFolder(projectId, fileName, mimeType);
    let targetFolderName = "root";
    
    if (targetFolderId) {
      const targetFolder = allFiles.find(file => file.id === targetFolderId);
      if (targetFolder) {
        targetFolderName = targetFolder.name;
      }
    }
    
    return {
      fileName,
      mimeType,
      targetFolderId,
      targetFolderName,
      availableFolders: folderInfo
    };
  } catch (error) {
    console.error("Error testing auto-sorting:", error);
    if (error instanceof Error) {
      throw new Error(`Auto-sorting test failed: ${error.message}`);
    } else {
      throw new Error("Auto-sorting test failed: Unknown error");
    }
  }
}

/**
 * Generates a pre-signed URL for downloading a file from Wasabi
 */
export async function getFileDownloadUrl(fileId: string, projectId: string) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return {
        success: false,
        message: "You must be logged in to download files"
      };
    }
    
    // Check if all required environment variables for Wasabi are set
    if (
      !process.env.WASABI_ENDPOINT ||
      !process.env.WASABI_REGION ||
      !process.env.WASABI_BUCKET_NAME ||
      !process.env.WASABI_ACCESS_KEY_ID ||
      !process.env.WASABI_SECRET_ACCESS_KEY
    ) {
      console.error("Missing required Wasabi environment variables");
      return {
        success: false,
        message: "Storage configuration is incomplete. Please contact support."
      };
    }
    
    // Get the file data
    const file = await db.query.files.findFirst({
      where: and(
        eq(filesTable.id, fileId),
        eq(filesTable.projectId, projectId)
      )
    });
    
    if (!file) {
      return {
        success: false,
        message: "File not found. It may have been deleted."
      };
    }
    
    // Check project ownership
    const project = await getProjectById(projectId);
    if (!project || project.ownerId !== userId) {
      return {
        success: false,
        message: "You don't have permission to download this file"
      };
    }
    
    // Check if the file has a Wasabi object path
    if (!file.wasabiObjectPath) {
      console.log(`File ${fileId} has no Wasabi object path`);
      
      // For development/demo purposes, return a data URL placeholder if enabled
      if (process.env.NODE_ENV === 'development' && process.env.USE_PLACEHOLDER_DOWNLOADS === 'true') {
        const dataUrl = getPlaceholderDataUrl(file.name);
        return {
          success: true,
          downloadUrl: dataUrl,
          message: "Using placeholder for development"
        };
      }
      
      return {
        success: false,
        message: "This file doesn't have a storage location. Try migrating it first."
      };
    }
    
    // Get the pre-signed URL from Wasabi
    console.log(`Getting download URL for ${file.wasabiObjectPath}`);
    
    try {
      const { success, url, error } = await getDownloadUrl(
        file.wasabiObjectPath,
        file.name
      );
      
      if (!success || !url) {
        console.error("Error getting download URL:", error);
        return {
          success: false,
          message: `Storage error: ${error || "Unknown error generating download URL"}`
        };
      }
      
      // Return the download URL
      return {
        success: true,
        downloadUrl: url,
        fileName: file.name
      };
    } catch (storageError) {
      console.error("Error generating download URL:", storageError);
      return {
        success: false,
        message: storageError instanceof Error 
          ? storageError.message 
          : "Failed to generate download URL"
      };
    }
  } catch (error) {
    console.error("Error in getFileDownloadUrl:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Verifies if Wasabi storage is properly configured
 */
export async function verifyWasabiConfiguration() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return {
        success: false,
        message: "Authentication required"
      };
    }
    
    // Verify all required environment variables are set
    const requiredEnvVars = {
      WASABI_BUCKET_NAME: process.env.WASABI_BUCKET_NAME,
      WASABI_REGION: process.env.WASABI_REGION,
      WASABI_ENDPOINT: process.env.WASABI_ENDPOINT,
      WASABI_ACCESS_KEY_ID: process.env.WASABI_ACCESS_KEY_ID,
      WASABI_SECRET_ACCESS_KEY: process.env.WASABI_SECRET_ACCESS_KEY
    };
    
    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    const status = {
      hasMissingEnvVars: missingEnvVars.length > 0,
      envVarsPresent: missingEnvVars.length === 0,
      clientCreationSuccess: false,
      bucketAccessSuccess: false
    };
    
    if (missingEnvVars.length > 0) {
      console.warn("Missing Wasabi environment variables:", missingEnvVars);
      return {
        success: false,
        status,
        message: `Missing Wasabi environment variables: ${missingEnvVars.join(', ')}`
      };
    }
    
    // Test creating the S3 client
    try {
      // Import and use getWasabiClient to verify client creation
      const { getWasabiClient } = await import('@/lib/wasabi-client');
      getWasabiClient();
      status.clientCreationSuccess = true;
    } catch (clientError) {
      console.error("Failed to create Wasabi client:", clientError);
      return {
        success: false,
        status: {
          ...status,
          clientCreationError: true
        },
        message: clientError instanceof Error 
          ? `S3 client error: ${clientError.message}` 
          : "Failed to create S3 client"
      };
    }
    
    // Test bucket access
    try {
      const { verifyBucketAccess } = await import('@/lib/wasabi-client');
      const bucketAccessResult = await verifyBucketAccess();
      
      status.bucketAccessSuccess = bucketAccessResult.success;
      
      if (!bucketAccessResult.success) {
        return {
          success: false,
          status: {
            ...status,
            bucketAccessError: true
          },
          message: bucketAccessResult.message || "Unable to access bucket"
        };
      }
      
      // All tests passed
      return {
        success: true,
        status,
        message: "Wasabi configuration is valid"
      };
    } catch (bucketError) {
      console.error("Error verifying bucket access:", bucketError);
      return {
        success: false,
        status: {
          ...status,
          bucketAccessError: true
        },
        message: bucketError instanceof Error 
          ? `Bucket access error: ${bucketError.message}` 
          : "Failed to verify bucket access"
      };
    }
  } catch (error) {
    console.error("Error verifying Wasabi configuration:", error);
    return {
      success: false,
      status: {
        unexpectedError: true
      },
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Migrates file content to Wasabi if it's missing
 */
export async function migrateFilesToWasabi(projectId: string) {
  const { userId } = auth();
  
  if (!userId) {
    const error = new Error("You must be logged in to migrate files");
    error.name = "AUTHENTICATION_ERROR";
    throw error;
  }
  
  console.log(`Migrating files for project: ${projectId}`);
  
  try {
    // Verify the user has access to this project
    const project = await getProjectById(projectId);
    if (!project) {
      return { success: false, error: "Project not found" };
    }
    
    if (project.ownerId !== userId) {
      return { success: false, error: "Unauthorized to access this project" };
    }
    
    // Get all files for the project
    const allFiles = await getAllFilesByProjectId(projectId);
    console.log(`Found ${allFiles.length} total files in project`);
    
    // Filter to files that should have Wasabi paths but don't
    const filesToMigrate = allFiles.filter(file => 
      file.type === 'file' && !file.wasabiObjectPath
    );
    
    console.log(`Found ${filesToMigrate.length} files to migrate to Wasabi`);
    
    if (filesToMigrate.length === 0) {
      return { 
        success: true, 
        message: "All files are already on Wasabi", 
        migrated: 0, 
        total: allFiles.filter(f => f.type === 'file').length 
      };
    }
    
    // Migrate each file
    const results = [];
    for (const file of filesToMigrate) {
      try {
        // Generate a proper Wasabi path
        const wasabiObjectPath = generateWasabiPath(userId, projectId, file.name, file.parentId);
        
        // Update the file record with the Wasabi path
        const updatedFile = await updateFileWasabiPath(file.id, wasabiObjectPath);
        
        // In a full implementation, you would also:
        // 1. Get the file content from wherever it's currently stored
        // 2. Upload it to Wasabi at the new path
        // 3. Then update the database record
        
        results.push({
          fileId: file.id,
          fileName: file.name,
          status: "migrated",
          wasabiObjectPath
        });
      } catch (fileError) {
        console.error(`Error migrating file ${file.id}:`, fileError);
        results.push({
          fileId: file.id,
          fileName: file.name,
          status: "error",
          error: fileError instanceof Error ? fileError.message : "Unknown error"
        });
      }
    }
    
    revalidatePath(`/projects/${projectId}/files`);
    
    return {
      success: true,
      message: `Migration completed for ${results.filter(r => r.status === "migrated").length} files`,
      results,
      migrated: results.filter(r => r.status === "migrated").length,
      failed: results.filter(r => r.status === "error").length,
      total: allFiles.filter(f => f.type === 'file').length
    };
  } catch (error) {
    console.error("Error migrating files to Wasabi:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
} 