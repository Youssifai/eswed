"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProjectById } from "@/db/queries/projects-queries";
import { createFolder, createFile, deleteFile as deleteFileFromDB, moveFile as moveFileInDB, getFileById } from "@/db/queries/files-queries";

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
 * Note: In a real implementation, we would upload to Wasabi/S3 here
 */
export async function uploadFile(
  projectId: string,
  fileInfo: {
    name: string;
    type: string;
    size: number;
    base64Data?: string; // Base64 encoded file data for small files
  },
  parentId?: string
) {
  const { userId } = auth();

  if (!userId) {
    throw new Error("You must be logged in to upload a file");
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

    // Generate the appropriate path for this file in Wasabi
    // Format: user_{userId}/project_{projectId}/{parentFolderPath}/{fileName}
    let folderPath = parentId ? await getFolderPath(parentId) : "root";
    const wasabiPath = `user_${userId}/project_${projectId}/${folderPath}/${fileInfo.name}`;
    
    // In a real implementation, we would upload to Wasabi/S3 here
    // Example with AWS SDK:
    //
    // const s3 = new AWS.S3({
    //   accessKeyId: process.env.WASABI_ACCESS_KEY,
    //   secretAccessKey: process.env.WASABI_SECRET_KEY,
    //   endpoint: process.env.WASABI_ENDPOINT,
    //   s3ForcePathStyle: true,
    //   signatureVersion: 'v4'
    // });
    //
    // // Decode base64 data for small files
    // let buffer;
    // if (fileInfo.base64Data) {
    //   // Remove the data:image/png;base64, part if it exists
    //   const base64Data = fileInfo.base64Data.split(',')[1] || fileInfo.base64Data;
    //   buffer = Buffer.from(base64Data, 'base64');
    //
    //   // Upload to Wasabi
    //   await s3.upload({
    //     Bucket: process.env.WASABI_BUCKET_NAME,
    //     Key: wasabiPath,
    //     Body: buffer,
    //     ContentType: fileInfo.type
    //   }).promise();
    // }
    
    // Create a file record in the database
    const newFile = await createFile({
      projectId,
      name: fileInfo.name,
      type: "file",
      parentId: parentId || null,
      mimeType: fileInfo.type,
      size: fileInfo.size.toString(),
      wasabiObjectPath: wasabiPath // Use the full wasabi path
    });

    revalidatePath(`/projects/${projectId}/files`);
    return newFile;
  } catch (error) {
    console.error("Error uploading file:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    } else {
      throw new Error("Failed to upload file: Unknown error");
    }
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