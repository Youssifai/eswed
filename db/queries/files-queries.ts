"use server";

import { db } from "@/db/db";
import { and, eq, isNull, asc, or, ilike, sql } from "drizzle-orm";
import { fileTypeEnum, filesTable, InsertFile, SelectFile } from "../schema/files-schema";

export const createFile = async (data: InsertFile) => {
  try {
    const [newFile] = await db.insert(filesTable).values(data).returning();
    return newFile;
  } catch (error) {
    console.error("Error creating file:", error);
    throw new Error("Failed to create file");
  }
};

export const createFolder = async (
  projectId: string,
  name: string,
  parentId?: string,
  isSystemFolder: boolean = false
) => {
  try {
    console.log(`Creating folder: ${name} in project ${projectId} (isSystemFolder: ${isSystemFolder})`);
    
    const folderData: InsertFile = {
      projectId,
      name,
      type: "folder",
      parentId: parentId || null,
      isSystemFolder
    };

    const [newFolder] = await db.insert(filesTable).values(folderData).returning();
    console.log(`Folder created:`, {
      id: newFolder.id,
      name: newFolder.name,
      isSystemFolder: newFolder.isSystemFolder
    });
    
    return newFolder;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw new Error("Failed to create folder");
  }
};

export const getFileById = async (id: string) => {
  try {
    const file = await db.query.files.findFirst({
      where: eq(filesTable.id, id)
    });

    return file;
  } catch (error) {
    console.error("Error getting file by ID:", error);
    throw new Error("Failed to get file");
  }
};

export const getFilesByProjectId = async (projectId: string): Promise<SelectFile[]> => {
  try {
    const files = await db.query.files.findMany({
      where: eq(filesTable.projectId, projectId)
    });
    
    return files;
  } catch (error) {
    console.error("Error getting files by project ID:", error);
    throw new Error("Failed to get files");
  }
};

export const getRootFilesByProjectId = async (projectId: string): Promise<SelectFile[]> => {
  try {
    const files = await db.query.files.findMany({
      where: and(
        eq(filesTable.projectId, projectId),
        isNull(filesTable.parentId)
      )
    });
    
    return files;
  } catch (error) {
    console.error("Error getting root files by project ID:", error);
    throw new Error("Failed to get root files");
  }
};

export const getFilesByParentId = async (parentId: string): Promise<SelectFile[]> => {
  try {
    const files = await db.query.files.findMany({
      where: eq(filesTable.parentId, parentId)
    });
    
    return files;
  } catch (error) {
    console.error("Error getting files by parent ID:", error);
    throw new Error("Failed to get files");
  }
};

export const updateFile = async (id: string, data: Partial<InsertFile>) => {
  try {
    const [updatedFile] = await db
      .update(filesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(filesTable.id, id))
      .returning();
    
    return updatedFile;
  } catch (error) {
    console.error("Error updating file:", error);
    throw new Error("Failed to update file");
  }
};

export const moveFile = async (id: string, newParentId: string | null) => {
  try {
    const [updatedFile] = await db
      .update(filesTable)
      .set({ parentId: newParentId, updatedAt: new Date() })
      .where(eq(filesTable.id, id))
      .returning();
    
    return updatedFile;
  } catch (error) {
    console.error("Error moving file:", error);
    throw new Error("Failed to move file");
  }
};

export const deleteFile = async (id: string) => {
  try {
    await db.delete(filesTable).where(eq(filesTable.id, id));
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
};

// Helper function to create default folders for a new project
export const createDefaultFolders = async (projectId: string) => {
  try {
    console.log(`Creating default folders for project: ${projectId}`);
    
    const defaultFolders = [
      "Documents", // For proposals, creative briefs, contracts, invoices
      "Assets",    // For images, logos, etc.
      "Design",    // For Adobe CC and Figma files
      "Print"      // For PDFs and fonts
    ];
    
    const folders = await Promise.all(
      defaultFolders.map(async name => {
        console.log(`Creating system folder: ${name} for project ${projectId}`);
        return await createFolder(projectId, name, undefined, true);
      })
    );
    
    console.log(`Created ${folders.length} default folders:`, folders.map(f => ({
      id: f.id,
      name: f.name,
      isSystemFolder: f.isSystemFolder
    })));
    
    return folders;
  } catch (error) {
    console.error("Error creating default folders:", error);
    throw new Error("Failed to create default folders");
  }
};

// Get all files for a project (both root-level and nested)
export const getAllFilesByProjectId = async (projectId: string): Promise<SelectFile[]> => {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const files = await db.query.files.findMany({
      where: eq(filesTable.projectId, projectId),
      orderBy: (files, { asc }) => [asc(files.name)]
    });
    
    return files;
  } catch (error) {
    console.error("Error getting all files by project ID:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get all files: ${error.message}`);
    } else {
      throw new Error("Failed to get all files: Unknown database error");
    }
  }
};

/**
 * Search files by name, type, and tags
 */
export const searchFiles = async (
  projectId: string,
  searchParams: {
    query?: string;      // Text to search in name, description, and tags
    fileType?: string;   // Filter by file type (file or folder)
    mimeTypes?: string[]; // Filter by mime types (e.g., image/jpeg, application/pdf)
  }
): Promise<SelectFile[]> => {
  try {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    // Start building conditions
    let conditions = [eq(filesTable.projectId, projectId)];

    // Add text search if provided
    if (searchParams.query && searchParams.query.trim() !== '') {
      const searchTerm = `%${searchParams.query.toLowerCase()}%`;
      
      // Add text search condition
      conditions.push(
        sql`(${filesTable.name} ILIKE ${searchTerm} OR 
             COALESCE(${filesTable.description}, '') ILIKE ${searchTerm} OR 
             COALESCE(${filesTable.tags}, '') ILIKE ${searchTerm})`
      );
    }

    // Add file type filter if provided
    if (searchParams.fileType) {
      conditions.push(eq(filesTable.type, searchParams.fileType as any));
    }

    // Add mime type filter if provided
    if (searchParams.mimeTypes && searchParams.mimeTypes.length > 0) {
      // Build a condition for each mime type with OR
      const mimeTypeQuery = searchParams.mimeTypes
        .map(mimeType => `COALESCE(mime_type, '') ILIKE '%${mimeType}%'`)
        .join(' OR ');
      
      conditions.push(sql`(${sql.raw(mimeTypeQuery)})`);
    }

    // Execute query with all conditions
    return await db
      .select()
      .from(filesTable)
      .where(and(...conditions))
      .orderBy(asc(filesTable.name));
  } catch (error) {
    console.error("Error searching files:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to search files: ${error.message}`);
    } else {
      throw new Error("Failed to search files");
    }
  }
};

/**
 * Updates the Wasabi path for a file
 */
export async function updateFileWasabiPath(fileId: string, wasabiObjectPath: string) {
  try {
    const result = await db
      .update(filesTable)
      .set({
        wasabiObjectPath,
        updatedAt: new Date(),
      })
      .where(eq(filesTable.id, fileId));
    
    return await getFileById(fileId);
  } catch (error) {
    console.error("Error updating file Wasabi path:", error);
    throw error;
  }
} 